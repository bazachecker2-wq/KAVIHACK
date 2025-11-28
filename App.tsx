
import React, { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, Sparkles, Trash2, Settings, X, Loader2, Globe, FileCode, Terminal, Server, Mic, MicOff, ShieldAlert, Cpu, Key, Shield, Eye, EyeOff, Radio, LayoutDashboard, Copy, Repeat, Eraser } from 'lucide-react';
import { streamUnifiedResponse } from './services/unifiedService';
import { LiveSessionManager } from './services/liveService';
import { Message, Role, KawaiiConfig, AvatarEmotion, AiProvider } from './types';
import { THEMES, DEFAULT_CONFIG, AVAILABLE_MODELS, TRANSLATIONS } from './constants';
import ChatBubble from './components/ChatBubble';
import KawaiiAvatar from './components/KawaiiAvatar';
import McpManager from './components/McpManager';
import PentestDashboard from './components/PentestDashboard';

export default function App() {
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      text: 'Приветик! Я KawaiiGPT (◕‿◕) \nТеперь я поддерживаю Kimi, Mistral и другие модели! Выбери нужную в настройках!',
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamingText, setIsStreamingText] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [config, setConfig] = useState<KawaiiConfig>(DEFAULT_CONFIG);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showMcpManager, setShowMcpManager] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  // Live Mode State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const liveSessionRef = useRef<LiveSessionManager | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Env Debug State
  const [showEnvKey, setShowEnvKey] = useState(false);
  const systemApiKey = process.env.API_KEY || '';

  // Translations
  const t = TRANSLATIONS[config.language];

  // Determine current visual theme
  const themeStyles = config.mode === 'ssh' ? THEMES.terminal : THEMES[config.themeColor];

  // Derive Avatar Emotion
  const getAvatarEmotion = (): AvatarEmotion => {
    if (config.mode === 'ssh') return 'hacker';
    if (isLiveActive && audioVolume > 10) return 'speaking';
    if (isStreamingText) return 'speaking';
    if (isLoading) return 'thinking';
    if (messages.length > 0 && messages[messages.length-1].role === Role.MODEL && !isLoading) return 'happy';
    return 'neutral';
  };

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Context Menu Logic
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // HIVE MIND AUTO-PILOT LOOP
  useEffect(() => {
    if (!config.isAutoPilot || config.mode !== 'ssh' || isLoading || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    
    // Check if the last message was from the MODEL and did NOT complete the mission
    if (lastMsg.role === Role.MODEL) {
      if (lastMsg.text.includes('[MISSION_COMPLETE]')) {
        // Stop auto-pilot
        setConfig(prev => ({ ...prev, isAutoPilot: false }));
        return;
      }
      
      if (lastMsg.text.includes('[AWAITING_NEXT_PHASE]') || !lastMsg.text.includes('[MISSION_COMPLETE]')) {
        // Wait a brief moment then send the proceed signal
        const timer = setTimeout(() => {
           const prompt = config.language === 'ru' 
             ? "[ANALYST]: Проверить прошлый вывод. [EXECUTOR]: Продолжить выполнение следующего шага пентеста. Если все готово, вывести [MISSION_COMPLETE]." 
             : "[ANALYST]: Analyze previous output. [EXECUTOR]: Proceed to next logical step. If done, output [MISSION_COMPLETE].";
           sendHiddenMessage(prompt);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, config.isAutoPilot, config.mode, isLoading, config.language]);

  // Cleanup Live Session on unmount
  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.disconnect();
      }
    };
  }, []);

  // Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setSelectedImage(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: Role.MODEL,
      text: config.mode === 'ssh' 
        ? `Last login: ${new Date().toDateString()} from 192.168.1.1\nWelcome to ${config.sshHost || 'server'}!`
        : (config.language === 'ru' ? 'Чат очищен! Давай начнем с чистого листа ^_^' : 'Chat cleared! Let\'s start fresh ^_^'),
      timestamp: Date.now()
    }]);
    setShowSettings(false);
    setConfig(prev => ({ ...prev, isAutoPilot: false }));
  };

  const toggleMode = (mode: 'chat' | 'ssh') => {
    setConfig(prev => ({ ...prev, mode, isAutoPilot: false }));
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: Role.MODEL,
      text: mode === 'ssh' 
        ? `**💻 REBOOTING INTO TERMINAL MODE...**\nConnecting to ${config.sshHost || 'localhost'}...\nConnection established.` 
        : `**🌸 RESTORING KAWAII OS...**\n${config.language === 'ru' ? 'Возвращаемся в уютный режим!' : 'Back to cozy mode!'}`,
      timestamp: Date.now()
    }]);
  };

  const toggleAutoPilot = () => {
    setConfig(prev => {
      const newState = !prev.isAutoPilot;
      if (newState) {
        // Trigger start message
        const startMsg = prev.language === 'ru' ? "ИНИЦИАЛИЗАЦИЯ РОЯ. ДОЛОЖИТЬ СТАТУС." : "INITIALIZE HIVE MIND. REPORT STATUS.";
        setTimeout(() => sendHiddenMessage(startMsg), 100);
      }
      return { ...prev, isAutoPilot: newState };
    });
  };

  const toggleLiveMode = async () => {
    if (config.activeProvider !== 'gemini') {
       alert(config.language === 'ru' ? "Голосовой режим доступен только для Gemini." : "Voice mode is only available for Gemini.");
       return;
    }

    if (isLiveActive) {
      liveSessionRef.current?.disconnect();
      setIsLiveActive(false);
      setAudioVolume(0);
    } else {
      setIsLiveActive(true);
      liveSessionRef.current = new LiveSessionManager(
        (vol) => setAudioVolume(vol),
        () => setIsLiveActive(false)
      );
      // Determine if we should be in "Hacker" voice mode based on current mode or settings
      const isHackerVoice = config.mode === 'ssh'; 
      await liveSessionRef.current.connect(isHackerVoice, config.language);
    }
  };

  const updateApiKey = (provider: AiProvider, key: string) => {
    setConfig(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [provider]: key }
    }));
  };

  const sendHiddenMessage = (text: string) => {
    sendMessageInternal(text, true); 
  };

  const sendMessageInternal = async (text: string, isAuto: boolean = false) => {
    if (isLoading) return;

    const userMsgId = Date.now().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      role: Role.USER,
      text: text,
      timestamp: Date.now(),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, newUserMsg]);
    if (!isAuto) {
      setInputText('');
      setSelectedImage(null);
    }
    setIsLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: Role.MODEL,
      text: config.mode === 'ssh' ? '█' : '...', 
      timestamp: Date.now()
    }]);

    try {
      const currentHistory = [...messages, newUserMsg];
      const tempConfig = { ...config };

      setIsStreamingText(true);
      
      const result = await streamUnifiedResponse(currentHistory, tempConfig, (streamedText) => {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId ? { ...msg, text: streamedText } : msg
        ));
      });

      if (result.groundingMetadata) {
         setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId ? { ...msg, groundingMetadata: result.groundingMetadata } : msg
        ));
      }

    } catch (error: any) {
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { 
          ...msg, 
          text: config.mode === 'ssh' ? `Error: ${error.message}` : `Ой-ой! Ошибка провайдера: ${error.message} (╥_╥)`,
          isError: true 
        } : msg
      ));
      // Stop auto pilot on error
      if (config.isAutoPilot) setConfig(prev => ({ ...prev, isAutoPilot: false }));
    } finally {
      setIsLoading(false);
      setIsStreamingText(false);
    }
  };

  const sendMessage = () => sendMessageInternal(inputText);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyLastMessage = () => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.text) {
      navigator.clipboard.writeText(lastMsg.text);
    }
  };

  return (
    // Fixed h-screen to h-[100dvh] for mobile browser address bar handling
    <div onContextMenu={handleContextMenu} className={`w-full h-[100dvh] bg-gradient-to-br ${themeStyles.gradient} flex items-center justify-center p-0 md:p-6 overflow-hidden transition-all duration-500`}>
      
      {/* Context Menu */}
      {contextMenu && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className={`fixed z-[100] min-w-[160px] rounded-lg shadow-xl py-1 border animate-in fade-in zoom-in-95 duration-100 ${config.mode === 'ssh' ? 'bg-gray-900 border-green-500 text-green-500' : 'bg-white border-pink-100 text-gray-700'}`}
        >
          <button onClick={handleClearChat} className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 flex items-center gap-2">
            <Eraser size={14} /> {t.contextClear}
          </button>
          <button onClick={() => toggleMode(config.mode === 'chat' ? 'ssh' : 'chat')} className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 flex items-center gap-2">
            <Repeat size={14} /> {t.contextSwitch}
          </button>
          <button onClick={copyLastMessage} className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 flex items-center gap-2">
            <Copy size={14} /> {t.contextCopy}
          </button>
        </div>
      )}

      {/* MCP Manager Modal */}
      {showMcpManager && (
        <McpManager 
          config={config} 
          setConfig={setConfig} 
          onClose={() => setShowMcpManager(false)} 
        />
      )}

      {/* Pentest Dashboard Modal */}
      {showDashboard && (
        <PentestDashboard 
           messages={messages}
           onClose={() => setShowDashboard(false)}
           onSendCommand={(cmd) => {
             sendMessageInternal(cmd);
           }}
           isAutoPilot={config.isAutoPilot || false}
           targetHost={config.sshHost || ''}
           language={config.language}
        />
      )}

      {/* Live Mode Overlay */}
      {isLiveActive && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className={`relative w-80 h-80 rounded-full flex items-center justify-center border-4 ${config.mode === 'ssh' ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.5)]' : 'border-pink-500 shadow-[0_0_50px_rgba(236,72,153,0.5)]'}`}>
              <div 
                className={`absolute inset-0 rounded-full opacity-50 transition-transform duration-75 ${config.mode === 'ssh' ? 'bg-green-500' : 'bg-pink-500'}`}
                style={{ transform: `scale(${1 + Math.min(audioVolume / 50, 0.5)})` }}
              />
              <div className="z-10 flex flex-col items-center gap-6">
                 {/* Large Avatar for Live Mode */}
                 <KawaiiAvatar emotion={getAvatarEmotion()} size={120} isLive={true} />
                 
                 <div className="text-center">
                    <div className={`text-2xl font-bold ${config.mode === 'ssh' ? 'text-green-500 font-mono' : 'text-white'}`}>
                      {config.mode === 'ssh' ? 'RED TEAM OPS' : t.liveVoice}
                    </div>
                    <div className={`text-sm uppercase tracking-widest mt-2 ${config.mode === 'ssh' ? 'text-green-800' : 'text-white/60'}`}>
                      {audioVolume > 5 ? (config.language === 'ru' ? 'Прием...' : 'Transmitting...') : (config.language === 'ru' ? 'Слушаю...' : 'Listening...')}
                    </div>
                 </div>
              </div>
           </div>
           
           <button 
             onClick={toggleLiveMode}
             className="mt-12 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105"
           >
             <MicOff size={20} /> END SESSION
           </button>
        </div>
      )}

      {/* Main Container */}
      <div className={`w-full max-w-5xl h-full md:h-[90vh] ${config.mode === 'ssh' ? 'bg-black/90 text-green-500 font-mono' : 'bg-white/60 backdrop-blur-xl'} md:rounded-3xl shadow-2xl flex flex-col border ${themeStyles.border} overflow-hidden relative transition-all duration-500`}>
        
        {/* Header */}
        <header className={`h-20 flex items-center justify-between px-6 ${config.mode === 'ssh' ? 'bg-gray-900 border-green-900' : 'bg-white/50 border-white/40'} backdrop-blur-md border-b z-10 shrink-0`}>
          <div className="flex items-center gap-4">
             {/* Animated Avatar */}
             <div className="relative">
                <KawaiiAvatar emotion={getAvatarEmotion()} size={48} />
                {isLiveActive && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
             </div>
             
             <div>
               <h1 className={`font-bold text-lg flex items-center gap-2 ${config.mode === 'ssh' ? 'text-green-500' : 'text-gray-800'}`}>
                 {config.mode === 'ssh' ? `SSH: ${config.sshHost}` : config.aiName}
                 <span className={`text-[10px] px-2 py-0.5 rounded-full ${themeStyles.secondary} ${themeStyles.accent} font-bold tracking-wider uppercase`}>
                   {config.activeProvider}
                 </span>
               </h1>
               <div className="flex items-center gap-2">
                 <p className={`text-xs ${config.mode === 'ssh' ? 'text-green-700' : 'text-gray-500'}`}>
                   {isLoading ? (config.mode === 'ssh' ? t.processing : t.typing) : (isLiveActive ? t.liveVoice : t.online)}
                 </p>
               </div>
             </div>
          </div>

          <div className="flex items-center gap-2">
             {/* Capabilities Toolbar (Only for Gemini) */}
             {config.mode === 'chat' && config.activeProvider === 'gemini' && (
               <div className="hidden md:flex bg-white/50 rounded-full p-1 border border-white/50 mr-2 items-center">
                 <button 
                   onClick={() => setConfig(prev => ({...prev, useSearch: !prev.useSearch}))}
                   className={`p-2 rounded-full transition-all ${config.useSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                   title={t.searchOn}
                 >
                   <Globe size={18} />
                 </button>
                 <button 
                   onClick={() => setConfig(prev => ({...prev, usePython: !prev.usePython}))}
                   className={`p-2 rounded-full transition-all ${config.usePython ? 'bg-yellow-100 text-yellow-600' : 'text-gray-400 hover:bg-gray-100'}`}
                   title={t.pythonOn}
                 >
                   <FileCode size={18} />
                 </button>
                 <div className="w-px h-6 bg-gray-200 mx-1"></div>
                 <button 
                   onClick={() => setShowMcpManager(true)}
                   className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${config.mcpAgents.some(a => a.isEnabled) ? 'bg-purple-100 text-purple-600' : 'text-gray-500 hover:bg-gray-100'}`}
                   title={t.manageMcp}
                 >
                   <Server size={14} /> MCP
                 </button>
               </div>
             )}

             {/* DASHBOARD BUTTON (SSH ONLY) */}
             {config.mode === 'ssh' && (
               <button
                 onClick={() => setShowDashboard(true)}
                 title={t.openDashboard}
                 className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-bold transition-all mr-2 bg-green-900/20 text-green-400 border-green-800 hover:bg-green-900/50 hover:text-white hover:border-green-500"
               >
                 <LayoutDashboard size={14} /> C2 DASHBOARD
               </button>
             )}

             {/* HIVE MIND AUTO TOGGLE (SSH ONLY) */}
             {config.mode === 'ssh' && config.activeProvider === 'gemini' && (
               <button
                 onClick={toggleAutoPilot}
                 title={config.isAutoPilot ? t.stopHive : t.startHive}
                 className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-bold transition-all mr-2 ${config.isAutoPilot ? 'bg-green-500 text-black border-green-400 animate-pulse' : 'bg-transparent text-green-700 border-green-900 hover:bg-green-900/30'}`}
               >
                 <Radio size={14} className={config.isAutoPilot ? 'animate-spin' : ''} />
                 {config.isAutoPilot ? t.hiveActive : 'HIVE AUTO'}
               </button>
             )}

             <button 
                onClick={() => setShowSettings(!showSettings)}
                title={t.settingsTitle}
                className={`p-2 rounded-full hover:bg-white/10 transition-colors ${showSettings ? themeStyles.accent : (config.mode === 'ssh' ? 'text-green-700' : 'text-gray-500')}`}
              >
                <Settings size={22} />
             </button>
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className={`absolute top-20 right-0 md:right-6 z-20 w-full md:w-96 ${config.mode === 'ssh' ? 'bg-gray-900 border-green-800 text-green-500' : 'bg-white/95 border-white/50 text-gray-700'} backdrop-blur-xl shadow-xl border p-4 rounded-b-2xl md:rounded-2xl flex flex-col gap-4 animate-in slide-in-from-top-4 fade-in duration-200 max-h-[70vh] overflow-y-auto`}>
            
            <div className="flex justify-between items-center mb-1">
               <h3 className="font-bold text-sm">{t.settingsTitle}</h3>
               <button onClick={() => setShowSettings(false)} className="opacity-50 hover:opacity-100"><X size={16} /></button>
            </div>
            
            {/* Language Switcher */}
            <div className="flex gap-2">
                <button 
                    onClick={() => setConfig(prev => ({...prev, language: 'ru'}))}
                    className={`flex-1 py-1 text-xs border rounded ${config.language === 'ru' ? (config.mode === 'ssh' ? 'bg-green-800 text-white' : 'bg-pink-500 text-white') : 'opacity-50'}`}
                >
                    Русский
                </button>
                <button 
                    onClick={() => setConfig(prev => ({...prev, language: 'en'}))}
                    className={`flex-1 py-1 text-xs border rounded ${config.language === 'en' ? (config.mode === 'ssh' ? 'bg-green-800 text-white' : 'bg-pink-500 text-white') : 'opacity-50'}`}
                >
                    English
                </button>
            </div>

            {/* Mode Switcher */}
            <div className={`p-1 rounded-lg flex gap-1 ${config.mode === 'ssh' ? 'bg-black' : 'bg-gray-100'}`}>
               <button 
                 onClick={() => toggleMode('chat')}
                 className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${config.mode === 'chat' ? 'bg-white shadow-sm text-pink-500' : 'opacity-50 hover:opacity-100'}`}
               >
                 <Sparkles size={14} /> {t.modeKawaii}
               </button>
               <button 
                 onClick={() => toggleMode('ssh')}
                 className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${config.mode === 'ssh' ? 'bg-green-900 text-green-400' : 'opacity-50 hover:opacity-100'}`}
               >
                 <Terminal size={14} /> {t.modeSsh}
               </button>
            </div>

            {/* Model Selection */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
               <label className="text-xs font-semibold opacity-70">AI Model Provider</label>
               <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setConfig(prev => ({ ...prev, activeModelId: m.id, activeProvider: m.provider }))}
                      className={`text-xs p-2 rounded border text-left ${config.activeModelId === m.id ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'border-transparent hover:bg-gray-50'}`}
                    >
                      {m.name}
                    </button>
                  ))}
               </div>
               
               {/* API Key Input for selected non-Gemini provider */}
               {config.activeProvider !== 'gemini' && (
                 <div className="mt-2 bg-yellow-50 p-2 rounded border border-yellow-100">
                    <label className="text-[10px] font-bold text-yellow-700 flex items-center gap-1 mb-1">
                      <Key size={10} /> {config.activeProvider.toUpperCase()} API KEY
                    </label>
                    <input 
                      type="password"
                      value={config.apiKeys[config.activeProvider] || ''}
                      onChange={(e) => updateApiKey(config.activeProvider, e.target.value)}
                      placeholder={`sk-...`}
                      className="w-full text-xs p-1.5 rounded border border-yellow-200 focus:outline-none focus:border-yellow-400"
                    />
                    <p className="text-[9px] text-yellow-600 mt-1 leading-tight">Key is stored in browser memory only. Not sent to my server.</p>
                 </div>
               )}

               {/* Environment Variable Check */}
               <div className={`mt-2 p-2 rounded border flex flex-col gap-1 ${config.mode === 'ssh' ? 'bg-black border-green-900' : 'bg-gray-50 border-gray-200'}`}>
                 <div className="flex items-center justify-between">
                   <label className="text-[10px] font-bold opacity-60 flex items-center gap-1">
                     <Shield size={10} /> SYSTEM ENVIRONMENT
                   </label>
                   <span className={`text-[10px] font-bold ${systemApiKey ? 'text-green-600' : 'text-red-500'}`}>
                     {systemApiKey ? t.apiKeyDetected : t.apiKeyMissing}
                   </span>
                 </div>
                 
                 <div className="flex items-center gap-2 mt-1">
                    <code className={`text-[10px] flex-1 font-mono truncate p-1 rounded ${config.mode === 'ssh' ? 'bg-green-900/20' : 'bg-gray-100'}`}>
                      {showEnvKey ? (systemApiKey || 'process.env.API_KEY is undefined') : (systemApiKey ? `${systemApiKey.substring(0,5)}...${systemApiKey.substring(systemApiKey.length - 3)}` : 'No API_KEY in .env')}
                    </code>
                    <button onClick={() => setShowEnvKey(!showEnvKey)} className="opacity-50 hover:opacity-100">
                      {showEnvKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                 </div>
                 {!systemApiKey && <p className="text-[9px] text-red-500 leading-tight">Create a .env file with API_KEY=...</p>}
               </div>
            </div>

            {config.mode === 'chat' ? (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-70">{t.theme}</label>
                  <div className="flex gap-2">
                    {(['pink', 'purple', 'blue'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setConfig(prev => ({...prev, themeColor: c}))}
                        className={`w-8 h-8 rounded-full border-2 ${config.themeColor === c ? 'border-gray-600 scale-110' : 'border-transparent'} shadow-sm transition-all`}
                        style={{ backgroundColor: c === 'pink' ? '#ec4899' : c === 'purple' ? '#a855f7' : '#38bdf8' }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-70">{t.modules}</label>
                  <button 
                    onClick={() => setShowMcpManager(true)}
                    className="w-full py-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-purple-100 hover:bg-purple-100 transition-colors"
                  >
                    <Server size={14} /> {t.manageMcp}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                 <div className="space-y-2">
                    <label className="text-xs font-semibold opacity-70">SSH Config</label>
                    <div className="flex flex-col gap-2">
                       <input 
                         type="text" 
                         value={config.sshHost}
                         onChange={(e) => setConfig(prev => ({...prev, sshHost: e.target.value}))}
                         className="bg-black border border-green-900 rounded px-2 py-1 text-xs text-green-500 font-mono focus:outline-none focus:border-green-500"
                         placeholder="Host (e.g., 192.168.1.5)"
                       />
                       
                       <button
                         onClick={toggleAutoPilot}
                         className={`w-full py-2 border rounded font-mono text-xs flex items-center justify-center gap-2 ${config.isAutoPilot ? 'bg-green-500 text-black border-green-400 font-bold' : 'border-green-800 text-green-600 hover:bg-green-900/30'}`}
                       >
                         <Radio size={14} className={config.isAutoPilot ? 'animate-spin' : ''} />
                         {config.isAutoPilot ? t.stopHive : t.startHive}
                       </button>
                       <button
                         onClick={() => setShowDashboard(true)}
                         className="w-full py-2 border border-green-800 rounded font-mono text-xs flex items-center justify-center gap-2 text-green-400 hover:bg-green-900/30 hover:border-green-500 transition-all"
                       >
                         <LayoutDashboard size={14} /> {t.openDashboard}
                       </button>
                       <p className="text-[9px] text-green-800">
                         ⚠️ Hive Mind allows autonomous recursive task execution. Use responsibly.
                       </p>
                    </div>
                 </div>
              </div>
            )}

            <div className={`h-px ${config.mode === 'ssh' ? 'bg-green-900' : 'bg-gray-100'}`} />
            
            <button 
              onClick={handleClearChat}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors w-full ${config.mode === 'ssh' ? 'text-red-500 hover:bg-red-900/20' : 'text-red-500 hover:bg-red-50'}`}
            >
              <Trash2 size={16} /> {config.mode === 'ssh' ? t.purgeLogs : t.clearHistory}
            </button>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 scroll-smooth">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} theme={config.themeColor} isTerminalMode={config.mode === 'ssh'} language={config.language} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`p-4 ${config.mode === 'ssh' ? 'bg-black border-t border-green-900' : 'bg-white/60 backdrop-blur-md border-t border-white/40'} shrink-0`}>
          
          {selectedImage && (
            <div className="mb-3 inline-flex relative group">
              <div className={`w-16 h-16 rounded-lg overflow-hidden border-2 shadow-md ${config.mode === 'ssh' ? 'border-green-500' : 'border-white'}`}>
                <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-full h-full object-cover" alt="preview" />
              </div>
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div className={`flex items-end gap-2 rounded-3xl p-2 shadow-inner border transition-all ${config.mode === 'ssh' ? 'bg-gray-900 border-green-900' : 'bg-white border-gray-100 focus-within:ring-2 focus-within:ring-pink-100'}`}>
            
            {/* Image Upload (Gemini Only) */}
            <button 
              onClick={() => config.activeProvider === 'gemini' && fileInputRef.current?.click()}
              className={`p-3 rounded-full transition-colors ${config.activeProvider !== 'gemini' ? 'opacity-30 cursor-not-allowed' : ''} ${config.mode === 'ssh' ? 'text-green-700 hover:bg-green-900/30' : `hover:bg-gray-100 ${themeStyles.accent}`}`}
              title={config.activeProvider === 'gemini' ? "Добавить картинку" : "Image upload only for Gemini"}
            >
              <ImagePlus size={20} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageUpload}
            />

            {/* Live Mode Toggle (Gemini Only) */}
             <button 
              onClick={toggleLiveMode}
              className={`p-3 rounded-full transition-all ${config.activeProvider !== 'gemini' ? 'opacity-30 cursor-not-allowed text-gray-400' : (isLiveActive ? 'animate-pulse text-red-500' : 'text-pink-500 hover:bg-pink-100')}`}
              title={config.activeProvider === 'gemini' ? t.liveVoice : "Voice mode only for Gemini"}
            >
              <Mic size={20} />
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={config.mode === 'ssh' ? (config.isAutoPilot ? "HIVE MIND ACTIVE - MONITORING..." : t.placeholderSsh) : t.placeholderChat}
              rows={1}
              className={`flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-2 max-h-32 font-medium ${config.mode === 'ssh' ? 'text-green-500 placeholder:text-green-800 font-mono' : 'text-gray-700 placeholder:text-gray-400'}`}
              style={{ minHeight: '44px' }}
            />

            <button
              onClick={sendMessage}
              title="Send Message"
              disabled={(!inputText.trim() && !selectedImage) || isLoading}
              className={`
                p-3 rounded-2xl transition-all duration-300 shadow-lg flex items-center justify-center
                ${(!inputText.trim() && !selectedImage) || isLoading 
                  ? (config.mode === 'ssh' ? 'bg-gray-800 text-gray-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed') 
                  : `${themeStyles.primary} ${config.mode === 'ssh' ? 'text-black' : 'text-white hover:scale-105 active:scale-95'}`
                }
              `}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className={isLoading ? '' : 'ml-0.5'} />}
            </button>
          </div>
          
          <div className="text-center mt-2 flex justify-center gap-3">
             {config.useSearch && config.activeProvider === 'gemini' && <span className="text-[10px] flex items-center gap-1 text-blue-400"><Globe size={10} /> {t.searchOn}</span>}
             {config.usePython && config.activeProvider === 'gemini' && <span className="text-[10px] flex items-center gap-1 text-yellow-500"><FileCode size={10} /> {t.pythonOn}</span>}
             {config.isAutoPilot && <span className="text-[10px] flex items-center gap-1 text-green-500 animate-pulse"><Radio size={10} /> {t.hiveActive}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
