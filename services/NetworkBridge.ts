/**
 * Connects the transport layer to the application stores.
 *
 * Screens call the small command functions exported from this module. Server
 * events are handled once here so UI components never need transport details.
 */

import { ColyseusTransport } from '@/services/ColyseusTransport';
import { networkService } from '@/services/NetworkService';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Difficulty, InteractionType, PingType, RolePreference } from '@/types/game';
import type { ServerMessage } from '@/types/network';
import type { PuzzleAction } from '@/types/puzzle';
import type { TurnMatchState } from '@/types/turnGame';
import type { PlayerAvatarId } from '@/types/profile';
import { triggerHaptic } from '@/services/HapticsService';

let initialized = false;

function handleServerMessage(message: ServerMessage): void {
  const event = message.payload;
  const roomStore = useRoomStore.getState();
  const gameStore = useGameStore.getState();

  switch (event.event) {
    case 'room.snapshot': {
      const { room } = event.payload;
      roomStore.setRoom(room);
      roomStore.setRoomCode(room.code);
      roomStore.setLocalPlayer(message.playerId, room.hostId === message.playerId);
      roomStore.setLoading(false);
      const session = networkService.getSession();
      if (session) useSettingsStore.getState().setLastRoomSession(session);
      break;
    }
    case 'player.joined':
      roomStore.addPlayer(event.payload.player);
      break;
    case 'player.left':
      roomStore.removePlayer(event.payload.playerId);
      break;
    case 'role.assigned':
      roomStore.assignRoles(event.payload.roles);
      roomStore.setRoomStatus('loading');
      break;
    case 'game.starting':
      gameStore.startGame({
        roomId: message.roomId,
        levelId: event.payload.levelId,
        seed: event.payload.seed,
        durationMs: event.payload.durationMs,
      });
      networkService.send({ event: 'game.loaded', payload: { loaded: true } });
      break;
    case 'puzzle.updated': {
      const puzzle = event.payload.puzzle;
      const exists = useGameStore.getState().puzzles.some(
        (item) => item.puzzleId === puzzle.puzzleId,
      );
      if (exists) {
        gameStore.updatePuzzle(puzzle);
      } else {
        gameStore.setPuzzles([...useGameStore.getState().puzzles, puzzle]);
      }
      gameStore.setCurrentPuzzle(puzzle.puzzleId);
      gameStore.setPhase('playing');
      roomStore.setRoomStatus('playing');
      break;
    }
    case 'puzzle.feedback':
      if (event.payload.feedback.correct) {
        gameStore.markPuzzleSolved(event.payload.puzzleId, [], []);
        triggerHaptic('success');
      } else {
        gameStore.recordMistake();
        triggerHaptic(event.payload.feedback.alarmTriggered ? 'warning' : 'error');
      }
      break;
    case 'checkpoint.saved':
      gameStore.restoreCheckpoint(event.payload.snapshot);
      break;
    case 'state.patch':
      for (const patch of event.payload.patches) {
        if (patch.op !== 'set') continue;
        if (patch.path === 'remainingTimeMs' && typeof patch.value === 'number') {
          gameStore.updateRemainingTime(patch.value);
        } else if (patch.path === 'world' && patch.value && typeof patch.value === 'object') {
          gameStore.setWorld(patch.value);
        } else if (patch.path === 'turnMatch' && patch.value && typeof patch.value === 'object') {
          gameStore.setTurnMatch(patch.value as TurnMatchState);
          roomStore.setRoomStatus('playing');
        } else if (
          patch.path.startsWith('playerPositions.') &&
          patch.value &&
          typeof patch.value === 'object'
        ) {
          gameStore.setPlayerPosition(patch.value);
        }
      }
      break;
    case 'ping.received': {
      const { ping } = event.payload;
      gameStore.addPing(ping);
      const delay = Math.max(0, ping.expiresAt - Date.now());
      setTimeout(() => useGameStore.getState().removePing(ping.id), delay);
      break;
    }
    case 'chat.received':
      gameStore.addChatMessage(event.payload.message);
      break;
    case 'game.completed':
      gameStore.completeGame(event.payload.result);
      roomStore.setRoomStatus('completed');
      break;
    case 'game.failed':
      gameStore.failGame(
        event.payload.result.failReason ?? 'time_expired',
        event.payload.result,
      );
      roomStore.setRoomStatus('failed');
      break;
    case 'rematch.prompt':
      break;
    case 'error':
      roomStore.setError(event.payload.userMessageKey || event.payload.details);
      roomStore.setLoading(false);
      break;
    case 'interaction.result':
      if (event.payload.result.success) {
        roomStore.setError(null);
        triggerHaptic('success');
      } else {
        roomStore.setError(
          event.payload.result.userMessageKey ??
          event.payload.result.feedback.messageKey ??
          'error.invalid_message',
        );
        triggerHaptic('error');
      }
      break;
    case 'connection.warning':
      break;
  }
}

function updateConnectionInfo(): void {
  const state = networkService.getConnectionState();
  if (state === 'connected') {
    const session = networkService.getSession();
    if (session) useSettingsStore.getState().setLastRoomSession(session);
  }
  useGameStore.getState().setConnectionInfo({
    quality: networkService.getConnectionQuality(),
    pingMs: networkService.getPing(),
    reconnecting: state === 'reconnecting',
    gracePeriodRemainingMs: networkService.getGracePeriodRemaining(),
  });
}

