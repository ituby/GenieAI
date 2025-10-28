"use client";

import Image from "next/image";
import Link from "next/link";
import OnboardingPreview from "../components/OnboardingPreview";
import {
  Brain,
  Sparkle,
  Calendar,
  Check,
  TrendUp,
  Trophy,
  Star,
  Fire,
} from "phosphor-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-b from-black via-black to-genie-yellow-500">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-genie-yellow-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-genie-yellow-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-genie-yellow-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="logo-container w-10 h-10">
              <Image
                src="/LogoSymbol.webp"
                alt="Genie Logo"
                width={40}
                height={40}
                className="w-full h-full"
                priority
                quality={100}
                style={{ objectFit: "contain" }}
              />
            </div>
            <span className="text-sm font-bold text-white">GenieApp</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-sm text-genie-text-secondary hover:text-genie-yellow-500 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-genie-text-secondary hover:text-genie-yellow-500 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#download"
              className="text-sm text-genie-text-secondary hover:text-genie-yellow-500 transition-colors"
            >
              Download
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20 bg-linear-to-b from-black via-black to-genie-yellow-500">
        <div className="max-w-7xl mx-auto text-center">
          {/* Onboarding Preview - Exact Copy from App */}
          <OnboardingPreview />

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-16">
            <Link
              href="#download"
              className="bg-linear-to-r from-genie-yellow-500 to-genie-yellow-400 text-black px-8 py-4 rounded-full font-bold text-lg hover:from-genie-yellow-400 hover:to-genie-yellow-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-genie-yellow-500/25"
            >
              Summon Genie
            </Link>
            <Link
              href="#how-it-works"
              className="border-2 border-genie-border-primary text-white px-8 py-4 rounded-full font-semibold text-lg hover:border-genie-yellow-500 hover:text-genie-yellow-500 transition-all duration-300"
            >
              Read more
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="relative z-10 px-6 py-20 bg-genie-background-secondary/50"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-genie-yellow-500 mb-6">
              How Genie Works
            </h2>
            <p className="text-xl text-genie-text-secondary max-w-3xl mx-auto">
              Your personal AI companion that transforms wishes into achievable
              daily plans
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center bg-zinc-900/85 rounded-2xl p-6 border border-zinc-800">
              <div className="w-20 h-20 bg-linear-to-br from-genie-yellow-500 to-genie-yellow-400 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Sparkle size={32} color="#FCD34D" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                Share Your Goal
              </h3>
              <p className="text-genie-text-tertiary">
                Tell Genie what you want to achieve - from fitness to career
                goals
              </p>
            </div>

            <div className="text-center bg-zinc-900/85 rounded-2xl p-6 border border-zinc-800">
              <div className="w-20 h-20 bg-linear-to-br from-genie-yellow-500 to-genie-yellow-400 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Calendar size={32} color="#FCD34D" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                AI Creates Your Plan
              </h3>
              <p className="text-genie-text-tertiary">
                Genie generates a personalized 3-week roadmap with daily tasks
              </p>
            </div>

            <div className="text-center bg-zinc-900/85 rounded-2xl p-6 border border-zinc-800">
              <div className="w-20 h-20 bg-linear-to-br from-genie-yellow-500 to-genie-yellow-400 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Check size={32} color="#FCD34D" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                Track Progress
              </h3>
              <p className="text-genie-text-tertiary">
                Monitor your streaks, achievements, and growth journey
              </p>
            </div>

            <div className="text-center bg-zinc-900/85 rounded-2xl p-6 border border-zinc-800">
              <div className="w-20 h-20 bg-linear-to-br from-genie-yellow-500 to-genie-yellow-400 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Trophy size={32} color="#FCD34D" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                Earn Rewards
              </h3>
              <p className="text-genie-text-tertiary">
                Collect points and unlock achievements as you progress
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-genie-yellow-500 mb-6">
              Why Choose Genie?
            </h2>
            <p className="text-xl text-genie-text-secondary max-w-3xl mx-auto">
              The only AI companion that turns your dreams into daily reality
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-genie-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
                    <Brain size={24} color="#FCD34D" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      AI-Powered Guidance
                    </h3>
                    <p className="text-genie-text-tertiary">
                      Advanced AI creates personalized plans tailored to your
                      specific goals and schedule
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-genie-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
                    <Check size={24} color="#FCD34D" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Daily Task Management
                    </h3>
                    <p className="text-genie-text-tertiary">
                      Simple, actionable tasks that build momentum and keep you
                      on track
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-genie-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
                    <TrendUp size={24} color="#FCD34D" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Progress Tracking
                    </h3>
                    <p className="text-genie-text-tertiary">
                      Visual progress tracking with streaks, achievements, and
                      growth metrics
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-genie-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
                    <Star size={24} color="#FCD34D" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Reward System
                    </h3>
                    <p className="text-genie-text-tertiary">
                      Earn points and unlock achievements to stay motivated
                      throughout your journey
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-zinc-900/85 rounded-2xl p-8 border border-zinc-800 max-w-sm mx-auto">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-genie-yellow-500 rounded-full flex items-center justify-center">
                      <Fire size={16} color="#000000" />
                    </div>
                    <span className="text-white font-semibold">
                      7 Day Streak
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-genie-yellow-500 rounded-full flex items-center justify-center">
                      <Check size={16} color="#000000" />
                    </div>
                    <span className="text-white font-semibold">
                      12 Tasks Done
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-genie-yellow-500 rounded-full flex items-center justify-center">
                      <TrendUp size={16} color="#000000" />
                    </div>
                    <span className="text-white font-semibold">
                      85% Completion
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section
        id="download"
        className="relative z-10 px-6 py-20 bg-genie-background-secondary/50"
      >
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-genie-yellow-500 mb-6">
            Ready to Begin?
          </h2>
          <p className="text-xl text-genie-text-secondary mb-12 max-w-3xl mx-auto">
            Your transformation starts now.
            <br />
            Let Genie guide you to success,
            <br />
            one wish at a time.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              href="#"
              className="bg-linear-to-r from-genie-yellow-500 to-genie-yellow-400 text-black px-8 py-4 rounded-full font-bold text-lg hover:from-genie-yellow-400 hover:to-genie-yellow-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-genie-yellow-500/25 flex items-center space-x-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span>Download for iOS</span>
            </Link>

            <Link
              href="#"
              className="bg-linear-to-r from-genie-yellow-500 to-genie-yellow-400 text-black px-8 py-4 rounded-full font-bold text-lg hover:from-genie-yellow-400 hover:to-genie-yellow-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-genie-yellow-500/25 flex items-center space-x-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              <span>Download for Android</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-genie-border-primary">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="logo-container w-8 h-8">
                <Image
                  src="/LogoSymbol.webp"
                  alt="Genie Logo"
                  width={32}
                  height={32}
                  className="w-full h-full"
                  priority
                  quality={100}
                  style={{ objectFit: "contain" }}
                />
              </div>
              <span className="text-xl font-bold text-white">Genie</span>
            </div>
            <div className="flex items-center space-x-6 text-genie-text-tertiary text-sm">
              <Link
                href="#"
                className="hover:text-yellow-400 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="hover:text-yellow-400 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="hover:text-yellow-400 transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-genie-border-primary/30 text-center text-genie-text-tertiary text-sm">
            <p>© 2025-2026 GenieApp • Version 1.0.3</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
