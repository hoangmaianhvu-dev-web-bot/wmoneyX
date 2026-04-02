import React, { useEffect, useState } from 'react';
import { 
  UserRound, 
  Bell, 
  Coins, 
  TrendingUp, 
  Users, 
  Home, 
  CheckSquare, 
  Wallet, 
  Settings as SettingsIcon,
  X,
  Menu,
  Trophy,
  LogOut,
  ShieldCheck,
  Gift,
  Gamepad2,
  Dices,
  MessageCircle,
  Wand2,
  Star,
  Target,
  Layers,
  AlertTriangle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';
import { EffectType, effectNames } from './EffectsManager';
import Banner from './Banner';
import Settings from './Settings';
import Withdraw from './Withdraw';
import Tasks from './Tasks';
import DailyRewards from './DailyRewards';
import Leaderboard from './Leaderboard';
import AdminPanel from './AdminPanel';
import ModGame from './ModGame';
import MusicToggle from './MusicToggle';
import BackgroundMusic from './BackgroundMusic';
import RedEnvelopeWidget from './RedEnvelopeWidget';
import { getLevelInfo } from '../utils/levelUtils';

interface DashboardProps {
  user: any;
  onLogout: () => void;
  currentEffect: EffectType;
  onEffectChange: (effect: EffectType) => void;
  isMusicPlaying: boolean;
  toggleMusic: () => void;
}

interface Profile {
  username: string;
  email: string;
  balance: number;
  tasks_today: number;
  tasks_total: number;
  special_tasks_total?: number;
  vip_status: 'MEMBER' | 'VIP GOLD';
  is_admin: boolean;
  is_verified: boolean;
  exp: number;
  last_daily_reward_date?: string | null;
  last_task_reset_date?: string | null;
  last_blind_bag_free_date?: string | null;
  last_lucky_wheel_free_date?: string | null;
  last_red_envelope_claim?: string | null;
  referred_by?: string | null;
  referral_bonus_paid?: boolean;
  referral_code?: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Vừa xong"; 
  }
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function Dashboard({ user, onLogout, currentEffect, onEffectChange, isMusicPlaying, toggleMusic }: DashboardProps) {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [suggestedMods, setSuggestedMods] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showVerifyReminder, setShowVerifyReminder] = useState(false);
  const [showVerifyRedDot, setShowVerifyRedDot] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [isTaskVerified, setIsTaskVerified] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(true);

  const ADMIN_ID = "22072009";

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) setAnnouncement(data);
    } catch (err) {
      console.error('Error fetching announcement:', err);
    }
  };

  useEffect(() => {
    if (profile && !profile.is_verified) {
      const hasShown = sessionStorage.getItem('verify_reminder_shown');
      if (!hasShown) {
        setShowVerifyReminder(true);
        sessionStorage.setItem('verify_reminder_shown', 'true');
        
        const timer = setTimeout(() => {
          setShowVerifyReminder(false);
          setShowVerifyRedDot(true);
        }, 5000);
        
        return () => clearTimeout(timer);
      } else {
        setShowVerifyRedDot(true);
      }
    } else if (profile?.is_verified) {
      setShowVerifyRedDot(false);
      setShowVerifyReminder(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchNotifications();
    fetchSuggestedMods();
    const channel = supabase.channel('global_notifications', {
      config: {
        broadcast: { self: true },
      },
    })
      .on('broadcast', { event: 'notification' }, (payload) => {
        setNotifications(prev => [payload.payload, ...prev]);
        showNotification({ title: payload.payload.title, message: payload.payload.body, type: "info" });
        setShowNotifications(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchSuggestedMods = async () => {
    try {
      const { data, error } = await supabase
        .from('mods')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      if (data) {
        setSuggestedMods(data);
      }
    } catch (err) {
      console.error('Error fetching suggested mods:', err);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Real-time subscription for current user profile
    const profileChannel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated in real-time:', payload.new);
          setProfile(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  useEffect(() => {
    if (profile && profile.balance >= 1500 && profile.referred_by && !profile.referral_bonus_paid) {
      handleReferralBonus();
    }
  }, [profile]);

  const handleReferralBonus = async () => {
    try {
      if (!profile?.referred_by) return;
      
      // Extract code from WMX-12345 or just 12345
      const referrerCode = profile.referred_by.includes('WMX-') 
        ? profile.referred_by.split('WMX-')[1]
        : profile.referred_by;

      if (!referrerCode) return;

      console.log('Processing referral bonus for referrer code:', referrerCode);

      // 1. Find referrer by referral_code
      const { data: referrer, error: findError } = await supabase
        .from('profiles')
        .select('id, balance, username')
        .eq('referral_code', referrerCode)
        .single();

      if (findError || !referrer) {
        console.error('Referrer not found or error:', referrerCode, findError);
        return;
      }

      if (referrer.id === profile.id) {
        console.error('User cannot refer themselves');
        return;
      }

      // 2. Update referrer balance
      const { error: updateReferrerError } = await supabase
        .from('profiles')
        .update({ balance: (referrer.balance || 0) + 1000 })
        .eq('id', referrer.id);

      if (updateReferrerError) {
        console.error('Error updating referrer balance:', updateReferrerError);
        throw updateReferrerError;
      }

      // 2.5 Record transaction for referrer
      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          user_id: referrer.id,
          type: 'REFERRAL',
          amount: 1000,
          description: `Hoa hồng giới thiệu (${profile.username})`,
          status: 'COMPLETED'
        }]);

      if (txError) console.error('Error recording referral transaction:', txError);

      // 3. Mark bonus as paid for current user
      const { error: updateSelfError } = await supabase
        .from('profiles')
        .update({ referral_bonus_paid: true })
        .eq('id', user.id);

      if (updateSelfError) {
        console.error('Error updating self referral_bonus_paid:', updateSelfError);
        throw updateSelfError;
      }

      setProfile(prev => prev ? { ...prev, referral_bonus_paid: true } : null);
      
      showNotification({
        title: "Hệ thống",
        message: `Bạn đã giúp ${referrer.username} nhận được 1,000 Xu hoa hồng!`,
        type: "success"
      });
    } catch (err) {
      console.error('Error processing referral bonus:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, try to create it
          const newProfile = {
            id: user.id,
            username: user.email?.split('@')[0] || 'User',
            email: user.email || '',
            balance: 0,
            tasks_today: 0,
            tasks_total: 0,
            vip_status: 'MEMBER',
            is_verified: false,
            is_admin: false,
            referred_by: user.user_metadata?.referral_code || new URLSearchParams(window.location.search).get('ref') || null,
            referral_bonus_paid: false,
            referral_code: Math.floor(10000 + Math.random() * 90000).toString(),
            special_tasks_total: 0,
            last_task_reset_date: new Date().toISOString().split('T')[0]
          };
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile]);
          
          if (insertError) {
            console.error('Lỗi khi tạo hồ sơ:', insertError);
            showNotification({
              title: "Lỗi bảo mật (RLS)",
              message: "Không thể tạo hồ sơ. Vui lòng chạy SQL setup trong Supabase.",
              type: "error",
              duration: 0
            });
          } else {
            setProfile(newProfile as any);
          }
        } else {
          throw error;
        }
      } else {
        // Check for daily task reset
        const today = new Date().toISOString().split('T')[0];
        if (data.last_task_reset_date !== today) {
          try {
            const { data: updatedData, error: resetError } = await supabase
              .from('profiles')
              .update({ 
                tasks_today: 0, 
                last_task_reset_date: today 
              })
              .eq('id', user.id)
              .select()
              .single();
            
            if (resetError) throw resetError;
            setProfile(updatedData);
          } catch (resetErr) {
            console.error('Error resetting daily tasks:', resetErr);
            setProfile(data);
          }
        } else {
          // If profile exists but missing referral_code, generate it
          if (!data.referral_code) {
            const code = Math.floor(10000 + Math.random() * 90000).toString();
            await supabase.from('profiles').update({ referral_code: code }).eq('id', user.id);
            data.referral_code = code;
          }
          setProfile(data);
        }
      }
    } catch (error: any) {
      console.error('Lỗi khi truy xuất hồ sơ:', error);
      showNotification({
        title: "Lỗi kết nối",
        message: error.message || "Không thể kết nối với cơ sở dữ liệu.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const NavItem = ({ id, icon: Icon, label, collapsed = isSidebarCollapsed }: { id: string, icon: any, label: string, collapsed?: boolean }) => (
    <motion.button 
      whileHover={{ x: collapsed ? 0 : 5, rotateY: 10, z: 10 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        setActiveTab(id);
      }}
      className={`flex items-center rounded-2xl transition-all relative ${activeTab === id ? 'bg-accent text-white font-black shadow-lg shadow-accent/20' : 'text-violet-900 hover:bg-fuchsia-100 hover:text-accent'} ${collapsed ? 'justify-center w-12 h-12 mx-auto' : 'px-6 py-4 w-full gap-3'}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <Icon size={collapsed ? 24 : 20} />
      {!collapsed && <span className="text-xs uppercase tracking-widest whitespace-nowrap">{label}</span>}
      {id === 'settings' && showVerifyRedDot && (
        <span className={`absolute ${collapsed ? 'top-2 right-2' : 'right-4'} w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444] animate-pulse`}></span>
      )}
    </motion.button>
  );

  const levelInfo = profile ? getLevelInfo(profile.exp || 0) : null;

  return (
    <div className="min-h-screen text-slate-900 font-sans selection:bg-accent selection:text-white flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col ${isSidebarCollapsed ? 'w-20 px-4 py-6' : 'w-72 p-6'} border-r border-fuchsia-200 fixed h-full z-50 transition-all duration-500 bg-white/80 backdrop-blur-xl shadow-xl`}>
        <div className={`mb-12 px-2 flex ${isSidebarCollapsed ? 'flex-col gap-6 items-center' : 'items-center justify-between'}`}>
          {isSidebarCollapsed ? (
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-fuchsia-600 rounded-xl flex items-center justify-center text-white font-black italic text-xl shadow-lg shadow-accent/20 shrink-0">
              W
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-2xl font-black italic bg-clip-text text-transparent bg-gradient-to-r from-violet-900 via-accent to-violet-900 bg-[length:200%_auto] animate-shine">wmoneyX</h1>
              <p className="text-[8px] text-fuchsia-500 uppercase tracking-[0.4em] mt-1">Hệ thống kiếm tiền VIP</p>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-2 rounded-xl hover:bg-fuchsia-100 text-violet-900 hover:text-accent transition-all shrink-0`}
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem id="home" icon={Home} label="Trang Chủ" />
          <NavItem id="tasks" icon={CheckSquare} label="Nhiệm Vụ" />
          <NavItem id="ranking" icon={Trophy} label="Xếp Hạng" />
          <NavItem id="daily" icon={Gift} label="Thưởng Ngày" />
          <NavItem id="mods" icon={Gamepad2} label="Mod Game" />
          <NavItem id="wallet" icon={Wallet} label="Rút Tiền" />
          <NavItem id="settings" icon={SettingsIcon} label="Cài Đặt" />
        </nav>

        <div className="pt-6 border-t border-fuchsia-200 mt-auto">
          <button 
            onClick={onLogout}
            className={`flex items-center rounded-2xl text-fuchsia-500 hover:bg-fuchsia-50 transition-all ${isSidebarCollapsed ? 'justify-center w-12 h-12 mx-auto' : 'px-6 py-4 w-full gap-3'}`}
          >
            <LogOut size={20} />
            {!isSidebarCollapsed && <span className="text-xs uppercase tracking-widest font-bold">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'} min-h-screen pb-24 md:pb-12 relative transition-all duration-500`} style={{ contain: 'content' }}>
        {/* Social Icons */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
          <AnimatePresence>
            {isSocialOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="flex flex-col gap-3"
                style={{ willChange: 'transform, opacity' }}
              >
                <a href="https://youtube.com/your-ytb-link" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform">
                  <span className="font-black text-[10px]">YT</span>
                </a>
                <a href="https://t.me/+Drg0EEs27Nw1ZTdl" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform">
                  <span className="font-black text-[10px]">TG</span>
                </a>
                <a href="https://zalo.me/0337117930" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform">
                  <span className="font-black text-[10px]">ZL</span>
                </a>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsSocialOpen(!isSocialOpen)}
            className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-black shadow-[0_0_15px_rgba(173,216,230,0.5)] hover:scale-110 transition-transform"
          >
            {isSocialOpen ? <X size={24} /> : <MessageCircle size={24} />}
          </button>
        </div>

        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{ willChange: 'transform, opacity' }}
            >
              {activeTab === 'home' && (
            <>
              {/* Top Profile & Balance */}
              <header className="flex justify-between items-center py-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-fuchsia-100 flex items-center justify-center border-2 border-fuchsia-200 text-accent">
                      <UserRound size={24} />
                    </div>
                    {profile?.is_verified && (
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white shadow-lg">
                        <ShieldCheck size={10} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black tracking-tight text-violet-900">{profile?.username}</h2>
                      <span className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase bg-gradient-to-r from-yellow-400 to-orange-500 text-black`}>
                        VIP {levelInfo?.vip || 1}
                      </span>
                    </div>
                    <p className="text-[9px] text-violet-700 font-medium">{profile?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <MusicToggle isPlaying={isMusicPlaying} togglePlay={toggleMusic} />
                  <button 
                    onClick={() => setShowNotifications(true)}
                    className="w-9 h-9 glass flex items-center justify-center relative border-fuchsia-200 rounded-xl"
                  >
                    <Bell size={16} className="text-accent" />
                    {notifications.length > 0 && (
                      <div className="absolute top-[-2px] right-[-2px] w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]"></div>
                    )}
                  </button>
                  
                  <div className="glass px-3 py-2 flex items-center gap-2 border-fuchsia-200 rounded-xl bg-fuchsia-50">
                    <Coins size={12} className="text-accent" />
                    <span className="font-black text-xs tracking-tight text-accent">{profile?.balance === 0 ? '0' : profile?.balance.toLocaleString()}</span>
                  </div>
                </div>
              </header>

              {/* Banner */}
              <AnimatePresence>
                {showBanner && announcement && (
                  <Banner
                    title={announcement.title}
                    message={announcement.message}
                    imageUrl={announcement.image_url}
                    onClose={() => setShowBanner(false)}
                  />
                )}
              </AnimatePresence>

              {/* Level & VIP Progress Bar */}
              {levelInfo && (
                <div className="glass p-5 rounded-3xl mb-8 relative overflow-hidden border-accent/20">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Star size={16} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-black uppercase tracking-widest text-yellow-400">VIP {levelInfo.vip}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900">Cấp {levelInfo.level}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-900 uppercase font-bold tracking-widest">Kinh nghiệm</span>
                      <div className="text-xs font-mono text-accent">
                        {profile?.exp || 0} / {levelInfo.nextLevelExp} EXP
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${levelInfo.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent/50 to-accent rounded-full"
                      style={{ willChange: 'width, transform' }}
                    />
                    {/* Shine effect */}
                    <motion.div
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
                      className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                      style={{ willChange: 'transform' }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-900 mt-2 text-center italic">
                    Cần thêm {levelInfo.nextLevelExp - (profile?.exp || 0)} EXP để lên cấp {levelInfo.level + 1}
                  </p>
                </div>
              )}

              {/* Dashboard Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Column: Stats & Invite */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02, rotateY: 5, rotateX: -2, z: 10 }}
                      className="glass p-8 text-center rounded-3xl relative overflow-hidden group bg-blue-50 border-blue-200 shadow-lg"
                      style={{ willChange: 'transform, opacity', perspective: '1000px' }}
                    >
                      <div className="absolute top-4 right-4 text-blue-500/20 group-hover:text-blue-500/30 transition-all group-hover:scale-110 group-hover:rotate-12" style={{ backfaceVisibility: 'hidden' }}>
                        <Target size={40} />
                      </div>
                      <p className="text-[10px] text-blue-800 uppercase font-bold tracking-widest mb-2 relative z-10">Nhiệm vụ hôm nay</p>
                      <h3 className="text-3xl font-black italic text-blue-700 uppercase tracking-tighter relative z-10">{profile?.tasks_today || 0} / 666</h3>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02, rotateY: -5, rotateX: -2, z: 10 }}
                      transition={{ delay: 0.1 }}
                      className="glass p-8 text-center rounded-3xl relative overflow-hidden group bg-emerald-50 border-emerald-200 shadow-lg"
                      style={{ willChange: 'transform, opacity', perspective: '1000px' }}
                    >
                      <div className="absolute top-4 right-4 text-emerald-500/10 group-hover:text-emerald-500/20 transition-all group-hover:scale-110 group-hover:-rotate-12" style={{ backfaceVisibility: 'hidden' }}>
                        <CheckSquare size={40} />
                      </div>
                      <p className="text-[10px] text-emerald-800 uppercase font-bold tracking-widest mb-2 relative z-10">Nhiệm vụ thường</p>
                      <h3 className="text-3xl font-black italic text-emerald-700 relative z-10">{profile?.tasks_total || 0}</h3>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02, rotateY: 5, rotateX: 2, z: 10 }}
                      transition={{ delay: 0.15 }}
                      className="glass p-8 text-center rounded-3xl relative overflow-hidden group bg-rose-50 border-rose-200 shadow-lg"
                      style={{ willChange: 'transform, opacity', perspective: '1000px' }}
                    >
                      <div className="absolute top-4 right-4 text-rose-500/10 group-hover:text-rose-500/20 transition-all group-hover:scale-110 group-hover:rotate-12" style={{ backfaceVisibility: 'hidden' }}>
                        <AlertTriangle size={40} />
                      </div>
                      <p className="text-[10px] text-rose-800 uppercase font-bold tracking-widest mb-2 relative z-10">Nhiệm vụ đặc biệt</p>
                      <h3 className="text-3xl font-black italic text-rose-700 relative z-10">{profile?.special_tasks_total || 0}</h3>
                    </motion.div>
                  </div>

                  {/* Danh sách nhiệm vụ hệ thống */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
                        <CheckCircle2 size={16} /> Danh sách nhiệm vụ hệ thống
                      </h3>
                      <button 
                        onClick={() => setActiveTab('tasks')}
                        className="text-[9px] font-black uppercase text-accent tracking-widest hover:underline flex items-center gap-1"
                      >
                        <HelpCircle size={12} /> Hướng dẫn lấy mã
                      </button>
                    </div>
                    <div className="glass p-6 rounded-[2rem] border-emerald-200 bg-emerald-50 shadow-lg">
                      <div className="flex flex-wrap gap-2">
                        {/* HOT Tasks */}
                        {['LINK4M', 'TRAFFIC1M', 'TRAFFIC68'].map(task => (
                          <span key={task} className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] font-black uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                            🔥 {task}
                          </span>
                        ))}
                        {/* Normal Tasks */}
                        {['YEUMONEY', 'TRAFICTOT', 'LINKNGONME', 'LINKNGONIO', 'BBMKTS', 'LINKTOP', 'TAPLAYMA', 'XLINK', '4MMO', 'NHAPMA'].map(task => (
                          <span key={task} className="px-3 py-1.5 rounded-lg glass border-white/10 text-slate-900 text-[10px] font-bold uppercase">
                            {task}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Invite Friends Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass p-8 border-accent/30 bg-gradient-to-br from-accent/20 via-accent/10 to-transparent rounded-3xl shadow-[0_0_35px_rgba(0,255,255,0.15)] flex flex-col sm:flex-row justify-between items-center gap-6"
                  >
                    <div>
                      <h3 className="text-lg font-black uppercase mb-1">Mời bạn bè nhận ngay 1,000 Xu</h3>
                      <p className="text-xs text-slate-900">Nhận thưởng khi người được giới thiệu đạt số dư từ 1,500 Xu trở lên.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('settings')}
                      className="btn-primary px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] whitespace-nowrap"
                    >
                      Mời ngay
                    </button>
                  </motion.div>

                  {/* Suggested Mods Preview moved to right column */}
                </div>

                {/* Right Column: Suggested Mods */}
                <div className="space-y-6">
                  {/* Suggested Mods Preview */}
                  <div className="glass p-6 rounded-3xl border-indigo-500/30 bg-indigo-500/10 shadow-[0_0_25px_rgba(99,102,241,0.1)]">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Gợi ý Mod Game</h3>
                      <button onClick={() => setActiveTab('mods')} className="text-accent text-[8px] font-bold uppercase hover:underline">Tất cả</button>
                    </div>
                    <div className="space-y-3">
                      {suggestedMods.length > 0 ? (
                        suggestedMods.map(mod => (
                          <div key={mod.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setActiveTab('mods')}>
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                              <img 
                                src={mod.image_url || `https://picsum.photos/seed/${mod.id}/200/200`} 
                                alt={mod.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-black truncate">{mod.title}</h4>
                              <p className="text-[8px] text-accent font-bold">v{mod.version}</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0">
                              <Gamepad2 size={10} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-slate-900 italic text-[10px]">
                          Chưa có gợi ý.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'settings' && (
            <Settings 
              profile={profile} 
              onLogout={onLogout} 
              onBack={() => setActiveTab('home')} 
              onOpenAdmin={() => setActiveTab('admin')}
              showVerifyRedDot={showVerifyRedDot}
              onVerifySuccess={async () => {
                try {
                  const { error } = await supabase
                    .from('profiles')
                    .update({ is_verified: true })
                    .eq('id', user.id);
                  if (error) throw error;
                  setProfile(prev => prev ? { ...prev, is_verified: true } : null);
                } catch (err) {
                  console.error("Error updating verification status:", err);
                }
              }}
              currentEffect={currentEffect}
              onEffectChange={onEffectChange}
            />
          )}

          {activeTab === 'wallet' && (
            <Withdraw 
              balance={profile?.balance || 0} 
              userId={user.id}
              email={user.email || ''}
              isVerified={profile?.is_verified || false}
              onBack={() => setActiveTab('home')} 
              onUpdateBalance={(newBalance) => {
                setProfile(prev => prev ? { ...prev, balance: newBalance } : null);
              }}
              onVerifySuccess={async () => {
                try {
                  const { error } = await supabase
                    .from('profiles')
                    .update({ is_verified: true })
                    .eq('id', user.id);
                  if (error) throw error;
                  setProfile(prev => prev ? { ...prev, is_verified: true } : null);
                } catch (err) {
                  console.error("Error updating verification status:", err);
                }
              }}
            />
          )}

          {activeTab === 'tasks' && (
            <Tasks 
              balance={profile?.balance || 0}
              userId={user.id}
              profile={profile}
              onBack={() => {
                setActiveTab('home');
              }}
              onUpdateBalance={(newBalance) => {
                setProfile(prev => prev ? { ...prev, balance: newBalance } : null);
              }}
              onUpdateProfile={fetchProfile}
            />
          )}

          {activeTab === 'daily' && (
            <DailyRewards 
              userId={user.id}
              profile={profile}
              onUpdateProfile={fetchProfile}
            />
          )}

          {activeTab === 'ranking' && (
            <Leaderboard 
              userId={user.id}
              profile={profile}
            />
          )}

          {activeTab === 'mods' && (
            <ModGame isAdmin={profile?.is_admin || false} />
          )}

          {activeTab === 'admin' && (
            <AdminPanel onBack={() => setActiveTab('settings')} />
          )}
            </motion.div>
          </AnimatePresence>

          {/* Footer Copyright */}
          <footer className="mt-16 text-center pb-8 border-t border-slate-200 pt-8">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-medium">
              © 2026 Developed by <span className="text-slate-700 font-bold">HOANG MAI ANH VU</span>
            </p>
          </footer>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 h-20 flex justify-around items-center px-2 z-50 rounded-t-[30px] shadow-2xl bg-white">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-accent' : 'text-slate-700'}`}>
          <Home size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Trang Chủ</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('tasks')} className={`flex flex-col items-center gap-1 ${activeTab === 'tasks' ? 'text-accent' : 'text-slate-700'}`}>
          <CheckSquare size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Nhiệm Vụ</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('ranking')} className={`flex flex-col items-center gap-1 ${activeTab === 'ranking' ? 'text-accent' : 'text-slate-700'}`}>
          <Trophy size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Xếp Hạng</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('daily')} className={`flex flex-col items-center gap-1 ${activeTab === 'daily' ? 'text-accent' : 'text-slate-700'}`}>
          <Gift size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Thưởng Ngày</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('mods')} className={`flex flex-col items-center gap-1 ${activeTab === 'mods' ? 'text-accent' : 'text-slate-700'}`}>
          <Gamepad2 size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Mod Game</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1 ${activeTab === 'wallet' ? 'text-accent' : 'text-slate-700'}`}>
          <Wallet size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Rút Tiền</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 relative ${activeTab === 'settings' ? 'text-accent' : 'text-slate-700'}`}>
          <SettingsIcon size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Cài Đặt</span>
          {showVerifyRedDot && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444] animate-pulse"></span>
          )}
        </motion.button>
      </nav>

      {/* Verify Account Reminder Pop-up */}
      <AnimatePresence>
        {showVerifyReminder && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-80 z-[100]"
          >
            <div className="glass p-5 border-accent/30 bg-gradient-to-br from-accent/10 to-transparent rounded-2xl shadow-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="text-accent" size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-black uppercase tracking-widest text-accent mb-1">Xác minh tài khoản</h4>
                <p className="text-[10px] text-slate-600 leading-tight">Vui lòng xác minh email để bảo mật tài khoản và rút tiền!</p>
              </div>
              <button 
                onClick={() => setShowVerifyReminder(false)}
                className="text-gray-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotifications && (
          <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[100]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass w-full p-6 space-y-4 relative z-10 rounded-[32px]"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-black uppercase tracking-widest text-accent text-sm">Thông Báo</h3>
                  {notifications.length > 0 && (
                    <span className="bg-red-500 text-white text-[8px] px-2 py-0.5 rounded-full font-bold">
                      {notifications.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {notifications.length > 0 && (
                    <button 
                      onClick={() => setNotifications([])}
                      className="text-[9px] text-slate-500 hover:text-red-400 uppercase font-bold tracking-widest transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
              </div>


              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {notifications.length > 0 ? (
                  notifications.map((item, index) => (
                    <div key={item.id || index} className="bg-white/10 p-4 rounded-lg border border-slate-200 mb-3 flex flex-col relative">
                      <button 
                        onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                      <div className="text-slate-900 text-sm font-medium mb-2 whitespace-pre-wrap pr-4">
                        <p className="font-bold text-accent">{item.title}</p>
                        <p className="text-xs text-slate-700 mt-1">{item.body}</p>
                      </div>
                      <div className="text-slate-500 text-[10px] self-end">
                        {formatDate(item.created_at || item.time)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 italic text-xs">
                    Chưa có thông báo nào mới.
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowNotifications(false)}
                className="w-full py-3 bg-blue-100 text-black font-black rounded-xl text-[10px] uppercase tracking-widest"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Red Envelope Widget - Only on Home Tab */}
      {activeTab === 'home' && (
        <div className="relative z-[60]">
          <RedEnvelopeWidget userId={user.id} profile={profile} onUpdateProfile={fetchProfile} />
        </div>
      )}
    </div>
  );
}
