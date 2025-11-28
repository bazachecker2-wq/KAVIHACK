
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { HACKER_INSTRUCTION, SYSTEM_INSTRUCTION } from "../constants";
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from "../utils/audioUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export class LiveSessionManager {
  private session: any = null;
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime: number = 0;
  private processor: ScriptProcessorNode | null = null;
  private mediaStream: MediaStream | null = null;
  
  // Callback for visualizing audio volume
  private onVolumeChange: (volume: number) => void;
  private onClose: () => void;

  constructor(onVolumeChange: (vol: number) => void, onClose: () => void) {
    this.onVolumeChange = onVolumeChange;
    this.onClose = onClose;
  }

  async connect(isHackerMode: boolean) {
    // 1. Setup Audio Contexts
    this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.outputNode = this.outputContext.createGain();
    this.outputNode.connect(this.outputContext.destination);

    // 2. Connect to Gemini Live
    const instruction = isHackerMode ? HACKER_INSTRUCTION : SYSTEM_INSTRUCTION;
    
    // Using a promise wrapper to ensure we have the session before sending data
    let resolveSession: (s: any) => void;
    const sessionPromise = new Promise<any>(resolve => { resolveSession = resolve; });

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error("Microphone permission denied");
      this.onClose();
      return;
    }

    const session = await ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: isHackerMode ? 'Kore' : 'Aoede' } },
        },
        systemInstruction: instruction,
      },
      callbacks: {
        onopen: async () => {
          console.log("Live Session Connected");
          this.startAudioInputStream(sessionPromise);
        },
        onmessage: async (msg: LiveServerMessage) => {
          this.handleServerMessage(msg);
        },
        onclose: () => {
          console.log("Live Session Closed");
          this.disconnect();
        },
        onerror: (err) => {
          console.error("Live Session Error", err);
          this.disconnect();
        }
      }
    });

    this.session = session;
    resolveSession!(session);
  }

  private startAudioInputStream(sessionPromise: Promise<any>) {
    if (!this.inputContext || !this.mediaStream) return;

    const source = this.inputContext.createMediaStreamSource(this.mediaStream);
    // Buffer size 4096 gives decent latency/performance balance
    this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeChange(rms * 100); // Scale up for UI

      // Create blob and send
      const pcmBlob = createPcmBlob(inputData);
      sessionPromise.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
  }

  private async handleServerMessage(message: LiveServerMessage) {
    const serverContent = message.serverContent;

    // Handle Interruption (Barge-in)
    if (serverContent?.interrupted) {
      console.log("User interrupted model");
      this.stopAllAudio();
      this.nextStartTime = 0;
      return;
    }

    // Handle Audio Output
    const modelTurn = serverContent?.modelTurn;
    if (modelTurn?.parts?.[0]?.inlineData) {
      const base64Audio = modelTurn.parts[0].inlineData.data;
      if (base64Audio && this.outputContext && this.outputNode) {
        
        // Ensure playback timing is continuous
        this.nextStartTime = Math.max(this.nextStartTime, this.outputContext.currentTime);

        const audioBuffer = await decodeAudioData(
          base64ToUint8Array(base64Audio),
          this.outputContext,
          24000
        );

        const source = this.outputContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        
        source.addEventListener('ended', () => {
           this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
        
        // Simulate volume for AI speech visually
        this.onVolumeChange(Math.random() * 50 + 20); 
      }
    }
  }

  private stopAllAudio() {
    this.sources.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    this.sources.clear();
  }

  disconnect() {
    this.stopAllAudio();
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    if (this.inputContext) this.inputContext.close();
    if (this.outputContext) this.outputContext.close();
    
    this.session = null;
    this.onClose();
  }
}
