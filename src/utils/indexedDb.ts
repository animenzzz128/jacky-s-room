import { DesignAuditReport, Memory, RoomThemeConfig } from '../types/room';

const DB_NAME = 'pixel-room-showcase-v2';
const DB_VERSION = 1;
const STORE_MEMORIES = 'memories';
const STORE_STATE = 'room_state';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MEMORIES)) {
        db.createObjectStore(STORE_MEMORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSavedMemories(): Promise<Memory[] | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MEMORIES, 'readonly');
      const store = tx.objectStore(STORE_MEMORIES);
      const req = store.getAll();
      req.onsuccess = () => {
        const res = req.result as Memory[];
        resolve(res && res.length > 0 ? res : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveAllMemories(memories: Memory[]): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_MEMORIES, 'readwrite');
    const store = tx.objectStore(STORE_MEMORIES);
    store.clear();
    memories.forEach((m) => store.put(m));
  } catch {
    // ignore storage errors
  }
}

export async function saveStateValue<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_STATE, 'readwrite');
    tx.objectStore(STORE_STATE).put({ key, value });
  } catch {
    // ignore
  }
}

export async function loadStateValue<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_STATE, 'readonly');
      const req = tx.objectStore(STORE_STATE).get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export type PersistedRoomMeta = {
  themeConfig: RoomThemeConfig;
  audits: DesignAuditReport[];
};
