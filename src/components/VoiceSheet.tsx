import Voice from '@react-native-voice/voice';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { getLocales } from 'expo-localization';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, serif } from '../lib/theme';
import { getSettings } from '../lib/settings';
import { transcribeWithWhisper } from '../lib/whisper';
import { GlassIconButton, GlassPill } from './Glass';

type Phase = 'starting' | 'recording' | 'transcribing' | 'review' | 'error';

type Props = {
  visible: boolean;
  mode: 'new' | 'insert';
  onClose: () => void;
  onDone: (text: string) => void;
  onOpenSettings?: () => void;
};

export function VoiceSheet({ visible, mode, onClose, onDone, onOpenSettings }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('starting');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [engine, setEngine] = useState<'whisper' | 'device'>('whisper');
  const [elapsed, setElapsed] = useState(0);
  const level = useSharedValue(0);
  const breathe = useSharedValue(0);
  const startedAt = useRef(0);

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recState = useAudioRecorderState(recorder, 80);

  // Whisper path: drive the orb from microphone metering (dBFS, -160…0).
  useEffect(() => {
    if (engine !== 'whisper' || phase !== 'recording') return;
    const db = recState.metering ?? -60;
    level.value = withSpring(Math.max(0, Math.min(1, (db + 55) / 50)), { damping: 14 });
  }, [recState.metering, engine, phase]);

  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt.current), 250);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!visible) return;
    start();
    return () => {
      Voice.destroy().catch(() => {});
      if (recorder.isRecording) recorder.stop().catch(() => {});
    };
  }, [visible]);

  async function start() {
    setPhase('starting');
    setText('');
    setError('');
    setElapsed(0);
    const { apiKey, engine: preferred } = getSettings();
    const useWhisper = preferred === 'whisper' && !!apiKey;
    setEngine(useWhisper ? 'whisper' : 'device');

    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return fail('Microphone access is off. Enable it in Settings to capture voice.');

    try {
      if (useWhisper) {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
      } else {
        const locale = getLocales()[0]?.languageTag ?? 'en-US';
        Voice.onSpeechPartialResults = (e) => setText(e.value?.[0] ?? '');
        Voice.onSpeechResults = (e) => setText(e.value?.[0] ?? '');
        Voice.onSpeechVolumeChanged = (e) => {
          level.value = withSpring(Math.max(0, Math.min(1, (e.value ?? 0) / 10)), { damping: 14 });
        };
        Voice.onSpeechError = (e) => {
          const message = e.error?.message ?? '';
          // "No speech detected" just means silence; let the person decide what to do.
          if (/no speech|203|1110|retry/i.test(message)) return;
          if (message) fail(message);
        };
        await Voice.start(locale);
      }
      startedAt.current = Date.now();
      setPhase('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  }

  function fail(message: string) {
    setError(message);
    setPhase('error');
  }

  async function stop() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    level.value = withTiming(0);
    if (engine === 'device') {
      await Voice.stop().catch(() => {});
      setPhase('review');
      return;
    }
    setPhase('transcribing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (!recorder.uri) throw new Error('Nothing was recorded.');
      const result = await transcribeWithWhisper(recorder.uri, getSettings().apiKey);
      setText(result);
      setPhase('review');
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  }

  async function cancel() {
    await Voice.destroy().catch(() => {});
    if (recorder.isRecording) await recorder.stop().catch(() => {});
    onClose();
  }

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + level.value * 0.45 + breathe.value * 0.04 }],
    opacity: 0.85 + level.value * 0.15,
  }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.25 + level.value * 0.9 + breathe.value * 0.12 }],
    opacity: 0.12 + level.value * 0.18,
  }));

  const seconds = Math.floor(elapsed / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cancel}>
      <View style={[styles.sheet, { backgroundColor: t.bg, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <GlassIconButton icon="xmark" label="Close" onPress={cancel} />
          <Text style={[styles.engine, { color: t.muted }]}>
            {engine === 'whisper' ? 'Whisper' : 'On-device'}
          </Text>
          <View style={{ width: 48 }} />
        </View>

        {phase === 'recording' && (
          <View style={styles.center}>
            <Pressable onPress={stop} style={styles.orbWrap} accessibilityLabel="Stop recording">
              <Animated.View style={[styles.halo, { backgroundColor: t.accent }, haloStyle]} />
              <Animated.View style={[styles.orb, { backgroundColor: t.accent }, orbStyle]} />
              <View style={styles.stopGlyph} />
            </Pressable>
            <Text style={[styles.clock, { color: t.ink }]}>{clock}</Text>
            <Text style={[styles.hint, { color: t.muted }]}>
              Speak freely. Tap the circle when you're done.
            </Text>
            {engine === 'device' && !!text && (
              <Text style={[styles.live, { color: t.ink }]} numberOfLines={4}>
                {text}
              </Text>
            )}
          </View>
        )}

        {phase === 'starting' && <View style={styles.center} />}

        {phase === 'transcribing' && (
          <View style={styles.center}>
            <ActivityIndicator color={t.accent} />
            <Text style={[styles.hint, { color: t.muted, marginTop: 16 }]}>Listening back…</Text>
          </View>
        )}

        {phase === 'review' && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={70}>
            <Text style={[styles.reviewLabel, { color: t.muted }]}>Your words</Text>
            <ScrollView style={{ flex: 1 }} keyboardDismissMode="interactive">
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                placeholder="Nothing heard. Try again?"
                placeholderTextColor={t.muted}
                style={[styles.transcript, { color: t.ink }]}
              />
            </ScrollView>
            <View style={styles.actions}>
              <GlassIconButton icon="arrow.counterclockwise" label="Record again" onPress={start} />
              <GlassPill
                icon={mode === 'new' ? 'checkmark' : 'text.insert'}
                label={mode === 'new' ? 'Save note' : 'Insert'}
                prominent
                color={t.accent}
                onPress={() => text.trim() && onDone(text.trim())}
              />
            </View>
          </KeyboardAvoidingView>
        )}

        {phase === 'error' && (
          <View style={styles.center}>
            <Text style={[styles.errorTitle, { color: t.ink }]}>Couldn't catch that</Text>
            <Text style={[styles.hint, { color: t.muted }]}>{error}</Text>
            <View style={[styles.actions, { marginTop: 28 }]}>
              {onOpenSettings && (
                <GlassIconButton icon="gearshape" label="Settings" onPress={onOpenSettings} />
              )}
              <GlassPill icon="mic.fill" label="Try again" prominent color={t.accent} onPress={start} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const ORB = 132;

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  engine: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  orbWrap: { width: ORB * 2.2, height: ORB * 2.2, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: ORB, height: ORB, borderRadius: ORB / 2 },
  orb: { width: ORB, height: ORB, borderRadius: ORB / 2 },
  stopGlyph: { position: 'absolute', width: 26, height: 26, borderRadius: 7, backgroundColor: 'white' },
  clock: { fontFamily: serif, fontSize: 40, fontWeight: '500', fontVariant: ['tabular-nums'], marginTop: 8 },
  hint: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 21, maxWidth: 280 },
  live: { fontFamily: serif, fontSize: 20, lineHeight: 28, textAlign: 'center', marginTop: 28 },
  reviewLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 28 },
  transcript: { fontFamily: serif, fontSize: 22, lineHeight: 32, marginTop: 12, paddingBottom: 40 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 12 },
  errorTitle: { fontFamily: serif, fontSize: 26, fontWeight: '600' },
});
