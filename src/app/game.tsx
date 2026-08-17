import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Gamepad2,
  HelpCircle,
  LogOut,
  MessageCircle,
  Minus,
  Plus,
  RotateCw,
  Send,
  SkipForward,
  Smile,
  Sparkles,
  Trophy,
} from 'lucide-react-native';

import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { GameHowToPlayModal } from '@/components/game/GameHowToPlayModal';
import { GameBoardShell } from '@/components/game/GameBoardShell';
import { PipeDirectionGlyph } from '@/components/game/PipeDirectionGlyph';
import {
  CipherClashBoard,
  CircuitClaimBoard,
  GatewayRaceBoard,
  NeonTrailBoard,
  PolarityWarBoard,
} from '@/components/game/NewTurnBoards';
import { triggerHaptic } from '@/services/HapticsService';
import {
  forfeitMatch,
  playTurn,
  resumeRoom,
  sendChat,
  voteRoundSkip,
} from '@/services/NetworkBridge';
import {
  FIRST_DUEL_ROOM_CODE,
  forfeitSinglePlayer,
  playSinglePlayerTurn,
  skipSinglePlayerRound,
} from '@/services/SinglePlayerService';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSettingsStore } from '@/store/settingsStore';
import { trackAnalyticsEvent } from '@/services/AnalyticsService';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { ChatMessage, Player } from '@/types/game';
import type { TurnMatchState } from '@/types/turnGame';
import { useTranslation } from '@/src/i18n';
import { getTurnModeCopy, TURN_UI } from '@/src/i18n/turnGames';
import { findWinningLineCells, resonanceFrequency } from '@/engine/TurnGameEngine';
import {
  TURN_BOARD_GRID_GAP,
  turnBoardCellSize,
} from '@/components/game/turnBoardLayout';
import {
  AnimatedTurnPiece,
  BoardStateFlash,
  TURN_PLAYER_COLORS,
  TurnBoardTransition,
  turnPieceGlow,
  useTurnBoardReducedMotion,
} from '@/components/game/TurnBoardVisuals';

const MEMORY_SYMBOLS = [
  '◆', '●', '▲', '✦', '■', '⬟', '✚', '◈', '★', '◇', '⬢',
  '✿', '☀', '☾', '♠', '♥', '♣', '♦', '◎', '◐', '⌁',
];
const PLAYER_COLORS = TURN_PLAYER_COLORS;
const REACTIONS = ['👏', '😄', '🤔', '🔥', '😮', 'GG'];

function formatClock(value: number): string {
  const totalSeconds = Math.max(0, Math.ceil(value / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function winningCells(match: TurnMatchState): ReadonlySet<number> {
  const winner = match.winnerIndex;
  if (winner === null || match.status !== 'round_complete') return new Set();
  if (match.mode === 'memory_pairs' || match.mode === 'resonance_dials') {
    return new Set(match.cellOwners
      .map((owner, index) => owner === winner ? index : -1)
      .filter((index) => index >= 0));
  }
  if (match.mode === 'pipe_circuit') {
    return new Set(match.cells.map((_, index) => index));
  }
  if (match.mode === 'neon_trail' || match.mode === 'polarity_war') {
    return new Set(match.cells
      .map((owner, index) => owner === winner ? index : -1)
      .filter((index) => index >= 0));
  }
  if (match.mode !== 'rune_grid' && match.mode !== 'connect_four') return new Set();

  return new Set(findWinningLineCells(match, winner));
}

function RoundVictoryBanner({
  match,
  players,
  localPlayerId,
  reduceMotion,
}: {
  match: TurnMatchState;
  players: (Player | undefined)[];
  localPlayerId: string | null;
  reduceMotion: boolean;
}) {
  const { language } = useTranslation();
  const ui = TURN_UI[language];
  const modeCopy = getTurnModeCopy(language, match.mode);
  const [opacity] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [scale] = useState(() => new Animated.Value(reduceMotion ? 1 : 0.84));
  const winner = match.winnerIndex === null ? undefined : players[match.winnerIndex];
  const winnerColor = match.winnerIndex === null ? colors.textSecondary : PLAYER_COLORS[match.winnerIndex];
  const localWon = winner?.id === localPlayerId;

  useEffect(() => {
    if (reduceMotion) return;
    const useNativeDriver = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 11,
        stiffness: 190,
        mass: 0.7,
        useNativeDriver,
      }),
    ]).start();
  }, [opacity, reduceMotion, scale]);

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[
        styles.roundVictory,
        {
          borderColor: winnerColor,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={[styles.roundVictoryIcon, { backgroundColor: `${winnerColor}1F` }]}>
        <Trophy size={24} color={winnerColor} />
      </View>
      <View style={styles.roundVictoryCopy}>
        <ThemedText variant="label" style={{ color: winnerColor }}>
          {winner
            ? localWon ? ui.roundYouWon : ui.roundWinner(winner.displayName)
            : ui.roundDraw}
        </ThemedText>
        <ThemedText variant="caption" color="secondary">
          {winner ? modeCopy.winReason : ui.noRoundPoints}
        </ThemedText>
      </View>
      {winner && (
        <View style={[styles.roundPointBadge, { borderColor: winnerColor }]}>
          <ThemedText variant="label" style={{ color: winnerColor }}>+1</ThemedText>
          <ThemedText variant="caption" color="muted">{ui.points}</ThemedText>
        </View>
      )}
    </Animated.View>
  );
}

