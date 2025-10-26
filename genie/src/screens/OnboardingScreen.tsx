import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Image,
  Text as RNText,
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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Clear previous text immediately for smooth transition
    setTypedWords([]);
    
    // Reset all word opacities
    wordOpacities.forEach(opacity => opacity.setValue(0));
    
    // Reset animations
    titleSlideAnim.setValue(80);
    titleOpacity.setValue(0);
    descSlideAnim.setValue(0);
    descOpacity.setValue(0);

    // Animate title
    Animated.parallel([
      Animated.timing(titleSlideAnim, {
        toValue: 0,
        duration: currentIndex === 0 ? 1000 : 600,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: currentIndex === 0 ? 1000 : 600,
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
        setTimeout(() => startTypingAnimation(currentIndex), 300);
      });
    });
  }, [currentIndex]);

  const startTypingAnimation = (slideIndex: number) => {
    // Get the current slide's description
    const currentDescription = slides[slideIndex].description;
    
    // Split by newlines first, then split each line by spaces
    const lines = currentDescription.split('\n');
    const wordsWithBreaks: string[] = [];
    
    lines.forEach((line, lineIndex) => {
      const lineWords = line.split(' ').filter(w => w.length > 0);
      wordsWithBreaks.push(...lineWords);
      // Add line break after each line except the last
      if (lineIndex < lines.length - 1) {
        wordsWithBreaks.push('\n');
      }
    });
    
    // Set all words immediately (no typing effect)
    setTypedWords(wordsWithBreaks);
    
    // Initialize opacity values for each word if needed (excluding line breaks)
    const actualWordCount = wordsWithBreaks.filter(w => w !== '\n').length;
    while (wordOpacities.length < actualWordCount) {
      wordOpacities.push(new Animated.Value(0));
    }
    
    let currentWordIndex = 0;
    let actualWordIndex = 0;

    const fadeInWord = () => {
      if (currentWordIndex < wordsWithBreaks.length) {
        // Skip line breaks in animation
        if (wordsWithBreaks[currentWordIndex] === '\n') {
          currentWordIndex++;
          fadeInWord();
          return;
        }
        
        // Fade in the current word
        Animated.timing(wordOpacities[actualWordIndex], {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
        
        currentWordIndex++;
        actualWordIndex++;
        typingTimeoutRef.current = setTimeout(fadeInWord, 300); // 300ms delay between words
      }
    };

    fadeInWord();
  };

  const slides: OnboardingSlide[] = [
    {
      key: 'welcome',
      title: 'Genie Is Out',
      description: 'Transform your dreams into reality\nwith AI-powered guidance,\none day at a time',
      icon: 'brain',
    },
    {
      key: 'slide1',
      title: 'Talk with Genie',
      description: 'Share your goals and aspirations\nwith your AI genie',
      icon: 'sparkle',
    },
    {
      key: 'slide2',
      title: 'Get Your 21-Day Plan',
      description: 'Receive a personalized roadmap\nwith daily actionable tasks',
      icon: 'calendar',
    },
    {
      key: 'slide3',
      title: 'Complete Daily Tasks',
      description: 'Stay on track with simple\ndaily missions tailored\nto your goals',
      icon: 'clipboard-check',
    },
    {
      key: 'slide4',
      title: 'Track Your Progress',
      description: 'Monitor your streaks,\nachievements, and growth journey',
      icon: 'trend-up',
    },
    {
      key: 'slide5',
      title: 'Earn Rewards',
      description: 'Collect points and unlock\nachievements as you progress',
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
        {/* Title with slide animation and yellow marker highlight */}
        <View style={{ overflow: 'hidden', height: 44, alignItems: 'center', marginBottom: 4 }}>
          <Animated.View
            style={{
              transform: [{ translateY: titleSlideAnim }],
              opacity: titleOpacity,
            }}
          >
            <View style={styles.titleWrapper}>
              {/* Yellow marker background */}
              <View style={[styles.titleHighlightBackground, { backgroundColor: theme.colors.yellow[500] }]} />
              {/* Dark text on yellow marker */}
              <RNText style={styles.titleTextOnMarker}>
                {slide.title}
              </RNText>
            </View>
          </Animated.View>
        </View>

        {/* Description with word-by-word typing animation for all slides - Fixed height to prevent jumping */}
        <View style={styles.descriptionFixedContainer}>
          {index === currentIndex && (
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
                    return <View key={idx} style={{ width: '100%', height: 0 }} />;
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
          )}
        </View>
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
  titleWrapper: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleHighlightBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  titleTextOnMarker: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    color: 'rgba(20, 20, 40, 0.85)',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 0,
  },
  descriptionFixedContainer: {
    minHeight: 120,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  firstSlideDescription: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 28,
  },
  typingContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  typingLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 380,
    rowGap: 0,
  },
  typedWord: {
    fontSize: 18,
    lineHeight: 24,
    color: '#FFFFFF',
    opacity: 0.7,
    letterSpacing: -0.5,
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
