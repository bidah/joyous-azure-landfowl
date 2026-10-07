import { useSyncExternalStore } from 'react';
import { createMMKV } from 'react-native-mmkv';

export type Note = {
  id: string;
  title: string;
  html: string;
  text: string;
  source: 'text' | 'voice';
  createdAt: number;
  updatedAt: number;
};

const storage = createMMKV({ id: 'notes' });
const KEY = 'notes.v1';

let notes: Note[] = load();
const listeners = new Set<() => void>();

function load(): Note[] {
  try {
    return JSON.parse(storage.getString(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function commit(next: Note[]) {
  notes = next.sort((a, b) => b.updatedAt - a.updatedAt);
  storage.set(KEY, JSON.stringify(notes));
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useNotes() {
  return useSyncExternalStore(subscribe, () => notes);
}

export function useNote(id: string) {
  return useSyncExternalStore(subscribe, () => notes.find((n) => n.id === id));
}

export function createNote(init: Partial<Pick<Note, 'title' | 'html' | 'text' | 'source'>> = {}) {
  const now = Date.now();
  const note: Note = {
    id: `${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    html: '',
    text: '',
    source: 'text',
    createdAt: now,
    updatedAt: now,
    ...init,
  };
  commit([note, ...notes]);
  return note;
}

export function updateNote(id: string, patch: Partial<Omit<Note, 'id'>>) {
  commit(notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
}

export function deleteNote(id: string) {
  commit(notes.filter((n) => n.id !== id));
}

export function isBlank(n: Note) {
  return !n.title.trim() && !n.text.trim();
}

export function textToHtml(text: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
}

export function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const min = 60_000;
  if (diff < min) return 'Just now';
  if (diff < 60 * min) return `${Math.floor(diff / min)}m ago`;
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
