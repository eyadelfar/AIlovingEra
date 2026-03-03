import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import i18n from '../lib/i18n';
import { trackEvent } from '../lib/eventTracker';

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

        // Zustand persist may have hydrated user/session from localStorage.
        // Show UI immediately while Supabase verifies the session in background
        // (avoids 5+ second blank navbar due to navigator lock contention).
        const { user: hydratedUser } = get();
        if (hydratedUser) {
          set({ loading: false });
          get().fetchProfile();
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
          set({ session, user: session?.user ?? null, loading: false });
          if (session?.user) {
            await get().fetchProfile();
          } else {
            set({ profile: null });
          }
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
          set({ session, user: session?.user ?? null, loading: false });
          if (session?.user) get().fetchProfile();
        }).catch(() => {
          // If getSession fails (lock timeout, network), still stop loading
          set({ loading: false });
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

      signOut: async () => {
        if (supabase) {
          try { await supabase.auth.signOut(); }
          catch (err) { console.warn('signOut failed, clearing local state anyway:', err.message); }
        }
        set({ user: null, session: null, profile: null });
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
      name: 'keepsqueak-auth',
      partialize: (state) => ({
        // Only persist user/session — profile is fetched fresh
        user: state.user,
        session: state.session,
      }),
    }
  )
);

export default useAuthStore;
