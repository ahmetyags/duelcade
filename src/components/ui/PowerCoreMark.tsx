import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type PowerCoreMarkProps = {
  readonly size?: number;
};

/** Mechanical lock / power-core mark shared by the home screen and app branding. */
export function PowerCoreMark({ size = 112 }: PowerCoreMarkProps) {
  return (
    <View
      accessible
      accessibilityLabel="Duelcade logo"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Rect x="7" y="7" width="106" height="106" rx="13" fill={colors.backgroundDeep} stroke={colors.metalLight} strokeWidth="4" />
        <Rect x="14" y="14" width="92" height="92" rx="8" fill={colors.surfaceDark} stroke={colors.borderDark} strokeWidth="3" />
        <Line x1="20" y1="60" x2="100" y2="60" stroke={colors.metal} strokeWidth="8" />
        <Line x1="60" y1="20" x2="60" y2="100" stroke={colors.metal} strokeWidth="8" />
        <Circle cx="60" cy="60" r="35" fill={colors.surfaceElevated} stroke={colors.amberStrong} strokeWidth="5" />
        <Circle cx="60" cy="60" r="25" fill={colors.backgroundDeep} stroke={colors.metalLight} strokeWidth="4" />
        <Circle cx="60" cy="60" r="15" fill={colors.cyanMuted} stroke={colors.cyan} strokeWidth="4" />
        <Circle cx="60" cy="60" r="6" fill={colors.textPrimary} />
        {[
          [20, 20],
          [100, 20],
          [20, 100],
          [100, 100],
        ].map(([cx, cy]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill={colors.amber} />
        ))}
      </Svg>
    </View>
  );
}
