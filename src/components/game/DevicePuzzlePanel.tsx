import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Check,
  ChevronLeft,
  CirclePower,
  LockKeyhole,
  Radio,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react-native';

import { DevicePuzzleBackdrop } from '@/components/game/DevicePuzzleBackdrop';
import {
  arraysEqual,
  createAccessLogRecords,
  createDoorRingTargets,
  createFuseOrder,
  createTerminalSignal,
  createTerminalTargets,
  type AccessLogCategory,
} from '@/components/game/devicePuzzleLogic';
import type { SceneHotspotId } from '@/components/game/sceneHotspots';
import { ThemedText } from '@/components/ui/ThemedText';
import { triggerHaptic } from '@/services/HapticsService';
import { gameAssets } from '@/src/assets/gameAssets';
import { useTranslation, type TranslationKey } from '@/src/i18n';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

type DevicePuzzlePanelProps = {
  readonly id: SceneHotspotId;
  readonly seed: string;
  readonly completed: boolean;
  readonly locked: boolean;
  readonly onClose: () => void;
  readonly onComplete: () => void;
};

type DeviceMeta = {
  readonly title: TranslationKey;
  readonly subtitle: TranslationKey;
  readonly source: (typeof gameAssets.devicePuzzles)[keyof typeof gameAssets.devicePuzzles];
};

const DEVICE_META: Record<SceneHotspotId, DeviceMeta> = {
  mainFuseBox: {
    title: 'device.fuseTitle',
    subtitle: 'device.fuseSubtitle',
    source: gameAssets.devicePuzzles.mainFuseBox,
  },
  securityTerminal: {
    title: 'device.terminalTitle',
    subtitle: 'device.terminalSubtitle',
    source: gameAssets.devicePuzzles.securityTerminal,
  },
  accessLog: {
    title: 'device.accessTitle',
    subtitle: 'device.accessSubtitle',
    source: gameAssets.devicePuzzles.accessLog,
  },
  exitDoor: {
    title: 'device.doorTitle',
    subtitle: 'device.doorSubtitle',
    source: gameAssets.devicePuzzles.exitDoor,
  },
};

