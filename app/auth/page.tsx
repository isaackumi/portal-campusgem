'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark, BrandTitle } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { Phone, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { setTestUser, type TestUser } from '@/lib/auth-utils'
import { LoadingSpinner } from '@/components/ui/loading'
import { safeRedirectPath } from '@/lib/auth/roles'

function AuthPageContent() {
  const [phoneOrId, setPhoneOrId] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const redirectTo = safeRedirectPath(searchParams.get('redirect'))

  // If navigation somehow doesn't happen, don't leave the button spinning forever.
  useEffect(() => {
    if (!redirecting) return
    const timer = window.setTimeout(() => setRedirecting(false), 10_000)
    return () => window.clearTimeout(timer)
  }, [redirecting])

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
        // Keep the button busy until the next page takes over (no "dead" Continue state).
        setRedirecting(true)
        // Full navigation, not router.replace: the client router may hold a cached
        // signed-out redirect (/dashboard -> /auth) from before the session cookie existed.
        window.location.replace(redirectTo)
        toast({
          title: 'Welcome back',
          description: `Signed in as ${data.user.full_name}`,
        })
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
    <div className="flex min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-neutral-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <BrandMark size="lg" className="bg-white/15 from-transparent to-transparent shadow-none" />
          <span className="leading-tight">
            <span className="block app-overliner text-white/60">Campus Gem</span>
            <span className="block text-lg font-bold">Ministries</span>
          </span>
        </div>
        <div>
          <p className="max-w-md font-display text-[44px] leading-[1.05] tracking-[-0.01em]">Ministry management, without the <em className="text-brand-200">spreadsheet chase.</em></p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px]">1</span>
              Sign in with a phone number or membership ID
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px]">2</span>
              Camp, RLC, members, and outreach in one place
            </li>
          </ul>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} Campus Gem Ministries</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-white/5" aria-hidden />
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <BrandTitle />
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-8">
            <h1 className="app-page-title">Welcome <span className="app-display-accent">back</span></h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Phone number or membership ID (e.g. CG-2024-XXXX)
            </p>
            <div className="mt-6">

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
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="phone-or-id"
                    type="text"
                    placeholder="0541234567 or CG-2024-0001"
                    value={phoneOrId}
                    onChange={(e) => setPhoneOrId(e.target.value)}
                    className="h-11 pl-10"
                    disabled={loading || redirecting}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2"
                disabled={loading || redirecting || !phoneOrId.trim()}
              >
                {loading || redirecting ? (
                  <>
                    <LoadingSpinner size="sm" className="text-white" />
                    {redirecting ? 'Opening your dashboard…' : 'Signing in…'}
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
              Need access? Contact your church administrator.
            </p>
          </div>
        </div>
      </div>
      </main>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-900">
          <LoadingSpinner />
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  )
}
