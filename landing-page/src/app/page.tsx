"use client";

import Image from "next/image";
import Link from "next/link";
import OnboardingPreview from "../components/OnboardingPreview";
import { FireflyBackground } from "../components/FireflyBackground";
import {
  Sparkle,
  Calendar,
  CheckCircle,
  TrendUp,
  Trophy,
} from "phosphor-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-black relative">
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
            <Link
              href="/privacy"
              className="text-sm text-genie-text-secondary hover:text-genie-yellow-500 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-genie-text-secondary hover:text-genie-yellow-500 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="text-sm text-genie-text-secondary hover:text-genie-yellow-500 transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20 min-h-screen bg-linear-to-b from-black/95 from-0% via-black/70 via-60% to-black/50 to-100% overflow-hidden">
        {/* Background Effects - 5 Harmonious Layers - Only in Hero */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Layer 1: Ambient glow effects - very subtle */}
          <div className="absolute -top-60 -right-60 w-[800px] h-[800px] bg-[#FCD34D]/4 rounded-full blur-[200px]"></div>
          <div className="absolute -bottom-60 -left-60 w-[800px] h-[800px] bg-[#FCD34D]/6 rounded-full blur-[200px]"></div>
          <div className="absolute top-1/3 left-1/4 w-[900px] h-[900px] bg-[#FCD34D]/3 rounded-full blur-[250px]"></div>
          
          {/* Layer 2: Medium yellow glow from bottom - smooth transition */}
          <div className="absolute bottom-0 left-0 right-0 h-[900px] bg-linear-to-t from-[#FCD34D]/6 from-0% via-[#FCD34D]/3 via-30% to-transparent to-100% blur-3xl"></div>
          
          {/* Layer 3: Soft yellow lighting from bottom - gentle and diffused */}
          <div className="absolute bottom-0 left-0 right-0 h-[600px] bg-linear-to-t from-[#FCD34D]/10 from-0% via-[#FCD34D]/5 via-40% to-transparent to-100% blur-2xl"></div>
          
          {/* Layer 4: Extra soft diffused yellow from bottom - very gentle */}
          <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-linear-to-t from-[#FCD34D]/12 from-0% via-[#FCD34D]/6 via-50% to-transparent to-100% blur-3xl"></div>
          
          {/* Layer 5: Subtle concentrated yellow from bottom - soft focus */}
          <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-linear-to-t from-[#FCD34D]/15 from-0% via-[#FCD34D]/8 via-60% to-transparent to-100% blur-2xl"></div>
        </div>

        {/* Firefly Background Animation - Only in Hero */}
        <FireflyBackground count={60} />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Onboarding Preview - Exact Copy from App */}
          <OnboardingPreview />
        </div>

        {/* CTA Buttons - Separate container with clear separation */}
        <div className="max-w-7xl mx-auto text-center relative z-10 mt-96">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="#download"
              className="bg-linear-to-r from-genie-yellow-500 to-genie-yellow-400 text-black px-8 py-4 rounded-full font-bold text-lg hover:from-genie-yellow-400 hover:to-genie-yellow-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-genie-yellow-500/25"
            >
              Summon Genie
            </Link>
            <Link
              href="#how-it-works"
              className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:border-genie-yellow-500 hover:text-genie-yellow-500 transition-all duration-300"
            >
              Read more
            </Link>
          </div>
        </div>

        {/* Thin Yellow Gradient Divider */}
        <div className="relative z-20 mt-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="w-full h-0.5 bg-linear-to-r from-transparent via-genie-yellow-500 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="relative z-10 px-6 py-20 bg-linear-to-b from-black/50 from-0% via-black/80 via-50% to-black/95 to-100%"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 pt-40">
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
                <Sparkle size={32} color="#FCD34D" weight="fill" />
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
                <Calendar size={32} color="#FCD34D" weight="fill" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                AI Creates Your Plan
              </h3>
              <p className="text-genie-text-tertiary">
                Genie generates a personalized roadmap with daily tasks, tailored to your chosen duration
              </p>
            </div>

            <div className="text-center bg-zinc-900/85 rounded-2xl p-6 border border-zinc-800">
              <div className="w-20 h-20 bg-linear-to-br from-genie-yellow-500 to-genie-yellow-400 rounded-full flex items-center justify-center mb-6 mx-auto">
                <CheckCircle size={32} color="#FCD34D" weight="fill" />
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
                <Trophy size={32} color="#FCD34D" weight="fill" />
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

      {/* Download Section */}
      <section
        id="download"
        className="relative z-10 px-6 py-20 bg-black"
      >
        <div className="max-w-7xl mx-auto text-center pt-32">
          <h2 className="text-2xl md:text-3xl font-bold text-genie-yellow-500 mb-6">
            Ready to Begin?
          </h2>
          <p className="text-xl text-genie-text-secondary mb-12 max-w-3xl mx-auto">
            Your transformation starts now.
            <br />
            Let Genie guide you to success, one wish at a time.
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
      <footer className="relative z-10 pt-32">
        {/* Custom dark gray divider */}
        <div className="w-full h-px" style={{ backgroundColor: '#3f3f46' }}></div>
        
        {/* Footer content with dark gray background */}
        <div className="px-6 py-12" style={{ backgroundColor: '#18181b' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Logo */}
              <div className="flex items-center space-x-3">
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
              
              {/* Copyright - Center */}
              <div className="text-center text-genie-text-tertiary text-sm">
                <p>© 2025-2026 GenieApp • Version 1.0.3</p>
              </div>
              
            {/* Links - Right */}
            <div className="flex items-center space-x-6 text-genie-text-tertiary text-sm">
              <Link
                href="/privacy"
                className="hover:text-yellow-400 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-yellow-400 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/contact"
                className="hover:text-yellow-400 transition-colors"
              >
                Contact
              </Link>
            </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
