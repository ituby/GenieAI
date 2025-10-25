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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Icon, Badge } from '../components';
import { Button } from '../components/primitives/Button';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../services/supabase/client';

interface SubscriptionScreenProps {
  onBack: () => void;
  onAddTokens?: () => void;
}

interface SubscriptionData {
  plan: string;
  status: 'active' | 'cancelled' | 'past_due' | 'incomplete' | 'inactive';
  currentPeriodEnd: string;
  tokensUsed: number;
  tokensRemaining: number;
  monthlyTokens: number;
  nextBillingDate: string;
  lastPaymentDate: string;
  lastPaymentStatus: 'succeeded' | 'failed' | 'pending' | 'none';
  totalCharges: number;
  currency: string;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onBack,
  onAddTokens,
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

  // Refresh when screen gains focus (e.g., returning from plan generation)
  useEffect(() => {
    fetchSubscriptionData();
  }, [user?.id]);

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
          monthlyTokens: tokenData.monthly_tokens || (tokenData.is_subscribed ? 1000 : 100),
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
          tokensRemaining: 100,
          monthlyTokens: 100,
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
          <View style={styles.absoluteHeader}>
            <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Icon name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.headerCenter}>
              <Text variant="h4" style={styles.title} numberOfLines={1}>
                My Subscription
              </Text>
            </View>

            <View style={styles.headerRight}>
              {/* Empty for balance */}
            </View>
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
          <View style={styles.absoluteHeader}>
            <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Icon name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.headerCenter}>
              <Text variant="h4" style={styles.title} numberOfLines={1}>
                My Subscription
              </Text>
            </View>

            <View style={styles.headerRight}>
              {/* Empty for balance */}
            </View>
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
        <View style={styles.absoluteHeader}>
          <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Icon name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <Text variant="h4" style={styles.title} numberOfLines={1}>
              My Subscription
            </Text>
          </View>

          <View style={styles.headerRight}>
            {/* Empty for balance */}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Subscription Status Card */}
          <Card variant="gradient" padding="md" style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusInfo}>
                <View style={styles.planTitleRow}>
                  <Icon name="crown" size={20} color="#FFFF68" />
                  <Text
                    variant="h4"
                    style={[styles.planName, { marginLeft: 8 }]}
                  >
                    {subscriptionData.plan}
                  </Text>
                </View>
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
                style={styles.purchaseTokensButton}
                activeOpacity={0.8}
                onPress={() => onAddTokens?.()}
              >
                <Icon name="coins" size={16} color="#FFFF68" weight="fill" />
                <Text style={styles.purchaseTokensText}>Add Tokens</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.usageStats}>
              <View style={styles.usageStat}>
                <Text variant="h2" style={styles.usageNumber}>
                  {subscriptionData.tokensUsed}
                </Text>
                <Text variant="caption" color="secondary" style={styles.usageLabel}>
                  Used
                </Text>
              </View>
              <View style={styles.usageDivider} />
              <View style={styles.usageStat}>
                <Text variant="h2" style={styles.usageNumber}>
                  {subscriptionData.tokensRemaining}
                </Text>
                <Text variant="caption" color="secondary" style={styles.usageLabel}>
                  Remaining
                </Text>
              </View>
            </View>

            <View style={styles.usageProgress}>
              <View style={styles.usageProgressBar}>
                <View
                  style={[
                    styles.usageProgressFill,
                    {
                      width: `${(subscriptionData.tokensUsed / (subscriptionData.tokensUsed + subscriptionData.tokensRemaining)) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text variant="caption" color="tertiary" style={styles.usageProgressText}>
                {subscriptionData.tokensUsed} of{' '}
                {subscriptionData.tokensUsed + subscriptionData.tokensRemaining}{' '}
                total tokens used
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
                    <Icon name="x-circle" size={20} color="rgba(255, 255, 255, 0.8)" />
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
    paddingTop: 60,
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
    paddingTop: 80,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 110,
    backgroundColor: 'rgba(26, 28, 36, 0.95)',
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
