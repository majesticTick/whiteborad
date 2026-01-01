'use client'

import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'

import { auth, hasFirebaseConfig } from './firebase'

type AuthState = {
  user: User | null
  loading: boolean
}

export const useAuthUser = (): AuthState => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: hasFirebaseConfig,
  })

  useEffect(() => {
    if (!auth) {
      setState({ user: null, loading: false })
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false })
    })
    return () => unsubscribe()
  }, [])

  return state
}
