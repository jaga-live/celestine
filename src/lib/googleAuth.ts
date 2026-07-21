import { invoke } from '@tauri-apps/api/core';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  givenName?: string;
  picture?: string;
  emailVerified: boolean;
}

export type GoogleAuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; profile: GoogleProfile }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

const runningInTauri = () => '__TAURI_INTERNALS__' in window;

export const getGoogleAuthStatus = (): Promise<GoogleProfile | null> => {
  if (!runningInTauri()) return Promise.resolve(null);
  return invoke<GoogleProfile | null>('google_auth_status');
};

export const signInWithGoogle = (): Promise<GoogleProfile> => {
  if (!runningInTauri())
    return Promise.reject(new Error('Google sign-in is available in the Celestine desktop app.'));
  return invoke<GoogleProfile>('google_sign_in');
};

export const signOutFromGoogle = (): Promise<void> => {
  if (!runningInTauri()) return Promise.resolve();
  return invoke<void>('google_sign_out');
};
