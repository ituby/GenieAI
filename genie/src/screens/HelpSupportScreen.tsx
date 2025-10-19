import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/index';
import { Text } from '../components/primitives/Text';
import { Card } from '../components/primitives/Card';
import { Icon } from '../components/primitives/Icon';
import { Button } from '../components/primitives/Button';
import { TextField } from '../components/primitives/Input';
import { supabase } from '../services/supabase/client';
import { useAuthStore } from '../store/useAuthStore';

interface HelpRequest {
  id: string;
  type: 'question' | 'bug_report' | 'feature_request' | 'general';
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const HelpSupportScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'requests'>('faq');
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    type: 'question' as const,
    subject: '',
    message: '',
  });

  useEffect(() => {
    fetchFAQ();
    if (user?.id) {
      fetchHelpRequests();
    }
  }, [user?.id]);

  const fetchFAQ = async () => {
    // Mock FAQ data - in a real app, this would come from a database
    const mockFAQ: FAQItem[] = [
      {
        id: '1',
        question: 'How do I create a new goal?',
        answer: 'Tap the "Add Goal" button on the dashboard, fill in the details, and let Genie AI create a personalized 21-day plan for you.',
        category: 'Getting Started',
      },
      {
        id: '2',
        question: 'Can I edit my goals after creating them?',
        answer: 'Currently, you can pause or complete goals. Full editing functionality is coming in a future update.',
        category: 'Goals',
      },
      {
        id: '3',
        question: 'How does the AI plan generation work?',
        answer: 'Our AI analyzes your goal description and creates a progressive 21-day plan with 3 daily tasks, tailored to your specific needs.',
        category: 'AI Features',
      },
      {
        id: '4',
        question: 'What happens if I miss a task?',
        answer: 'Don\'t worry! You can always catch up. The app tracks your progress and adjusts recommendations based on your completion rate.',
        category: 'Tasks',
      },
      {
        id: '5',
        question: 'How do I get rewards?',
        answer: 'Rewards are automatically unlocked as you complete tasks and reach milestones. Check your goal details to see available rewards.',
        category: 'Rewards',
      },
      {
        id: '6',
        question: 'Can I use the app offline?',
        answer: 'The app requires an internet connection for AI features and data sync. Basic viewing works offline, but new content requires connectivity.',
        category: 'Technical',
      },
    ];
    setFaqItems(mockFAQ);
    setLoading(false);
  };

  const fetchHelpRequests = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('help_support')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHelpRequests(data || []);
    } catch (error) {
      console.error('Error fetching help requests:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFAQ(), fetchHelpRequests()]);
    setRefreshing(false);
  };

  const submitHelpRequest = async () => {
    if (!user?.id) return;
    
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('help_support')
        .insert([{
          user_id: user.id,
          type: contactForm.type,
          subject: contactForm.subject,
          message: contactForm.message,
          status: 'open',
          priority: 'medium',
        }]);

      if (error) throw error;

      Alert.alert('Success', 'Your request has been submitted. We\'ll get back to you soon!');
      setContactForm({ type: 'question', subject: '', message: '' });
      setShowContactForm(false);
      fetchHelpRequests();
    } catch (error) {
      console.error('Error submitting help request:', error);
      Alert.alert('Error', 'Failed to submit request');
    }
  };

  const openEmail = () => {
    const email = 'support@genieapp.com';
    const subject = 'Genie App Support';
    const body = 'Hi,\n\nI need help with:\n\n';
    
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: theme.colors.yellow[500],
      in_progress: theme.colors.primary[500],
      resolved: theme.colors.status.success,
      closed: theme.colors.text.disabled,
    };
    return colors[status as keyof typeof colors] || theme.colors.text.secondary;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: theme.colors.status.success,
      medium: theme.colors.yellow[500],
      high: theme.colors.status.warning,
      urgent: theme.colors.status.error,
    };
    return colors[priority as keyof typeof colors] || theme.colors.text.secondary;
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Absolute Header */}
        <View style={styles.absoluteHeader}>
          <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Icon name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerCenter}>
            <Text variant="h4" style={styles.title} numberOfLines={1}>Help & Support</Text>
          </View>
          
          <View style={styles.headerRight}>
            {/* Empty for balance */}
          </View>
        </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.yellow[500]}
          />
        }
      >
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
            onPress={() => setActiveTab('faq')}
          >
            <Text variant="body" color={activeTab === 'faq' ? 'primary-color' : 'secondary'}>
              FAQ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'contact' && styles.activeTab]}
            onPress={() => setActiveTab('contact')}
          >
            <Text variant="body" color={activeTab === 'contact' ? 'primary-color' : 'secondary'}>
              Contact
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text variant="body" color={activeTab === 'requests' ? 'primary-color' : 'secondary'}>
              My Requests
            </Text>
          </TouchableOpacity>
        </View>
        {activeTab === 'faq' && (
          <View>
            {faqItems.map((item) => (
              <Card key={item.id} variant="gradient" padding="md" style={styles.faqCard}>
                <Text variant="h4" color="primary-color" style={styles.faqQuestion}>
                  {item.question}
                </Text>
                <Text variant="caption" color="secondary" style={styles.faqAnswer}>
                  {item.answer}
                </Text>
                <Text variant="caption" color="tertiary" style={styles.faqCategory}>
                  {item.category}
                </Text>
              </Card>
            ))}
          </View>
        )}

        {activeTab === 'contact' && (
          <View>
            {!showContactForm ? (
              <Card variant="gradient" padding="lg" style={styles.contactCard}>
                <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
                  Get in Touch
                </Text>
                <Text variant="body" color="secondary" style={styles.contactDescription}>
                  Need help? We're here for you! Choose how you'd like to contact us.
                </Text>
                <View style={styles.contactOptions}>
                  <TouchableOpacity style={styles.contactOption} onPress={openEmail}>
                    <Icon name="envelope" size={24} color={theme.colors.yellow[500]} />
                    <Text variant="body" color="primary-color">Email Support</Text>
                    <Text variant="caption" color="secondary">support@genieapp.com</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.contactOption} 
                    onPress={() => setShowContactForm(true)}
                  >
                    <Icon name="chat-circle" size={24} color={theme.colors.yellow[500]} />
                    <Text variant="body" color="primary-color">Submit Request</Text>
                    <Text variant="caption" color="secondary">Get help through our system</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ) : (
              <Card variant="gradient" padding="lg" style={styles.contactCard}>
                <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
                  Submit Request
                </Text>
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text variant="body" color="secondary" style={styles.inputLabel}>
                      Type
                    </Text>
                    <View style={styles.typeOptions}>
                      {['question', 'bug_report', 'feature_request', 'general'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeOption,
                            contactForm.type === type && styles.selectedTypeOption
                          ]}
                          onPress={() => setContactForm(prev => ({ ...prev, type: type as any }))}
                        >
                          <Text variant="caption" color={contactForm.type === type ? 'primary-color' : 'secondary'}>
                            {type.replace('_', ' ').toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text variant="body" color="secondary" style={styles.inputLabel}>
                      Subject
                    </Text>
                    <TextField
                      value={contactForm.subject}
                      onChangeText={(text: string) => setContactForm(prev => ({ ...prev, subject: text }))}
                      placeholder="Brief description of your issue"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text variant="body" color="secondary" style={styles.inputLabel}>
                      Message
                    </Text>
                    <TextField
                      value={contactForm.message}
                      onChangeText={(text: string) => setContactForm(prev => ({ ...prev, message: text }))}
                      placeholder="Describe your issue in detail..."
                      multiline
                      numberOfLines={4}
                      inputStyle={styles.messageInput}
                    />
                  </View>
                  <View style={styles.formActions}>
                    <Button variant="ghost" onPress={() => setShowContactForm(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onPress={submitHelpRequest}>
                      Submit
                    </Button>
                  </View>
                </View>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'requests' && (
          <View>
            {helpRequests.length === 0 ? (
              <Card variant="gradient" padding="lg" style={styles.emptyCard}>
                <View style={styles.emptyContainer}>
                  <Icon name="chat-circle" size={48} color={theme.colors.text.disabled} />
                  <Text variant="h4" color="secondary" style={styles.emptyTitle}>
                    No Requests
                  </Text>
                  <Text variant="body" color="tertiary" style={styles.emptyDescription}>
                    You haven't submitted any support requests yet.
                  </Text>
                </View>
              </Card>
            ) : (
              helpRequests.map((request) => (
                <Card key={request.id} variant="gradient" padding="md" style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text variant="h4" color="primary-color" style={styles.requestSubject}>
                      {request.subject}
                    </Text>
                    <View style={styles.requestMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                        <Text variant="caption" style={{ color: getStatusColor(request.status) }}>
                          {request.status.toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(request.priority) + '20' }]}>
                        <Text variant="caption" style={{ color: getPriorityColor(request.priority) }}>
                          {request.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text variant="body" color="secondary" style={styles.requestMessage}>
                    {request.message}
                  </Text>
                  <Text variant="caption" color="tertiary" style={styles.requestDate}>
                    Submitted {new Date(request.created_at).toLocaleDateString()}
                  </Text>
                </Card>
              ))
            )}
          </View>
        )}
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
  scrollView: {
    flex: 1,
    paddingTop: 80,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
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
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: 'rgba(26, 28, 36, 0.8)',
    minHeight: 110,
    overflow: 'hidden',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 8,
  },
  title: {
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 104, 0.2)',
    borderWidth: 1,
    borderColor: '#FFFF68',
  },
  faqCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  faqQuestion: {
    marginBottom: 8,
  },
  faqAnswer: {
    marginBottom: 8,
    lineHeight: 20,
    fontSize: 13,
  },
  faqCategory: {
    alignSelf: 'flex-start',
  },
  contactCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  contactDescription: {
    marginBottom: 20,
    lineHeight: 20,
  },
  contactOptions: {
    gap: 16,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    gap: 12,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontWeight: '600',
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectedTypeOption: {
    backgroundColor: 'rgba(255, 255, 104, 0.2)',
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  emptyCard: {
    marginTop: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestSubject: {
    flex: 1,
    marginRight: 12,
  },
  requestMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requestMessage: {
    marginBottom: 8,
    lineHeight: 20,
  },
  requestDate: {
    alignSelf: 'flex-end',
  },
});
