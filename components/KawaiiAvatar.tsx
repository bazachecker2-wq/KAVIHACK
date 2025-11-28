import React, { useEffect, useState } from 'react';
import { AvatarEmotion } from '../types';

interface KawaiiAvatarProps {
  emotion: AvatarEmotion;
  size?: number;
  isLive?: boolean;
}

const KawaiiAvatar: React.FC<KawaiiAvatarProps> = ({ emotion, size = 64, isLive = false }) => {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);

  // Blinking logic
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 4000 + Math.random() * 2000); // Random blink every 4-6s

    return () => clearInterval(blinkInterval);
  }, []);

  // Speaking mouth movement logic
  useEffect(() => {
    let speakInterval: any;
    if (emotion === 'speaking') {
      speakInterval = setInterval(() => {
        setMouthOpen(prev => !prev);
      }, 200);
    } else {
      setMouthOpen(false);
    }
    return () => clearInterval(speakInterval);
  }, [emotion]);

  const isHacker = emotion === 'hacker';
  const primaryColor = isHacker ? '#22c55e' : '#ec4899'; // Green or Pink
  const secondaryColor = isHacker ? '#14532d' : '#fbcfe8';
  const skinColor = isHacker ? '#000000' : '#ffffff';
  const strokeColor = isHacker ? '#22c55e' : '#374151';

  return (
    <div 
      className={`relative rounded-full overflow-hidden transition-all duration-500 ${isHacker ? 'shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'shadow-lg'}`}
      style={{ width: size, height: size, backgroundColor: skinColor, border: `3px solid ${strokeColor}` }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Cheeks (Only in Kawaii Mode) */}
        {!isHacker && (
          <>
            <ellipse cx="20" cy="65" rx="8" ry="4" fill="#f9a8d4" opacity="0.6" />
            <ellipse cx="80" cy="65" rx="8" ry="4" fill="#f9a8d4" opacity="0.6" />
          </>
        )}

        {/* Eyes */}
        <g transform="translate(0, 10)">
           {emotion === 'thinking' ? (
             // Thinking Eyes (Looking up/side)
             <>
               <circle cx="30" cy="35" r="5" fill={strokeColor} className="animate-bounce" />
               <circle cx="70" cy="35" r="5" fill={strokeColor} className="animate-bounce" style={{ animationDelay: '0.1s' }} />
             </>
           ) : emotion === 'happy' ? (
             // Happy Eyes (^)
             <>
                <path d="M 20 40 Q 30 30 40 40" stroke={strokeColor} strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M 60 40 Q 70 30 80 40" stroke={strokeColor} strokeWidth="4" fill="none" strokeLinecap="round" />
             </>
           ) : blink ? (
             // Closed Eyes (Blink)
             <>
                <line x1="20" y1="40" x2="40" y2="40" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
                <line x1="60" y1="40" x2="80" y2="40" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
             </>
           ) : (
             // Normal Eyes
             <>
                <ellipse cx="30" cy="40" rx="6" ry="8" fill={strokeColor} />
                <ellipse cx="70" cy="40" rx="6" ry="8" fill={strokeColor} />
                {/* Highlights */}
                {!isHacker && <circle cx="32" cy="37" r="2" fill="white" />}
                {!isHacker && <circle cx="72" cy="37" r="2" fill="white" />}
             </>
           )}
        </g>

        {/* Mouth */}
        <g transform="translate(0, 10)">
          {emotion === 'speaking' ? (
             <path 
               d={mouthOpen ? "M 40 70 Q 50 85 60 70" : "M 45 70 Q 50 72 55 70"} 
               stroke={strokeColor} 
               strokeWidth="3" 
               fill={mouthOpen ? (isHacker ? "#0f391e" : "#fda4af") : "none"} 
               strokeLinecap="round" 
             />
          ) : emotion === 'happy' ? (
             <path d="M 40 65 Q 50 75 60 65" stroke={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : emotion === 'thinking' ? (
             <circle cx="50" cy="70" r="3" fill={strokeColor} />
          ) : (
             // Neutral
             <path d="M 45 70 Q 50 72 55 70" stroke={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
          )}
        </g>

        {/* Hacker Glitch Overlay */}
        {isHacker && (
          <rect width="100" height="5" y="20" fill="#22c55e" opacity="0.2" className="animate-pulse" />
        )}
      </svg>
    </div>
  );
};

export default KawaiiAvatar;