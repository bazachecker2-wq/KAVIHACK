
import React from 'react';
import { Message, Role, AppLanguage } from '../types';
import { THEMES, TRANSLATIONS } from '../constants';
import { Bot, User, AlertCircle, Globe, Terminal, Shield, Zap, Search, Play } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatBubbleProps {
  message: Message;
  theme: keyof typeof THEMES;
  isTerminalMode?: boolean;
  language: AppLanguage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, theme, isTerminalMode, language }) => {
  const isUser = message.role === Role.USER;
  const currentTheme = isTerminalMode ? THEMES.terminal : THEMES[theme];
  const t = TRANSLATIONS[language];

  // Logic to parse Hive Mind tags [SCOUT], [EXECUTOR], etc.
  const renderContent = () => {
    if (message.isError) {
      return (
        <div className="flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{message.text}</span>
        </div>
      );
    }

    // If terminal mode and model message, check for Hive Mind tags
    if (isTerminalMode && !isUser) {
      const parts = message.text.split(/(\[(?:SCOUT|BREAKER|ANALYST|EXECUTOR|MISSION_COMPLETE|AWAITING_NEXT_PHASE)\])/g);
      
      // If no tags found, render normally
      if (parts.length === 1) {
        return <MarkdownRenderer content={message.text} />;
      }

      let currentAgent = 'SYSTEM';
      
      return (
        <div className="space-y-2">
          {parts.map((part, idx) => {
            if (!part.trim()) return null;

            if (part.startsWith('[') && part.endsWith(']')) {
              currentAgent = part.slice(1, -1);
              return null; // Skip rendering the tag itself
            }

            // Render the content block based on the current agent
            let agentColor = 'text-green-500 border-green-900';
            let AgentIcon = Terminal;
            
            switch (currentAgent) {
              case 'SCOUT': 
                agentColor = 'text-blue-400 border-blue-900/50 bg-blue-950/20'; 
                AgentIcon = Search;
                break;
              case 'BREAKER': 
                agentColor = 'text-red-400 border-red-900/50 bg-red-950/20'; 
                AgentIcon = Zap;
                break;
              case 'ANALYST': 
                agentColor = 'text-yellow-400 border-yellow-900/50 bg-yellow-950/20'; 
                AgentIcon = Shield;
                break;
              case 'EXECUTOR': 
                agentColor = 'text-green-400 border-green-900/50 bg-green-950/20'; 
                AgentIcon = Play;
                break;
              default:
                // System or raw text
                return <MarkdownRenderer key={idx} content={part} />;
            }

            return (
               <div key={idx} className={`pl-3 border-l-2 py-1 ${agentColor}`}>
                 <div className="flex items-center gap-2 mb-1 text-[10px] font-bold tracking-widest opacity-70">
                   <AgentIcon size={10} />
                   {currentAgent}
                 </div>
                 <div className="text-sm opacity-90">
                   <MarkdownRenderer content={part} />
                 </div>
               </div>
            );
          })}
        </div>
      );
    }

    return <MarkdownRenderer content={message.text} />;
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        
        {/* Avatar */}
        <div 
          title={isUser ? 'User' : 'AI Agent'}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${isUser ? currentTheme.primary : (isTerminalMode ? 'bg-black border border-green-900' : 'bg-white')}`}
        >
          {isUser ? (
            <User size={16} className={isTerminalMode ? 'text-black' : 'text-white'} />
          ) : (
            isTerminalMode ? <Terminal size={16} className="text-green-500" /> : <Bot size={18} className={currentTheme.accent} />
          )}
        </div>

        {/* Bubble */}
        <div 
          className={`
            relative px-5 py-3 shadow-sm text-sm md:text-base overflow-hidden
            ${isUser ? `${currentTheme.bubbleUser} rounded-2xl rounded-br-none` : `${currentTheme.bubbleAi} rounded-2xl rounded-bl-none`}
            ${message.isError ? 'border-red-300 bg-red-50 text-red-600' : ''}
            ${isTerminalMode ? 'font-mono' : ''}
          `}
        >
          {message.image && (
            <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
               <img src={`data:image/jpeg;base64,${message.image}`} alt="Uploaded" className="max-w-full h-auto max-h-60 object-cover" />
            </div>
          )}
          
          {renderContent()}

          {/* Search Sources / Grounding */}
          {message.groundingMetadata?.groundingChunks && message.groundingMetadata.groundingChunks.length > 0 && (
             <div className={`mt-3 pt-2 border-t ${isTerminalMode ? 'border-green-900' : 'border-gray-100'} text-xs`}>
                <div className="flex items-center gap-1 opacity-70 mb-1">
                  <Globe size={12} />
                  <span className="font-semibold">{t.sources}:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {message.groundingMetadata.groundingChunks.map((chunk, idx) => (
                    chunk.web?.uri && (
                      <a 
                        key={idx}
                        href={chunk.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={chunk.web.title}
                        className={`truncate max-w-[200px] px-2 py-1 rounded ${isTerminalMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900' : 'bg-gray-50 text-blue-500 hover:bg-blue-50'} transition-colors`}
                      >
                        {chunk.web.title || new URL(chunk.web.uri).hostname}
                      </a>
                    )
                  ))}
                </div>
             </div>
          )}
          
          <div className={`text-[10px] mt-1 text-right opacity-60 ${isUser ? (isTerminalMode ? 'text-black' : 'text-white') : (isTerminalMode ? 'text-green-800' : 'text-gray-400')}`}>
            {new Date(message.timestamp).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
