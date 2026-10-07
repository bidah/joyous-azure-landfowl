// Sends a recorded file to OpenAI's Whisper transcription endpoint.
export async function transcribeWithWhisper(uri: string, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append('file', { uri, name: 'note.m4a', type: 'audio/m4a' } as unknown as Blob);
  form.append('model', 'whisper-1');
  form.append('response_format', 'json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    let message = `Transcription failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {}
    throw new Error(message);
  }
  const body = await res.json();
  return (body.text ?? '').trim();
}
