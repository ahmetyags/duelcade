import { SeededRandom } from '@/engine/SeededRandom';
import {
  advanceTurnRound,
  applyTurnMove,
  createTurnMatchSession,
  encodeCipherGuess,
  legalTurnMoves,
  normalizeMatchDurationMinutes,
  resolveMemoryTurn,
  roundCountForDuration,
  skipTurnRound,
  tickTurnClock,
} from '@/engine/TurnGameEngine';
import { networkService } from '@/services/NetworkService';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSettingsStore } from '@/store/settingsStore';
import { trackAnalyticsEvent } from '@/services/AnalyticsService';
import { translate } from '@/src/i18n';
import type { Difficulty, GameResult, Player, RoomConfig } from '@/types/game';
import type {
  TurnMatchSession,
  TurnMatchState,
  TurnMoveResult,
} from '@/types/turnGame';

const HUMAN_ID = 'solo_player';
const BOT_ID = 'solo_bot';
const SOLO_ROOM_CODE = 'SOLO';
export const FIRST_DUEL_ROOM_CODE = 'TUTOR1';

let session: TurnMatchSession | null = null;
let startedAt = 0;
let lastTickAt = 0;
let clockTimer: ReturnType<typeof setInterval> | null = null;
let botTimer: ReturnType<typeof setTimeout> | null = null;
const transitionTimers = new Set<ReturnType<typeof setTimeout>>();
let botMoveCount = 0;

let botMemoryRoundId: string | null = null;
let botMemorySequence = 0;
const botMemory = new Map<number, { value: number; sequence: number }>();

function botMemoryCapacity(difficulty: Difficulty): number {
  if (difficulty === 'final') return 20;
  if (difficulty === 'hard') return 14;
  if (difficulty === 'medium') return 8;
  return 4;
}

function observeMemoryCards(activeSession: TurnMatchSession): void {
  const state = activeSession.state;
  if (state.mode !== 'memory_pairs') return;
  if (botMemoryRoundId !== state.roundId) {
    botMemoryRoundId = state.roundId;
    botMemory.clear();
    botMemorySequence = 0;
  }

  state.cells.forEach((value, index) => {
    if (value === null || state.matchedCells.includes(index)) return;
    botMemory.set(index, { value, sequence: botMemorySequence++ });
  });
  for (const index of state.matchedCells) botMemory.delete(index);

  const capacity = botMemoryCapacity(state.difficulty);
  while (botMemory.size > capacity) {
    const oldest = [...botMemory.entries()]
      .sort((left, right) => left[1].sequence - right[1].sequence)[0]?.[0];
    if (oldest === undefined) break;
    botMemory.delete(oldest);
  }
}

function cloneState(state: TurnMatchState): TurnMatchState {
  return {
    ...state,
    playerIds: [...state.playerIds],
    scores: [...state.scores],
    roundPoints: [...state.roundPoints],
    playerTimeMs: [...state.playerTimeMs],
    cells: [...state.cells],
    cellOwners: [...state.cellOwners],
    selectedCells: [...state.selectedCells],
    matchedCells: [...state.matchedCells],
    tileKinds: state.tileKinds ? [...state.tileKinds] : undefined,
    targets: state.targets ? [...state.targets] : undefined,
    playerPositions: state.playerPositions ? [...state.playerPositions] : undefined,
    wallsRemaining: state.wallsRemaining ? [...state.wallsRemaining] : undefined,
    cipherHistory: state.cipherHistory?.map((entry) => ({
      ...entry,
      guess: [...entry.guess],
    })),
  };
}

function cloneSession(source: TurnMatchSession): TurnMatchSession {
  return {
    ...source,
    state: cloneState(source.state),
    memoryDeck: [...source.memoryDeck],
    solution: [...source.solution],
    cipherSolutions: source.cipherSolutions.map((code) => [...code]) as [number[], number[]],
    modeOrder: [...source.modeOrder],
  };
}

function publish(): void {
  if (!session) return;
  observeMemoryCards(session);
  useGameStore.getState().setTurnMatch(cloneState(session.state));
}

function schedule(callback: () => void, delay: number): void {
  const timer = setTimeout(() => {
    transitionTimers.delete(timer);
    callback();
  }, delay);
  transitionTimers.add(timer);
}

function clearRuntimeTimers(): void {
  if (clockTimer) clearInterval(clockTimer);
  if (botTimer) clearTimeout(botTimer);
  clockTimer = null;
  botTimer = null;
  for (const timer of transitionTimers) clearTimeout(timer);
  transitionTimers.clear();
}

