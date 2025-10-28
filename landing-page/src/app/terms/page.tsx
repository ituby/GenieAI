"use client";

import Link from "next/link";
import Image from "next/image";

export default function TermsOfService() {
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
          Terms & Conditions
        </h1>
        
        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              By using GenieApp, you agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              GenieApp is an AI-powered goal companion that helps you achieve your personal 
              and professional objectives through intelligent task generation, progress tracking, 
              and personalized notifications.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">3. User Responsibilities</h2>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You must provide accurate and complete information</li>
              <li>You agree to use the service in compliance with all applicable laws</li>
              <li>You will not use the service for any unlawful or prohibited activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">4. Privacy and Data</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              We respect your privacy and are committed to protecting your personal information. 
              Your data is used solely to provide and improve our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">5. Service Availability</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              While we strive to maintain high service availability, we do not guarantee 
              uninterrupted access to our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">6. Limitation of Liability</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              GenieApp shall not be liable for any indirect, incidental, special, or consequential 
              damages arising from your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">7. Changes to Terms</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              We reserve the right to modify these terms at any time. Continued use of the 
              service constitutes acceptance of any changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">8. Contact Information</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              If you have any questions about these terms, please contact us at:
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

