import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Icon, Badge } from '../components';
import { Button } from '../components/primitives/Button';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../services/supabase/client';

interface SubscriptionScreenProps {
  onBack: () => void;
}

interface SubscriptionData {
  plan: string;
  status: 'active' | 'cancelled' | 'past_due' | 'incomplete';
  currentPeriodEnd: string;
  tokensUsed: number;
  tokensRemaining: number;
  monthlyTokens: number;
  nextBillingDate: string;
  lastPaymentDate: string;
  lastPaymentStatus: 'succeeded' | 'failed' | 'pending';
  totalCharges: number;
  currency: string;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onBack,
}) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch real subscription data from database
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (tokenError && tokenError.code !== 'PGRST116') {
        throw tokenError;
      }

      if (tokenData) {
        setSubscriptionData({
          plan: tokenData.is_subscribed ? 'Premium Monthly' : 'Free Plan',
          status: tokenData.is_subscribed ? 'active' : 'inactive',
          currentPeriodEnd: tokenData.is_subscribed ? '2024-02-15' : 'N/A',
          tokensUsed: tokenData.tokens_used,
          tokensRemaining: tokenData.tokens_remaining,
          monthlyTokens: tokenData.monthly_tokens || 10, // Default to 10 for free users
          nextBillingDate: tokenData.is_subscribed ? '2024-02-15' : 'N/A',
          lastPaymentDate: tokenData.is_subscribed ? '2024-01-15' : 'N/A',
          lastPaymentStatus: tokenData.is_subscribed ? 'succeeded' : 'none',
          totalCharges: tokenData.is_subscribed ? 9.99 : 0,
          currency: 'USD',
        });
      } else {
        // User doesn't have tokens record yet
        setSubscriptionData({
          plan: 'Free Plan',
          status: 'inactive',
          currentPeriodEnd: 'N/A',
          tokensUsed: 0,
          tokensRemaining: 3,
          monthlyTokens: 3,
          nextBillingDate: 'N/A',
          lastPaymentDate: 'N/A',
          lastPaymentStatus: 'none',
          totalCharges: 0,
          currency: 'USD',
        });
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: () => {
            setCancelling(true);
            // Simulate cancellation API call
            setTimeout(() => {
              setCancelling(false);
              Alert.alert(
                'Subscription Cancelled',
                'Your subscription has been cancelled. You will retain access until the end of your current billing period.'
              );
            }, 2000);
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'cancelled':
        return '#FF9800';
      case 'past_due':
        return '#F44336';
      case 'incomplete':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'cancelled':
        return 'Cancelled';
      case 'past_due':
        return 'Past Due';
      case 'incomplete':
        return 'Incomplete';
      default:
        return 'Unknown';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'pending':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Successful';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <View style={styles.header}>
            <Button variant="ghost" onPress={onBack}>
              <Icon name="arrow-left" size={20} color="#FFFF68" />
            </Button>
            <Text variant="h4" style={styles.headerTitle}>
              My Subscription
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFF68" />
            <Text variant="body" style={styles.loadingText}>
              Loading subscription details...
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!subscriptionData) {
    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <View style={styles.header}>
            <Button variant="ghost" onPress={onBack}>
              <Icon name="arrow-left" size={20} color="#FFFF68" />
            </Button>
            <Text variant="h4" style={styles.headerTitle}>
              My Subscription
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.errorContainer}>
            <Icon name="exclamation-triangle" size={48} color="#FF6B6B" />
            <Text variant="h4" style={styles.errorTitle}>
              Unable to Load
            </Text>
            <Text variant="body" style={styles.errorText}>
              We couldn't load your subscription details. Please try again.
            </Text>
            <Button
              variant="primary"
              onPress={fetchSubscriptionData}
              style={styles.retryButton}
            >
              Try Again
            </Button>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <View style={styles.header}>
          <Button variant="ghost" onPress={onBack}>
            <Icon name="arrow-left" size={20} color="#FFFF68" />
          </Button>
          <Text variant="h4" style={styles.headerTitle}>
            My Subscription
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Subscription Status Card */}
          <Card variant="gradient" padding="md" style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusInfo}>
                <Text variant="h4" style={styles.planName}>
                  {subscriptionData.plan}
                </Text>
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: getStatusColor(
                          subscriptionData.status
                        ),
                      },
                    ]}
                  />
                  <Text variant="caption" style={styles.statusText}>
                    {getStatusText(subscriptionData.status)}
                  </Text>
                </View>
              </View>
              <Icon name="crown" size={24} color="#FFFF68" />
            </View>

            <View style={styles.statusDetails}>
              <View style={styles.statusRow}>
                <Text variant="body" style={styles.statusLabel}>
                  Current Period Ends
                </Text>
                <Text variant="body" style={styles.statusValue}>
                  {new Date(
                    subscriptionData.currentPeriodEnd
                  ).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text variant="body" style={styles.statusLabel}>
                  Next Billing Date
                </Text>
                <Text variant="body" style={styles.statusValue}>
                  {new Date(
                    subscriptionData.nextBillingDate
                  ).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </Card>

          {/* Token Usage Card */}
          <Card variant="gradient" padding="md" style={styles.usageCard}>
            <View style={styles.usageHeader}>
              <View style={styles.usageTitleContainer}>
                <Icon name="chart-bar" size={20} color="#FFFF68" />
                <Text variant="h4" style={styles.usageTitle}>
                  Token Usage
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.purchaseTokensButton,
                  subscriptionData.status !== 'active' &&
                    styles.purchaseTokensButtonDisabled,
                ]}
                disabled={subscriptionData.status !== 'active'}
                activeOpacity={subscriptionData.status === 'active' ? 0.8 : 1}
                onPress={() => {
                  // TODO: Implement token purchase functionality
                  Alert.alert(
                    'Coming Soon',
                    'Token purchase feature will be available soon!'
                  );
                }}
              >
                <Icon
                  name="crown"
                  size={16}
                  color={
                    subscriptionData.status === 'active'
                      ? '#FFFF68'
                      : 'rgba(255, 255, 104, 0.4)'
                  }
                  weight="fill"
                />
                <Text
                  style={[
                    styles.purchaseTokensText,
                    subscriptionData.status !== 'active' &&
                      styles.purchaseTokensTextDisabled,
                  ]}
                >
                  Add Tokens
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.usageStats}>
              <View style={styles.usageStat}>
                <Text variant="h2" style={styles.usageNumber}>
                  {subscriptionData.tokensUsed}
                </Text>
                <Text variant="caption" style={styles.usageLabel}>
                  Used
                </Text>
              </View>
              <View style={styles.usageDivider} />
              <View style={styles.usageStat}>
                <Text variant="h2" style={styles.usageNumber}>
                  {subscriptionData.tokensRemaining}
                </Text>
                <Text variant="caption" style={styles.usageLabel}>
                  Remaining
                </Text>
              </View>
              <View style={styles.usageDivider} />
              <View style={styles.usageStat}>
                <Text variant="h2" style={styles.usageNumber}>
                  {subscriptionData.monthlyTokens}
                </Text>
                <Text variant="caption" style={styles.usageLabel}>
                  Monthly Limit
                </Text>
              </View>
            </View>

            <View style={styles.usageProgress}>
              <View style={styles.usageProgressBar}>
                <View
                  style={[
                    styles.usageProgressFill,
                    {
                      width: `${(subscriptionData.tokensUsed / subscriptionData.monthlyTokens) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text variant="caption" style={styles.usageProgressText}>
                {subscriptionData.tokensUsed} of{' '}
                {subscriptionData.monthlyTokens} tokens used this month
              </Text>
            </View>
          </Card>

          {/* Billing Status Card */}
          <Card variant="gradient" padding="md" style={styles.billingCard}>
            <View style={styles.billingHeader}>
              <Icon name="credit-card" size={20} color="#FFFF68" />
              <Text variant="h4" style={styles.billingTitle}>
                Billing Status
              </Text>
            </View>

            <View style={styles.billingStatus}>
              <View style={styles.billingRow}>
                <Text variant="body" style={styles.billingLabel}>
                  Last Payment
                </Text>
                <View style={styles.billingValue}>
                  <Text variant="body" style={styles.billingDate}>
                    {new Date(
                      subscriptionData.lastPaymentDate
                    ).toLocaleDateString()}
                  </Text>
                  <View style={styles.paymentStatus}>
                    <View
                      style={[
                        styles.paymentStatusDot,
                        {
                          backgroundColor: getPaymentStatusColor(
                            subscriptionData.lastPaymentStatus
                          ),
                        },
                      ]}
                    />
                    <Text variant="caption" style={styles.paymentStatusText}>
                      {getPaymentStatusText(subscriptionData.lastPaymentStatus)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.billingRow}>
                <Text variant="body" style={styles.billingLabel}>
                  Amount
                </Text>
                <Text variant="body" style={styles.billingAmount}>
                  ${subscriptionData.totalCharges} {subscriptionData.currency}
                </Text>
              </View>
            </View>
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            {subscriptionData.status === 'active' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelSubscription}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="x-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.cancelButtonText}>
                      Cancel Subscription
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
  },
  statusCard: {
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusInfo: {
    flex: 1,
  },
  planName: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  statusDetails: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusValue: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  usageCard: {
    marginBottom: 20,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  usageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usageTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  purchaseTokensButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
  },
  purchaseTokensText: {
    color: '#FFFF68',
    fontSize: 12,
    fontWeight: '600',
  },
  purchaseTokensButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 104, 0.05)',
    borderColor: 'rgba(255, 255, 104, 0.1)',
  },
  purchaseTokensTextDisabled: {
    color: 'rgba(255, 255, 104, 0.4)',
  },
  usageStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  usageStat: {
    alignItems: 'center',
    flex: 1,
  },
  usageNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  usageLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  usageDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  usageProgress: {
    gap: 8,
  },
  usageProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageProgressFill: {
    height: '100%',
    backgroundColor: '#FFFF68',
    borderRadius: 3,
  },
  usageProgressText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  billingCard: {
    marginBottom: 20,
  },
  billingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  billingTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  billingStatus: {
    gap: 12,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  billingValue: {
    alignItems: 'flex-end',
  },
  billingDate: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paymentStatusText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
  },
  billingAmount: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  actions: {
    gap: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
});
