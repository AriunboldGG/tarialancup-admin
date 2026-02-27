"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ensureDemoUser, getSession, login } from "@/lib/demo-auth"

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

  const demo = React.useMemo(() => ({ email: "admin@demo.com", password: "admin123" }), [])

  React.useEffect(() => {
    ensureDemoUser()
    const session = getSession()
    if (session) router.replace("/dashboard")
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
      login(parsed.data.email, parsed.data.password)
      toast.success("Welcome back!")
      router.push("/dashboard")
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : "Login failed.")
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

            <div className="rounded-md border bg-background p-3 text-sm">
              <div className="font-medium">Demo user (auto-created)</div>
              <div className="text-muted-foreground mt-1">
                Email: <span className="font-mono">{demo.email}</span>
                <br />
                Password: <span className="font-mono">{demo.password}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  setEmail(demo.email)
                  setPassword(demo.password)
                }}
              >
                Use demo credentials
              </Button>
        </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
