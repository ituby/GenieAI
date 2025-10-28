"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Sparkle, Calendar, CheckCircle, TrendUp, Trophy, CalendarBlank, CaretDown, CaretUp, Sun, Moon } from "phosphor-react";

interface OnboardingSlide {
  key: string;
  title: string;
  description: string;
  icon: string;
}

const OnboardingPreview: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const preferencesScrollRef = useRef<HTMLDivElement>(null);
  const tasksScrollRef = useRef<HTMLDivElement>(null);

  // Animation states for slide-up effects
  const [titleVisible, setTitleVisible] = useState(false);
  const [descriptionVisible, setDescriptionVisible] = useState(false);

  // Demo states for internal animations
  const [promptText, setPromptText] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [planDuration, setPlanDuration] = useState(7);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [timeRanges, setTimeRanges] = useState<
    Array<{ start_hour: number; end_hour: number }>
  >([
    { start_hour: 0, end_hour: 1 },
    { start_hour: 0, end_hour: 1 },
    { start_hour: 0, end_hour: 1 },
  ]);
  const [checkedTasks, setCheckedTasks] = useState([
    false,
    false,
    false,
    false,
  ]);
  const [statValues, setStatValues] = useState([0, 0, 0]);
  const [unlockedRewards, setUnlockedRewards] = useState([false, false, false]);

  const slides: OnboardingSlide[] = [
    {
      key: "welcome",
      title: "Genie Is Out",
      description:
        "Transform your dreams into reality\nwith AI-powered guidance\none day at a time",
      icon: "brain",
    },
    {
      key: "slide1",
      title: "Talk with Genie",
      description: "Share your goals and aspirations\nGenie will create a personalized plan\njust for you",
      icon: "sparkle",
    },
    {
      key: "slide2",
      title: "Customize Your Plan",
      description:
        "Choose your plan duration,\npreferred days, and daily time slots\nto fit your schedule perfectly",
      icon: "calendar",
    },
    {
      key: "slide3",
      title: "Complete Daily Tasks",
      description: "Follow AI-generated daily tasks\ntailored to your goals\nand availability",
      icon: "clipboard-check",
    },
    {
      key: "slide4",
      title: "Track Your Progress",
      description: "Monitor your streaks,\ncompletion rate, and achievements\nas you move forward",
      icon: "trend-up",
    },
    {
      key: "slide5",
      title: "Earn Rewards",
      description: "Unlock achievements\nand collect points for every\nmilestone you reach",
      icon: "trophy",
    },
    {
      key: "cta",
      title: "Ready to Begin?",
      description:
        "Your transformation starts now\nLet Genie guide you to success\none wish at a time",
      icon: "sparkle",
    },
    {
      key: "logo",
      title: "",
      description: "",
      icon: "logo",
    },
  ];

  // Start internal animations when currentIndex changes
  useEffect(() => {
    if (currentIndex === slides.length - 1) {
      // Special handling for logo slide
      setTitleVisible(false);
      setDescriptionVisible(false);

      setTimeout(() => {
        setTitleVisible(true);
      }, 400); // Quick fade in

      setTimeout(() => {
        setTitleVisible(false);
      }, 3000); // Fade out smoothly
    } else {
      startInternalAnimations(currentIndex);
      startSlideAnimations();
    }
  }, [currentIndex, slides.length]);

  // Slide-up animations with exact timing from app
  const startSlideAnimations = () => {
    // Reset animation states
    setTitleVisible(false);
    setDescriptionVisible(false);

    // Title slide-up animation (500ms duration)
    setTimeout(() => {
      setTitleVisible(true);
    }, 500);

    // Description slide-up animation (400ms after title animation completes)
    setTimeout(() => {
      setDescriptionVisible(true);
    }, 900); // 500ms title + 400ms delay = 900ms
  };

  // Auto-advance slides with exact timing from app
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeout(() => {
        const nextIndex = (currentIndex + 1) % slides.length;
        setCurrentIndex(nextIndex);
        
        // Don't start animations here for logo slide
        if (nextIndex !== slides.length - 1) {
          startSlideAnimations();
        }
      }, 300);
    }, getSlideDuration(currentIndex));

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentIndex, slides.length]);

  // Get exact slide duration from app
  const getSlideDuration = (index: number) => {
    const slideDurations = [
      9000, // Slide 0: Welcome - 9 seconds
      7000, // Slide 1: Prompt typing - 7 seconds
      11000, // Slide 2: Day/time/duration selection demo - 11 seconds
      9000, // Slide 3: Tasks checking - 9 seconds
      7000, // Slide 4: Stats counting - 7 seconds
      8000, // Slide 5: Rewards - 8 seconds
      5000, // Slide 6: CTA - 5 seconds
      4000, // Slide 7: Logo - smooth fade in/out
    ];
    return slideDurations[index] || 6000;
  };

  // Internal animations - exact copy from app
  const startInternalAnimations = (slideIndex: number) => {
    // Reset all demo states
    setPromptText("");
    setSelectedDays([]);
    setPlanDuration(7);
    setShowDurationDropdown(false);
    setTimeRanges([
      { start_hour: 0, end_hour: 1 },
      { start_hour: 0, end_hour: 1 },
      { start_hour: 0, end_hour: 1 },
    ]);
    setCheckedTasks([false, false, false, false]);
    setStatValues([0, 0, 0]);
    setUnlockedRewards([false, false, false]);
    
    // Reset scroll positions
    if (preferencesScrollRef.current) {
      preferencesScrollRef.current.scrollTop = 0;
    }
    if (tasksScrollRef.current) {
      tasksScrollRef.current.scrollTop = 0;
    }

    if (slideIndex === 1) {
      // Slide 2: Typing animation for prompt - exact timing from app
      setTimeout(() => {
        const fullText = "I want to improve my fitness and get healthier";
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
      }, 700); // 200ms after description starts + 500ms internal delay
    }

    if (slideIndex === 2) {
      // Slide 3: Day, time, and duration selection animation - exact timing from app
      setTimeout(() => {
        // Step 1: Open dropdown
        setTimeout(() => {
          setShowDurationDropdown(true);
        }, 300);

        // Step 2: Animate plan duration from 7 to 21 days
        setTimeout(() => {
          let currentDuration = 7;
          const durationInterval = setInterval(() => {
            if (currentDuration <= 21) {
              setPlanDuration(currentDuration);
              currentDuration += 7;
            } else {
              clearInterval(durationInterval);
            }
          }, 400);
        }, 500);

        // Step 3: Close dropdown after selection
        setTimeout(() => {
          setShowDurationDropdown(false);
        }, 1800);

        // Step 4: Animate selecting days
        setTimeout(() => {
          const daysToSelect = [1, 2, 3, 4, 5];
          daysToSelect.forEach((day, idx) => {
            setTimeout(() => {
              setSelectedDays((prev) => [...prev, day]);
            }, idx * 350);
          });
        }, 2200);

        // Step 5: Scroll down to show time ranges
        setTimeout(() => {
          if (preferencesScrollRef.current) {
            preferencesScrollRef.current.scrollTo({
              top: 200,
              behavior: 'smooth',
            });
          }
        }, 4400);

        // Step 6: Show time ranges being adjusted
        setTimeout(() => {
          // Adjust morning time
          setTimeout(() => {
            setTimeRanges((prev) => [
              { start_hour: 8, end_hour: 12 },
              prev[1],
              prev[2],
            ]);
          }, 600);

          // Adjust afternoon time
          setTimeout(() => {
            setTimeRanges((prev) => [
              prev[0],
              { start_hour: 14, end_hour: 18 },
              prev[2],
            ]);
          }, 1200);

          // Adjust evening time
          setTimeout(() => {
            setTimeRanges((prev) => [
              prev[0],
              prev[1],
              { start_hour: 19, end_hour: 23 },
            ]);
          }, 1800);
        }, 5000);
      }, 700); // 200ms after description starts + 500ms internal delay
    }

    if (slideIndex === 3) {
      // Slide 4: Check tasks one by one with auto-scroll
      setTimeout(() => {
        const delays = [500, 1000, 2000, 2500];
        delays.forEach((delay, idx) => {
          setTimeout(() => {
            setCheckedTasks((prev) => {
              const newChecked = [...prev];
              newChecked[idx] = true;
              return newChecked;
            });
            
            // Scroll to show the checked task (especially the last one)
            if (idx >= 2 && tasksScrollRef.current) {
              tasksScrollRef.current.scrollTo({
                top: idx * 35,
                behavior: 'smooth',
              });
            }
          }, delay);
        });
      }, 700); // 200ms after description starts + 500ms internal delay
    }

    if (slideIndex === 4) {
      // Slide 5: Count up stats - exact timing from app
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
              setStatValues((prev) => {
                const newVals = [...prev];
                newVals[statIdx] = current;
                return newVals;
              });
            } else {
              clearInterval(interval);
            }
          }, speed);
        });
      }, 700); // 200ms after description starts + 500ms internal delay
    }

    if (slideIndex === 5) {
      // Slide 6: Unlock rewards one by one - exact timing from app
      setTimeout(() => {
        // First reward unlocks
        setTimeout(() => setUnlockedRewards([true, false, false]), 500);
        // Second reward unlocks
        setTimeout(() => setUnlockedRewards([true, true, false]), 1200);
        // Third stays locked
      }, 700); // 200ms after description starts + 500ms internal delay
    }
  };

  const renderDemo = (index: number) => {
    if (
      index === 0 ||
      index === slides.length - 2 ||
      index === slides.length - 1
    ) {
      return null; // No demo for first, second to last, and last slides
    }

    if (index === 1) {
      // Talk with Genie demo - exact copy from app with typing animation
      return (
        <div className="bg-genie-background-card/95 rounded-lg p-6 border border-genie-border-primary max-w-md w-full mt-2">
          <div className="flex items-center gap-3 mb-4">
            <Sparkle size={24} color="#FCD34D" weight="fill" />
            <span className="text-white font-semibold text-base">
              Share Your Goal
            </span>
          </div>
          <div className="bg-genie-background-primary/50 rounded-lg p-4 border border-genie-yellow-500/30 min-h-[100px]">
            <p className="text-genie-text-secondary text-base leading-relaxed">
              {promptText}
              {promptText.length > 0 && (
                <span className="animate-pulse">|</span>
              )}
            </p>
          </div>
        </div>
      );
    }

    if (index === 2) {
      // Customize Plan demo - exact copy from app
      return (
        <div ref={preferencesScrollRef} className="bg-genie-background-card/95 rounded-lg p-6 border border-genie-border-primary max-w-md w-full mt-2 max-h-[380px] overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <Calendar size={24} color="#FCD34D" weight="fill" />
            <span className="text-white font-semibold text-base">
              Your Personalized Plan
            </span>
          </div>

          {/* Plan Duration */}
          <div className="mb-5">
            <p className="text-genie-text-secondary text-sm font-semibold mb-3">
              Plan Duration
            </p>
            <div className="bg-genie-background-primary/50 rounded-lg p-4 border border-genie-border-primary">
              <div className="flex items-center relative">
                <CalendarBlank size={20} color="#FCD34D" weight="fill" className="absolute left-0" />
                <span className="text-white text-base font-semibold w-full text-center">
                  {planDuration} days ({planDuration / 7}{" "}
                  {planDuration === 7 ? "week" : "weeks"})
                </span>
                {showDurationDropdown ? (
                  <CaretUp size={16} color="rgba(255, 255, 255, 0.5)" weight="fill" className="absolute right-0" />
                ) : (
                  <CaretDown size={16} color="rgba(255, 255, 255, 0.5)" weight="fill" className="absolute right-0" />
                )}
              </div>
            </div>

            {/* Dropdown Options */}
            {showDurationDropdown && (
              <div className="mt-2 bg-genie-background-card/98 rounded-lg border border-genie-border-primary overflow-hidden">
                {[7, 14, 21].map((days) => (
                  <div
                    key={days}
                    className={`p-2 border-b border-genie-border-primary/20 last:border-b-0 ${
                      planDuration === days ? "bg-genie-yellow-500/15" : ""
                    }`}
                  >
                    <span
                      className={`text-base ${
                        planDuration === days
                          ? "text-genie-yellow-500 font-semibold"
                          : "text-genie-text-secondary"
                      }`}
                    >
                      {days} days ({days / 7} {days === 7 ? "week" : "weeks"})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Days Selection */}
          <div className="mb-5">
            <p className="text-genie-text-secondary text-sm font-semibold mb-3">
              Choose Your Days
            </p>
            <div className="flex gap-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                <div
                  key={idx}
                  className={`w-10 h-10 rounded flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    selectedDays.includes(idx)
                      ? "bg-genie-yellow-500 text-black"
                      : "bg-genie-background-primary/50 text-genie-text-tertiary border border-genie-border-primary"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Time Ranges */}
          <div>
            <p className="text-genie-text-secondary text-sm font-semibold mb-3">
              Preferred Times
            </p>
            <div className="space-y-3">
              {[
                { label: "Morning", icon: "sun" },
                { label: "Afternoon", icon: "sun-horizon" },
                { label: "Evening", icon: "moon" },
              ].map((time, idx) => (
                <div
                  key={idx}
                  className="bg-genie-background-primary/30 rounded-lg p-3 border border-genie-border-primary"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 relative flex-1">
                      {idx === 2 ? (
                        <Moon size={20} color="#FCD34D" weight="fill" className="absolute left-0" />
                      ) : (
                        <Sun size={20} color="#FCD34D" weight="fill" className="absolute left-0" />
                      )}
                      <span className="text-white text-sm font-semibold w-full text-center">
                        {time.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-genie-background-primary/50 rounded px-3 py-1">
                        <span className="text-genie-text-secondary text-sm">
                          {timeRanges[idx].start_hour
                            .toString()
                            .padStart(2, "0")}
                          :00
                        </span>
                      </div>
                      <span className="text-genie-text-tertiary text-sm">
                        -
                      </span>
                      <div className="bg-genie-background-primary/50 rounded px-3 py-1">
                        <span className="text-genie-text-secondary text-sm">
                          {timeRanges[idx].end_hour.toString().padStart(2, "0")}
                          :00
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (index === 3) {
      // Complete Tasks demo - exact copy from app
      return (
        <div className="bg-genie-background-card/95 rounded-lg p-6 border border-genie-border-primary max-w-md w-full mt-2">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle size={24} color="#FCD34D" weight="fill" />
            <span className="text-white font-semibold text-base">
              Today&apos;s Tasks
            </span>
          </div>
          <div ref={tasksScrollRef} className="space-y-3 max-h-[160px] overflow-hidden">
            {[
              "Morning stretching routine",
              "Drink 8 glasses of water",
              "30-minute walk",
              "Evening meditation",
            ].map((task, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 py-2 border-b border-genie-border-primary/20"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                    checkedTasks[idx]
                      ? "bg-genie-yellow-500"
                      : "border-2 border-genie-border-primary"
                  }`}
                >
                  {checkedTasks[idx] && (
                    <svg
                      className="w-3 h-3 text-black"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm flex-1 transition-all duration-300 ${
                    checkedTasks[idx]
                      ? "text-genie-text-tertiary line-through"
                      : "text-genie-text-secondary"
                  }`}
                >
                  {task}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (index === 4) {
      // Track Progress demo - exact copy from app
      return (
        <div className="bg-genie-background-card/95 rounded-lg p-6 border border-genie-border-primary max-w-md w-full mt-2">
          <div className="flex items-center gap-3 mb-4">
            <TrendUp size={24} color="#FCD34D" weight="fill" />
            <span className="text-white font-semibold text-base">Your Stats</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-genie-yellow-500/20 rounded-lg p-4 text-center border border-genie-yellow-500/30">
              <div className="text-genie-yellow-500 font-bold text-2xl mb-2">
                {statValues[0]}
              </div>
              <div className="text-genie-text-tertiary text-sm">Day Streak</div>
            </div>
            <div className="bg-genie-yellow-500/20 rounded-lg p-4 text-center border border-genie-yellow-500/30">
              <div className="text-genie-yellow-500 font-bold text-2xl mb-2">
                {statValues[1]}
              </div>
              <div className="text-genie-text-tertiary text-sm">Tasks Done</div>
            </div>
            <div className="bg-genie-yellow-500/20 rounded-lg p-4 text-center border border-genie-yellow-500/30">
              <div className="text-genie-yellow-500 font-bold text-2xl mb-2">
                {statValues[2]}%
              </div>
              <div className="text-genie-text-tertiary text-sm">Completion</div>
            </div>
          </div>
        </div>
      );
    }

    if (index === 5) {
      // Earn Rewards demo - exact copy from app
      return (
        <div className="bg-genie-background-card/95 rounded-lg p-6 border border-genie-border-primary max-w-md w-full mt-2">
          <div className="flex items-center gap-3 mb-4">
            <Trophy size={24} color="#FCD34D" weight="fill" />
            <span className="text-white font-semibold text-base">
              Achievements
            </span>
          </div>
          <div className="space-y-3">
            {[
              { title: "First Steps", points: "+50" },
              { title: "Week Warrior", points: "+100" },
              { title: "Task Master", points: "+200" },
            ].map((reward, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-500 ${
                  unlockedRewards[idx]
                    ? "bg-genie-yellow-500/20 border-genie-yellow-500/30"
                    : "bg-genie-background-primary/30 border-genie-border-primary opacity-50"
                }`}
              >
                <div className="flex-1">
                  <div
                    className={`text-base font-semibold transition-all duration-500 ${
                      unlockedRewards[idx]
                        ? "text-white"
                        : "text-genie-text-tertiary"
                    }`}
                  >
                    {reward.title}
                  </div>
                  <div
                    className={`text-sm transition-all duration-500 ${
                      unlockedRewards[idx]
                        ? "text-genie-yellow-500"
                        : "text-genie-text-tertiary opacity-50"
                    }`}
                  >
                    {reward.points} points
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative overflow-hidden w-full max-w-5xl mx-auto scale-125 origin-top">
      {/* Slides Container - increased size */}
      <div className="relative h-[500px] overflow-hidden">
        {slides.map((slide, index) => {
          // First, second to last, and last slides stay centered
          const isCenteredSlide =
            index === 0 ||
            index === slides.length - 2 ||
            index === slides.length - 1;

          return (
            <div
              key={slide.key}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out pt-16
              ${index === currentIndex ? "opacity-100 z-10" : "opacity-0 -z-10"}
              ${
                isCenteredSlide
                  ? "flex flex-col items-center justify-center text-center"
                  : "flex flex-col md:flex-row items-center justify-between"
              }`}
            >
              {isCenteredSlide ? (
                // Centered layout for first, second to last, and last slides
                <>
                  {index === slides.length - 1 ? (
                    // Logo slide
                    <div className="flex items-center justify-center h-full">
                      <div
                        className={`transition-all duration-500 ease-in-out ${
                          titleVisible
                            ? "opacity-100 transform scale-100"
                            : "opacity-0 transform scale-95"
                        }`}
                      >
                        <Image
                          src="/LogoSymbol.webp"
                          alt="Genie Logo"
                          width={90}
                          height={90}
                          className="w-22 h-22"
                          style={{
                            objectFit: "contain",
                            width: "auto",
                            height: "auto",
                          }}
                          priority
                          quality={100}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Title with yellow background - exact styling from app */}
                      <div
                        className={`${index === 0 || index === slides.length - 2 ? 'mb-3' : 'mb-6'} transition-all duration-500 ease-out ${
                          titleVisible
                            ? "opacity-100 transform translate-y-0"
                            : "opacity-0 transform translate-y-8"
                        }`}
                      >
                        <span className="bg-genie-yellow-500 text-black px-4 py-2 rounded-none inline-block text-3xl font-black tracking-tight">
                          {slide.title}
                        </span>
                      </div>

                      {/* Demo content - positioned exactly like app */}
                      <div className="mb-6">{renderDemo(index)}</div>

                      {/* Description - exact styling from app */}
                      <p
                        className={`text-genie-text-secondary text-xl leading-relaxed max-w-2xl whitespace-pre-line px-4 transition-all duration-500 ease-out ${
                          descriptionVisible
                            ? "opacity-100 transform translate-y-0"
                            : "opacity-0 transform translate-y-8"
                        }`}
                      >
                        {slide.description}
                      </p>
                    </>
                  )}
                </>
              ) : (
                // Side-by-side layout for middle slides
                <>
                  {/* Demo content on the left */}
                  <div className="flex-1 flex justify-center md:pr-8 mb-8 md:mb-0">
                    {renderDemo(index)}
                  </div>

                  {/* Text content on the right */}
                  <div className="flex-1 flex flex-col justify-center text-center md:text-left md:pl-8">
                    {/* Title with yellow background */}
                    <div
                      className={`mb-6 transition-all duration-500 ease-out ${
                        titleVisible
                          ? "opacity-100 transform translate-y-0"
                          : "opacity-0 transform translate-y-8"
                      }`}
                    >
                      <span className="bg-genie-yellow-500 text-black px-4 py-2 rounded-none inline-block text-3xl font-black tracking-tight">
                        {slide.title}
                      </span>
                    </div>

                    {/* Description */}
                    <p
                      className={`text-genie-text-secondary text-xl leading-relaxed whitespace-pre-line transition-all duration-500 ease-out ${
                        descriptionVisible
                          ? "opacity-100 transform translate-y-0"
                          : "opacity-0 transform translate-y-8"
                      }`}
                    >
                      {slide.description}
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Dots - exact positioning from app */}
      <div className="flex justify-center space-x-4 mt-12 mb-0 px-4">
        {slides.map((_, index) => (
          <span
            key={index}
            className={`block w-2 h-2 rounded-full transition-all duration-300
            ${
              index === currentIndex ? "bg-genie-yellow-500 w-6" : "bg-white/30"
            }`}
          ></span>
        ))}
      </div>
    </div>
  );
};

export default OnboardingPreview;
