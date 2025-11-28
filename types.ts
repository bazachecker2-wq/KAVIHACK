
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
}

export interface StreamResponseResult {
  text: string;
  groundingMetadata?: GroundingMetadata;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  isError?: boolean;
  image?: string; // Base64 string for uploaded images
  groundingMetadata?: GroundingMetadata; // For search results
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export type AppMode = 'chat' | 'ssh';

export interface MCPAgent {
  id: string;
  name: string;
  description: string;
  repoUrl?: string;
  isEnabled: boolean;
  isOfficial?: boolean;
}

export type AvatarEmotion = 'neutral' | 'happy' | 'thinking' | 'speaking' | 'hacker' | 'sleeping';

export type AiProvider = 'gemini' | 'openai' | 'mistral' | 'kimi' | 'claude' | 'custom';

export interface ModelDefinition {
  id: string;
  name: string;
  provider: AiProvider;
  contextWindow?: number;
}

export interface KawaiiConfig {
  aiName: string;
  userName: string;
  themeColor: 'pink' | 'purple' | 'blue';
  useSearch: boolean;
  usePython: boolean;
  mode: AppMode;
  sshHost?: string;
  mcpAgents: MCPAgent[];
  
  // Multi-model config
  activeProvider: AiProvider;
  activeModelId: string;
  apiKeys: Record<AiProvider, string>;
  customBaseUrl?: string;
}