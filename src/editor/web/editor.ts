// Runs inside the WebView. Bundled by scripts/build-editor.mjs into
// src/editor/editorHtml.generated.ts — rebuild after editing (`npm run build:editor`).
import { Editor, Extension, type Range } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion';

type Outgoing =
  | { type: 'ready' }
  | { type: 'change'; html: string; text: string }
  | { type: 'title'; title: string }
  | { type: 'state'; active: Record<string, boolean> }
  | { type: 'focus'; focused: boolean };

type Incoming =
  | { type: 'setContent'; html: string; title: string }
  | { type: 'exec'; cmd: string }
  | { type: 'insertText'; text: string }
  | { type: 'focus' }
  | { type: 'blur' }
  | { type: 'setTheme'; dark: boolean };

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
    __editorCommand: (msg: Incoming) => void;
  }
}

const post = (msg: Outgoing) => window.ReactNativeWebView?.postMessage(JSON.stringify(msg));

type Block = { title: string; hint: string; icon: string; run: (e: Editor, r: Range) => void };

const BLOCKS: Block[] = [
  { title: 'Text', hint: 'Just start writing', icon: 'Aa', run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  { title: 'Heading', hint: 'Big section title', icon: 'H1', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 1 }).run() },
  { title: 'Subheading', hint: 'Medium title', icon: 'H2', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run() },
  { title: 'Small heading', hint: 'Quiet title', icon: 'H3', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run() },
  { title: 'To-do', hint: 'Track a task', icon: '☐', run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { title: 'Bullets', hint: 'Simple list', icon: '•', run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { title: 'Numbered', hint: 'Ordered list', icon: '1.', run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { title: 'Quote', hint: 'Capture a line', icon: '❝', run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { title: 'Code', hint: 'Monospace block', icon: '{}', run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { title: 'Divider', hint: 'Breathe between ideas', icon: '—', run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
];

// A small "/" menu, Notion style.
function slashMenu() {
  let el: HTMLDivElement | null = null;
  let items: Block[] = [];
  let index = 0;
  let props: SuggestionProps<Block> | null = null;

  const render = () => {
    if (!el) return;
    el.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'slash-empty';
      empty.textContent = 'No matching block';
      el.appendChild(empty);
      return;
    }
    items.forEach((item, i) => {
      const row = document.createElement('button');
      row.className = 'slash-item' + (i === index ? ' is-active' : '');
      row.innerHTML = `<span class="slash-icon">${item.icon}</span><span class="slash-text"><b>${item.title}</b><small>${item.hint}</small></span>`;
      row.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        props?.command(item);
      });
      el!.appendChild(row);
    });
    el.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  };

  const place = () => {
    const rect = props?.clientRect?.();
    if (!el || !rect) return;
    // Keep clear of the keyboard and the native toolbar floating above it.
    const viewport = (window.visualViewport?.height ?? window.innerHeight) - 72;
    const roomBelow = viewport - rect.bottom - 8;
    const roomAbove = rect.top - 16;
    const placeBelow = roomBelow >= 200 || roomBelow >= roomAbove;
    const menuH = Math.min(el.scrollHeight, 280, Math.max(placeBelow ? roomBelow : roomAbove, 120));
    el.style.maxHeight = `${menuH}px`;
    const top = placeBelow ? rect.bottom + 8 : rect.top - menuH - 8;
    el.style.top = `${top + window.scrollY}px`;
    el.style.left = `${Math.min(rect.left, window.innerWidth - 248)}px`;
  };

  return {
    onStart: (p: SuggestionProps<Block>) => {
      props = p;
      items = p.items;
      index = 0;
      el = document.createElement('div');
      el.className = 'slash-menu';
      document.body.appendChild(el);
      render();
      place();
    },
    onUpdate: (p: SuggestionProps<Block>) => {
      props = p;
      items = p.items;
      index = 0;
      render();
      place();
    },
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowDown') { index = (index + 1) % Math.max(items.length, 1); render(); return true; }
      if (event.key === 'ArrowUp') { index = (index - 1 + items.length) % Math.max(items.length, 1); render(); return true; }
      if (event.key === 'Enter') { if (items[index]) props?.command(items[index]); return true; }
      if (event.key === 'Escape') { el?.remove(); el = null; return true; }
      return false;
    },
    onExit: () => {
      el?.remove();
      el = null;
      props = null;
    },
  };
}

const SlashCommands = Extension.create({
  name: 'slashCommands',
  addProseMirrorPlugins() {
    return [
      Suggestion<Block>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        items: ({ query }) =>
          BLOCKS.filter((b) => b.title.toLowerCase().includes(query.toLowerCase())),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: slashMenu,
      }),
    ];
  },
});

