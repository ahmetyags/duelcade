import assert from 'node:assert/strict';
import test from 'node:test';
import type { Room } from '@colyseus/sdk';

import { ColyseusTransport } from '../services/ColyseusTransport';
import type { ConnectionState, ServerMessage } from '../types/network';

class FakeRoom {
  roomId: string;
  reconnectionToken: string;
  reconnection = {
    maxRetries: 0,
    minUptime: 0,
    maxDelay: 0,
    maxEnqueuedMessages: 0,
    isReconnecting: false,
  };
  leaveCalls = 0;
  private messageListener: ((message: ServerMessage) => void) | null = null;
  private dropListener: (() => void) | null = null;
  private reconnectListener: (() => void) | null = null;
  private leaveListener: ((code: number) => void) | null = null;
  private errorListener: ((code: number, message?: string) => void) | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.reconnectionToken = `${roomId}:token`;
  }

  onMessage(_type: string, listener: (message: ServerMessage) => void): () => void {
    this.messageListener = listener;
    return () => {
      this.messageListener = null;
    };
  }

  onDrop(listener: () => void): () => void {
    this.dropListener = listener;
    return () => {
      this.dropListener = null;
    };
  }

  onReconnect(listener: () => void): () => void {
    this.reconnectListener = listener;
    return () => {
      this.reconnectListener = null;
    };
  }

  onLeave(listener: (code: number) => void): () => void {
    this.leaveListener = listener;
    return () => {
      this.leaveListener = null;
    };
  }

  onError(listener: (code: number, message?: string) => void): () => void {
    this.errorListener = listener;
    return () => {
      this.errorListener = null;
    };
  }

  ping(listener: (latency: number) => void): void {
    listener(20);
  }

  send(): void {}

  async leave(): Promise<number> {
    this.leaveCalls += 1;
    return 1000;
  }

  emitMessage(message: ServerMessage): void {
    this.messageListener?.(message);
  }

  emitDrop(): void {
    this.dropListener?.();
  }

  emitLeave(code: number): void {
    this.leaveListener?.(code);
  }
}

function attachRoom(transport: ColyseusTransport, room: FakeRoom): void {
  const privateTransport = transport as unknown as {
    attachRoom: (activeRoom: Room) => void;
  };
  privateTransport.attachRoom(room as unknown as Room);
}

function snapshot(roomId: string, messageId: string): ServerMessage {
  return {
    protocolVersion: '1.9.0',
    roomId,
    playerId: `${roomId}-player`,
    messageId,
    sentAt: Date.now(),
    payload: {
      event: 'room.snapshot',
      payload: {
        isReconnect: false,
        room: {
          code: roomId,
          hostId: `${roomId}-player`,
          difficulty: 'easy',
          puzzleCount: 3,
          matchDurationMinutes: 3,
          status: 'waiting',
          players: [],
          createdAt: Date.now(),
        },
      },
    },
  };
}

test('events from a room being left cannot overwrite the next lobby', () => {
  const transport = new ColyseusTransport('http://127.0.0.1:2567');
  const oldRoom = new FakeRoom('OLD123');
  const newRoom = new FakeRoom('NEW456');
  const received: string[] = [];
  const connections: ConnectionState[] = [];

  transport.onEvent((message) => received.push(message.roomId));
  transport.onConnectionChange((state) => connections.push(state));

  attachRoom(transport, oldRoom);
  transport.disconnect();
  attachRoom(transport, newRoom);

  oldRoom.emitMessage(snapshot('OLD123', 'old-message'));
  oldRoom.emitDrop();
  oldRoom.emitLeave(1000);
  newRoom.emitMessage(snapshot('NEW456', 'new-message'));

  assert.deepEqual(received, ['NEW456']);
  assert.deepEqual(connections, ['disconnected']);
  assert.equal(oldRoom.leaveCalls, 1);

  transport.disconnect();
});
