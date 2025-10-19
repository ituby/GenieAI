import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../Text/Text';
import { useTheme } from '../../../theme';

interface PasswordStrengthMeterProps {
  password: string;
  showInstructions?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showInstructions = true,
}) => {
  const theme = useTheme();

  const calculateStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    Object.values(checks).forEach((check) => {
      if (check) score++;
    });

    return { score, checks };
  };

  const getStrengthLevel = (score: number) => {
    if (score <= 2) return { level: 'weak', color: '#ff4444', label: 'Weak' };
    if (score <= 3) return { level: 'fair', color: '#ffaa00', label: 'Fair' };
    if (score <= 4) return { level: 'good', color: '#88cc00', label: 'Good' };
    return { level: 'strong', color: '#00aa44', label: 'Strong' };
  };

  const { score, checks } = calculateStrength(password);
  const { level, color, label } = getStrengthLevel(score);

  const strengthBarWidth = (score / 5) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.strengthBar}>
        <View
          style={[
            styles.strengthFill,
            {
              width: `${strengthBarWidth}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      
      <View style={styles.strengthInfo}>
        <Text variant="caption" style={[styles.strengthLabel, { color }]}>
          Password Strength: {label}
        </Text>
      </View>

      {showInstructions && (
        <View style={styles.instructions}>
          <Text variant="caption" style={styles.instructionsTitle}>
            For a strong password, include:
          </Text>
          <View style={styles.requirements}>
            <RequirementItem
              text="At least 8 characters"
              met={checks.length}
              theme={theme}
            />
            <RequirementItem
              text="Lowercase letters (a-z)"
              met={checks.lowercase}
              theme={theme}
            />
            <RequirementItem
              text="Uppercase letters (A-Z)"
              met={checks.uppercase}
              theme={theme}
            />
            <RequirementItem
              text="Numbers (0-9)"
              met={checks.numbers}
              theme={theme}
            />
            <RequirementItem
              text="Special characters (!@#$%^&*)"
              met={checks.symbols}
              theme={theme}
            />
          </View>
        </View>
      )}
    </View>
  );
};

interface RequirementItemProps {
  text: string;
  met: boolean;
  theme: any;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ text, met, theme }) => (
  <View style={styles.requirementItem}>
    <View
      style={[
        styles.checkmark,
        {
          backgroundColor: met ? '#00aa44' : theme.colors.text.tertiary,
        },
      ]}
    >
      <Text style={styles.checkmarkText}>✓</Text>
    </View>
    <Text
      variant="caption"
      style={[
        styles.requirementText,
        {
          color: met ? theme.colors.text.primary : theme.colors.text.tertiary,
        },
      ]}
    >
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthInfo: {
    marginBottom: 12,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  instructions: {
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 11,
    marginBottom: 8,
    opacity: 0.8,
  },
  requirements: {
    gap: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkmark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  requirementText: {
    fontSize: 11,
    flex: 1,
  },
});

