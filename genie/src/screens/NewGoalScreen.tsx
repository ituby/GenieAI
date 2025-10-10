import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text, Card, TextField, Icon } from '../components';
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
    category: 'lifestyle' as GoalCategory,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categoryOptions = [
    { key: 'lifestyle', label: 'Lifestyle', icon: 'heart', color: theme.colors.blue[500] },
    { key: 'career', label: 'Career', icon: 'briefcase', color: theme.colors.purple[500] },
    { key: 'mindset', label: 'Mindset', icon: 'brain', color: theme.colors.green[500] },
    { key: 'character', label: 'Character', icon: 'sparkle', color: theme.colors.purple[400] },
    { key: 'custom', label: 'Custom', icon: 'target', color: theme.colors.text.secondary },
  ];

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
      // Show loading state
      Alert.alert(
        'Creating Your Goal...',
        'Genie is analyzing your goal and creating a personalized 21-day plan with daily tasks, rewards, and smart notifications.',
        [],
        { cancelable: false }
      );

      // First create the goal
      const goal = await createGoal({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      });

      console.log('✅ Goal created:', goal.id);

      // Then generate AI plan with detailed 21-day roadmap
      try {
        const response = await supabase.functions.invoke('generate-plan', {
          body: {
            user_id: user.id,
            goal_id: goal.id,
            category: formData.category,
            title: formData.title.trim(),
            description: formData.description.trim(),
            timezone: 'Asia/Jerusalem',
            language: 'en', // Default to English
            detailed_plan: true, // Request detailed 21-day roadmap
          },
        });

        if (response.error) {
          console.error('❌ Plan generation error:', response.error);
          Alert.alert(
            'Goal Created Successfully!', 
            'Your goal has been created! Genie will create your personalized 21-day plan shortly.',
            [{ text: 'Continue', onPress: onGoalCreated }]
          );
        } else {
          const taskCount = response.data?.tasks?.length || 21;
          const rewardCount = response.data?.rewards?.length || 0;
          
          console.log('✅ AI Plan generated:', { taskCount, rewardCount });
          
          Alert.alert(
            'Amazing! Your Goal is Ready! 🎉', 
            `Genie has created your personalized 21-day journey with ${taskCount} daily tasks, ${rewardCount} rewards, and smart notifications to keep you motivated!`,
            [{ text: 'Start My Journey', onPress: onGoalCreated }]
          );
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Button 
                variant="ghost" 
                onPress={onBack}
                leftIcon={<Icon name="arrow-left" size={18} color={theme.colors.text.secondary} />}
              >
                Back
              </Button>
              <Text variant="h2">New Goal</Text>
              <View style={styles.spacer} />
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextField
              label="What's your goal?"
              value={formData.title}
              onChangeText={(value) => updateField('title', value)}
              error={errors.title}
              placeholder="e.g., Learn Spanish"
              maxLength={100}
            />

            <TextField
              label="Describe your goal in detail"
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              error={errors.description}
              placeholder="Why is this important to you? How will you know you've succeeded? Genie will create a personalized 21-day plan with daily tasks"
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            {/* Category Selection */}
            <View style={styles.categorySection}>
              <Text variant="label" style={styles.categoryLabel}>
                Choose Category
              </Text>
              
              <View style={styles.categoryGrid}>
                {categoryOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.categoryCard,
                      {
                        borderColor: formData.category === option.key 
                          ? option.color 
                          : theme.colors.border.primary,
                        backgroundColor: formData.category === option.key 
                          ? option.color + '20' 
                          : theme.colors.background.secondary,
                      }
                    ]}
                    onPress={() => updateField('category', option.key)}
                  >
                    <Icon 
                      name={option.icon as any}
                      size={24}
                      color={formData.category === option.key ? option.color : theme.colors.text.secondary}
                    />
                    <Text 
                      variant="caption" 
                      style={[
                        styles.categoryText,
                        { color: formData.category === option.key ? option.color : theme.colors.text.secondary }
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              variant="primary"
              fullWidth
              loading={loading}
              onPress={handleSubmit}
              size="lg"
              leftIcon={<Icon name="brain" size={20} color={theme.colors.text.primary} />}
            >
              Create Plan with Genie
            </Button>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: {
    width: 60, // Same width as back button for centering
  },
  form: {
    padding: 20,
    gap: 20,
  },
  categorySection: {
    gap: 12,
  },
  categoryLabel: {
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    padding: 20,
  },
});
