import type { Session, User } from '@supabase/supabase-js';

export interface Profile {
  display_name: string;
  avatar_url: string | null;
  plan: string;
  credits: number;
  books_created: number;
  language_preference: string | null;
  role: 'user' | 'admin' | 'moderator';
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialize: () => void;
  signUp: (email: string, password: string, displayName: string) => Promise<unknown>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signInWithGoogle: () => Promise<unknown>;
  signOut: () => void;
  resetPassword: (email: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  refreshCredits: () => Promise<void>;
}

declare const useAuthStore: import('zustand').UseBoundStore<import('zustand').StoreApi<AuthState>>;
export default useAuthStore;
