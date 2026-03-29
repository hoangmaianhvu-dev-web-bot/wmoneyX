import React, { useEffect, useState } from 'react';
import { 
  Bolt, 
  ShieldCheck, 
  Rocket, 
  Headset, 
  Mail, 
  MessageCircle, 
  Phone, 
  Facebook, 
  Send, 
  Youtube,
  Menu,
  X,
  ArrowRight,
  LogOut,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import BackgroundMusic from './components/BackgroundMusic';
import EffectsManager, { EffectType } from './components/EffectsManager';
import { supabase } from './supabase';

type View = 'landing' | 'auth' | 'dashboard';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentEffect, setCurrentEffect] = useState<EffectType>(() => {
    return (localStorage.getItem('app_effect') as EffectType) || 'neon';
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const toggleMusic = () => {
    setIsMusicPlaying(!isMusicPlaying);
  };

  useEffect(() => {
    localStorage.setItem('app_effect', currentEffect);
  }, [currentEffect]);

  useEffect(() => {
    // Global error handler for Supabase auth issues
    const handleAuthError = async (errorMsg: string) => {
      const lowerMsg = errorMsg.toLowerCase();
      const isAuthError = lowerMsg.includes('refresh_token') || 
                          lowerMsg.includes('refresh token') ||
                          lowerMsg.includes('not found') ||
                          lowerMsg.includes('invalid') ||
                          lowerMsg.includes('session') ||
                          lowerMsg.includes('auth');

      if (isAuthError && (lowerMsg.includes('token') || lowerMsg.includes('refresh'))) {
        console.warn('Caught auth error, clearing session:', errorMsg);
        
        // Prevent infinite reload loops
        const lastErrorTime = sessionStorage.getItem('last_auth_error_time');
        const now = Date.now();
        
        if (lastErrorTime && now - parseInt(lastErrorTime) < 5000) {
          console.error('Auth error loop detected. Stopping automatic cleanup.');
          return;
        }
        
        sessionStorage.setItem('last_auth_error_time', now.toString());

        try {
          await supabase.auth.signOut();
        } catch (e) {
          // Ignore sign out errors
        }
        
        // Clear all possible Supabase auth keys from localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase.auth.token') || (key.startsWith('sb-') && key.includes('auth-token'))) {
            localStorage.removeItem(key);
          }
        });
        
        setUser(null);
        setView('landing');
        
        // Force a reload to ensure a clean state
        window.location.reload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason);
      handleAuthError(reason);
    };

    const handleError = (event: ErrorEvent) => {
      handleAuthError(event.message);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            setView('dashboard');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setView(prev => prev === 'dashboard' ? 'landing' : prev);
        } else if (event === 'USER_UPDATED') {
          if (session?.user) {
            setUser(session.user);
          }
        }
      } catch (err) {
        console.error('Error in onAuthStateChange:', err);
      }
    });

    // Check current session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth session error:', error.message);
          handleAuthError(error.message);
        } else if (session?.user) {
          setUser(session.user);
          setView('dashboard');
        } else {
          setUser(null);
          // Only redirect to landing if we are currently in dashboard
          setView(prev => prev === 'dashboard' ? 'landing' : prev);
        }
      } catch (err) {
        console.error('Unexpected auth error in checkSession:', err);
        handleAuthError(String(err));
      } finally {
        setAuthReady(true);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('verify_reminder_shown');
    setIsMusicPlaying(false);
    setView('landing');
  };

  const renderContent = () => {
    if (!authReady) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (view === 'auth') {
      return <Auth onBack={() => setView('landing')} onSuccess={() => setView('dashboard')} />;
    }

    if (view === 'dashboard' && user) {
      return (
        <Dashboard 
          user={user} 
          onLogout={handleLogout} 
          currentEffect={currentEffect} 
          onEffectChange={setCurrentEffect}
          isMusicPlaying={isMusicPlaying}
          toggleMusic={toggleMusic}
        />
      );
    }

    return (
      <div className="min-h-screen text-white font-sans selection:bg-accent selection:text-bg">
      {/* Navbar */}
      <nav className="fixed w-full z-50 px-6 py-6 flex justify-between items-center bg-black/50 backdrop-blur-md border-b border-white/5">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-black italic ocean-glow cursor-pointer"
          onClick={() => setView('landing')}
        >
          wmoneyX
        </motion.h1>
        
        <div className="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.2em] font-bold">
          <a href="#features" className="hover:text-accent transition">Tính năng</a>
          <a href="#stats" className="hover:text-accent transition">Thống kê</a>
          <a href="#support" className="hover:text-accent transition">Hỗ trợ</a>
        </div>

        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setView('auth')}
            className="btn-primary px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest"
          >
            Bắt đầu ngay
          </motion.button>
          
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-md pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-8 text-center">
              <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-xl font-bold uppercase tracking-widest">Tính năng</a>
              <a href="#stats" onClick={() => setIsMenuOpen(false)} className="text-xl font-bold uppercase tracking-widest">Thống kê</a>
              <a href="#support" onClick={() => setIsMenuOpen(false)} className="text-xl font-bold uppercase tracking-widest">Hỗ trợ</a>
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  setView('auth');
                }}
                className="text-accent text-xl font-bold uppercase tracking-widest"
              >
                Đăng nhập
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center pt-20 px-6 text-center">
        <motion.div 
          className="hero-anim mb-8"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-2 border-accent flex items-center justify-center rotate-12 shadow-[0_0_50px_rgba(173,216,230,0.2)]">
            <Bolt className="w-12 h-12 md:w-16 md:h-16 ocean-glow -rotate-12" />
          </div>
        </motion.div>

        <motion.h2 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-8xl font-black italic tracking-tighter mb-6"
        >
          KIẾM TIỀN <br /> <span className="ocean-glow">THẬT ĐƠN GIẢN.</span>
        </motion.h2>

        <motion.p 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-xl text-gray-400 text-sm md:text-base mb-10 leading-relaxed"
        >
          Hệ thống nhiệm vụ thông minh giúp bạn gia tăng thu nhập mỗi ngày thông qua việc vượt link, xem quảng cáo và giới thiệu bạn bè. 
        </motion.p>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col md:flex-row gap-4"
        >
          <button 
            onClick={() => setView('auth')}
            className="btn-primary px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2"
          >
            Tham gia miễn phí <ArrowRight size={16} />
          </button>
          <a href="#features" className="glass px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-white/5 transition flex items-center justify-center">
            Tìm hiểu thêm
          </a>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-xs font-black uppercase tracking-[0.5em] text-accent mb-4">Tại sao chọn wmoneyX?</h3>
          <h2 className="text-3xl font-bold">Nền tảng kiếm tiền uy tín nhất</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass p-8 rounded-3xl feature-card">
            <ShieldCheck className="w-10 h-10 text-accent mb-6" />
            <h4 className="text-xl font-bold mb-4">An toàn tuyệt đối</h4>
            <p className="text-gray-500 text-sm">Hệ thống bảo mật đa lớp, bảo vệ số dư và thông tin cá nhân của bạn 24/7.</p>
          </div>
          <div className="glass p-8 rounded-3xl feature-card">
            <Rocket className="w-10 h-10 text-accent mb-6" />
            <h4 className="text-xl font-bold mb-4">Rút tiền siêu tốc</h4>
            <p className="text-gray-500 text-sm">Xử lý lệnh rút tiền tự động qua MoMo, Ngân hàng chỉ trong vòng vài phút.</p>
          </div>
          <div className="glass p-8 rounded-3xl feature-card">
            <Headset className="w-10 h-10 text-accent mb-6" />
            <h4 className="text-xl font-bold mb-4">Hỗ trợ 24/7</h4>
            <p className="text-gray-500 text-sm">Đội ngũ kỹ thuật luôn sẵn sàng giải đáp mọi thắc mắc của bạn bất cứ lúc nào.</p>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section id="support" className="py-24 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-xs font-black uppercase tracking-[0.5em] text-accent mb-4">Liên hệ hỗ trợ</h3>
          <h2 className="text-3xl font-bold">Chúng tôi luôn lắng nghe bạn</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <a href="mailto:wmoneyx2026@gmail.com" className="contact-item glass p-6 rounded-2xl text-center block">
            <Mail className="w-8 h-8 mx-auto mb-4 text-accent" />
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Email</p>
            <p className="text-xs font-medium">wmoneyx2026@gmail.com</p>
          </a>
          <a href="https://t.me/VanhTRUM" target="_blank" rel="noreferrer" className="contact-item glass p-6 rounded-2xl text-center block">
            <Send className="w-8 h-8 mx-auto mb-4 text-accent" />
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Telegram</p>
            <p className="text-xs font-medium">@VanhTRUM</p>
          </a>
          <a href="https://zalo.me/0337117930" target="_blank" rel="noreferrer" className="contact-item glass p-6 rounded-2xl text-center block">
            <MessageCircle className="w-8 h-8 mx-auto mb-4 text-accent" />
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Zalo Hotline</p>
            <p className="text-xs font-medium">0337.117.930</p>
          </a>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-white/5">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl font-black ocean-glow">50K+</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2">Thành viên</p>
          </div>
          <div>
            <p className="text-4xl font-black ocean-glow">200M+</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2">Đã thanh toán</p>
          </div>
          <div>
            <p className="text-4xl font-black ocean-glow">1M+</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2">Nhiệm vụ xong</p>
          </div>
          <div>
            <p className="text-4xl font-black ocean-glow">4.9/5</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2">Đánh giá</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 text-center">
        <h2 className="text-3xl font-black italic ocean-glow mb-6">wmoneyX</h2>
        <div className="flex justify-center gap-6 mb-10 text-gray-500">
          <a href="#" className="hover:text-accent transition"><Facebook size={20} /></a>
          <a href="https://t.me/VanhTRUM" className="hover:text-accent transition"><Send size={20} /></a>
          <a href="#" className="hover:text-accent transition"><Youtube size={20} /></a>
        </div>
        <p className="text-[10px] text-gray-700 uppercase tracking-[0.4em]">
          © 2024 Developed by <span className="text-gray-500 font-bold">HOANG MAI ANH VU</span>
        </p>
      </footer>
    </div>
    );
  };

  return (
    <>
      <BackgroundMusic isPlaying={isMusicPlaying} />
      <div className="relative z-10">
        {renderContent()}
      </div>
    </>
  );
}
