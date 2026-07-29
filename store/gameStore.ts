/**
 * Game store — manages the active game session state.
 * This is client-side UI/session state only. The server is authoritative;
 * this store holds the last known server state for rendering.
 */

import { create } from 'zustand';
import type {
  GamePhase,
  GameResult,
  ConnectionInfo,
  FailReason,
  GameEnding,
  WorldViewState,
  ChatMessage,
  GameSnapshot,
} from '@/types/game';
import type { ClientPuzzleState } from '@/types/puzzle';
import type { PingEvent } from '@/types/game';
import type { TurnMatchState } from '@/types/turnGame';

interface GameStoreState {
  // Phase
  phase: GamePhase;
  previousPhase: GamePhase | null;

  // Session
  roomId: string | null;
  levelId: string | null;
  seed: string | null;
  startedAt: number | null;

  // Timer
  totalDurationMs: number;
  remainingTimeMs: number;
  serverTimeOffsetMs: number;

  // Puzzles
  puzzles: ClientPuzzleState[];
  currentPuzzleId: string | null;
  solvedPuzzleIds: string[];
  mistakeCount: number;
  hintsUsed: number;

  world: WorldViewState | null;
  turnMatch: TurnMatchState | null;

  // Pings
  activePings: PingEvent[];
  pingCooldownUntil: number;
  pingCount: number;
  chatMessages: ChatMessage[];

  // Connection
  connectionInfo: ConnectionInfo;

  // Results
  result: GameResult | null;

  // Actions
  setPhase: (phase: GamePhase) => void;
  startGame: (params: { roomId: string; levelId: string; seed: string; durationMs: number }) => void;
  setPuzzles: (puzzles: ClientPuzzleState[]) => void;
  updatePuzzle: (puzzle: ClientPuzzleState) => void;
  setCurrentPuzzle: (puzzleId: string | null) => void;
  markPuzzleSolved: (puzzleId: string, unlockedPuzzleIds: string[], unlockedDoorIds: string[]) => void;
  recordMistake: () => void;
  useHint: () => void;
  restoreCheckpoint: (snapshot: GameSnapshot) => void;
  setWorld: (world: unknown) => void;
  setTurnMatch: (turnMatch: TurnMatchState) => void;
  setPlayerPosition: (position: unknown) => void;
  addPing: (ping: PingEvent) => void;
  removePing: (pingId: string) => void;
  setPingCooldown: (until: number) => void;
  addChatMessage: (message: ChatMessage) => void;
  setConnectionInfo: (info: ConnectionInfo) => void;
  updateRemainingTime: (remainingMs: number) => void;
  completeGame: (result: GameResult) => void;
  failGame: (reason: FailReason, result: GameResult) => void;
  resetGame: () => void;
  goToResults: () => void;
}

const initialState = {
  phase: 'boot' as GamePhase,
  previousPhase: null as GamePhase | null,
  roomId: null,
  levelId: null,
  seed: null,
  startedAt: null,
  totalDurationMs: 20 * 60 * 1000,
  remainingTimeMs: 20 * 60 * 1000,
  serverTimeOffsetMs: 0,
  puzzles: [] as ClientPuzzleState[],
  currentPuzzleId: null,
  solvedPuzzleIds: [] as string[],
  mistakeCount: 0,
  hintsUsed: 0,
  world: null as WorldViewState | null,
  turnMatch: null as TurnMatchState | null,
  activePings: [] as PingEvent[],
  pingCooldownUntil: 0,
  pingCount: 0,
  chatMessages: [] as ChatMessage[],
  connectionInfo: {
    quality: 'good' as const,
    pingMs: 0,
    reconnecting: false,
    gracePeriodRemainingMs: null,
  },
  result: null as GameResult | null,
};

export const useGameStore = create<GameStoreState>((set) => ({
  ...initialState,

  setPhase: (phase) =>
    set((state) => ({
      previousPhase: state.phase,
      phase,
    })),

  startGame: ({ roomId, levelId, seed, durationMs }) =>
    set({
      phase: 'loading_level',
      roomId,
      levelId,
      seed,
      startedAt: Date.now(),
      totalDurationMs: durationMs,
      remainingTimeMs: durationMs,
      puzzles: [],
      currentPuzzleId: null,
      solvedPuzzleIds: [],
      mistakeCount: 0,
      hintsUsed: 0,
      activePings: [],
      pingCount: 0,
      chatMessages: [],
      turnMatch: null,
      result: null,
    }),

  setPuzzles: (puzzles) => set({ puzzles }),

  updatePuzzle: (puzzle) =>
    set((state) => ({
      puzzles: state.puzzles.map((p) => (p.puzzleId === puzzle.puzzleId ? puzzle : p)),
    })),

  setCurrentPuzzle: (puzzleId) => set({ currentPuzzleId: puzzleId }),

  markPuzzleSolved: (puzzleId, unlockedPuzzleIds, _unlockedDoorIds) =>
    set((state) => ({
      puzzles: state.puzzles.map((p) =>
        p.puzzleId === puzzleId ? { ...p, phase: 'solved' as const } : p,
      ),
      solvedPuzzleIds: state.solvedPuzzleIds.includes(puzzleId)
        ? state.solvedPuzzleIds
        : [...state.solvedPuzzleIds, puzzleId],
      currentPuzzleId: unlockedPuzzleIds[0] ?? null,
    })),

  recordMistake: () => set((state) => ({ mistakeCount: state.mistakeCount + 1 })),

  useHint: () => set((state) => ({ hintsUsed: state.hintsUsed + 1 })),

  restoreCheckpoint: (snapshot) =>
    set({
      solvedPuzzleIds: [...snapshot.solvedPuzzleIds],
      remainingTimeMs: snapshot.remainingTimeMs,
      mistakeCount: snapshot.mistakeCount,
    }),

  setWorld: (world) => {
    if (!world || typeof world !== 'object') return;
    const candidate = world as Partial<WorldViewState>;
    if (
      typeof candidate.width !== 'number' ||
      typeof candidate.height !== 'number' ||
      !Array.isArray(candidate.objects)
    ) return;
    set({ world: candidate as WorldViewState });
  },

  setTurnMatch: (turnMatch) => set({ turnMatch, phase: 'playing' }),

  setPlayerPosition: (position) => {
    if (!position || typeof position !== 'object') return;
    const candidate = position as { x?: unknown; y?: unknown; sequence?: unknown };
    if (typeof candidate.x !== 'number' || typeof candidate.y !== 'number') return;
    set((state) => ({
      world: state.world
        ? {
            ...state.world,
            playerPosition: {
              x: candidate.x as number,
              y: candidate.y as number,
              sequence: typeof candidate.sequence === 'number' ? candidate.sequence : undefined,
            },
          }
        : null,
    }));
  },

  addPing: (ping) =>
    set((state) => ({
      activePings: [...state.activePings, ping].slice(-3),
      pingCount: state.pingCount + 1,
    })),

  removePing: (pingId) =>
    set((state) => ({
      activePings: state.activePings.filter((p) => p.id !== pingId),
    })),

  setPingCooldown: (until) => set({ pingCooldownUntil: until }),

  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message].slice(-30),
  })),

  setConnectionInfo: (info) => set({ connectionInfo: info }),

  updateRemainingTime: (remainingMs) => set({ remainingTimeMs: remainingMs }),

  completeGame: (result) => set({ phase: 'completed', result }),

  failGame: (_reason, result) => set({ phase: 'failed', result }),

  resetGame: () => set({ ...initialState, phase: 'home' as GamePhase }),

  goToResults: () => set({ phase: 'results' as GamePhase }),
}));
