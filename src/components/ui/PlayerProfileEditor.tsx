import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Pencil } from 'lucide-react-native';

import { SeededRandom } from '@/engine/SeededRandom';
import { triggerHaptic } from '@/services/HapticsService';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import {
  PLAYER_AVATAR_IDS,
  type PlayerAvatarId,
} from '@/types/profile';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { ThemedText } from '@/components/ui/ThemedText';

interface PlayerProfileEditorProps {
  readonly name: string;
  readonly onNameChange: (name: string) => void;
  readonly avatarId: PlayerAvatarId;
  readonly onAvatarChange: (avatarId: PlayerAvatarId) => void;
  readonly title: string;
  readonly helperText: string;
  readonly namePlaceholder: string;
  readonly avatarLabel: string;
  readonly pickerTitle: string;
}

export function PlayerProfileEditor({
  name,
  onNameChange,
  avatarId,
  onAvatarChange,
  title,
  helperText,
  namePlaceholder,
  avatarLabel,
  pickerTitle,
}: PlayerProfileEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarOptions] = useState<PlayerAvatarId[]>(() => {
    const shuffled = new SeededRandom(`avatar_choices_${Date.now()}`)
      .shuffle([...PLAYER_AVATAR_IDS]);
    const options = shuffled.slice(0, 6);
    return options.includes(avatarId)
      ? options
      : [avatarId, ...options.filter((id) => id !== avatarId).slice(0, 5)];
  });

  return (
    <View style={styles.section}>
      <View>
        <ThemedText variant="label">{title}</ThemedText>
        <ThemedText variant="caption" color="muted">{helperText}</ThemedText>
      </View>
      <View style={styles.profileCard}>
        <View style={styles.identityRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={avatarLabel}
            accessibilityState={{ expanded: pickerOpen }}
            onPress={() => {
              setPickerOpen((open) => !open);
              triggerHaptic('light');
            }}
            style={({ pressed }) => [styles.avatarEdit, pressed && styles.pressed]}
          >
            <PlayerAvatar avatarId={avatarId} size={54} />
            <View style={styles.pencilBadge}>
              <Pencil size={11} color={colors.primaryDark} strokeWidth={2.5} />
            </View>
          </Pressable>
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder={namePlaceholder}
            placeholderTextColor={colors.textMuted}
            maxLength={24}
            autoCorrect={false}
            style={styles.nameInput}
          />
        </View>

        {pickerOpen && (
          <View style={styles.pickerAnchor}>
            <View style={styles.balloonTail} />
            <View style={styles.avatarBalloon}>
              <ThemedText variant="caption" color="muted" style={styles.pickerLabel}>
                {pickerTitle}
              </ThemedText>
              <View style={styles.avatarGrid}>
                {avatarOptions.map((option) => {
                  const selected = avatarId === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityLabel={`${avatarLabel}: ${option}`}
                      accessibilityState={{ checked: selected }}
                      onPress={() => {
                        onAvatarChange(option);
                        setPickerOpen(false);
                        triggerHaptic('light');
                      }}
                      style={({ pressed }) => [
                        styles.avatarOption,
                        selected && styles.avatarOptionSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <PlayerAvatar
                        avatarId={option}
                        size={42}
                        color={selected ? colors.primaryDark : colors.textSecondary}
                        backgroundColor={selected ? colors.primaryContainer : colors.surface}
                        borderColor={selected ? colors.primary : colors.border}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  profileCard: {
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceDark,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarEdit: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pencilBadge: {
    position: 'absolute',
    right: -1,
    top: -1,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  nameInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontFamily: 'Quicksand-SemiBold',
    fontSize: 16,
  },
  pickerAnchor: {
    position: 'relative',
    paddingTop: 7,
  },
  balloonTail: {
    position: 'absolute',
    top: 0,
    left: 20,
    width: 14,
    height: 14,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
  },
  avatarBalloon: {
    padding: spacing.sm,
    paddingTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    ...shadows.md,
  },
  pickerLabel: {
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  avatarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  avatarOption: {
    minWidth: 46,
    minHeight: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionSelected: {
    backgroundColor: colors.primaryContainer,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});
