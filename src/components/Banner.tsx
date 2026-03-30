import React from 'react';
import { X, Megaphone } from 'lucide-react';
import { motion } from 'motion/react';

interface BannerProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  imageUrl?: string;
  onClose: () => void;
}

export default function Banner({ title, message, icon, imageUrl, onClose }: BannerProps) {
  return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-accent text-black p-4 flex items-center justify-between shadow-lg border-b border-black/10"
      >
        <div className="flex items-center gap-4">
          {imageUrl ? (
            <img src={imageUrl} alt="Banner" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="text-2xl">{icon || <Megaphone />}</div>
          )}
          <div>
            <h4 className="font-black uppercase tracking-widest text-xs">{title}</h4>
            <p className="text-[10px] font-medium">{message}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors">
          <X size={16} />
        </button>
      </motion.div>
  );
}
