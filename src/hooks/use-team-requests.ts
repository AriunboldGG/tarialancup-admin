import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { TeamRegistrationRequest } from '@/components/team-requests-page'

// Map sport names to collection names
const sportToCollectionMap: { [key: string]: string } = {
  'Сагсан бөмбөг': 'basketball',
  'Дартс': 'darts',
  'Ширээний теннис': 'tennis',
}

export function useTeamRequests(sportType: string = 'Сагсан бөмбөг') {
  const [requests, setRequests] = useState<TeamRegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get the collection name based on sport type
    const collectionName = sportToCollectionMap[sportType] || 'basketball'

    // Create a query to get team requests ordered by creation date
    const q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc')
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const requestsData: TeamRegistrationRequest[] = []
        querySnapshot.forEach((doc) => {
          requestsData.push({
            id: doc.id,
            ...doc.data()
          } as TeamRegistrationRequest)
        })
        setRequests(requestsData)
        setLoading(false)
      },
      (err) => {
        console.error(`Error fetching ${collectionName} requests:`, err)
        setError(err.message)
        setLoading(false)
      }
    )

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [sportType])

  return { requests, loading, error }
}