import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import Constants from 'expo-constants';
import * as Localization from 'expo-localization';

// Helper function to get device timezone
const getDeviceTimezone = (): string => {
  try {
    // Get timezone from Expo Localization - use getCalendars() or getLocales()
    const calendars = Localization.getCalendars();
    const timezone = calendars?.[0]?.timeZone;
    console.log('🌍 Device timezone:', timezone);
    return timezone || 'UTC';
  } catch (error) {
    console.error('❌ Error getting device timezone:', error);
    return 'UTC';
  }
};

// Helper function to update user timezone
const updateUserTimezone = async (userId: string) => {
  try {
    const deviceTimezone = getDeviceTimezone();
    console.log(`🌍 Updating user timezone to: ${deviceTimezone}`);
    
    const { error } = await supabase
      .from('users')
      .update({ 
        timezone: deviceTimezone,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error updating timezone:', error);
    } else {
      console.log('✅ Timezone updated successfully');
    }
  } catch (error) {
    console.error('❌ Error in updateUserTimezone:', error);
  }
};

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
  // New password reset with SMS
  sendPasswordResetOtp: (phoneNumber: string) => Promise<{ success: boolean; phone?: string; email?: string; error?: string }>;
  verifyPasswordResetOtp: (email: string, otp: string) => Promise<{ success: boolean; resetToken?: string; error?: string }>;
  resetPasswordWithToken: (resetToken: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
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
          
          // Clear any existing session/cache before signup
          console.log('🧹 Clearing any existing session before signup...');
          await supabase.auth.signOut();

          // Create user account with email confirmation disabled
          const { data: authData, error: authError } =
            await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: fullName,
                  phone: phone, // Save phone in metadata for trigger
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
          
          // Note: User should already be signed in (session created by signIn function)
          // This function just sends the OTP

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
          
          // Loading is done - user/session already set by signIn
          set({ 
            loading: false,
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
          
          // Get current state
          const currentState = get();
          
          // Get email from parameter or current user
          const userEmail = email || currentState.user?.email;
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
          
          // Use existing session from store (set by signIn)
          const existingSession = currentState.session;
          const existingUser = currentState.user;
          
          if (existingSession?.user || existingUser) {
            const user = existingSession?.user || existingUser;
            
            if (user) {
              // Update timezone on successful login
              await updateUserTimezone(user.id);
              
              set({ 
                loading: false,
                user: user,
                session: existingSession,
                isAuthenticated: true 
              });
              console.log('✅ User marked as authenticated after OTP verification');
            } else {
              console.error('❌ No user found in session');
              set({ loading: false });
              throw new Error('User not found. Please try logging in again.');
            }
          } else {
            // Fallback: try to get fresh session
            console.log('⚠️ No existing session in store, fetching fresh session...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await updateUserTimezone(session.user.id);
              
              set({ 
                loading: false,
                user: session.user,
                session: session,
                isAuthenticated: true 
              });
              console.log('✅ User marked as authenticated after OTP verification (fresh session)');
            } else {
              console.error('❌ No session found after OTP verification');
              set({ loading: false });
              throw new Error('Session not found. Please try logging in again.');
            }
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
          
          // Get current state
          const currentState = get();
          
          // Get email from parameter or current user
          const userEmail = email || currentState.user?.email;
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
          
          // Use existing session from store (set by signUpWithPhone)
          const existingSession = currentState.session;
          const existingUser = currentState.user;
          
          if (existingSession?.user || existingUser) {
            const user = existingSession?.user || existingUser;
            
            if (user) {
              // Update timezone on successful registration
              await updateUserTimezone(user.id);
              
              set({ 
                loading: false,
                user: user,
                session: existingSession,
                isAuthenticated: true 
              });
              console.log('✅ New user authenticated after phone verification');
            } else {
              console.error('❌ No user found in session');
              set({ loading: false });
              throw new Error('User not found. Please try registering again.');
            }
          } else {
            // Fallback: try to get fresh session
            console.log('⚠️ No existing session in store, fetching fresh session...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await updateUserTimezone(session.user.id);
              
              set({ 
                loading: false,
                user: session.user,
                session: session,
                isAuthenticated: true 
              });
              console.log('✅ New user authenticated after phone verification (fresh session)');
            } else {
              console.error('❌ No session found after OTP verification');
              set({ loading: false });
              throw new Error('Session not found. Please try logging in again.');
            }
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

          // Has pending OTP if registration not completed (account not verified)
          // If registration is verified, they can access the app even if there's a login OTP pending
          const hasPendingOtp = !authStatus.registration_verified;
          
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

      // New: Send password reset OTP via SMS (Twilio)
      sendPasswordResetOtp: async (phoneNumber: string) => {
        set({ loading: true });
        try {
          console.log('📱 Sending password reset OTP via SMS for phone:', phoneNumber);

          const response = await supabase.functions.invoke('manage-password-reset', {
            body: {
              action: 'send-otp',
              phone: phoneNumber,
            },
          });

          if (response.error) {
            console.error('❌ Send reset OTP error:', response.error);
            set({ loading: false });
            return { success: false, error: 'Failed to send verification code. Please try again.' };
          }

          const data = response.data;

          if (!data?.success) {
            console.error('❌ Send reset OTP failed:', data?.error);
            set({ loading: false });
            return { success: false, error: data?.error || 'Failed to send verification code.' };
          }

          console.log('✅ Password reset OTP sent via SMS');
          set({ loading: false });
          return {
            success: true,
            phone: data.phone, // Masked phone number
            email: data.email, // Email associated with this phone
          };
        } catch (error: any) {
          console.error('❌ Send password reset OTP error:', error);
          set({ loading: false });
          return { success: false, error: error.message || 'An error occurred' };
        }
      },

      // New: Verify password reset OTP
      verifyPasswordResetOtp: async (email: string, otp: string) => {
        set({ loading: true });
        try {
          console.log('🔐 Verifying password reset OTP');

          const response = await supabase.functions.invoke('manage-password-reset', {
            body: {
              action: 'verify-otp',
              email,
              otp,
            },
          });

          if (response.error) {
            console.error('❌ Verify reset OTP error:', response.error);
            set({ loading: false });
            return { success: false, error: 'Verification failed. Please try again.' };
          }

          const data = response.data;

          if (!data?.success) {
            console.error('❌ Verify reset OTP failed:', data?.error);
            set({ loading: false });
            return { success: false, error: data?.error || 'Invalid verification code.' };
          }

          console.log('✅ Password reset OTP verified');
          set({ loading: false });
          return {
            success: true,
            resetToken: data.resetToken,
          };
        } catch (error: any) {
          console.error('❌ Verify password reset OTP error:', error);
          set({ loading: false });
          return { success: false, error: error.message || 'An error occurred' };
        }
      },

      // New: Reset password with verified token
      resetPasswordWithToken: async (resetToken: string, newPassword: string) => {
        set({ loading: true });
        try {
          console.log('🔐 Resetting password with token');

          const response = await supabase.functions.invoke('manage-password-reset', {
            body: {
              action: 'reset-password',
              resetToken,
              newPassword,
            },
          });

          if (response.error) {
            console.error('❌ Reset password error:', response.error);
            set({ loading: false });
            return { success: false, error: response.error.message || 'Failed to reset password. Please try again.' };
          }

          const data = response.data;

          if (!data?.success) {
            console.error('❌ Reset password failed:', data?.error);
            set({ loading: false });
            // Return the specific error message from the server
            return { success: false, error: data?.error || 'Failed to reset password. Please try again.' };
          }

          console.log('✅ Password reset successfully');
          set({ loading: false });
          return { success: true };
        } catch (error: any) {
          console.error('❌ Reset password error:', error);
          set({ loading: false });
          return { success: false, error: error.message || 'An error occurred' };
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
          
          // Clear goal store
          const { useGoalStore } = await import('./useGoalStore');
          useGoalStore.setState({
            goals: [],
            activeGoals: [],
            loading: false,
            error: null,
          });
          
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
        console.log('🔐 Starting signOut process...');
        
        // IMMEDIATELY clear isAuthenticated AND loading to trigger UI change
        set({ 
          isAuthenticated: false,
          loading: false // Don't show loading on login screen
        });
        
        try {
          console.log('🔐 Continuing signout process...');

          // Get user BEFORE clearing state
          const currentUser = get().user;
          
          // Reset login_verified before signing out
          if (currentUser?.id) {
            console.log('🔄 Resetting login verification for next login...');
            try {
              await supabase
                .from('otp_verifications')
                .update({
                  login_verified: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', currentUser.id);
              console.log('✅ Login verification reset successfully');
            } catch (dbError) {
              console.error('❌ Failed to reset login verification:', dbError);
              // Continue with signout anyway
            }
          }

          // Sign out from Supabase Auth FIRST (this clears sessions)
          console.log('🔐 Calling Supabase signOut...');
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('⚠️ SignOut error (continuing anyway):', error);
          }

          // Force clear persisted store FIRST
          try {
            console.log('🧹 Clearing persisted auth store...');
            await AsyncStorage.removeItem('genie-auth-store');
            console.log('✅ Cleared persisted auth store');
          } catch (err) {
            console.log('⚠️ Failed to clear persisted auth store:', err);
          }

          // Clear all auth state AFTER clearing AsyncStorage
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
          
          // Clear goal store
          const { useGoalStore } = await import('./useGoalStore');
          useGoalStore.setState({
            goals: [],
            activeGoals: [],
            loading: false,
            error: null,
          });

          console.log('✅ Complete signout finished');

          // Verify state is cleared
          const currentState = get();
          console.log('🔍 Final auth state after signOut:', {
            isAuthenticated: currentState.isAuthenticated,
            user: !!currentState.user,
            session: !!currentState.session,
            loading: currentState.loading
          });

          console.log('✅ Sign out successful - UI should now show login screen');
          
          // Make sure loading is false at the end
          set({ loading: false });
        } catch (error) {
          console.error('❌ Sign out error:', error);
          set({ 
            loading: false,
            isAuthenticated: false,
            user: null,
            session: null,
          });
          throw error;
        }
      },

      initialize: async () => {
        // Don't set loading if user is already not authenticated (e.g., after signout)
        const currentState = get();
        if (!currentState.isAuthenticated) {
          console.log('🔐 Initializing auth (no loading - user not authenticated)...');
        } else {
          console.log('🔐 Initializing auth...');
          set({ loading: true });
        }
        
        try {

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
              
              // Update timezone on every login
              await updateUserTimezone(session.user.id);
              
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
              
              // Update timezone on every login
              await updateUserTimezone(session.user.id);
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
                loading: false, // Make sure loading is false
              });
            }
          });
          
          // Always ensure loading is false at the end of initialize
          const finalState = get();
          if (finalState.loading) {
            set({ loading: false });
            console.log('✅ Auth initialization complete - loading cleared');
          }
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
