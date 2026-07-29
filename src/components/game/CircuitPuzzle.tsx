/**
 * CircuitPuzzle — cable connection interface for the Explorer.
 * Per Puzzle System Bible: Explorer connects cables to terminals,
 * Operator sees the correct wiring diagram.
 * Interactive drag-and-drop cable connections.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Panel } from '@/components/ui/Panel';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { colors, spacing, radius } from '@/theme/tokens';
import { triggerHaptic } from '@/services/HapticsService';
import { Zap } from 'lucide-react-native';
import type { ClientPuzzleState, CircuitConnection } from '@/types/puzzle';
import { useTranslation } from '@/src/i18n';
import { useSettingsStore } from '@/store/settingsStore';

interface CircuitPuzzleProps {
  readonly puzzle: ClientPuzzleState;
  readonly onSubmit: (connections: CircuitConnection[]) => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly disabled?: boolean;
}

const CABLE_COLORS: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  yellow: '#F59E0B',
  green: '#22C55E',
  purple: '#8B5CF6',
};

const CABLE_SYMBOLS: Record<string, string> = {
  red: '◆',
  blue: '●',
  yellow: '★',
  green: '▲',
  purple: '■',
};

export const CircuitPuzzle = React.memo<CircuitPuzzleProps>(function CircuitPuzzle({
  puzzle,
  onSubmit,
  style,
  disabled = false,
}) {
  const publicState = puzzle.publicState as {
    cables?: string[];
    terminals?: string[];
    panelLabel?: string;
  };
  const { gameText, t } = useTranslation();
  const colorblindMode = useSettingsStore((state) => state.colorblindMode);

  const cables = useMemo(
    () => publicState.cables ?? ['red', 'blue', 'yellow', 'green'],
    [publicState.cables],
  );
  const terminals = publicState.terminals ?? ['T1', 'T2', 'T3', 'T4'];

  const [connections, setConnections] = useState<Record<string, string>>({});
  const [selectedCable, setSelectedCable] = useState<string | null>(null);

  const handleCablePress = useCallback((cable: string) => {
    if (disabled) return;
    triggerHaptic('light');
    setSelectedCable((prev) => (prev === cable ? null : cable));
  }, [disabled]);

  const handleTerminalPress = useCallback((terminal: string) => {
    if (disabled || !selectedCable) return;
    triggerHaptic('medium');
    setConnections((prev) => ({ ...prev, [selectedCable]: terminal }));
    setSelectedCable(null);
  }, [selectedCable, disabled]);

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    const connectionList: CircuitConnection[] = Object.entries(connections).map(
      ([from, to]) => ({ fromNode: from, toNode: to }),
    );
    if (connectionList.length === cables.length) {
      triggerHaptic('medium');
      onSubmit(connectionList);
    }
  }, [connections, cables, onSubmit, disabled]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    triggerHaptic('light');
    setConnections({});
    setSelectedCable(null);
  }, [disabled]);

  const allConnected = Object.keys(connections).length === cables.length;

  return (
    <Panel variant="elevated" style={[{ padding: spacing.lg }, style]}>
      <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Zap size={18} color={colors.accent} strokeWidth={2} />
          <ThemedText variant="subtitle" color="accent">
            {gameText(publicState.panelLabel ?? t('puzzle.cableMatrix'))}
          </ThemedText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', minHeight: 240 }}>
        {/* Left: Cables */}
        <View style={{ gap: spacing.md, justifyContent: 'center' }}>
          {cables.map((cable) => {
            const color = CABLE_COLORS[cable] ?? colors.textMuted;
            const isConnected = !!connections[cable];
            const isSelected = selectedCable === cable;
            return (
              <Pressable
                key={`cable_${cable}`}
                accessibilityRole="button"
                accessibilityLabel={t('puzzle.cableButton', { cable: gameText(cable) })}
                accessibilityState={{ disabled: disabled || isConnected, selected: isSelected }}
                onPress={() => handleCablePress(cable)}
                disabled={disabled || isConnected}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: isSelected ? color : isConnected ? `${color}40` : colors.border,
                  backgroundColor: isSelected ? `${color}20` : isConnected ? `${color}10` : colors.surface,
                  opacity: disabled || isConnected ? 0.5 : pressed ? 0.7 : 1,
                  minWidth: 120,
                })}
              >
                {colorblindMode ? (
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: color,
                  }}>
                    <ThemedText style={{ color: '#FFFFFF', fontSize: 12, lineHeight: 15, fontWeight: '800' }}>
                      {CABLE_SYMBOLS[cable] ?? '•'}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color }} />
                )}
                <ThemedText variant="caption" style={{ color: colors.textPrimary, textTransform: 'capitalize' }}>
                  {gameText(cable)}
                </ThemedText>
                {isConnected && (
                  <ThemedText variant="label" color="muted" style={{ marginLeft: 'auto' }}>
                    → {connections[cable]}
                  </ThemedText>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Right: Terminals */}
        <View style={{ gap: spacing.md, justifyContent: 'center' }}>
          {terminals.map((terminal) => {
            const isUsed = Object.values(connections).includes(terminal);
            const canConnect = selectedCable && !isUsed;
            return (
              <Pressable
                key={`term_${terminal}`}
                accessibilityRole="button"
                accessibilityLabel={t('puzzle.terminalButton', { terminal })}
                accessibilityState={{ disabled: disabled || !canConnect, selected: isUsed }}
                onPress={() => handleTerminalPress(terminal)}
                disabled={disabled || !canConnect}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: isUsed ? colors.success : canConnect ? colors.primary : colors.border,
                  backgroundColor: isUsed ? `${colors.success}15` : canConnect ? `${colors.primary}10` : colors.surfaceMuted,
                  opacity: disabled || (isUsed && !canConnect) ? 0.5 : pressed ? 0.7 : 1,
                })}
              >
                <ThemedText variant="mono" style={{ fontSize: 16, color: isUsed ? colors.success : colors.textSecondary }}>
                  {terminal}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Controls */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, justifyContent: 'center' }}>
        <ThemedButton
          label={t('common.clear')}
          variant="secondary"
          size="sm"
          onPress={handleClear}
          disabled={disabled || Object.keys(connections).length === 0}
        />
        <ThemedButton
          label={t('common.submit')}
          variant="primary"
          size="sm"
          onPress={handleSubmit}
          disabled={disabled || !allConnected}
          style={{ backgroundColor: allConnected ? colors.success : undefined }}
        />
      </View>

      {selectedCable && (
        <ThemedText variant="caption" color="primary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
          {t('puzzle.selectTerminal', { cable: gameText(selectedCable) })}
        </ThemedText>
      )}
    </Panel>
  );
});
