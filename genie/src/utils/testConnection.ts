import { supabase } from '../services/supabase/client';

export const testDatabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
    
    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return false;
  }
};

export const createTestUser = async () => {
  try {
    console.log('👤 Creating test user...');
    
    const { data, error } = await supabase.auth.signUp({
      email: 'test@genie.app',
      password: 'testpassword123',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
    
    if (error) {
      console.error('❌ Test user creation failed:', error);
      return null;
    }
    
    console.log('✅ Test user created:', data.user?.email);
    return data.user;
  } catch (error) {
    console.error('❌ Test user creation error:', error);
    return null;
  }
};

export const createSampleGoals = async (userId: string) => {
  try {
    console.log('🎯 Creating sample goals...');
    
    const sampleGoals = [
      {
        user_id: userId,
        category: 'lifestyle',
        title: 'Learn Spanish',
        description: 'I want to become conversational in Spanish within 3 months to communicate better with Spanish-speaking colleagues.',
        status: 'active'
      },
      {
        user_id: userId,
        category: 'career',
        title: 'Get Promoted',
        description: 'I want to get promoted to Senior Developer by improving my technical skills and leadership abilities.',
        status: 'active'
      },
      {
        user_id: userId,
        category: 'mindset',
        title: 'Build Confidence',
        description: 'I want to build more self-confidence in social situations and public speaking.',
        status: 'active'
      }
    ];
    
    const { data, error } = await supabase
      .from('goals')
      .insert(sampleGoals)
      .select();
    
    if (error) {
      console.error('❌ Sample goals creation failed:', error);
      return [];
    }
    
    console.log('✅ Sample goals created:', data.length);
    return data;
  } catch (error) {
    console.error('❌ Sample goals creation error:', error);
    return [];
  }
};

