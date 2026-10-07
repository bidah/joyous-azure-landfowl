import { Button, GlassEffectContainer, HStack, Host } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  font,
  labelStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassIconButton } from '../components/Glass';
import { SettingsSheet } from '../components/SettingsSheet';
import { VoiceSheet } from '../components/VoiceSheet';
import { createNote, deleteNote, relativeTime, textToHtml, useNotes, type Note } from '../lib/notes';
import { serif, useTheme } from '../lib/theme';
import { useNav } from '../lib/nav';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function titleFrom(text: string) {
  const first = text.split(/(?<=[.!?])\s|\n/)[0].trim();
  return first.length > 52 ? `${first.slice(0, 50).trimEnd()}…` : first;
}

export function HomeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const notes = useNotes();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const write = () => {
    const note = createNote();
    nav.push({ name: 'Note', id: note.id, fresh: true });
  };

  const saveVoice = (text: string) => {
    const note = createNote({ title: titleFrom(text), text, html: textToHtml(text), source: 'voice' });
    setVoiceOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => nav.push({ name: 'Note', id: note.id }), 350);
  };

  const confirmDelete = (note: Note) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert('Delete this note?', note.title || 'Untitled', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(note.id) },
    ]);
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const header = (
    <View style={{ paddingTop: insets.top + 8 }}>
      <View style={styles.topRow}>
        <Text style={[styles.date, { color: t.muted }]}>{today}</Text>
        <GlassIconButton icon="gearshape" label="Settings" onPress={() => setSettingsOpen(true)} />
      </View>
      <Text style={[styles.greeting, { color: t.ink }]}>{greeting()}</Text>
      <Text style={[styles.sub, { color: t.muted }]}>
        {notes.length === 0
          ? 'What are you making today?'
          : `${notes.length} ${notes.length === 1 ? 'idea' : 'ideas'} kept`}
      </Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 140 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: t.ink }]}>A blank page, waiting.</Text>
            <Text style={[styles.emptyBody, { color: t.muted }]}>
              Write it down, or just say it out loud.{'\n'}Type / inside a note for blocks.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index, 8) * 40).springify().damping(18)}
            layout={LinearTransition.springify().damping(20)}>
            <NoteCard
              note={item}
              onPress={() => nav.push({ name: 'Note', id: item.id })}
              onLongPress={() => confirmDelete(item)}
            />
          </Animated.View>
        )}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[`${t.bg}00`, t.bg]}
        style={[styles.fade, { height: insets.bottom + 130 }]}
      />

      <View style={[styles.dock, { bottom: insets.bottom + 12 }]}>
        <Host matchContents colorScheme={t.dark ? 'dark' : 'light'}>
          <GlassEffectContainer spacing={14}>
            <HStack spacing={14}>
              <Button
                label="Write"
                systemImage="square.and.pencil"
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  write();
                }}
                modifiers={[
                  buttonStyle('glass'),
                  buttonBorderShape('capsule'),
                  controlSize('extraLarge'),
                  font({ size: 17, weight: 'semibold' }),
                  tint(t.ink),
                ]}
              />
              <Button
                label="Record"
                systemImage="mic.fill"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setVoiceOpen(true);
                }}
                modifiers={[
                  labelStyle('iconOnly'),
                  buttonStyle('glassProminent'),
                  buttonBorderShape('circle'),
                  controlSize('extraLarge'),
                  font({ size: 20, weight: 'semibold' }),
                  tint(t.accent),
                ]}
              />
            </HStack>
          </GlassEffectContainer>
        </Host>
      </View>

      <VoiceSheet
        visible={voiceOpen}
        mode="new"
        onClose={() => setVoiceOpen(false)}
        onDone={saveVoice}
        onOpenSettings={() => {
          setVoiceOpen(false);
          setTimeout(() => setSettingsOpen(true), 400);
        }}
      />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

function NoteCard({ note, onPress, onLongPress }: { note: Note; onPress: () => void; onLongPress: () => void }) {
  const t = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: t.faint, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.cardTitle, { color: t.ink }]} numberOfLines={1}>
        {note.title || 'Untitled'}
      </Text>
      {!!note.text.trim() && (
        <Text style={[styles.cardBody, { color: t.muted }]} numberOfLines={2}>
          {note.text.replace(/\s+/g, ' ').trim()}
        </Text>
      )}
      <View style={styles.meta}>
        {note.source === 'voice' && (
          <SymbolView name="waveform" size={13} tintColor={t.accent} style={{ width: 14, height: 14 }} />
        )}
        <Text style={[styles.metaText, { color: t.muted }]}>{relativeTime(note.updatedAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: 14, fontWeight: '500' },
  greeting: { fontFamily: serif, fontSize: 38, fontWeight: '600', letterSpacing: -0.6, marginTop: 18 },
  sub: { fontSize: 16, marginTop: 4, marginBottom: 26 },
  card: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: { fontFamily: serif, fontSize: 20, fontWeight: '600', letterSpacing: -0.2 },
  cardBody: { fontSize: 15, lineHeight: 21, marginTop: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  metaText: { fontSize: 12.5, fontWeight: '500' },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyTitle: { fontFamily: serif, fontSize: 24, fontWeight: '500', fontStyle: 'italic' },
  emptyBody: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
