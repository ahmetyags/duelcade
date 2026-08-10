import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export type SocialAuthProvider = 'google' | 'facebook' | 'github';

export function AuthProviderIcon({ provider, size = 22 }: { provider: SocialAuthProvider; size?: number }) {
  if (provider === 'google') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
        <Path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" />
        <Path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.38l-3.24-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
        <Path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.53l3.35-2.61Z" />
        <Path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z" />
      </Svg>
    );
  }
  if (provider === 'facebook') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
        <Circle cx="12" cy="12" r="11" fill="#1877F2" />
        <Path fill="#fff" d="M13.55 20v-7h2.35l.35-2.73h-2.7V8.53c0-.79.22-1.33 1.35-1.33h1.44V4.76a19.2 19.2 0 0 0-2.1-.11c-2.08 0-3.5 1.27-3.5 3.6v2.02H8.4V13h2.34v7h2.81Z" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path fill="#181717" d="M12 1.5A10.5 10.5 0 0 0 8.68 21.96c.52.1.72-.23.72-.51v-2.03c-2.93.64-3.55-1.24-3.55-1.24-.48-1.22-1.17-1.54-1.17-1.54-.96-.66.07-.64.07-.64 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.47 1.15 3.07.88.1-.68.37-1.15.67-1.41-2.34-.27-4.8-1.17-4.8-5.19 0-1.15.41-2.08 1.08-2.81-.11-.27-.47-1.34.1-2.78 0 0 .88-.28 2.89 1.07A10 10 0 0 1 12 6.49c.9 0 1.79.12 2.63.36 2-1.35 2.88-1.07 2.88-1.07.57 1.44.21 2.51.1 2.78.67.73 1.08 1.66 1.08 2.81 0 4.03-2.47 4.92-4.81 5.18.38.33.71.96.71 1.94v2.96c0 .28.19.62.72.51A10.5 10.5 0 0 0 12 1.5Z" />
    </Svg>
  );
}
