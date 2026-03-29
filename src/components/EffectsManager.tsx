import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'motion/react';

export type EffectType = 'particles' | 'snow' | 'stars' | 'neon' | 'fireworks';

export const effectNames: Record<EffectType, string> = {
  particles: 'Hạt Lơ Lửng',
  snow: 'Tuyết Rơi',
  stars: 'Sao Băng',
  neon: 'Dải LED Neon',
  fireworks: 'Pháo Hoa'
};

function ParticlesEffect() {
  const particles = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 6 + 3,
      duration: Math.random() * 10 + 5,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-accent/60"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            boxShadow: `0 0 ${p.size * 4}px rgba(173,216,230,0.8)`
          }}
          initial={{ y: '110vh', opacity: 0 }}
          animate={{
            y: '-10vh',
            x: [`${p.x}%`, `${p.x + (Math.random() * 10 - 5)}%`],
            opacity: [0, 0.8, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
        />
      ))}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[100px]"
      />
    </div>
  );
}

function SnowEffect() {
  const snowflakes = useMemo(() => {
    return Array.from({ length: 120 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 8 + 3,
      duration: Math.random() * 8 + 4,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-gradient-to-b from-blue-900/10 to-transparent">
      {snowflakes.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            boxShadow: `0 0 ${p.size * 2}px rgba(255,255,255,1)`
          }}
          initial={{ y: '-10vh', opacity: 0 }}
          animate={{
            y: '110vh',
            x: [`${p.x}%`, `${p.x + (Math.random() * 20 - 10)}%`],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
}

function StarsEffect() {
  const stars = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 2 + 1,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black/20">
      {/* Static stars */}
      {Array.from({ length: 150 }).map((_, i) => (
        <div 
          key={`static-${i}`}
          className="absolute bg-white rounded-full"
          style={{
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.8 + 0.2,
            boxShadow: '0 0 8px rgba(255,255,255,1)'
          }}
        />
      ))}
      {/* Shooting stars */}
      {stars.map((p) => (
        <motion.div
          key={p.id}
          className="absolute bg-white"
          style={{
            width: p.size * 30,
            height: p.size,
            rotate: 10,
            background: 'linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
            boxShadow: `0 0 ${p.size * 4}px rgba(255,255,255,1)`
          }}
          initial={{ x: `${p.x}vw`, y: '-10vh', opacity: 0 }}
          animate={{
            x: `${p.x + 20}vw`,
            y: '110vh',
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeIn"
          }}
        />
      ))}
    </div>
  );
}

function NeonEffect() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <motion.div 
        animate={{ 
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff, #00ffff)',
          backgroundSize: '400% 400%',
          filter: 'blur(60px)'
        }}
      />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent shadow-[0_0_30px_#d946ef] animate-pulse" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_30px_#06b6d4] animate-pulse" />
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-fuchsia-500 to-transparent shadow-[0_0_30px_#d946ef] animate-pulse" />
      <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-500 to-transparent shadow-[0_0_30px_#06b6d4] animate-pulse" />
    </div>
  );
}

function FireworksEffect() {
  const [fireworks, setFireworks] = useState<{id: number, x: number, y: number, color: string}[]>([]);

  useEffect(() => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
    const interval = setInterval(() => {
      setFireworks(prev => {
        const newFw = {
          id: Date.now(),
          x: Math.random() * 80 + 10,
          y: Math.random() * 50 + 10,
          color: colors[Math.floor(Math.random() * colors.length)]
        };
        return [...prev.slice(-14), newFw]; // Keep max 15 fireworks
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {fireworks.map(fw => (
        <motion.div
          key={fw.id}
          className="absolute"
          style={{ left: `${fw.x}%`, top: `${fw.y}%` }}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: fw.color, boxShadow: `0 0 15px ${fw.color}` }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos((i * 15 * Math.PI) / 180) * 150,
                y: Math.sin((i * 15 * Math.PI) / 180) * 150 + 80, // gravity effect
                opacity: 0,
                scale: 0
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

export default function EffectsManager({ effect }: { effect: EffectType }) {
  if (effect === 'particles') return <ParticlesEffect />;
  if (effect === 'snow') return <SnowEffect />;
  if (effect === 'stars') return <StarsEffect />;
  if (effect === 'neon') return <NeonEffect />;
  if (effect === 'fireworks') return <FireworksEffect />;
  return <ParticlesEffect />;
}
