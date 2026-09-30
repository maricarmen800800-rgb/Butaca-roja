import { emptyProfile, type Profile } from './types';

const DB_NAME = 'butaca-roja-db';
const STORE = 'profiles';
const KEY = 'principal';

function cloneEmpty(): Profile {
  return JSON.parse(JSON.stringify(emptyProfile)) as Profile;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadProfile(): Promise<Profile> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as Profile | undefined) ?? cloneEmpty());
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem('butaca-roja-profile');
    return raw ? JSON.parse(raw) as Profile : cloneEmpty();
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(profile, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    localStorage.setItem('butaca-roja-profile', JSON.stringify(profile));
  }
}

/*
  Adaptador preparado para nube:
  la UI solo habla con loadProfile/saveProfile. Cuando el repositorio se conecte
  al Supabase ya creado por Lovable, este archivo se sustituye por un adaptador
  que lea/escriba ratings, watch_status, favorites, person_ratings y
  recommendation_history. El resto de la app no necesita reescribirse.
*/