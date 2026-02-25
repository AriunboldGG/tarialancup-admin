"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { getSession } from "@/lib/demo-auth"

export function AuthGuard({
  children,
  redirectTo = "/",
}: {
  children: React.ReactNode
  redirectTo?: string
}) {
  const router = useRouter()
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const session = getSession()
    if (!session) {
      router.replace(redirectTo)
      return
    }
    setReady(true)
  }, [router, redirectTo])

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground text-sm">Checking session…</div>
      </div>
    )
  }

  return <>{children}</>
}

