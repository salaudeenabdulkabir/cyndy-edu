'use client'

import InstallPrompt from './install-prompt'
import { SignInButton, SignUpButton, useAuth, useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const role = user?.publicMetadata?.role
      router.push(role === 'admin' ? '/admin' : role === 'worker' ? '/worker' : '/apply')
    }
  }, [isLoaded, isSignedIn, router, user])

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-[--border] z-50 h-16 flex items-center px-4 sm:px-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="font-heading text-2xl font-bold text-navy">
            Cyndy
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            <SignInButton mode="modal">
              <button className="whitespace-nowrap px-3 sm:px-4 py-2 border border-border rounded-lg text-text-primary hover:bg-surface-hover transition">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal"><button className="whitespace-nowrap px-3 sm:px-6 py-2 bg-gold text-white rounded-lg font-semibold hover:bg-gold-light transition">
              Apply now
            </button></SignUpButton>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section */}
        <section className="min-h-[100vh] bg-background flex items-center justify-center px-6 py-20">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="text-xs font-bold tracking-widest uppercase text-text-secondary mb-6">
              Cyndy Educational Pathways
            </p>
            <h1 className="font-heading text-5xl md:text-6xl font-bold text-navy mb-6">
              Your path to a world-class education starts here.
            </h1>
            <p className="text-lg text-text-secondary mb-12 max-w-2xl mx-auto">
              Expert guidance, fast processing, and secure document management for your international study dreams.
            </p>

            {/* Trust Bar */}
            <div className="mb-12 flex justify-center gap-8 text-sm text-text-secondary flex-wrap">
              <div>
                Personal application guidance
              </div>
              <div>
                International study options
              </div>
              <div>
                Track your progress online
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4 justify-center flex-wrap">
              <SignUpButton mode="modal">
                <button className="px-8 py-4 bg-gold text-white rounded-lg font-semibold hover:bg-gold-light transition text-lg">
                  Start application
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="px-8 py-4 border border-border bg-white text-navy rounded-lg font-semibold hover:bg-surface-hover transition text-lg">
                  Track my application
                </button>
              </SignInButton>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="scroll-mt-20 py-20 px-6 bg-white">
          <div className="container mx-auto">
            <h2 className="font-heading text-4xl font-bold text-center mb-16 text-navy">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-12 max-w-3xl mx-auto">
              {[
                {
                  num: '1',
                  title: 'Create account',
                  desc: 'Sign up in seconds with your email and build your profile.',
                },
                {
                  num: '2',
                  title: 'Fill & upload',
                  desc: 'Complete your application and upload required documents securely.',
                },
                {
                  num: '3',
                  title: 'We submit, you track',
                  desc: 'We handle submissions and you track everything in real-time.',
                },
              ].map((step) => (
                <div key={step.num} className="text-center">
                  <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4 text-white font-heading text-2xl font-bold">
                    {step.num}
                  </div>
                  <h3 className="font-heading text-xl font-bold mb-2 text-navy">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Destination Countries */}
        <section id="destinations" className="scroll-mt-20 py-20 px-6 bg-background">
          <div className="container mx-auto">
            <h2 className="font-heading text-4xl font-bold text-center mb-16 text-navy">
              Study in your dream destination
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-4xl mx-auto">
              {[
                { flag: '🇬🇧', name: 'United Kingdom' },
                { flag: '🇨🇦', name: 'Canada' },
                { flag: '🇩🇪', name: 'Germany' },
                { flag: '🇳🇱', name: 'Netherlands' },
                { flag: '🇸🇪', name: 'Sweden' },
                { flag: '🇦🇺', name: 'Australia' },
                { flag: '🇺🇸', name: 'USA' },
                { flag: '🇭🇺', name: 'Hungary' },
                { flag: '🇫🇷', name: 'France' },
                { flag: '🇮🇪', name: 'Ireland' },
              ].map((country) => (
                <div
                  key={country.name}
                  className="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition cursor-pointer"
                >
                  <div className="text-4xl mb-2">{country.flag}</div>
                  <p className="font-semibold text-navy text-sm">
                    {country.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Cyndy */}
        <section className="py-20 px-6 bg-white">
          <div className="container mx-auto">
            <h2 className="font-heading text-4xl font-bold text-center mb-16 text-navy">
              Why choose Cyndy?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  title: 'Expert Guidance',
                  desc: 'Personalized support from education specialists at every step.',
                },
                {
                  title: 'Fast Processing',
                  desc: 'Swift document verification and submission tracking.',
                },
                {
                  title: 'Secure Platform',
                  desc: 'Private document access with expiring download links.',
                },
                {
                  title: 'Live Tracking',
                  desc: 'Check the latest application status in your portal.',
                },
              ].map((feature) => (
                <div key={feature.title} className="bg-background rounded-2xl p-8 text-center">
                  <h3 className="font-heading text-xl font-bold mb-3 text-navy">
                    {feature.title}
                  </h3>
                  <p className="text-text-secondary text-sm">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 px-6 bg-navy text-white">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div>
                <h4 className="font-heading text-xl font-bold mb-4 text-white">Cyndy</h4>
                <p className="text-sm opacity-75">
                  Making international education accessible to everyone.
                </p>
              </div>
              <div>
                <h5 className="font-semibold mb-4 text-white">Explore</h5>
                <ul className="space-y-2 text-sm"><li><a href="#how-it-works">How it works</a></li><li><a href="#destinations">Destinations</a></li></ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4 text-white">Support</h5>
                <a href="/contact" className="text-sm">Contact our team</a>
              </div>
              <div>
                <h5 className="font-semibold mb-4 text-white">Policies</h5>
                <ul className="space-y-2 text-sm"><li><a href="/privacy-policy">Privacy policy</a></li><li><a href="/terms-of-service">Terms of service</a></li></ul>
              </div>
            </div>
            <div className="border-t border-navy-2 pt-8 text-center text-sm opacity-75">
              <p>© {new Date().getFullYear()} Cyndy Educational Pathways. All rights reserved.</p><InstallPrompt />
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
