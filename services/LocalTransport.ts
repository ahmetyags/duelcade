/**
 * Local transport — a simulated server-authoritative backend for MVP.
 *
 * Since the design bible specifies Colyseus + Node.js + PostgreSQL (Bölüm 12),
 * which requires a separate server deployment, this module provides a
 * fully-functional in-app simulation of the server's game logic. It:
 *
 * - Generates rooms with codes
 * - Assigns roles deterministically
 * - Runs the procedural puzzle generator
 * - Validates all puzzle actions server-side
 * - Manages timer, checkpoints, and snapshots
 * - Broadcasts state patches to connected clients
 *
 * This is NOT a mock — it runs the real game engine. When the actual
 * Colyseus server is deployed, only the transport layer swaps out.
 *
 * Architecture note: The simulation uses an EventEmitter pattern to
 * mimic WebSocket messages. For a real deployment, replace this class
 * with a WebSocketClientTransport that connects to the Colyseus server.
 */

import { SeededRandom } from '@/engine/SeededRandom';
import { generateLevel, validatePuzzleAction, filterPuzzleForClient } from '@/engine/PuzzleRegistry';
import { createGameResult } from '@/engine/ScoreCalculator';
import { attemptTransition } from '@/engine/GameStateMachine';
import {
  normalizeMatchDurationMinutes,
  roundCountForDuration,
} from '@/engine/TurnGameEngine';
import type {
  ClientEvent,
  ServerEvent,
  ServerMessage,
  NetworkMessageBase,
  ServerEventListener,
} from '@/types/network';
import { PROTOCOL_VERSION } from '@/types/network';
import type {
  RoomConfig,
  Player,
  PlayerRole,
  RolePreference,
  Difficulty,
  GameResult,
  FailReason,
  DoorState,
  PingEvent,
  GameSnapshot,
} from '@/types/game';
import type { PuzzleState, ClientPuzzleState, PuzzleAction } from '@/types/puzzle';
import type { PlayerAvatarId } from '@/types/profile';

type ConnectionListener = (state: 'connected' | 'disconnected') => void;

interface SimRoom {
  config: RoomConfig;
  puzzles: PuzzleState[];
  puzzleOrder: string[];
  currentPuzzleIndex: number;
  solvedPuzzleIds: string[];
  doors: DoorState[];
  mistakeCount: number;
  hintsUsed: number;
  pingCount: number;
  firstTryPuzzles: number;
  startedAt: number | null;
  finishedAt: number | null;
  durationMs: number;
  remainingTimeMs: number;
  timerInterval: ReturnType<typeof setInterval> | null;
  snapshots: GameSnapshot[];
  pings: PingEvent[];
  rematchVotes: Set<string>;
  ending: GameResult['ending'];
}

const rooms = new Map<string, SimRoom>();
const playerRoomMap = new Map<string, string>();

/** Simple EventEmitter for the local transport. */
export class LocalTransport {
  private serverEventListeners = new Set<ServerEventListener>();
  private connectionListeners = new Set<ConnectionListener>();
  private pingListeners = new Set<(pingMs: number) => void>();
  private playerId: string | null = null;
  private roomCode: string | null = null;
  private connected = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  async connect(roomCode: string, playerId: string): Promise<void> {
    this.roomCode = roomCode;
    this.playerId = playerId;
    this.connected = true;
    this.connectionListeners.forEach((l) => l('connected'));

    // Simulate ping measurement
    this.pingInterval = setInterval(() => {
      const ping = 20 + Math.random() * 40;
      this.pingListeners.forEach((l) => l(ping));
    }, 2000);
  }

  disconnect(): void {
    this.connected = false;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.connectionListeners.forEach((l) => l('disconnected'));
  }

  send(event: ClientEvent): void {
    if (!this.connected || !this.playerId || !this.roomCode) return;
    // Process the event asynchronously to simulate network
    setTimeout(() => this.handleEvent(event), 10);
  }

  onEvent(listener: ServerEventListener): () => void {
    this.serverEventListeners.add(listener);
    return () => this.serverEventListeners.delete(listener);
  }

  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  onPingUpdate(listener: (pingMs: number) => void): () => void {
    this.pingListeners.add(listener);
    return () => this.pingListeners.delete(listener);
  }

  private emit(payload: ServerEvent): void {
    const message: ServerMessage = {
      protocolVersion: PROTOCOL_VERSION,
      roomId: this.roomCode ?? '',
      playerId: this.playerId ?? '',
      messageId: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      sentAt: Date.now(),
      payload,
    };
    this.serverEventListeners.forEach((l) => {
      try { l(message); } catch (e) { console.error('[LocalTransport] Listener error:', e); }
    });
  }