function finishMatch(forfeitedPlayerId: string | null = null): void {
  if (!session) return;
  clearRuntimeTimers();
  const state = session.state;
  const now = Date.now();
  const winnerPlayerId = state.winnerIndex === null
    ? null
    : state.playerIds[state.winnerIndex];
  const result: GameResult = {
    roomId: SOLO_ROOM_CODE,
    success: true,
    failReason: forfeitedPlayerId ? 'player_left' : null,
    completionTimeMs: Math.max(0, now - startedAt),
    remainingTimeMs: state.playerTimeMs[0],
    mistakeCount: 0,
    puzzlesSolved: Math.min(state.roundIndex + 1, state.totalRounds),
    totalPuzzles: state.totalRounds,
    hintsUsed: 0,
    score: state.scores[0],
    roles: {},
    ending: null,
    winnerPlayerId,
    playerScores: {
      [HUMAN_ID]: state.scores[0],
      [BOT_ID]: state.scores[1],
    },
    forfeitedPlayerId,
  };
  useRoomStore.getState().setRoomStatus('completed');
  useGameStore.getState().completeGame(result);
}

function afterMove(result: TurnMoveResult): void {
  if (!session || !result.accepted) return;
  publish();
  if (result.needsResolve) {
    schedule(() => {
      if (!session) return;
      resolveMemoryTurn(session);
      publish();
      scheduleBotIfNeeded();
    }, 850);
    return;
  }
  if (result.roundEnded) {
    schedule(() => {
      if (!session || session.state.status !== 'round_complete') return;
      if (advanceTurnRound(session)) {
        lastTickAt = Date.now();
        publish();
        scheduleBotIfNeeded();
      } else {
        publish();
        finishMatch();
      }
    }, 2200);
    return;
  }
  scheduleBotIfNeeded();
}

function simulatedWinner(source: TurnMatchSession, playerIndex: 0 | 1, cell: number): boolean {
  const copy = cloneSession(source);
  copy.state.activePlayerIndex = playerIndex;
  const result = applyTurnMove(
    copy,
    copy.state.playerIds[playerIndex],
    cell,
    copy.state.moveNumber,
  );
  return result.accepted && copy.state.winnerIndex === playerIndex;
}

function randomItem<T>(values: T[], rng: SeededRandom): T {
  return values[rng.nextInt(0, values.length - 1)];
}

