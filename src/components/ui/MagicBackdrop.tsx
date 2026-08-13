import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { colors } from '@/theme/tokens';

interface MagicBackdropProps {
  readonly style?: StyleProp<ViewStyle>;
}

/** Static, low-cost brand atmosphere shared by every non-scene screen. */
export const MagicBackdrop = React.memo<MagicBackdropProps>(function MagicBackdrop({ style }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 430 900" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="tealAura" cx="0" cy="0" rx="1" ry="1" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.actionCyan} stopOpacity="0.12" />
            <Stop offset="1" stopColor={colors.actionCyan} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="amberAura" cx="430" cy="760" rx="1" ry="1" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.actionAmber} stopOpacity="0.11" />
            <Stop offset="1" stopColor={colors.actionAmber} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="430" height="900" fill={colors.backgroundDeep} />
        <Circle cx="0" cy="0" r="310" fill="url(#tealAura)" opacity="0.72" />
        <Circle cx="430" cy="760" r="300" fill="url(#amberAura)" opacity="0.58" />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    pointerEvents: 'none',
    backgroundColor: colors.backgroundDeep,
  },
});
