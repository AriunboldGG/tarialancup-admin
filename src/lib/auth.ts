import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth"
import { auth } from "./firebase"

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function logout() {
  return signOut(auth)
}

export function onUserChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser() {
  return auth.currentUser
}