function chooseBotMove(activeSession: TurnMatchSession): number {
  const state = activeSession.state;
  const rng = new SeededRandom(`${activeSession.seed}_bot_${botMoveCount++}_${state.moveNumber}`);
  const quality = state.difficulty === 'hard' || state.difficulty === 'final'
    ? 0.86
    : state.difficulty === 'medium' ? 0.72 : 0.5;

  if (state.mode === 'cipher_clash') {
    const target = activeSession.cipherSolutions[1];
    const attempts = (state.cipherHistory ?? [])
      .filter((entry) => entry.playerIndex === 1).length;
    const solveAfter = state.difficulty === 'final'
      ? 4
      : state.difficulty === 'hard' ? 5 : state.difficulty === 'medium' ? 7 : 9;
    const mistakes = attempts >= solveAfter
      ? 0
      : Math.min(target.length, Math.max(1, Math.ceil((solveAfter - attempts) / 2)));
    const guess = [...target];
    const positions = rng.shuffle(Array.from({ length: guess.length }, (_, index) => index));
    for (const position of positions.slice(0, mistakes)) {
      const offset = rng.nextInt(1, (state.cipherSymbolCount ?? 2) - 1);
      guess[position] = (guess[position] + offset) % (state.cipherSymbolCount ?? 2);
    }
    return encodeCipherGuess(guess, state.cipherSymbolCount ?? 2);
  }

  if (
    state.mode === 'circuit_claim'
    || state.mode === 'neon_trail'
    || state.mode === 'gateway_race'
    || state.mode === 'polarity_war'
  ) {
    const available = legalTurnMoves(activeSession, 1);
    const win = available.find((move) => simulatedWinner(activeSession, 1, move));
    if (win !== undefined) return win;
    if (state.mode === 'circuit_claim' || state.mode === 'polarity_war') {
      const scored = available.map((move) => {
        const copy = cloneSession(activeSession);
        copy.state.activePlayerIndex = 1;
        const before = copy.state.roundPoints[1];
        applyTurnMove(copy, BOT_ID, move, copy.state.moveNumber);
        return { move, gain: copy.state.roundPoints[1] - before };
      }).sort((a, b) => b.gain - a.gain);
      if (scored[0]?.gain > 0 && rng.chance(quality)) return scored[0].move;
    }
    if (state.mode === 'gateway_race' && rng.chance(quality)) {
      const cellCount = state.boardRows * state.boardColumns;
      const movement = available.filter((move) => move < cellCount);
      if (movement.length > 0) {
        return movement.sort((a, b) => {
          const rowA = Math.floor(a / state.boardColumns);
          const rowB = Math.floor(b / state.boardColumns);
          return rowB - rowA;
        })[0];
      }
    }
    if (available.length > 0) return randomItem(available, rng);
  }

  if (state.mode === 'rune_grid') {
    const available = state.cells
      .map((value, index) => value === null ? index : -1)
      .filter((index) => index >= 0);
    const win = available.find((cell) => simulatedWinner(activeSession, 1, cell));
    if (win !== undefined) return win;
    const block = available.find((cell) => simulatedWinner(activeSession, 0, cell));
    if (block !== undefined && rng.chance(Math.min(0.92, quality + 0.1))) return block;
    return randomItem(available, rng);
  }

  if (state.mode === 'connect_four') {
    const available = Array.from({ length: state.boardColumns }, (_, column) => column)
      .filter((column) => state.cells[column] === null);
    const win = available.find((cell) => simulatedWinner(activeSession, 1, cell));
    if (win !== undefined) return win;
    const block = available.find((cell) => simulatedWinner(activeSession, 0, cell));
    if (block !== undefined && rng.chance(quality)) return block;
    return randomItem(available, rng);
  }

  if (state.mode === 'memory_pairs') {
    observeMemoryCards(activeSession);
    const hidden = state.cells
      .map((_, index) => (
        state.matchedCells.includes(index) || state.selectedCells.includes(index) ? -1 : index
      ))
      .filter((index) => index >= 0);
    const first = state.selectedCells[0];
    if (first !== undefined && rng.chance(quality)) {
      const firstValue = botMemory.get(first)?.value ?? state.cells[first];
      const match = hidden.find((index) => botMemory.get(index)?.value === firstValue);
      if (match !== undefined) return match;
    }
    if (first === undefined && rng.chance(quality)) {
      const pairStart = hidden.find((index, offset) => {
        const knownValue = botMemory.get(index)?.value;
        return knownValue !== undefined && hidden
          .slice(offset + 1)
          .some((other) => botMemory.get(other)?.value === knownValue);
      });
      if (pairStart !== undefined) return pairStart;
    }
    return randomItem(hidden, rng);
  }

  if (state.mode === 'pipe_circuit') {
    const mismatched = state.cells
      .map((value, index) => value !== activeSession.solution[index] ? index : -1)
      .filter((index) => index >= 0);
    return mismatched.length > 0 ? randomItem(mismatched, rng) : 0;
  }

  const mismatched = state.cells
    .map((value, index) => value !== activeSession.solution[index] ? index : -1)
    .filter((index) => index >= 0);
  const dial = mismatched.length > 0 ? randomItem(mismatched, rng) : 0;
  if (!rng.chance(quality)) return dial * 2 + rng.nextInt(0, 1);
  const current = state.cells[dial] ?? 0;
  const target = activeSession.solution[dial];
  const forward = (target - current + 5) % 5;
  const backward = (current - target + 5) % 5;
  return dial * 2 + (forward <= backward ? 1 : 0);
}

function scheduleBotIfNeeded(): void {
  if (
    !session ||
    session.state.status !== 'playing' ||
    session.state.activePlayerIndex !== 1 ||
    botTimer
  ) return;
  const delayRng = new SeededRandom(
    `${session.seed}_bot_delay_${botMoveCount}_${session.state.moveNumber}`,
  );
  const baseDelay = session.difficulty === 'hard' || session.difficulty === 'final'
    ? 680
    : session.difficulty === 'medium' ? 860 : 1_150;
  const thinkingDelay = session.state.mode === 'cipher_clash'
    ? 620
    : session.state.mode === 'memory_pairs' && session.state.selectedCells.length === 0
      ? 440
      : 0;
  const delay = baseDelay + thinkingDelay + delayRng.nextInt(80, 260);
  botTimer = setTimeout(() => {
    botTimer = null;
    if (!session || session.state.status !== 'playing' || session.state.activePlayerIndex !== 1) return;
    const cell = chooseBotMove(session);
    const result = applyTurnMove(session, BOT_ID, cell, session.state.moveNumber);
    afterMove(result);
  }, delay);
}

