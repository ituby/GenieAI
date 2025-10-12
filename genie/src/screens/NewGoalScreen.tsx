import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Text, Card, TextField, Icon, AILoadingModal } from '../components';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
import { useTheme } from '../theme/index';
import { useAuthStore } from '../store/useAuthStore';
import { useGoalStore } from '../store/useGoalStore';
import { GOAL_CATEGORIES } from '../config/constants';
import { GoalCategory } from '../types/goal';
import { supabase } from '../services/supabase/client';

interface NewGoalScreenProps {
  onGoalCreated?: () => void;
  onBack?: () => void;
}

export const NewGoalScreen: React.FC<NewGoalScreenProps> = ({
  onGoalCreated,
  onBack,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuthStore();
  const { createGoal, loading } = useGoalStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  
  // Animation for gradient
  const gradientAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start gradient animation loop
    const startGradientAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(gradientAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(gradientAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    startGradientAnimation();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Goal title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Goal title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Goal description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Goal description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      setIsCreatingPlan(true);
      setLoadingStep(1);

      // First create the goal
      const goal = await createGoal({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: 'custom',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      });

      console.log('✅ Goal created:', goal.id);
      setLoadingStep(2);

      // Then generate AI plan with detailed 21-day roadmap
      try {
        setLoadingStep(3);
        const response = await supabase.functions.invoke('generate-plan', {
          body: {
            user_id: user.id,
            goal_id: goal.id,
            category: 'custom',
            title: formData.title.trim(),
            description: formData.description.trim(),
            timezone: 'Asia/Jerusalem',
            language: 'en', // Default to English
            detailed_plan: true, // Request detailed 21-day roadmap
          },
        });

        if (response.error) {
          console.error('❌ Plan generation error:', response.error);
          setLoadingStep(7);
          setTimeout(() => {
            Alert.alert(
              'Goal Created Successfully!', 
              'Your goal has been created! Genie will create your personalized 21-day plan shortly.',
              [{ text: 'Continue', onPress: onGoalCreated }]
            );
          }, 1000);
        } else {
          setLoadingStep(4);
          const taskCount = response.data?.tasks?.length || 21;
          const rewardCount = response.data?.rewards?.length || 0;
          const iconName = response.data?.icon_name || 'star';
          
          console.log('✅ AI Plan generated:', { taskCount, rewardCount, iconName });
          
          // Update goal with AI-selected icon
          if (iconName && iconName !== 'star') {
            try {
              setLoadingStep(5);
              await supabase
                .from('goals')
                .update({ icon_name: iconName })
                .eq('id', goal.id);
              console.log('🎨 Updated goal with icon:', iconName);
            } catch (iconError) {
              console.warn('⚠️ Failed to update goal icon:', iconError);
            }
          }
          
          setLoadingStep(6);
          setTimeout(() => {
            Alert.alert(
              'Amazing! Your Goal is Ready! 🎉', 
              `Genie has created your personalized 21-day journey with ${taskCount} daily tasks, ${rewardCount} rewards, and smart notifications to keep you motivated!`,
              [{ text: 'Start My Journey', onPress: onGoalCreated }]
            );
          }, 1000);
        }
      } catch (planError) {
        console.error('❌ Failed to generate plan:', planError);
        Alert.alert(
          'Goal Created Successfully!', 
          'Your goal has been created! Genie will create your personalized plan shortly.',
          [{ text: 'Continue', onPress: onGoalCreated }]
        );
      }
    } catch (error: any) {
      console.error('❌ Goal creation error:', error);
      Alert.alert('Error', `Failed to create goal: ${error.message}`);
    } finally {
      setIsCreatingPlan(false);
      setLoadingStep(1);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Fixed Header */}
      <View style={styles.absoluteHeader}>
        {/* Blur overlay */}
        <View style={styles.blurOverlay} />
        {/* Additional blur effect */}
        <View style={styles.blurEffect} />
        {/* Extra blur layers */}
        <View style={styles.blurEffect2} />
        <View style={styles.blurEffect3} />
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
        <Text variant="h4" style={styles.largeTitle} numberOfLines={1}>Create Goal</Text>
        <View style={styles.spacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* Form */}
          <View style={styles.form}>
            <TextField
              label="What's your goal?"
              value={formData.title}
              onChangeText={(value) => updateField('title', value)}
              error={errors.title}
              placeholder="Learn Spanish"
              maxLength={100}
              inputStyle={styles.rightAlignedInput}
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              containerStyle={styles.darkInputContainer}
            />

            <TextField
              label="Describe your goal in detail"
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              error={errors.description}
              placeholder="Why is this important to you? How will you know you've succeeded?"
              multiline
              numberOfLines={6}
              maxLength={500}
              containerStyle={[styles.descriptionContainer, styles.darkInputContainer]}
              inputStyle={styles.rightAlignedInput}
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
            />

          </View>

          {/* AI Loading Modal */}
          <AILoadingModal
            visible={isCreatingPlan}
            currentStep={loadingStep}
            totalSteps={7}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Animated.View
              style={[
                styles.createButton,
                {
                  opacity: gradientAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.8, 1, 0.8],
                  }),
                  transform: [
                    {
                      scale: gradientAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.02, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                disabled={loading || isCreatingPlan}
                onPress={handleSubmit}
                activeOpacity={0.8}
                style={styles.createButtonTouchable}
              >
                <AnimatedLinearGradient
                  colors={[
                    gradientAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: ['#FFFF68', '#FFFFFF', '#FFFF68'],
                    }),
                    gradientAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: ['#FFFFFF', '#FFFF68', '#FFFFFF'],
                    }),
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createButtonGradient}
                >
                  <View style={styles.createButtonContent}>
                    {loading || isCreatingPlan ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Icon name="brain" size={20} color="#000000" weight="fill" />
                    )}
                    <Text style={styles.createButtonText}>
                      {isCreatingPlan ? 'Genie is Creating Your Plan...' : 'Create Plan with Genie'}
                    </Text>
                  </View>
                </AnimatedLinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Top safe area padding
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // Safe area padding
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: -1,
  },
  blurEffect: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 30,
    zIndex: -2,
  },
  blurEffect2: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 40,
    zIndex: -3,
  },
  blurEffect3: {
    position: 'absolute',
    top: -40,
    left: -40,
    right: -40,
    bottom: -40,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 50,
    zIndex: -4,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 100, // Space for absolute header
  },
  scrollContent: {
    paddingBottom: 20,
  },
  spacer: {
    width: 60, // Same width as back button for centering
  },
  backButton: {
    padding: 8,
  },
  largeTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  form: {
    padding: 20,
    gap: 20,
  },
  descriptionContainer: {
    minHeight: 120,
  },
  rightAlignedInput: {
    textAlign: 'left',
    fontSize: 14,
  },
  darkInputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  actions: {
    padding: 20,
  },
  createButton: {
    borderRadius: 12,
    width: '100%',
    overflow: 'hidden',
  },
  createButtonTouchable: {
    width: '100%',
  },
  createButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
