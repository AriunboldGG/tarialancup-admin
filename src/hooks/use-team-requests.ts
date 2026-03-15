import { useState, useEffect } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import type { TeamRegistrationRequest, TeamMember } from '@/components/team-requests-page'

const sportToCollectionMap: { [key: string]: string } = {
  'Сагсан бөмбөг': 'basketball',
  'Дартс': 'darts',
  'Теннис': 'tennis',
}

/** Resolve a raw image value: if it's a gs:// or a plain storage path, get the download URL; otherwise return as-is */
async function resolveImageUrl(raw: string | undefined): Promise<string | undefined> {
  if (!raw) return undefined
  // Already a full HTTP URL
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  // gs:// URI or a bare storage path
  try {
    const storageRef = ref(storage, raw)
    return await getDownloadURL(storageRef)
  } catch (err: any) {
    console.warn('resolveImageUrl failed for path:', raw, err?.code, err?.message)
    return undefined
  }
}

function extractRawImageUrl(m: Record<string, any>): string | undefined {
  return (
    m.imageUrl ??
    m.imageURL ??
    m.image ??
    m.photo ??
    m.photoUrl ??
    m.photoURL ??
    m.picture ??
    m.avatar ??
    m.avatarUrl ??
    undefined
  )
}

function mapFirestoreDocSync(id: string, data: Record<string, any>, sportType: string): Omit<TeamRegistrationRequest, 'members'> & { rawMembers: any[] } {
  const rawMembers: any[] = Array.isArray(data.members) ? data.members : []

  return {
    id,
    teamName: data.teamName ?? data.name ?? data.fullName ?? data.playerName ?? data.playerFullName ?? "",
    sportType: sportType,
    playingYears: data.playingYears ?? data.gradRange ?? "",
    className: data.className ?? data.classGroup ?? "",
    graduatedYear: Number(data.graduatedYear ?? data.gradYear ?? new Date().getFullYear()),
    gender: data.gender ?? "",
    contactName: data.contactName ?? data.contact ?? "",
    phone: data.phone ?? data.contactPhone ?? "",
    status: data.status ?? "pending",
    transactionCode: data.transactionCode ?? data.txnCode ?? undefined,
    rawMembers,
  }
}

async function resolveMembers(rawMembers: any[]): Promise<TeamMember[]> {
  return Promise.all(
    rawMembers.map(async (m, i) => {
      const rawImg = extractRawImageUrl(m)
      const imageUrl = await resolveImageUrl(rawImg)
      const firstName = m.firstName ?? ""
      const lastName = m.lastName ?? ""
      const combinedName = m.fullName ?? m.name ?? (
        firstName || lastName ? [firstName, lastName].filter(Boolean).join(" ") : ""
      )
      return {
        id: m.id ?? `m_${i}`,
        fullName: combinedName,
        heightCm: m.heightCm ?? m.height ?? undefined,
        sportRank: m.sportRank ?? m.rank ?? "",
        position: m.position ?? m.role ?? "",
        personalNumber: m.personalNumber ?? m.registerNo ?? m.number ?? "",
        profession: m.profession ?? m.occupation ?? m.job ?? "",
        imageUrl,
      }
    })
  )
}

export function useTeamRequests(sportType: string = 'Сагсан бөмбөг') {
  const [requests, setRequests] = useState<TeamRegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const collectionName = sportToCollectionMap[sportType] || 'basketball'

    const q = query(
      collection(db, collectionName)
    )

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const resolved: TeamRegistrationRequest[] = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const { rawMembers, ...rest } = mapFirestoreDocSync(doc.id, doc.data() as Record<string, any>, sportType)
            const members = await resolveMembers(rawMembers)
            return { ...rest, members }
          })
        )
        setRequests(resolved)
        setLoading(false)
      },
      (err) => {
        console.error(`Error fetching ${collectionName} requests:`, err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [sportType])

  return { requests, loading, error }
}