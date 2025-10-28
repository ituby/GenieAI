"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface OnboardingSlide {
  key: string;
  title: string;
  description: string;
  icon: string;
}

const OnboardingPreview: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
        "Transform your dreams into reality\nwith AI-powered guidance,\none day at a time",
      icon: "brain",
    },
    {
      key: "slide1",
      title: "Talk with Genie",
      description: "Share your goals and aspirations",
      icon: "sparkle",
    },
    {
      key: "slide2",
      title: "Customize Your Plan",
      description:
        "Choose your preferred days\nand times for your 3-week journey",
      icon: "calendar",
    },
    {
      key: "slide3",
      title: "Complete Daily Tasks",
      description: "Stay on track with simple daily missions",
      icon: "clipboard-check",
    },
    {
      key: "slide4",
      title: "Track Your Progress",
      description: "Monitor your streaks,\nachievements, and growth journey",
      icon: "trend-up",
    },
    {
      key: "slide5",
      title: "Earn Rewards",
      description: "Collect points and unlock\nachievements as you progress",
      icon: "trophy",
    },
    {
      key: "cta",
      title: "Ready to Begin?",
      description:
        "Your transformation starts now.\nLet Genie guide you to success,\none wish at a time.",
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
      // Special handling for logo slide - start with black screen
      setTitleVisible(false);

      setTimeout(() => {
        setTitleVisible(true);
      }, 1000); // Black screen for 1 second, then logo appears

      setTimeout(() => {
        setTitleVisible(false);
      }, 3000); // Disappear after 2 seconds of visibility
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
        // Start animations for new slide
        startSlideAnimations();
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
      4000, // Slide 7: Logo - 2 seconds + 2 seconds pause
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
    setCheckedTasks([false, false, false, false, false, false]);
    setStatValues([0, 0, 0]);
    setUnlockedRewards([false, false, false]);

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

        // Step 5: Show time ranges being adjusted
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
      // Slide 4: Check tasks one by one - exact timing from app
      setTimeout(() => {
        const delays = [500, 1000, 2000, 2500, 3000, 3500];
        delays.forEach((delay, idx) => {
          setTimeout(() => {
            setCheckedTasks((prev) => {
              const newChecked = [...prev];
              newChecked[idx] = true;
              return newChecked;
            });
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
        <div className="bg-genie-background-card/95 rounded-lg p-4 border border-genie-border-primary max-w-sm w-full mt-4">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-genie-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-white font-semibold text-sm">
              Share Your Goal
            </span>
          </div>
          <div className="bg-genie-background-primary/50 rounded-lg p-3 border border-genie-yellow-500/30 min-h-[80px]">
            <p className="text-genie-text-secondary text-sm leading-relaxed">
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
        <div className="bg-genie-background-card/95 rounded-lg p-4 border border-genie-border-primary max-w-sm w-full mt-4 max-h-[320px] overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-genie-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-white font-semibold text-sm">
              3-Week Plan
            </span>
          </div>

          {/* Plan Duration */}
          <div className="mb-4">
            <p className="text-genie-text-secondary text-xs font-semibold mb-2">
              Plan Duration
            </p>
            <div className="bg-genie-background-primary/50 rounded-lg p-3 border border-genie-border-primary">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-genie-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-white text-sm font-semibold">
                  {planDuration} days ({planDuration / 7}{" "}
                  {planDuration === 7 ? "week" : "weeks"})
                </span>
                <svg
                  className={`w-3 h-3 text-genie-text-tertiary ml-auto transition-transform duration-300 ${
                    showDurationDropdown ? "rotate-180" : ""
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
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
                      className={`text-sm ${
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
          <div className="mb-4">
            <p className="text-genie-text-secondary text-xs font-semibold mb-2">
              Choose Your Days
            </p>
            <div className="flex gap-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                <div
                  key={idx}
                  className={`w-8 h-8 rounded flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
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
            <p className="text-genie-text-secondary text-xs font-semibold mb-2">
              Preferred Times
            </p>
            <div className="space-y-2">
              {[
                { label: "Morning", icon: "sun" },
                { label: "Afternoon", icon: "sun-horizon" },
                { label: "Evening", icon: "moon" },
              ].map((time, idx) => (
                <div
                  key={idx}
                  className="bg-genie-background-primary/30 rounded-lg p-2 border border-genie-border-primary"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-genie-yellow-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.457 4.907a1 1 0 01-1.414 1.414l-1.06-1.06a1 1 0 011.414-1.414l1.06 1.06zm-4.95-4.95a1 1 0 010 1.414l-1.06 1.06a1 1 0 11-1.414-1.414l1.06-1.06zm6.414 0a1 1 0 010 1.414l-1.06 1.06a1 1 0 01-1.414-1.414l1.06-1.06zM16 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1z" />
                      </svg>
                      <span className="text-white text-xs font-semibold">
                        {time.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="bg-genie-background-primary/50 rounded px-2 py-1">
                        <span className="text-genie-text-secondary text-xs">
                          {timeRanges[idx].start_hour
                            .toString()
                            .padStart(2, "0")}
                          :00
                        </span>
                      </div>
                      <span className="text-genie-text-tertiary text-xs">
                        -
                      </span>
                      <div className="bg-genie-background-primary/50 rounded px-2 py-1">
                        <span className="text-genie-text-secondary text-xs">
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
        <div className="bg-genie-background-card/95 rounded-lg p-4 border border-genie-border-primary max-w-sm w-full mt-4">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-genie-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-white font-semibold text-sm">
              Today&apos;s Tasks
            </span>
          </div>
          <div className="space-y-2 max-h-[130px] overflow-y-auto">
            {[
              "Morning stretching routine",
              "Drink 8 glasses of water",
              "30-minute walk",
              "Healthy meal prep",
              "Evening meditation",
              "Read 10 pages",
            ].map((task, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 py-1 border-b border-genie-border-primary/20"
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                    checkedTasks[idx]
                      ? "bg-genie-yellow-500"
                      : "border-2 border-genie-border-primary"
                  }`}
                >
                  {checkedTasks[idx] && (
                    <svg
                      className="w-2 h-2 text-black"
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
                  className={`text-xs flex-1 transition-all duration-300 ${
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
        <div className="bg-genie-background-card/95 rounded-lg p-4 border border-genie-border-primary max-w-sm w-full mt-4">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-genie-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-white font-semibold text-sm">Your Stats</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-genie-yellow-500/20 rounded-lg p-3 text-center border border-genie-yellow-500/30">
              <div className="text-genie-yellow-500 font-bold text-lg mb-1">
                {statValues[0]}
              </div>
              <div className="text-genie-text-tertiary text-xs">Day Streak</div>
            </div>
            <div className="bg-genie-yellow-500/20 rounded-lg p-3 text-center border border-genie-yellow-500/30">
              <div className="text-genie-yellow-500 font-bold text-lg mb-1">
                {statValues[1]}
              </div>
              <div className="text-genie-text-tertiary text-xs">Tasks Done</div>
            </div>
            <div className="bg-genie-yellow-500/20 rounded-lg p-3 text-center border border-genie-yellow-500/30">
              <div className="text-genie-yellow-500 font-bold text-lg mb-1">
                {statValues[2]}%
              </div>
              <div className="text-genie-text-tertiary text-xs">Completion</div>
            </div>
          </div>
        </div>
      );
    }

    if (index === 5) {
      // Earn Rewards demo - exact copy from app
      return (
        <div className="bg-genie-background-card/95 rounded-lg p-4 border border-genie-border-primary max-w-sm w-full mt-4">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-genie-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15a1 1 0 11-2 0 1 1 0 012 0zm4 0a1 1 0 11-2 0 1 1 0 012 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-white font-semibold text-sm">
              Achievements
            </span>
          </div>
          <div className="space-y-2">
            {[
              { title: "First Steps", points: "+50", icon: "star" },
              { title: "Week Warrior", points: "+100", icon: "fire" },
              { title: "Task Master", points: "+200", icon: "crown" },
            ].map((reward, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-500 ${
                  unlockedRewards[idx]
                    ? "bg-genie-yellow-500/20 border-genie-yellow-500/30"
                    : "bg-genie-background-primary/30 border-genie-border-primary opacity-50"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                    unlockedRewards[idx]
                      ? "bg-genie-yellow-500"
                      : "bg-genie-background-primary/50"
                  }`}
                >
                  <svg
                    className={`w-3 h-3 transition-all duration-500 ${
                      unlockedRewards[idx]
                        ? "text-black"
                        : "text-genie-text-tertiary"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div
                    className={`text-sm font-semibold transition-all duration-500 ${
                      unlockedRewards[idx]
                        ? "text-white"
                        : "text-genie-text-tertiary"
                    }`}
                  >
                    {reward.title}
                  </div>
                  <div
                    className={`text-xs transition-all duration-500 ${
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
    <div className="relative overflow-hidden w-full max-w-2xl mx-auto">
      {/* Slides Container - exact height from app */}
      <div className="relative h-[400px] overflow-hidden">
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
                        className={`transition-all duration-1000 ease-in-out ${
                          titleVisible
                            ? "opacity-100 transform scale-100"
                            : "opacity-0 transform scale-0"
                        }`}
                      >
                        <Image
                          src="/LogoSymbol.webp"
                          alt="Genie Logo"
                          width={80}
                          height={80}
                          className="w-20 h-20"
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
                        className={`mb-4 transition-all duration-500 ease-out ${
                          titleVisible
                            ? "opacity-100 transform translate-y-0"
                            : "opacity-0 transform translate-y-8"
                        }`}
                      >
                        <span className="bg-genie-yellow-500 text-black px-3 py-1 rounded-none inline-block text-xl font-black tracking-tight">
                          {slide.title}
                        </span>
                      </div>

                      {/* Demo content - positioned exactly like app */}
                      <div className="mb-4">{renderDemo(index)}</div>

                      {/* Description - exact styling from app */}
                      <p
                        className={`text-genie-text-secondary text-lg leading-relaxed max-w-lg whitespace-pre-line px-4 transition-all duration-500 ease-out ${
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
                      <span className="bg-genie-yellow-500 text-black px-3 py-1 rounded-none inline-block text-xl font-black tracking-tight">
                        {slide.title}
                      </span>
                    </div>

                    {/* Description */}
                    <p
                      className={`text-genie-text-secondary text-lg leading-relaxed whitespace-pre-line transition-all duration-500 ease-out ${
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
      <div className="flex justify-center space-x-3 mt-12">
        {slides.map((_, index) => (
          <span
            key={index}
            className={`block w-3 h-3 rounded-full transition-all duration-300
            ${
              index === currentIndex ? "bg-genie-yellow-500 w-8" : "bg-white/30"
            }`}
          ></span>
        ))}
      </div>
    </div>
  );
};

export default OnboardingPreview;