export function DevicePuzzlePanel({
  id,
  seed,
  completed,
  locked,
  onClose,
  onComplete,
}: DevicePuzzlePanelProps) {
  const { t } = useTranslation();
  const { width: viewportWidth } = useWindowDimensions();
  const compactHeader = viewportWidth < 390;
  const [sceneSize, setSceneSize] = useState({ width: 1, height: 1 });
  const [justSolved, setJustSolved] = useState(false);
  const completionStarted = useRef(false);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meta = DEVICE_META[id];

  useEffect(
    () => () => {
      if (completionTimer.current) clearTimeout(completionTimer.current);
    },
    [],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setSceneSize({
      width: Math.max(1, event.nativeEvent.layout.width),
      height: Math.max(1, event.nativeEvent.layout.height),
    });
  }, []);

  const handleSolved = useCallback(() => {
    if (locked || completed || completionStarted.current) return;
    completionStarted.current = true;
    setJustSolved(true);
    triggerHaptic('success');
    completionTimer.current = setTimeout(onComplete, 900);
  }, [completed, locked, onComplete]);

  const solved = completed || justSolved;

  return (
    <View style={styles.container}>
      <View style={[styles.header, compactHeader && styles.headerCompact]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('device.back')}
          onPress={onClose}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.headerCopy}>
          <ThemedText variant="subtitle" numberOfLines={1}>{t(meta.title)}</ThemedText>
          <ThemedText variant="caption" color="muted" numberOfLines={1}>{t(meta.subtitle)}</ThemedText>
        </View>
        <View
          accessible
          accessibilityLabel={t(solved ? 'device.completed' : locked ? 'device.locked' : 'device.online')}
          style={[
            styles.statusBadge,
            compactHeader && styles.statusBadgeCompact,
            solved && styles.statusBadgeSolved,
            locked && styles.statusBadgeLocked,
          ]}
        >
          {solved ? (
            <Check size={17} color={colors.success} strokeWidth={3} />
          ) : locked ? (
            <LockKeyhole size={16} color={colors.textMuted} />
          ) : (
            <CirclePower size={17} color={colors.accent} />
          )}
          {!compactHeader && (
            <ThemedText
              variant="label"
              style={{ color: solved ? colors.success : locked ? colors.textMuted : colors.accent }}
            >
              {t(solved ? 'device.completed' : locked ? 'device.locked' : 'device.online')}
            </ThemedText>
          )}
        </View>
      </View>

      <View onLayout={handleLayout} style={styles.scene}>
        <DevicePuzzleBackdrop
          source={meta.source}
          width={sceneSize.width}
          height={sceneSize.height}
        />

        {!locked && !solved && id === 'mainFuseBox' && (
          <FuseSurface seed={seed} onSolved={handleSolved} />
        )}
        {!locked && !solved && id === 'securityTerminal' && (
          <TerminalSurface seed={seed} onSolved={handleSolved} />
        )}
        {!locked && !solved && id === 'accessLog' && (
          <AccessSurface seed={seed} onSolved={handleSolved} />
        )}
        {!locked && !solved && id === 'exitDoor' && (
          <DoorSurface seed={seed} onSolved={handleSolved} />
        )}

        {locked && (
          <View style={styles.centerOverlay}>
            <LockKeyhole size={28} color={colors.textMuted} />
            <ThemedText variant="body" color="muted" style={styles.centerText}>
              {t('device.lockedDescription')}
            </ThemedText>
          </View>
        )}

        {solved && (
          <View pointerEvents="none" style={styles.successOverlay}>
            <View style={styles.successIcon}>
              <ShieldCheck size={34} color={colors.success} strokeWidth={2.6} />
            </View>
            <ThemedText variant="subtitle" style={styles.successTitle}>
              {t('device.success')}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.sceneCaption}>
        <Radio size={15} color={colors.operator} />
        <ThemedText variant="caption" color="muted" style={styles.flex}>
          {t(`device.${id}.directHint` as TranslationKey)}
        </ThemedText>
      </View>
    </View>
  );
}

function useMemoryPlayback(sequence: readonly number[]) {
  const [activeValue, setActiveValue] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const replay = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPlaying(true);
    let index = 0;
    const advance = () => {
      if (index >= sequence.length) {
        setActiveValue(null);
        setPlaying(false);
        return;
      }
      setActiveValue(sequence[index]);
      index += 1;
      timer.current = setTimeout(() => {
        setActiveValue(null);
        timer.current = setTimeout(advance, 180);
      }, 420);
    };
    advance();
  }, [sequence]);

  useEffect(() => {
    timer.current = setTimeout(replay, 0);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [replay]);

  return { activeValue, playing, replay };
}

function SurfaceChip({
  text,
  tone = 'normal',
  style,
}: {
  readonly text: string;
  readonly tone?: 'normal' | 'error' | 'success';
  readonly style?: object;
}) {
  return (
    <View style={[
      styles.surfaceChip,
      tone === 'error' && styles.surfaceChipError,
      tone === 'success' && styles.surfaceChipSuccess,
      style,
    ]}>
      <ThemedText
        variant="label"
        numberOfLines={2}
        style={[
          styles.surfaceChipText,
          tone === 'error' && { color: colors.error },
          tone === 'success' && { color: colors.success },
        ]}
      >
        {text}
      </ThemedText>
    </View>
  );
}

function ReplayButton({
  onPress,
  disabled,
}: {
  readonly onPress: () => void;
  readonly disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('device.replay')}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.replayButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <RefreshCw size={15} color={colors.textPrimary} />
      <ThemedText variant="label" style={styles.replayLabel}>{t('device.replay')}</ThemedText>
    </Pressable>
  );
}

const FUSE_POSITIONS = [
  { top: '23%', left: '38.5%' },
  { top: '37%', left: '38.5%' },
  { top: '51%', left: '38.5%' },
  { top: '65%', left: '38.5%' },
] as const;

