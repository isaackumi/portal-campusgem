'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark, BrandTitle } from '@/components/brand-mark'
import { Phone, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { setTestUser, type TestUser } from '@/lib/auth-utils'
import { LoadingSpinner } from '@/components/ui/loading'

function AuthPageContent() {
  const [phoneOrId, setPhoneOrId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const handleDirectLogin = async () => {
    const identifier = phoneOrId.trim().replace(/\s/g, '')

    if (!identifier) {
      toast({
        title: 'Enter your details',
        description: 'Use your phone number or membership ID.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/direct-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrId: identifier }),
        cache: 'no-store',
      })

      let data: { success?: boolean; user?: TestUser; error?: string } = {}
      try {
        data = await response.json()
      } catch {
        throw new Error(
          response.ok
            ? 'Unexpected response from the server'
            : `Login failed (${response.status}). Check that the app is running.`
        )
      }

      if (!response.ok) {
        throw new Error(data.error || `Login failed (${response.status})`)
      }

      if (data.success && data.user) {
        setTestUser(data.user)
        toast({
          title: 'Welcome back',
          description: `Signed in as ${data.user.full_name}`,
        })
        router.push(redirectTo)
      } else {
        throw new Error(data.error || 'Invalid credentials')
      }
    } catch (error) {
      const description =
        error instanceof TypeError && error.message === 'Failed to fetch'
          ? 'Could not reach the login service. Check your connection.'
          : error instanceof Error
            ? error.message
            : 'Please check your credentials and try again'
      toast({
        title: 'Sign in failed',
        description,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* Brand panel */}
        <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-16 lg:flex lg:flex-col lg:justify-between">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'url(/login-bg.svg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-8 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-4">
            <BrandMark size="lg" />
            <div>
              <p className="text-lg font-semibold text-white">Campus Gem Ministries</p>
              <p className="text-sm text-slate-400">Kokomlemle, Accra</p>
            </div>
          </div>

          <div className="relative z-10 max-w-md space-y-6">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
              Ministry management,{' '}
              <span className="text-amber-400">in one place</span>
            </h1>
            <p className="text-base leading-relaxed text-slate-300">
              Members, attendance, camp meeting, RLC follow-up, and outreach — sign in with your
              phone or membership ID.
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-amber-400" />
                Secure staff sign-in
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-amber-400" />
                Role-based access
              </li>
            </ul>
          </div>

          <p className="relative z-10 text-xs text-slate-500">© Campus Gem Ministries</p>
        </section>

        {/* Sign-in form */}
        <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <BrandMark />
              <BrandTitle light />
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
              <p className="mt-2 text-sm text-slate-600">
                Phone number or membership ID (e.g. CG-2024-XXXX)
              </p>
            </div>

            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                void handleDirectLogin()
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="phone-or-id">Phone or membership ID</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="phone-or-id"
                    type="text"
                    placeholder="0541234567 or CG-2024-0001"
                    value={phoneOrId}
                    onChange={(e) => setPhoneOrId(e.target.value)}
                    className="h-11 pl-10"
                    disabled={loading}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2"
                disabled={loading || !phoneOrId.trim()}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="text-white" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-500">
              Need access? Contact your church administrator.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <LoadingSpinner />
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  )
}
