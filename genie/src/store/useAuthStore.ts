import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import Constants from 'expo-constants';

// Get Supabase URL and key
const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
import { dataLoadingService } from '../services/dataLoadingService';

interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  isAuthenticated: boolean;
  termsAccepted: boolean;
  needsTermsAcceptance: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
  setTermsAccepted: (accepted: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signUpWithPhone: (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => Promise<string>;
  sendOtpToUserPhone: (email: string, password: string, forceResend?: boolean) => Promise<string>;
  verifyOtp: (token: string, email?: string) => Promise<void>;
  verifyOtpForNewUser: (token: string, email?: string) => Promise<void>;
  checkPendingOtp: (email: string) => Promise<boolean>;
  acceptTerms: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  verifyPasswordResetToken: (token: string) => Promise<boolean>;
  deleteAccount: () => Promise<void>;
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
      termsAccepted: false,
      needsTermsAcceptance: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSession: (session) => set({ session }),

      setLoading: (loading) => set({ loading }),

      setTermsAccepted: (accepted) => set({ termsAccepted: accepted }),

      signIn: async (email: string, password: string) => {
        set({ loading: true });
        try {
          console.log('🔐 Attempting login with:', email);

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            console.error('❌ Login error:', error);
            // Provide user-friendly error messages
            if (error.message.includes('Invalid login credentials')) {
              throw new Error('Invalid email or password.\nPlease check your credentials and try again.');
            } else if (error.message.includes('Email not confirmed')) {
              throw new Error('Email not verified.\nPlease check your inbox and verify your email address.');
            }
            throw new Error(error.message || 'Login failed.\nPlease try again.');
          }

          if (!data.user) {
            throw new Error('Login failed - no user data received');
          }

          // Check user's account verification status
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('account_verified')
            .eq('id', data.user.id)
            .single();

          console.log('🔍 User data from DB:', userData);

          if (userError) {
            console.error('❌ Failed to check user verification status:', userError);
            // Don't block login, just proceed
          }

          const accountVerified = userData && userData.account_verified;
          const needsTerms = !data.user?.user_metadata?.terms_accepted;

          console.log('✅ Login successful:', data.user.email);
          console.log('🔍 Account verified:', accountVerified);
          console.log('🔍 Needs terms:', needsTerms);

          // ALWAYS require OTP for every login (2FA)
          const otpType = accountVerified ? 'login' : 'registration';
          console.log(`🚫 ${otpType.toUpperCase()} OTP required - 2FA enabled!`);
          // Keep session for Edge Function to use
          set({ 
            loading: false,
            user: data.user,
            session: data.session,
            isAuthenticated: false // Not authenticated until OTP verified
          });
          throw new Error('OTP_VERIFICATION_REQUIRED');

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
            needsTermsAcceptance: true, // New users need to accept terms
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      signUpWithPhone: async (
        email: string,
        password: string,
        fullName: string,
        phone: string
      ) => {
        set({ loading: true });
        let userId: string | null = null;
        
        try {
          console.log('📧 Creating new user account:', email);

          // Create user account with email confirmation disabled
          const { data: authData, error: authError } =
            await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: fullName,
                  terms_accepted: true,
                  terms_accepted_at: new Date().toISOString(),
                },
                emailRedirectTo: undefined, // No email confirmation
              },
            });

          if (authError) {
            console.error('❌ Auth signup error:', authError);
            // Provide user-friendly error messages
            if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
              throw new Error('This email is already registered.\nPlease login instead.');
            } else if (authError.message.includes('Database error')) {
              throw new Error('This email is already registered.\nPlease login to continue.');
            }
            throw new Error(authError.message || 'Registration failed.\nPlease try again.');
          }

          if (!authData.user) {
            throw new Error('Failed to create user account');
          }

          userId = authData.user.id;
          console.log('✅ User created successfully:', userId);
          
          // Keep user signed in - don't sign out after registration
          console.log('✅ User staying signed in for OTP verification');

          // Send REGISTRATION OTP using unified function
          // Note: Edge Function handles checking both auth.users and public.users
          const response = await supabase.functions.invoke('manage-otp', {
            body: { 
              action: 'send',
              email,
            },
          });

          if (response.error) {
            console.error('❌ Send OTP error:', response.error);
            // User will remain in system with account_verified = false
            // They can login again and complete verification
            console.log('⚠️ OTP sending failed - user remains unverified');
            throw new Error('Failed to send verification code. You can try again by logging in.');
          }

          const data = response.data;
          
          if (!data?.success) {
            // User will remain in system with account_verified = false
            // They can login again and complete verification
            console.log('⚠️ OTP sending failed - user remains unverified');
            
            // Use error message from server
            throw new Error(data?.error || 'Failed to send verification code. You can try again by logging in.');
          }

          console.log(`✅ ${data.type} OTP sent to:`, data.email);
          console.log(`⏰ Code expires in ${data.expiresIn} seconds`);
          
          // Don't mark as authenticated yet - wait for OTP verification
          // But keep user and session for after OTP is verified
          set({
            loading: false,
            user: authData.user,
            session: authData.session,
            isAuthenticated: false,
            needsTermsAcceptance: false,
          });

          return data.email;
        } catch (error: any) {
          console.error('❌ Registration failed:', error);
          
          // Sign out so user will need to login again
          // User remains in database with account_verified = false
          // On next login, they'll be prompted for OTP verification
          try {
            await supabase.auth.signOut();
            console.log('🚪 User signed out - can login again to complete verification');
          } catch (signOutError) {
            console.error('Failed to sign out after error:', signOutError);
          }
          
          set({ 
            loading: false,
            user: null,
            session: null,
            isAuthenticated: false
          });
          throw error;
        }
      },

      sendOtpToUserPhone: async (email: string, password: string, forceResend: boolean = false) => {
        set({ loading: true });
        try {
          console.log('📧 Sending OTP to user:', email, forceResend ? '(Force Resend)' : '');

          // Use unified OTP function
          const response = await supabase.functions.invoke('manage-otp', {
            body: { 
              action: 'send',
              email,
              force_resend: forceResend,
            },
          });

          if (response.error) {
            console.error('❌ Send OTP error:', response.error);
            throw new Error('Failed to send verification code. Please try again later.');
          }

          const data = response.data;
          
          if (!data?.success) {
            // Use error message from server
            throw new Error(data?.error || 'Failed to send verification code. Please try again later.');
          }

          console.log(`✅ OTP sent successfully - Type: ${data.type}`);
          
          // Don't mark as authenticated - user must verify OTP first
          // Keep user and session for Edge Function use
          set({ 
            loading: false,
            isAuthenticated: false
          });

          return data.email;
        } catch (error: any) {
          console.error('❌ Send OTP error:', error);
          set({ loading: false });
          throw error;
        }
      },

      verifyOtp: async (token: string, email?: string) => {
        set({ loading: true });
        try {
          console.log('🔐 Verifying OTP code');
          
          // Get email from parameter or current user
          const userEmail = email || get().user?.email;
          if (!userEmail) {
            throw new Error('Email is required for OTP verification');
          }
          // Use unified OTP function
          const response = await supabase.functions.invoke('manage-otp', {
            body: { 
              action: 'verify',
              email: userEmail,
              otp: token
            },
          });

          if (response.error) {
            console.error('❌ Verify OTP error:', response.error);
            throw new Error('Code verification failed. Please try again.');
          }

          const data = response.data;

          if (!data?.success) {
            // Use error message from server
            throw new Error(data?.error || 'Code verification failed. Please try again.');
          }

          console.log('✅ OTP verified successfully');
          
          // After successful OTP verification, sign in the user
          // Re-authenticate with password (we should have it in context)
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            set({ 
              loading: false,
              user: session.user,
              session: session,
              isAuthenticated: true 
            });
            console.log('✅ User marked as authenticated after OTP verification');
          } else {
            set({ loading: false });
          }
        } catch (error: any) {
          console.error('❌ Verify OTP caught error:', error);
          set({ loading: false });
          throw error;
        }
      },

      verifyOtpForNewUser: async (token: string, email?: string) => {
        set({ loading: true });
        try {
          console.log('🔐 Verifying REGISTRATION OTP code');
          
          // Get email from parameter or current user
          const userEmail = email || get().user?.email;
          if (!userEmail) {
            throw new Error('Email is required for OTP verification');
          }

          // Use unified OTP function
          const response = await supabase.functions.invoke('manage-otp', {
            body: { 
              action: 'verify',
              email: userEmail,
              otp: token
            },
          });

          if (response.error) {
            console.error('❌ Verify OTP error:', response.error);
            throw new Error('Code verification failed. Please try again.');
          }

          const data = response.data;

          if (!data?.success) {
            // Use error message from server
            throw new Error(data?.error || 'Code verification failed. Please try again.');
          }

          console.log('✅ REGISTRATION OTP verified successfully');
          
          // After successful registration OTP, get current session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            set({ 
              loading: false,
              user: session.user,
              session: session,
              isAuthenticated: true 
            });
            console.log('✅ New user authenticated after phone verification');
          } else {
            set({ loading: false });
          }
        } catch (error: any) {
          console.error('❌ Verify registration OTP error:', error);
          set({ loading: false });
          throw error;
        }
      },

      checkPendingOtp: async (email: string) => {
        try {
          console.log('🔍 Checking for pending OTP for:', email);

          // Get user ID and account verification status
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, account_verified')
            .eq('email', email)
            .single();

          if (userError || !userData) {
            console.log('❌ User not found for email:', email);
            return false;
          }

          // Check if user has pending OTP (either stage)
          const { data: authStatus, error: authError } = await supabase
            .from('otp_verifications')
            .select('current_stage, registration_verified, login_verified, current_otp_expires_at')
            .eq('user_id', userData.id)
            .single();

          if (authError || !authStatus) {
            console.log('❌ No auth status found');
            return false;
          }

          // Has pending OTP if:
          // 1. Registration not completed, OR
          // 2. Has active OTP that's not expired
          const hasPendingOtp = 
            !authStatus.registration_verified || 
            (authStatus.current_otp_expires_at && new Date(authStatus.current_otp_expires_at) > new Date());
          
          console.log('🔍 Pending OTP found:', hasPendingOtp);
          console.log(`📊 Status: stage=${authStatus.current_stage}, reg_verified=${authStatus.registration_verified}, login_verified=${authStatus.login_verified}`);
          
          return hasPendingOtp;
        } catch (error: any) {
          console.error('❌ Check pending OTP error:', error);
          return false;
        }
      },

      acceptTerms: async () => {
        set({ loading: true });
        try {
          console.log('📋 Accepting terms and conditions...');

          const { error } = await supabase.auth.updateUser({
            data: {
              terms_accepted: true,
              terms_accepted_at: new Date().toISOString(),
            },
          });

          if (error) throw error;

          set({
            termsAccepted: true,
            needsTermsAcceptance: false,
            loading: false,
          });

          console.log('✅ Terms accepted successfully');
        } catch (error: any) {
          console.error('❌ Accept terms error:', error);
          set({ loading: false });
          throw error;
        }
      },

      resetPassword: async (email: string) => {
        set({ loading: true });
        try {
          console.log('🔐 Sending password reset email to:', email);

          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'genie://reset-password/?email=' + encodeURIComponent(email),
          });

          if (error) throw error;

          set({ loading: false });
          console.log('✅ Password reset email sent successfully');
        } catch (error: any) {
          console.error('❌ Reset password error:', error);
          set({ loading: false });
          throw error;
        }
      },

      updatePassword: async (newPassword: string) => {
        set({ loading: true });
        try {
          console.log('🔐 Updating password...');

          const { error } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (error) throw error;

          set({ loading: false });
          console.log('✅ Password updated successfully');
        } catch (error: any) {
          console.error('❌ Update password error:', error);
          set({ loading: false });
          throw error;
        }
      },

      verifyPasswordResetToken: async (token: string) => {
        try {
          console.log('🔐 Verifying password reset token...');

          // Verify the token by trying to get the user session
          const { data, error } = await supabase.auth.getUser(token);
          
          if (error) {
            console.log('❌ Token verification failed:', error.message);
            return false;
          }

          if (data.user) {
            console.log('✅ Token is valid, user can reset password');
            return true;
          }

          return false;
        } catch (error: any) {
          console.error('❌ Token verification error:', error);
          return false;
        }
      },

      deleteAccount: async () => {
        set({ loading: true });
        try {
          console.log('🗑️ Deleting user account...');

          const currentUser = get().user;
          if (!currentUser?.id) {
            throw new Error('No user logged in');
          }

          // Call Edge Function to delete user (requires service role)
          const response = await supabase.functions.invoke('delete-user-account', {
            body: { userId: currentUser.id },
          });

          if (response.error) {
            throw new Error(response.error.message || 'Failed to delete account');
          }

          const data = response.data;
          if (!data?.success) {
            throw new Error(data?.error || 'Failed to delete account');
          }

          console.log('✅ Account deleted successfully');

          // Clear all local state
          dataLoadingService.clearCache();
          await AsyncStorage.removeItem('genie-auth-store');

          set({
            user: null,
            session: null,
            isAuthenticated: false,
            loading: false,
          });

          console.log('✅ Account deletion complete');
        } catch (error: any) {
          console.error('❌ Delete account error:', error);
          set({ loading: false });
          throw error;
        }
      },

      signOut: async () => {
        set({ loading: true });
        try {
          console.log('🔐 Signing out...');

          // Reset login_verified before signing out
          const currentUser = get().user;
          if (currentUser?.id) {
            console.log('🔄 Resetting login verification for next login...');
            await supabase
              .from('otp_verifications')
              .update({
                login_verified: false,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', currentUser.id);
          }

          // Clear all auth state BEFORE calling signOut
          console.log('🧹 Clearing auth state...');
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            loading: false,
            termsAccepted: false,
            needsTermsAcceptance: false,
          });
          
          // Clear pre-loaded data cache
          dataLoadingService.clearCache();

          // Force clear persisted store
          try {
            await AsyncStorage.removeItem('genie-auth-store');
            console.log('🧹 Cleared persisted auth store');
          } catch (err) {
            console.log('⚠️ Failed to clear persisted auth store:', err);
          }

          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('⚠️ SignOut error (continuing anyway):', error);
          }

          console.log('✅ Auth state cleared');

          // Verify state is cleared
          const currentState = get();
          console.log('🔍 Final auth state after signOut:', {
            isAuthenticated: currentState.isAuthenticated,
            user: !!currentState.user,
            session: !!currentState.session,
            loading: currentState.loading
          });

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
                await supabase.auth.signOut({ scope: 'local' } as any);
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
              console.log('✅ Persisted session valid, checking if user exists in database...');
              
              // Check if user exists in public.users table
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, account_verified')
                .eq('id', session.user.id)
                .single();

              if (userError || !userData) {
                console.log('❌ User not found in database, clearing session...');
                // User was deleted from database, clear everything
                await supabase.auth.signOut();
                await clearSupabaseAuthStorage();
                set({
                  user: null,
                  session: null,
                  isAuthenticated: false,
                  loading: false,
                });
                // Clear persisted store
                try {
                  await AsyncStorage.removeItem('genie-auth-store');
                  console.log('🧹 Cleared persisted auth store');
                } catch {}
                return;
              }

              // Check login_verified status in otp_verifications table
              const { data: authStatus } = await supabase
                .from('otp_verifications')
                .select('login_verified')
                .eq('user_id', session.user.id)
                .single();
              
              const isLoggedIn = authStatus?.login_verified || false;
              
              console.log('✅ User exists in database, restoring session...');
              console.log(`📱 Account verified: ${userData.account_verified}`);
              console.log(`🔐 Login verified: ${isLoggedIn}`);
              
              set({
                user: session.user,
                session,
                isAuthenticated: isLoggedIn, // Only authenticated if login_verified = true
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
                await supabase.auth.signOut({ scope: 'local' } as any);
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

            let isLoggedIn = false;
            
            if (session?.user) {
              // Check if user exists in public.users table
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, account_verified')
                .eq('id', session.user.id)
                .single();

              if (userError || !userData) {
                console.log('❌ User not found in database, clearing session...');
                // User was deleted from database, clear everything
                await supabase.auth.signOut();
                await clearSupabaseAuthStorage();
                set({
                  user: null,
                  session: null,
                  isAuthenticated: false,
                  loading: false,
                });
                // Clear persisted store
                try {
                  await AsyncStorage.removeItem('genie-auth-store');
                  console.log('🧹 Cleared persisted auth store');
                } catch {}
                return;
              }

              // Check login_verified status in otp_verifications table
              const { data: authStatus } = await supabase
                .from('otp_verifications')
                .select('login_verified')
                .eq('user_id', session.user.id)
                .single();
              
              isLoggedIn = authStatus?.login_verified || false;
              
              console.log('✅ User exists in database, setting session...');
              console.log(`📱 Account verified: ${userData.account_verified}`);
              console.log(`🔐 Login verified: ${isLoggedIn}`);
            }

            set({
              user: session?.user || null,
              session,
              isAuthenticated: isLoggedIn, // Only authenticated if login_verified = true
              loading: false,
            });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state changed:', event, !!session?.user);

            // Skip heavy checks during initial auth state changes
            // The initialize function already handles authentication properly
            if (event === 'INITIAL_SESSION') {
              console.log('⏩ Skipping INITIAL_SESSION - already initialized');
              return;
            }

            if (session?.user) {
              // Only check login_verified for actual sign-in events, not registration
              if (event === 'SIGNED_IN') {
                // Check if user has verified login in current session
                const { data: authStatus } = await supabase
                  .from('otp_verifications')
                  .select('login_verified')
                  .eq('user_id', session.user.id)
                  .single();
                
                const isLoggedIn = authStatus?.login_verified || false;
                console.log(`🔐 User signed in - login_verified: ${isLoggedIn}`);
                
                set({
                  user: session.user,
                  session,
                  isAuthenticated: isLoggedIn, // Only authenticated if login_verified = true
                });
              } else if (event === 'TOKEN_REFRESHED') {
                // Token was refreshed - update session but keep auth state
                console.log('🔄 Token refreshed - updating session');
                set({
                  session,
                  user: session.user,
                });
              } else {
                // For other events (like USER_UPDATED), don't change auth state
                console.log('⏩ Auth event ignored - keeping current state');
              }
            } else {
              // User signed out (automatically or manually)
              console.log('🚪 User signed out - clearing state and resetting login verification');
              
              // Get the current user before clearing state
              const currentUser = get().user;
              
              // Reset login_verified when user is signed out
              if (currentUser?.id) {
                console.log('🔄 Resetting login_verified for user:', currentUser.id);
                await supabase
                  .from('otp_verifications')
                  .update({
                    login_verified: false,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('user_id', currentUser.id);
              }
              
              set({
                user: null,
                session: null,
                isAuthenticated: false,
              });
            }
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
        // DON'T persist isAuthenticated - always require OTP verification
        user: state.user,
        session: state.session,
        termsAccepted: state.termsAccepted,
        needsTermsAcceptance: state.needsTermsAcceptance,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔐 Rehydrating auth store:', !!state?.isAuthenticated);
        // Don't auto-initialize here, let App.tsx handle it
        return state;
      },
    }
  )
);