function FuseSurface({
  seed,
  onSolved,
}: {
  readonly seed: string;
  readonly onSolved: () => void;
}) {
  const { t } = useTranslation();
  const order = useMemo(() => createFuseOrder(seed), [seed]);
  const { activeValue, playing, replay } = useMemoryPlayback(order);
  const [input, setInput] = useState<number[]>([]);
  const [error, setError] = useState(false);

  const choose = (fuse: number) => {
    if (playing || input.includes(fuse)) return;
    triggerHaptic('medium');
    if (order[input.length] !== fuse) {
      setInput([]);
      setError(true);
      replay();
      return;
    }
    setError(false);
    setInput((current) => [...current, fuse]);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <SurfaceChip
        text={t(error ? 'device.fuseWrong' : playing ? 'device.memorize' : 'device.fuseTouch')}
        tone={error ? 'error' : input.length === 4 ? 'success' : 'normal'}
        style={styles.topLeftChip}
      />
      <ReplayButton onPress={replay} disabled={playing} />

      {FUSE_POSITIONS.map((position, fuse) => {
        const active = activeValue === fuse || input.includes(fuse);
        return (
          <Pressable
            key={fuse}
            accessibilityRole="button"
            accessibilityLabel={t('device.fuseButton', { number: fuse + 1 })}
            accessibilityState={{ checked: active, disabled: playing }}
            accessibilityValue={{ text: active ? 'active' : 'idle' }}
            disabled={playing}
            onPress={() => choose(fuse)}
            style={({ pressed }) => [
              styles.fuseTarget,
              position,
              active && styles.fuseTargetActive,
              pressed && styles.targetPressed,
            ]}
          >
            <View style={[styles.targetNumber, active && styles.targetNumberActive]}>
              <ThemedText variant="label" style={styles.targetNumberText}>{fuse + 1}</ThemedText>
            </View>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('device.fuseLever')}
        accessibilityState={{ disabled: input.length !== 4 }}
        disabled={input.length !== 4}
        onPress={() => {
          triggerHaptic('heavy');
          onSolved();
        }}
        style={({ pressed }) => [
          styles.fuseLever,
          input.length === 4 && styles.fuseLeverReady,
          pressed && styles.targetPressed,
        ]}
      >
        <ThemedText variant="label" style={styles.verticalLabel}>
          {t('device.activate')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function TerminalSurface({
  seed,
  onSolved,
}: {
  readonly seed: string;
  readonly onSolved: () => void;
}) {
  const { t } = useTranslation();
  const signal = useMemo(() => createTerminalSignal(seed), [seed]);
  const targets = useMemo(() => createTerminalTargets(seed), [seed]);
  const { activeValue, playing, replay } = useMemoryPlayback(signal);
  const [input, setInput] = useState<number[]>([]);
  const [dials, setDials] = useState([0, 0, 0, 0]);
  const [phase, setPhase] = useState<'signal' | 'dials'>('signal');
  const [error, setError] = useState(false);

  const pressCell = (cell: number) => {
    if (playing || phase !== 'signal') return;
    const next = [...input, cell];
    triggerHaptic('light');
    if (next.length < signal.length) {
      setInput(next);
      return;
    }
    if (arraysEqual(next, signal)) {
      setInput(next);
      setPhase('dials');
      setError(false);
    } else {
      setInput([]);
      setError(true);
      replay();
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <SurfaceChip
        text={
          phase === 'signal'
            ? t(error ? 'device.terminalWrong' : playing ? 'device.memorize' : 'device.terminalTouch')
            : t('device.terminalDialTargets', { targets: targets.join(' · ') })
        }
        tone={error ? 'error' : phase === 'dials' ? 'success' : 'normal'}
        style={styles.topLeftChip}
      />
      {phase === 'signal' && <ReplayButton onPress={replay} disabled={playing} />}

      <View style={styles.terminalScreen}>
        {Array.from({ length: 16 }, (_, cell) => {
          const selected = activeValue === cell || input.includes(cell);
          return (
            <Pressable
              key={cell}
              accessibilityRole="button"
              accessibilityLabel={t('device.terminalCell', { number: cell + 1 })}
              accessibilityState={{ checked: selected, disabled: playing || phase === 'dials' }}
              accessibilityValue={{ text: selected ? 'active' : 'idle' }}
              disabled={playing || phase === 'dials'}
              onPress={() => pressCell(cell)}
              style={({ pressed }) => [
                styles.terminalCell,
                selected && styles.terminalCellActive,
                phase === 'dials' && styles.terminalCellComplete,
                pressed && styles.targetPressed,
              ]}
            >
              <ThemedText variant="label" style={styles.terminalCellText}>{cell + 1}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      {phase === 'dials' && (
        <>
          {dials.map((value, dial) => (
            <Pressable
              key={dial}
              accessibilityRole="adjustable"
              accessibilityLabel={t('device.terminalDial', { number: dial + 1 })}
              accessibilityValue={{ min: 0, max: 3, now: value }}
              onPress={() => {
                setDials((current) => current.map(
                  (entry, index) => index === dial ? (entry + 1) % 4 : entry,
                ));
                setError(false);
                triggerHaptic('medium');
              }}
              style={({ pressed }) => [
                styles.terminalDial,
                { left: `${27.5 + dial * 13}%` },
                value === targets[dial] && styles.terminalDialAligned,
                pressed && styles.targetPressed,
              ]}
            >
              <ThemedText variant="mono" style={styles.dialText}>{value}</ThemedText>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('device.terminalConfirm')}
            onPress={() => {
              if (arraysEqual(dials, targets)) onSolved();
              else {
                setError(true);
                triggerHaptic('error');
              }
            }}
            style={({ pressed }) => [
              styles.terminalConfirm,
              error && styles.confirmError,
              pressed && styles.targetPressed,
            ]}
          >
            <Check size={18} color={colors.textOnPrimary} strokeWidth={3} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const CATEGORY_COLORS: Record<AccessLogCategory, string> = {
  green: '#35D987',
  amber: '#FFB544',
  red: '#F06B59',
};
const ACCESS_CATEGORIES = ['green', 'amber', 'red'] as const;

function AccessSurface({
  seed,
  onSolved,
}: {
  readonly seed: string;
  readonly onSolved: () => void;
}) {
  const { t } = useTranslation();
  const records = useMemo(() => createAccessLogRecords(seed), [seed]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<(AccessLogCategory | null)[]>(
    () => Array.from({ length: 6 }, () => null),
  );
  const [error, setError] = useState(false);

  const assign = (category: AccessLogCategory) => {
    if (selectedRow === null) return;
    setAssignments((current) => current.map(
      (value, index) => index === selectedRow ? category : value,
    ));
    setSelectedRow(null);
    setError(false);
    triggerHaptic('medium');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <SurfaceChip
        text={t(error ? 'device.accessWrong' : 'device.accessRule')}
        tone={error ? 'error' : 'normal'}
        style={styles.accessRuleChip}
      />

      <View style={styles.accessRows}>
        {records.map((record, row) => {
          const assignment = assignments[row];
          const selected = selectedRow === row;
          return (
            <Pressable
              key={row}
              accessibilityRole="button"
              accessibilityLabel={t('device.accessRecord', {
                number: row + 1,
                risk: record.risk,
                auth: record.authenticated ? t('device.authYes') : t('device.authNo'),
              })}
              accessibilityState={{ selected }}
              onPress={() => setSelectedRow(row)}
              style={({ pressed }) => [
                styles.accessRow,
                selected && styles.accessRowSelected,
                assignment && { borderColor: CATEGORY_COLORS[assignment] },
                pressed && styles.targetPressed,
              ]}
            >
              <ThemedText variant="label" numberOfLines={1} style={styles.accessRowText}>
                {row + 1} · R{record.risk} · {record.authenticated ? 'A+' : 'A−'}
              </ThemedText>
              <View style={[
                styles.accessStatusDot,
                { backgroundColor: assignment ? CATEGORY_COLORS[assignment] : colors.textMuted },
              ]} />
            </Pressable>
          );
        })}
      </View>

      {ACCESS_CATEGORIES.map((category, index) => (
        <Pressable
          key={category}
          accessibilityRole="button"
          accessibilityLabel={t('device.accessAssign', {
            category: t(`device.category.${category}` as TranslationKey),
          })}
          accessibilityState={{ disabled: selectedRow === null }}
          disabled={selectedRow === null}
          onPress={() => assign(category)}
          style={({ pressed }) => [
            styles.accessCategoryButton,
            { left: `${35.5 + index * 6.4}%`, borderColor: CATEGORY_COLORS[category] },
            selectedRow === null && styles.disabled,
            pressed && styles.targetPressed,
          ]}
        >
          <ThemedText variant="label" style={styles.categoryLetter}>
            {category === 'green' ? 'G' : category === 'amber' ? 'A' : 'R'}
          </ThemedText>
        </Pressable>
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('device.accessVerify')}
        accessibilityState={{ disabled: assignments.some((value) => value === null) }}
        disabled={assignments.some((value) => value === null)}
        onPress={() => {
          if (arraysEqual(assignments, records.map((record) => record.category))) onSolved();
          else {
            setError(true);
            triggerHaptic('error');
          }
        }}
        style={({ pressed }) => [
          styles.accessCardSlot,
          assignments.every((value) => value !== null) && styles.accessCardSlotReady,
          pressed && styles.targetPressed,
        ]}
      >
        <ThemedText variant="label" style={styles.verticalLabel}>{t('device.verify')}</ThemedText>
      </Pressable>
    </View>
  );
}

const RING_TARGETS = [
  { left: '46%', top: '32%' },
  { left: '57%', top: '43%' },
  { left: '46%', top: '61%' },
  { left: '38.5%', top: '45%' },
] as const;

function DoorSurface({
  seed,
  onSolved,
}: {
  readonly seed: string;
  readonly onSolved: () => void;
}) {
  const { t } = useTranslation();
  const targets = useMemo(() => createDoorRingTargets(seed), [seed]);
  const [rings, setRings] = useState([0, 0, 0, 0]);
  const [leftBolt, setLeftBolt] = useState(false);
  const [rightBolt, setRightBolt] = useState(false);
  const aligned = arraysEqual(rings, targets);

  useEffect(() => {
    if (leftBolt && rightBolt && aligned) onSolved();
  }, [aligned, leftBolt, onSolved, rightBolt]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <SurfaceChip
        text={t('device.doorTargets', { targets: targets.join(' · ') })}
        tone={aligned ? 'success' : 'normal'}
        style={styles.doorChip}
      />

      {rings.map((value, ring) => (
        <Pressable
          key={ring}
          accessibilityRole="adjustable"
          accessibilityLabel={t('device.doorRing', { number: ring + 1 })}
          accessibilityValue={{ min: 0, max: 7, now: value }}
          onPress={() => {
            setRings((current) => current.map(
              (entry, index) => index === ring ? (entry + 1) % 8 : entry,
            ));
            setLeftBolt(false);
            setRightBolt(false);
            triggerHaptic('medium');
          }}
          style={({ pressed }) => [
            styles.ringTarget,
            RING_TARGETS[ring],
            value === targets[ring] && styles.ringTargetAligned,
            pressed && styles.targetPressed,
          ]}
        >
          <ThemedText variant="mono" style={styles.ringValue}>{value}</ThemedText>
        </Pressable>
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('device.doorLeftBolt')}
        accessibilityState={{ disabled: !aligned, selected: leftBolt }}
        disabled={!aligned || leftBolt}
        onPress={() => {
          setLeftBolt(true);
          triggerHaptic('heavy');
        }}
        style={({ pressed }) => [
          styles.doorBolt,
          styles.leftBolt,
          aligned && styles.doorBoltReady,
          leftBolt && styles.doorBoltOpen,
          pressed && styles.targetPressed,
        ]}
      >
        <ChevronLeft size={18} color={colors.textPrimary} strokeWidth={3} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('device.doorRightBolt')}
        accessibilityState={{ disabled: !aligned, selected: rightBolt }}
        disabled={!aligned || rightBolt}
        onPress={() => {
          setRightBolt(true);
          triggerHaptic('heavy');
        }}
        style={({ pressed }) => [
          styles.doorBolt,
          styles.rightBolt,
          aligned && styles.doorBoltReady,
          rightBolt && styles.doorBoltOpen,
          pressed && styles.targetPressed,
        ]}
      >
        <ChevronLeft
          size={18}
          color={colors.textPrimary}
          strokeWidth={3}
          style={{ transform: [{ rotate: '180deg' }] }}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerCompact: { gap: spacing.sm },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    minHeight: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.secondaryContainer,
    backgroundColor: colors.explorerContainer,
  },
  statusBadgeCompact: {
    width: 44,
    height: 44,
    minHeight: 44,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  statusBadgeSolved: {
    borderColor: colors.emerald,
    backgroundColor: colors.surfaceDark,
  },
  statusBadgeLocked: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  scene: {
    width: '100%',
    aspectRatio: 1672 / 941,
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 3,
    borderTopColor: colors.metalLight,
    borderRightColor: colors.borderDark,
    borderBottomColor: colors.borderDark,
    borderLeftColor: colors.metal,
    backgroundColor: colors.backgroundDeep,
    ...shadows.lg,
  },
  sceneCaption: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceDark,
  },
  centerText: { textAlign: 'center' },
  centerOverlay: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '32%',
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'rgba(4, 18, 17, 0.92)',
  },
  successOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(2, 8, 7, 0.72)',
  },
  successIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.surfaceDark,
  },
  successTitle: { color: colors.textPrimary },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  targetPressed: { opacity: 0.72, transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.34 },
  surfaceChip: {
    position: 'absolute',
    minHeight: 30,
    maxWidth: '58%',
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cyanMuted,
    backgroundColor: 'rgba(2, 14, 13, 0.88)',
    ...shadows.sm,
  },
  surfaceChipError: { borderColor: colors.error },
  surfaceChipSuccess: { borderColor: colors.success },
  surfaceChipText: {
    color: colors.textPrimary,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.25,
  },
  topLeftChip: { left: '2.5%', top: '3%' },
  replayButton: {
    position: 'absolute',
    right: '2.5%',
    top: '3%',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(2, 14, 13, 0.88)',
  },
  replayLabel: { color: colors.textPrimary, fontSize: 9 },
  fuseTarget: {
    position: 'absolute',
    width: '25%',
    height: '11.5%',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'rgba(255, 181, 68, 0.18)',
    backgroundColor: 'rgba(255, 181, 68, 0.02)',
  },
  fuseTargetActive: {
    borderColor: colors.success,
    backgroundColor: 'rgba(53, 217, 135, 0.18)',
  },
  targetNumber: {
    marginLeft: -17,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.amber,
    backgroundColor: 'rgba(4, 18, 17, 0.92)',
  },
  targetNumberActive: { borderColor: colors.success },
  targetNumberText: { color: colors.textPrimary, fontSize: 10 },
  fuseLever: {
    position: 'absolute',
    left: '72%',
    top: '33%',
    width: '10%',
    height: '34%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'rgba(255, 181, 68, 0.22)',
    backgroundColor: 'rgba(4, 18, 17, 0.28)',
    opacity: 0.42,
  },
  fuseLeverReady: {
    opacity: 1,
    borderColor: colors.success,
    backgroundColor: 'rgba(53, 217, 135, 0.18)',
  },
  verticalLabel: {
    color: colors.textPrimary,
    fontSize: 8,
    lineHeight: 10,
    textAlign: 'center',
  },
  terminalScreen: {
    position: 'absolute',
    left: '27%',
    top: '12%',
    width: '46%',
    height: '43%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '1.5%',
  },
  terminalCell: {
    width: '23.8%',
    height: '23.8%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(74, 231, 208, 0.30)',
    backgroundColor: 'rgba(4, 18, 17, 0.12)',
  },
  terminalCellActive: {
    borderColor: colors.operator,
    backgroundColor: 'rgba(30, 232, 207, 0.48)',
  },
  terminalCellComplete: {
    borderColor: 'rgba(53, 217, 135, 0.5)',
    backgroundColor: 'rgba(53, 217, 135, 0.10)',
  },
  terminalCellText: {
    color: colors.textPrimary,
    fontSize: 8,
    lineHeight: 10,
  },
  terminalDial: {
    position: 'absolute',
    top: '65%',
    width: '10%',
    height: '15%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.amberMuted,
    backgroundColor: 'rgba(4, 18, 17, 0.56)',
  },
  terminalDialAligned: {
    borderColor: colors.success,
    backgroundColor: 'rgba(53, 217, 135, 0.22)',
  },
  dialText: { color: colors.textPrimary, fontSize: 13 },
  terminalConfirm: {
    position: 'absolute',
    left: '68.5%',
    top: '82%',
    width: '7%',
    height: '10%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: 'rgba(255, 181, 68, 0.68)',
  },
  confirmError: { borderColor: colors.error, backgroundColor: 'rgba(240, 107, 89, 0.52)' },
  accessRuleChip: { left: '2.5%', top: '3%', maxWidth: '31%' },
  accessRows: {
    position: 'absolute',
    left: '38.6%',
    top: '20%',
    width: '20.5%',
    height: '33.5%',
    justifyContent: 'space-between',
  },
  accessRow: {
    width: '100%',
    height: '14.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(76, 238, 193, 0.38)',
    backgroundColor: 'rgba(2, 14, 13, 0.72)',
  },
  accessRowSelected: {
    borderWidth: 2,
    borderColor: colors.textPrimary,
    backgroundColor: 'rgba(30, 232, 207, 0.24)',
  },
  accessRowText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 7,
    lineHeight: 9,
  },
  accessStatusDot: { width: 7, height: 7, borderRadius: 4 },
  accessCategoryButton: {
    position: 'absolute',
    top: '59%',
    width: '5.5%',
    height: '10%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    backgroundColor: 'rgba(4, 18, 17, 0.28)',
  },
  categoryLetter: { color: colors.textPrimary, fontSize: 10 },
  accessCardSlot: {
    position: 'absolute',
    left: '56%',
    top: '58%',
    width: '5.5%',
    height: '20%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'rgba(4, 18, 17, 0.36)',
    opacity: 0.42,
  },
  accessCardSlotReady: {
    opacity: 1,
    borderColor: colors.success,
    backgroundColor: 'rgba(53, 217, 135, 0.18)',
  },
  doorChip: { left: '31%', top: '3%', maxWidth: '38%' },
  ringTarget: {
    position: 'absolute',
    width: '8%',
    height: '11%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.amberMuted,
    backgroundColor: 'rgba(4, 18, 17, 0.58)',
  },
  ringTargetAligned: {
    borderColor: colors.success,
    backgroundColor: 'rgba(53, 217, 135, 0.24)',
  },
  ringValue: { color: colors.textPrimary, fontSize: 12 },
  doorBolt: {
    position: 'absolute',
    top: '45%',
    width: '10%',
    height: '14%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'rgba(4, 18, 17, 0.38)',
    opacity: 0.42,
  },
  leftBolt: { left: '28%' },
  rightBolt: { left: '62%' },
  doorBoltReady: { opacity: 1, borderColor: colors.amber },
  doorBoltOpen: {
    opacity: 1,
    borderColor: colors.success,
    backgroundColor: 'rgba(53, 217, 135, 0.28)',
  },
});
