import React from 'react';
import { Message, Role } from '../types';
import { THEMES } from '../constants';
import { Bot, User, AlertCircle, Globe, Terminal } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatBubbleProps {
  message: Message;
  theme: keyof typeof THEMES;
  isTerminalMode?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, theme, isTerminalMode }) => {
  const isUser = message.role === Role.USER;
  const currentTheme = isTerminalMode ? THEMES.terminal : THEMES[theme];

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${isUser ? currentTheme.primary : (isTerminalMode ? 'bg-black border border-green-900' : 'bg-white')}`}>
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
          
          {message.isError ? (
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{message.text}</span>
            </div>
          ) : (
             <MarkdownRenderer content={message.text} />
          )}

          {/* Search Sources / Grounding */}
          {message.groundingMetadata && message.groundingMetadata.groundingChunks.length > 0 && (
             <div className={`mt-3 pt-2 border-t ${isTerminalMode ? 'border-green-900' : 'border-gray-100'} text-xs`}>
                <div className="flex items-center gap-1 opacity-70 mb-1">
                  <Globe size={12} />
                  <span className="font-semibold">Источники:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {message.groundingMetadata.groundingChunks.map((chunk, idx) => (
                    chunk.web?.uri && (
                      <a 
                        key={idx}
                        href={chunk.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
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
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;