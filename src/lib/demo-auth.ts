export type DemoUser = {
  name: string
  email: string
  password: string
}

export type DemoSession = {
  user: Omit<DemoUser, "password">
  createdAt: number
}

const DEMO_USER_KEY = "tarialancup_demo_user_v1"
const DEMO_SESSION_KEY = "tarialancup_demo_session_v1"

const DEFAULT_DEMO_USER: DemoUser = {
  name: "Demo Admin",
  email: "admin@demo.com",
  password: "admin123",
}

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function requireBrowser() {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("demo-auth can only be used in the browser.")
  }
}

export function ensureDemoUser(): DemoUser {
  requireBrowser()
  const existing = safeParseJSON<DemoUser>(localStorage.getItem(DEMO_USER_KEY))
  if (existing?.email && existing?.password && existing?.name) return existing

  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(DEFAULT_DEMO_USER))
  return DEFAULT_DEMO_USER
}

export function getDemoUser(): DemoUser | null {
  requireBrowser()
  const user = safeParseJSON<DemoUser>(localStorage.getItem(DEMO_USER_KEY))
  if (!user?.email || !user?.password || !user?.name) return null
  return user
}

export function getSession(): DemoSession | null {
  requireBrowser()
  const session = safeParseJSON<DemoSession>(localStorage.getItem(DEMO_SESSION_KEY))
  if (!session?.user?.email || !session?.user?.name) return null
  return session
}

export function login(email: string, password: string): DemoSession {
  requireBrowser()
  const user = getDemoUser() ?? ensureDemoUser()

  if (email.trim().toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("Invalid email or password.")
  }
  if (password !== user.password) {
    throw new Error("Invalid email or password.")
  }

  const session: DemoSession = {
    user: {
      name: user.name,
      email: user.email,
    },
    createdAt: Date.now(),
  }
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
  return session
}

export function logout() {
  requireBrowser()
  localStorage.removeItem(DEMO_SESSION_KEY)
}