function PlayerCard({
  player,
  index,
  active,
  score,
  time,
  refined = false,
}: {
  player: Player | undefined;
  index: 0 | 1;
  active: boolean;
  score: number;
  time: number;
  refined?: boolean;
}) {
  const { language } = useTranslation();
  const ui = TURN_UI[language];
  const color = PLAYER_COLORS[index];
  const name = player?.displayName ?? [ui.player, index + 1].join(' ');
  return (
    <View style={[
      styles.playerCard,
      refined && styles.playerCardRefined,
      refined && (index === 0 ? styles.playerCardTeal : styles.playerCardAmber),
      active && {
        borderColor: color,
        backgroundColor: refined ? (index === 0 ? '#E3F8F4' : '#FFF1E1') : `${color}16`,
      },
    ]}>
      <PlayerAvatar
        avatarId={player?.avatarId}
        size={38}
        color={color}
        backgroundColor={`${color}22`}
        borderColor={color}
      />
      <View style={styles.playerCopy}>
        <ThemedText numberOfLines={1} variant="label" style={styles.playerName}>{name}</ThemedText>
        <ThemedText variant="caption" color="muted">
          {active ? ui.turnStatus : ui.waiting} · {score} {ui.points}
        </ThemedText>
      </View>
      <ThemedText variant="mono" style={[styles.playerTimer, { color }]}>{formatClock(time)}</ThemedText>
    </View>
  );
}

