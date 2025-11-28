
import { Message, KawaiiConfig, StreamResponseResult, Role } from "../types";
import { streamGeminiResponse } from "./geminiService";
import { SYSTEM_INSTRUCTION, SSH_INSTRUCTION, PROVIDER_BASE_URLS } from "../constants";

// Helper to parse OpenAI-compatible SSE stream
async function* streamOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Message[],
  systemInstruction: string,
  temperature: number
) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const formattedMessages = [
    { role: 'system', content: systemInstruction },
    ...messages.map(m => ({
      role: m.role === Role.USER ? 'user' : 'assistant',
      content: m.text
    }))
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model,
      messages: formattedMessages,
      stream: true,
      temperature: temperature
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error ${response.status}: ${err}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) throw new Error("No response body");

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim() === '') continue;
      if (line.trim() === 'data: [DONE]') return;
      
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          console.warn('Error parsing stream chunk', e);
        }
      }
    }
  }
}

export const streamUnifiedResponse = async (
  history: Message[],
  config: KawaiiConfig,
  onChunk: (text: string) => void
): Promise<StreamResponseResult> => {
  
  // 1. Use Gemini Service if selected
  if (config.activeProvider === 'gemini') {
    return streamGeminiResponse(history, config, onChunk);
  }

  // 2. Prepare System Instruction
  const instruction = config.mode === 'ssh' 
    ? SSH_INSTRUCTION.replace('{{HOST}}', config.sshHost || 'kali-linux')
    : SYSTEM_INSTRUCTION;

  // 3. Determine Endpoint and Key
  let baseUrl = config.customBaseUrl;
  if (!baseUrl) {
    baseUrl = PROVIDER_BASE_URLS[config.activeProvider];
  }
  
  const apiKey = config.apiKeys[config.activeProvider];

  if (!apiKey) {
    throw new Error(`API Key for ${config.activeProvider} is missing. Please configure it in settings.`);
  }

  if (!baseUrl) {
    throw new Error("Base URL not found for provider");
  }

  // 4. Stream from OpenAI Compatible API (Kimi, Mistral, OpenAI, DeepSeek, etc)
  try {
    let fullText = '';
    const temperature = config.mode === 'ssh' ? 0.1 : 0.7;
    
    const generator = streamOpenAICompat(
      baseUrl, 
      apiKey, 
      config.activeModelId, 
      history, 
      instruction, 
      temperature
    );

    for await (const chunk of generator) {
      fullText += chunk;
      onChunk(fullText);
    }

    return { text: fullText };

  } catch (error) {
    console.error("Unified API Error:", error);
    throw error;
  }
};