function startClock(): void {
  lastTickAt = Date.now();
  clockTimer = setInterval(() => {
    if (!session) return;
    const now = Date.now();
    const elapsed = now - lastTickAt;
    lastTickAt = now;
    const completed = tickTurnClock(session, elapsed);
    publish();
    if (completed) finishMatch();
  }, 250);
}

export function startSinglePlayer(
  displayName: string,
  difficulty: Difficulty,
  durationMinutes: number,
  options: { tutorial?: boolean } = {},
): void {
  const tutorial = options.tutorial === true;
  clearSinglePlayerSession();
  networkService.disconnect();
  useSettingsStore.getState().clearLastRoomSession();

  const normalizedDuration = normalizeMatchDurationMinutes(durationMinutes);
  const totalRounds = tutorial ? 1 : roundCountForDuration(normalizedDuration);
  const durationMs = normalizedDuration * 60 * 1000;
  const seed = SeededRandom.generateSeed();
  const now = Date.now();
  const players: Player[] = [
    {
      id: HUMAN_ID,
      displayName: displayName.trim().slice(0, 24) || translate(
        useSettingsStore.getState().language,
        'common.playerFallback',
        { number: 1 },
      ),
      avatarId: useSettingsStore.getState().avatarId,
      role: null,
      isHost: true,
      isReady: true,
      rolePreference: 'no_preference',
      connected: true,
      lastSeenAt: now,
    },
    {
      id: BOT_ID,
      displayName: 'DuelBot',
      avatarId: 'bot',
      role: null,
      isHost: false,
      isReady: true,
      rolePreference: 'no_preference',
      connected: true,
      lastSeenAt: now,
    },
  ];
  const room: RoomConfig = {
    code: tutorial ? FIRST_DUEL_ROOM_CODE : SOLO_ROOM_CODE,
    hostId: HUMAN_ID,
    status: 'playing',
    players,
    seed,
    createdAt: now,
    startedAt: now,
    finishedAt: null,
    maxPlayers: 2,
    difficulty,
    puzzleCount: totalRounds,
    matchDurationMinutes: normalizedDuration,
    sessionMode: 'single_player',
  };

  session = createTurnMatchSession(
    seed,
    [HUMAN_ID, BOT_ID],
    totalRounds,
    difficulty,
    durationMs,
    tutorial ? ['rune_grid'] : undefined,
  );
  startedAt = now;
  botMoveCount = 0;

  useRoomStore.getState().clearRoom();
  useGameStore.getState().resetGame();
  useRoomStore.getState().setRoom(room);
  useRoomStore.getState().setRoomCode(room.code);
  useRoomStore.getState().setLocalPlayer(HUMAN_ID, true);
  useGameStore.getState().startGame({
    roomId: room.code,
    levelId: 'single-player-table',
    seed,
    durationMs,
  });
  publish();
  trackAnalyticsEvent('match_started', {
    playMode: tutorial ? 'tutorial' : 'solo',
    difficulty: difficulty === 'final' ? 'hard' : difficulty,
    roundCount: totalRounds,
  });
  startClock();
  scheduleBotIfNeeded();
}

export function playSinglePlayerTurn(cell: number): void {
  if (!session || session.state.activePlayerIndex !== 0) return;
  const result = applyTurnMove(session, HUMAN_ID, cell, session.state.moveNumber);
  afterMove(result);
}

export function skipSinglePlayerRound(): void {
  if (
    !session
    || (session.state.status !== 'playing' && session.state.status !== 'resolving')
  ) return;

  if (botTimer) clearTimeout(botTimer);
  botTimer = null;
  for (const timer of transitionTimers) clearTimeout(timer);
  transitionTimers.clear();

  const advanced = skipTurnRound(session);
  lastTickAt = Date.now();
  publish();
  if (advanced) {
    scheduleBotIfNeeded();
  } else {
    finishMatch();
  }
}

export function forfeitSinglePlayer(): void {
  if (!session || session.state.status === 'match_complete') return;
  session.state.scores[1] += 1;
  session.state.winnerIndex = 1;
  session.state.status = 'match_complete';
  publish();
  finishMatch(HUMAN_ID);
}

export function isSinglePlayerSession(): boolean {
  return useRoomStore.getState().room?.sessionMode === 'single_player';
}

export function clearSinglePlayerSession(): void {
  clearRuntimeTimers();
  session = null;
  botMoveCount = 0;
  botMemoryRoundId = null;
  botMemorySequence = 0;
  botMemory.clear();
}
