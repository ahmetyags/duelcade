import type { NetworkTransport } from '@/services/NetworkService';
import type { ClientEvent } from '@/types/network';
import type { ConnectionState, ServerEventListener } from '@/types/network';

type TransportConstructor = new (...args: unknown[]) => NetworkTransport;
const isWebRuntime = typeof window !== 'undefined' || typeof navigator !== 'undefined';

/**
 * Thin platform proxy. Web keeps the local transport path; native loads the
 * real Colyseus implementation from the native-only module to avoid Metro
 * pulling in the WebSocket SDK on the browser bundle.
 */
export class ColyseusTransport implements NetworkTransport {
  private readonly transport: NetworkTransport & {
    attachRoom?: (room: unknown) => void;
  };

  constructor(endpoint?: string) {
    const ctor = isWebRuntime
      ? (require('./ColyseusTransport.web') as { ColyseusTransport: TransportConstructor }).ColyseusTransport
      : (require('./ColyseusTransport.native') as { ColyseusTransport: TransportConstructor }).ColyseusTransport;

    this.transport = new ctor(endpoint);
  }

  async connect(roomCode: string, playerId: string): Promise<void> {
    await this.transport.connect(roomCode, playerId);
  }

  async reconnect(reconnectionToken: string): Promise<void> {
    await this.transport.reconnect(reconnectionToken);
  }

  disconnect(): void {
    this.transport.disconnect();
  }

  getSession(): { roomCode: string; reconnectionToken: string } | null {
    return this.transport.getSession();
  }

  send(event: ClientEvent): void {
    this.transport.send(event);
  }

  onEvent(listener: ServerEventListener): () => void {
    return this.transport.onEvent(listener);
  }

  onConnectionChange(listener: (state: ConnectionState) => void): () => void {
    return this.transport.onConnectionChange(listener);
  }

  onPingUpdate(listener: (pingMs: number) => void): () => void {
    return this.transport.onPingUpdate(listener);
  }

  attachRoom(room: unknown): void {
    this.transport.attachRoom?.(room);
  }
}
