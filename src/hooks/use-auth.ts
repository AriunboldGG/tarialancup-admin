import { useEffect, useState } from 'react'
import { onUserChanged } from '@/lib/auth'

export interface AuthUser {
  name: string
  email: string
  avatar: string
}

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const unsubscribe = onUserChanged((u) => {
      if (u) {
        setUser({
          name: u.displayName || 'User',
          email: u.email || '',
          avatar: (u.photoURL as string) || '',
        })
      } else {
        setUser(null)
      }
    })
    return unsubscribe
  }, [])

  return user
}