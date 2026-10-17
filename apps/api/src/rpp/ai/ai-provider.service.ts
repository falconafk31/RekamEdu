import { Injectable } from '@nestjs/common';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatCompletionOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  stream: boolean;
}

// Base URL bawaan per provider; bisa dioverride lewat env
// AI_BASE_URL_<PROVIDER> (mis. AI_BASE_URL_OPENAI), berguna untuk
// proxy/gateway internal sekolah.
const BASE_URL_BAWAAN: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
};

export function baseUrlUntukProvider(provider: string): string {
  const kunciEnv = `AI_BASE_URL_${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const dariEnv = process.env[kunciEnv];
  if (dariEnv && dariEnv.trim()) return dariEnv.trim();
  return BASE_URL_BAWAAN[provider] ?? BASE_URL_BAWAAN.openai;
}

// Klien OpenAI-compatible: memanggil {baseUrl}/chat/completions.
// apiKey TIDAK PERNAH di-log.
@Injectable()
export class AiProviderService {
  async chatCompletion(opts: ChatCompletionOptions): Promise<Response> {
    const url = `${opts.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    return fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: opts.stream,
        stream_options: { include_usage: true },
      }),
    });
  }
}
