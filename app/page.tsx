'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import './landing.css'
import InstallPrompt from './install-prompt'

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const role = user?.publicMetadata.role
  const dashboard = role === 'admin' ? '/admin' : role === 'worker' ? '/worker' : '/apply'

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const role = user.publicMetadata.role
      router.replace(role === 'admin' ? '/admin' : role === 'worker' ? '/worker' : '/apply')
    }
  }, [isLoaded, isSignedIn, router, user])

  return (
    <div className="cyndy-landing">
<a className="skip" href="#main">Skip to content</a>
  <header className="header"><Link className="brand" href="/" aria-label="Cyndy Educational Pathways">Cyndy<span>EDUCATIONAL PATHWAYS</span></Link><nav aria-label="Main navigation"><a href="#guidance">Our guidance</a><a href="#destinations">Destinations</a><Link className="button small" href={isSignedIn ? dashboard : "/sign-in"}>{isSignedIn ? "My dashboard" : "Sign in"} <span aria-hidden="true">↗</span></Link></nav></header>
  <main id="main">
    <section className="hero wrap"><div><p className="eyebrow">YOUR NEXT CHAPTER</p><h1>A world of possibility.<br /><em>A path of your own.</em></h1><p className="intro">Take the next step towards international study with personal guidance from Cyndy Educational Pathways.</p><div className="actions"><Link className="button" href={isSignedIn ? dashboard : "/sign-up"}>{isSignedIn ? "Open your dashboard" : "Start your application"} <span aria-hidden="true">↗</span></Link><a className="text-link" href="#guidance">Explore our approach <span aria-hidden="true">↓</span></a></div><p className="note">Have a question before applying? <Link href="/contact">Contact our team.</Link></p></div><aside className="journey" aria-label="Your study journey"><p className="eyebrow">FROM AMBITION TO A PLAN</p><div className="orbit" aria-hidden="true"><span>YOUR<br />NEXT<br />CHAPTER</span></div><ol><li><span>01</span>Explore your options</li><li><span>02</span>Prepare your application</li><li><span>03</span>Plan your next steps</li></ol></aside></section>
    <section id="guidance" className="section pale"><div className="wrap"><p className="eyebrow">A CLEARER WAY FORWARD</p><div className="section-heading"><h2>Big decisions.<br />Personal guidance.</h2><p>Every study journey starts with different goals. We help you understand your options and prepare for the application process.</p></div><div className="cards"><article><span className="number">01 / EXPLORE</span><h3>Find your direction</h3><p>Talk through your study interests, preferred destinations and plans for the future.</p></article><article><span className="number">02 / PREPARE</span><h3>Understand the process</h3><p>Get guidance on application requirements and the steps involved in preparing your submission.</p></article><article><span className="number">03 / PLAN</span><h3>Know what comes next</h3><p>Discuss timelines and practical next steps with our team before moving forward.</p></article></div></div></section>
    <section id="destinations" className="section wrap"><p className="eyebrow">LOOK BEYOND BORDERS</p><h2>Where could your studies take you?</h2><p className="section-intro">Start a conversation about your preferred destination. Available programmes and entry requirements vary by institution.</p><ul className="countries"><li>United Kingdom</li><li>Canada</li><li>Germany</li><li>Netherlands</li><li>Sweden</li><li>Australia</li><li>United States</li><li>Hungary</li><li>France</li><li>Ireland</li></ul></section>
    <section className="contact-band"><div className="wrap"><p className="eyebrow">LET’S TALK ABOUT YOUR PLANS</p><h2>Your next chapter starts<br />with a conversation.</h2><Link className="button" href="/contact">Contact Cyndy <span aria-hidden="true">↗</span></Link><p>Admissions and visa decisions rest with the relevant institutions and authorities.</p></div></section>
  </main>
  <footer className="wrap footer"><div className="brand">Cyndy<span>EDUCATIONAL PATHWAYS</span></div><p>© {new Date().getFullYear()} Cyndy Educational Pathways</p><nav aria-label="Footer"><Link href="/contact">Contact</Link><Link href="/privacy-policy">Privacy policy</Link><Link href="/terms-of-service">Terms of service</Link></nav></footer>
      <InstallPrompt />
    </div>
  )
}
