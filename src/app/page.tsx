"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login, onUserChanged } from "@/lib/auth"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
})

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [fieldError, setFieldError] = React.useState<string | null>(null)

  // if user already logged in, redirect
  React.useEffect(() => {
    const unsubscribe = onUserChanged((user) => {
      if (user) {
        router.replace("/dashboard")
      }
    })
    return unsubscribe
  }, [router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid input.")
      return
    }

    try {
      setIsSubmitting(true)
      await login(parsed.data.email, parsed.data.password)
      toast.success("Welcome back!")
      router.push("/dashboard")
    } catch (err) {
      setFieldError(
        err instanceof Error ? err.message : "Login failed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Sign in to access the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@demo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
        </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="admin123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {fieldError ? (
              <div className="text-sm text-destructive">{fieldError}</div>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>


          </form>
        </CardContent>
      </Card>
    </div>
  )
}
