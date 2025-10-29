"use client";

import Link from "next/link";
import Image from "next/image";

export default function Contact() {
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
          Contact Us
        </h1>
        
        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Get in Touch</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              We'd love to hear from you! Whether you have questions, feedback, or need support, 
              our team is here to help.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Support</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              For technical support and general inquiries:
            </p>
            <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
              <p className="text-genie-yellow-500 font-semibold text-lg mb-2">
                support@askgenie.info
              </p>
              <p className="text-genie-text-tertiary text-sm">
                We typically respond within 24 hours
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Feedback</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              Have suggestions for new features or improvements? We're always looking to make 
              GenieApp better for our users.
            </p>
            <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
              <p className="text-genie-yellow-500 font-semibold text-lg mb-2">
                feedback@genie.app
              </p>
              <p className="text-genie-text-tertiary text-sm">
                Your ideas help us improve
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Business Inquiries</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              For partnerships, press, and other business matters:
            </p>
            <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
              <p className="text-genie-yellow-500 font-semibold text-lg mb-2">
                business@genie.app
              </p>
              <p className="text-genie-text-tertiary text-sm">
                Let's collaborate
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Social Media</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              Follow us for updates, tips, and inspiration:
            </p>
            <div className="flex gap-4 mt-6">
              <a 
                href="#" 
                className="flex items-center gap-2 bg-zinc-900/50 rounded-lg px-6 py-3 border border-zinc-800 hover:border-genie-yellow-500 transition-colors"
              >
                <span className="text-white">Twitter</span>
              </a>
              <a 
                href="#" 
                className="flex items-center gap-2 bg-zinc-900/50 rounded-lg px-6 py-3 border border-zinc-800 hover:border-genie-yellow-500 transition-colors"
              >
                <span className="text-white">Instagram</span>
              </a>
              <a 
                href="#" 
                className="flex items-center gap-2 bg-zinc-900/50 rounded-lg px-6 py-3 border border-zinc-800 hover:border-genie-yellow-500 transition-colors"
              >
                <span className="text-white">LinkedIn</span>
              </a>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Office Hours</h2>
            <p className="text-genie-text-secondary leading-relaxed mb-4">
              Our support team is available:
            </p>
            <ul className="list-disc list-inside text-genie-text-secondary leading-relaxed mb-4 ml-4">
              <li>Monday - Friday: 9:00 AM - 6:00 PM (EST)</li>
              <li>Saturday - Sunday: Limited support via email</li>
            </ul>
          </section>

          <div className="mt-12 pt-8 border-t border-zinc-800">
            <p className="text-genie-text-secondary leading-relaxed">
              Thank you for choosing GenieApp. We're committed to helping you achieve 
              your goals and providing the best possible experience.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

