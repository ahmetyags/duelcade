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
  Smile,
  Trophy,
} from 'lucide-react-native';

import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { GameHowToPlayModal } from '@/components/game/GameHowToPlayModal';
import {
  CipherClashBoard,
  CircuitClaimBoard,
  GatewayRaceBoard,
  NeonTrailBoard,
  PolarityWarBoard,
} from '@/components/game/NewTurnBoards';
import { triggerHaptic } from '@/services/HapticsService';
import { forfeitMatch, playTurn, sendChat } from '@/services/NetworkBridge';
import {
  forfeitSinglePlayer,
  playSinglePlayerTurn,
} from '@/services/SinglePlayerService';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { ChatMessage, Player } from '@/types/game';
import type { TurnMatchState } from '@/types/turnGame';
import { useTranslation } from '@/src/i18n';
import { findWinningLineCells } from '@/engine/TurnGameEngine';
import {
  TURN_BOARD_GRID_GAP,
  turnBoardCellSize,
} from '@/components/game/turnBoardLayout';

const MEMORY_SYMBOLS = [
  '◆', '●', '▲', '✦', '■', '⬟', '✚', '◈', '★', '◇', '⬢',
  '✿', '☀', '☾', '♠', '♥', '♣', '♦', '◎', '◐', '⌁',
];
const PLAYER_COLORS = [colors.cyan, colors.amber] as const;
const MODE_NAMES = {
  rune_grid: 'Rün Düellosu',
  connect_four: 'Dört Hat',
  memory_pairs: 'Hafıza Eşleri',
  pipe_circuit: 'Devre Döndürme',
  resonance_dials: 'Rezonans Kilidi',
  cipher_clash: 'Şifre Çatışması',
  circuit_claim: 'Devre Alanı',
  neon_trail: 'Neon İz',
  gateway_race: 'Geçit Savaşı',
  polarity_war: 'Polarite Savaşı',
} as const;
const MODE_DESCRIPTIONS = {
  rune_grid: 'Aynı renkten bir çizgiyi rakibinden önce tamamla.',
  connect_four: 'Taşlarını düşür ve kesintisiz hattı ilk sen kur.',
  memory_pairs: 'Aynı sembolleri eşleştir; bulduğun çiftler senin rengin olur.',
  pipe_circuit: 'Parçaları hedef yönlere çevirip devreyi ilk sen tamamla.',
  resonance_dials: 'Kanalları hedef frekanslara getirip kilidi çöz.',
  cipher_clash: 'Kendi gizli rün dizini rakibinden önce çöz.',
  circuit_claim: 'Hatları tamamla, enerji hücrelerini ele geçir.',
  neon_trail: 'İz bırak, alanını koru ve rakibini hareketsiz bırak.',
  gateway_race: 'Kapıya ulaş veya enerji bariyerleriyle rakibini yavaşlat.',
  polarity_war: 'Rakip küreleri kuşatıp kendi polaritene dönüştür.',
} as const;
const REACTIONS = ['👏', '😄', '🤔', '🔥', '😮', 'GG'];

