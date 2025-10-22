/**
 * Token Purchase Modal
 * 
 * Modal for purchasing tokens with Stripe
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Modal } from '../primitives/Modal/Modal';
import { Button } from '../primitives/Button/Button';
import { paymentService } from '../../services/paymentService';
import { useTheme } from '../../theme/ThemeContext';

interface TokenPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TOKEN_PACKAGES = [
  { amount: 50, price: 2.5, popular: false },
  { amount: 100, price: 5, popular: false },
  { amount: 250, price: 12.5, popular: true },
  { amount: 500, price: 25, popular: false },
  { amount: 1000, price: 50, popular: false },
];

export const TokenPurchaseModal: React.FC<TokenPurchaseModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (selectedPackage === null) {
      setError('Please select a token package');
      return;
    }

    const pkg = TOKEN_PACKAGES[selectedPackage];
    
    try {
      setLoading(true);
      setError(null);

      // Create checkout session
      const response = await paymentService.purchaseTokens(pkg.amount);

      if (!response.success || !response.url) {
        setError(response.error || 'Failed to create checkout session');
        setLoading(false);
        return;
      }

      // Open Stripe checkout
      await paymentService.openCheckout(response.url);
      
      // Close modal after opening checkout
      onClose();
      
      // Success callback will be handled by deep link listener
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('Error purchasing tokens:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Purchase Tokens">
      <ScrollView style={styles.container}>
        <Text style={[styles.description, { color: colors.text.secondary }]}>
          Select a token package to continue creating goals and tasks
        </Text>

        <View style={styles.packagesContainer}>
          {TOKEN_PACKAGES.map((pkg, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.packageCard,
                {
                  backgroundColor: colors.background.secondary,
                  borderColor: selectedPackage === index ? colors.primary : colors.border,
                },
                pkg.popular && styles.popularPackage,
              ]}
              onPress={() => setSelectedPackage(index)}
              disabled={loading}
            >
              {pkg.popular && (
                <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
              
              <Text style={[styles.tokenAmount, { color: colors.text.primary }]}>
                {pkg.amount.toLocaleString()}
              </Text>
              <Text style={[styles.tokenLabel, { color: colors.text.secondary }]}>
                tokens
              </Text>
              
              <View style={styles.priceContainer}>
                <Text style={[styles.price, { color: colors.primary }]}>
                  ${pkg.price.toFixed(2)}
                </Text>
                <Text style={[styles.pricePerToken, { color: colors.text.tertiary }]}>
                  ${(pkg.price / pkg.amount).toFixed(3)}/token
                </Text>
              </View>

              {selectedPackage === index && (
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

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
            Secure payment powered by Stripe
          </Text>
          
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
              onPress={handlePurchase}
              disabled={loading || selectedPackage === null}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                `Purchase ${selectedPackage !== null ? TOKEN_PACKAGES[selectedPackage].amount : ''} Tokens`
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  packagesContainer: {
    gap: 12,
    marginBottom: 20,
  },
  packageCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
    alignItems: 'center',
  },
  popularPackage: {
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tokenAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  tokenLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  priceContainer: {
    alignItems: 'center',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pricePerToken: {
    fontSize: 12,
    marginTop: 4,
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
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});

