import Link from 'next/link'

import WorkspaceBoard from '@/components/WorkspaceBoard'

type WorkspacePageProps = {
  params: { id: string }
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <WorkspaceBoard
          workspaceId={params.id}
          title="Team meeting"
          backHref="/dashboard"
        />
      </div>
    </main>
  )
}
