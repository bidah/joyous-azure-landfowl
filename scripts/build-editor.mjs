// Bundles the Tiptap editor (src/editor/web/editor.ts) into a single offline HTML
// string the WebView loads. Run: npm run build:editor
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';

const result = await build({
  entryPoints: ['src/editor/web/editor.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'safari16',
  write: false,
  legalComments: 'none',
});
const js = result.outputFiles[0].text;

const css = /* css */ `
:root {
  --bg: #FBFAF7; --ink: #1C1B19; --muted: #9A968E; --faint: #ECE9E3;
  --accent: #E2583E; --menu: rgba(255,255,255,0.92); --code: #F2EFEA;
}
:root[data-theme="dark"] {
  --bg: #111110; --ink: #EDEBE6; --muted: #6F6B64; --faint: #262523;
  --accent: #FF7A5C; --menu: rgba(38,37,35,0.94); --code: #1D1C1A;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; background: var(--bg); color: var(--ink); }
body {
  font: 17px/1.6 -apple-system, "SF Pro Text", system-ui, sans-serif;
  -webkit-text-size-adjust: 100%; padding: 4px 24px 160px;
}
#title {
  display: block; width: 100%; border: 0; outline: none; resize: none; overflow: hidden; background: transparent;
  color: var(--ink); caret-color: var(--accent); padding: 0; margin: 8px 0 14px;
  font: 600 32px/1.2 ui-serif, "New York", Georgia, serif; letter-spacing: -0.02em;
}
#title::placeholder { color: var(--muted); opacity: 0.6; }
.ProseMirror { outline: none; min-height: 60vh; caret-color: var(--accent); }
.ProseMirror > * + * { margin-top: 0.55em; }
.ProseMirror p { margin: 0; }
.ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
  font-family: ui-serif, "New York", Georgia, serif; font-weight: 600; letter-spacing: -0.01em; line-height: 1.25; margin: 1.1em 0 0.2em;
}
.ProseMirror h1 { font-size: 1.7em; } .ProseMirror h2 { font-size: 1.35em; } .ProseMirror h3 { font-size: 1.12em; }
.ProseMirror > :first-child { margin-top: 0; }
.ProseMirror strong { font-weight: 650; }
.ProseMirror a { color: var(--accent); }
.ProseMirror blockquote {
  margin: 0.8em 0; padding: 0.1em 0 0.1em 16px; border-left: 3px solid var(--accent);
  font-family: ui-serif, "New York", Georgia, serif; font-style: italic; font-size: 1.08em;
}
.ProseMirror ul, .ProseMirror ol { padding-left: 1.3em; margin: 0.3em 0; }
.ProseMirror li::marker { color: var(--muted); }
.ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; }
.ProseMirror ul[data-type="taskList"] li { display: flex; gap: 10px; align-items: flex-start; }
.ProseMirror ul[data-type="taskList"] li > label { margin-top: 0.22em; user-select: none; }
.ProseMirror ul[data-type="taskList"] li > div { flex: 1; }
.ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
  appearance: none; -webkit-appearance: none; width: 19px; height: 19px; margin: 0;
  border: 1.5px solid var(--muted); border-radius: 6px; display: grid; place-content: center;
}
.ProseMirror ul[data-type="taskList"] input[type="checkbox"]:checked { background: var(--accent); border-color: var(--accent); }
.ProseMirror ul[data-type="taskList"] input[type="checkbox"]:checked::after {
  content: ""; width: 9px; height: 5px; border: 2px solid #fff; border-top: 0; border-right: 0; transform: translateY(-1px) rotate(-45deg);
}
.ProseMirror li[data-checked="true"] > div { color: var(--muted); text-decoration: line-through; }
.ProseMirror code { font: 0.88em ui-monospace, Menlo, monospace; background: var(--code); padding: 0.1em 0.35em; border-radius: 5px; }
.ProseMirror pre { background: var(--code); padding: 14px 16px; border-radius: 14px; overflow-x: auto; }
.ProseMirror pre code { background: none; padding: 0; }
.ProseMirror hr { border: 0; height: 1px; background: var(--faint); margin: 1.6em 0; }
.ProseMirror p.is-empty::before, .ProseMirror h1.is-empty::before, .ProseMirror h2.is-empty::before, .ProseMirror h3.is-empty::before {
  content: attr(data-placeholder); color: var(--muted); float: left; height: 0; pointer-events: none;
}
.ProseMirror p.is-empty:not(:first-child)::before { content: ""; }
.ProseMirror.ProseMirror-focused p.is-empty.has-focus::before { content: attr(data-placeholder); }
.slash-menu {
  position: absolute; z-index: 10; width: 240px; max-height: 280px; overflow-y: auto; padding: 6px;
  background: var(--menu); -webkit-backdrop-filter: blur(24px) saturate(1.6); backdrop-filter: blur(24px) saturate(1.6);
  border-radius: 18px; box-shadow: 0 12px 40px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.08);
  animation: pop 140ms ease-out;
}
@keyframes pop { from { opacity: 0; transform: translateY(4px) scale(0.98); } }
.slash-item {
  display: flex; align-items: center; gap: 12px; width: 100%; border: 0; background: none; color: var(--ink);
  padding: 8px 10px; border-radius: 12px; text-align: left; font: inherit;
}
.slash-item.is-active { background: var(--faint); }
.slash-icon {
  width: 32px; height: 32px; flex: none; display: grid; place-content: center; border-radius: 9px;
  background: var(--bg); font: 600 13px ui-serif, "New York", Georgia, serif; color: var(--ink);
}
.slash-text { display: flex; flex-direction: column; line-height: 1.25; }
.slash-text b { font-weight: 550; font-size: 15px; }
.slash-text small { color: var(--muted); font-size: 12.5px; }
.slash-empty { padding: 10px; color: var(--muted); font-size: 14px; }
`;

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>${css}</style></head><body><textarea id="title" rows="1" placeholder="Untitled" autocapitalize="sentences"></textarea><div id="editor"></div><script>${js}</script></body></html>`;

writeFileSync(
  'src/editor/editorHtml.generated.ts',
  `// Generated by scripts/build-editor.mjs — do not edit.\nexport const EDITOR_HTML = ${JSON.stringify(html)};\n`
);
console.log(`editor html: ${(html.length / 1024).toFixed(0)} KB`);
