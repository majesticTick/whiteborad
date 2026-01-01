'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import {
  acceptInvite,
  subscribeInvitesByEmail,
  subscribeWorkspacesForUser,
} from '@/lib/firestore'
import { useAuthUser } from '@/lib/useAuthUser'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [activeTab, setActiveTab] = useState<'projects' | 'account'>('projects')
  const [invites, setInvites] = useState<
    { id: string; workspaceId: string; workspaceName: string }[]
  >([])
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [projects, setProjects] = useState<
    { id: string; name: string; memberProfiles: { name: string; photoUrl: string }[] }[]
  >([])

  useEffect(() => {
    if (!user?.email) return
    const unsubscribe = subscribeInvitesByEmail(user.email, (data) => {
      setInvites(
        data.map((invite) => ({
          id: invite.id,
          workspaceId: invite.workspaceId,
          workspaceName: invite.workspaceName,
        }))
      )
    })
    return () => unsubscribe()
  }, [user?.email])

  useEffect(() => {
    if (!user?.uid) {
      setProjects([])
      return
    }
    const unsubscribe = subscribeWorkspacesForUser(user.uid, (items) => {
      setProjects(
        items.map((item) => ({
          id: item.id,
          name: item.name,
          memberProfiles: item.memberProfiles ?? [],
        }))
      )
    })
    return () => unsubscribe()
  }, [user?.uid])

  const handleAccept = async (inviteId: string, workspaceId: string) => {
    if (!user) return
    setAcceptingId(inviteId)
    try {
      await acceptInvite({
        inviteId,
        workspaceId,
        userId: user.uid,
        userName: user.displayName ?? user.email ?? 'Member',
        userPhotoUrl: user.photoURL ?? '',
      })
      router.push(`/workspace/${workspaceId}`)
    } catch (error) {
      console.error(error)
    } finally {
      setAcceptingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="grid min-h-screen grid-cols-[220px_1fr]">
        <aside className="flex flex-col gap-10 border-r border-[var(--border)] bg-[var(--bg-strong)] px-6 py-10">
          <div className="text-xl font-semibold">Whiteborad</div>
          <nav className="flex flex-col gap-4 text-sm text-[var(--muted)]">
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`text-left font-semibold ${
                activeTab === 'projects'
                  ? 'text-[var(--ink)]'
                  : 'text-[var(--muted)]'
              }`}
            >
              프로젝트
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`text-left font-semibold ${
                activeTab === 'account'
                  ? 'text-[var(--ink)]'
                  : 'text-[var(--muted)]'
              }`}
            >
              내 계정
            </button>
          </nav>
          <div className="mt-auto flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm">
            <div className="h-9 w-9 overflow-hidden rounded-full bg-[var(--bg)]">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                  {user?.displayName?.[0] ?? 'U'}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--muted)]">Signed in</span>
              <span className="text-sm font-semibold">
                {user?.displayName ?? 'Guest'}
              </span>
            </div>
          </div>
        </aside>

        <section className="px-10 py-10">
          {activeTab === 'account' ? (
            <div className="flex max-w-2xl flex-col gap-6">
              <div>
                <h1 className="text-2xl font-semibold">내 계정</h1>
                <p className="text-sm text-[var(--muted)]">
                  로그인 정보와 기본 설정을 관리합니다.
                </p>
              </div>

              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <h2 className="text-lg font-semibold">로그인 정보</h2>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-4 py-3">
                    <span className="text-[var(--muted)]">이름</span>
                    <span>{user?.displayName ?? '게스트'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-4 py-3">
                    <span className="text-[var(--muted)]">이메일</span>
                    <span>{user?.email ?? '로그인 필요'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-4 py-3">
                    <span className="text-[var(--muted)]">로그인 방식</span>
                    <span>Google</span>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <h2 className="text-lg font-semibold">설정</h2>
                <div className="mt-4 grid gap-4 text-sm">
                  <label className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-4 py-3">
                    <span>로그인 방식</span>
                    <span className="text-[var(--muted)]">Google</span>
                  </label>
                  <label className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-4 py-3">
                    <span>화이트 모드</span>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </label>
                  <label className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-4 py-3">
                    <span>다크 모드</span>
                    <input type="checkbox" className="h-4 w-4" />
                  </label>
                </div>
              </section>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">Projects</h1>
                  <p className="text-sm text-[var(--muted)]">
                    Start a new board or open an existing workspace.
                  </p>
                </div>
                <Link
                  href="/new"
                  className="rounded-full bg-[var(--ink)] px-5 py-2 text-sm font-semibold text-[var(--bg)]"
                >
                  Create
                </Link>
              </header>

              {projects.length === 0 ? (
                <p className="mt-8 text-sm text-[var(--muted)]">
                  프로젝트가 없습니다. 새 프로젝트를 만들어보세요.
                </p>
              ) : (
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/workspace/${project.id}`}
                      className="group rounded-2xl border border-[var(--border)] bg-white p-5 transition hover:-translate-y-1"
                    >
                      <div className="rounded-xl bg-[var(--bg-strong)] p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">
                            {project.name}
                          </p>
                          <span className="text-xs text-[var(--muted)]">
                            Live
                          </span>
                        </div>
                        <div className="mt-5 h-24 rounded-lg border border-[var(--border)] bg-white/80" />
                        <div className="mt-4 flex items-center gap-2">
                          {project.memberProfiles.map((member, index) => (
                            <div
                              key={`${project.id}-member-${index}`}
                              className="h-8 w-8 overflow-hidden rounded-full border border-white bg-[var(--bg)]"
                            >
                              {member.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={member.photoUrl}
                                  alt={member.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--muted)]">
                                  {member.name?.[0] ?? 'U'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="mt-4 text-xs text-[var(--muted)]">
                        Team workspace
                      </p>
                    </Link>
                  ))}
                </div>
              )}

              <section className="mt-10 rounded-2xl border border-[var(--border)] bg-white p-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Invites</p>
                    <h3 className="text-lg font-semibold">
                      Pending workspaces
                    </h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Accept to join a team board immediately.
                    </p>
                  </div>
                  {invites.length === 0 && (
                    <p className="text-sm text-[var(--muted)]">
                      No pending invites yet.
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {invite.workspaceName}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            Workspace invite
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleAccept(invite.id, invite.workspaceId)
                          }
                          disabled={acceptingId === invite.id}
                          className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-[var(--bg)] disabled:cursor-not-allowed disabled:bg-[rgba(15,15,16,0.4)]"
                        >
                          {acceptingId === invite.id
                            ? 'Accepting...'
                            : 'Accept'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
