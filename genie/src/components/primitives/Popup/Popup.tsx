import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from '../../index';
import { colors } from '../../../theme/colors';

export interface PopupButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface PopupProps {
  visible: boolean;
  title?: string;
  message: string;
  buttons?: PopupButton[];
  onClose?: () => void;
  type?: 'alert' | 'confirmation';
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const Popup: React.FC<PopupProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', onPress: () => {} }],
  onClose,
  type = 'alert',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleButtonPress = (button: PopupButton) => {
    button.onPress();
    if (onClose) {
      onClose();
    }
  };

  const getButtonStyle = (style: PopupButton['style'] = 'default') => {
    switch (style) {
      case 'cancel':
        return [styles.button, styles.cancelButton];
      case 'destructive':
        return [styles.button, styles.destructiveButton];
      default:
        return [styles.button, styles.defaultButton];
    }
  };

  const getButtonTextStyle = (style: PopupButton['style'] = 'default') => {
    switch (style) {
      case 'cancel':
        return styles.cancelButtonText;
      case 'destructive':
        return styles.destructiveButtonText;
      default:
        return styles.defaultButtonText;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="dark" style={styles.fullScreenOverlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          <View style={styles.popup}>
            {/* Yellow Header */}
            <View style={styles.header}>
              <Text variant="h3" style={styles.headerTitle}>
                {title || 'Alert'}
              </Text>
            </View>
            
            <Text variant="body" style={styles.message}>
              {message}
            </Text>

            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    getButtonStyle(button.style),
                    buttons.length > 1 && index > 0 && styles.buttonWithBorder,
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.7}
                >
                  <Text style={getButtonTextStyle(button.style)}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 320,
  },
  popup: {
    backgroundColor: colors.background.card,
    borderRadius: 14,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#FFFF68',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    // Add a subtle gradient effect
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    // Add a subtle inner shadow effect
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    textAlign: 'center',
    color: '#000000',
    fontWeight: '700',
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWithBorder: {
    borderLeftWidth: 0.5,
    borderLeftColor: colors.border.primary,
  },
  defaultButton: {
    backgroundColor: 'transparent',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  destructiveButton: {
    backgroundColor: 'transparent',
  },
  defaultButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.primary,
  },
  destructiveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
