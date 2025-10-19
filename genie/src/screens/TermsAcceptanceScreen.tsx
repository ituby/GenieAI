import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, Button, Card } from '../components';
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
      'You must accept the terms and conditions to use GenieAI. Would you like to review them again?',
      [
        { text: 'Review Again', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: onDecline },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" padding="lg" style={styles.card}>
          <View style={styles.header}>
            <Text variant="h1" style={styles.title}>
              Terms & Conditions
            </Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              Please read and accept our terms to continue
            </Text>
          </View>

          <ScrollView
            style={styles.termsContent}
            showsVerticalScrollIndicator={true}
          >
            <Text variant="body" style={styles.termsText}>
              <Text variant="h3" style={styles.sectionTitle}>
                1. Acceptance of Terms
              </Text>
              {'\n\n'}
              By using GenieAI, you agree to be bound by these Terms and
              Conditions. If you do not agree to these terms, please do not use
              our service.
              {'\n\n'}
              <Text variant="h3" style={styles.sectionTitle}>
                2. Description of Service
              </Text>
              {'\n\n'}
              GenieAI is an AI-powered goal companion that helps you achieve
              your personal and professional objectives through intelligent task
              generation, progress tracking, and personalized notifications.
              {'\n\n'}
              <Text variant="h3" style={styles.sectionTitle}>
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
              <Text variant="h3" style={styles.sectionTitle}>
                4. Privacy and Data
              </Text>
              {'\n\n'}
              We respect your privacy and are committed to protecting your
              personal information. Your data is used solely to provide and
              improve our services.
              {'\n\n'}
              <Text variant="h3" style={styles.sectionTitle}>
                5. Service Availability
              </Text>
              {'\n\n'}
              While we strive to maintain high service availability, we do not
              guarantee uninterrupted access to our service.
              {'\n\n'}
              <Text variant="h3" style={styles.sectionTitle}>
                6. Limitation of Liability
              </Text>
              {'\n\n'}
              GenieAI shall not be liable for any indirect, incidental, special,
              or consequential damages arising from your use of the service.
              {'\n\n'}
              <Text variant="h3" style={styles.sectionTitle}>
                7. Changes to Terms
              </Text>
              {'\n\n'}
              We reserve the right to modify these terms at any time. Continued
              use of the service constitutes acceptance of any changes.
              {'\n\n'}
              <Text variant="h3" style={styles.sectionTitle}>
                8. Contact Information
              </Text>
              {'\n\n'}
              If you have any questions about these terms, please contact us at
              support@genie.app
            </Text>
          </ScrollView>

          <View style={styles.acceptanceSection}>
            <Button
              variant={accepted ? 'primary' : 'outline'}
              fullWidth
              onPress={() => setAccepted(!accepted)}
              style={styles.acceptanceButton}
            >
              {accepted ? '✓ Terms Accepted' : 'Accept Terms & Conditions'}
            </Button>
          </View>

          <View style={styles.actions}>
            <Button
              variant="primary"
              fullWidth
              onPress={handleAccept}
              style={styles.continueButton}
            >
              Continue to App
            </Button>

            <Button
              variant="ghost"
              fullWidth
              onPress={handleDecline}
              style={styles.declineButton}
            >
              Decline & Exit
            </Button>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: '#FFFF68',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  termsContent: {
    maxHeight: 300,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  termsText: {
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#FFFF68',
    marginTop: 16,
    marginBottom: 8,
  },
  acceptanceSection: {
    marginBottom: 24,
  },
  acceptanceButton: {
    marginBottom: 16,
  },
  actions: {
    gap: 12,
  },
  continueButton: {
    marginBottom: 8,
  },
  declineButton: {
    paddingHorizontal: 0,
  },
});
