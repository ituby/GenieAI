import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';
import { useAuthStore } from '../store/useAuthStore';

export interface TokenInfo {
  tokensRemaining: number;
  tokensUsed: number;
  totalTokens: number;
  isSubscribed: boolean;
  monthlyTokens: number;
  lastResetAt: string | null;
  canUseTokens: boolean;
  canPurchaseTokens: boolean;
  needsSubscription: boolean;
}

export const useTokens = () => {
  const { user } = useAuthStore();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    tokensRemaining: 0,
    tokensUsed: 0,
    totalTokens: 0,
    isSubscribed: false,
    monthlyTokens: 0,
    lastResetAt: null,
    canUseTokens: false,
    canPurchaseTokens: false,
    needsSubscription: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenInfo = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no record exists, create one with default values
        if (fetchError.code === 'PGRST116') {
          const { data: newRecord, error: insertError } = await supabase
            .from('user_tokens')
            .insert({
              user_id: user.id,
              tokens_remaining: 3,
              tokens_used: 0,
              total_tokens: 3,
              is_subscribed: false,
              monthly_tokens: 3,
            })
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          if (newRecord) {
            setTokenInfo({
              tokensRemaining: newRecord.tokens_remaining || 0,
              tokensUsed: newRecord.tokens_used || 0,
              totalTokens: newRecord.total_tokens || 0,
              isSubscribed: newRecord.is_subscribed || false,
              monthlyTokens: newRecord.monthly_tokens || 0,
              lastResetAt: newRecord.last_reset_at || null,
              canUseTokens: (newRecord.tokens_remaining || 0) > 0,
              canPurchaseTokens: newRecord.is_subscribed || false,
              needsSubscription: !newRecord.is_subscribed && (newRecord.tokens_remaining || 0) === 0,
            });
          }
        } else {
          throw fetchError;
        }
      } else if (data) {
        setTokenInfo({
          tokensRemaining: data.tokens_remaining || 0,
          tokensUsed: data.tokens_used || 0,
          totalTokens: data.total_tokens || 0,
          isSubscribed: data.is_subscribed || false,
          monthlyTokens: data.monthly_tokens || 0,
          lastResetAt: data.last_reset_at || null,
          canUseTokens: (data.tokens_remaining || 0) > 0,
          canPurchaseTokens: data.is_subscribed || false,
          needsSubscription: !data.is_subscribed && (data.tokens_remaining || 0) === 0,
        });
      }
    } catch (err: any) {
      console.error('Error fetching token info:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenInfo();
  }, [user?.id]);

  const refreshTokens = () => {
    fetchTokenInfo();
  };

  return {
    ...tokenInfo,
    loading,
    error,
    refreshTokens,
  };
};

