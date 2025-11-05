/**
 * Subscription Management Modal
 * 
 * Modal for managing subscriptions (subscribe, upgrade, downgrade, cancel)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Modal } from 'react-native';
import { Button } from '../primitives/Button/Button';
import { paymentService } from '../../services/paymentService';
import { useTheme } from '../../theme';
import * as Linking from 'expo-linking';

interface SubscriptionManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SubscriptionManagementModal: React.FC<SubscriptionManagementModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<any | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const tiers = paymentService.getSubscriptionTiers();

  useEffect(() => {
    if (visible) {
      loadActiveSubscription();
    }
  }, [visible]);

  const loadActiveSubscription = async () => {
    try {
      const subscription = await paymentService.getActiveSubscription();
      setActiveSubscription(subscription);
    } catch (err) {
      console.error('Error loading subscription:', err);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedTier) {
      setError('Please select a subscription tier');
      return;
    }

    const tier = tiers.find(t => t.id === selectedTier);
    if (!tier) return;

    try {
      setLoading(true);
      setError(null);

      // Create checkout session for subscription
      const response = await paymentService.createSubscription(tier.priceId);

      if (!response.success || !response.url) {
        setError(response.error || 'Failed to create checkout session');
        setLoading(false);
        return;
      }

      // Open Stripe checkout
      await paymentService.openCheckout(response.url);
      
      // Close modal after opening checkout
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('Error subscribing:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeDowngrade = async () => {
    if (!selectedTier) {
      setError('Please select a tier');
      return;
    }

    const tier = tiers.find(t => t.id === selectedTier);
    if (!tier) return;

    try {
      setLoading(true);
      setError(null);

      const currentTierIndex = tiers.findIndex(t => t.priceId === activeSubscription?.stripe_price_id);
      const newTierIndex = tiers.findIndex(t => t.id === selectedTier);
      
      const action = newTierIndex > currentTierIndex ? 'upgrade' : 'downgrade';

      const response = await paymentService.manageSubscription(action, {
        newPriceId: tier.priceId,
        proration: true,
      });

      if (!response.success) {
        setError(response.error || `Failed to ${action} subscription`);
        setLoading(false);
        return;
      }

      // Reload subscription
      await loadActiveSubscription();
      
      if (onSuccess) {
        onSuccess();
      }

      onClose();

    } catch (err) {
      console.error('Error changing subscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (immediate: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const action = immediate ? 'cancel_immediate' : 'cancel_end_of_period';
      const response = await paymentService.manageSubscription(action);

      if (!response.success) {
        setError(response.error || 'Failed to cancel subscription');
        setLoading(false);
        return;
      }

      // Reload subscription
      await loadActiveSubscription();
      
      if (onSuccess) {
        onSuccess();
      }

      onClose();

    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReinstateSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await paymentService.manageSubscription('reinstate');

      if (!response.success) {
        setError(response.error || 'Failed to reinstate subscription');
        setLoading(false);
        return;
      }

      // Reload subscription
      await loadActiveSubscription();
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('Error reinstating subscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderNoSubscription = () => (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Choose Your Plan
      </Text>
      
      <Text style={[styles.description, { color: colors.text.secondary }]}>
        Subscribe to get monthly tokens and unlock premium features
      </Text>

      <View style={styles.tiersContainer}>
        {tiers.map((tier) => (
          <TouchableOpacity
            key={tier.id}
            style={[
              styles.tierCard,
              {
                backgroundColor: colors.background.secondary,
                borderColor: selectedTier === tier.id ? colors.primary : colors.border,
              },
              tier.popular && styles.popularTier,
            ]}
            onPress={() => setSelectedTier(tier.id)}
            disabled={loading}
          >
            {tier.popular && (
              <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
            )}

            <Text style={[styles.tierName, { color: colors.text.primary }]}>
              {tier.name}
            </Text>
            
            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: colors.primary }]}>
                ${tier.price.toFixed(2)}
              </Text>
              <Text style={[styles.pricePeriod, { color: colors.text.secondary }]}>
                /month
              </Text>
            </View>

            <Text style={[styles.tokensText, { color: colors.text.secondary }]}>
              {tier.tokens.toLocaleString()} tokens/month
            </Text>

            <View style={styles.featuresContainer}>
              {tier.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={[styles.featureIcon, { color: colors.primary }]}>✓</Text>
                  <Text style={[styles.featureText, { color: colors.text.secondary }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            {selectedTier === tier.id && (
              <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
                <Text style={styles.selectedText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Legal Links - Required by Apple for Subscriptions */}
      <View style={styles.legalLinksContainer}>
        <Text style={[styles.legalLinksTitle, { color: colors.text.tertiary }]}>
          By subscribing, you agree to our:
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://askgenie.info/terms')}
            style={styles.legalLinkButton}
          >
            <Text style={[styles.legalLinkText, { color: colors.primary }]}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={[styles.legalLinkSeparator, { color: colors.text.tertiary }]}>•</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://askgenie.info/privacy')}
            style={styles.legalLinkButton}
          >
            <Text style={[styles.legalLinkText, { color: colors.primary }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Button
          variant="secondary"
          onPress={onClose}
          disabled={loading}
          style={styles.button}
        >
          Cancel
        </Button>
        
        <Button
          variant="primary"
          onPress={handleSubscribe}
          disabled={loading || !selectedTier}
          style={styles.button}
        >
          {loading ? <ActivityIndicator color="#fff" /> : 'Subscribe'}
        </Button>
      </View>
    </ScrollView>
  );

  const renderActiveSubscription = () => {
    const currentTier = tiers.find(t => t.priceId === activeSubscription?.stripe_price_id);
    const isScheduledForCancellation = activeSubscription?.cancel_at_period_end;

    return (
      <ScrollView style={styles.container}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Manage Subscription
        </Text>

        {isScheduledForCancellation && (
          <View style={[styles.warningContainer, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.warningText, { color: colors.warning }]}>
              ⚠️ Your subscription will be canceled on{' '}
              {new Date(activeSubscription.current_period_end).toLocaleDateString()}
            </Text>
            <Button
              variant="primary"
              onPress={handleReinstateSubscription}
              disabled={loading}
              style={styles.reinstateButton}
            >
              {loading ? <ActivityIndicator color="#fff" /> : 'Reinstate Subscription'}
            </Button>
          </View>
        )}

        <View style={[styles.currentPlanCard, { backgroundColor: colors.background.secondary }]}>
          <Text style={[styles.currentPlanLabel, { color: colors.text.secondary }]}>
            Current Plan
          </Text>
          <Text style={[styles.currentPlanName, { color: colors.text.primary }]}>
            {currentTier?.name || 'Unknown'}
          </Text>
          <Text style={[styles.currentPlanPrice, { color: colors.primary }]}>
            ${currentTier?.price.toFixed(2)}/month
          </Text>
          <Text style={[styles.currentPlanTokens, { color: colors.text.secondary }]}>
            {currentTier?.tokens.toLocaleString()} tokens/month
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Change Plan
        </Text>

        <View style={styles.tiersContainer}>
          {tiers.map((tier) => (
            <TouchableOpacity
              key={tier.id}
              style={[
                styles.tierCard,
                styles.compactTierCard,
                {
                  backgroundColor: colors.background.secondary,
                  borderColor: selectedTier === tier.id ? colors.primary : colors.border,
                },
                currentTier?.id === tier.id && [styles.currentTierCard, { borderColor: colors.success }],
              ]}
              onPress={() => setSelectedTier(tier.id)}
              disabled={loading || currentTier?.id === tier.id}
            >
              {currentTier?.id === tier.id && (
                <View style={[styles.currentBadge, { backgroundColor: colors.success }]}>
                  <Text style={styles.currentBadgeText}>CURRENT</Text>
                </View>
              )}

              <Text style={[styles.tierName, styles.compactTierName, { color: colors.text.primary }]}>
                {tier.name}
              </Text>
              <Text style={[styles.price, styles.compactPrice, { color: colors.primary }]}>
                ${tier.price.toFixed(2)}/mo
              </Text>
              <Text style={[styles.tokensText, styles.compactTokens, { color: colors.text.secondary }]}>
                {tier.tokens.toLocaleString()} tokens
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          {selectedTier && selectedTier !== currentTier?.id && (
            <Button
              variant="primary"
              onPress={handleUpgradeDowngrade}
              disabled={loading}
              style={styles.actionButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                `Change to ${tiers.find(t => t.id === selectedTier)?.name}`
              )}
            </Button>
          )}

          {!isScheduledForCancellation && (
            <Button
              variant="destructive"
              onPress={() => handleCancelSubscription(false)}
              disabled={loading}
              style={styles.actionButton}
            >
              {loading ? <ActivityIndicator color="#fff" /> : 'Cancel Subscription'}
            </Button>
          )}

          <Button
            variant="secondary"
            onPress={onClose}
            disabled={loading}
            style={styles.actionButton}
          >
            Close
          </Button>
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Subscription
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.text.secondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {activeSubscription ? renderActiveSubscription() : renderNoSubscription()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  tiersContainer: {
    gap: 12,
    marginBottom: 20,
  },
  tierCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  compactTierCard: {
    padding: 16,
    alignItems: 'center',
  },
  popularTier: {
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tierName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  compactTierName: {
    fontSize: 16,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  compactPrice: {
    fontSize: 18,
    marginBottom: 4,
  },
  pricePeriod: {
    fontSize: 14,
    marginLeft: 4,
  },
  tokensText: {
    fontSize: 14,
    marginBottom: 12,
  },
  compactTokens: {
    fontSize: 12,
    marginBottom: 0,
  },
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentPlanCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentPlanLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  currentPlanPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  currentPlanTokens: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  currentTierCard: {
    borderWidth: 2,
    opacity: 0.7,
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  warningContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  reinstateButton: {
    marginTop: 8,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    width: '100%',
  },
  legalLinksContainer: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  legalLinksTitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLinkButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  legalLinkText: {
    fontSize: 12,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  legalLinkSeparator: {
    fontSize: 12,
  },
});

