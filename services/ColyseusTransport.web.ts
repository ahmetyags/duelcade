import { Client, type Room } from '@colyseus/sdk';

import type { NetworkTransport } from '@/services/NetworkService';
import type { ClientEvent, ConnectionState, ServerEventListener, ServerMessage } from '@/types/network';
import { PROTOCOL_VERSION, SERVER_CLOSE_CODE } from '@/types/network';
import { getAccessTokenForNetwork } from '@/services/AccessTokenProvider';
import { GAME_SERVER_URL } from '@/services/GameServerAvailability';

/** Web transport backed by the same authoritative Colyseus server as native clients. */
export class ColyseusTransport implements NetworkTransport {
  private readonly client: Client;
  private room: Room | null = null;
  private serverEventListeners = new Set<ServerEventListener>();
  private connectionListeners = new Set<(state: ConnectionState) => void>();
  private pingListeners = new Set<(pingMs: number) => void>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private consentedDisconnect = false;

  constructor(endpoint = GAME_SERVER_URL) {
    this.client = new Client(endpoint);
  }

  async connect(roomCode: string, playerId: string): Promise<void> {
    this.consentedDisconnect = false;
    this.client.auth.token = await getAccessTokenForNetwork() ?? '';
    const options = { playerId, protocolVersion: PROTOCOL_VERSION };
    const room = roomCode === '__CREATE__'
      ? await this.client.create('duelcade', options)
      : await this.client.joinById(roomCode, options);

    this.attachRoom(room);
    this.emitConnection('connected');
  }

  async reconnect(reconnectionToken: string): Promise<void> {
    this.consentedDisconnect = false;
    this.client.auth.token = await getAccessTokenForNetwork() ?? '';
    const room = await this.client.reconnect(reconnectionToken);
    this.attachRoom(room);
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
    room.send('event', { event: 'room.sync', payload: {} });
    this.emitConnection('connected');
  }

  disconnect(): void {
    this.consentedDisconnect = true;
    this.stopPing();
    const activeRoom = this.room;
    this.room = null;
    if (activeRoom) void activeRoom.leave(true);
    this.emitConnection('disconnected');
  }

  getSession(): { roomCode: string; reconnectionToken: string } | null {
    if (!this.room) return null;
    return {
      roomCode: this.room.roomId,
      reconnectionToken: this.room.reconnectionToken,
    };
  }

  send(event: ClientEvent): void {
    this.room?.send('event', event);
  }

  onEvent(listener: ServerEventListener): () => void {
    this.serverEventListeners.add(listener);
    return () => this.serverEventListeners.delete(listener);
  }

  onConnectionChange(listener: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  onPingUpdate(listener: (pingMs: number) => void): () => void {
    this.pingListeners.add(listener);
    return () => this.pingListeners.delete(listener);
  }

  private attachRoom(room: Room): void {
    this.room = room;
    room.reconnection.maxRetries = 20;
    room.reconnection.minUptime = 1000;
    room.reconnection.maxDelay = 5000;
    room.reconnection.maxEnqueuedMessages = 20;

    room.onMessage<ServerMessage>('event', (message) => {
      if (this.room !== room) return;
      this.serverEventListeners.forEach((listener) => listener(message));
    });
    room.onDrop(() => {
      if (this.room === room) this.emitConnection('reconnecting');
    });
    room.onReconnect(() => {
      if (this.room === room) this.emitConnection('connected');
    });
    room.onLeave((code) => {
      if (this.room !== room) return;
      this.room = null;
      this.stopPing();
      if (this.consentedDisconnect) return;
      const terminalServerClose = Object.values(SERVER_CLOSE_CODE).includes(
        code as (typeof SERVER_CLOSE_CODE)[keyof typeof SERVER_CLOSE_CODE],
      );
      this.emitConnection(terminalServerClose ? 'error' : 'disconnected');
    });
    room.onError((_code, message) => {
      if (this.room !== room) return;
      console.warn('[ColyseusTransport]', message ?? 'Connection error');
      this.emitConnection('error');
    });

    this.startPing(room);
  }

  private startPing(room: Room): void {
    this.stopPing();
    const measure = () => {
      if (this.room !== room || room.reconnection.isReconnecting) return;
      room.ping((latency) => {
        this.pingListeners.forEach((listener) => listener(latency));
      });
    };
    measure();
    this.pingTimer = setInterval(measure, 3000);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private emitConnection(state: ConnectionState): void {
    this.connectionListeners.forEach((listener) => listener(state));
  }
}
