import React from 'react';
import { Image } from 'react-native';

type PowerCoreMarkProps = {
  readonly size?: number;
};

/** Duelcade's two-player puzzle emblem, shared by the home screen and app branding. */
export function PowerCoreMark({ size = 112 }: PowerCoreMarkProps) {
  return (
    <Image
      accessible
      accessibilityLabel="Duelcade logo"
      resizeMode="contain"
      source={require('@/assets/images/duelcade-mark.png')}
      style={{ width: size, height: size }}
    />
  );
}