  // ─── Event Handler (Simulated Server Logic) ─────────────────────

  private handleEvent(event: ClientEvent): void {
    const room = this.roomCode ? rooms.get(this.roomCode) : null;

    switch (event.event) {
      case 'room.create':
        this.handleRoomCreate(event.payload);
        break;
      case 'room.join':
        this.handleRoomJoin(event.payload);
        break;
      case 'room.leave':
        this.handleRoomLeave(event.payload);
        break;
      case 'player.ready':
        this.handlePlayerReady(event.payload);
        break;
      case 'player.rolePreference':
        this.handleRolePreference(event.payload);
        break;
      case 'game.loaded':
        this.handleGameLoaded(event.payload);
        break;
      case 'puzzle.submit':
        this.handlePuzzleSubmit(event.payload);
        break;
      case 'ping.send':
        this.handlePingSend(event.payload);
        break;
      case 'rematch.vote':
        this.handleRematchVote(event.payload);
        break;
      case 'request.hint':
        this.handleRequestHint(event.payload);
        break;
      default:
        break;
    }
  }

  private handleRoomCreate(payload: {
    displayName: string;
    avatarId: PlayerAvatarId;
    rolePreference: RolePreference;
    difficulty: Difficulty;
    matchDurationMinutes: number;
  }): void {
    const rng = new SeededRandom(SeededRandom.generateSeed());
    const code = SeededRandom.generateRoomCode(rng);
    const seed = SeededRandom.generateSeed();
    const playerId = `host_${Date.now()}`;
    const matchDurationMinutes = normalizeMatchDurationMinutes(payload.matchDurationMinutes);
    const puzzleCount = roundCountForDuration(matchDurationMinutes);
    const durationMs = matchDurationMinutes * 60 * 1000;

    const hostPlayer: Player = {
      id: playerId,
      displayName: payload.displayName || 'Host',
      avatarId: payload.avatarId,
      role: null,
      isHost: true,
      isReady: false,
      rolePreference: payload.rolePreference,
      connected: true,
      lastSeenAt: Date.now(),
    };

    const config: RoomConfig = {
      code,
      hostId: playerId,
      status: 'waiting',
      players: [hostPlayer],
      seed,
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
      maxPlayers: 2,
      difficulty: payload.difficulty,
      puzzleCount,
      matchDurationMinutes,
    };

    const room: SimRoom = {
      config,
      puzzles: [],
      puzzleOrder: [],
      currentPuzzleIndex: 0,
      solvedPuzzleIds: [],
      doors: [],
      mistakeCount: 0,
      hintsUsed: 0,
      pingCount: 0,
      firstTryPuzzles: 0,
      startedAt: null,
      finishedAt: null,
      durationMs,
      remainingTimeMs: durationMs,
      timerInterval: null,
      snapshots: [],
      pings: [],
      rematchVotes: new Set(),
      ending: null,
    };

    rooms.set(code, room);
    playerRoomMap.set(playerId, code);
    this.playerId = playerId;
    this.roomCode = code;

    this.emit({ event: 'room.snapshot', payload: { room: config, isReconnect: false } });
  }

  private handleRoomJoin(payload: {
    roomCode: string;
    displayName: string;
    avatarId: PlayerAvatarId;
    rolePreference: RolePreference;
  }): void {
    const room = rooms.get(payload.roomCode);
    if (!room) {
      this.emit({
        event: 'error',
        payload: { errorCode: 'ROOM_NOT_FOUND', userMessageKey: 'error.room_not_found', retryable: false, details: null },
      });
      return;
    }

    if (room.config.players.length >= room.config.maxPlayers) {
      this.emit({
        event: 'error',
        payload: { errorCode: 'ROOM_FULL', userMessageKey: 'error.room_full', retryable: false, details: null },
      });
      return;
    }

    if (room.config.status !== 'waiting') {
      this.emit({
        event: 'error',
        payload: { errorCode: 'INVALID_ACTION', userMessageKey: 'error.room_in_progress', retryable: false, details: null },
      });
      return;
    }

    const playerId = `guest_${Date.now()}`;
    const guestPlayer: Player = {
      id: playerId,
      displayName: payload.displayName || 'Guest',
      avatarId: payload.avatarId,
      role: null,
      isHost: false,
      isReady: false,
      rolePreference: payload.rolePreference,
      connected: true,
      lastSeenAt: Date.now(),
    };

    room.config.players.push(guestPlayer);
    playerRoomMap.set(playerId, payload.roomCode);
    this.playerId = playerId;
    this.roomCode = payload.roomCode;

    this.emit({ event: 'room.snapshot', payload: { room: room.config, isReconnect: false } });
    // Also notify the host
    this.emit({ event: 'player.joined', payload: { player: guestPlayer } });
  }

