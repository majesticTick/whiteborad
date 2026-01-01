'use client'

import { signInWithPopup } from 'firebase/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { auth, provider, hasFirebaseConfig, initAnalytics } from '@/lib/firebase'
import { upsertUserProfile } from '@/lib/firestore'
import { useAuthUser } from '@/lib/useAuthUser'

export default function LoginPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const { user, loading } = useAuthUser()

  useEffect(() => {
    initAnalytics().catch((error) => console.error(error))
  }, [])

  useEffect(() => {
    if (!loading && user) {
      const email = user.email ?? ''
      const name = user.displayName ?? email ?? 'Member'
      if (email) {
        upsertUserProfile({ uid: user.uid, name, email }).catch((error) =>
          console.error(error)
        )
      }
      router.push('/dashboard')
    }
  }, [loading, router, user])

  const handleGoogleLogin = async () => {
    if (!auth) {
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      await signInWithPopup(auth, provider)
      router.push('/dashboard')
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto grid min-h-screen max-w-5xl grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col gap-6">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Log in and open your workspace.
          </h1>
          <p className="text-lg text-[var(--muted)]">
            Whiteborad uses Firebase auth for fast sign-in. Invite teammates by
            email or jump in solo to sketch ideas.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-[var(--muted)]">
              OAuth + Firebase
            </span>
            <span className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-[var(--muted)]">
              Team ready
            </span>
            <span className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-[var(--muted)]">
              No install
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-8">
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Choose Google to create your workspace. You can skip login for a
            quick demo.
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={!hasFirebaseConfig || status === 'loading' || loading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-[var(--bg)] disabled:cursor-not-allowed disabled:bg-[rgba(15,15,16,0.4)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
            >
              <path
                fill="#FBBB00"
                d="M5.72 14.09l-.9 3.36-3.28.07A11.97 11.97 0 010 12c0-1.94.47-3.78 1.31-5.4l2.92.54 1.28 2.91A7.17 7.17 0 004.76 12c0 .73.14 1.43.4 2.09z"
              />
              <path
                fill="#518EF8"
                d="M23.43 12.23c0 .77-.07 1.5-.2 2.22-.48 2.7-1.98 5.03-4.13 6.61l-3.7-.19-.52-3.26a7.13 7.13 0 003.08-3.64H12v-3.74h11.43z"
              />
              <path
                fill="#28B446"
                d="M19.1 21.06A11.95 11.95 0 0112 24a12 12 0 01-10.46-6.41l4.17-3.43a7.14 7.14 0 006.29 3.83c1.18 0 2.29-.29 3.28-.79l3.82 3.86z"
              />
              <path
                fill="#F14336"
                d="M19.23 2.82l-4.16 3.42A7.16 7.16 0 0012 5.8a7.16 7.16 0 00-6.29 3.78L1.31 6.6A12 12 0 0112 0a12 12 0 017.23 2.82z"
              />
            </svg>
            {status === 'loading' ? 'Signing in...' : 'Continue with Google'}
          </button>

          {!hasFirebaseConfig && (
            <p className="mt-4 text-xs text-[var(--muted)]">
              Firebase config is missing. Add keys in `.env.local` to enable
              Google login.
            </p>
          )}

          {status === 'error' && (
            <p className="mt-4 text-xs text-[var(--accent)]">
              Login failed. Check Firebase keys or try again.
            </p>
          )}

          <div className="mt-8 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Or</span>
            <Link
              href="/dashboard"
              className="rounded-full border border-[var(--border)] px-4 py-2 text-[var(--ink)]"
            >
              Skip login
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
