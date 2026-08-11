import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri, AuthRequest, ResponseType } from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuthModule from 'firebase/auth';
import {
  FacebookAuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  initializeAuth,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type AuthCredential,
  type Persistence,
} from 'firebase/auth';
import { Platform } from 'react-native';

export type FirebaseSocialProvider = 'google' | 'facebook' | 'github';

export interface FirebaseIdentityToken {
  idToken: string;
  displayName: string | null;
  provider: 'email' | FirebaseSocialProvider;
}

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() ?? '',
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

let authInstance: Auth | null = null;

function reactNativePersistence(): Persistence {
  const module = FirebaseAuthModule as typeof FirebaseAuthModule & {
    getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
  };
  return module.getReactNativePersistence(AsyncStorage);
}

function firebaseAuth(): Auth {
  if (!isFirebaseConfigured) throw new Error('FIREBASE_NOT_CONFIGURED');
  if (authInstance) return authInstance;
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
    return authInstance;
  }
  try {
    authInstance = initializeAuth(app, {
      persistence: reactNativePersistence(),
    });
  } catch {
    authInstance = getAuth(app);
  }
  return authInstance;
}

function normalizeFirebaseError(error: unknown): never {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : error instanceof Error ? error.message : 'FIREBASE_AUTH_FAILED';
  const mapped: Record<string, string> = {
    'auth/email-already-in-use': 'EMAIL_ALREADY_REGISTERED',
    'auth/invalid-credential': 'INVALID_EMAIL_OR_PASSWORD',
    'auth/invalid-email': 'INVALID_EMAIL',
    'auth/weak-password': 'WEAK_PASSWORD',
    'auth/popup-closed-by-user': 'OAUTH_CANCELLED',
    'auth/cancelled-popup-request': 'OAUTH_CANCELLED',
    'auth/account-exists-with-different-credential': 'ACCOUNT_PROVIDER_MISMATCH',
    'auth/network-request-failed': 'NETWORK_ERROR',
  };
  throw new Error(mapped[code] ?? code);
}

async function identityToken(
  provider: FirebaseIdentityToken['provider'],
): Promise<FirebaseIdentityToken> {
  const user = firebaseAuth().currentUser;
  if (!user) throw new Error('FIREBASE_SESSION_MISSING');
  return {
    idToken: await user.getIdToken(true),
    displayName: user.displayName,
    provider,
  };
}

export async function registerFirebaseEmail(
  displayName: string,
  email: string,
  password: string,
): Promise<FirebaseIdentityToken> {
  try {
    const result = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
    await updateProfile(result.user, { displayName });
    return identityToken('email');
  } catch (error) {
    return normalizeFirebaseError(error);
  }
}

export async function signInFirebaseEmail(
  email: string,
  password: string,
): Promise<FirebaseIdentityToken> {
  try {
    await signInWithEmailAndPassword(firebaseAuth(), email, password);
    return identityToken('email');
  } catch (error) {
    return normalizeFirebaseError(error);
  }
}

const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};
const facebookDiscovery = {
  authorizationEndpoint: 'https://www.facebook.com/v23.0/dialog/oauth',
  tokenEndpoint: 'https://graph.facebook.com/v23.0/oauth/access_token',
};
function platformClientId(provider: FirebaseSocialProvider): string {
  if (provider === 'google') {
    const id = Platform.select({
      android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
    if (id?.trim()) return id.trim();
  }
  if (provider === 'facebook' && process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim()) {
    return process.env.EXPO_PUBLIC_FACEBOOK_APP_ID.trim();
  }
  throw new Error('OAUTH_PROVIDER_NOT_CONFIGURED');
}

async function nativeCredential(provider: FirebaseSocialProvider): Promise<AuthCredential> {
  if (provider === 'github') throw new Error('GITHUB_NATIVE_REQUIRES_BACKEND');
  const clientId = platformClientId(provider);
  const redirectUri = makeRedirectUri({ scheme: 'duelcade', path: 'auth/callback' });
  if (provider === 'google') {
    const request = new AuthRequest({
      clientId,
      redirectUri,
      responseType: ResponseType.IdToken,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: false,
      extraParams: { nonce: Crypto.randomUUID(), prompt: 'select_account' },
    });
    const result = await request.promptAsync(googleDiscovery);
    if (result.type !== 'success') throw new Error('OAUTH_CANCELLED');
    const token = result.params.id_token;
    if (!token) throw new Error('OAUTH_FAILED');
    return GoogleAuthProvider.credential(token);
  }
  if (provider === 'facebook') {
    const request = new AuthRequest({
      clientId,
      redirectUri,
      responseType: ResponseType.Token,
      scopes: ['public_profile', 'email'],
      usePKCE: false,
    });
    const result = await request.promptAsync(facebookDiscovery);
    if (result.type !== 'success') throw new Error('OAUTH_CANCELLED');
    const token = result.authentication?.accessToken ?? result.params.access_token;
    if (!token) throw new Error('OAUTH_FAILED');
    return FacebookAuthProvider.credential(token);
  }
  throw new Error('OAUTH_PROVIDER_NOT_CONFIGURED');
}

function webProvider(provider: FirebaseSocialProvider) {
  if (provider === 'google') return new GoogleAuthProvider();
  if (provider === 'facebook') return new FacebookAuthProvider();
  const github = new GithubAuthProvider();
  github.addScope('user:email');
  return github;
}

export async function signInFirebaseSocial(
  provider: FirebaseSocialProvider,
): Promise<FirebaseIdentityToken> {
  try {
    if (Platform.OS === 'web') {
      await signInWithPopup(firebaseAuth(), webProvider(provider));
    } else {
      await signInWithCredential(firebaseAuth(), await nativeCredential(provider));
    }
    return identityToken(provider);
  } catch (error) {
    return normalizeFirebaseError(error);
  }
}

export async function restoreFirebaseIdentity(): Promise<FirebaseIdentityToken | null> {
  if (!isFirebaseConfigured) return null;
  const auth = firebaseAuth();
  await auth.authStateReady();
  const providerId = auth.currentUser?.providerData[0]?.providerId;
  if (!auth.currentUser) return null;
  const provider: FirebaseIdentityToken['provider'] = providerId === 'google.com'
    ? 'google'
    : providerId === 'facebook.com'
      ? 'facebook'
      : providerId === 'github.com' ? 'github' : 'email';
  return identityToken(provider);
}

export async function signOutFirebase(): Promise<void> {
  if (!isFirebaseConfigured) return;
  await signOut(firebaseAuth());
}

export function firebaseClientProviderAvailable(
  provider: FirebaseIdentityToken['provider'],
): boolean {
  if (!isFirebaseConfigured) return false;
  if (provider === 'email' || Platform.OS === 'web') return true;
  try {
    platformClientId(provider);
    return true;
  } catch {
    return false;
  }
}
