import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Text, Button, Icon } from '../components';
import { useTheme } from '../theme';
import { colors } from '../theme/colors';

interface TermsAcceptanceScreenProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const TermsAcceptanceScreen: React.FC<TermsAcceptanceScreenProps> = ({
  onAccept,
  onDecline,
}) => {
  const theme = useTheme();
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (!accepted) {
      Alert.alert(
        'Required',
        'Please accept the terms and conditions to continue'
      );
      return;
    }
    onAccept();
  };

  const handleDecline = () => {
    Alert.alert(
      'Terms Not Accepted',
      'You must accept the terms and conditions to use GenieApp. Would you like to review them again?',
      [
        { text: 'Review Again', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: onDecline },
      ]
    );
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Icon name="file-text" size={24} color="#FFFF68" weight="fill" />
            <Text variant="h3" style={styles.modalTitle}>
              Terms & Conditions
            </Text>
            <TouchableOpacity
              onPress={handleDecline}
              style={styles.modalCloseButton}
            >
              <Icon name="x" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Subtitle */}
          <View style={styles.subtitleContainer}>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              Please read and accept our terms to continue
            </Text>
          </View>

          {/* Terms Content - Scrollable */}
          <View style={styles.termsContainer}>
            <ScrollView
              style={styles.termsContent}
              showsVerticalScrollIndicator={true}
            >
              <Text variant="body" style={styles.termsText}>
                <Text variant="h4" style={styles.sectionTitle}>
                  1. Acceptance of Terms
                </Text>
                {'\n\n'}
                By using GenieApp, you agree to be bound by these Terms and
                Conditions. If you do not agree to these terms, please do not use
                our service.
                {'\n\n'}
                <Text variant="h4" style={styles.sectionTitle}>
                  2. Description of Service
                </Text>
                {'\n\n'}
                GenieApp is an AI-powered goal companion that helps you achieve
                your personal and professional objectives through intelligent task
                generation, progress tracking, and personalized notifications.
                {'\n\n'}
                <Text variant="h4" style={styles.sectionTitle}>
                  3. User Responsibilities
                </Text>
                {'\n\n'}• You are responsible for maintaining the confidentiality
                of your account
                {'\n'}• You must provide accurate and complete information
                {'\n'}• You agree to use the service in compliance with all
                applicable laws
                {'\n'}• You will not use the service for any unlawful or
                prohibited activities
                {'\n\n'}
                <Text variant="h4" style={styles.sectionTitle}>
                  4. Privacy and Data
                </Text>
                {'\n\n'}
                We respect your privacy and are committed to protecting your
                personal information. Your data is used solely to provide and
                improve our services.
                {'\n\n'}
                <Text variant="h4" style={styles.sectionTitle}>
                  5. Service Availability
                </Text>
                {'\n\n'}
                While we strive to maintain high service availability, we do not
                guarantee uninterrupted access to our service.
                {'\n\n'}
                <Text variant="h4" style={styles.sectionTitle}>
                  6. Limitation of Liability
                </Text>
                {'\n\n'}
                GenieApp shall not be liable for any indirect, incidental, special,
                or consequential damages arising from your use of the service.
                {'\n\n'}
                <Text variant="h4" style={styles.sectionTitle}>
                  7. Changes to Terms
                </Text>
                {'\n\n'}
                We reserve the right to modify these terms at any time. Continued
                use of the service constitutes acceptance of any changes.
                {'\n\n'}
                <Text variant="h4" style={styles.sectionTitle}>
                  8. Contact Information
                </Text>
                {'\n\n'}
                If you have any questions about these terms, please contact us at
                support@genie.app
              </Text>
            </ScrollView>
          </View>

          {/* Acceptance Checkbox */}
          <View style={styles.acceptanceSection}>
            <TouchableOpacity
              style={[
                styles.acceptanceButton,
                accepted && styles.acceptanceButtonActive,
              ]}
              onPress={() => setAccepted(!accepted)}
              activeOpacity={0.8}
            >
              <View style={styles.checkbox}>
                {accepted && (
                  <Icon name="check" size={14} color="#FFFF68" weight="fill" />
                )}
              </View>
              <Text
                variant="body"
                style={[
                  styles.acceptanceText,
                  accepted && styles.acceptanceTextActive,
                ]}
              >
                I accept the Terms & Conditions
              </Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !accepted && styles.continueButtonDisabled,
              ]}
              onPress={handleAccept}
              disabled={!accepted}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue to App</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              activeOpacity={0.8}
            >
              <Text style={styles.declineButtonText}>Decline & Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#FFFF68',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  termsContainer: {
    marginBottom: 20,
  },
  termsContent: {
    height: 280,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  termsText: {
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  sectionTitle: {
    color: '#FFFF68',
    fontWeight: '600',
    fontSize: 15,
    marginTop: 12,
    marginBottom: 8,
  },
  acceptanceSection: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  acceptanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 10,
  },
  acceptanceButtonActive: {
    borderColor: '#FFFF68',
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  acceptanceText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  acceptanceTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalActions: {
    padding: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  continueButton: {
    backgroundColor: '#FFFF68',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 104, 0.3)',
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  declineButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  declineButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
});
