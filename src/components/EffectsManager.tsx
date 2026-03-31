import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'motion/react';

export type EffectType = 'neon' | 'lines';

export const effectNames: Record<EffectType, string> = {
  neon: 'Dải LED Neon',
  lines: 'Đường kẻ 3D'
};

function Lines3DEffect() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#020617]" style={{ contain: 'strict' }}>
      {/* Perspective Grid */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(14, 165, 233, 0.2) 1px, transparent 1px),
            linear-gradient(rgba(14, 165, 233, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: 'perspective(1000px) rotateX(75deg) translateY(-100px) translateZ(0)',
          transformOrigin: 'center top',
          height: '200%',
          willChange: 'transform'
        }}
      />
      
      {/* Moving scanline */}
      <motion.div 
        animate={{ 
          top: ['-10%', '110%']
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-accent/10 to-transparent z-10"
        style={{ willChange: 'top' }}
      />

      {/* Atmospheric glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
      
      {/* Floating 3D-like lines */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent"
          style={{
            top: `${10 + i * 8}%`,
            left: '-20%',
            right: '-20%',
            boxShadow: '0 0 20px rgba(14, 165, 233, 0.2)',
            willChange: 'transform, opacity',
            transform: 'perspective(1000px) rotateY(20deg)'
          }}
          animate={{
            opacity: [0.1, 0.4, 0.1],
            x: [i % 2 === 0 ? -50 : 50, i % 2 === 0 ? 50 : -50],
          }}
          transition={{
            duration: 6 + i,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Central focus glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px]" />
    </div>
  );
}

function NeonEffect() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ contain: 'strict' }}>
      <motion.div 
        animate={{ 
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff, #00ffff)',
          backgroundSize: '400% 400%',
          filter: 'blur(60px)',
          willChange: 'background-position, transform'
        }}
      />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent shadow-[0_0_30px_#d946ef] animate-pulse" style={{ transform: 'translate3d(0,0,0)' }} />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_30px_#06b6d4] animate-pulse" style={{ transform: 'translate3d(0,0,0)' }} />
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-fuchsia-500 to-transparent shadow-[0_0_30px_#d946ef] animate-pulse" style={{ transform: 'translate3d(0,0,0)' }} />
      <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-500 to-transparent shadow-[0_0_30px_#06b6d4] animate-pulse" style={{ transform: 'translate3d(0,0,0)' }} />
    </div>
  );
}

export default function EffectsManager({ effect }: { effect: EffectType }) {
  if (effect === 'lines') return <Lines3DEffect />;
  return <NeonEffect />;
}
