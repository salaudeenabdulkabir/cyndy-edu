'use client'
import { clientError } from '@/lib/client-error'

import { useSignIn } from '@clerk/nextjs'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function WorkerLoginPage() {
  const { signIn, isLoaded, setActive } = useSignIn()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || loading) return

    setError('')
    setLoading(true)

    try {
      const result = await signIn!.create({
        identifier: email,
        password,
        strategy: 'password',
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        const response = await fetch('/api/auth/session')
        const account = await response.json()
        if (!response.ok || !['worker', 'admin'].includes(account.role)) throw new Error('Worker access is required. Contact support.')
        router.replace(account.role === 'admin' ? '/admin/login' : account.passwordChangeRequired ? '/worker/change-password' : '/worker')
        router.refresh()
      } else {
        setError('Authentication failed. Please try again.')
      }
    } catch (err: unknown) {
      setError(clientError(err, 'Invalid email or password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-navy-2 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-bold text-gold mb-2">
            Cyndy
          </h1>
          <p className="text-gray-400">Worker Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="font-heading text-2xl font-bold text-navy mb-2">
            Welcome back
          </h2>
          <p className="text-text-secondary text-sm mb-8">
            Sign in to your worker account
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-2">
                Email
              </label>
              <input
                aria-label="Email" autoComplete="username" type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
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
                aria-label="Password" autoComplete="current-password" type="password"
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

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Help */}
          <div className="mt-8 text-center">
            <p className="text-sm text-text-secondary">
              Need help?{' '}
              <a href="/contact" className="text-gold hover:text-gold-light font-semibold">
                Contact support
              </a>
            </p>
          </div>
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
