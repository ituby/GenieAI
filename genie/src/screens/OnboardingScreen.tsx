import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Image,
  Text as RNText,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// i18n removed
// import { LinearGradient } from 'expo-linear-gradient';
import { Button, Text, Icon, FireflyBackground, Card, TextField } from '../components';
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
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoPosition = useRef(new Animated.Value(0)).current; // 0 = center, 1 = top
  const logoBreathing = useRef(new Animated.Value(1)).current;
  const demoSlideIn = useRef(new Animated.Value(0)).current;
  const demoOpacity = useRef(new Animated.Value(0)).current;
  const taskScrollViewRef = useRef<ScrollView>(null);
  const [promptText, setPromptText] = useState('');
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [logoAnimated, setLogoAnimated] = useState(false);
  const [currentLogoPosition, setCurrentLogoPosition] = useState(0); // Track logo position
  const [outlineProgress, setOutlineProgress] = useState([0, 0, 0]);
  const [checkedTasks, setCheckedTasks] = useState([false, false, false, false, false, false]);
  const [statValues, setStatValues] = useState([0, 0, 0]);
  const [unlockedRewards, setUnlockedRewards] = useState([false, false, false]);

  // Breathing animation for logo - runs continuously
  useEffect(() => {
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(logoBreathing, {
          toValue: 1.08,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(logoBreathing, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    breathing.start();

    return () => {
      breathing.stop();
    };
  }, []);


  // Clear typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, []);

  // Auto-play functionality - adjusted timing for each slide's animations
  useEffect(() => {
    if (isUserInteracting) return; // Don't auto-play if user is interacting
    
    // Clear any existing timeout
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }

    // Different timing for each slide based on internal animations + 1s extra
    const slideDurations = [
      9000,  // Slide 0: Welcome - 9 seconds (8s + 1s extra)
      7000,  // Slide 1: Prompt typing - 7 seconds (6s + 1s extra)
      8000,  // Slide 2: Outline progress - 8 seconds (7s + 1s extra)
      9000,  // Slide 3: Tasks checking - 9 seconds (8s + 1s extra)
      7000,  // Slide 4: Stats counting - 7 seconds (6s + 1s extra)
      8000,  // Slide 5: Rewards - 8 seconds (7s + 1s extra)
      5000,  // Slide 6: CTA - 5 seconds (4s + 1s extra)
    ];

    const duration = slideDurations[currentIndex] || 6000;

    // Auto-advance after animations complete
    autoPlayTimeoutRef.current = setTimeout(() => {
      if (currentIndex < slides.length - 1) {
        goToNext();
      }
    }, duration);

    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, [currentIndex, isUserInteracting]);

  useEffect(() => {
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Clear previous text immediately for smooth transition
    setTypedWords([]);
    
    // Reset all word opacities
    wordOpacities.forEach(opacity => opacity.setValue(0));
    
    // Reset animations for content
    titleSlideAnim.setValue(80);
    titleOpacity.setValue(0);
    descSlideAnim.setValue(0);
    descOpacity.setValue(0);
    demoSlideIn.setValue(50);
    demoOpacity.setValue(0);

    // Logo animation - only on first load (slide 0)
    if (currentIndex === 0 && !logoAnimated) {
      logoScale.setValue(0);
      logoOpacity.setValue(0);
      logoPosition.setValue(0);
      
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 20,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setLogoAnimated(true);
        animateContent();
      });
    } else {
      // Logo already animated, just animate content (logo stays visible)
      animateContent();
    }

    function animateContent() {
      const isFirstSlide = currentIndex === 0;
      const isLastSlide = currentIndex === slides.length - 1;
      
      // Move logo position if needed
      const targetLogoPosition = (isFirstSlide || isLastSlide) ? 0 : 1;
      
      if (logoAnimated && targetLogoPosition !== currentLogoPosition) {
        // Animate logo to new position
        Animated.timing(logoPosition, {
          toValue: targetLogoPosition,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          setCurrentLogoPosition(targetLogoPosition);
          continueContentAnimation();
        });
      } else {
        continueContentAnimation();
      }

      function continueContentAnimation() {
        // Step 1: Animate title
        Animated.parallel([
          Animated.timing(titleSlideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Step 2: Animate demonstration (if exists and not first/last slide)
          if (currentIndex > 0 && currentIndex < slides.length - 1) {
            Animated.parallel([
              Animated.spring(demoSlideIn, {
                toValue: 0,
                tension: 40,
                friction: 9,
                useNativeDriver: true,
              }),
              Animated.timing(demoOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
            ]).start(() => {
              // Step 3: Fade in description
              Animated.timing(descOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }).start(() => {
                // Step 4: Start description typing
                setTimeout(() => {
                  startTypingAnimation(currentIndex);
                  // Step 5: Start internal demo animations after description starts
                  setTimeout(() => {
                    startInternalAnimations(currentIndex);
                  }, 500);
                }, 200);
              });
            });
          } else {
            // No demo (first or last slide), go straight to description
            Animated.timing(descOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start(() => {
              setTimeout(() => startTypingAnimation(currentIndex), 200);
            });
          }
        });
      }
    }
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
      description: 'Share your goals and aspirations',
      icon: 'sparkle',
    },
    {
      key: 'slide2',
      title: 'Get Your 21-Day Plan',
      description: 'Receive a personalized roadmap',
      icon: 'calendar',
    },
    {
      key: 'slide3',
      title: 'Complete Daily Tasks',
      description: 'Stay on track with simple daily missions',
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
    {
      key: 'cta',
      title: 'Ready to Begin?',
      description: 'Your transformation starts now.\nLet Genie guide you to success,\none wish at a time.',
      icon: 'sparkle',
    },
  ];

  // Internal animations for demos - triggered after content loads
  const startInternalAnimations = (slideIndex: number) => {
    // Reset all demo states
    setPromptText('');
    setOutlineProgress([0, 0, 0]);
    setCheckedTasks([false, false, false, false, false, false]);
    setStatValues([0, 0, 0]);
    setUnlockedRewards([false, false, false]);

    if (slideIndex === 1) {
      // Slide 2: Typing animation for prompt
      setTimeout(() => {
        const fullText = 'I want to improve my fitness and get healthier';
        let charIndex = 0;
        
        const typingInterval = setInterval(() => {
          if (charIndex < fullText.length) {
            setPromptText(fullText.slice(0, charIndex + 1));
            charIndex++;
          } else {
            clearInterval(typingInterval);
          }
        }, 50);
        
        return () => clearInterval(typingInterval);
      }, 300);
    }

    if (slideIndex === 2) {
      // Slide 3: Progress bars animation
      setTimeout(() => {
        // Week 1 progress
        setTimeout(() => {
          let progress = 0;
          const interval1 = setInterval(() => {
            if (progress <= 100) {
              setOutlineProgress(prev => [progress, prev[1], prev[2]]);
              progress += 5;
            } else {
              clearInterval(interval1);
              // Week 2 progress
              let progress2 = 0;
              const interval2 = setInterval(() => {
                if (progress2 <= 60) {
                  setOutlineProgress(prev => [prev[0], progress2, prev[2]]);
                  progress2 += 5;
                } else {
                  clearInterval(interval2);
                }
              }, 30);
            }
          }, 30);
        }, 500);
      }, 300);
    }

    if (slideIndex === 3) {
      // Slide 4: Check tasks one by one with auto-scroll
      setTimeout(() => {
        const delays = [500, 1000, 2000, 2500, 3000, 3500];
        delays.forEach((delay, idx) => {
          setTimeout(() => {
            setCheckedTasks(prev => {
              const newChecked = [...prev];
              newChecked[idx] = true;
              return newChecked;
            });
            
            // Scroll to show the checked task (especially the last one)
            if (idx >= 3) {
              setTimeout(() => {
                taskScrollViewRef.current?.scrollTo({
                  y: idx * 35, // Approximate height per task
                  animated: true,
                });
              }, 100);
            }
          }, delay);
        });
      }, 300);
    }

    if (slideIndex === 4) {
      // Slide 5: Count up stats
      setTimeout(() => {
        const targets = [7, 12, 85];
        targets.forEach((target, statIdx) => {
          let current = 0;
          const increment = statIdx === 2 ? 5 : 1;
          const speed = statIdx === 2 ? 40 : 100;
          
          const interval = setInterval(() => {
            if (current < target) {
              current += increment;
              if (current > target) current = target;
              setStatValues(prev => {
                const newVals = [...prev];
                newVals[statIdx] = current;
                return newVals;
              });
            } else {
              clearInterval(interval);
            }
          }, speed);
        });
      }, 300);
    }

    if (slideIndex === 5) {
      // Slide 6: Unlock rewards one by one
      setTimeout(() => {
        // First reward unlocks
        setTimeout(() => setUnlockedRewards([true, false, false]), 500);
        // Second reward unlocks
        setTimeout(() => setUnlockedRewards([true, true, false]), 1200);
        // Third stays locked (keeping first two unlocked)
      }, 300);
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const goToNext = () => {
    setIsUserInteracting(true); // Mark user interaction
    setTimeout(() => setIsUserInteracting(false), 500); // Reset after animation
    
    if (currentIndex < slides.length - 1) {
      // Animate current content out (but keep logo)
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
        Animated.timing(demoOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(demoSlideIn, {
          toValue: -50,
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

  const renderDemonstration = (index: number) => {
    if (index === 0) {
      // First slide - no demonstration, centered content
      return null;
    }

    if (index === 1) {
      // Slide 2: Talk with Genie - Prompt input demonstration
      return (
        <View style={styles.demoContainer}>
          <Card variant="elevated" padding="md" style={styles.demoCardReal}>
            <View style={styles.demoCardHeaderRow}>
              <Icon name="sparkle" size={20} color="#FFFF68" weight="fill" />
              <Text variant="h4" style={styles.demoCardTitleReal}>Share Your Goal</Text>
            </View>
            <View style={styles.demoInputWrapper}>
              <TextInput
                style={styles.demoTextInput}
                value={promptText}
                placeholder="Type your goal here..."
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                multiline
                editable={false}
              />
            </View>
          </Card>
        </View>
      );
    }

    if (index === 2) {
      // Slide 3: Get Your Plan - Outline demonstration (using real outline structure)
      return (
        <View style={styles.demoContainer}>
          <Card variant="elevated" padding="md" style={styles.demoCardReal}>
            <View style={styles.demoCardHeaderRow}>
              <Icon name="calendar" size={20} color="#FFFF68" weight="fill" />
              <Text variant="h4" style={styles.demoCardTitleReal}>Your 21-Day Plan</Text>
            </View>
            <View style={styles.demoOutlineList}>
              {[
                { 
                  title: 'Week 1 • Fitness Journey - Foundation',
                  description: 'Establish core routines. Build momentum. Create strong foundations for success.',
                },
                { 
                  title: 'Week 2 • Fitness Journey - Development',
                  description: 'Develop skills and deepen expertise. Practice and apply what you learned.',
                },
                { 
                  title: 'Week 3 • Fitness Journey - Mastery',
                  description: 'Master your skills. Achieve your goals. Celebrate your transformation.',
                },
              ].map((item, idx) => (
                <View key={idx} style={styles.demoOutlineItemReal}>
                  <Text style={styles.demoOutlineWeekTitle}>{item.title}</Text>
                  <Text style={styles.demoOutlineDescription}>{item.description}</Text>
                  <View style={styles.demoProgressBar}>
                    <View style={[styles.demoProgressFill, { width: `${outlineProgress[idx]}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </View>
      );
    }

    if (index === 3) {
      // Slide 4: Complete Daily Tasks
      const tasks = [
        'Morning stretching routine',
        'Drink 8 glasses of water',
        '30-minute walk',
        'Healthy meal prep',
        'Evening meditation',
        'Read 10 pages',
      ];
      
      return (
        <View style={styles.demoContainer}>
          <Card variant="elevated" padding="md" style={styles.demoCardReal}>
            <View style={styles.demoCardHeaderRow}>
              <Icon name="clipboard-text" size={20} color="#FFFF68" weight="fill" />
              <Text variant="h4" style={styles.demoCardTitleReal}>Today's Tasks</Text>
            </View>
            <ScrollView 
              ref={taskScrollViewRef}
              style={styles.demoTasksScroll} 
              showsVerticalScrollIndicator={false}
            >
              {tasks.map((task, idx) => (
                <View key={idx} style={styles.demoTaskItemReal}>
                  <View style={[
                    styles.demoTaskCheckbox,
                    checkedTasks[idx] && styles.demoTaskCheckboxDone
                  ]}>
                    {checkedTasks[idx] && <Icon name="check" size={12} color="#000000" weight="bold" />}
                  </View>
                  <Text style={[
                    styles.demoTaskTextReal,
                    checkedTasks[idx] && styles.demoTaskTextDone
                  ]}>{task}</Text>
                </View>
              ))}
            </ScrollView>
          </Card>
        </View>
      );
    }

    if (index === 4) {
      // Slide 5: Track Your Progress
      return (
        <View style={styles.demoContainer}>
          <Card variant="elevated" padding="md" style={styles.demoCardReal}>
            <View style={styles.demoCardHeaderRow}>
              <Icon name="trend-up" size={20} color="#FFFF68" weight="fill" />
              <Text variant="h4" style={styles.demoCardTitleReal}>Your Stats</Text>
            </View>
            <View style={styles.demoStatsGrid}>
              <View style={styles.demoStatCard}>
                <Text style={styles.demoStatValue}>{statValues[0]}</Text>
                <Text style={styles.demoStatLabel}>Day Streak</Text>
              </View>
              <View style={styles.demoStatCard}>
                <Text style={styles.demoStatValue}>{statValues[1]}</Text>
                <Text style={styles.demoStatLabel}>Tasks Done</Text>
              </View>
              <View style={styles.demoStatCard}>
                <Text style={styles.demoStatValue}>{statValues[2]}%</Text>
                <Text style={styles.demoStatLabel}>Completion</Text>
              </View>
            </View>
          </Card>
        </View>
      );
    }

    if (index === 5) {
      // Slide 6: Earn Rewards
      return (
        <View style={styles.demoContainer}>
          <Card variant="elevated" padding="md" style={styles.demoCardReal}>
            <View style={styles.demoCardHeaderRow}>
              <Icon name="trophy" size={20} color="#FFFF68" weight="fill" />
              <Text variant="h4" style={styles.demoCardTitleReal}>Achievements</Text>
            </View>
            <View style={styles.demoRewardsList}>
              {[
                { title: 'First Steps', points: '+50', icon: 'star' },
                { title: 'Week Warrior', points: '+100', icon: 'fire' },
                { title: 'Task Master', points: '+200', icon: 'crown' },
              ].map((reward, idx) => (
                <View key={idx} style={[
                  styles.demoRewardItem,
                  !unlockedRewards[idx] && styles.demoRewardItemLocked
                ]}>
                  <View style={[
                    styles.demoRewardIcon,
                    unlockedRewards[idx] && styles.demoRewardIconUnlocked
                  ]}>
                    <Icon 
                      name={reward.icon} 
                      size={16} 
                      color={unlockedRewards[idx] ? "#000000" : "rgba(255, 255, 255, 0.3)"} 
                      weight="fill" 
                    />
                  </View>
                  <View style={styles.demoRewardTextContainer}>
                    <Text style={[
                      styles.demoRewardTitle,
                      !unlockedRewards[idx] && styles.demoRewardTitleLocked
                    ]}>{reward.title}</Text>
                    <Text style={[
                      styles.demoRewardPoints,
                      !unlockedRewards[idx] && styles.demoRewardPointsLocked
                    ]}>{reward.points} points</Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </View>
      );
    }

    return null;
  };

  const goToPrevious = () => {
    setIsUserInteracting(true); // Mark user interaction
    setTimeout(() => setIsUserInteracting(false), 500); // Reset after animation
    
    if (currentIndex > 0) {
      // Animate current content out (but keep logo)
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
        Animated.timing(demoOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(demoSlideIn, {
          toValue: 50,
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

  const renderSlide = (slide: OnboardingSlide, index: number) => {
    const isFirstSlide = index === 0;
    const isLastSlide = index === slides.length - 1;
    const isCenteredSlide = isFirstSlide || isLastSlide;
    
    return (
      <View key={slide.key} style={styles.slide}>
        <View style={[styles.slideContent, isCenteredSlide && styles.slideContentCentered]}>
          {/* Spacer to position content below logo */}
          <View style={{ height: 10 }} />
          
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

          {/* Demonstration area - between title and description */}
          {!isCenteredSlide && (
            <Animated.View 
              style={[
                styles.demonstrationAreaBetween,
                {
                  opacity: demoOpacity,
                  transform: [{ translateY: demoSlideIn }],
                }
              ]}
            >
              {renderDemonstration(index)}
            </Animated.View>
          )}

          {/* Description with word-by-word typing animation */}
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
  };

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

      {/* Fixed Logo - outside ScrollView, positioned dynamically */}
      <Animated.View 
        style={[
          styles.fixedLogoContainer,
          {
            transform: [
              { 
                scale: Animated.multiply(logoScale, logoBreathing)
              },
              {
                translateY: logoPosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -100], // Center when 0, moves up 100px when 1
                })
              }
            ],
            opacity: logoOpacity,
          }
        ]}
      >
        <Image 
          source={require('../../assets/LogoSymbol.webp')} 
          style={styles.logoSymbolLarge}
          resizeMode="contain"
        />
      </Animated.View>

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
  fixedLogoContainer: {
    position: 'absolute',
    top: 260,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  logoSpacer: {
    height: 0, // No spacer needed since logo is absolute
  },
  slide: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 180,
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  slideContentCentered: {
    justifyContent: 'center',
    flex: 1,
    marginTop: -80,
  },
  logoSymbolLarge: {
    width: 65,
    height: 65,
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
    minHeight: 80,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
  },
  demonstrationAreaBetween: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
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
  // Demo card styles
  demoContainer: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 320,
  },
  demoCardReal: {
    width: '100%',
    backgroundColor: 'rgba(20, 22, 30, 0.95)',
  },
  demoCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  demoCardTitleReal: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  // Prompt input demo
  demoInputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
    position: 'relative',
  },
  demoTextInput: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 19,
    minHeight: 45,
  },
  // Outline demo
  demoOutlineList: {
    gap: 8,
    marginTop: 8,
  },
  demoOutlineItemReal: {
    backgroundColor: 'rgba(255, 255, 104, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFFF68',
  },
  demoOutlineLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  demoOutlineTextContainer: {
    flex: 1,
  },
  demoOutlineBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFF68',
    marginTop: 3,
  },
  demoOutlineBulletComplete: {
    backgroundColor: '#FFFF68',
  },
  demoOutlineWeekTitle: {
    fontSize: 11,
    color: '#FFFF68',
    fontWeight: '700',
    lineHeight: 14,
    marginBottom: 3,
  },
  demoOutlineDescription: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 14,
    marginBottom: 8,
  },
  demoProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  demoProgressFill: {
    height: '100%',
    backgroundColor: '#FFFF68',
    borderRadius: 1.5,
  },
  // Tasks demo
  demoTasksScroll: {
    maxHeight: 130,
    marginTop: 8,
  },
  demoTaskItemReal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  demoTaskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoTaskCheckboxDone: {
    backgroundColor: '#FFFF68',
    borderColor: '#FFFF68',
  },
  demoTaskTextReal: {
    fontSize: 11,
    color: '#FFFFFF',
    flex: 1,
  },
  demoTaskTextDone: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  // Stats demo
  demoStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  demoStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 104, 0.08)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.2)',
  },
  demoStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFF68',
    marginBottom: 2,
  },
  demoStatLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  // Rewards demo
  demoRewardsList: {
    gap: 8,
    marginTop: 8,
  },
  demoRewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 9,
    backgroundColor: 'rgba(255, 255, 104, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.25)',
  },
  demoRewardItemLocked: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  demoRewardIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoRewardIconUnlocked: {
    backgroundColor: '#FFFF68',
  },
  demoRewardTextContainer: {
    flex: 1,
  },
  demoRewardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  demoRewardTitleLocked: {
    opacity: 0.5,
  },
  demoRewardPoints: {
    fontSize: 10,
    color: '#FFFF68',
  },
  demoRewardPointsLocked: {
    opacity: 0.4,
  },
});
