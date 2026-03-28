import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Carga usuario por UID (id de documento) o por alias exacto (misma lógica que user-profile.js).
 * @returns {Promise<{ id: string, data: object } | null>}
 */
export async function fetchUserProfile(paramId) {
  if (!paramId) return null

  let userDocSnap = await getDoc(doc(db, 'users', paramId))

  if (!userDocSnap.exists()) {
    const q = query(collection(db, 'users'), where('alias', '==', paramId), limit(1))
    const qSnap = await getDocs(q)
    if (qSnap.empty) return null
    userDocSnap = qSnap.docs[0]
  }

  if (!userDocSnap.exists()) return null

  return { id: userDocSnap.id, data: userDocSnap.data() }
}
