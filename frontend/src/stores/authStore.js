import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import i18n from '../lib/i18n';
import { trackEvent } from '../lib/eventTracker';
import useBookStore from './bookStore';

const PERSIST_KEY = 'keepsqueak-auth';

/** Remove all Supabase auth tokens from localStorage. */
function nukeSupabaseStorage() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.includes('-auth-')) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) { /* localStorage unavailable */ }
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null, // { display_name, avatar_url, plan, credits, books_created }
      loading: true,

      initialize: () => {
        if (!supabase) {
          set({ loading: false });
          return;
        }

        let validated = false;

        // Listen for REAL auth events (login, logout, token refresh).
        // Skip INITIAL_SESSION — it reads unvalidated localStorage tokens.
        // We validate via getUser() below instead.
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'INITIAL_SESSION' && !validated) return;

          set({ session, user: session?.user ?? null, loading: false });
          if (session?.user) {
            await get().fetchProfile();
          } else {
            set({ profile: null });
          }
        });

        // getUser() hits the Supabase server to validate the token.
        // getSession() only reads localStorage — it trusts expired tokens.
        supabase.auth.getUser().then(({ data: { user }, error }) => {
          validated = true;
          if (error || !user) {
            // Token invalid/expired/missing — clear everything
            set({ user: null, session: null, profile: null, loading: false });
            nukeSupabaseStorage();
            try { localStorage.removeItem(PERSIST_KEY); } catch { /* localStorage unavailable */ }
          } else {
            // Valid session — sync
            supabase.auth.getSession().then(({ data: { session } }) => {
              set({ session, user: session?.user ?? user, loading: false });
              get().fetchProfile();
            });
          }
        }).catch(() => {
          validated = true;
          set({ user: null, session: null, profile: null, loading: false });
        });
      },

      signUp: async (email, password, displayName) => {
        if (!supabase) throw new Error('Auth not configured');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName } },
        });
        if (error) {
          trackEvent('signup_attempt', 'auth', { success: false });
          throw error;
        }
        trackEvent('signup_attempt', 'auth', { success: true });
        return data;
      },

      signIn: async (email, password) => {
        if (!supabase) throw new Error('Auth not configured');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          trackEvent('signin_attempt', 'auth', { success: false });
          throw error;
        }
        trackEvent('signin_attempt', 'auth', { success: true });
        return data;
      },

      signInWithGoogle: async () => {
        if (!supabase) throw new Error('Auth not configured');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        return data;
      },

      signOut: () => {
        // ALL synchronous — nothing can hang or race

        // 0. Clean up book store (aborts generation, clears timers, revokes blobs)
        useBookStore.getState().reset();

        // 1. Clear Zustand state (UI updates instantly)
        set({ user: null, session: null, profile: null });

        // 2. Nuke Supabase's localStorage keys (sb-<ref>-auth-token)
        nukeSupabaseStorage();

        // 3. Nuke our own Zustand persist key
        try { localStorage.removeItem(PERSIST_KEY); } catch { /* localStorage unavailable */ }

        // 4. Fire-and-forget SDK cleanup (do NOT await — it can hang)
        if (supabase) {
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }

        trackEvent('signout', 'auth');
      },

      resetPassword: async (email) => {
        if (!supabase) throw new Error('Auth not configured');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
      },

      fetchProfile: async () => {
        if (!supabase) return;
        const userId = get().user?.id;
        if (!userId) return;

        // Try up to 2 times — first attempt may fail if Supabase auth isn't ready yet
        for (let attempt = 0; attempt < 2; attempt++) {
          const { data, error } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, plan, credits, books_created, language_preference, role')
            .eq('id', userId)
            .single();

          if (!error && data) {
            set({ profile: data });
            // Sync language preference from profile
            if (data.language_preference && data.language_preference !== i18n.language) {
              i18n.changeLanguage(data.language_preference);
            }
            return;
          }

          // Retry after a short delay to let Supabase auth settle
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      },

      refreshCredits: async () => {
        if (!supabase) return;
        const userId = get().user?.id;
        if (!userId) return;

        const { data } = await supabase
          .from('profiles')
          .select('credits, plan')
          .eq('id', userId)
          .single();

        if (data) {
          set({ profile: { ...get().profile, ...data } });
        }
      },
    }),
    {
      name: PERSIST_KEY,
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        profile: state.profile,
      }),
    }
  )
);

export default useAuthStore;
