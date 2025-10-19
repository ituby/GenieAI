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
  verifyOtp: (phone: string, token: string) => Promise<void>;
  verifyOtpForNewUser: (phone: string, token: string) => Promise<void>;
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
          console.log('🔍 User metadata:', data.user?.user_metadata);
          console.log('🔍 Terms accepted:', data.user?.user_metadata?.terms_accepted);

          const needsTerms = !data.user?.user_metadata?.terms_accepted;
          console.log('🔍 Needs terms acceptance:', needsTerms);

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            loading: false,
            needsTermsAcceptance: needsTerms,
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
          console.log('📱 Signing up with phone:', phone);

          // Create user account without auto-confirming
          const { data: authData, error: authError } =
            await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: fullName,
                  phone_number: phone,
                  terms_accepted: true, // Mark terms as accepted
                  terms_accepted_at: new Date().toISOString(),
                },
                emailRedirectTo: undefined, // Don't send confirmation email
              },
            });

          if (authError) throw authError;

          if (!authData.user) {
            throw new Error('Failed to create user account');
          }

          // Sign out immediately after sign up to prevent auto-login
          await supabase.auth.signOut();

          // The user record is automatically created by the trigger
          // We just need to update the phone number if it wasn't set
          const { error: userError } = await supabase
            .from('users')
            .update({ phone_number: phone })
            .eq('id', authData.user.id);

          if (userError) {
            console.error('❌ Failed to update user phone:', userError);
            throw new Error('Failed to save user profile');
          }

          console.log('✅ User created with phone number');

          // Send OTP to the phone number using the new user's email and phone
          const response = await supabase.functions.invoke('send-otp-registration', {
            body: { email, phone },
          });

          if (response.error) {
            console.error('❌ Send OTP error:', response.error);
            throw new Error(response.error.message || 'Failed to send OTP');
          }

          const data = response.data;
          if (data?.error) {
            throw new Error(data.error);
          }

          if (!data?.phone) {
            throw new Error('Phone number not found in system');
          }

          console.log('✅ OTP sent successfully to:', data.phone);
          set({
            loading: false,
            isAuthenticated: false, // User is not authenticated until OTP is verified
            needsTermsAcceptance: false, // Don't show terms screen yet
          });

          return data.phone;
        } catch (error: any) {
          console.error('❌ Sign up with phone error:', error);
          set({ loading: false });
          throw error;
        }
      },

      sendOtpToUserPhone: async (email: string, password: string) => {
        set({ loading: true });
        try {
          console.log('📱 Sending OTP to user phone for:', email);

          // Call our Edge Function to validate credentials and send OTP
          const response = await supabase.functions.invoke('send-otp-sms', {
            body: { email, password },
          });

          console.log(
            '📱 Function response:',
            JSON.stringify(response, null, 2)
          );

          if (response.error) {
            console.error('❌ Send OTP error:', response.error);

            // Try to get more details from the response
            if (response.error.context?._bodyInit) {
              try {
                const bodyText = await new Response(
                  response.error.context._bodyBlob
                ).text();
                console.error('❌ Response body:', bodyText);
                const bodyJson = JSON.parse(bodyText);
                throw new Error(bodyJson.error || 'Failed to send OTP');
              } catch (parseError) {
                console.error('❌ Could not parse error body:', parseError);
              }
            }

            throw new Error(response.error.message || 'Failed to send OTP');
          }

          const data = response.data;

          if (data?.error) {
            console.error('❌ Function returned error:', data.error);
            throw new Error(data.error);
          }

          if (!data?.phone) {
            console.error('❌ No phone in response:', data);
            throw new Error('Phone number not found in system');
          }

          console.log('✅ OTP sent successfully to:', data.phone);
          set({ loading: false });

          return data.phone;
        } catch (error: any) {
          console.error('❌ Send OTP error:', error);
          set({ loading: false });
          throw error;
        }
      },

      verifyOtp: async (phone: string, token: string) => {
        set({ loading: true });
        try {
          console.log('📱 Verifying OTP for:', phone);
          console.log('📱 Phone type:', typeof phone, 'length:', phone?.length);
          console.log('📱 Token:', token);
          console.log('📱 Token type:', typeof token, 'length:', token?.length);
          console.log('📱 Token as string:', String(token));

          const response = await supabase.functions.invoke('verify-otp', {
            body: { phone, otp: token },
          });

          console.log('📱 Response status:', response.error?.context?.status);
          console.log('📱 Full response:', JSON.stringify(response, null, 2));

          if (response.error) {
            console.error('❌ Verify OTP error:', response.error);

            // Try to extract the actual error message from the response
            if (response.error.context?._bodyBlob) {
              try {
                const bodyText = await new Response(
                  response.error.context._bodyBlob
                ).text();
                console.error('❌ Error body text:', bodyText);
                try {
                  const bodyJson = JSON.parse(bodyText);
                  console.error('❌ Error details:', bodyJson);
                  throw new Error(
                    bodyJson.error || bodyJson.message || 'Failed to verify OTP'
                  );
                } catch (parseErr) {
                  throw new Error(bodyText || 'Failed to verify OTP');
                }
              } catch (readErr) {
                console.error('❌ Could not read error body');
              }
            }

            throw new Error(response.error.message || 'Failed to verify OTP');
          }

          const data = response.data;

          if (data?.error) {
            console.error('❌ Function returned error:', data.error);
            throw new Error(data.error);
          }

          if (!data?.success) {
            console.error('❌ Verification failed, data:', data);
            throw new Error('OTP verification failed');
          }

          console.log('✅ OTP verified successfully for user:', data.userId);
          set({ loading: false });
        } catch (error: any) {
          console.error('❌ Verify OTP caught error:', error);
          set({ loading: false });
          throw error;
        }
      },

      verifyOtpForNewUser: async (phone: string, token: string) => {
        set({ loading: true });
        try {
          console.log('📱 Verifying OTP for new user:', phone);

          const response = await supabase.functions.invoke('verify-otp', {
            body: { phone, otp: token },
          });

          if (response.error) {
            console.error('❌ Verify OTP error:', response.error);
            throw new Error(response.error.message || 'Failed to verify OTP');
          }

          const data = response.data;

          if (data?.error) {
            console.error('❌ Function returned error:', data.error);
            throw new Error(data.error);
          }

          if (!data?.success) {
            console.error('❌ Verification failed, data:', data);
            throw new Error('OTP verification failed');
          }

          console.log('✅ OTP verified successfully for new user:', data.userId);
          
          // Mark user as phone verified in the database
          const { error: updateError } = await supabase
            .from('users')
            .update({ phone_verified: true })
            .eq('id', data.userId);

          if (updateError) {
            console.error('❌ Failed to mark phone as verified:', updateError);
            throw new Error('Failed to complete phone verification');
          }

          // Also update the auth user metadata to mark terms as accepted
          const { error: authUpdateError } = await supabase.auth.updateUser({
            data: {
              terms_accepted: true,
              terms_accepted_at: new Date().toISOString(),
            },
          });

          if (authUpdateError) {
            console.error('❌ Failed to update auth user terms status:', authUpdateError);
            // Don't throw error here, just log it
          }

          console.log('✅ Phone verification completed for new user');
          set({ loading: false });
        } catch (error: any) {
          console.error('❌ Verify OTP for new user error:', error);
          set({ loading: false });
          throw error;
        }
      },

      checkPendingOtp: async (email: string) => {
        try {
          console.log('🔍 Checking for pending OTP for:', email);

          // Get user ID from email
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

          if (userError || !userData) {
            console.log('❌ User not found for email:', email);
            return false;
          }

          // Check if there's a pending OTP for this user
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

          const hasPendingOtp = otpData && otpData.length > 0;
          console.log('🔍 Pending OTP found:', hasPendingOtp);
          
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
