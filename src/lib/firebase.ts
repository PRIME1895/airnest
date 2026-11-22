/**
 * Unified Firebase Auth + Firestore + Google Calendar OAuth client.
 * - Reuses a single Firebase app instance (never calls initializeApp twice).
 * - Stores Google Workspace OAuth access token in memory ONLY (never localStorage/sessionStorage).
 * - Enforces structured handleFirestoreError and startup testConnection().
 */

import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { UserProfile } from '../../packages/shared/schemas';

const app = initializeApp(firebaseConfig);
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const auth = getAuth(app);

export const WORKSPACE_SCOPES = ['https://www.googleapis.com/auth/calendar.events'] as const;

const googleProvider = new GoogleAuthProvider();
for (const scope of WORKSPACE_SCOPES) {
  googleProvider.addScope(scope);
}

// In-memory OAuth token cache ONLY (strictly forbidden to persist in localStorage/sessionStorage)
let cachedCalendarToken: string | null = null;
let isSigningIn = false;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: Array<{ providerId?: string | null; email?: string | null }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore check: client currently offline; using local offline cache.');
    }
    return false;
  }
}

export function subscribeAuthState(
  onUserChange: (user: User | null, hasCalendarToken: boolean) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedCalendarToken = null;
      onUserChange(null, false);
    } else if (!isSigningIn) {
      onUserChange(user, Boolean(cachedCalendarToken));
    }
  });
}

export async function signInWithGoogle(): Promise<{ user: User; accessToken: string | null }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedCalendarToken = credential?.accessToken ?? null;
    return { user: result.user, accessToken: cachedCalendarToken };
  } finally {
    isSigningIn = false;
  }
}

export function getInMemoryCalendarToken(): string | null {
  return cachedCalendarToken;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName?.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 60) });
  }
  return cred.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser(): Promise<void> {
  cachedCalendarToken = null;
  await signOut(auth);
}

/**
 * Saves sanitized profile adhering strictly to firebase-blueprint.json maxLengths & approx grid coords.
 */
export async function saveProfileToCloud(user: User, profile: UserProfile): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const basePayload = {
      ownerId: user.uid,
      displayName: profile.displayName.trim().slice(0, 60) || 'AirNest User',
      city: profile.city.trim().slice(0, 80) || 'Coimbatore',
      region: profile.region.trim().slice(0, 80) || 'India',
      approxLat: Math.round(profile.approxLat * 100) / 100,
      approxLng: Math.round(profile.approxLng * 100) / 100,
      language: profile.language,
      budget: profile.budget,
      homeType: profile.homeType.slice(0, 40),
      roomAreaM2: Math.max(8, Math.min(300, Math.round(profile.roomAreaM2))),
      commuteMode: profile.commuteMode.slice(0, 40),
      cookingFuel: profile.cookingFuel.slice(0, 40),
      eli10Mode: Boolean(profile.eli10Mode),
      elderMode: Boolean(profile.elderMode),
      alertsOptIn: Boolean(profile.alertsOptIn),
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      await setDoc(ref, basePayload, { merge: true });
    } else {
      await setDoc(ref, { ...basePayload, createdAt: serverTimestamp() });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveDailyProgressToCloud(
  user: User,
  dateKey: string,
  completedIds: string[],
  estimatedCo2eSavedKg: number
): Promise<void> {
  const safeIds = completedIds.slice(0, 12).map((id) => id.slice(0, 64));
  const path = `users/${user.uid}/dailyProgress/${dateKey}`;
  try {
    const ref = doc(db, 'users', user.uid, 'dailyProgress', dateKey);
    const snap = await getDoc(ref);
    const payload = {
      ownerId: user.uid,
      dateKey,
      completedIds: safeIds,
      estimatedCo2eSavedKg: Math.max(0, Math.min(500, Math.round(estimatedCo2eSavedKg * 100) / 100)),
      updatedAt: serverTimestamp(),
    };
    if (snap.exists()) {
      await setDoc(ref, payload, { merge: true });
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserCloudData(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
