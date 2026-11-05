'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark, BrandTitle } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { Phone, ArrowRight, ArrowLeft, MessageSquareText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { setTestUser, type TestUser } from '@/lib/auth-utils'
import { LoadingSpinner } from '@/components/ui/loading'
import { safeRedirectPath } from '@/lib/auth/roles'

function AuthPageContent() {
  const [phoneOrId, setPhoneOrId] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  /** Set when a sign-in code was texted: last digits of the number it went to. */
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const redirectTo = safeRedirectPath(searchParams.get('redirect'))

  // If navigation somehow doesn't happen, don't leave the button spinning forever.
  useEffect(() => {
    if (!redirecting) return
    const timer = window.setTimeout(() => setRedirecting(false), 10_000)
    return () => window.clearTimeout(timer)
  }, [redirecting])

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  const finishSignIn = (user: TestUser) => {
    setTestUser(user)
    // Keep the button busy until the next page takes over (no "dead" Continue state).
    setRedirecting(true)
    // Full navigation, not router.replace: the client router may hold a cached
    // signed-out redirect (/dashboard -> /auth) from before the session cookie existed.
    window.location.replace(redirectTo)
    toast({ title: 'Welcome back', description: `Signed in as ${user.full_name}` })
  }

  const verifyCode = async (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 6) return
    setLoading(true)
    setCodeError(null)
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrId: phoneOrId.trim().replace(/\s/g, ''), code: digits }),
        cache: 'no-store',
      })
      const data: { success?: boolean; user?: TestUser; error?: string } = await response.json().catch(() => ({}))
      if (!response.ok || !data.success || !data.user) {
        setCodeError(data.error || `Sign in failed (${response.status})`)
        setCode('')
        codeInputRef.current?.focus()
        return
      }
      finishSignIn(data.user)
    } catch {
      setCodeError('Could not reach the login service. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // Android Chrome can read the texted code straight from the SMS (WebOTP).
  useEffect(() => {
    if (!codeSentTo || typeof window === 'undefined' || !('OTPCredential' in window)) return
    const ac = new AbortController()
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: ac.signal } as CredentialRequestOptions)
      .then((cred) => {
        const otp = (cred as unknown as { code?: string } | null)?.code
        if (otp) {
          setCode(otp)
          void verifyCode(otp)
        }
      })
      .catch(() => undefined)
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeSentTo])

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

      let data: {
        success?: boolean
        user?: TestUser
        error?: string
        codeRequired?: boolean
        sentTo?: string
        resendInSeconds?: number
        retryAfterSeconds?: number
      } = {}
      try {
        data = await response.json()
      } catch {
        throw new Error(
          response.ok
            ? 'Unexpected response from the server'
            : `Login failed (${response.status}). Check that the app is running.`
        )
      }

      if (response.status === 429 && codeSentTo) {
        // Asked to resend too soon: stay on the code step.
        setResendIn(data.retryAfterSeconds ?? 30)
        setCodeError(data.error ?? 'Please wait before asking for another code.')
        return
      }

      if (!response.ok) {
        throw new Error(data.error || `Login failed (${response.status})`)
      }

      if (data.codeRequired) {
        setCodeSentTo(data.sentTo ?? '')
        setCode('')
        setCodeError(null)
        setResendIn(data.resendInSeconds ?? 45)
        window.setTimeout(() => codeInputRef.current?.focus(), 50)
        return
      }

      if (data.success && data.user) {
        finishSignIn(data.user)
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
          <p className="max-w-md font-display text-[42px] font-bold leading-[1.08] tracking-[-0.03em]">Ministry management, without the <span className="bg-gradient-to-r from-brand-200 to-violet-200 bg-clip-text text-transparent">spreadsheet chase.</span></p>
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

            {codeSentTo !== null ? (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  void verifyCode(code)
                }}
              >
                <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-900 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-400/10 dark:text-brand-100 dark:ring-brand-400/20">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>
                    We texted a 6-digit code to your number
                    {codeSentTo ? <> ending <span className="font-mono font-semibold">{codeSentTo}</span></> : null}.
                    It works for 10 minutes.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-code">Sign-in code</Label>
                  <Input
                    ref={codeInputRef}
                    id="signin-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="••••••"
                    value={code}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setCode(next)
                      setCodeError(null)
                      if (next.length === 6) void verifyCode(next)
                    }}
                    className="h-12 text-center font-mono text-2xl tracking-[0.5em] sm:text-2xl"
                    disabled={loading || redirecting}
                    aria-invalid={codeError ? true : undefined}
                    aria-describedby={codeError ? 'signin-code-error' : undefined}
                  />
                  {codeError && (
                    <p id="signin-code-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                      {codeError}
                    </p>
                  )}
                </div>

                <Button type="submit" className="h-11 w-full gap-2" disabled={loading || redirecting || code.length !== 6}>
                  {loading || redirecting ? (
                    <>
                      <LoadingSpinner size="sm" className="text-white" />
                      {redirecting ? 'Opening your dashboard…' : 'Checking…'}
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                    onClick={() => {
                      setCodeSentTo(null)
                      setCode('')
                      setCodeError(null)
                    }}
                    disabled={loading || redirecting}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Different number
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center font-medium text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed disabled:text-neutral-400 dark:text-brand-300 dark:hover:text-brand-200 dark:disabled:text-neutral-500"
                    onClick={() => void handleDirectLogin()}
                    disabled={resendIn > 0 || loading || redirecting}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            ) : (
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
            )}

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
