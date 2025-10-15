import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import Constants from 'expo-constants';
import { dataLoadingService } from '../services/dataLoadingService';

interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSession: (session) => set({ session }),

      setLoading: (loading) => set({ loading }),

      signIn: async (email: string, password: string) => {
        set({ loading: true });
        try {
          console.log('🔐 Attempting login with:', email);
          console.log(
            '🔗 Supabase URL:',
            Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL
          );

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            console.error('❌ Login error:', error);
            throw error;
          }

          console.log('✅ Login successful:', data.user?.email);
          console.log('🔍 User data:', data.user);

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            loading: false,
          });

          console.log('🔍 User set in store:', data.user);
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      signUp: async (email: string, password: string, fullName: string) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          });

          if (error) throw error;

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: !!data.user,
            loading: false,
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      signOut: async () => {
        set({ loading: true });
        try {
          console.log('🔐 Signing out...');

          const { error } = await supabase.auth.signOut();
          if (error) throw error;

          // Clear all auth state
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            loading: false,
          });

          // Clear pre-loaded data cache
          dataLoadingService.clearCache();

          console.log('✅ Sign out successful');
        } catch (error) {
          console.error('❌ Sign out error:', error);
          set({ loading: false });
          throw error;
        }
      },

      initialize: async () => {
        set({ loading: true });
        try {
          console.log('🔐 Initializing auth...');

          // Helper to clear any stale Supabase auth tokens from storage
          const clearSupabaseAuthStorage = async () => {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const supabaseKeys = allKeys.filter(
                (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
              );
              if (supabaseKeys.length) {
                await AsyncStorage.multiRemove(supabaseKeys);
                console.log('🧹 Cleared Supabase auth tokens from storage');
              }
            } catch (err) {
              console.log('⚠️ Failed to clear Supabase auth storage keys', err);
            }
          };

          // First check if we have persisted session data
          const currentState = get();
          if (currentState.session && currentState.user) {
            console.log(
              '🔐 Found persisted session, validating with Supabase...'
            );

            // Validate the persisted session with Supabase
            const {
              data: { session },
              error,
            } = await supabase.auth.getSession();

            if (error) {
              console.log(
                '❌ Persisted session invalid, clearing local auth...'
              );
              // Clear any locally cached tokens and persisted store to recover from invalid refresh token
              try {
                // Best-effort local sign-out to purge tokens without network
                // @ts-expect-error scope is supported by supabase-js for local-only sign out
                await supabase.auth.signOut({ scope: 'local' });
              } catch {}
              await clearSupabaseAuthStorage();
              set({
                user: null,
                session: null,
                isAuthenticated: false,
                loading: false,
              });
              // Also clear our persisted Zustand auth slice to avoid rehydrating bad state
              try {
                await AsyncStorage.removeItem('genie-auth-store');
                console.log('🧹 Cleared persisted auth store');
              } catch {}
              return;
            }

            if (session?.user?.id === currentState.user.id) {
              console.log('✅ Persisted session valid, restoring...');
              set({
                user: session.user,
                session,
                isAuthenticated: true,
                loading: false,
              });
            } else {
              console.log('❌ Session user mismatch, clearing...');
              set({
                user: null,
                session: null,
                isAuthenticated: false,
                loading: false,
              });
            }
          } else {
            console.log('🔐 No persisted session, checking Supabase...');

            const {
              data: { session },
              error,
            } = await supabase.auth.getSession();

            if (error) {
              console.error('❌ Error getting session:', error);
              // If we can't get a session due to invalid refresh token, clear local auth and persisted store
              try {
                // @ts-expect-error scope is supported by supabase-js for local-only sign out
                await supabase.auth.signOut({ scope: 'local' });
              } catch {}
              await clearSupabaseAuthStorage();
              try {
                await AsyncStorage.removeItem('genie-auth-store');
              } catch {}
              set({
                user: null,
                session: null,
                isAuthenticated: false,
                loading: false,
              });
              return;
            }

            console.log('🔐 Supabase session found:', !!session?.user);
            console.log('🔐 User email:', session?.user?.email);

            set({
              user: session?.user || null,
              session,
              isAuthenticated: !!session?.user,
              loading: false,
            });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event, !!session?.user);

            set({
              user: session?.user || null,
              session,
              isAuthenticated: !!session?.user,
            });
          });
        } catch (error) {
          console.error('❌ Auth initialization error:', error);
          set({ loading: false });
        }
      },
    }),
    {
      name: 'genie-auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist user and session data for proper session restoration
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔐 Rehydrating auth store:', !!state?.isAuthenticated);
        // Don't auto-initialize here, let App.tsx handle it
        return state;
      },
    }
  )
);
