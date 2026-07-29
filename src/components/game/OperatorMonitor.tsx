/**
 * OperatorMonitor — the Operator's information display.
 * Per design bible: Operator sees codes, diagrams, schemas that the
 * Explorer cannot see. This component renders the operator's private
 * state from the puzzle, styled as a friendly Spirit Guide clue card.
 */

import React, { useMemo } from 'react';
import { Platform, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Panel } from '@/components/ui/Panel';
import { colors, spacing, radius } from '@/theme/tokens';
import { Monitor, Eye, Zap } from 'lucide-react-native';
import type { ClientPuzzleState } from '@/types/puzzle';
import { useTranslation } from '@/src/i18n';
import { PipeTileGrid } from '@/components/game/PipeTileGrid';
import { useSettingsStore } from '@/store/settingsStore';

interface OperatorMonitorProps {
  readonly puzzle: ClientPuzzleState;
  readonly style?: StyleProp<ViewStyle>;
  readonly roomName?: string;
}

export const OperatorMonitor = React.memo<OperatorMonitorProps>(function OperatorMonitor({
  puzzle,
  style,
  roomName,
}) {
  const { gameText, gameValue, t } = useTranslation();
  const colorblindMode = useSettingsStore((state) => state.colorblindMode);
  const localizedRoomName = roomName ? gameText(roomName) : t('game.magicMap');
  const privateState = puzzle.privateState as Record<
    string,
    string | number | boolean | string[] | number[] | { from: string; to: string }[]
  >;

  const monitorContent = useMemo(() => {
    switch (puzzle.category) {
      case 'code': {
        const correctCode = privateState.correctCode as string | undefined;
        const decoyCode = privateState.decoyCode as string | undefined;
        const monitorLabel = String(privateState.monitorLabel ?? 'AUTHORIZED CODE');
        return (
          <View style={{ gap: spacing.md }}>
            <MonitorHeader icon={Monitor} label={gameText(monitorLabel)} />
            {correctCode && (
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <ThemedText
                  variant="monoLarge"
                  style={{
                    color: colors.primary,
                    fontSize: correctCode.length > 4 ? 32 : 40,
                    letterSpacing: correctCode.length > 4 ? 8 : 12,
                    ...(Platform.OS === 'web'
                      ? ({ textShadow: `0 0 20px ${colors.glow}` } as unknown as TextStyle)
                      : {
                          textShadowColor: colors.glow,
                          textShadowOffset: { width: 0, height: 0 },
                          textShadowRadius: 20,
                        }),
                  }}
                >
                  {correctCode}
                </ThemedText>
              </View>
            )}
            {decoyCode && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.sm,
                borderRadius: radius.sm,
                backgroundColor: colors.surfaceMuted,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
              }}>
                <ThemedText variant="label" color="muted" style={{ textDecorationLine: 'line-through' }}>
                  {gameText(String(privateState.decoyLabel ?? 'OUTDATED'))}: {decoyCode}
                </ThemedText>
              </View>
            )}
            {privateState.warning && (
              <ThemedText variant="caption" color="accent" style={{ fontStyle: 'italic' }}>
                ⚠ {gameValue(privateState.warning)}
              </ThemedText>
            )}
          </View>
        );
      }
      case 'circuit': {
        const connections = privateState.correctConnections as { from: string; to: string }[] | undefined;
        return (
          <View style={{ gap: spacing.md }}>
            <MonitorHeader icon={Zap} label={gameText(String(privateState.diagramTitle ?? 'WIRING SCHEMA'))} />
            {connections && (
              <View style={{ gap: spacing.sm }}>
                {connections.map((conn, i) => (
                  <View
                    key={`conn_${i}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.sm,
                      backgroundColor: colors.surfaceMuted,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <View style={{
                        width: colorblindMode ? 24 : 12,
                        height: colorblindMode ? 24 : 12,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: CABLE_COLORS[conn.from] ?? colors.primary,
                      }}>
                        {colorblindMode && (
                          <ThemedText style={{ color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '800' }}>
                            {CABLE_SYMBOLS[conn.from] ?? '•'}
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText variant="caption" style={{ color: colors.textPrimary, textTransform: 'capitalize' }}>
                        {gameText(conn.from)}
                      </ThemedText>
                    </View>
                    <ThemedText variant="label" color="primary">→</ThemedText>
                    <ThemedText variant="caption" style={{ color: colors.success, fontWeight: '600' }}>
                      {conn.to}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
            {privateState.warning && (
              <ThemedText variant="caption" color="accent" style={{ fontStyle: 'italic' }}>
                ⚠ {gameValue(privateState.warning)}
              </ThemedText>
            )}
          </View>
        );
      }
      case 'symbol': {
        const sequence = privateState.correctSequence as string[] | undefined;
        return (
          <View style={{ gap: spacing.md }}>
            <MonitorHeader icon={Eye} label={gameText(String(privateState.monitorLabel ?? 'TARGET SEQUENCE'))} />
            {sequence && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg }}>
                {sequence.map((sym, i) => (
                  <View
                    key={`seq_${i}`}
                    style={{
                      minWidth: 72,
                      minHeight: 58,
                      paddingHorizontal: spacing.sm,
                      borderRadius: radius.md,
                      borderWidth: 1.5,
                      borderColor: SYMBOL_COLORS[sym] ?? colors.primary,
                      backgroundColor: `${SYMBOL_COLORS[sym] ?? colors.primary}15`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ThemedText variant="label" color="muted" style={{ fontSize: 9 }}>
                      {i + 1}
                    </ThemedText>
                    <ThemedText variant="label" style={{ color: SYMBOL_COLORS[sym] ?? colors.primary, textTransform: 'capitalize' }}>
                      {gameText(sym)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
            {privateState.glyphOrigin && (
              <ThemedText variant="caption" color="muted" style={{ fontStyle: 'italic', textAlign: 'center' }}>
                {gameValue(privateState.glyphOrigin)}
              </ThemedText>
            )}
          </View>
        );
      }
      case 'map':
      case 'memory_sequence': {
        const sequence = (
          privateState.correctRoute ?? privateState.correctSequence
        ) as string[] | undefined;
        return (
          <View style={{ gap: spacing.md }}>
            <MonitorHeader icon={Eye} label={gameText(String(privateState.monitorLabel ?? 'RELAY SEQUENCE'))} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
              {sequence?.map((value, index) => (
                <View
                  key={`${value}_${index}`}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    backgroundColor: colors.glow,
                  }}
                >
                  <ThemedText variant="label" color="primary">
                    {index + 1}. {gameText(value)}
                  </ThemedText>
                </View>
              ))}
            </View>
            {privateState.warning && (
              <ThemedText variant="caption" color="accent" style={{ textAlign: 'center' }}>
                ⚠ {gameValue(privateState.warning)}
              </ThemedText>
            )}
          </View>
        );
      }
      case 'logic': {
        const rotations = privateState.correctRotations as number[] | undefined;
        const tiles = privateState.pipeTiles as ('straight' | 'corner')[] | undefined;
        return (
          <View style={{ gap: spacing.md }}>
            <MonitorHeader icon={Zap} label={gameText(String(privateState.monitorLabel ?? 'PIPE SCHEMA'))} />
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.sm,
            }}>
              <ThemedText variant="label" color="accent">
                {t('puzzle.pipeEntry', { side: gameText(String(privateState.entrySide ?? 'LEFT')) })}
              </ThemedText>
              <ThemedText variant="label" color="primary">
                {t('puzzle.pipeExit', { side: gameText(String(privateState.exitSide ?? 'RIGHT')) })}
              </ThemedText>
            </View>
            {rotations && tiles && (
              <PipeTileGrid tiles={tiles} rotations={rotations} compact />
            )}
            <ThemedText variant="caption" color="muted" style={{ textAlign: 'center' }}>
              {t('puzzle.pipeGuideTip')}
            </ThemedText>
          </View>
        );
      }
      case 'timing': {
        const labels = privateState.labels as string[] | undefined;
        const frequencies = privateState.targetFrequencies as number[] | undefined;
        return (
          <View style={{ gap: spacing.md }}>
            <MonitorHeader
              icon={Zap}
              label={gameText(String(privateState.monitorLabel ?? 'SAFE RESONANCE SIGNATURE'))}
            />
            <View style={{ gap: spacing.sm }}>
              {frequencies?.map((frequency, index) => (
                <View key={`${frequency}_${index}`} style={{
                  minHeight: 54,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: colors.primaryContainer,
                }}>
                  <ThemedText variant="label" color="muted">
                    {t('puzzle.frequencyChannel', { channel: labels?.[index] ?? String(index + 1) })}
                  </ThemedText>
                  <ThemedText variant="mono" style={{ color: colors.operator, fontSize: 22, letterSpacing: 1 }}>
                    {frequency} Hz
                  </ThemedText>
                </View>
              ))}
            </View>
            <ThemedText variant="caption" color="accent" style={{ textAlign: 'center' }}>
              ⚠ {gameValue(privateState.warning)}
            </ThemedText>
          </View>
        );
      }
      default:
        return (
          <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
            <ThemedText variant="caption" color="muted">{t('puzzle.noData')}</ThemedText>
          </View>
        );
    }
  }, [colorblindMode, gameText, gameValue, puzzle, privateState, t]);

  return (
    <Panel
      variant="elevated"
      style={[
        {
          padding: spacing.md,
          backgroundColor: colors.surfaceDark,
          borderTopColor: colors.cyanMuted,
          borderRightColor: colors.borderDark,
          borderBottomColor: colors.borderDark,
          borderLeftColor: colors.metal,
        },
        style,
      ]}
    >
      {/* Monitor frame header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: spacing.sm,
        marginBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.primaryContainer,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Monitor size={16} color={colors.primary} strokeWidth={2} />
          <ThemedText variant="label" color="primary" style={{ fontSize: 11, letterSpacing: 2 }}>
            {t('game.magicMapRole', { map: localizedRoomName })}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
        </View>
      </View>

      {/* Monitor content */}
      {monitorContent}
    </Panel>
  );
});

// ─── Helper components ─────────────────────────────────────────────

function MonitorHeader({ icon: Icon, label }: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Icon size={16} color={colors.primary} strokeWidth={2} />
      <ThemedText variant="label" color="primary" style={{ letterSpacing: 1.5 }}>
        {label}
      </ThemedText>
    </View>
  );
}

const CABLE_COLORS: Record<string, string> = {
  red: '#FF8F8F',
  blue: '#8FD4EC',
  yellow: '#E7C957',
  green: '#55C77A',
  purple: '#9187C7',
};

const CABLE_SYMBOLS: Record<string, string> = {
  red: '◆',
  blue: '●',
  yellow: '★',
  green: '▲',
  purple: '■',
};

const SYMBOL_COLORS: Record<string, string> = {
  triangle: '#68C7DA',
  circle: '#E6A45D',
  square: '#55C77A',
  diamond: '#9187C7',
  hexagon: '#E7777F',
  star: '#DDBF4A',
  cross: '#72A8D5',
  wave: '#58B8C6',
};
