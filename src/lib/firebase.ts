import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { Playlist } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyC8Yv0y3B7NXifC10CpzUzZRCoR_zJMRV8",
  authDomain: "musicbaseofmine.firebaseapp.com",
  projectId: "musicbaseofmine",
  storageBucket: "musicbaseofmine.firebasestorage.app",
  messagingSenderId: "790827127778",
  appId: "1:790827127778:web:3f3daec916bd7eb8449fbb",
  measurementId: "G-CEFV60MFQR"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore DB
export const db = getFirestore(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Sign in with Google Popup
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

/**
 * Sign up with Email & Password
 */
export const signUpWithEmail = async (email: string, pass: string, displayName?: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential.user;
};

/**
 * Log in with Email & Password
 */
export const logInWithEmail = async (email: string, pass: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
};

/**
 * Log Out current user
 */
export const logOutUser = async () => {
  await signOut(auth);
};

// ==========================================
// FIRESTORE PLAYLIST STORAGE HELPERS
// ==========================================

/**
 * Real-time listener for user playlists stored in Firebase Firestore
 */
export const subscribeToUserPlaylists = (
  userId: string,
  onUpdate: (playlists: Playlist[]) => void,
  onError?: (err: Error) => void
) => {
  const playlistsRef = collection(db, 'users', userId, 'playlists');
  const q = query(playlistsRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const playlists: Playlist[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        playlists.push({
          id: docSnap.id,
          name: data.name || 'Untitled Playlist',
          description: data.description || '',
          gradient: data.gradient || 'from-[#FF3366] to-teal-800',
          trackIds: data.trackIds || [],
          isCustom: true,
        });
      });
      onUpdate(playlists);
    },
    (err) => {
      console.error('Firestore listener error:', err);
      if (onError) onError(err);
    }
  );
};

/**
 * Save / Create playlist document in Firebase Firestore
 */
export const savePlaylistToFirestore = async (userId: string, playlist: Playlist) => {
  const playlistRef = doc(db, 'users', userId, 'playlists', playlist.id);
  await setDoc(
    playlistRef,
    {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description || '',
      gradient: playlist.gradient || 'from-[#FF3366] to-teal-800',
      trackIds: playlist.trackIds || [],
      updatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    },
    { merge: true }
  );
};

/**
 * Update track list of a playlist in Firebase Firestore
 */
export const updatePlaylistTracksInFirestore = async (
  userId: string,
  playlistId: string,
  trackIds: string[]
) => {
  const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
  await updateDoc(playlistRef, {
    trackIds,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Delete a playlist from Firebase Firestore
 */
export const deletePlaylistFromFirestore = async (userId: string, playlistId: string) => {
  const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
  await deleteDoc(playlistRef);
};

export type { FirebaseUser };

