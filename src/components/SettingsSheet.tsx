import {
  Button,
  Form,
  Host,
  Picker,
  SecureField,
  Section,
  Text,
  useNativeState,
} from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useEffect, useState } from 'react';
import { Modal } from 'react-native';

import { setApiKey, setEngine, useSettings, type Engine } from '../lib/settings';
import { useTheme } from '../lib/theme';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const settings = useSettings();
  const [key, setKey] = useState(settings.apiKey);
  const keyState = useNativeState(settings.apiKey);

  useEffect(() => {
    if (!visible) return;
    setKey(settings.apiKey);
    keyState.set(settings.apiKey);
  }, [visible]);

  const close = () => {
    if (key !== settings.apiKey) setApiKey(key);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <Host style={{ flex: 1 }} colorScheme={t.dark ? 'dark' : 'light'} seedColor={t.accent}>
        <Form>
          <Section
            title="Voice"
            footer={
              <Text>
                Whisper sends your recording to OpenAI for very accurate transcription. On-device keeps
                everything on your iPhone and shows words as you speak.
              </Text>
            }>
            <Picker
              label="Transcription"
              selection={settings.engine}
              onSelectionChange={(v: Engine) => setEngine(v)}
              modifiers={[pickerStyle('segmented')]}>
              <Text modifiers={[tag('whisper')]}>Whisper</Text>
              <Text modifiers={[tag('device')]}>On-device</Text>
            </Picker>
          </Section>
          <Section
            title="OpenAI API key"
            footer={<Text>Stored in the Keychain. Without a key, voice notes use on-device recognition.</Text>}>
            <SecureField placeholder="sk-…" text={keyState} onTextChange={setKey} />
          </Section>
          <Section>
            <Button label="Done" onPress={close} />
          </Section>
        </Form>
      </Host>
    </Modal>
  );
}
