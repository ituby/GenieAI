import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// i18n removed
// import { LinearGradient } from 'expo-linear-gradient';
import { Button, Text, Icon, FireflyBackground } from '../components';
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
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [typedWords, setTypedWords] = useState<string[]>([]);
  const titleSlideAnim = useRef(new Animated.Value(80)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const descSlideAnim = useRef(new Animated.Value(0)).current;
  const descOpacity = useRef(new Animated.Value(0)).current;
  const wordOpacities = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    // Title slide up animation with mask effect (first slide only)
    Animated.parallel([
      Animated.timing(titleSlideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Fade in description area
      Animated.timing(descOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Start typing animation after description area fades in
        setTimeout(() => startTypingAnimation(), 300);
      });
    });
  }, []);

  const startTypingAnimation = () => {
    const line1 = 'Transform your dreams into reality';
    const line2 = 'with AI-powered guidance, one day at a time';
    const fullText = line1 + ' ' + line2;
    const words = fullText.split(' ');
    const line1WordCount = line1.split(' ').length;
    
    // Initialize opacity values for each word
    while (wordOpacities.length < words.length) {
      wordOpacities.push(new Animated.Value(0));
    }
    
    let currentWordIndex = 0;
    const displayedWords: string[] = [];

    const typeWord = () => {
      if (currentWordIndex < words.length) {
        // Add line break after first line
        if (currentWordIndex === line1WordCount) {
          displayedWords.push('\n');
        }
        displayedWords.push(words[currentWordIndex]);
        setTypedWords([...displayedWords]);
        
        // Fade in the current word
        Animated.timing(wordOpacities[currentWordIndex], {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
        
        currentWordIndex++;
        setTimeout(typeWord, 300); // 300ms delay between words (slower)
      }
    };

    typeWord();
  };

  const slides: OnboardingSlide[] = [
    {
      key: 'welcome',
      title: 'Genie Is Out',
      description: 'Transform your dreams into reality\nwith AI-powered guidance, one day at a time',
      icon: 'brain',
    },
    {
      key: 'slide1',
      title: 'Talk with Genie',
      description: 'Share your goals and aspirations with your AI genie',
      icon: 'sparkle',
    },
    {
      key: 'slide2',
      title: 'Get Your 21-Day Plan',
      description: 'Receive a personalized roadmap with daily actionable tasks',
      icon: 'calendar',
    },
    {
      key: 'slide3',
      title: 'Complete Daily Tasks',
      description: 'Stay on track with simple daily missions tailored to your goals',
      icon: 'clipboard-check',
    },
    {
      key: 'slide4',
      title: 'Track Your Progress',
      description: 'Monitor your streaks, achievements, and growth journey',
      icon: 'trend-up',
    },
    {
      key: 'slide5',
      title: 'Earn Rewards',
      description: 'Collect points and unlock achievements as you progress',
      icon: 'trophy',
    },
  ];

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  useEffect(() => {
    // Animate content when slide changes
    if (currentIndex > 0) {
      // Reset and animate for new slide
      titleSlideAnim.setValue(80);
      titleOpacity.setValue(0);
      descSlideAnim.setValue(0);
      descOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(titleSlideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Animate description after title
        Animated.parallel([
          Animated.timing(descSlideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(descOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [currentIndex]);

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      // Animate current content out
      Animated.parallel([
        Animated.timing(titleSlideAnim, {
          toValue: -80,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(descOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Scroll to next slide
        const nextIndex = currentIndex + 1;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * screenWidth,
          animated: true,
        });
      });
    } else {
      onComplete();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      // Animate current content out
      Animated.parallel([
        Animated.timing(titleSlideAnim, {
          toValue: -80,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(descOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Scroll to previous slide
        const prevIndex = currentIndex - 1;
        scrollViewRef.current?.scrollTo({
          x: prevIndex * screenWidth,
          animated: true,
        });
      });
    }
  };

  const renderSlide = (slide: OnboardingSlide, index: number) => (
    <View key={slide.key} style={styles.slide}>
      <View style={styles.slideContent}>
        {/* Logo appears on all slides */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/LogoSymbol.webp')} 
            style={styles.logoSymbolLarge}
            resizeMode="contain"
          />
        </View>
        {/* Title with slide animation */}
        <View style={{ overflow: 'hidden', height: 50 }}>
          <Animated.View
            style={{
              transform: [{ translateY: titleSlideAnim }],
              opacity: titleOpacity,
            }}
          >
            <Text variant="h1" style={styles.slideTitle}>
              {slide.title}
            </Text>
          </Animated.View>
        </View>

        {/* Description with fade animation */}
        {index === 0 ? (
          // First slide with typing animation
          <Animated.View 
            style={[
              styles.typingContainer,
              {
                opacity: descOpacity,
                transform: [{ translateY: descSlideAnim }],
              },
            ]}
          >
            <View style={styles.typingLine}>
              {typedWords.map((word, idx) => {
                if (word === '\n') {
                  return null;
                }
                const actualWordIdx = typedWords.slice(0, idx).filter(w => w !== '\n').length;
                return (
                  <Animated.Text
                    key={idx}
                    style={[
                      styles.typedWord,
                      {
                        opacity: wordOpacities[actualWordIdx] || 0,
                      },
                    ]}
                  >
                    {word + ' '}
                  </Animated.Text>
                );
              })}
            </View>
          </Animated.View>
        ) : (
          // Other slides with normal description
          <Animated.View
            style={{
              opacity: descOpacity,
              transform: [{ translateY: descSlideAnim }],
            }}
          >
            <Text variant="bodyLarge" 
                  color="secondary" 
                  style={styles.slideDescription}>
              {slide.description}
            </Text>
          </Animated.View>
        )}
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
      {/* Firefly Background Effect */}
      <FireflyBackground count={60} />

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
            Back
          </Button>
        )}

        <View style={styles.spacer} />

        {currentIndex < slides.length - 1 ? (
          <Button variant="primary" onPress={goToNext}>
            Next
          </Button>
        ) : (
          <Button variant="primary" onPress={onComplete}>
            Summon Genie
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
    maxWidth: 380,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    marginTop: -80,
  },
  logoSymbolLarge: {
    width: 60,
    height: 60,
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTitle: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 32,
  },
  firstSlideDescription: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 28,
  },
  typingContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  typingLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 380,
  },
  typedWord: {
    fontSize: 18,
    lineHeight: 28,
    color: '#FFFFFF',
    opacity: 0.7,
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
    fontSize: 18,
    lineHeight: 28,
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
