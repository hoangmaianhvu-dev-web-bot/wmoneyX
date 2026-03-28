import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';

interface MusicToggleProps {
  isPlaying: boolean;
  togglePlay: () => void;
}

export default function MusicToggle({ isPlaying, togglePlay }: MusicToggleProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={togglePlay}
      className={`w-9 h-9 glass flex items-center justify-center relative border-accent/20 rounded-xl hover:bg-accent/20 transition-colors ${
        isPlaying 
          ? 'bg-accent/20 border-accent text-accent shadow-[0_0_15px_rgba(173,216,230,0.5)]' 
          : 'bg-black/50 border-white/10 text-gray-400'
      }`}
      title="Bật/Tắt nhạc"
    >
      {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </motion.button>
  );
}
