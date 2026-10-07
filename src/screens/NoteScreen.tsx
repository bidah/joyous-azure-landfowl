import { Button, HStack, Host } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  font,
  frame,
  glassEffect,
  labelStyle,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { ActionSheetIOS, Share, StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassIconButton } from '../components/Glass';
import { VoiceSheet } from '../components/VoiceSheet';
import { NoteEditor, type EditorState, type NoteEditorHandle } from '../editor/NoteEditor';
import { useNav, useRoute } from '../lib/nav';
import { deleteNote, isBlank, updateNote, useNote } from '../lib/notes';
import { useTheme } from '../lib/theme';

type Symbol = NonNullable<ComponentProps<typeof Button>['systemImage']>;

const TOOLS: { cmd: string; icon: Symbol; label: string }[] = [
  { cmd: 'h1', icon: 'textformat.size', label: 'Heading' },
  { cmd: 'bold', icon: 'bold', label: 'Bold' },
  { cmd: 'italic', icon: 'italic', label: 'Italic' },
  { cmd: 'bulletList', icon: 'list.bullet', label: 'List' },
  { cmd: 'taskList', icon: 'checklist', label: 'To-do' },
  { cmd: 'slash', icon: 'plus', label: 'Blocks' },
];

export function NoteScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const params = useRoute<'Note'>();
  const note = useNote(params.id);
  const editor = useRef<NoteEditorHandle>(null);
  const [active, setActive] = useState<EditorState>({});
  const [focused, setFocused] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Freeze the starting content; the editor owns it from here.
  const initial = useRef({ title: note?.title ?? '', html: note?.html ?? '' });

  const noteRef = useRef(note);
  noteRef.current = note;

  // An untouched page leaves no trace.
  useEffect(
    () => () => {
      const current = noteRef.current;
      if (current && isBlank(current)) deleteNote(current.id);
    },
    []
  );

  if (!note) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const more = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Share', 'Delete note', 'Cancel'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (i) => {
        if (i === 0) Share.share({ message: [note.title, note.text].filter(Boolean).join('\n\n') });
        if (i === 1) {
          deleteNote(note.id);
          nav.pop();
        }
      }
    );
  };

  const runTool = (cmd: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (cmd === 'mic') return setVoiceOpen(true);
    if (cmd === 'done') return editor.current?.blur();
    editor.current?.exec(cmd);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={{ height: insets.top + 64 }} />
      <NoteEditor
        ref={editor}
        initialTitle={initial.current.title}
        initialHtml={note.html || initial.current.html}
        dark={t.dark}
        background={t.bg}
        autoFocus={params.fresh}
        onChange={(html, text) => updateNote(note.id, { html, text })}
        onTitleChange={(title) => updateNote(note.id, { title })}
        onStateChange={setActive}
        onFocusChange={setFocused}
      />

      <View style={[styles.topBar, { top: insets.top + 6 }]}>
        <GlassIconButton icon="chevron.left" label="Back" onPress={() => nav.pop()} />
        <View style={styles.topRight}>
          {!focused && (
            <GlassIconButton
              icon="mic.fill"
              label="Dictate"
              onPress={() => setVoiceOpen(true)}
              color={t.accent}
            />
          )}
          <GlassIconButton icon="ellipsis" label="More" onPress={more} />
        </View>
      </View>

      {focused && (
        <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={styles.toolbarWrap}>
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.toolbarRow}>
            <Host matchContents colorScheme={t.dark ? 'dark' : 'light'}>
              <HStack
                spacing={0}
                modifiers={[
                  padding({ horizontal: 6, vertical: 4 }),
                  glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'capsule' }),
                ]}>
                {[...TOOLS, { cmd: 'mic', icon: 'mic' as Symbol, label: 'Dictate' }, { cmd: 'done', icon: 'keyboard.chevron.compact.down' as Symbol, label: 'Hide keyboard' }].map((tool) => (
                  <Button
                    key={tool.cmd}
                    label={tool.label}
                    systemImage={tool.icon}
                    onPress={() => runTool(tool.cmd)}
                    modifiers={[
                      labelStyle('iconOnly'),
                      buttonStyle('borderless'),
                      font({ size: 17, weight: active[tool.cmd] ? 'bold' : 'regular' }),
                      frame({ width: 40, height: 44 }),
                      tint(active[tool.cmd] || tool.cmd === 'mic' ? t.accent : t.ink),
                    ]}
                  />
                ))}
              </HStack>
            </Host>
          </Animated.View>
        </KeyboardStickyView>
      )}

      <VoiceSheet
        visible={voiceOpen}
        mode="insert"
        onClose={() => setVoiceOpen(false)}
        onDone={(text) => {
          setVoiceOpen(false);
          editor.current?.insertText(text);
          if (note.source !== 'voice' && isBlank(note)) updateNote(note.id, { source: 'voice' });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRight: { flexDirection: 'row', gap: 10 },
  toolbarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  toolbarRow: { alignItems: 'center', paddingBottom: 8 },
});
