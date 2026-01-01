'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { hasFirebaseConfig } from '@/lib/firebase'
import { createWorkspace } from '@/lib/firestore'
import { useAuthUser } from '@/lib/useAuthUser'

const createGuestId = () => `guest-${Math.random().toString(36).slice(2, 10)}`

export default function NewWorkspacePage() {
  const router = useRouter()
  const { user, loading } = useAuthUser()
  const [emails, setEmails] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [name, setName] = useState('')
  const [solo, setSolo] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const requiresLogin = hasFirebaseConfig && !loading && !user

  const addEmail = () => {
    const trimmed = input.trim()
    if (!trimmed || emails.includes(trimmed)) {
      setInput('')
      return
    }
    setEmails((prev) => [...prev, trimmed])
    setInput('')
  }

  const removeEmail = (target: string) => {
    setEmails((prev) => prev.filter((email) => email !== target))
  }

  const handleCreate = async () => {
    if (status === 'loading') return
    if (requiresLogin) {
      router.push('/login')
      return
    }
    setStatus('loading')
    try {
      if (!hasFirebaseConfig) {
        router.push('/workspace/demo')
        return
      }
      const ownerId = user?.uid ?? createGuestId()
      const ownerName = user?.displayName ?? user?.email ?? 'Guest'
      const ownerEmail = user?.email ?? 'guest@local'
      const ownerPhotoUrl = user?.photoURL ?? ''
      const invites = solo ? [] : emails
      const workspaceId = await createWorkspace({
        name: name.trim() || 'Untitled workspace',
        ownerId,
        ownerName,
        ownerEmail,
        ownerPhotoUrl,
        invites,
      })
      router.push(`/workspace/${workspaceId}`)
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold">Invite your team</h1>
          <p className="text-sm text-[var(--muted)]">
            Add teammates by email or switch to solo mode to keep it private.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-8">
          <div className="grid gap-6">
            <label className="flex flex-col gap-2 text-sm">
              Workspace name
              <input
                type="text"
                placeholder="e.g. Idea Sprint / Team Vision"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={requiresLogin}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm"
              />
            </label>

            <div className="grid gap-3">
              <p className="text-sm">Invite by email</p>
              <div className="flex flex-wrap gap-3">
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={requiresLogin}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={addEmail}
                  disabled={requiresLogin}
                  className="rounded-full bg-[var(--ink)] px-5 py-3 text-xs font-semibold text-[var(--bg)]"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {emails.length === 0 && (
                  <span className="text-xs text-[var(--muted)]">
                    No invites yet.
                  </span>
                )}
                {emails.map((email) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="rounded-full border border-[var(--border)] px-3 py-2 text-xs text-[var(--ink)]"
                  >
                    {email} ×
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm">
              <span>Work solo (no invites)</span>
              <input
                type="checkbox"
                checked={solo}
                onChange={(event) => setSolo(event.target.checked)}
                disabled={requiresLogin}
                className="h-4 w-4"
              />
            </label>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading || status === 'loading' || requiresLogin}
              className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-[var(--bg)] disabled:cursor-not-allowed disabled:bg-[rgba(15,15,16,0.4)]"
            >
              {status === 'loading' ? 'Creating...' : 'Create workspace'}
            </button>
            <Link
              href="/dashboard"
              className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--ink)]"
            >
              Back to main
            </Link>
          </div>

          {solo && (
            <p className="mt-4 text-xs text-[var(--muted)]">
              Solo mode enabled. You can invite the team later.
            </p>
          )}

          {!hasFirebaseConfig && (
            <p className="mt-4 text-xs text-[var(--muted)]">
              Firebase config is missing. Workspace will open in demo mode.
            </p>
          )}

          {requiresLogin && (
            <p className="mt-4 text-xs text-[var(--muted)]">
              Login required to create a real workspace. You can still use demo
              mode.
            </p>
          )}

          {status === 'error' && (
            <p className="mt-4 text-xs text-[var(--accent)]">
              Unable to create workspace. Check Firebase settings and try
              again.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
