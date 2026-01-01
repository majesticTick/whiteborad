import {
  arrayUnion,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

import { app, hasFirebaseConfig } from './firebase'

export type BoardPoint = { x: number; y: number }
export type BoardPath = {
  id: string
  color: string
  width: number
  mode: 'draw' | 'erase'
  points: BoardPoint[]
}

export type BoardNote = {
  id: string
  x: number
  y: number
  text: string
  color: string
}

export type BoardShape = {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  type: 'rect' | 'ellipse'
}

export type BoardText = {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
}

export type BoardArrow = {
  id: string
  start: BoardPoint
  end: BoardPoint
  color: string
}

export type BoardFrame = {
  id: string
  x: number
  y: number
  width: number
  height: number
  title: string
}

export type BoardCursor = {
  id: string
  name: string
  color: string
  x: number
  y: number
}

export type MemberProfile = {
  uid: string
  name: string
  photoUrl: string
}

export type BoardState = {
  notes: BoardNote[]
  paths: BoardPath[]
  shapes: BoardShape[]
  texts: BoardText[]
  arrows: BoardArrow[]
  frames: BoardFrame[]
  cursors: BoardCursor[]
}

export type WorkspaceDoc = {
  name: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  members: string[]
  memberProfiles: MemberProfile[]
  invites: string[]
  createdAt: unknown
  updatedAt: unknown
  updatedBy: string
  board: BoardState
}

const db = hasFirebaseConfig && app ? getFirestore(app) : null

export const upsertUserProfile = async (payload: {
  uid: string
  name: string
  email: string
}) => {
  if (!db) throw new Error('Firebase not configured')
  const userRef = doc(db, 'users', payload.uid)
  await setDoc(
    userRef,
    {
      name: payload.name,
      email: payload.email,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export type InviteDoc = {
  workspaceId: string
  workspaceName: string
  email: string
  status: 'pending' | 'accepted'
  createdAt: unknown
}

export const createWorkspace = async (payload: {
  name: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  ownerPhotoUrl: string
  invites: string[]
}) => {
  if (!db) throw new Error('Firebase not configured')
  const workspaceRef = doc(collection(db, 'workspaces'))
  const workspace: WorkspaceDoc = {
    name: payload.name,
    ownerId: payload.ownerId,
    ownerName: payload.ownerName,
    ownerEmail: payload.ownerEmail,
    members: [payload.ownerId],
    memberProfiles: [
      {
        uid: payload.ownerId,
        name: payload.ownerName,
        photoUrl: payload.ownerPhotoUrl,
      },
    ],
    invites: payload.invites,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: payload.ownerId,
    board: {
      notes: [],
      paths: [],
      shapes: [],
      texts: [],
      arrows: [],
      frames: [],
      cursors: [],
    },
  }
  await setDoc(workspaceRef, workspace)
  await Promise.all(
    payload.invites.map((email) =>
      setDoc(doc(collection(db, 'invites')), {
        workspaceId: workspaceRef.id,
        workspaceName: payload.name,
        email,
        status: 'pending',
        createdAt: serverTimestamp(),
      } satisfies InviteDoc)
    )
  )
  return workspaceRef.id
}

export const updateWorkspaceBoard = async (
  workspaceId: string,
  board: BoardState,
  updatedBy: string
) => {
  if (!db) throw new Error('Firebase not configured')
  const workspaceRef = doc(db, 'workspaces', workspaceId)
  await updateDoc(workspaceRef, {
    board,
    updatedAt: serverTimestamp(),
    updatedBy,
  })
}

export const updateWorkspaceCursors = async (
  workspaceId: string,
  cursors: BoardCursor[],
  updatedBy: string
) => {
  if (!db) throw new Error('Firebase not configured')
  const workspaceRef = doc(db, 'workspaces', workspaceId)
  await updateDoc(workspaceRef, {
    'board.cursors': cursors,
    updatedAt: serverTimestamp(),
    updatedBy,
  })
}

export const subscribeWorkspace = (
  workspaceId: string,
  onData: (data: WorkspaceDoc | null) => void
) => {
  if (!db) return () => undefined
  const workspaceRef = doc(db, 'workspaces', workspaceId)
  return onSnapshot(workspaceRef, (snapshot) => {
    if (!snapshot.exists()) {
      onData(null)
      return
    }
    onData(snapshot.data() as WorkspaceDoc)
  })
}

export const subscribeInvitesByEmail = (
  email: string,
  onData: (invites: (InviteDoc & { id: string })[]) => void
) => {
  if (!db) return () => undefined
  const invitesQuery = query(
    collection(db, 'invites'),
    where('email', '==', email),
    where('status', '==', 'pending')
  )
  return onSnapshot(invitesQuery, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as InviteDoc),
    }))
    onData(items)
  })
}

export const acceptInvite = async (payload: {
  inviteId: string
  workspaceId: string
  userId: string
  userName: string
  userPhotoUrl: string
}) => {
  if (!db) throw new Error('Firebase not configured')
  await updateDoc(doc(db, 'invites', payload.inviteId), {
    status: 'accepted',
  })
  await updateDoc(doc(db, 'workspaces', payload.workspaceId), {
    members: arrayUnion(payload.userId),
    memberProfiles: arrayUnion({
      uid: payload.userId,
      name: payload.userName,
      photoUrl: payload.userPhotoUrl,
    }),
    updatedAt: serverTimestamp(),
    updatedBy: payload.userId,
  })
}

export const subscribeWorkspacesForUser = (
  userId: string,
  onData: (items: (WorkspaceDoc & { id: string })[]) => void
) => {
  if (!db) return () => undefined
  const workspacesQuery = query(
    collection(db, 'workspaces'),
    where('members', 'array-contains', userId)
  )
  return onSnapshot(workspacesQuery, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as WorkspaceDoc),
    }))
    onData(items)
  })
}
