
import { GoogleGenAI, GenerateContentResponse, Tool } from "@google/genai";
import { SYSTEM_INSTRUCTION, SSH_INSTRUCTION } from "../constants";
import { Message, Role, KawaiiConfig, GroundingMetadata, StreamResponseResult } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const streamGeminiResponse = async (
  history: Message[],
  config: KawaiiConfig,
  onChunk: (text: string) => void
): Promise<StreamResponseResult> => {
  
  // Determine System Instruction based on Mode
  const instruction = config.mode === 'ssh' 
    ? SSH_INSTRUCTION.replace('{{HOST}}', config.sshHost || 'kali-linux')
    : SYSTEM_INSTRUCTION;

  // Configure Tools
  const tools: Tool[] = [];
  
  if (config.mode === 'chat') {
    if (config.useSearch) {
      tools.push({ googleSearch: {} });
    }
    if (config.usePython) {
      tools.push({ codeExecution: {} });
    }
  } else if (config.mode === 'ssh') {
    // SSH Mode ALWAYS gets Python and Search to simulate a real connected terminal
    tools.push({ codeExecution: {} });
    tools.push({ googleSearch: {} }); 
  }

  // Create chat session
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: instruction,
      temperature: config.mode === 'ssh' ? 0.1 : 0.8, // Low temp for SSH precision
      tools: tools.length > 0 ? tools : undefined,
    },
    history: history.slice(0, -1).map(msg => ({
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: msg.image 
        ? [{ text: msg.text }, { inlineData: { mimeType: 'image/jpeg', data: msg.image } }]
        : [{ text: msg.text }]
    }))
  });

  const lastMessage = history[history.length - 1];
  
  const msgParts: any[] = [{ text: lastMessage.text }];
  if (lastMessage.image) {
    msgParts.push({
      inlineData: { mimeType: 'image/jpeg', data: lastMessage.image }
    });
  }

  try {
    const result = await chat.sendMessageStream({
      message: msgParts
    });

    let fullText = '';
    let finalMetadata: GroundingMetadata | undefined;
    
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      const text = c.text;
      
      // Capture grounding metadata from any chunk that has it
      if (c.candidates?.[0]?.groundingMetadata) {
        finalMetadata = c.candidates[0].groundingMetadata as GroundingMetadata;
      }

      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    
    return { text: fullText, groundingMetadata: finalMetadata };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};