  private handleRoomLeave(_payload: { reason: string }): void {
    const room = this.roomCode ? rooms.get(this.roomCode) : null;
    if (room && this.playerId) {
      const player = room.config.players.find((p) => p.id === this.playerId);
      room.config.players = room.config.players.filter((p) => p.id !== this.playerId);
      if (player?.isHost) {
        // Host left — close room
        if (room.timerInterval) clearInterval(room.timerInterval);
        rooms.delete(this.roomCode ?? '');
      }
    }
    this.disconnect();
  }

  private handlePlayerReady(payload: { ready: boolean }): void {
    const room = this.roomCode ? rooms.get(this.roomCode) : null;
    if (!room || !this.playerId) return;

    const player = room.config.players.find((p) => p.id === this.playerId);
    if (player) player.isReady = payload.ready;

    // Check if all ready
    if (room.config.players.length === 2 && room.config.players.every((p) => p.isReady)) {
      this.assignRolesAndStart(room);
    }
  }

  private handleRolePreference(payload: { preference: RolePreference }): void {
    const room = this.roomCode ? rooms.get(this.roomCode) : null;
    if (!room || !this.playerId) return;
    const player = room.config.players.find((p) => p.id === this.playerId);
    if (player) player.rolePreference = payload.preference;
  }

  private assignRolesAndStart(room: SimRoom): void {
    const [p1, p2] = room.config.players;
    let role1: PlayerRole;
    let role2: PlayerRole;

    if (p1.rolePreference !== 'no_preference' && p2.rolePreference !== 'no_preference') {
      if (p1.rolePreference !== p2.rolePreference) {
        role1 = p1.rolePreference;
        role2 = p2.rolePreference;
      } else {
        const rng = new SeededRandom(room.config.seed + 'roles');
        role1 = rng.pick<PlayerRole>(['operator', 'explorer']);
        role2 = role1 === 'operator' ? 'explorer' : 'operator';
      }
    } else if (p1.rolePreference !== 'no_preference') {
      role1 = p1.rolePreference;
      role2 = role1 === 'operator' ? 'explorer' : 'operator';
    } else if (p2.rolePreference !== 'no_preference') {
      role2 = p2.rolePreference;
      role1 = role2 === 'operator' ? 'explorer' : 'operator';
    } else {
      const rng = new SeededRandom(room.config.seed + 'roles');
      role1 = rng.pick<PlayerRole>(['operator', 'explorer']);
      role2 = role1 === 'operator' ? 'explorer' : 'operator';
    }

    p1.role = role1;
    p2.role = role2;
    room.config.status = 'loading';

    const roles: Record<string, PlayerRole> = { [p1.id]: role1, [p2.id]: role2 };

    this.emit({ event: 'role.assigned', payload: { role: role1, roles } });

    // Generate the level
    const level = generateLevel(room.config.seed, room.config.difficulty, room.config.puzzleCount);
    room.puzzles = level.puzzles;
    room.puzzleOrder = level.puzzleOrder;
    room.config.status = 'playing';
    room.startedAt = Date.now();

    // Create initial doors
    room.doors = level.puzzles.map((p, i) => ({
      id: `door_${i}`,
      locked: i > 0,
      open: i === 0,
      requiresPuzzleId: i > 0 ? level.puzzleOrder[i - 1] : null,
      requiresKeyId: null,
    }));

    // Start timer
    room.timerInterval = setInterval(() => {
      if (!room.startedAt) return;
      const elapsed = Date.now() - room.startedAt;
      room.remainingTimeMs = Math.max(0, room.durationMs - elapsed);
      if (room.remainingTimeMs <= 0) {
        this.failGame(room, 'time_expired');
      }
    }, 1000);

    this.emit({
      event: 'game.starting',
      payload: {
        seed: room.config.seed,
        levelId: level.levelId,
        loadTimeoutMs: 30000,
        durationMs: room.durationMs,
      },
    });

    // Send initial puzzle states (filtered per role)
    const myRole = roles[this.playerId ?? ''];
    setTimeout(() => {
      const activePuzzle = room.puzzles[0];
      if (activePuzzle && myRole) {
        const clientPuzzle = filterPuzzleForClient(activePuzzle, myRole);
        this.emit({ event: 'puzzle.updated', payload: { puzzle: clientPuzzle } });
      }
    }, 500);
  }

