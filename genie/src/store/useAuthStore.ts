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
  sendOtpToUserPhone: (email: string, password: string) => Promise<string>;
  verifyOtp: (phone: string, token: string, email?: string) => Promise<void>;
  verifyOtpForNewUser: (phone: string, token: string, email?: string) => Promise<void>;
  checkPendingOtp: (email: string) => Promise<boolean>;
  acceptTerms: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  verifyPasswordResetToken: (token: string) => Promise<boolean>;
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
            throw error;
          }

          if (!data.user) {
            throw new Error('Login failed - no user data received');
          }

          // Check user's phone status
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('phone_verified, phone_number')
            .eq('id', data.user.id)
            .single();

          console.log('🔍 User data from DB:', userData);

          if (userError) {
            console.error('❌ Failed to check user verification status:', userError);
            // Don't block login, just proceed
          }

          const hasPhoneNumber = userData && userData.phone_number;
          const phoneVerified = userData && userData.phone_verified;
          const needsTerms = !data.user?.user_metadata?.terms_accepted;

          console.log('✅ Login successful:', data.user.email);
          console.log('🔍 Phone number:', userData?.phone_number);
          console.log('🔍 Phone verified:', phoneVerified);
          console.log('🔍 Needs terms:', needsTerms);

          // If user has phone but NOT verified → REGISTRATION OTP required
          if (hasPhoneNumber && !phoneVerified) {
            console.log('🚫 REGISTRATION OTP required - phone not verified!');
            // Keep session for Edge Function to use
            set({ 
              loading: false,
              user: data.user,
              session: data.session,
              isAuthenticated: false // Not authenticated until OTP verified
            });
            throw new Error('PHONE_VERIFICATION_REQUIRED');
          }

          // If user has phone AND verified → LOGIN OTP required (2FA)
          if (hasPhoneNumber && phoneVerified) {
            console.log('🚫 LOGIN OTP required - 2FA enabled!');
            // Keep session for Edge Function to use
            set({ 
              loading: false,
              user: data.user,
              session: data.session,
              isAuthenticated: false // Not authenticated until OTP verified
            });
            throw new Error('PHONE_VERIFICATION_REQUIRED');
          }

          console.log('✅ No phone number - allowing direct login');

          // Only allow login without OTP if user has no phone number
          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            loading: false,
            needsTermsAcceptance: needsTerms,
          });

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
        try {
          console.log('📱 Creating new user account:', email);

          // Create user account with email confirmation disabled
          const { data: authData, error: authError } =
            await supabase.auth.signUp({
              email,
              password,
              phone, // Save phone directly in auth.users.phone field
              options: {
                data: {
                  full_name: fullName,
                  phone_number: phone,
                  terms_accepted: true,
                  terms_accepted_at: new Date().toISOString(),
                },
                emailRedirectTo: undefined, // No email confirmation
              },
            });

          if (authError) {
            console.error('❌ Auth signup error:', authError);
            throw authError;
          }

          if (!authData.user) {
            throw new Error('Failed to create user account');
          }

          console.log('✅ User created successfully:', authData.user.id);

          // Wait a moment for the trigger to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Keep user signed in - don't sign out after registration
          console.log('✅ User staying signed in for OTP verification');

          // Send REGISTRATION OTP using unified function
          const response = await supabase.functions.invoke('manage-otp', {
            body: { 
              action: 'send',
              email,
              phone
            },
          });

          if (response.error) {
            console.error('❌ Send OTP error:', response.error);
            throw new Error(response.error.message || 'Failed to send verification code');
          }

          const data = response.data;
          
          if (!data?.success) {
            throw new Error(data?.error || 'Failed to send verification code');
          }

          console.log(`✅ ${data.type} OTP sent to:`, data.phone);
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

          return data.phone;
        } catch (error: any) {
          console.error('❌ Registration failed:', error);
          set({ loading: false });
          throw error;
        }
      },

      sendOtpToUserPhone: async (email: string, password: string) => {
        set({ loading: true });
        try {
          console.log('📱 Sending OTP to user:', email);

          // Use unified OTP function (no need to send password - already validated)
          const response = await supabase.functions.invoke('manage-otp', {
            body: { 
              action: 'send',
              email
              // Password not needed - signIn already validated credentials
            },
          });

          if (response.error) {
            console.error('❌ Send OTP error:', response.error);
            throw new Error(response.error.message || 'Failed to send OTP');
          }

          const data = response.data;
          
          if (!data?.success) {
            throw new Error(data?.error || 'Failed to send OTP');
          }

          console.log(`✅ OTP sent successfully - Type: ${data.type}`);
          
          // Wait for OTP to be saved in database before returning
          // This ensures UI updates immediately without race conditions
          let otpFound = false;
          let attempts = 0;
          const maxAttempts = 10; // 10 attempts × 200ms = 2 seconds max wait
          
          while (!otpFound && attempts < maxAttempts) {
            attempts++;
            const { data: otpData } = await supabase
              .from('otp_verifications')
              .select('id')
              .eq('user_id', get().user?.id)
              .eq('verified', false)
              .gt('expires_at', new Date().toISOString())
              .limit(1);
            
            if (otpData && otpData.length > 0) {
              otpFound = true;
              console.log('✅ OTP confirmed in database');
            } else {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          if (!otpFound) {
            console.warn('⚠️ OTP not found in database after retries, but proceeding anyway');
          }
          
          // Don't mark as authenticated - user must verify OTP first
          // Keep user and session for Edge Function use
          set({ 
            loading: false,
            isAuthenticated: false
          });

          return data.phone;
        } catch (error: any) {
          console.error('❌ Send OTP error:', error);
          set({ loading: false });
          throw error;
        }
      },

      verifyOtp: async (phone: string, token: string, email?: string) => {
        set({ loading: true });
        try {
          console.log('📱 Verifying OTP for:', phone);
          
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
              phone,
              otp: token
            },
          });

          if (response.error) {
            console.error('❌ Verify OTP error:', response.error);
            throw new Error(response.error.message || 'Failed to verify OTP');
          }

          const data = response.data;

          if (!data?.success) {
            throw new Error(data?.error || 'OTP verification failed');
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

      verifyOtpForNewUser: async (phone: string, token: string, email?: string) => {
        set({ loading: true });
        try {
          console.log('📱 Verifying REGISTRATION OTP:', phone);
          
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
              phone,
              otp: token
            },
          });

          if (response.error) {
            console.error('❌ Verify OTP error:', response.error);
            throw new Error(response.error.message || 'Failed to verify OTP');
          }

          const data = response.data;

          if (!data?.success) {
            throw new Error(data?.error || 'OTP verification failed');
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

          // Get user ID and phone verification status
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, phone_verified')
            .eq('email', email)
            .single();

          if (userError || !userData) {
            console.log('❌ User not found for email:', email);
            return false;
          }

          // ONLY check for pending OTP if phone is NOT verified (registration OTP)
          // If phone is verified, user can create new login OTPs
          if (userData.phone_verified) {
            console.log('✅ Phone already verified - no pending registration OTP');
            return false;
          }

          // Check if there's a pending registration OTP for this user
          const { data: otpData, error: otpError } = await supabase
            .from('otp_verifications')
            .select('id, expires_at, verified')
            .eq('user_id', userData.id)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

          if (otpError) {
            console.error('❌ Error checking pending OTP:', otpError);
            return false;
          }

          const hasPendingRegistrationOtp = otpData && otpData.length > 0;
          console.log('🔍 Pending REGISTRATION OTP found:', hasPendingRegistrationOtp);
          
          return hasPendingRegistrationOtp;
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

      signOut: async () => {
        set({ loading: true });
        try {
          console.log('🔐 Signing out...');

          const { error } = await supabase.auth.signOut();
          if (error) throw error;

          // Clear all auth state
          console.log('🧹 Clearing auth state...');
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            loading: false,
          });
          console.log('✅ Auth state cleared');

          // Clear pre-loaded data cache
          dataLoadingService.clearCache();

          // Force clear persisted store
          try {
            await AsyncStorage.removeItem('genie-auth-store');
            console.log('🧹 Cleared persisted auth store');
          } catch (err) {
            console.log('⚠️ Failed to clear persisted auth store:', err);
          }

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
                .select('id')
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

              console.log('✅ User exists in database, restoring session...');
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

            if (session?.user) {
              // Check if user exists in public.users table
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
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

              console.log('✅ User exists in database, setting session...');
            }

            set({
              user: session?.user || null,
              session,
              isAuthenticated: !!session?.user,
              loading: false,
            });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state changed:', event, !!session?.user);

            // If user signed in, check if they have pending OTP before marking as authenticated
            if (session?.user) {
              // Check for any pending OTP (registration or login)
              const { data: pendingOtp } = await supabase
                .from('otp_verifications')
                .select('id, type')
                .eq('user_id', session.user.id)
                .eq('verified', false)
                .gt('expires_at', new Date().toISOString())
                .limit(1);

              if (pendingOtp && pendingOtp.length > 0) {
                console.log(`🔐 User has pending ${pendingOtp[0].type} OTP - NOT authenticated yet`);
                set({
                  user: session.user,
                  session,
                  isAuthenticated: false, // Not authenticated until OTP verified
                });
              } else {
                console.log('🔐 No pending OTP - user is authenticated');
                set({
                  user: session.user,
                  session,
                  isAuthenticated: true,
                });
              }
            } else {
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
        // Persist user and session data for proper session restoration
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
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
