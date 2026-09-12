'use client'
import { clientError } from '@/lib/client-error'

import { useAuth, useClerk, useSignIn } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const { signIn, isLoaded, setActive } = useSignIn()
  const { isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const router = useRouter()

  // Step 1: Email/Password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'login' | 'pin'>('login')

  // Step 2: PIN
  const [pin, setPin] = useState('')
  const [pinAttempts, setPinAttempts] = useState(0)
  const [pinLocked, setPinLocked] = useState(false)

  useEffect(() => {
    if (!pinLocked) return
    const timer = setTimeout(() => { setPinLocked(false); setPinAttempts(0); setError('') }, 15 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [pinLocked])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    fetch('/api/auth/session').then(async response => {
      const account = await response.json()
      if (!cancelled && response.ok && account.role === 'admin') setStep('pin')
    }).catch(() => { if (!cancelled) setError('Unable to verify your account. Please try signing in again.') })
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || loading) return

    setError('')
    setLoading(true)

    try {
      // Clerk cannot create a second sign-in while another browser session is active.
      if (isSignedIn) {
        await signOut()
      }

      const result = await signIn!.create({
        identifier: email,
        password,
        strategy: 'password',
      })

      if (result.status === 'complete') {
        if (!result.createdSessionId) {
          throw new Error('Clerk did not create an active session')
        }

        await setActive({ session: result.createdSessionId })

        const response = await fetch('/api/auth/session')
        const account = await response.json()
        if (!response.ok || account.role !== 'admin') throw new Error('Access denied. This portal is for administrators only.')
        // Move to PIN step
        setStep('pin')
        setPin('')
        setPinAttempts(0)
      } else {
        setError('Authentication failed. Please try again.')
      }
    } catch (err: unknown) {
      setError(clientError(err, 'Invalid email or password'))
    } finally {
      setLoading(false)
    }
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pinLocked || pin.length !== 6) return

    if (loading) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/admin-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
      const body = await response.json()
      if (!response.ok) { if (response.status === 429) setPinLocked(true); throw new Error(body.error || 'Unable to verify PIN') }
      router.replace('/admin')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to verify PIN')
      setPinAttempts(value => value + 1)
      setPin('')
    } finally { setLoading(false) }
  }

  const handlePinChange = (newPin: string) => {
    if (newPin.length <= 6 && /^\d*$/.test(newPin)) {
      setPin(newPin)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-bold text-gold mb-2">
            Cyndy
          </h1>
          <p className="text-gray-400">Admin Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {step === 'login' ? (
            <>
              <h2 className="font-heading text-2xl font-bold text-navy mb-2">
                Admin access
              </h2>
              <p className="text-text-secondary text-sm mb-8">
                Sign in with your administrator credentials
              </p>

              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-2">
                    Email
                  </label>
                  <input
                    aria-label="Email"
                    autoComplete="username"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@cyndyedu.com"
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold-dim transition"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-2">
                    Password
                  </label>
                  <input
                    aria-label="Password"
                    autoComplete="current-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold-dim transition"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-danger">{error}</p>
                  </div>
                )}

                {/* Continue Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold hover:bg-gold-light text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-bold text-navy mb-2">
                Enter security PIN
              </h2>
              <p className="text-text-secondary text-sm mb-8">
                6-digit PIN required for admin access
              </p>

              <form onSubmit={handlePinSubmit} className="space-y-6">
                {/* PIN Input */}
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-4">
                    Security PIN
                  </label>
                  <div className="flex justify-center gap-2 mb-4">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-9 sm:w-12 h-12 border-2 border-gold rounded-lg flex items-center justify-center font-bold text-lg text-gold bg-gold-dim"
                      >
                        {pin[i] ? '•' : ''}
                      </div>
                    ))}
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    aria-label="Six-digit security PIN"
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    maxLength={6}
                    placeholder="Enter 6 digits"
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold-dim transition text-center font-mono text-2xl tracking-widest"
                    disabled={pinLocked}
                    autoFocus
                  />
                </div>

                {/* Attempts Counter */}
                <p className="text-center text-xs text-text-secondary">
                  Attempt {pinAttempts} of 3
                </p>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-danger text-center">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={pin.length !== 6 || pinLocked || loading}
                  className="w-full bg-gold hover:bg-gold-light text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify PIN
                </button>

                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => {
                    setStep('login')
                    setPin('')
                    setError('')
                  }}
                  disabled={pinLocked}
                  className="w-full bg-white text-navy font-semibold py-2 rounded-lg border border-border hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
              </form>
            </>
          )}

          {step === 'login' && (
            <div className="mt-8 text-center">
              <p className="text-sm text-text-secondary">
                Need help?{' '}
                <a href="/contact" className="text-gold hover:text-gold-light font-semibold">
                  Contact support
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-300 transition">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
