import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { EDITOR_HTML } from './editorHtml.generated';

export type EditorState = Record<string, boolean>;

export type NoteEditorHandle = {
  exec: (cmd: string) => void;
  insertText: (text: string) => void;
  focus: () => void;
  blur: () => void;
};

type Props = {
  initialTitle: string;
  initialHtml: string;
  dark: boolean;
  background: string;
  onChange: (html: string, text: string) => void;
  onTitleChange: (title: string) => void;
  onStateChange?: (state: EditorState) => void;
  onFocusChange?: (focused: boolean) => void;
  autoFocus?: boolean;
};

export const NoteEditor = forwardRef<NoteEditorHandle, Props>(function NoteEditor(props, ref) {
  const webview = useRef<WebView>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const send = useCallback((msg: object) => {
    webview.current?.injectJavaScript(`window.__editorCommand(${JSON.stringify(msg)}); true;`);
  }, []);

  useImperativeHandle(ref, () => ({
    exec: (cmd) => send({ type: 'exec', cmd }),
    insertText: (text) => send({ type: 'insertText', text }),
    focus: () => send({ type: 'focus' }),
    blur: () => send({ type: 'blur' }),
  }));

  const onMessage = (e: WebViewMessageEvent) => {
    const msg = JSON.parse(e.nativeEvent.data);
    const p = propsRef.current;
    switch (msg.type) {
      case 'ready':
        send({ type: 'setTheme', dark: p.dark });
        send({ type: 'setContent', html: p.initialHtml, title: p.initialTitle });
        if (p.autoFocus) setTimeout(() => send({ type: 'focus' }), 250);
        break;
      case 'change':
        p.onChange(msg.html, msg.text);
        break;
      case 'title':
        p.onTitleChange(msg.title);
        break;
      case 'state':
        p.onStateChange?.(msg.active);
        break;
      case 'focus':
        p.onFocusChange?.(msg.focused);
        break;
    }
  };

  // Keep the page in step with system appearance.
  const injectedTheme = `document.documentElement.dataset.theme = ${JSON.stringify(props.dark ? 'dark' : 'light')}; true;`;

  return (
    <WebView
      ref={webview}
      source={{ html: EDITOR_HTML }}
      originWhitelist={['*']}
      onMessage={onMessage}
      injectedJavaScriptBeforeContentLoaded={injectedTheme}
      key={props.dark ? 'dark' : 'light'}
      hideKeyboardAccessoryView
      keyboardDisplayRequiresUserAction={false}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      style={[styles.web, { backgroundColor: props.background }]}
      containerStyle={{ backgroundColor: props.background }}
    />
  );
});

const styles = StyleSheet.create({
  web: { flex: 1 },
});
