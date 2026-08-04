/**
 * Network service — abstraction layer for real-time game communication.
 *
 * Per the design bible (Bölüm 6 & 15), the game uses a server-authoritative
 * WebSocket model. This layer abstracts the transport so that the UI never
 * touches the socket directly. It provides:
 * - Typed event sending/receiving
 * - Connection state management
 * - Reconnect logic with 60s grace period
 * - Message ID generation and idempotency tracking
 * - Ping measurement for connection quality
 *
 * The actual transport can be swapped (WebSocket, Supabase Realtime, etc.)
 * by implementing the NetworkTransport interface.
 */

import type {
  ClientEvent,
  ServerEvent,
  ServerEventListener,
  ConnectionState,
} from '@/types/network';
import { PROTOCOL_VERSION } from '@/types/network';
import type { ConnectionQuality } from '@/types/game';

/** Transport interface — pluggable backend. */
export interface NetworkTransport {
  connect(roomCode: string, playerId: string): Promise<void>;
  reconnect(reconnectionToken: string): Promise<void>;
  disconnect(): void;
  getSession(): {
    roomCode: string;
    reconnectionToken: string;
  } | null;
  send(event: ClientEvent): void;
  onEvent(listener: ServerEventListener): () => void;
  onConnectionChange(listener: (state: ConnectionState) => void): () => void;
  onPingUpdate(listener: (pingMs: number) => void): () => void;
}

/** Connection quality thresholds per design bible. */
const PING_WARNING_THRESHOLD = 250;
const PING_CRITICAL_THRESHOLD = 800;
const RECONNECT_GRACE_PERIOD_MS = 60_000;

/** Generate a unique message ID. */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Network service singleton.
 * Manages connection lifecycle, event routing, and reconnect logic.
 */
export class NetworkService {
  private transport: NetworkTransport | null = null;
  private listeners = new Set<ServerEventListener>();
  private connectionListeners = new Set<(state: ConnectionState) => void>();
  private pingListeners = new Set<(pingMs: number) => void>();
  private state: ConnectionState = 'disconnected';
  private currentPingMs = 0;
  private playerId: string | null = null;
  private roomCode: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private gracePeriodStart: number | null = null;
  private reconnectAttempts = 0;
  private processedMessageIds = new Set<string>();
  // A page reload creates a new NetworkService while the authoritative room
  // keeps the player's last movement sequence. Seed from wall-clock time so a
  // reconnected client never restarts at 1 and has its movement rejected as
  // stale. Multiplying by 1,000 leaves room for bursts within one millisecond
  // while remaining below Number.MAX_SAFE_INTEGER.
  private actionCounter = Date.now() * 1000;

  /** Set the transport implementation. */
  setTransport(transport: NetworkTransport): void {
    this.transport = transport;
    transport.onEvent((message) => this.handleServerEvent(message));
    transport.onConnectionChange((state) => this.handleConnectionChange(state));
    transport.onPingUpdate((ping) => this.handlePingUpdate(ping));
  }

