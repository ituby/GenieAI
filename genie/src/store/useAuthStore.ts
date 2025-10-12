import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import Constants from 'expo-constants';

interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  isAuthenticated: boolean;
  otpVerified: boolean;
  pendingPhoneNumber: string | null;
  showOTPScreen: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  sendOTP: (phoneNumber: string) => Promise<void>;
  verifyOTP: (phoneNumber: string, otpCode: string) => Promise<void>;
  setPendingPhoneNumber: (phoneNumber: string | null) => void;
  sendOTPToUser: () => Promise<void>;
  updateUserPhoneNumber: (phoneNumber: string) => Promise<void>;
  setShowOTPScreen: (show: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      isAuthenticated: false,
      otpVerified: false,
      pendingPhoneNumber: null,
      showOTPScreen: false,

      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),

      setSession: (session) => set({ session }),

      setLoading: (loading) => set({ loading }),

      signIn: async (email: string, password: string) => {
        set({ loading: true });
        try {
          console.log('🔐 Attempting login with:', email);
          console.log('🔗 Supabase URL:', Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL);
          
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
            isAuthenticated: true, // User is authenticated, but needs OTP verification
            otpVerified: false,
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
            isAuthenticated: true, // User is authenticated, but needs OTP verification
            otpVerified: false,
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
            otpVerified: false,
            pendingPhoneNumber: null,
            showOTPScreen: false,
            loading: false,
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
          
          // First check if we have persisted session data
          const currentState = get();
          if (currentState.session && currentState.user) {
            console.log('🔐 Found persisted session, validating with Supabase...');
            
            // Validate the persisted session with Supabase
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.log('❌ Persisted session invalid, clearing...');
              set({
                user: null,
                session: null,
                isAuthenticated: false,
                loading: false,
              });
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
            
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('❌ Error getting session:', error);
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

      sendOTP: async (phoneNumber: string) => {
        const { loading } = get();
        if (loading) {
          console.log('📱 OTP already being sent, skipping...');
          return;
        }
        
        set({ loading: true });
        try {
          const { user } = get();
          if (!user) {
            throw new Error('User not authenticated');
          }

          console.log('📱 Sending OTP to:', phoneNumber);

          const response = await fetch(`${Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-otp-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().session?.access_token}`,
            },
            body: JSON.stringify({
              action: 'send',
              phone_number: phoneNumber,
              user_id: user.id,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Failed to send OTP');
          }

          console.log('✅ OTP sent successfully');
          set({ 
            pendingPhoneNumber: phoneNumber,
            showOTPScreen: true,
            loading: false 
          });
        } catch (error) {
          console.error('❌ Send OTP error:', error);
          set({ loading: false });
          throw error;
        }
      },

      verifyOTP: async (phoneNumber: string, otpCode: string) => {
        set({ loading: true });
        try {
          const { user } = get();
          if (!user) {
            throw new Error('User not authenticated');
          }

          console.log('🔐 Verifying OTP for:', phoneNumber);

          const response = await fetch(`${Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-otp-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().session?.access_token}`,
            },
            body: JSON.stringify({
              action: 'verify',
              phone_number: phoneNumber,
              otp_code: otpCode,
              user_id: user.id,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Failed to verify OTP');
          }

          console.log('✅ OTP verified successfully');
          set({ 
            otpVerified: true,
            isAuthenticated: true,
            pendingPhoneNumber: null,
            loading: false 
          });
        } catch (error) {
          console.error('❌ Verify OTP error:', error);
          set({ loading: false });
          throw error;
        }
      },

      setPendingPhoneNumber: (phoneNumber: string | null) => {
        set({ pendingPhoneNumber: phoneNumber });
      },

      sendOTPToUser: async () => {
        const { loading } = get();
        if (loading) {
          console.log('📱 OTP already being sent, skipping...');
          return;
        }
        
        set({ loading: true });
        try {
          const { user } = get();
          if (!user) {
            throw new Error('User not authenticated');
          }

          console.log('📱 Getting user phone number...');

          // Get user phone number from database
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('phone_number')
            .eq('id', user.id)
            .single();

          if (userError) {
            console.error('Error fetching user data:', userError);
            throw new Error('Failed to get user phone number');
          }

          if (!userData.phone_number) {
            throw new Error('No phone number found for this user');
          }

          console.log('📱 Sending OTP to user phone:', userData.phone_number);

          const response = await fetch(`${Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-otp-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().session?.access_token}`,
            },
            body: JSON.stringify({
              action: 'send',
              phone_number: userData.phone_number,
              user_id: user.id,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            console.error('❌ OTP send failed:', result);
            throw new Error(result.error || 'Failed to send OTP');
          }

          console.log('✅ OTP sent successfully to user phone');
          set({ 
            pendingPhoneNumber: userData.phone_number,
            showOTPScreen: true,
            loading: false 
          });
          
          console.log('📱 Setting pending phone number and showOTPScreen:', userData.phone_number);
        } catch (error) {
          console.error('❌ Send OTP to user error:', error);
          set({ loading: false });
          throw error;
        }
      },

      updateUserPhoneNumber: async (phoneNumber: string) => {
        try {
          const { user } = get();
          if (!user) {
            throw new Error('User not authenticated');
          }

          console.log('📱 Updating user phone number:', phoneNumber);

          const { error } = await supabase
            .from('users')
            .update({ phone_number: phoneNumber })
            .eq('id', user.id);

          if (error) {
            console.error('Error updating phone number:', error);
            throw new Error('Failed to update phone number');
          }

          console.log('✅ Phone number updated successfully');
        } catch (error) {
          console.error('❌ Update phone number error:', error);
          throw error;
        }
      },

      setShowOTPScreen: (show: boolean) => {
        console.log('📱 Setting showOTPScreen to:', show);
        set({ showOTPScreen: show });
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
        otpVerified: state.otpVerified,
        pendingPhoneNumber: state.pendingPhoneNumber,
        showOTPScreen: state.showOTPScreen,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔐 Rehydrating auth store:', !!state?.isAuthenticated);
        // Don't auto-initialize here, let App.tsx handle it
        return state;
      },
    }
  )
);