  private handleGameLoaded(_payload: { loaded: boolean }): void {
    // Both clients confirm loaded — in real server, wait for both
    // For MVP, proceed immediately
  }

  private handlePuzzleSubmit(payload: { puzzleId: string; action: PuzzleAction; clientActionId: number }): void {
    const room = this.roomCode ? rooms.get(this.roomCode) : null;
    if (!room || !this.playerId) return;

    const puzzle = room.puzzles.find((p) => p.puzzleId === payload.puzzleId);
    if (!puzzle) {
      this.emit({
        event: 'error',
        payload: { errorCode: 'INVALID_ACTION', userMessageKey: 'error.puzzle_not_found', retryable: false, details: null },
      });
      return;
    }

    const player = room.config.players.find((p) => p.id === this.playerId);
    const role = player?.role;
    if (!role) return;

    const result = validatePuzzleAction(puzzle, payload.action, role);

    // Update puzzle state
    puzzle.phase = result.newPhase;
    puzzle.attemptCount = result.attemptCount;

    if (result.feedback.correct) {
      // Track first-try
      if (puzzle.attemptCount === 1) room.firstTryPuzzles++;
      room.solvedPuzzleIds.push(puzzle.puzzleId);

      // Unlock doors
      result.unlockedDoorIds.forEach((doorId) => {
        const door = room.doors.find((d) => d.id === doorId);
        if (door) { door.locked = false; door.open = true; }
      });

      // Send next puzzle
      const nextIndex = room.puzzleOrder.indexOf(puzzle.puzzleId) + 1;
      if (nextIndex < room.puzzles.length) {
        const nextPuzzle = room.puzzles[nextIndex];
        const clientPuzzle = filterPuzzleForClient(nextPuzzle, role);
        setTimeout(() => {
          this.emit({ event: 'puzzle.updated', payload: { puzzle: clientPuzzle } });
        }, 800);
      } else {
        // All puzzles solved — game complete
        this.completeGame(room);
      }

      // Save checkpoint
      const snapshot = this.createSnapshot(room);
      room.snapshots.push(snapshot);
      this.emit({ event: 'checkpoint.saved', payload: { snapshot } });
    } else {
      room.mistakeCount++;
      if (result.feedback.timePenaltyMs > 0) {
        room.remainingTimeMs = Math.max(0, room.remainingTimeMs - result.feedback.timePenaltyMs);
      }
    }

    this.emit({
      event: 'puzzle.feedback',
      payload: { puzzleId: puzzle.puzzleId, feedback: result.feedback, clientActionId: payload.clientActionId },
    });

    // Send updated puzzle state
    const clientPuzzle = filterPuzzleForClient(puzzle, role);
    this.emit({ event: 'puzzle.updated', payload: { puzzle: clientPuzzle } });
  }