  /** Connect to a room. */
  async connect(roomCode: string, playerId: string): Promise<void> {
    this.playerId = playerId;
    this.roomCode = roomCode;
    this.reconnectAttempts = 0;
    if (!this.transport) {
      throw new Error('No transport configured');
    }
    this.setState('connecting');
    try {
      await this.transport.connect(roomCode, playerId);
      this.setState('connected');
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  /** Resume a previously connected room using its private reconnection token. */
  async reconnect(
    roomCode: string,
    playerId: string,
    reconnectionToken: string,
  ): Promise<void> {
    this.playerId = playerId;
    this.roomCode = roomCode;
    this.reconnectAttempts = 0;
    if (!this.transport) {
      throw new Error('No transport configured');
    }
    this.setState('connecting');
    try {
      await this.transport.reconnect(reconnectionToken);
      this.setState('connected');
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  /** Disconnect from the current room. */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.gracePeriodStart = null;
    this.reconnectAttempts = 0;
    this.playerId = null;
    this.roomCode = null;
    this.processedMessageIds.clear();
    // Mark the disconnect as intentional before the transport emits its
    // synchronous notification, otherwise it is mistaken for a dropped socket
    // and briefly schedules a reconnect to the room being left.
    this.setState('disconnected');
    if (this.transport) {
      this.transport.disconnect();
    }
  }

  /** Send a client event to the server. */
  send(event: ClientEvent): void {
    if (!this.transport || this.state !== 'connected') {
      console.warn('[NetworkService] Cannot send: not connected');
      return;
    }
    this.transport.send(event);
  }

  /** Get the next monotonically increasing action ID. */
  nextActionId(): number {
    this.actionCounter = Math.max(this.actionCounter + 1, Date.now() * 1000);
    return this.actionCounter;
  }

  /** Add a server event listener. Returns unsubscribe function. */
  addListener(listener: ServerEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Add a connection state listener. */
  onConnectionChange(listener: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  /** Add a ping update listener. */
  onPingUpdate(listener: (pingMs: number) => void): () => void {
    this.pingListeners.add(listener);
    return () => this.pingListeners.delete(listener);
  }

  /** Get current connection state. */
  getConnectionState(): ConnectionState {
    return this.state;
  }

  getSession(): {
    roomCode: string;
    playerId: string;
    reconnectionToken: string;
  } | null {
    const transportSession = this.transport?.getSession();
    if (!transportSession || !this.playerId) return null;
    return {
      ...transportSession,
      playerId: this.playerId,
    };
  }

  /** Get current ping in milliseconds. */
  getPing(): number {
    return this.currentPingMs;
  }

  /** Get connection quality bucket. */
  getConnectionQuality(): ConnectionQuality {
    if (this.state === 'disconnected' || this.state === 'error') {
      return 'disconnected';
    }
    if (this.state === 'reconnecting') {
      return 'critical';
    }
    if (this.currentPingMs > PING_CRITICAL_THRESHOLD) return 'critical';
    if (this.currentPingMs > PING_WARNING_THRESHOLD) return 'warning';
    return 'good';
  }

  /** Get remaining grace period for reconnect. */
  getGracePeriodRemaining(): number | null {
    if (!this.gracePeriodStart) return null;
    const elapsed = Date.now() - this.gracePeriodStart;
    const remaining = RECONNECT_GRACE_PERIOD_MS - elapsed;
    return Math.max(0, remaining);
  }

  // ─── Private handlers ───────────────────────────────────────────

  private handleServerEvent(message: { messageId: string }): void {
    // Idempotency: skip already-processed messages
    if (this.processedMessageIds.has(message.messageId)) return;
    this.processedMessageIds.add(message.messageId);

    // Prevent unbounded growth
    if (this.processedMessageIds.size > 500) {
      const first = this.processedMessageIds.values().next().value;
      if (first) this.processedMessageIds.delete(first);
    }

    this.listeners.forEach((listener) => {
      try {
        listener(message as never);
      } catch (e) {
        console.error('[NetworkService] Listener error:', e);
      }
    });
  }

  private handleConnectionChange(state: ConnectionState): void {
    if (state === 'disconnected' && this.state === 'connected') {
      // Unexpected disconnect — start grace period
      this.gracePeriodStart = Date.now();
      this.setState('reconnecting');
      this.scheduleReconnect();
    } else {
      if (state === 'connected') {
        this.reconnectAttempts = 0;
        this.gracePeriodStart = null;
      }
      this.setState(state);
    }
  }

  private handlePingUpdate(pingMs: number): void {
    this.currentPingMs = pingMs;
    this.pingListeners.forEach((listener) => listener(pingMs));
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.connectionListeners.forEach((listener) => listener(state));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(30_000, 3_000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      if (this.state !== 'reconnecting') return;
      if (!this.roomCode || !this.playerId || !this.transport) {
        this.setState('disconnected');
        return;
      }
      const remaining = this.getGracePeriodRemaining();
      if (remaining === null || remaining <= 0) {
        this.setState('disconnected');
        return;
      }
      this.transport.connect(this.roomCode, this.playerId)
        .then(() => {
          this.gracePeriodStart = null;
          this.setState('connected');
        })
        .catch(() => {
          this.scheduleReconnect();
        });
    }, delay);
  }
}

/** Singleton network service instance. */
export const networkService = new NetworkService();
