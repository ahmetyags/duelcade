/**
 * AlarmFlash — full-screen red flash overlay for alarm states.
 * Per Art Direction Bible: alarm flash — red blinking lights.
 * Respects reduce-motion accessibility setting.
 */

import React, { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/src/i18n';

interface AlarmFlashProps {
  readonly active: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export const AlarmFlash = React.memo<AlarmFlashProps>(function AlarmFlash({ active, style }) {
  const { reduceMotion, visualAlertsInsteadOfSound } = useSettingsStore();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const staticAlert = reduceMotion || visualAlertsInsteadOfSound;

  useEffect(() => {
    if (!active || staticAlert) return undefined;

    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, 600);

    return () => clearInterval(interval);
  }, [active, staticAlert]);

  if (!active || (!staticAlert && !visible)) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={t('game.visualAlarm')}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.alarmBackground,
          borderWidth: 2,
          borderColor: colors.alarmRed,
          opacity: visualAlertsInsteadOfSound ? 0.62 : 0.4,
          pointerEvents: 'none',
        },
        style,
      ]}
    />
  );
});
