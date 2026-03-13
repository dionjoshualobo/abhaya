export const VOICE_SOS_STORAGE_KEYS = {
  enabled: 'setting_voiceSosEnabled',
  codeWords: 'setting_voiceCodeWords',
} as const;

export const DEFAULT_VOICE_CODE_WORDS = ['help me', 'abhaya'];

export function parseVoiceCodeWords(input: string | null | undefined): string[] {
  if (!input) {
    return DEFAULT_VOICE_CODE_WORDS;
  }

  const words = input
    .split(/[\n,]/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);

  return words.length > 0 ? words : DEFAULT_VOICE_CODE_WORDS;
}

export function normalizeSpeechText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
