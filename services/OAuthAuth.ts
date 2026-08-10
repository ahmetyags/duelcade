import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import {
  exchangeOAuthSession,
  getOAuthStartUrl,
  type AuthProvider,
  type ServerSession,
} from '@/services/AuthApi';

WebBrowser.maybeCompleteAuthSession();

export async function openOAuthSession(
  provider: Exclude<AuthProvider, 'guest' | 'email'>,
): Promise<ServerSession> {
  const redirectUri = makeRedirectUri({ scheme: 'duelcade', path: 'auth/callback' });
  const result = await WebBrowser.openAuthSessionAsync(
    getOAuthStartUrl(provider, redirectUri),
    redirectUri,
  );
  if (result.type !== 'success') throw new Error('OAUTH_CANCELLED');
  const returned = new URL(result.url);
  const error = returned.searchParams.get('error');
  const code = returned.searchParams.get('code');
  if (error || !code) throw new Error(error ?? 'OAUTH_FAILED');
  return exchangeOAuthSession(code);
}
