import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Check,
  DoorOpen,
  LockKeyhole,
  Monitor,
  RadioTower,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import {
  interactObject,
  movePlayer,
} from '@/services/NetworkBridge';
import { triggerHaptic } from '@/services/HapticsService';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { Panel } from '@/components/ui/Panel';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTranslation, type TranslationKey } from '@/src/i18n';
import { AdventureMapScene } from '@/components/game/AdventureMapScene';
import { DevicePuzzlePanel } from '@/components/game/DevicePuzzlePanel';
import {
  SERVER_ROOM_HOTSPOTS,
  calculateContainRect,
  findHotspotAtPoint,
  getPolygonBounds,
  isObjectComplete,
  type SceneHotspot,
  type SceneHotspotId,
  type SceneHotspotState,
} from '@/components/game/sceneHotspots';

const DEBUG_HOTSPOTS =
  __DEV__ && process.env.EXPO_PUBLIC_SCENE_DEBUG === '1';

const HOTSPOT_META: Record<
  SceneHotspotId,
  {
    label: TranslationKey;
    description: TranslationKey;
    accessibilityLabel: TranslationKey;
    icon: LucideIcon;
  }
> = {
  mainFuseBox: {
    label: 'world.hotspot.fuse',
    description: 'world.hotspot.fuseDescription',
    accessibilityLabel: 'world.hotspot.fuseAccessibility',
    icon: Zap,
  },
  securityTerminal: {
    label: 'world.hotspot.terminal',
    description: 'world.hotspot.terminalDescription',
    accessibilityLabel: 'world.hotspot.terminalAccessibility',
    icon: Monitor,
  },
  accessLog: {
    label: 'world.hotspot.access',
    description: 'world.hotspot.accessDescription',
    accessibilityLabel: 'world.hotspot.accessAccessibility',
    icon: RadioTower,
  },
  exitDoor: {
    label: 'world.hotspot.door',
    description: 'world.hotspot.doorDescription',
    accessibilityLabel: 'world.hotspot.doorAccessibility',
    icon: DoorOpen,
  },
};

const STATUS_META: Record<
  SceneHotspotState,
  { label: TranslationKey; color: string }
> = {
  available: { label: 'world.status.available', color: colors.cyan },
  focused: { label: 'world.status.focused', color: colors.amberStrong },
  completed: { label: 'world.status.completed', color: colors.success },
  locked: { label: 'world.status.locked', color: colors.textMuted },
};