const editor = new Editor({
  element: document.getElementById('editor')!,
  extensions: [
    StarterKit.configure({ link: { openOnClick: false } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({
      placeholder: ({ node, pos }) => {
        if (node.type.name === 'heading') return 'Heading';
        return pos === 0 ? 'Start with a thought, or type / for blocks' : 'Type / for blocks';
      },
    }),
    SlashCommands,
  ],
  content: '',
  onUpdate: ({ editor }) => {
    post({ type: 'change', html: editor.getHTML(), text: editor.getText() });
  },
  onSelectionUpdate: () => sendState(),
  onTransaction: () => sendState(),
  onFocus: () => post({ type: 'focus', focused: true }),
  onBlur: () => post({ type: 'focus', focused: false }),
});

let lastState = '';
function sendState() {
  const active = {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    strike: editor.isActive('strike'),
    h1: editor.isActive('heading', { level: 1 }),
    h2: editor.isActive('heading', { level: 2 }),
    bulletList: editor.isActive('bulletList'),
    taskList: editor.isActive('taskList'),
    blockquote: editor.isActive('blockquote'),
  };
  const key = JSON.stringify(active);
  if (key === lastState) return;
  lastState = key;
  post({ type: 'state', active });
}

const EXEC: Record<string, () => void> = {
  bold: () => editor.chain().focus().toggleBold().run(),
  italic: () => editor.chain().focus().toggleItalic().run(),
  strike: () => editor.chain().focus().toggleStrike().run(),
  h1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  h2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  bulletList: () => editor.chain().focus().toggleBulletList().run(),
  taskList: () => editor.chain().focus().toggleTaskList().run(),
  blockquote: () => editor.chain().focus().toggleBlockquote().run(),
  divider: () => editor.chain().focus().setHorizontalRule().run(),
  slash: () => editor.chain().focus().insertContent('/').run(),
  undo: () => editor.chain().focus().undo().run(),
  redo: () => editor.chain().focus().redo().run(),
};

window.__editorCommand = (msg) => {
  switch (msg.type) {
    case 'setContent':
      title.value = msg.title || '';
      growTitle();
      editor.commands.setContent(msg.html || '', { emitUpdate: false });
      break;
    case 'exec':
      EXEC[msg.cmd]?.();
      break;
    case 'insertText': {
      // Voice drops in as fresh paragraphs at the end of the note.
      const paragraphs = msg.text
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => ({ type: 'paragraph', content: [{ type: 'text', text: p }] }));
      if (!paragraphs.length) break;
      const isEmpty = editor.isEmpty;
      if (isEmpty) editor.commands.setContent({ type: 'doc', content: paragraphs }, { emitUpdate: true });
      else editor.chain().focus('end').insertContent(paragraphs).run();
      break;
    }
    case 'focus':
      if (!title.value.trim() && editor.isEmpty) title.focus();
      else editor.commands.focus('end');
      break;
    case 'blur':
      editor.commands.blur();
      break;
    case 'setTheme':
      document.documentElement.dataset.theme = msg.dark ? 'dark' : 'light';
      break;
  }
};

// Title lives above the document, like a page name.
const title = document.getElementById('title') as HTMLTextAreaElement;
function growTitle() {
  title.style.height = 'auto';
  title.style.height = `${title.scrollHeight}px`;
}
title.addEventListener('input', () => {
  growTitle();
  post({ type: 'title', title: title.value.replace(/\n/g, ' ') });
});
title.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || (e.key === 'ArrowDown' && title.selectionStart === title.value.length)) {
    e.preventDefault();
    editor.commands.focus('start');
  }
});
title.addEventListener('focus', () => post({ type: 'focus', focused: true }));
title.addEventListener('blur', () => post({ type: 'focus', focused: false }));

post({ type: 'ready' });
