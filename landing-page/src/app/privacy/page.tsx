"use client";

import Link from "next/link";
import Image from "next/image";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-6 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
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
          </Link>
          <Link
            href="/"
            className="text-sm text-genie-text-secondary hover:text-genie-yellow-500 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-genie-yellow-500 mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              At GenieApp, we respect your privacy and are committed to protecting your personal information. 
              This Privacy Policy explains how we collect, use, and safeguard your data when you use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>Account information (email, name)</li>
              <li>Goals and tasks you create</li>
              <li>Usage data and preferences</li>
              <li>Device information and analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              Your data is used solely to provide and improve our services:
            </p>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>To provide personalized task generation</li>
              <li>To track your progress and achievements</li>
              <li>To send you relevant notifications</li>
              <li>To improve our AI algorithms and features</li>
              <li>To provide customer support</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Sharing</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share 
              your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt-out of communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">7. Changes to This Policy</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any 
              significant changes by posting the new policy on this page and updating the 
              "Last Updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">8. Contact Us</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-genie-yellow-500 font-semibold">
              support@genie.app
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-zinc-800">
            <p className="text-genie-text-tertiary text-sm">
              Last Updated: January 2025
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

