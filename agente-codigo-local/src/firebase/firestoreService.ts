import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './config';
import { handleFirestoreError, OperationType } from './error';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SavedProject {
  id: string;
  ownerId: string;
  name: string;
  filesJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedAICreation {
  id: string;
  ownerId: string;
  type: 'music' | 'image' | 'video' | 'search_grounding' | 'maps_grounding' | 'transcription' | 'chat';
  title: string;
  prompt: string;
  model: string;
  content?: string; // audio data url, image data url, video data url/id, text
  metadata?: string; // JSON with lyrics, grounding URLs, coordinates, etc.
  createdAt: string;
}

export interface SavedChatSession {
  id: string;
  ownerId: string;
  title: string;
  role: string;
  model: string;
  messagesJson: string;
  createdAt: string;
  updatedAt: string;
}

// User Profile
export async function syncUserProfile(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userDocRef);
    const now = new Date().toISOString();

    if (!existing.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email || 'user@example.com',
        displayName: user.displayName || 'Developer',
        photoURL: user.photoURL || '',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await setDoc(userDocRef, {
        displayName: user.displayName || existing.data().displayName || 'Developer',
        photoURL: user.photoURL || existing.data().photoURL || '',
        updatedAt: now,
      }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Save Project / Workspace
export async function saveProjectToFirestore(name: string, files: Record<string, string>): Promise<SavedProject> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const projectId = 'proj_' + Date.now();
  const path = `users/${user.uid}/projects/${projectId}`;
  const now = new Date().toISOString();

  const project: SavedProject = {
    id: projectId,
    ownerId: user.uid,
    name,
    filesJson: JSON.stringify(files),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'users', user.uid, 'projects', projectId), project);
    return project;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Save AI Creation (Music, Image, Video, Grounding, Audio Transcript)
export async function saveAICreation(creation: Omit<SavedAICreation, 'id' | 'ownerId' | 'createdAt'>): Promise<SavedAICreation> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const creationId = 'ai_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const path = `users/${user.uid}/ai_creations/${creationId}`;
  const now = new Date().toISOString();

  const item: SavedAICreation = {
    ...creation,
    id: creationId,
    ownerId: user.uid,
    createdAt: now,
  };

  try {
    await setDoc(doc(db, 'users', user.uid, 'ai_creations', creationId), item);
    return item;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Subscribe to AI Creations
export function subscribeToAICreations(
  onData: (creations: SavedAICreation[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const user = auth.currentUser;
  if (!user) {
    onData([]);
    return () => {};
  }

  const path = `users/${user.uid}/ai_creations`;
  const q = query(collection(db, 'users', user.uid, 'ai_creations'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: SavedAICreation[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as SavedAICreation);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Delete AI Creation
export async function deleteAICreation(creationId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/ai_creations/${creationId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'ai_creations', creationId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Save Chat Session
export async function saveChatSession(session: Omit<SavedChatSession, 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/chat_sessions/${session.id}`;
  const now = new Date().toISOString();

  try {
    await setDoc(doc(db, 'users', user.uid, 'chat_sessions', session.id), {
      ...session,
      ownerId: user.uid,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Subscribe to Chat Sessions
export function subscribeToChatSessions(
  onData: (sessions: SavedChatSession[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const user = auth.currentUser;
  if (!user) {
    onData([]);
    return () => {};
  }

  const path = `users/${user.uid}/chat_sessions`;
  const q = query(collection(db, 'users', user.uid, 'chat_sessions'), orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: SavedChatSession[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as SavedChatSession);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
