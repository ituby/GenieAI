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
              We collect the following types of information:
            </p>
            
            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Contact Information</h3>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Other contact information</li>
            </ul>
            <p className="text-genie-text-tertiary text-sm ml-4 mb-4">
              Used for: Product personalization, app functionality, analytics, and tracking purposes
            </p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Location Data</h3>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>Precise location (when you grant permission)</li>
            </ul>
            <p className="text-genie-text-tertiary text-sm ml-4 mb-4">
              Used for: Product personalization, app functionality, and tracking purposes
            </p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Identifiers</h3>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>Device ID</li>
            </ul>
            <p className="text-genie-text-tertiary text-sm ml-4 mb-4">
              Used for: App functionality, analytics, product personalization, and tracking purposes
            </p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Usage Data</h3>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>Product interaction (how you use the app)</li>
              <li>Goals and tasks you create</li>
              <li>App features and pages visited</li>
              <li>Other usage information</li>
            </ul>
            <p className="text-genie-text-tertiary text-sm ml-4 mb-4">
              Used for: Analytics, app functionality, product personalization, and tracking purposes
            </p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Diagnostics</h3>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>Crash data</li>
              <li>Performance data</li>
              <li>Other diagnostic information</li>
            </ul>
            <p className="text-genie-text-tertiary text-sm ml-4 mb-4">
              Used for: App functionality, analytics, product personalization, and tracking purposes
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li><strong>App Functionality:</strong> To provide core features, personalized task generation, and goal tracking</li>
              <li><strong>Product Personalization:</strong> To customize your experience based on your preferences and usage patterns</li>
              <li><strong>Analytics:</strong> To understand how you use the app and improve our features</li>
              <li><strong>Tracking:</strong> To measure app performance and user engagement across sessions</li>
              <li><strong>Customer Support:</strong> To respond to your inquiries and provide assistance</li>
              <li><strong>Notifications:</strong> To send you relevant updates about your goals and tasks</li>
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
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Sharing and Third Parties</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              We do not sell your personal information. We may share information with:
            </p>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li><strong>Service Providers:</strong> We use third-party services (Supabase for database, Google AI for task generation, analytics providers) that may process your data on our behalf</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share specific information</li>
            </ul>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              <strong>Data Used for Tracking:</strong> We use data collected from this app to track your activity across apps and websites owned by other companies for advertising and analytics purposes.
            </p>
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
              support@askgenie.info
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

