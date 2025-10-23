/**
 * Token Purchase Modal
 * 
 * Modal for purchasing tokens with Stripe
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { Button } from '../primitives/Button/Button';
import { paymentService } from '../../services/paymentService';
import { useTheme } from '../../theme';
import { useTokens } from '../../hooks/useTokens';

interface TokenPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TOKEN_PACKAGES = [
  { amount: 50, price: 2.5 },
  { amount: 100, price: 5 },
  { amount: 250, price: 12.5 },
  { amount: 500, price: 25 },
  { amount: 1000, price: 50 },
  { amount: 2000, price: 100 },
];

export const TokenPurchaseModal: React.FC<TokenPurchaseModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const { isSubscribed } = useTokens();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate prices with subscriber discount
  const getDisplayPrice = (originalPrice: number) => {
    console.log('🔍 TokenPurchaseModal - isSubscribed:', isSubscribed);
    if (isSubscribed) {
      const discountedPrice = originalPrice * 0.85; // 15% discount
      console.log(`💰 Discount applied: $${originalPrice} → $${discountedPrice.toFixed(2)}`);
      return discountedPrice;
    }
    console.log(`💰 No discount: $${originalPrice}`);
    return originalPrice;
  };

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
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Purchase Tokens</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.description, { color: colors.text.secondary }]}>
              Select a token package to continue creating goals and tasks
            </Text>

            {isSubscribed && (
              <View style={styles.discountBanner}>
                <Text style={styles.discountText}>
                  🎉 Subscriber Discount: 15% OFF all token purchases!
                </Text>
              </View>
            )}

            <View style={styles.tokenOptions}>
              <View style={styles.tokenRow}>
                <TouchableOpacity
                  style={[
                    styles.tokenOption,
                    selectedPackage === 0 && styles.tokenOptionSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedPackage(0)}
                  disabled={loading}
                >
                  <View style={styles.tokenOptionContent}>
                    <Text style={styles.tokenAmount}>
                      50
                    </Text>
                    <Text style={styles.tokenLabel}>
                      tokens
                    </Text>
                    <Text style={styles.tokenPrice}>
                      ${getDisplayPrice(2.50).toFixed(2)}
                    </Text>
                    {isSubscribed && (
                      <Text style={styles.originalPrice}>
                        $2.50
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tokenOption,
                    selectedPackage === 1 && styles.tokenOptionSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedPackage(1)}
                  disabled={loading}
                >
                  <View style={styles.tokenOptionContent}>
                    <Text style={styles.tokenAmount}>
                      100
                    </Text>
                    <Text style={styles.tokenLabel}>
                      tokens
                    </Text>
                    <Text style={styles.tokenPrice}>
                      ${getDisplayPrice(5.00).toFixed(2)}
                    </Text>
                    {isSubscribed && (
                      <Text style={styles.originalPrice}>
                        $5.00
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.tokenRow}>
                <TouchableOpacity
                  style={[
                    styles.tokenOption,
                    selectedPackage === 2 && styles.tokenOptionSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedPackage(2)}
                  disabled={loading}
                >
                  <View style={styles.tokenOptionContent}>
                    <Text style={styles.tokenAmount}>
                      250
                    </Text>
                    <Text style={styles.tokenLabel}>
                      tokens
                    </Text>
                    <Text style={styles.tokenPrice}>
                      ${getDisplayPrice(12.50).toFixed(2)}
                    </Text>
                    {isSubscribed && (
                      <Text style={styles.originalPrice}>
                        $12.50
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tokenOption,
                    selectedPackage === 3 && styles.tokenOptionSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedPackage(3)}
                  disabled={loading}
                >
                  <View style={styles.tokenOptionContent}>
                    <Text style={styles.tokenAmount}>
                      500
                    </Text>
                    <Text style={styles.tokenLabel}>
                      tokens
                    </Text>
                    <Text style={styles.tokenPrice}>
                      ${getDisplayPrice(25.00).toFixed(2)}
                    </Text>
                    {isSubscribed && (
                      <Text style={styles.originalPrice}>
                        $25.00
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.tokenRow}>
                <TouchableOpacity
                  style={[
                    styles.tokenOption,
                    selectedPackage === 4 && styles.tokenOptionSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedPackage(4)}
                  disabled={loading}
                >
                  <View style={styles.tokenOptionContent}>
                    <Text style={styles.tokenAmount}>
                      1000
                    </Text>
                    <Text style={styles.tokenLabel}>
                      tokens
                    </Text>
                    <Text style={styles.tokenPrice}>
                      ${getDisplayPrice(50.00).toFixed(2)}
                    </Text>
                    {isSubscribed && (
                      <Text style={styles.originalPrice}>
                        $50.00
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tokenOption,
                    selectedPackage === 5 && styles.tokenOptionSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedPackage(5)}
                  disabled={loading}
                >
                  <View style={styles.tokenOptionContent}>
                    <Text style={styles.tokenAmount}>
                      2000
                    </Text>
                    <Text style={styles.tokenLabel}>
                      tokens
                    </Text>
                    <Text style={styles.tokenPrice}>
                      ${getDisplayPrice(100.00).toFixed(2)}
                    </Text>
                    {isSubscribed && (
                      <Text style={styles.originalPrice}>
                        $100.00
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.floatingFooter}>
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
                  <ActivityIndicator color="#000" />
                ) : (
                  'Purchase'
                )}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 3000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#FFFF68',
    flex: 1,
    flexDirection: 'column',
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
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 0,
  },
  floatingFooter: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 104, 0.3)',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginTop: 'auto',
  },
  description: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 16,
  },
  discountBanner: {
    backgroundColor: 'rgba(255, 255, 104, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFFF68',
  },
  discountText: {
    color: '#FFFF68',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tokenOptions: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  tokenRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  tokenOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
    flex: 1,
    aspectRatio: 1, // Makes it square
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tokenOptionSelected: {
    borderColor: '#FFFF68',
    backgroundColor: 'rgba(255, 255, 104, 0.15)',
    shadowColor: '#FFFF68',
    shadowOpacity: 0.3,
  },
  tokenOptionContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  popularBadge: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: '#FFFF68',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#FFFF68',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
    alignSelf: 'center',
    maxWidth: 80,
  },
  popularText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tokenAmount: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 2,
  },
  tokenLabel: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 8,
  },
  tokenPrice: {
    color: '#FFFF68',
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  originalPrice: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  tokenDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
    textAlign: 'left',
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