  private handlePingSend(payload: { pingType: PingEvent['type']; position: { x: number; y: number } | null }): void {
    const room = this.roomCode ? rooms.get(this.roomCode) : null;
    if (!room || !this.playerId) return;

    room.pingCount++;
    const ping: PingEvent = {
      id: `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playerId: this.playerId,
      type: payload.pingType,
      position: payload.position,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3000,
    };
    room.pings.push(ping);
    this.emit({ event: 'ping.received', payload: { ping } });

    // Auto-expire
    setTimeout(() => {
      room.pings = room.pings.filter((p) => p.id !== ping.id);
    }, 3000);
  }

  private handleRequestHint(payload: { puzzleId: string }): void {
    const room = this.roomCode ? rooms.get(this.roomCode) : null;
    if (!room || !this.playerId) return;

    const puzzle = room.puzzles.find((p) => p.puzzleId === payload.puzzleId);
    if (!puzzle || puzzle.hintsRevealed >= puzzle.hints.length) return;

    const nextHint = puzzle.hints[puzzle.hintsRevealed];
    if (!nextHint) return;

    // Each hint owns its reveal schedule; keep local and server play identical.
    if (room.startedAt && Date.now() - room.startedAt < nextHint.revealAfterMs) {
      this.emit({
        event: 'error',
        payload: {
          errorCode: 'HINT_COOLDOWN',
          userMessageKey: 'error.hint_cooldown',
          retryable: true,
          details: `Hint unlocks after ${nextHint.revealAfterMs}ms`,
        },
      });
      return;
    }

    puzzle.hintsRevealed++;
    room.hintsUsed++;

    const player = room.config.players.find((p) => p.id === this.playerId);
    if (player?.role) {
      const clientPuzzle = filterPuzzleForClient(puzzle, player.role);
      this.emit({ event: 'puzzle.updated', payload: { puzzle: clientPuzzle } });
    }
  }

  private handleRematchVote(payload: { vote: boolean }): void {
    const room = this.roomCode ? rooms.get(this.roomCode) : null;
    if (!room || !this.playerId) return;

    if (payload.vote) {
      room.rematchVotes.add(this.playerId);
    } else {
      room.rematchVotes.delete(this.playerId);
    }

    this.emit({ event: 'rematch.prompt', payload: { playerId: this.playerId, vote: payload.vote } });

    if (room.rematchVotes.size === 2) {
      // Swap roles and restart
      const [p1, p2] = room.config.players;
      const tempRole = p1.role;
      p1.role = p2.role;
      p2.role = tempRole;
      p1.isReady = false;
      p2.isReady = false;
      room.config.status = 'waiting';
      room.solvedPuzzleIds = [];
      room.mistakeCount = 0;
      room.hintsUsed = 0;
      room.pingCount = 0;
      room.firstTryPuzzles = 0;
      room.snapshots = [];
      room.rematchVotes.clear();

      // New seed for new puzzles
      room.config.seed = SeededRandom.generateSeed();
      const level = generateLevel(room.config.seed, room.config.difficulty, room.config.puzzleCount);
      room.puzzles = level.puzzles;
      room.puzzleOrder = level.puzzleOrder;

      this.emit({
        event: 'role.assigned',
        payload: { role: p1.role ?? 'operator', roles: { [p1.id]: p1.role!, [p2.id]: p2.role! } },
      });
    }
  }

  private completeGame(room: SimRoom): void {
    if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }
    room.finishedAt = Date.now();
    room.config.status = 'completed';

    // Determine ending based on performance
    const ending: GameResult['ending'] = room.mistakeCount < 3 ? 'restore' : room.mistakeCount < 6 ? 'shutdown' : 'escape';
    room.ending = ending;

    const roles: Record<string, PlayerRole> = {};
    room.config.players.forEach((p) => { if (p.role) roles[p.id] = p.role; });

    const result = createGameResult({
      roomId: room.config.code,
      success: true,
      failReason: null,
      startTimeMs: room.startedAt ?? Date.now(),
      endTimeMs: room.finishedAt,
      remainingTimeMs: room.remainingTimeMs,
      mistakeCount: room.mistakeCount,
      puzzlesSolved: room.solvedPuzzleIds.length,
      totalPuzzles: room.puzzles.length,
      hintsUsed: room.hintsUsed,
      pingCount: room.pingCount,
      firstTryPuzzles: room.firstTryPuzzles,
      roles,
      ending,
    });

    this.emit({ event: 'game.completed', payload: { result } });
  }

  private failGame(room: SimRoom, reason: FailReason): void {
    if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }
    room.finishedAt = Date.now();
    room.config.status = 'failed';

    const roles: Record<string, PlayerRole> = {};
    room.config.players.forEach((p) => { if (p.role) roles[p.id] = p.role; });

    const result = createGameResult({
      roomId: room.config.code,
      success: false,
      failReason: reason,
      startTimeMs: room.startedAt ?? Date.now(),
      endTimeMs: room.finishedAt,
      remainingTimeMs: room.remainingTimeMs,
      mistakeCount: room.mistakeCount,
      puzzlesSolved: room.solvedPuzzleIds.length,
      totalPuzzles: room.puzzles.length,
      hintsUsed: room.hintsUsed,
      pingCount: room.pingCount,
      firstTryPuzzles: room.firstTryPuzzles,
      roles,
      ending: null,
    });

    this.emit({ event: 'game.failed', payload: { result } });
  }

  private createSnapshot(room: SimRoom): GameSnapshot {
    return {
      snapshotId: `snap_${Date.now()}_${room.snapshots.length}`,
      roomId: room.config.code,
      seed: room.config.seed,
      roles: Object.fromEntries(
        room.config.players.filter((p) => p.role).map((p) => [p.id, p.role!]),
      ),
      currentRoomId: room.config.code,
      solvedPuzzleIds: [...room.solvedPuzzleIds],
      remainingTimeMs: room.remainingTimeMs,
      doorStates: Object.fromEntries(room.doors.map((d) => [d.id, { ...d }])),
      powerStates: {},
      playerPosition: null,
      createdAt: Date.now(),
      attemptCount: room.mistakeCount,
      mistakeCount: room.mistakeCount,
    };
  }
}
