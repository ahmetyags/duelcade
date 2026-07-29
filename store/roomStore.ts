/**
 * Room store — manages lobby and room lifecycle state.
 * Handles room creation, joining, player tracking, and ready states.
 */

import { create } from 'zustand';
import type {
  RoomConfig,
  Player,
  PlayerRole,
  RolePreference,
  Difficulty,
} from '@/types/game';

interface RoomStoreState {
  room: RoomConfig | null;
  localPlayerId: string | null;
  isHost: boolean;
  roomCode: string | null;
  error: string | null;
  isLoading: boolean;

  // Actions
  setRoom: (room: RoomConfig) => void;
  setLocalPlayer: (playerId: string, isHost: boolean) => void;
  setRoomCode: (code: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  setPlayerReady: (playerId: string, ready: boolean) => void;
  setRolePreference: (playerId: string, preference: RolePreference) => void;
  assignRoles: (roles: Record<string, PlayerRole>) => void;
  setRoomStatus: (status: RoomConfig['status']) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearRoom: () => void;

  // Selectors
  getLocalPlayer: () => Player | null;
  getOtherPlayer: () => Player | null;
  getMyRole: () => PlayerRole | null;
  allReady: () => boolean;
  playerCount: () => number;
}

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  room: null,
  localPlayerId: null,
  isHost: false,
  roomCode: null,
  error: null,
  isLoading: false,

  setRoom: (room) => set({ room, error: null }),

  setLocalPlayer: (playerId, isHost) => set({ localPlayerId: playerId, isHost }),

  setRoomCode: (code) => set({ roomCode: code }),

  addPlayer: (player) =>
    set((state) => {
      if (!state.room) return state;
      const exists = state.room.players.some((p) => p.id === player.id);
      if (exists) return state;
      return {
        room: {
          ...state.room,
          players: [...state.room.players, player],
        },
      };
    }),

  removePlayer: (playerId) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          players: state.room.players.filter((p) => p.id !== playerId),
        },
      };
    }),

  updatePlayer: (playerId, updates) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          players: state.room.players.map((p) =>
            p.id === playerId ? { ...p, ...updates } : p,
          ),
        },
      };
    }),

  setPlayerReady: (playerId, ready) =>
    get().updatePlayer(playerId, { isReady: ready }),

  setRolePreference: (playerId, preference) =>
    get().updatePlayer(playerId, { rolePreference: preference }),

  assignRoles: (roles) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          players: state.room.players.map((p) => ({
            ...p,
            role: roles[p.id] ?? null,
          })),
        },
      };
    }),

  setRoomStatus: (status) =>
    set((state) => ({
      room: state.room ? { ...state.room, status } : null,
    })),

  setDifficulty: (difficulty) =>
    set((state) => ({
      room: state.room ? { ...state.room, difficulty } : null,
    })),

  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  clearRoom: () =>
    set({
      room: null,
      localPlayerId: null,
      isHost: false,
      roomCode: null,
      error: null,
      isLoading: false,
    }),

  getLocalPlayer: () => {
    const { room, localPlayerId } = get();
    if (!room || !localPlayerId) return null;
    return room.players.find((p) => p.id === localPlayerId) ?? null;
  },

  getOtherPlayer: () => {
    const { room, localPlayerId } = get();
    if (!room || !localPlayerId) return null;
    return room.players.find((p) => p.id !== localPlayerId) ?? null;
  },

  getMyRole: () => {
    const local = get().getLocalPlayer();
    return local?.role ?? null;
  },

  allReady: () => {
    const { room } = get();
    if (!room || room.players.length < 2) return false;
    return room.players.every((p) => p.isReady);
  },

  playerCount: () => {
    const { room } = get();
    return room?.players.length ?? 0;
  },
}));