export function initNetwork(): void {
  if (initialized) return;

  networkService.setTransport(new ColyseusTransport());
  networkService.addListener(handleServerMessage);
  networkService.onConnectionChange(updateConnectionInfo);
  networkService.onPingUpdate(updateConnectionInfo);
  initialized = true;
}

async function connect(roomCode: string): Promise<void> {
  initNetwork();
  const temporaryPlayerId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await networkService.connect(roomCode, temporaryPlayerId);
}

function connectionErrorKey(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('locked') || message.includes('full') || message.includes('4211')) {
    return 'error.room_full';
  }
  if (message.includes('not found') || message.includes('4212')) {
    return 'error.room_not_found';
  }
  if (message.includes('version') || message.includes('auth')) {
    return 'error.version_mismatch';
  }
  return 'error.connection_failed';
}

export async function createRoom(
  displayName: string,
  avatarId: PlayerAvatarId,
  rolePreference: RolePreference,
  difficulty: Difficulty,
  matchDurationMinutes: number,
): Promise<void> {
  const roomStore = useRoomStore.getState();
  roomStore.setLoading(true);
  roomStore.setError(null);

  try {
    await connect('__CREATE__');
    networkService.send({
      event: 'room.create',
      payload: { displayName, avatarId, rolePreference, difficulty, matchDurationMinutes },
    });
  } catch (error) {
    roomStore.setError(connectionErrorKey(error));
    roomStore.setLoading(false);
  }
}

export async function joinRoom(
  roomCode: string,
  displayName: string,
  avatarId: PlayerAvatarId,
  rolePreference: RolePreference,
): Promise<void> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const roomStore = useRoomStore.getState();
  roomStore.setLoading(true);
  roomStore.setError(null);

  try {
    await connect(normalizedCode);
    networkService.send({
      event: 'room.join',
      payload: { roomCode: normalizedCode, displayName, avatarId, rolePreference },
    });
  } catch (error) {
    roomStore.setError(connectionErrorKey(error));
    roomStore.setLoading(false);
  }
}

export async function resumeRoom(
  roomCode: string,
  playerId: string,
  reconnectToken: string,
): Promise<boolean> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const roomStore = useRoomStore.getState();
  roomStore.setLoading(true);
  roomStore.setError(null);

  try {
    initNetwork();
    await networkService.reconnect(normalizedCode, playerId, reconnectToken);
    const session = networkService.getSession();
    if (session) useSettingsStore.getState().setLastRoomSession(session);
    roomStore.setLoading(false);
    return true;
  } catch {
    roomStore.setError('error.reconnect_expired');
    roomStore.setLoading(false);
    useSettingsStore.getState().clearLastRoomSession();
    return false;
  }
}

export function leaveRoom(): void {
  networkService.send({ event: 'room.leave', payload: { reason: 'user_left' } });
  setTimeout(() => networkService.disconnect(), 25);
  useSettingsStore.getState().clearLastRoomSession();
  useRoomStore.getState().clearRoom();
  useGameStore.getState().resetGame();
}

export function setPlayerReady(ready: boolean): void {
  const roomStore = useRoomStore.getState();
  const playerId = roomStore.localPlayerId;
  if (playerId) roomStore.setPlayerReady(playerId, ready);
  networkService.send({ event: 'player.ready', payload: { ready } });
}

export function setRolePreference(preference: RolePreference): void {
  const roomStore = useRoomStore.getState();
  const playerId = roomStore.localPlayerId;
  if (playerId) roomStore.setRolePreference(playerId, preference);
  networkService.send({ event: 'player.rolePreference', payload: { preference } });
}

export function submitPuzzle(puzzleId: string, action: PuzzleAction): void {
  networkService.send({
    event: 'puzzle.submit',
    payload: {
      puzzleId,
      action,
      clientActionId: networkService.nextActionId(),
    },
  });
}

export function movePlayer(x: number, y: number): void {
  const sequence = networkService.nextActionId();
  networkService.send({
    event: 'player.move',
    payload: { x, y, sequence, timestamp: Date.now() },
  });
}

export function interactObject(
  objectId: string,
  interactionType: InteractionType = 'tap',
  data: Record<string, unknown> = {},
): void {
  networkService.send({
    event: 'interaction.request',
    payload: {
      objectId,
      interactionType,
      data,
      clientActionId: networkService.nextActionId(),
    },
  });
}

export function requestHint(puzzleId: string): void {
  networkService.send({ event: 'request.hint', payload: { puzzleId } });
}

export function sendPing(
  pingType: PingType,
  position: { x: number; y: number } | null = null,
): void {
  networkService.send({
    event: 'ping.send',
    payload: { pingType, position },
  });
}

export function sendChat(text: string): void {
  const normalized = text.trim().slice(0, 240);
  if (!normalized) return;
  networkService.send({ event: 'chat.send', payload: { text: normalized } });
}

export function voteRematch(vote: boolean): void {
  networkService.send({ event: 'rematch.vote', payload: { vote } });
}

export function playTurn(cell: number): void {
  const match = useGameStore.getState().turnMatch;
  if (!match) return;
  networkService.send({
    event: 'turn.move',
    payload: { cell, expectedMove: match.moveNumber },
  });
}

export function forfeitMatch(): void {
  networkService.send({
    event: 'match.forfeit',
    payload: { reason: 'player_confirmed_exit' },
  });
}
