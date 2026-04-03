import React, { useState } from 'react';
import { Settings as SettingsIcon, Gamepad2, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Settings from './Settings';
import ModGame from './ModGame';
import Giftcode from './Giftcode';
import { EffectType } from './EffectsManager';

interface UtilitiesProps {
  profile: any;
  onLogout: () => void;
  onBack: () => void;
  onOpenAdmin: () => void;
  onVerifySuccess: () => void;
  showVerifyRedDot?: boolean;
  currentEffect: EffectType;
  onEffectChange: (effect: EffectType) => void;
  isAdmin: boolean;
  onUpdateProfile?: () => void;
}

export default function Utilities({
  profile,
  onLogout,
  onBack,
  onOpenAdmin,
  onVerifySuccess,
  showVerifyRedDot,
  currentEffect,
  onEffectChange,
  isAdmin,
  onUpdateProfile
}: UtilitiesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'mods' | 'giftcode'>('settings');

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden border-accent/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-accent">Tiện Ích</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Các công cụ và cài đặt</p>
          </div>
          
          <div className="flex bg-fuchsia-50 p-1.5 rounded-2xl border border-fuchsia-100 overflow-x-auto hide-scrollbar">
            <button 
              onClick={() => setActiveSubTab('settings')}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'settings' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-slate-500 hover:text-accent'}`}
            >
              Cài Đặt
              {showVerifyRedDot && <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </button>
            <button 
              onClick={() => setActiveSubTab('mods')}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'mods' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-slate-500 hover:text-accent'}`}
            >
              Mod Game
            </button>
            <button 
              onClick={() => setActiveSubTab('giftcode')}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${activeSubTab === 'giftcode' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-slate-500 hover:text-accent'}`}
            >
              <Gift size={12} />
              Giftcode
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'settings' ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Settings 
              profile={profile}
              onLogout={onLogout}
              onBack={onBack}
              onOpenAdmin={onOpenAdmin}
              onVerifySuccess={onVerifySuccess}
              showVerifyRedDot={showVerifyRedDot}
              currentEffect={currentEffect}
              onEffectChange={onEffectChange}
            />
          </motion.div>
        ) : activeSubTab === 'mods' ? (
          <motion.div
            key="mods"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ModGame isAdmin={isAdmin} />
          </motion.div>
        ) : (
          <motion.div
            key="giftcode"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Giftcode userId={profile.id} onUpdateProfile={onUpdateProfile} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
