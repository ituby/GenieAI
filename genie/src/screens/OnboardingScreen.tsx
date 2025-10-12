import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
// import { LinearGradient } from 'expo-linear-gradient';
import { Button, Text, Icon } from '../components';
import { useTheme } from '../theme/index';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingSlide {
  key: string;
  title: string;
  description: string;
  icon: string;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const slides: OnboardingSlide[] = [
    {
      key: 'welcome',
      title: t('onboarding.welcome'),
      description: t('onboarding.description'),
      icon: 'brain',
    },
    {
      key: 'slide1',
      title: t('onboarding.slide1Title'),
      description: t('onboarding.slide1Description'),
      icon: 'sparkle',
    },
    {
      key: 'slide2',
      title: t('onboarding.slide2Title'),
      description: t('onboarding.slide2Description'),
      icon: 'clipboard-text',
    },
    {
      key: 'slide3',
      title: t('onboarding.slide3Title'),
      description: t('onboarding.slide3Description'),
      icon: 'trend-up',
    },
  ];

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setCurrentIndex(index);
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * screenWidth,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      onComplete();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      scrollViewRef.current?.scrollTo({
        x: prevIndex * screenWidth,
        animated: true,
      });
      setCurrentIndex(prevIndex);
    }
  };

  const renderSlide = (slide: OnboardingSlide, index: number) => (
    <View key={slide.key} style={styles.slide}>
      <View style={styles.slideContent}>
        {index === 0 ? (
          // First slide with logo
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/LogoSymbol.webp')} 
              style={styles.logoSymbol}
              resizeMode="contain"
            />
            <Image 
              source={require('../../assets/LogoType.webp')} 
              style={styles.logoType}
              resizeMode="contain"
            />
          </View>
        ) : (
          // Other slides with icon
          <View style={styles.iconContainer}>
            <Icon 
              name={slide.icon as any}
              size={80}
              color={theme.colors.yellow[500]}
              weight="duotone"
            />
          </View>
        )}
        <Text variant="h1" style={styles.slideTitle}>
          {t(slide.title)}
        </Text>
        <Text variant={index === 0 ? 'caption' : 'bodyLarge'} 
              color={index === 0 ? undefined : 'secondary'} 
              style={index === 0 ? styles.slideSubtitle : styles.slideDescription}>
          {t(slide.description)}
        </Text>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      {slides.map((_, index) => {
        const inputRange = [
          (index - 1) * screenWidth,
          index * screenWidth,
          (index + 1) * screenWidth,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.paginationDot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: theme.colors.yellow[500],
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false, listener: handleScroll }
        )}
        scrollEventThrottle={16}
      >
        {slides.map(renderSlide)}
      </ScrollView>

      {renderPagination()}

      <View style={styles.navigation}>
        {currentIndex > 0 && (
          <Button variant="ghost" onPress={goToPrevious}>
            {t('common.back')}
          </Button>
        )}

        <View style={styles.spacer} />

        {currentIndex < slides.length - 1 ? (
          <Button variant="primary" onPress={goToNext}>
            {t('common.next')}
          </Button>
        ) : (
          <Button variant="primary" onPress={onComplete}>
            {t('onboarding.summonGenie')}
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  slideContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoSymbol: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  logoType: {
    width: 120,
    height: 32,
    marginBottom: 4,
  },
  iconContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  slideSubtitle: {
    textAlign: 'center',
    color: '#FFFFFF',
    opacity: 0.7,
    fontSize: 12,
    lineHeight: 16,
  },
  slideDescription: {
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  spacer: {
    flex: 1,
  },
});
