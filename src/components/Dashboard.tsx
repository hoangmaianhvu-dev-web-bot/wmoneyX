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
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';
import { EffectType, effectNames } from './EffectsManager';
import Settings from './Settings';
import Withdraw from './Withdraw';
import Tasks from './Tasks';
import DailyRewards from './DailyRewards';
import AdminPanel from './AdminPanel';
import Leaderboard from './Leaderboard';
import ModGame from './ModGame';
import MusicToggle from './MusicToggle';
import EffectsManager from './EffectsManager';

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

const getLevelInfo = (exp: number) => {
  const level = Math.floor(Math.sqrt(exp / 10)) + 1;
  const currentLevelExp = (level - 1) * (level - 1) * 10;
  const nextLevelExp = level * level * 10;
  const progress = ((exp - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;
  
  let vip = 1;
  if (level >= 5 && level < 15) vip = 2;
  else if (level >= 15 && level < 30) vip = 3;
  else if (level >= 30 && level < 50) vip = 4;
  else if (level >= 50 && level < 80) vip = 5;
  else if (level >= 80 && level < 120) vip = 6;
  else if (level >= 120) vip = 7;

  return { level, currentLevelExp, nextLevelExp, progress, vip };
};

export default function Dashboard({ user, onLogout, currentEffect, onEffectChange, isMusicPlaying, toggleMusic }: DashboardProps) {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [suggestedMods, setSuggestedMods] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showVerifyReminder, setShowVerifyReminder] = useState(false);
  const [showVerifyRedDot, setShowVerifyRedDot] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);

  const ADMIN_ID = "22072009";

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
    if (profile) {
      fetchLeaderboard();
    }
  }, [profile]);

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
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error("Supabase chưa được cấu hình. Vui lòng thiết lập VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.");
      }

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
            referred_by: user.user_metadata?.referral_code || null,
            referral_bonus_paid: false,
            referral_code: Math.floor(10000 + Math.random() * 90000).toString(),
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

  const fetchLeaderboard = async () => {
    try {
      // 1. Fetch top 10
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, balance, tasks_total, vip_status')
        .order('balance', { ascending: false });

      if (error) throw error;
      
      const formattedData = data?.map(item => ({
        id: item.id,
        username: item.username,
        balance: (item.balance || 0).toLocaleString(),
        tasks: item.tasks_total || 0,
        vip: item.vip_status === 'VIP GOLD'
      })) || [];

      setLeaderboard(formattedData);

      // 2. Calculate user rank
      if (profile) {
        const { count, error: rankError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('balance', profile.balance);
        
        if (!rankError) {
          setUserRank((count || 0) + 1);
        }
      }
    } catch (error: any) {
      console.error('Lỗi khi tải bảng xếp hạng:', error);
      // Don't show notification for leaderboard to avoid spamming
    }
  };

  const currentDate = new Date();
  const monthDisplay = `Tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <motion.button 
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all w-full relative ${activeTab === id ? 'bg-accent text-black font-black shadow-[0_0_15px_rgba(173,216,230,0.3)]' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
    >
      <Icon size={20} />
      <span className="text-xs uppercase tracking-widest">{label}</span>
      {id === 'settings' && showVerifyRedDot && (
        <span className="absolute right-4 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444] animate-pulse"></span>
      )}
    </motion.button>
  );

  const toggleEffect = () => {
    const effects: EffectType[] = ['particles', 'snow', 'stars', 'neon', 'fireworks'];
    const currentIndex = effects.indexOf(currentEffect);
    const nextIndex = (currentIndex + 1) % effects.length;
    const nextEffect = effects[nextIndex];
    onEffectChange(nextEffect);
    showNotification({
      title: "Đổi Hiệu Ứng",
      message: `Đã chuyển sang hiệu ứng: ${effectNames[nextEffect]}`,
      type: "success"
    });
  };

  const levelInfo = profile ? getLevelInfo(profile.exp || 0) : null;

  return (
    <div className="min-h-screen text-white font-sans selection:bg-accent selection:text-bg flex flex-col md:flex-row">
      <EffectsManager effect={currentEffect} />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-white/5 p-6 fixed h-full bg-black/50 backdrop-blur-xl z-50">
        <div className="mb-12 px-2">
          <h1 className="text-2xl font-black italic bg-clip-text text-transparent bg-gradient-to-r from-white via-accent to-white bg-[length:200%_auto] animate-shine">wmoneyX</h1>
          <p className="text-[8px] text-gray-500 uppercase tracking-[0.4em] mt-1">Hệ thống kiếm tiền VIP</p>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem id="home" icon={Home} label="Trang Chủ" />
          <NavItem id="tasks" icon={CheckSquare} label="Nhiệm Vụ" />
          <NavItem id="daily" icon={Gift} label="Thưởng Ngày" />
          <NavItem id="leaderboard" icon={Trophy} label="Đua Top" />
          <NavItem id="mods" icon={Gamepad2} label="Mod Game" />
          <NavItem id="wallet" icon={Wallet} label="Rút Tiền" />
          <NavItem id="settings" icon={SettingsIcon} label="Cài Đặt" />
        </nav>

        <div className="pt-6 border-t border-white/5 mt-auto">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut size={20} />
            <span className="text-xs uppercase tracking-widest font-bold">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 min-h-screen pb-24 md:pb-12 relative">
        {/* Social Icons */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
          <AnimatePresence>
            {isSocialOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="flex flex-col gap-3"
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
            >
              {activeTab === 'home' && (
            <>
              {/* Top Profile & Balance */}
              <header className="flex justify-between items-center py-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20 text-accent">
                    <UserRound size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black tracking-tight">{profile?.username}</h2>
                      <span className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase bg-gradient-to-r from-yellow-400 to-orange-500 text-black`}>
                        VIP {levelInfo?.vip || 1}
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium">{profile?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <MusicToggle isPlaying={isMusicPlaying} togglePlay={toggleMusic} />
                  <button 
                    onClick={() => setShowNotifications(true)}
                    className="w-9 h-9 glass flex items-center justify-center relative border-accent/20 rounded-xl"
                  >
                    <Bell size={16} className="text-accent" />
                    {notifications.length > 0 && (
                      <div className="absolute top-[-2px] right-[-2px] w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]"></div>
                    )}
                  </button>
                  
                  <div className="glass px-3 py-2 flex items-center gap-2 border-accent/20 rounded-xl">
                    <Coins size={12} className="text-accent" />
                    <span className="font-black text-xs tracking-tight text-accent">{profile?.balance === 0 ? '---' : profile?.balance.toLocaleString()}</span>
                  </div>
                </div>
              </header>

              {/* User Status Bar */}
              <div className="glass p-3 rounded-2xl mb-4 flex items-center justify-between border-accent/20">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] px-2 py-1 rounded font-black uppercase ${profile?.is_admin ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'}`}>
                    {profile?.is_admin ? 'Admin' : 'Member'}
                  </span>
                  {profile?.is_verified && (
                    <div className="flex items-center text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      <ShieldCheck size={10} className="mr-1" /> Đã xác minh
                    </div>
                  )}
                </div>
                {profile?.is_admin && (
                  <p className="text-[8px] text-accent font-bold tracking-[0.1em]">ID: {ADMIN_ID}</p>
                )}
              </div>

              {/* Level & VIP Progress Bar */}
              {levelInfo && (
                <div className="glass p-5 rounded-3xl mb-8 relative overflow-hidden border-accent/20">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Star size={16} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-black uppercase tracking-widest text-yellow-400">VIP {levelInfo.vip}</span>
                      </div>
                      <span className="text-xs font-bold text-white">Cấp {levelInfo.level}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Kinh nghiệm</span>
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
                    />
                    {/* Shine effect */}
                    <motion.div
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1 }}
                      className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 mt-2 text-center italic">
                    Cần thêm {levelInfo.nextLevelExp - (profile?.exp || 0)} EXP để lên cấp {levelInfo.level + 1}
                  </p>
                </div>
              )}

              {/* Dashboard Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stats & Invite */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass p-8 text-center rounded-3xl relative overflow-hidden group"
                    >
                      <motion.div 
                        animate={{ y: [-5, 5, -5] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className="absolute top-4 right-4 text-accent/20 group-hover:text-accent/40 transition-colors"
                      >
                        <Target size={40} />
                      </motion.div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2 relative z-10">Nhiệm vụ hôm nay</p>
                      <h3 className="text-xl font-black italic text-accent uppercase tracking-tighter relative z-10">Không giới hạn</h3>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="glass p-8 text-center rounded-3xl relative overflow-hidden group"
                    >
                      <motion.div 
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="absolute top-4 right-4 text-accent/20 group-hover:text-accent/40 transition-colors"
                      >
                        <Layers size={40} />
                      </motion.div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2 relative z-10">Tổng nhiệm vụ</p>
                      <h3 className="text-3xl font-black italic text-accent relative z-10">{profile?.tasks_total === 0 ? '---' : profile?.tasks_total}</h3>
                    </motion.div>
                  </div>

                  {/* Phân loại nhiệm vụ */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="glass p-6 rounded-3xl border-white/10"
                  >
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Thống kê loại nhiệm vụ</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                            <CheckSquare size={14} />
                          </div>
                          <span className="text-xs font-bold uppercase text-gray-300">Nhiệm vụ thường</span>
                        </div>
                        <span className="text-lg font-black text-accent">{profile?.tasks_total || 0}</span>
                      </div>
                      <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                            <AlertTriangle size={14} />
                          </div>
                          <span className="text-xs font-bold uppercase text-gray-300">Nhiệm vụ đặc biệt</span>
                        </div>
                        <span className="text-lg font-black text-red-500">{profile?.special_tasks_total || 0}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Invite Friends Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass p-8 border-accent/20 bg-gradient-to-r from-accent/5 to-transparent rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6"
                  >
                    <div>
                      <h3 className="text-lg font-black uppercase mb-1">Mời bạn bè nhận ngay 1,000 Xu</h3>
                      <p className="text-xs text-gray-400">Nhận thưởng khi người được giới thiệu đạt số dư từ 1,500 Xu trở lên.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('settings')}
                      className="btn-primary px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] whitespace-nowrap"
                    >
                      Mời ngay
                    </button>
                  </motion.div>

                  {/* Quick Access Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab('tasks')}
                      className="glass p-6 rounded-3xl border-accent/20 bg-gradient-to-br from-accent/10 to-transparent cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <motion.div 
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center"
                        >
                          <CheckSquare className="text-accent" size={24} />
                        </motion.div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest">Gợi ý nhiệm vụ</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">LINK4M duyệt nhanh</p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab('tasks')}
                      className="glass p-6 rounded-3xl border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <motion.div 
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                          className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center"
                        >
                          <AlertTriangle className="text-red-500" size={24} />
                        </motion.div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-red-500">Nhiệm vụ HOT</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">TRAFFIC1M thưởng cao</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Suggested Mods Preview */}
                  <div className="glass p-8 rounded-3xl">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Gợi ý Mod Game</h3>
                      <button onClick={() => setActiveTab('mods')} className="text-accent text-[10px] font-bold uppercase hover:underline">Xem tất cả</button>
                    </div>
                    <div className="space-y-4">
                      {suggestedMods.length > 0 ? (
                        suggestedMods.map(mod => (
                          <div key={mod.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setActiveTab('mods')}>
                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                              <img 
                                src={mod.image_url || `https://picsum.photos/seed/${mod.id}/200/200`} 
                                alt={mod.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-black truncate">{mod.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] text-accent font-bold">v{mod.version}</p>
                                {mod.source_name && (
                                  <span className="text-[10px] text-gray-500 font-bold">• {mod.source_name}</span>
                                )}
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0">
                              <Gamepad2 size={14} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 italic text-xs">
                          Hiện chưa có gợi ý nào.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Leaderboard */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end px-1">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Bảng Xếp Hạng</h2>
                    <span className="text-[9px] text-accent font-bold uppercase tracking-widest">{monthDisplay}</span>
                  </div>

                  <div className="glass overflow-hidden rounded-3xl border-accent/10 max-h-[400px] overflow-y-auto">
                    <div className="divide-y divide-white/5">
                      {leaderboard.length > 0 ? (
                        leaderboard.map((item, index) => (
                          <div key={item.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition">
                            <div className="flex items-center gap-4">
                              <span className={`text-lg font-black italic w-6 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                                #{index + 1}
                              </span>
                              <div>
                                <div className="flex items-center">
                                  <p className="text-xs font-bold">{item.username}</p>
                                  {item.vip && <span className="text-[6px] bg-yellow-400 text-black px-1 rounded ml-1 font-black">VIP</span>}
                                </div>
                                <p className="text-[9px] text-gray-500 font-bold uppercase">{item.tasks} Nhiệm vụ</p>
                              </div>
                            </div>
                            <p className="text-xs font-black text-accent">{item.balance}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500 italic text-xs">
                          Chưa có dữ liệu xếp hạng.
                        </div>
                      )}
                    </div>
                    
                    {/* User Rank Footer */}
                    <div className="p-4 bg-accent/10 flex items-center justify-between border-t border-accent/20">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-black italic text-accent w-6">#{userRank || '---'}</span>
                        <div>
                          <p className="text-xs font-bold">{profile?.username}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-bold">{profile?.tasks_total || 0} Nhiệm vụ</p>
                        </div>
                      </div>
                      <p className="text-xs font-black text-accent">{profile?.balance?.toLocaleString() || '0'} Xu</p>
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
              onBack={() => setActiveTab('home')}
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

          {activeTab === 'leaderboard' && (
            <Leaderboard 
              userId={user.id}
              profile={profile}
              onUpdateProfile={fetchProfile}
              limit={10}
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
          <footer className="mt-16 text-center pb-8 border-t border-white/5 pt-8">
            <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-medium">
              © 2026 Developed by <span className="text-white/60 font-bold">HOANG MAI ANH VU</span>
            </p>
          </footer>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/85 backdrop-blur-xl border-t border-accent/15 h-20 flex justify-around items-center px-2 z-50 rounded-t-[30px] shadow-2xl">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-accent' : 'text-gray-600'}`}>
          <Home size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Trang Chủ</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('tasks')} className={`flex flex-col items-center gap-1 ${activeTab === 'tasks' ? 'text-accent' : 'text-gray-600'}`}>
          <CheckSquare size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Nhiệm Vụ</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('daily')} className={`flex flex-col items-center gap-1 ${activeTab === 'daily' ? 'text-accent' : 'text-gray-600'}`}>
          <Gift size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Thưởng Ngày</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('mods')} className={`flex flex-col items-center gap-1 ${activeTab === 'mods' ? 'text-accent' : 'text-gray-600'}`}>
          <Gamepad2 size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Mod Game</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('leaderboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'leaderboard' ? 'text-accent' : 'text-gray-600'}`}>
          <Trophy size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Đua Top</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1 ${activeTab === 'wallet' ? 'text-accent' : 'text-gray-600'}`}>
          <Wallet size={16} />
          <span className="text-[7px] font-black uppercase tracking-tighter">Rút Tiền</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 relative ${activeTab === 'settings' ? 'text-accent' : 'text-gray-600'}`}>
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
                <p className="text-[10px] text-gray-300 leading-tight">Vui lòng xác minh email để bảo mật tài khoản và rút tiền!</p>
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
                      className="text-[9px] text-gray-500 hover:text-red-400 uppercase font-bold tracking-widest transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
              </div>


              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {notifications.length > 0 ? (
                  notifications.map((item, index) => (
                    <div key={item.id || index} className="bg-[#111] p-4 rounded-lg border border-gray-800 mb-3 flex flex-col relative">
                      <button 
                        onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 text-gray-500 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                      <div className="text-gray-200 text-sm font-medium mb-2 whitespace-pre-wrap pr-4">
                        <p className="font-bold text-accent">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.body}</p>
                      </div>
                      <div className="text-gray-500 text-[10px] self-end">
                        {formatDate(item.created_at || item.time)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 italic text-xs">
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
    </div>
  );
}
