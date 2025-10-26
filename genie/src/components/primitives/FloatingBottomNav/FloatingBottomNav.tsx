import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Text,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Icon } from '../Icon';
import { useTheme } from '../../../theme';

interface FloatingBottomNavProps {
  onHomePress: () => void;
  onMyPlansPress: () => void;
  onDailyGoalsPress: () => void;
  onCreatePress: () => void;
  activeTab?: 'home' | 'plans' | 'goals' | 'create';
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  onHomePress,
  onMyPlansPress,
  onDailyGoalsPress,
  onCreatePress,
  activeTab = 'home',
}) => {
  const theme = useTheme();

  const navItems = [
    {
      id: 'home',
      icon: 'house',
      label: 'Home',
      onPress: onHomePress,
    },
    {
      id: 'plans',
      icon: 'target',
      label: 'Plans',
      onPress: onMyPlansPress,
    },
    {
      id: 'goals',
      icon: 'calendar',
      label: 'Tasks',
      onPress: onDailyGoalsPress,
    },
    {
      id: 'create',
      icon: 'sparkle',
      label: 'Genie',
      onPress: onCreatePress,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Outer gradient border wrapper */}
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.12)',
          'rgba(255, 255, 255, 0.1)',
          'rgba(255, 255, 255, 0.07)',
          'rgba(255, 255, 255, 0.05)',
          'rgba(255, 255, 255, 0.05)',
          'rgba(255, 255, 255, 0.07)',
          'rgba(255, 255, 255, 0.1)',
          'rgba(255, 255, 255, 0.12)',
        ]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        locations={[0, 0.15, 0.25, 0.35, 0.65, 0.75, 0.85, 1]}
        style={styles.gradientBorderWrapper}
      >
        <View style={styles.navBarWrapper}>
          <BlurView 
            intensity={Platform.OS === 'android' ? 20 : 60} 
            tint="dark" 
            style={styles.navBar}
          >
            {navItems.map((item, index) => (
              <View key={item.id} style={styles.navItemContainer}>
                {/* Background indicator - only show for active item */}
                {activeTab === item.id && (
                  <View style={styles.activeIndicator} />
                )}

                <TouchableOpacity
                  onPress={item.onPress}
                  style={styles.navItem}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    color={
                      item.id === 'create'
                        ? '#FFFF68'
                        : activeTab === item.id
                          ? '#FFFFFF'
                          : 'rgba(255, 255, 255, 0.3)'
                    }
                    weight={activeTab === item.id ? 'regular' : 'regular'}
                  />
                  {activeTab !== item.id && (
                    <Text
                      style={[
                        styles.navItemLabel,
                        {
                          color:
                            item.id === 'create'
                              ? '#FFFF68'
                              : 'rgba(255, 255, 255, 0.3)',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </BlurView>
        </View>
      </LinearGradient>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30, // Increased bottom padding
    left: 40,
    right: 40,
    zIndex: 1000,
  },
  navBarWrapper: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  gradientBorderWrapper: {
    borderRadius: 50,
    padding: 1,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12, // Reduced horizontal padding
    backgroundColor: Platform.OS === 'android' ? 'rgba(10, 10, 15, 0.98)' : 'rgba(0, 0, 0, 0.4)',
    borderRadius: 48,
  },
  navItemContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navItem: {
    padding: 8,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  navItemLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: -3,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 104, 0.2)',
    borderRadius: 20,
    zIndex: 0,
  },
});
