import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { createMMKV } from 'react-native-mmkv';

export type Engine = 'whisper' | 'device';

const prefs = createMMKV({ id: 'settings' });
const KEY_NAME = 'openai-api-key';

let state = {
  engine: (prefs.getString('engine') as Engine | undefined) ?? 'whisper',
  apiKey: '',
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

SecureStore.getItemAsync(KEY_NAME).then((k) => {
  state = { ...state, apiKey: k ?? '' };
  emit();
});

export function useSettings() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state
  );
}

export function getSettings() {
  return state;
}

export function setEngine(engine: Engine) {
  prefs.set('engine', engine);
  state = { ...state, engine };
  emit();
}

export async function setApiKey(apiKey: string) {
  const trimmed = apiKey.trim();
  if (trimmed) await SecureStore.setItemAsync(KEY_NAME, trimmed);
  else await SecureStore.deleteItemAsync(KEY_NAME);
  state = { ...state, apiKey: trimmed };
  emit();
}