function RuneBoard({ match, disabled, onMove, reduceMotion }: BoardProps) {
  const { language } = useTranslation();
  const ui = TURN_UI[language];
  const viewport = useWindowDimensions();
  const winnerCells = winningCells(match);
  const cellSize = turnBoardCellSize(viewport.width, viewport.height, match.boardColumns);
  const markSize = match.boardColumns >= 6 ? 27 : match.boardColumns >= 5 ? 36 : 64;
  return (
    <View style={styles.runeBoard}>
      {match.cells.map((value, index) => (
        <Pressable
          key={index}
          accessibilityLabel={ui.cell(index + 1)}
          disabled={disabled || value !== null}
          onPress={() => onMove(index)}
          style={({ pressed }) => [
            styles.runeCell,
            { width: cellSize, height: cellSize },
            value !== null && {
              backgroundColor: `${PLAYER_COLORS[value]}18`,
              borderColor: PLAYER_COLORS[value],
            },
            value !== null && styles.filledCell,
            winnerCells.has(index) && [styles.winningCell, { borderColor: PLAYER_COLORS[match.winnerIndex!] }],
            pressed && styles.pressed,
          ]}
        >
          {value !== null && (
            <AnimatedTurnPiece
              identity={`${value}-${winnerCells.has(index)}`}
              color={PLAYER_COLORS[value]}
              completed={winnerCells.has(index)}
              reduceMotion={reduceMotion}
            >
              <ThemedText style={[
                styles.runeMark,
                { color: PLAYER_COLORS[value], fontSize: markSize, lineHeight: markSize + 6 },
              ]}>
                {value === 0 ? '○' : '×'}
              </ThemedText>
            </AnimatedTurnPiece>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function ConnectBoard({ match, disabled, onMove, reduceMotion }: BoardProps) {
  const { language } = useTranslation();
  const ui = TURN_UI[language];
  const winnerCells = winningCells(match);
  return (
    <View style={styles.connectBoard}>
      {Array.from({ length: match.boardColumns }, (_, column) => (
        <Pressable
          key={column}
          accessibilityLabel={ui.column(column + 1)}
          disabled={disabled || match.cells[column] !== null}
          onPress={() => onMove(column)}
          style={({ pressed }) => [styles.connectColumn, pressed && styles.columnPressed]}
        >
          {Array.from({ length: match.boardRows }, (_, row) => {
            const index = row * match.boardColumns + column;
            const value = match.cells[index];
            return (
              <View
                key={row}
                style={[
                  styles.connectSlot,
                  winnerCells.has(index) && styles.winningConnectSlot,
                ]}
              >
                {value !== null && (
                  <AnimatedTurnPiece
                    identity={`${value}-${winnerCells.has(index)}`}
                    color={PLAYER_COLORS[value]}
                    glow
                    completed={winnerCells.has(index)}
                    reduceMotion={reduceMotion}
                    style={[
                      styles.connectPiece,
                      { backgroundColor: PLAYER_COLORS[value] },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </Pressable>
      ))}
    </View>
  );
}

function MemoryBoard({ match, disabled, onMove, reduceMotion }: BoardProps) {
  const { language } = useTranslation();
  const ui = TURN_UI[language];
  const viewport = useWindowDimensions();
  const winnerCells = winningCells(match);
  const cellSize = turnBoardCellSize(viewport.width, viewport.height, match.boardColumns);
  const symbolSize = match.boardColumns >= 6 ? 18 : match.boardColumns >= 5 ? 23 : 30;
  return (
    <View style={styles.memoryBoard}>
      {match.cells.map((value, index) => {
        const matched = match.matchedCells.includes(index);
        const owner = match.cellOwners[index];
        return (
          <Pressable
            key={index}
            accessibilityLabel={ui.card(index + 1)}
            disabled={disabled || value !== null || matched}
            onPress={() => onMove(index)}
            style={({ pressed }) => [
              styles.memoryCard,
              { width: cellSize, height: cellSize },
              value !== null && styles.memoryCardOpen,
              matched && styles.memoryCardMatched,
              owner !== null && owner !== undefined && {
                backgroundColor: `${PLAYER_COLORS[owner]}1F`,
                borderColor: PLAYER_COLORS[owner],
              },
              winnerCells.has(index) && [styles.winningCell, { borderColor: PLAYER_COLORS[match.winnerIndex!] }],
              pressed && styles.pressed,
            ]}
          >
            {value === null ? (
              <ThemedText style={[styles.memorySymbol, styles.memoryHiddenSymbol]}>?</ThemedText>
            ) : (
              <AnimatedTurnPiece
                identity={`${value}-${matched}-${owner ?? 'none'}`}
                color={owner === null || owner === undefined
                  ? PLAYER_COLORS[value % 2]
                  : PLAYER_COLORS[owner]}
                completed={matched}
                reduceMotion={reduceMotion}
              >
                <ThemedText style={[
                  styles.memorySymbol,
                  {
                    color: PLAYER_COLORS[value % 2],
                    fontSize: symbolSize,
                    lineHeight: symbolSize + 6,
                  },
                ]}>
                  {MEMORY_SYMBOLS[value]}
                </ThemedText>
              </AnimatedTurnPiece>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function PipeBoard({ match, disabled, onMove, reduceMotion }: BoardProps) {
  const { language } = useTranslation();
  const ui = TURN_UI[language];
  const viewport = useWindowDimensions();
  const winnerCells = winningCells(match);
  const cellSize = turnBoardCellSize(viewport.width, viewport.height, match.boardColumns);
  const glyphSize = match.boardColumns >= 6 ? 25 : match.boardColumns >= 5 ? 31 : 58;
  return (
    <View style={styles.pipeBoard}>
      {match.cells.map((rotation, index) => {
        const kind = match.tileKinds?.[index] ?? 'straight';
        const owner = match.cellOwners[index];
        return (
          <Pressable
            key={index}
            accessibilityLabel={ui.pipePiece(index + 1, rotation ?? 0)}
            accessibilityHint={ui.rotateHint}
            disabled={disabled || owner !== null}
            onPress={() => onMove(index)}
            style={({ pressed }) => [
              styles.pipeCell,
              { width: cellSize, height: cellSize },
              owner !== null && owner !== undefined && {
                backgroundColor: `${PLAYER_COLORS[owner]}1F`,
                borderColor: PLAYER_COLORS[owner],
              },
              winnerCells.has(index) && [styles.winningCell, { borderColor: PLAYER_COLORS[match.winnerIndex!] }],
              pressed && styles.pressed,
            ]}
          >
            <AnimatedTurnPiece
              identity={`${rotation}-${owner ?? 'open'}`}
              color={index === 0 || index === match.cells.length - 1
                ? colors.actionAmber
                : colors.actionCyan}
              completed={owner !== null}
              reduceMotion={reduceMotion}
            >
              <PipeDirectionGlyph
                kind={kind}
                rotation={rotation ?? 0}
                size={glyphSize}
                color={index === 0 || index === match.cells.length - 1
                  ? colors.actionAmber
                  : colors.actionCyan}
              />
            </AnimatedTurnPiece>
            <View style={styles.pipeTarget}>
              <PipeDirectionGlyph
                kind={kind}
                rotation={match.targets?.[index] ?? 0}
                size={14}
                color={colors.textMuted}
              />
            </View>
            <View style={styles.rotateBadge}>
              <RotateCw size={12} color={colors.textMuted} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ResonanceBoard({ match, disabled, onMove, reduceMotion }: BoardProps) {
  const { language } = useTranslation();
  const ui = TURN_UI[language];
  const winnerCells = winningCells(match);
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  return (
    <View style={styles.resonanceBoard}>
      <View style={styles.targetStrip}>
        <ThemedText variant="caption" color="muted">{ui.targetFrequencies}</ThemedText>
        <View style={styles.targetFrequencyGrid}>
          {match.targets?.map((target, index) => {
            const channelColor = index % 2 ? colors.amber : colors.cyan;
            const frequency = resonanceFrequency(index, target);
            return (
              <View
                key={labels[index]}
                accessibilityLabel={ui.channelTarget(labels[index], frequency)}
                style={[styles.targetFrequencyChip, { borderColor: channelColor }]}
              >
                <View style={[styles.targetChannelBadge, { backgroundColor: `${channelColor}20` }]}>
                  <ThemedText variant="label" style={{ color: channelColor }}>{labels[index]}</ThemedText>
                </View>
                <ThemedText variant="mono" style={styles.targetFrequencyNumber}>{frequency}</ThemedText>
                <ThemedText variant="caption" color="muted">Hz</ThemedText>
              </View>
            );
          })}
        </View>
      </View>
      {match.cells.map((value, dial) => (
        <View
          key={dial}
          style={[
            styles.dialRow,
            match.cellOwners[dial] !== null && match.cellOwners[dial] !== undefined && {
              backgroundColor: `${PLAYER_COLORS[match.cellOwners[dial]!]}1F`,
              borderColor: PLAYER_COLORS[match.cellOwners[dial]!],
            },
            winnerCells.has(dial) && [styles.winningCell, { borderColor: PLAYER_COLORS[match.winnerIndex!] }],
          ]}
        >
          <View style={styles.dialLabel}>
            <ThemedText variant="subtitle" style={{ color: dial % 2 ? colors.amber : colors.cyan }}>
              {labels[dial]}
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel={ui.channelDecrease(labels[dial])}
            disabled={disabled || value === match.targets?.[dial]}
            onPress={() => onMove(dial * 2)}
            style={styles.dialButton}
          >
            <Minus size={20} color={colors.textSecondary} />
          </Pressable>
          <AnimatedTurnPiece
            identity={`${dial}-${value === match.targets?.[dial]}`}
            color={dial % 2 ? colors.actionAmber : colors.actionCyan}
            completed={value === match.targets?.[dial]}
            reduceMotion={reduceMotion}
            style={[
              styles.frequencyValue,
              value === match.targets?.[dial] && styles.frequencyMatched,
            ]}
          >
            <ThemedText variant="mono" style={{ color: colors.textPrimary, fontSize: 20 }}>
              {resonanceFrequency(dial, value)}
            </ThemedText>
            <ThemedText variant="caption" color="muted">Hz</ThemedText>
          </AnimatedTurnPiece>
          <Pressable
            accessibilityLabel={ui.channelIncrease(labels[dial])}
            disabled={disabled || value === match.targets?.[dial]}
            onPress={() => onMove(dial * 2 + 1)}
            style={styles.dialButton}
          >
            <Plus size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

interface BoardProps {
  match: TurnMatchState;
  disabled: boolean;
  onMove: (cell: number) => void;
  reduceMotion: boolean;
}

export default function GameScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const turnUi = TURN_UI[language];
  const { height } = useWindowDimensions();
  const [panel, setPanel] = useState<'chat' | 'emoji' | null>(null);
  const [message, setMessage] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [reactionToast, setReactionToast] = useState<ChatMessage | null>(null);
  const lastReactionId = useRef<string | null>(null);
  const celebratedRoundId = useRef<string | null>(null);
  const pageRef = useRef<ScrollView>(null);
  const recoveryAttempted = useRef(false);
  const firstMoveTracked = useRef(false);
  const match = useGameStore((state) => state.turnMatch);
  const phase = useGameStore((state) => state.phase);
  const chatMessages = useGameStore((state) => state.chatMessages);
  const room = useRoomStore((state) => state.room);
  const localPlayerId = useRoomStore((state) => state.localPlayerId);
  const reduceMotion = useTurnBoardReducedMotion();
  const settingsLoaded = useSettingsStore((state) => state.isLoaded);
  const lastRoomCode = useSettingsStore((state) => state.lastRoomCode);
  const lastRoomPlayerId = useSettingsStore((state) => state.lastRoomPlayerId);
  const lastRoomReconnectToken = useSettingsStore((state) => state.lastRoomReconnectToken);
  const singlePlayer = room?.sessionMode === 'single_player';
  const firstDuel = room?.code === FIRST_DUEL_ROOM_CODE;

  useEffect(() => {
    if (phase === 'completed' || phase === 'failed') router.replace('/results');
  }, [phase, router]);

  useEffect(() => {
    if (room || match || !settingsLoaded || recoveryAttempted.current) return;
    recoveryAttempted.current = true;
    if (!lastRoomCode || !lastRoomPlayerId || !lastRoomReconnectToken) {
      router.replace('/');
      return;
    }
    void resumeRoom(lastRoomCode, lastRoomPlayerId, lastRoomReconnectToken).then((restored) => {
      if (!restored) router.replace('/');
    });
  }, [lastRoomCode, lastRoomPlayerId, lastRoomReconnectToken, match, room, router, settingsLoaded]);

  useEffect(() => {
    const latest = chatMessages[chatMessages.length - 1];
    if (!latest || lastReactionId.current === latest.id || !REACTIONS.includes(latest.text)) return;
    lastReactionId.current = latest.id;
    setReactionToast(latest);
    const timeout = setTimeout(() => setReactionToast(null), 2400);
    return () => clearTimeout(timeout);
  }, [chatMessages]);

  useEffect(() => {
    if (
      match?.status !== 'round_complete' ||
      celebratedRoundId.current === match.roundId
    ) return;
    celebratedRoundId.current = match.roundId;
    const winnerId = match.winnerIndex === null ? null : match.playerIds[match.winnerIndex];
    triggerHaptic(winnerId === localPlayerId ? 'success' : winnerId ? 'medium' : 'light');
  }, [localPlayerId, match?.playerIds, match?.roundId, match?.status, match?.winnerIndex]);

  useEffect(() => {
    pageRef.current?.scrollTo({ y: 0, animated: false });
  }, [match?.roundId]);

  const players = useMemo(
    () => match?.playerIds.map((id) => room?.players.find((player) => player.id === id)) ?? [],
    [match?.playerIds, room?.players],
  );
  const isMyTurn = !!match && match.playerIds[match.activePlayerIndex] === localPlayerId;
  const localPlayerIndex = match?.playerIds.indexOf(localPlayerId ?? '') ?? -1;
  const skipVotes = match?.skipVotes ?? [false, false];
  const localSkipVoted = localPlayerIndex >= 0 ? skipVotes[localPlayerIndex] : false;
  const remoteSkipVoted = localPlayerIndex >= 0 ? skipVotes[1 - localPlayerIndex] : false;
  const disabled = !isMyTurn || match?.status !== 'playing';

  const handleMove = useCallback((cell: number) => {
    if (disabled) return;
    if (!firstMoveTracked.current && match) {
      firstMoveTracked.current = true;
      trackAnalyticsEvent('first_move', {
        playMode: firstDuel ? 'tutorial' : singlePlayer ? 'solo' : 'online',
        difficulty: room?.difficulty === 'final' ? 'hard' : room?.difficulty,
        mode: (
          match.mode === 'rune_grid'
          || match.mode === 'memory_pairs'
          || match.mode === 'circuit_claim'
          || match.mode === 'neon_trail'
        ) ? match.mode : undefined,
      });
    }
    triggerHaptic('light');
    if (singlePlayer) {
      playSinglePlayerTurn(cell);
    } else {
      playTurn(cell);
    }
  }, [disabled, firstDuel, match, room?.difficulty, singlePlayer]);

  const handleSend = useCallback(() => {
    if (!message.trim()) return;
    sendChat(message);
    setMessage('');
  }, [message]);

  const handleLeave = useCallback(() => setShowExitConfirm(true), []);

  if (!match || !room) {
    return (
      <View style={styles.loading}>
        <ThemedText color="muted">{turnUi.loading}</ThemedText>
      </View>
    );
  }

  const modeCopy = getTurnModeCopy(language, match.mode);
  const refinedConnectFour = match.mode === 'connect_four';
  const compact = height < 900;
  const latestCipherGuess = match.cipherHistory?.[match.cipherHistory.length - 1];
  const boardFeedbackColor = match.status === 'round_complete'
    ? colors.success
    : match.mode === 'memory_pairs' && match.status === 'resolving'
      ? colors.warning
      : match.mode === 'cipher_clash'
        && latestCipherGuess
        && latestCipherGuess.exact < (match.cipherCodeLength ?? 4)
        ? colors.error
        : PLAYER_COLORS[match.activePlayerIndex];
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <ScrollView
        ref={pageRef}
        contentContainerStyle={[styles.page, compact && styles.pageCompact]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topbar, refinedConnectFour && styles.topbarRefined]}>
          <View>
            <ThemedText variant="caption" color="accent">
              {singlePlayer ? turnUi.soloHeader : turnUi.sharedHeader}
            </ThemedText>
            <ThemedText variant="subtitle" style={refinedConnectFour && styles.gameTitleRefined}>{modeCopy.title}</ThemedText>
          </View>
          <View style={styles.topbarActions}>
            <IconButton
              accessibilityLabel={turnUi.skipRound}
              disabled={match.status !== 'playing' && match.status !== 'resolving'}
              onPress={() => setShowSkipConfirm(true)}
              tone={localSkipVoted ? 'accent' : 'neutral'}
              shape="pill"
              selected={localSkipVoted}
              icon={<SkipForward size={19} color={localSkipVoted ? colors.amberMuted : colors.primaryDark} />}
            />
            <IconButton
              accessibilityLabel={turnUi.leaveGame}
              onPress={handleLeave}
              tone="danger"
              shape="pill"
              icon={<LogOut size={20} color={colors.error} />}
            />
          </View>
        </View>

        <View style={[styles.players, refinedConnectFour && styles.playersRefined]}>
          <PlayerCard
            player={players[0]}
            index={0}
            active={match.activePlayerIndex === 0 && match.status === 'playing'}
            score={match.scores[0]}
            time={match.playerTimeMs[0]}
            refined={refinedConnectFour}
          />
          {refinedConnectFour && (
            <View style={styles.versusBadge}>
              <ThemedText variant="caption" style={styles.versusText}>VS</ThemedText>
            </View>
          )}
          <PlayerCard
            player={players[1]}
            index={1}
            active={match.activePlayerIndex === 1 && match.status === 'playing'}
            score={match.scores[1]}
            time={match.playerTimeMs[1]}
            refined={refinedConnectFour}
          />
        </View>

        <View style={[styles.turnRow, refinedConnectFour && styles.turnRowRefined]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={turnUi.howToFor(modeCopy.title)}
            hitSlop={7}
            onPress={() => {
              setShowHowToPlay(true);
              triggerHaptic('light');
            }}
            style={({ pressed }) => [
              styles.helpBubble,
              pressed && styles.pressed,
            ]}
          >
            <HelpCircle size={19} color={colors.primaryDark} />
          </Pressable>
          <ThemedText variant="caption" style={styles.gameDescription}>
            {modeCopy.description}
          </ThemedText>
          <ThemedText variant="caption" color="muted">
            TUR {match.roundIndex + 1}/{match.totalRounds}
          </ThemedText>
        </View>

        {firstDuel && match.status === 'playing' && (
          <View style={styles.tutorialCoach}>
            <Sparkles size={19} color={colors.primaryDark} />
            <View style={styles.tutorialCoachCopy}>
              <ThemedText variant="label">{turnUi.tutorialTitle}</ThemedText>
              <ThemedText variant="caption" color="secondary">
                {match.moveNumber === 0
                  ? turnUi.tutorialFirstMove
                  : isMyTurn
                    ? turnUi.tutorialBuildAndBlock
                    : turnUi.tutorialWatchOpponent}
              </ThemedText>
            </View>
          </View>
        )}

        {match.status === 'round_complete' && (
          <RoundVictoryBanner
            match={match}
            players={players}
            localPlayerId={localPlayerId}
            reduceMotion={reduceMotion}
          />
        )}

        {reactionToast && (
          <View style={styles.reactionToast}>
            <View style={[
              styles.reactionAvatar,
              {
                borderColor: reactionToast.playerId === match.playerIds[0] ? colors.cyan : colors.amber,
              },
            ]}>
              <ThemedText variant="label">
                {reactionToast.displayName.slice(0, 1).toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText variant="caption" numberOfLines={1} style={styles.reactionName}>
              {reactionToast.displayName}
            </ThemedText>
            <ThemedText style={styles.reactionText}>{reactionToast.text}</ThemedText>
          </View>
        )}

        <GameBoardShell style={[
          compact && styles.boardShellCompact,
          refinedConnectFour && styles.connectBoardShell,
          match.mode === 'gateway_race' && styles.boardShellGateway,
          match.mode === 'cipher_clash' && styles.boardShellCipher,
          match.mode === 'resonance_dials' && styles.boardShellResonance,
        ]}>
          <TurnBoardTransition roundId={match.roundId} reduceMotion={reduceMotion}>
            {match.mode === 'rune_grid' && (
              <RuneBoard match={match} disabled={disabled} onMove={handleMove} reduceMotion={reduceMotion} />
            )}
            {match.mode === 'connect_four' && (
              <ConnectBoard match={match} disabled={disabled} onMove={handleMove} reduceMotion={reduceMotion} />
            )}
            {match.mode === 'memory_pairs' && (
              <MemoryBoard match={match} disabled={disabled} onMove={handleMove} reduceMotion={reduceMotion} />
            )}
            {match.mode === 'pipe_circuit' && (
              <PipeBoard match={match} disabled={disabled} onMove={handleMove} reduceMotion={reduceMotion} />
            )}
            {match.mode === 'resonance_dials' && (
              <ResonanceBoard match={match} disabled={disabled} onMove={handleMove} reduceMotion={reduceMotion} />
            )}
            {match.mode === 'cipher_clash' && (
              <CipherClashBoard match={match} disabled={disabled} onMove={handleMove} reduceMotion={reduceMotion} />
            )}
            {match.mode === 'circuit_claim' && (
              <CircuitClaimBoard match={match} disabled={disabled} onMove={handleMove} reduceMotion={reduceMotion} />
            )}
            {match.mode === 'neon_trail' && (
              <NeonTrailBoard match={match} disabled={disabled} onMove={handleMove} reduceMotion={reduceMotion} />
            )}
            {match.mode === 'gateway_race' && (
              <GatewayRaceBoard match={match} disabled={disabled} onMove={handleMove} reduceMotion={reduceMotion} />
            )}
            {match.mode === 'polarity_war' && (
              <PolarityWarBoard match={match} disabled={disabled} onMove={handleMove} reduceMotion={reduceMotion} />
            )}
          </TurnBoardTransition>
          <BoardStateFlash
            signal={`${match.moveNumber}-${match.status}`}
            color={boardFeedbackColor}
            reduceMotion={reduceMotion}
          />
          {!isMyTurn && match.status === 'playing' && (
            <View
              testID="opponent-turn-overlay"
              style={[styles.waitOverlay, { pointerEvents: 'none' }]}
            />
          )}
        </GameBoardShell>

        {(
          match.mode === 'memory_pairs'
          || match.mode === 'circuit_claim'
          || match.mode === 'polarity_war'
          || match.mode === 'cipher_clash'
          || match.mode === 'resonance_dials'
        ) && (
          <View style={styles.roundScore}>
            <ThemedText style={{ color: colors.cyan }}>
              {match.mode === 'memory_pairs'
                ? [turnUi.pairs, match.roundPoints[0]].join(' ')
                : match.mode === 'cipher_clash' || match.mode === 'resonance_dials'
                  ? [turnUi.fullMatches, match.roundPoints[0]].join(' ')
                  : [turnUi.area, match.roundPoints[0]].join(' ')}
            </ThemedText>
            <ThemedText color="muted">—</ThemedText>
            <ThemedText style={{ color: colors.amber }}>
              {match.mode === 'memory_pairs'
                ? [match.roundPoints[1], turnUi.pairs].join(' ')
                : match.mode === 'cipher_clash' || match.mode === 'resonance_dials'
                  ? [match.roundPoints[1], turnUi.fullMatches].join(' ')
                  : [match.roundPoints[1], turnUi.area].join(' ')}
            </ThemedText>
          </View>
        )}

        {!singlePlayer && panel === 'chat' && (
          <View style={styles.chatPanel}>
            <View style={styles.chatHistory}>
              {chatMessages.slice(-2).map((item) => {
                const playerIndex = match.playerIds.indexOf(item.playerId);
                const messageColor = playerIndex === 0
                  ? PLAYER_COLORS[0]
                  : playerIndex === 1
                    ? PLAYER_COLORS[1]
                    : colors.textSecondary;
                return (
                  <ThemedText key={item.id} variant="caption">
                    <ThemedText variant="caption" style={{ color: messageColor }}>
                      {item.displayName}:{' '}
                    </ThemedText>
                    {item.text}
                  </ThemedText>
                );
              })}
              {chatMessages.length === 0 && (
                <ThemedText variant="caption" color="muted">{turnUi.chatEmpty}</ThemedText>
              )}
            </View>
            <View style={styles.chatComposer}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                onSubmitEditing={handleSend}
                placeholder={turnUi.chatPlaceholder}
                placeholderTextColor={colors.textMuted}
                maxLength={120}
                style={styles.input}
              />
              <Pressable onPress={handleSend} style={styles.sendButton}>
                <Send size={18} color={colors.textOnPrimary} />
              </Pressable>
            </View>
          </View>
        )}

        {!singlePlayer && panel === 'emoji' && (
          <View style={styles.emojiPanel}>
            {REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  sendChat(emoji);
                  setPanel(null);
                }}
                style={styles.emojiButton}
              >
                <ThemedText style={styles.emoji}>{emoji}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        {!singlePlayer && <View style={styles.dock}>
          <Pressable
            onPress={() => setPanel((value) => value === 'chat' ? null : 'chat')}
            style={[styles.dockButton, panel === 'chat' && styles.dockButtonActive]}
          >
            <MessageCircle size={22} color={panel === 'chat' ? colors.cyan : colors.textMuted} />
            <ThemedText variant="caption">{turnUi.chat}</ThemedText>
          </Pressable>
          <View style={[styles.dockButton, styles.mainDockButton]}>
            <Gamepad2 size={24} color={colors.textOnPrimary} />
            <ThemedText variant="caption" color="onPrimary">{turnUi.game}</ThemedText>
          </View>
          <Pressable
            onPress={() => setPanel((value) => value === 'emoji' ? null : 'emoji')}
            style={[styles.dockButton, panel === 'emoji' && styles.dockButtonActive]}
          >
            <Smile size={22} color={panel === 'emoji' ? colors.amber : colors.textMuted} />
            <ThemedText variant="caption">{turnUi.reaction}</ThemedText>
          </Pressable>
        </View>}
      </ScrollView>
      <GameHowToPlayModal
        mode={match.mode}
        visible={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />
      <Modal
        transparent
        visible={showSkipConfirm || localSkipVoted || remoteSkipVoted}
        animationType="fade"
        onRequestClose={() => {
          if (!singlePlayer && localSkipVoted) voteRoundSkip(false);
          setShowSkipConfirm(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.skipConfirmIcon}>
              <SkipForward size={25} color={colors.amberMuted} />
            </View>
            <ThemedText variant="subtitle" style={styles.confirmTitle}>
              {localSkipVoted
                ? turnUi.skipWaitingTitle
                : remoteSkipVoted ? turnUi.skipRemoteTitle : turnUi.skipTitle}
            </ThemedText>
            <ThemedText color="muted" style={styles.confirmDescription}>
              {singlePlayer
                ? turnUi.skipSoloDescription
                : localSkipVoted
                ? turnUi.skipWaitingDescription
                : remoteSkipVoted ? turnUi.skipRemoteDescription : turnUi.skipDescription}
            </ThemedText>
            {localSkipVoted ? (
              <ThemedButton
                label={turnUi.skipCancel}
                variant="secondary"
                size="lg"
                fullWidth
                onPress={() => {
                  voteRoundSkip(false);
                  setShowSkipConfirm(false);
                }}
              />
            ) : (
              <View style={styles.confirmActions}>
                <ThemedButton
                  label={remoteSkipVoted ? turnUi.skipDecline : t('game.exitCancel')}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={() => {
                    if (remoteSkipVoted) voteRoundSkip(false);
                    setShowSkipConfirm(false);
                  }}
                  style={styles.confirmButton}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    singlePlayer
                      ? turnUi.skipSoloApprove
                      : remoteSkipVoted ? turnUi.skipAccept : turnUi.skipApprove
                  }
                  onPress={() => {
                    setShowSkipConfirm(false);
                    if (singlePlayer) {
                      skipSinglePlayerRound();
                    } else {
                      voteRoundSkip(true);
                    }
                  }}
                  style={styles.skipAcceptButton}
                >
                  <ThemedText
                    variant="label"
                    color="onPrimary"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    numberOfLines={1}
                    style={styles.skipAcceptLabel}
                  >
                    {singlePlayer
                      ? turnUi.skipSoloApprove
                      : remoteSkipVoted ? turnUi.skipAccept : turnUi.skipApprove}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        visible={showExitConfirm}
        animationType="fade"
        onRequestClose={() => setShowExitConfirm(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <LogOut size={25} color={colors.error} />
            </View>
            <ThemedText variant="subtitle" style={styles.confirmTitle}>
              {t('game.exitConfirmTitle')}
            </ThemedText>
            <ThemedText color="muted" style={styles.confirmDescription}>
              {t('game.exitConfirmDescription')}
            </ThemedText>
            <View style={styles.confirmActions}>
              <ThemedButton
                label={t('game.exitCancel')}
                variant="secondary"
                size="lg"
                fullWidth
                onPress={() => setShowExitConfirm(false)}
                style={styles.confirmButton}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('game.exitAccept')}
                onPress={() => {
                  setShowExitConfirm(false);
                  if (singlePlayer) {
                    forfeitSinglePlayer();
                  } else {
                    forfeitMatch();
                  }
                }}
                style={styles.forfeitButton}
              >
                <ThemedText variant="label" style={{ color: '#FFFFFF' }}>
                  {t('game.exitAccept')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundDeep },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundDeep },
  page: { flexGrow: 1, width: '100%', maxWidth: 680, alignSelf: 'center', justifyContent: 'center', padding: spacing.xl, gap: 15 },
  pageCompact: { paddingVertical: spacing.sm, gap: 15 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topbarRefined: { minHeight: 52 },
  gameTitleRefined: { color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 25, lineHeight: 30, letterSpacing: -0.35 },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  players: { flexDirection: 'row', gap: 15 },
  playersRefined: { position: 'relative', gap: 10 },
  playerCard: { flex: 1, minWidth: 0, minHeight: 68, padding: spacing.sm, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.lg, backgroundColor: colors.surfaceDark, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  playerCardRefined: { minHeight: 72, paddingHorizontal: 10, borderWidth: 1, ...shadows.sm },
  playerCardTeal: { borderColor: 'rgba(34,200,184,0.48)', backgroundColor: '#EDFAF7' },
  playerCardAmber: { borderColor: 'rgba(245,166,58,0.48)', backgroundColor: '#FFF7EC' },
  versusBadge: { position: 'absolute', zIndex: 3, left: '50%', top: '50%', width: 28, height: 28, marginLeft: -14, marginTop: -14, pointerEvents: 'none', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  versusText: { color: colors.textMuted, fontFamily: 'Quicksand-Bold', fontSize: 9, lineHeight: 12 },
  playerCopy: { flex: 1, minWidth: 0 },
  playerName: { fontSize: 12, letterSpacing: 0.2 },
  playerTimer: { flexShrink: 0, fontSize: 16, letterSpacing: 0.6 },
  turnRow: { minHeight: 34, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
  turnRowRefined: { minHeight: 40, borderRadius: radius.lg, borderColor: 'rgba(34,200,184,0.28)', backgroundColor: 'rgba(255,255,255,0.78)' },
  helpBubble: { width: 30, height: 30, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  gameDescription: { flex: 1, textAlign: 'center', color: colors.textSecondary },
  tutorialCoach: { width: '100%', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryContainer, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tutorialCoachCopy: { flex: 1, gap: spacing.xs },
  reactionToast: { position: 'absolute', zIndex: 20, top: 168, left: spacing.xl, right: spacing.xl, maxWidth: 400, alignSelf: 'center', minHeight: 54, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, ...shadows.md },
  reactionAvatar: { width: 32, height: 32, flexShrink: 0, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated },
  reactionName: { flex: 1, color: colors.textPrimary },
  reactionText: { fontSize: 23, lineHeight: 28 },
  boardShellCompact: { maxWidth: 430 },
  connectBoardShell: { padding: 10, borderColor: 'rgba(34,200,184,0.58)', backgroundColor: '#FFFEFA', ...shadows.md },
  boardShellGateway: { aspectRatio: 0.86, maxHeight: 620 },
  boardShellCipher: { aspectRatio: 0.8, maxHeight: 620 },
  boardShellResonance: { aspectRatio: 0.6, maxHeight: 620 },
  waitOverlay: { position: 'absolute', inset: 0, zIndex: 8, backgroundColor: 'rgba(247,244,238,0.62)' },
  runeBoard: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: TURN_BOARD_GRID_GAP, alignContent: 'center', justifyContent: 'center' },
  runeCell: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8FFFD', alignItems: 'center', justifyContent: 'center' },
  filledCell: { backgroundColor: colors.surfaceElevated },
  runeMark: { fontSize: 64, lineHeight: 72, fontWeight: '600' },
  winningCell: { borderWidth: 3, transform: [{ scale: 1.035 }], zIndex: 2, ...shadows.glow },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  connectBoard: { flex: 1, flexDirection: 'row', gap: 5, padding: spacing.sm, borderRadius: radius.xl, backgroundColor: '#DDF5F1', borderWidth: 1, borderColor: 'rgba(34,200,184,0.62)' },
  connectColumn: { flex: 1, gap: 5, justifyContent: 'space-around' },
  columnPressed: { backgroundColor: 'rgba(34,200,184,0.10)', borderRadius: radius.lg },
  connectSlot: { width: '100%', aspectRatio: 1, maxWidth: 62, alignSelf: 'center', borderRadius: radius.pill, backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: 'rgba(17,108,100,0.20)', padding: 3, ...shadows.sm },
  connectPiece: { width: '100%', height: '100%', borderRadius: radius.pill },
  winningConnectSlot: { borderWidth: 4, borderColor: '#FFFFFF', transform: [{ scale: 1.08 }], ...shadows.glow },
  memoryBoard: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: TURN_BOARD_GRID_GAP, alignContent: 'center', justifyContent: 'center' },
  memoryCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8FFFD', alignItems: 'center', justifyContent: 'center' },
  memoryCardOpen: { backgroundColor: colors.surfaceElevated, borderColor: colors.cyanMuted },
  memoryCardMatched: { backgroundColor: colors.primaryContainer, borderColor: colors.success },
  memorySymbol: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  memoryHiddenSymbol: { color: colors.border, fontSize: 30, lineHeight: 36 },
  pipeBoard: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: TURN_BOARD_GRID_GAP, alignContent: 'center', justifyContent: 'center' },
  pipeCell: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F1FBF8', alignItems: 'center', justifyContent: 'center' },
  pipeTarget: { position: 'absolute', left: 6, top: 5, opacity: 0.48 },
  rotateBadge: { position: 'absolute', right: 7, bottom: 7, width: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
  resonanceBoard: { flex: 1, justifyContent: 'center', gap: 10 },
  targetStrip: { flexShrink: 0, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.secondaryContainer, borderWidth: 1, borderColor: colors.amber, alignItems: 'center', gap: spacing.xs },
  targetFrequencyGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  targetFrequencyChip: { width: '31%', minWidth: 82, minHeight: 32, paddingHorizontal: 5, borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  targetChannelBadge: { width: 22, height: 22, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  targetFrequencyNumber: { color: colors.textPrimary, fontSize: 13, lineHeight: 16 },
  dialRow: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: 6, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceElevated },
  dialLabel: { width: 36, alignItems: 'center' },
  dialButton: { width: 42, height: 42, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  frequencyValue: { flex: 1, height: 48, minWidth: 0, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  frequencyMatched: { borderColor: colors.success, backgroundColor: '#E1FAEC', ...turnPieceGlow(colors.success) },
  roundVictory: { width: '100%', minHeight: 78, padding: spacing.md, borderRadius: radius.xl, borderWidth: 2, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.md, ...shadows.md },
  roundVictoryIcon: { width: 48, height: 48, flexShrink: 0, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  roundVictoryCopy: { flex: 1, minWidth: 0, gap: 2 },
  roundPointBadge: { minWidth: 52, height: 52, flexShrink: 0, paddingHorizontal: spacing.sm, borderRadius: radius.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  roundScore: { flexDirection: 'row', justifyContent: 'center', gap: 15 },
  dock: { flexDirection: 'row', alignSelf: 'center', gap: spacing.sm, padding: spacing.xs, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceDark },
  dockButton: { minWidth: 82, height: 52, paddingHorizontal: spacing.md, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dockButtonActive: { backgroundColor: colors.surfaceElevated },
  mainDockButton: { backgroundColor: colors.primary },
  chatPanel: { gap: 10, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceDark },
  chatHistory: { width: '100%', minWidth: 0 },
  chatComposer: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minWidth: 0, height: 42, color: colors.textPrimary, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  sendButton: { width: 42, height: 42, flexShrink: 0, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  emojiPanel: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.sm },
  emojiButton: { width: 48, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  modalBackdrop: { flex: 1, padding: spacing.xl, backgroundColor: 'rgba(23,35,31,0.32)', alignItems: 'center', justifyContent: 'center' },
  confirmCard: { width: '100%', maxWidth: 440, padding: spacing.xl, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', gap: spacing.md, ...shadows.lg },
  confirmIcon: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: '#FCEAE7', alignItems: 'center', justifyContent: 'center' },
  skipConfirmIcon: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { textAlign: 'center' },
  confirmDescription: { textAlign: 'center', maxWidth: 330 },
  confirmActions: { width: '100%', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  confirmButton: { flex: 1 },
  skipAcceptButton: { flex: 1.2, minHeight: 52, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  skipAcceptLabel: { flexShrink: 1, fontSize: 12, lineHeight: 15, textAlign: 'center' },
  forfeitButton: { flex: 1, minHeight: 52, borderRadius: radius.lg, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
});