export function ExplorerWorld() {
  const world = useGameStore((state) => state.world);
  const currentPuzzleId = useGameStore((state) => state.currentPuzzleId);
  const puzzles = useGameStore((state) => state.puzzles);
  const solvedPuzzleIds = useGameStore((state) => state.solvedPuzzleIds);
  const totalPuzzleCount = useRoomStore((state) => state.room?.puzzleCount ?? puzzles.length);
  const roomCode = useRoomStore((state) => state.roomCode);
  const setError = useRoomStore((state) => state.setError);
  const { t } = useTranslation();
  const { highContrast } = useSettingsStore();
  const [sceneSize, setSceneSize] = useState({ width: 1, height: 1 });
  const [focusedHotspotId, setFocusedHotspotId] = useState<SceneHotspotId | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<SceneHotspotId | null>(null);
  const [activeDeviceId, setActiveDeviceId] = useState<SceneHotspotId | null>(null);
  const interactionLocked = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pulse] = useState(() => new Animated.Value(0));

  const currentPuzzle = useMemo(
    () => puzzles.find((puzzle) => puzzle.puzzleId === currentPuzzleId) ?? puzzles[0] ?? null,
    [currentPuzzleId, puzzles],
  );
  const objectById = useMemo(
    () => new Map(world?.objects.map((object) => [object.id, object]) ?? []),
    [world],
  );
  const allPuzzlesSolved =
    totalPuzzleCount > 0 && solvedPuzzleIds.length >= totalPuzzleCount;
  const imageRect = useMemo(
    () => calculateContainRect(sceneSize.width, sceneSize.height),
    [sceneSize.height, sceneSize.width],
  );

  const hotspotStates = useMemo<Record<SceneHotspotId, SceneHotspotState>>(() => {
    const requiredStationId =
      currentPuzzle?.category === 'circuit' ? 'fuse_box_main' : 'room_terminal';
    const stationState = (objectId: string): SceneHotspotState => {
      if (!currentPuzzle || objectId !== requiredStationId) return 'locked';
      if (currentPuzzle.fieldUnlocked) return 'completed';
      return currentPuzzle.guideSolved ? 'available' : 'locked';
    };
    const note = objectById.get('note_access_log');
    const keyCard = objectById.get('key_card_alpha');
    const door = objectById.get('escape_door');
    const hasKeyCard = Boolean(keyCard && isObjectComplete(keyCard.state));
    const accessComplete =
      Boolean(note && isObjectComplete(note.state)) &&
      Boolean(keyCard && isObjectComplete(keyCard.state));

    return {
      mainFuseBox: stationState('fuse_box_main'),
      securityTerminal: stationState('room_terminal'),
      accessLog: accessComplete ? 'completed' : 'available',
      exitDoor: door?.state === 'open'
        ? 'completed'
        : allPuzzlesSolved && hasKeyCard
          ? 'available'
          : 'locked',
    };
  }, [allPuzzlesSolved, currentPuzzle, objectById]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1050,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1050,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  useEffect(
    () => () => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      if (focusTimer.current) clearTimeout(focusTimer.current);
    },
    [],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setSceneSize({
      width: Math.max(1, event.nativeEvent.layout.width),
      height: Math.max(1, event.nativeEvent.layout.height),
    });
  }, []);

  const activateHotspot = useCallback((hotspot: SceneHotspot) => {
    if (interactionLocked.current) return;

    const state = hotspotStates[hotspot.id];
    setSelectedHotspotId(hotspot.id);
    setFocusedHotspotId(hotspot.id);
    triggerHaptic(state === 'locked' ? 'warning' : 'light');
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => setFocusedHotspotId(null), 700);
    setActiveDeviceId(hotspot.id);
  }, [hotspotStates]);

  const completeDevicePuzzle = useCallback(() => {
    if (!activeDeviceId || interactionLocked.current) return;
    const hotspot = SERVER_ROOM_HOTSPOTS.find((item) => item.id === activeDeviceId);
    if (!hotspot) {
      setError('error.object_unavailable');
      setActiveDeviceId(null);
      return;
    }

    interactionLocked.current = true;
    if (activeDeviceId === 'accessLog') {
      const note = objectById.get('note_access_log');
      const keyCard = objectById.get('key_card_alpha');
      for (const object of [note, keyCard]) {
        if (!object || isObjectComplete(object.state)) continue;
        useGameStore.getState().setPlayerPosition(object.position);
        movePlayer(object.position.x, object.position.y);
        interactObject(object.id);
      }
    } else {
      const object = objectById.get(hotspot.objectIds[0]);
      if (!object) {
        setError('error.object_unavailable');
        interactionLocked.current = false;
        setActiveDeviceId(null);
        return;
      }
      useGameStore.getState().setPlayerPosition(object.position);
      movePlayer(object.position.x, object.position.y);
      interactObject(object.id);
    }

    setActiveDeviceId(null);
    releaseTimer.current = setTimeout(() => {
      interactionLocked.current = false;
    }, 700);
  }, [activeDeviceId, objectById, setError]);

  const handleScenePress = useCallback((event: GestureResponderEvent) => {
    let localX = event.nativeEvent.locationX;
    let localY = event.nativeEvent.locationY;
    let width = sceneSize.width;
    let height = sceneSize.height;

    if (Platform.OS === 'web') {
      const element = event.currentTarget as unknown as {
        getBoundingClientRect?: () => { left: number; top: number; width: number; height: number };
      };
      const bounds = element?.getBoundingClientRect?.();
      const nativeEvent = event.nativeEvent as typeof event.nativeEvent & {
        clientX?: number;
        clientY?: number;
      };
      if (
        bounds &&
        typeof nativeEvent.clientX === 'number' &&
        typeof nativeEvent.clientY === 'number'
      ) {
        localX = nativeEvent.clientX - bounds.left;
        localY = nativeEvent.clientY - bounds.top;
        width = bounds.width;
        height = bounds.height;
      }
    }

    const hotspot = findHotspotAtPoint(
      { x: localX, y: localY },
      calculateContainRect(width, height),
    );
    if (hotspot) activateHotspot(hotspot);
  }, [activateHotspot, sceneSize.height, sceneSize.width]);

  if (!world) {
    return (
      <Panel variant="muted">
        <ThemedText variant="caption" color="muted">
          {t('world.waiting')}
        </ThemedText>
      </Panel>
    );
  }

  if (activeDeviceId) {
    const activeState = hotspotStates[activeDeviceId];
    return (
      <DevicePuzzlePanel
        id={activeDeviceId}
        seed={`${roomCode ?? 'room'}:${currentPuzzle?.puzzleId ?? 'escape'}:${activeDeviceId}`}
        completed={activeState === 'completed'}
        locked={activeState === 'locked'}
        onClose={() => setActiveDeviceId(null)}
        onComplete={completeDevicePuzzle}
      />
    );
  }

  const selectedMeta = selectedHotspotId ? HOTSPOT_META[selectedHotspotId] : null;
  const selectedState = selectedHotspotId ? hotspotStates[selectedHotspotId] : null;
  const SelectedIcon = selectedMeta?.icon;
  const completedCount = Object.values(hotspotStates).filter(
    (state) => state === 'completed',
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText variant="label" style={styles.eyebrow}>
            {t('world.map')}
          </ThemedText>
          <ThemedText variant="subtitle" style={styles.title}>
            {t('world.sceneTitle')}
          </ThemedText>
          <ThemedText variant="caption" style={styles.instructions}>
            {t('world.sceneInstructions')}
          </ThemedText>
        </View>
        <View style={styles.progressBadge}>
          <ThemedText variant="label" style={styles.progressValue}>
            {completedCount}/4
          </ThemedText>
          <ThemedText variant="label" style={styles.progressLabel}>
            {t('world.scanned')}
          </ThemedText>
        </View>
      </View>

      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={t('world.accessibility')}
        onLayout={handleLayout}
        onPress={handleScenePress}
        style={[
          styles.scene,
          highContrast && styles.sceneHighContrast,
        ]}
      >
        <AdventureMapScene
          width={sceneSize.width}
          height={sceneSize.height}
          hotspotStates={hotspotStates}
          focusedHotspotId={focusedHotspotId}
          debug={DEBUG_HOTSPOTS}
        />

        {SERVER_ROOM_HOTSPOTS.map((hotspot) => {
          const bounds = getPolygonBounds(hotspot.polygon, imageRect);
          const state = focusedHotspotId === hotspot.id
            ? 'focused'
            : hotspotStates[hotspot.id];
          const meta = HOTSPOT_META[hotspot.id];
          const status = STATUS_META[state];
          return (
            <React.Fragment key={hotspot.id}>
              {state === 'available' && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.pulse,
                    {
                      left: bounds.x,
                      top: bounds.y,
                      width: bounds.width,
                      height: bounds.height,
                      borderColor: status.color,
                      opacity: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.2, 0.68],
                      }),
                      transform: [{
                        scale: pulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.96, 1.04],
                        }),
                      }],
                    },
                  ]}
                />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(meta.accessibilityLabel)}
                accessibilityHint={t(meta.description)}
                accessibilityState={{
                  selected: focusedHotspotId === hotspot.id,
                }}
                accessibilityValue={{ text: t(status.label) }}
                testID={`scene-hotspot-${hotspot.id}`}
                onPress={(event) => {
                  event.stopPropagation();
                  activateHotspot(hotspot);
                }}
                style={[
                  styles.hotspotButton,
                  {
                    left: bounds.x,
                    top: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                  },
                  DEBUG_HOTSPOTS && styles.hotspotDebug,
                ]}
              >
                {DEBUG_HOTSPOTS && (
                  <ThemedText variant="label" style={styles.debugLabel}>
                    {hotspot.id}
                  </ThemedText>
                )}
              </Pressable>
            </React.Fragment>
          );
        })}

        <View pointerEvents="none" style={styles.sceneTopBar}>
          <View style={styles.liveDot} />
          <ThemedText variant="label" style={styles.sceneTopText}>
            {t('world.liveFeed')}
          </ThemedText>
        </View>
      </Pressable>

      <View style={styles.legend}>
        {(['available', 'completed', 'locked'] as const).map((state) => (
          <View key={state} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_META[state].color }]} />
            <ThemedText variant="caption" color="muted">
              {t(STATUS_META[state].label)}
            </ThemedText>
          </View>
        ))}
      </View>

      {selectedMeta && selectedState && SelectedIcon ? (
        <Panel
          variant="elevated"
          style={[
            styles.selectionCard,
            { borderColor: STATUS_META[selectedState].color },
          ]}
        >
          <View style={[
            styles.selectionIcon,
            { backgroundColor: `${STATUS_META[selectedState].color}22` },
          ]}>
            {selectedState === 'completed' ? (
              <Check size={24} color={STATUS_META[selectedState].color} strokeWidth={3} />
            ) : selectedState === 'locked' ? (
              <LockKeyhole size={23} color={STATUS_META[selectedState].color} />
            ) : (
              <SelectedIcon size={24} color={STATUS_META[selectedState].color} />
            )}
          </View>
          <View style={styles.selectionCopy}>
            <View style={styles.selectionHeading}>
              <ThemedText variant="body" style={styles.selectionTitle}>
                {t(selectedMeta.label)}
              </ThemedText>
              <ThemedText
                variant="label"
                style={{ color: STATUS_META[selectedState].color }}
              >
                {t(STATUS_META[selectedState].label)}
              </ThemedText>
            </View>
            <ThemedText variant="caption" color="muted">
              {t(selectedMeta.description)}
            </ThemedText>
          </View>
        </Panel>
      ) : (
        <View style={styles.tip}>
          <RadioTower size={18} color={colors.operator} />
          <ThemedText variant="caption" color="muted" style={styles.tipText}>
            {t('world.selectPrompt')}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.cyanMuted,
    backgroundColor: colors.surfaceDark,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.operator,
    letterSpacing: 1.5,
  },
  title: {
    color: colors.textPrimary,
  },
  instructions: {
    color: colors.textMuted,
  },
  progressBadge: {
    minWidth: 66,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.cyanMuted,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  progressValue: {
    color: colors.primary,
    fontSize: 17,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 9,
  },
  scene: {
    width: '100%',
    minHeight: 220,
    maxHeight: 390,
    aspectRatio: 1672 / 941,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.metalLight,
    backgroundColor: colors.backgroundDeep,
    ...shadows.lg,
  },
  sceneHighContrast: {
    borderColor: colors.textPrimary,
    borderWidth: 4,
  },
  sceneTopBar: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cyanMuted,
    backgroundColor: colors.overlay,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  sceneTopText: {
    color: colors.textPrimary,
    fontSize: 9,
  },
  pulse: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: radius.md,
    backgroundColor: colors.scanline,
  },
  hotspotButton: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  hotspotDebug: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.alarmBackground,
  },
  debugLabel: {
    color: colors.textPrimary,
    fontSize: 8,
    backgroundColor: colors.backgroundDeep,
    paddingHorizontal: 3,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 2,
  },
  selectionIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCopy: {
    flex: 1,
    gap: 3,
  },
  selectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selectionTitle: {
    flex: 1,
    fontWeight: '700',
  },
  tip: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.operatorContainer,
  },
  tipText: {
    flex: 1,
  },
});