function formatClock(value: number): string {
  const totalSeconds = Math.max(0, Math.ceil(value / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function winningCells(match: TurnMatchState): ReadonlySet<number> {
  const winner = match.winnerIndex;
  if (winner === null || match.status !== 'round_complete') return new Set();
  if (match.mode === 'memory_pairs') {
    return new Set(match.cellOwners
      .map((owner, index) => owner === winner ? index : -1)
      .filter((index) => index >= 0));
  }
  if (match.mode === 'pipe_circuit' || match.mode === 'resonance_dials') {
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

function roundWinReason(match: TurnMatchState): string {
  if (match.mode === 'rune_grid') return 'Kazandıran çizgiyi tamamladı';
  if (match.mode === 'connect_four') return 'Kesintisiz hattı ilk kuran oldu';
  if (match.mode === 'memory_pairs' && match.winnerIndex !== null) {
    return `${match.roundPoints[match.winnerIndex]} eş bularak öne geçti`;
  }
  if (match.mode === 'pipe_circuit') return 'Son devre parçasını doğru yöne çevirdi';
  if (match.mode === 'resonance_dials') return 'Son frekansı hedefe kilitledi';
  if (match.mode === 'cipher_clash') return 'Gizli rün dizisinin tamamını çözdü';
  if (match.mode === 'circuit_claim') {
    return `${match.roundPoints[match.winnerIndex ?? 0]} enerji hücresi ele geçirdi`;
  }
  if (match.mode === 'neon_trail') return 'Rakibinin bütün kaçış yollarını kapattı';
  if (match.mode === 'gateway_race') return 'Karşı enerji kapısına ilk ulaşan oldu';
  return `${match.roundPoints[match.winnerIndex ?? 0]} küreyi kendi polaritesine çevirdi`;
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
            ? localWon ? 'TURU KAZANDIN!' : `${winner.displayName.toUpperCase()} TURU KAZANDI`
            : 'TUR BERABERE'}
        </ThemedText>
        <ThemedText variant="caption" color="secondary">
          {winner ? roundWinReason(match) : 'İki taraf da puan alamadı'}
        </ThemedText>
      </View>
      {winner && (
        <View style={[styles.roundPointBadge, { borderColor: winnerColor }]}>
          <ThemedText variant="label" style={{ color: winnerColor }}>+1</ThemedText>
          <ThemedText variant="caption" color="muted">PUAN</ThemedText>
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
}: {
  player: Player | undefined;
  index: 0 | 1;
  active: boolean;
  score: number;
  time: number;
}) {
  const color = PLAYER_COLORS[index];
  const name = player?.displayName ?? `Oyuncu ${index + 1}`;
  return (
    <View style={[styles.playerCard, active && { borderColor: color, backgroundColor: `${color}16` }]}>
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
          {active ? 'SIRASI' : 'BEKLİYOR'} · {score} PUAN
        </ThemedText>
      </View>
      <ThemedText variant="mono" style={[styles.playerTimer, { color }]}>{formatClock(time)}</ThemedText>
    </View>
  );
}

function RuneBoard({ match, disabled, onMove }: BoardProps) {
  const viewport = useWindowDimensions();
  const winnerCells = winningCells(match);
  const cellSize = turnBoardCellSize(viewport.width, viewport.height, match.boardColumns);
  const markSize = match.boardColumns >= 6 ? 27 : match.boardColumns >= 5 ? 36 : 64;
  return (
    <View style={styles.runeBoard}>
      {match.cells.map((value, index) => (
        <Pressable
          key={index}
          accessibilityLabel={`Hücre ${index + 1}`}
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
            <ThemedText style={[
              styles.runeMark,
              { color: PLAYER_COLORS[value], fontSize: markSize, lineHeight: markSize + 6 },
            ]}>
              {value === 0 ? '○' : '×'}
            </ThemedText>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function ConnectBoard({ match, disabled, onMove }: BoardProps) {
  const winnerCells = winningCells(match);
  return (
    <View style={styles.connectBoard}>
      {Array.from({ length: match.boardColumns }, (_, column) => (
        <Pressable
          key={column}
          accessibilityLabel={`Sütun ${column + 1}`}
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
                  value !== null && {
                    backgroundColor: PLAYER_COLORS[value],
                    borderColor: PLAYER_COLORS[value],
                  },
                  winnerCells.has(index) && styles.winningConnectSlot,
                ]}
              />
            );
          })}
        </Pressable>
      ))}
    </View>
  );
}

function MemoryBoard({ match, disabled, onMove }: BoardProps) {
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
            accessibilityLabel={`Kart ${index + 1}`}
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
            <ThemedText style={[
              styles.memorySymbol,
              {
                color: value === null ? colors.border : PLAYER_COLORS[value % 2],
                fontSize: symbolSize,
                lineHeight: symbolSize + 6,
              },
            ]}>
              {value === null ? '?' : MEMORY_SYMBOLS[value]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function PipeBoard({ match, disabled, onMove }: BoardProps) {
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
            accessibilityLabel={`Devre parçası ${index + 1}, yön ${rotation ?? 0}`}
            accessibilityHint="Saat yönünde döndür"
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
            <ThemedText
              style={[
                styles.pipeGlyph,
                {
                  color: index === 0 || index === 8 ? colors.amber : colors.cyanMuted,
                  transform: [{ rotate: `${(rotation ?? 0) * 90}deg` }],
                  fontSize: glyphSize,
                  lineHeight: glyphSize + 6,
                },
              ]}
            >
              {kind === 'corner' ? '┗' : '━'}
            </ThemedText>
            <ThemedText
              variant="caption"
              color="muted"
              style={[
                styles.pipeTarget,
                { transform: [{ rotate: `${(match.targets?.[index] ?? 0) * 90}deg` }] },
              ]}
            >
              {kind === 'corner' ? '┗' : '━'}
            </ThemedText>
            <View style={styles.rotateBadge}>
              <RotateCw size={12} color={colors.textMuted} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ResonanceBoard({ match, disabled, onMove }: BoardProps) {
  const winnerCells = winningCells(match);
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const frequency = (dial: number, value: number | null) =>
    120 + dial * 35 + (value ?? 0) * 20;
  return (
    <View style={styles.resonanceBoard}>
      <View style={styles.targetStrip}>
        <ThemedText variant="caption" color="muted">HEDEF FREKANSLAR</ThemedText>
        <ThemedText variant="label" color="accent">
          {match.targets?.map((target, index) => frequency(index, target)).join(' · ')} Hz
        </ThemedText>
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
            accessibilityLabel={`${labels[dial]} kanalını azalt`}
            disabled={disabled || value === match.targets?.[dial]}
            onPress={() => onMove(dial * 2)}
            style={styles.dialButton}
          >
            <Minus size={20} color={colors.textSecondary} />
          </Pressable>
          <View style={[
            styles.frequencyValue,
            value === match.targets?.[dial] && styles.frequencyMatched,
          ]}>
            <ThemedText variant="mono" style={{ color: colors.textPrimary, fontSize: 20 }}>
              {frequency(dial, value)}
            </ThemedText>
            <ThemedText variant="caption" color="muted">Hz</ThemedText>
          </View>
          <Pressable
            accessibilityLabel={`${labels[dial]} kanalını artır`}
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
}

export default function GameScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const [panel, setPanel] = useState<'chat' | 'emoji' | null>(null);
  const [message, setMessage] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [reactionToast, setReactionToast] = useState<ChatMessage | null>(null);
  const lastReactionId = useRef<string | null>(null);
  const celebratedRoundId = useRef<string | null>(null);
  const pageRef = useRef<ScrollView>(null);
  const match = useGameStore((state) => state.turnMatch);
  const phase = useGameStore((state) => state.phase);
  const chatMessages = useGameStore((state) => state.chatMessages);
  const room = useRoomStore((state) => state.room);
  const localPlayerId = useRoomStore((state) => state.localPlayerId);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const singlePlayer = room?.sessionMode === 'single_player';

  useEffect(() => {
    if (phase === 'completed' || phase === 'failed') router.replace('/results');
  }, [phase, router]);

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
  const disabled = !isMyTurn || match?.status !== 'playing';

  const handleMove = useCallback((cell: number) => {
    if (disabled) return;
    triggerHaptic('light');
    if (singlePlayer) {
      playSinglePlayerTurn(cell);
    } else {
      playTurn(cell);
    }
  }, [disabled, singlePlayer]);

  const handleSend = useCallback(() => {
    if (!message.trim()) return;
    sendChat(message);
    setMessage('');
  }, [message]);

  const handleLeave = useCallback(() => setShowExitConfirm(true), []);

  if (!match || !room) {
    return (
      <View style={styles.loading}>
        <ThemedText color="muted">Ortak masa hazırlanıyor…</ThemedText>
      </View>
    );
  }

  const compact = height < 900;
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <ScrollView
        ref={pageRef}
        contentContainerStyle={[styles.page, compact && styles.pageCompact]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <View>
            <ThemedText variant="caption" color="accent">
              {singlePlayer ? 'TEK OYUNCULU · DUELBOT' : `ORTAK MASA · ${room.code}`}
            </ThemedText>
            <ThemedText variant="subtitle">{MODE_NAMES[match.mode]}</ThemedText>
          </View>
          <Pressable accessibilityLabel="Oyundan çık" onPress={handleLeave} style={styles.iconButton}>
            <LogOut size={20} color={colors.error} />
          </Pressable>
        </View>

        <View style={styles.players}>
          <PlayerCard
            player={players[0]}
            index={0}
            active={match.activePlayerIndex === 0 && match.status === 'playing'}
            score={match.scores[0]}
            time={match.playerTimeMs[0]}
          />
          <PlayerCard
            player={players[1]}
            index={1}
            active={match.activePlayerIndex === 1 && match.status === 'playing'}
            score={match.scores[1]}
            time={match.playerTimeMs[1]}
          />
        </View>

        <View style={styles.turnRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${MODE_NAMES[match.mode]} nasıl oynanır?`}
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
            {MODE_DESCRIPTIONS[match.mode]}
          </ThemedText>
          <ThemedText variant="caption" color="muted">
            TUR {match.roundIndex + 1}/{match.totalRounds}
          </ThemedText>
        </View>

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

        <View style={[
          styles.boardShell,
          compact && styles.boardShellCompact,
          match.mode === 'gateway_race' && styles.boardShellGateway,
          match.mode === 'cipher_clash' && styles.boardShellCipher,
          match.mode === 'resonance_dials' && styles.boardShellResonance,
        ]}>
          <View style={styles.boardGlow} />
          {match.mode === 'rune_grid' && (
            <RuneBoard match={match} disabled={disabled} onMove={handleMove} />
          )}
          {match.mode === 'connect_four' && (
            <ConnectBoard match={match} disabled={disabled} onMove={handleMove} />
          )}
          {match.mode === 'memory_pairs' && (
            <MemoryBoard match={match} disabled={disabled} onMove={handleMove} />
          )}
          {match.mode === 'pipe_circuit' && (
            <PipeBoard match={match} disabled={disabled} onMove={handleMove} />
          )}
          {match.mode === 'resonance_dials' && (
            <ResonanceBoard match={match} disabled={disabled} onMove={handleMove} />
          )}
          {match.mode === 'cipher_clash' && (
            <CipherClashBoard match={match} disabled={disabled} onMove={handleMove} />
          )}
          {match.mode === 'circuit_claim' && (
            <CircuitClaimBoard match={match} disabled={disabled} onMove={handleMove} />
          )}
          {match.mode === 'neon_trail' && (
            <NeonTrailBoard match={match} disabled={disabled} onMove={handleMove} />
          )}
          {match.mode === 'gateway_race' && (
            <GatewayRaceBoard match={match} disabled={disabled} onMove={handleMove} />
          )}
          {match.mode === 'polarity_war' && (
            <PolarityWarBoard match={match} disabled={disabled} onMove={handleMove} />
          )}
          {!isMyTurn && match.status === 'playing' && (
            <View style={[styles.waitOverlay, { pointerEvents: 'none' }]} />
          )}
        </View>

        {(
          match.mode === 'memory_pairs'
          || match.mode === 'circuit_claim'
          || match.mode === 'polarity_war'
          || match.mode === 'cipher_clash'
        ) && (
          <View style={styles.roundScore}>
            <ThemedText style={{ color: colors.cyan }}>
              {match.mode === 'memory_pairs'
                ? `EŞLER ${match.roundPoints[0]}`
                : match.mode === 'cipher_clash'
                  ? `TAM EŞLEŞME ${match.roundPoints[0]}`
                  : `ALAN ${match.roundPoints[0]}`}
            </ThemedText>
            <ThemedText color="muted">—</ThemedText>
            <ThemedText style={{ color: colors.amber }}>
              {match.mode === 'memory_pairs'
                ? `${match.roundPoints[1]} EŞLER`
                : match.mode === 'cipher_clash'
                  ? `${match.roundPoints[1]} TAM EŞLEŞME`
                  : `${match.roundPoints[1]} ALAN`}
            </ThemedText>
          </View>
        )}

        {!singlePlayer && panel === 'chat' && (
          <View style={styles.chatPanel}>
            <View style={styles.chatHistory}>
              {chatMessages.slice(-2).map((item) => (
                <ThemedText key={item.id} variant="caption">
                  <ThemedText variant="caption" color="accent">{item.displayName}: </ThemedText>
                  {item.text}
                </ThemedText>
              ))}
              {chatMessages.length === 0 && (
                <ThemedText variant="caption" color="muted">Henüz mesaj yok.</ThemedText>
              )}
            </View>
            <TextInput
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={handleSend}
              placeholder="Kısa bir mesaj yaz…"
              placeholderTextColor={colors.textMuted}
              maxLength={120}
              style={styles.input}
            />
            <Pressable onPress={handleSend} style={styles.sendButton}>
              <Send size={18} color={colors.textOnPrimary} />
            </Pressable>
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
            <ThemedText variant="caption">Sohbet</ThemedText>
          </Pressable>
          <View style={[styles.dockButton, styles.mainDockButton]}>
            <Gamepad2 size={24} color={colors.textOnPrimary} />
            <ThemedText variant="caption" color="onPrimary">Oyun</ThemedText>
          </View>
          <Pressable
            onPress={() => setPanel((value) => value === 'emoji' ? null : 'emoji')}
            style={[styles.dockButton, panel === 'emoji' && styles.dockButtonActive]}
          >
            <Smile size={22} color={panel === 'emoji' ? colors.amber : colors.textMuted} />
            <ThemedText variant="caption">Tepki</ThemedText>
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
  page: { flexGrow: 1, width: '100%', maxWidth: 680, alignSelf: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  pageCompact: { paddingVertical: spacing.sm, gap: spacing.sm },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconButton: { width: 42, height: 42, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  players: { flexDirection: 'row', gap: spacing.sm },
  playerCard: { flex: 1, minWidth: 0, minHeight: 68, padding: spacing.sm, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.lg, backgroundColor: colors.surfaceDark, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  playerCopy: { flex: 1, minWidth: 0 },
  playerName: { fontSize: 12, letterSpacing: 0.2 },
  playerTimer: { flexShrink: 0, fontSize: 16, letterSpacing: 0.6 },
  turnRow: { minHeight: 34, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  helpBubble: { width: 30, height: 30, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  gameDescription: { flex: 1, textAlign: 'center', color: colors.textSecondary },
  reactionToast: { position: 'absolute', zIndex: 20, top: 168, left: spacing.xl, right: spacing.xl, maxWidth: 400, alignSelf: 'center', minHeight: 54, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, ...shadows.md },
  reactionAvatar: { width: 32, height: 32, flexShrink: 0, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated },
  reactionName: { flex: 1, color: colors.textPrimary },
  reactionText: { fontSize: 23, lineHeight: 28 },
  boardShell: { width: '100%', maxWidth: 560, minHeight: 300, maxHeight: 560, aspectRatio: 1, alignSelf: 'center', position: 'relative', padding: spacing.md, borderRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden', ...shadows.lg },
  boardShellCompact: { maxWidth: 430 },
  boardShellGateway: { aspectRatio: 0.86, maxHeight: 620 },
  boardShellCipher: { aspectRatio: 0.8, maxHeight: 620 },
  boardShellResonance: { aspectRatio: 0.62, maxHeight: 620 },
  boardGlow: { position: 'absolute', width: '70%', height: '70%', left: '15%', top: '15%', borderRadius: 999, backgroundColor: colors.glow },
  waitOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(247,244,238,0.22)' },
  runeBoard: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: TURN_BOARD_GRID_GAP, alignContent: 'center', justifyContent: 'center' },
  runeCell: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  filledCell: { backgroundColor: colors.surfaceElevated },
  runeMark: { fontSize: 64, lineHeight: 72, fontWeight: '400' },
  winningCell: { borderWidth: 3, transform: [{ scale: 1.035 }], zIndex: 2, ...shadows.glow },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  connectBoard: { flex: 1, flexDirection: 'row', gap: 5, padding: spacing.sm, borderRadius: radius.xl, backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.cyanMuted },
  connectColumn: { flex: 1, gap: 5, justifyContent: 'space-around' },
  columnPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  connectSlot: { width: '100%', aspectRatio: 1, maxWidth: 62, alignSelf: 'center', borderRadius: radius.pill, backgroundColor: colors.backgroundDeep, borderWidth: 2, borderColor: colors.borderSubtle },
  winningConnectSlot: { borderWidth: 4, borderColor: '#FFFFFF', transform: [{ scale: 1.08 }], ...shadows.glow },
  memoryBoard: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: TURN_BOARD_GRID_GAP, alignContent: 'center', justifyContent: 'center' },
  memoryCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  memoryCardOpen: { backgroundColor: colors.surfaceElevated, borderColor: colors.cyanMuted },
  memoryCardMatched: { backgroundColor: colors.primaryContainer, borderColor: colors.success },
  memorySymbol: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  pipeBoard: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: TURN_BOARD_GRID_GAP, alignContent: 'center', justifyContent: 'center' },
  pipeCell: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  pipeGlyph: { fontSize: 58, lineHeight: 64, fontWeight: '500' },
  pipeTarget: { position: 'absolute', left: 7, top: 5, fontSize: 12, lineHeight: 14, opacity: 0.55 },
  rotateBadge: { position: 'absolute', right: 7, bottom: 7, width: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
  resonanceBoard: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  targetStrip: { flexShrink: 0, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.secondaryContainer, borderWidth: 1, borderColor: colors.amber, alignItems: 'center', gap: spacing.xs },
  dialRow: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceElevated },
  dialLabel: { width: 36, alignItems: 'center' },
  dialButton: { width: 42, height: 42, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  frequencyValue: { flex: 1, height: 48, minWidth: 0, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  frequencyMatched: { borderColor: colors.success, backgroundColor: '#E7F8EE' },
  roundVictory: { width: '100%', minHeight: 78, padding: spacing.md, borderRadius: radius.xl, borderWidth: 2, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.md, ...shadows.md },
  roundVictoryIcon: { width: 48, height: 48, flexShrink: 0, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  roundVictoryCopy: { flex: 1, minWidth: 0, gap: 2 },
  roundPointBadge: { minWidth: 52, height: 52, flexShrink: 0, paddingHorizontal: spacing.sm, borderRadius: radius.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  roundScore: { marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  dock: { flexDirection: 'row', alignSelf: 'center', gap: spacing.sm, padding: spacing.xs, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceDark },
  dockButton: { minWidth: 82, height: 52, paddingHorizontal: spacing.md, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dockButtonActive: { backgroundColor: colors.surfaceElevated },
  mainDockButton: { backgroundColor: colors.primary },
  chatPanel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceDark },
  chatHistory: { flex: 1, minWidth: 90 },
  input: { flex: 2, height: 42, color: colors.textPrimary, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  sendButton: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  emojiPanel: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.sm },
  emojiButton: { width: 48, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  modalBackdrop: { flex: 1, padding: spacing.xl, backgroundColor: 'rgba(23,35,31,0.32)', alignItems: 'center', justifyContent: 'center' },
  confirmCard: { width: '100%', maxWidth: 440, padding: spacing.xl, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', gap: spacing.md, ...shadows.lg },
  confirmIcon: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: '#FCEAE7', alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { textAlign: 'center' },
  confirmDescription: { textAlign: 'center', maxWidth: 330 },
  confirmActions: { width: '100%', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  confirmButton: { flex: 1 },
  forfeitButton: { flex: 1, minHeight: 52, borderRadius: radius.lg, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
});
