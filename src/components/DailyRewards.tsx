import React, { useState, useEffect, useRef } from 'react';
import { Gift, Zap, Clock, CheckCircle2, Loader2, Package, Disc, History, Trophy, Coins, Star, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';

interface DailyRewardsProps {
  userId: string;
  profile: any;
  onUpdateProfile: () => void;
}

type GameTab = 'daily' | 'blindbag' | 'wheel';

const DailyRewards: React.FC<DailyRewardsProps> = ({ userId, profile, onUpdateProfile }) => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<GameTab>('daily');
  const [history, setHistory] = useState<any[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [boostInfo, setBoostInfo] = useState<{ start: string, end: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Blind Bag State
  const [openingBag, setOpeningBag] = useState(false);
  const [bagResult, setBagResult] = useState<any>(null);
  const [bagHint, setBagHint] = useState<string | null>(null);

  // Lucky Wheel State
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelResult, setWheelResult] = useState<any>(null);
  const [wheelHint, setWheelHint] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const BLIND_BAG_REWARDS = [
    { type: 'EXP', amount: 1, label: '1 EXP', weight: 30 },
    { type: 'EXP', amount: 5, label: '5 EXP', weight: 25 },
    { type: 'EXP', amount: 70, label: '70 EXP', weight: 1, jackpot: true },
    { type: 'EXP', amount: 100, label: '100 EXP', weight: 1, jackpot: true },
    { type: 'XU', amount: 500, label: '500 XU', weight: 1, jackpot: true },
    { type: 'XU', amount: 5, label: '5 XU', weight: 20 },
    { type: 'XU', amount: 1, label: '1 XU', weight: 15 },
    { type: 'XU', amount: 20, label: '20 XU', weight: 7 },
  ];

  const LUCKY_WHEEL_REWARDS = [
    { type: 'EXP', amount: 10, label: '10 EXP', weight: 30 },
    { type: 'EXP', amount: 50, label: '50 EXP', weight: 25 },
    { type: 'EXP', amount: 500, label: '500 EXP', weight: 1, jackpot: true },
    { type: 'XU', amount: 50, label: '50 XU', weight: 20 },
    { type: 'XU', amount: 10, label: '10 XU', weight: 15 },
    { type: 'XU', amount: 500, label: '500 XU', weight: 1, jackpot: true },
    { type: 'RED_ENVELOPE', amount: 0, label: 'Lì Xì', weight: 1, jackpot: true },
    { type: 'EXP', amount: 20, label: '20 EXP', weight: 7 },
  ];

  const getRandomReward = (rewards: any[]) => {
    const totalWeight = rewards.reduce((acc, r) => acc + r.weight, 0);
    let random = Math.random() * totalWeight;
    for (const reward of rewards) {
      if (random < reward.weight) return reward;
      random -= reward.weight;
    }
    return rewards[0];
  };

  const fetchGameData = async () => {
    // Fetch History (Global)
    const { data: hist } = await supabase
      .from('game_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setGameHistory(hist || []);

    // Fetch Leaderboard (Jackpots)
    const { data: lead } = await supabase
      .from('game_logs')
      .select('*')
      .eq('is_jackpot', true)
      .order('reward_amount', { ascending: false })
      .limit(10);
    setLeaderboard(lead || []);
  };

  useEffect(() => {
    fetchGameData();
    const interval = setInterval(fetchGameData, 30000);
    return () => clearInterval(interval);
  }, []);

  const playBlindBag = async (costType: 'FREE' | 'XU' | 'EXP') => {
    if (openingBag) return;
    
    const today = getLocalDateString();
    if (costType === 'FREE' && profile.last_blind_bag_free_date === today) {
      showNotification({ title: "Lỗi", message: "Bạn đã dùng lượt miễn phí hôm nay!", type: "error" });
      return;
    }

    if (costType === 'XU' && (profile.balance || 0) < 20) {
      showNotification({ title: "Lỗi", message: "Không đủ XU!", type: "error" });
      return;
    }

    if (costType === 'EXP' && (profile.exp || 0) < 70) {
      showNotification({ title: "Lỗi", message: "Không đủ EXP!", type: "error" });
      return;
    }

    setOpeningBag(true);
    setBagResult(null);
    
    // Tease/Hint
    const hintReward = getRandomReward(BLIND_BAG_REWARDS);
    setBagHint(`Cảm giác như có ${hintReward.label} bên trong...`);

    setTimeout(async () => {
      try {
        const reward = getRandomReward(BLIND_BAG_REWARDS);
        
        // Update Profile
        const updates: any = {
          balance: (profile.balance || 0),
          exp: (profile.exp || 0)
        };

        if (costType === 'XU') updates.balance -= 20;
        if (costType === 'EXP') updates.exp -= 70;
        if (costType === 'FREE') updates.last_blind_bag_free_date = today;

        if (reward.type === 'EXP') updates.exp += reward.amount;
        if (reward.type === 'XU') updates.balance += reward.amount;

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (updateError) throw updateError;

        // Log Game
        await supabase.from('game_logs').insert([{
          user_id: userId,
          username: profile.username,
          game_type: 'BLIND_BAG',
          reward_type: reward.type,
          reward_amount: reward.amount,
          is_jackpot: reward.jackpot || false
        }]);

        setBagResult(reward);
        showNotification({ 
          title: reward.jackpot ? "ĐỘC ĐẮC!" : "Thành công", 
          message: `Bạn nhận được ${reward.label}!`, 
          type: reward.jackpot ? "success" : "info" 
        });
        onUpdateProfile();
        fetchGameData();
      } catch (err) {
        console.error(err);
        showNotification({ title: "Lỗi", message: "Có lỗi xảy ra!", type: "error" });
      } finally {
        setOpeningBag(false);
        setBagHint(null);
      }
    }, 2000);
  };

  const playLuckyWheel = async (costType: 'FREE' | 'XU' | 'EXP') => {
    if (spinning) return;

    const today = getLocalDateString();
    if (costType === 'FREE' && profile.last_lucky_wheel_free_date === today) {
      showNotification({ title: "Lỗi", message: "Bạn đã dùng lượt miễn phí hôm nay!", type: "error" });
      return;
    }

    if (costType === 'XU' && (profile.balance || 0) < 50) {
      showNotification({ title: "Lỗi", message: "Không đủ XU!", type: "error" });
      return;
    }

    if (costType === 'EXP' && (profile.exp || 0) < 100) {
      showNotification({ title: "Lỗi", message: "Không đủ EXP!", type: "error" });
      return;
    }

    setSpinning(true);
    setWheelResult(null);
    
    // Tease/Hint
    const hintReward = getRandomReward(LUCKY_WHEEL_REWARDS);
    setWheelHint(`Kim đang chỉ vào ${hintReward.label}...`);

    const reward = getRandomReward(LUCKY_WHEEL_REWARDS);
    const rewardIndex = LUCKY_WHEEL_REWARDS.indexOf(reward);
    const segmentAngle = 360 / LUCKY_WHEEL_REWARDS.length;
    const extraRotations = 5 + Math.floor(Math.random() * 5);
    const targetRotation = wheelRotation + (extraRotations * 360) + (360 - (rewardIndex * segmentAngle));
    
    setWheelRotation(targetRotation);

    setTimeout(async () => {
      try {
        let finalRewardAmount = reward.amount;
        let finalRewardType = reward.type;

        if (reward.type === 'RED_ENVELOPE') {
          // 1/10 for 43210, else 2222
          const isBigLixi = Math.random() < 0.1;
          finalRewardAmount = isBigLixi ? 43210 : 2222;
          finalRewardType = 'XU';
        }

        // Update Profile
        const updates: any = {
          balance: (profile.balance || 0),
          exp: (profile.exp || 0)
        };

        if (costType === 'XU') updates.balance -= 50;
        if (costType === 'EXP') updates.exp -= 100;
        if (costType === 'FREE') updates.last_lucky_wheel_free_date = today;

        if (finalRewardType === 'EXP') updates.exp += finalRewardAmount;
        if (finalRewardType === 'XU') updates.balance += finalRewardAmount;

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (updateError) throw updateError;

        // Log Game
        await supabase.from('game_logs').insert([{
          user_id: userId,
          username: profile.username,
          game_type: 'LUCKY_WHEEL',
          reward_type: finalRewardType,
          reward_amount: finalRewardAmount,
          is_jackpot: reward.jackpot || false
        }]);

        setWheelResult({ ...reward, finalAmount: finalRewardAmount });
        showNotification({ 
          title: reward.jackpot ? "ĐỘC ĐẮC!" : "Thành công", 
          message: `Bạn nhận được ${reward.type === 'RED_ENVELOPE' ? 'Lì Xì ' : ''}${finalRewardAmount} ${finalRewardType}!`, 
          type: reward.jackpot ? "success" : "info" 
        });
        onUpdateProfile();
        fetchGameData();
      } catch (err) {
        console.error(err);
        showNotification({ title: "Lỗi", message: "Có lỗi xảy ra!", type: "error" });
      } finally {
        setSpinning(false);
        setWheelHint(null);
      }
    }, 4000);
  };

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} / ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      
      // Fetch history
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'BOOST_EXCHANGE')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!transError) {
        setHistory(transData || []);
        
        // If boost is active in profile, find the latest transaction to get start time
        if (profile?.active_boost_type && profile?.active_boost_end) {
          const now = new Date();
          const end = new Date(profile.active_boost_end);
          if (end > now) {
            const latestBoost = transData?.find(t => t.type === 'BOOST_EXCHANGE');
            if (latestBoost) {
              setBoostInfo({
                start: latestBoost.created_at,
                end: profile.active_boost_end
              });
            }
          } else {
            setBoostInfo(null);
          }
        }
      }
    };
    fetchData();
  }, [userId, profile?.active_boost_end]);

  const claimDailyReward = async () => {
    setLoading(true);
    try {
      const today = getLocalDateString();
      if (profile.last_daily_reward_date === today) {
        showNotification({ title: "Thông báo", message: "Bạn đã nhận thưởng hôm nay rồi!", type: "info" });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          exp: (profile.exp || 0) + 10,
          last_daily_reward_date: today
        })
        .eq('id', userId);

      if (error) throw error;

      // Record transaction
      await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: 'DAILY_REWARD',
          amount: 10,
          description: 'Nhận thưởng 10 EXP hàng ngày',
          status: 'COMPLETED'
        }]);

      showNotification({ title: "Thành công", message: "Đã nhận 10 EXP!", type: "success" });
      onUpdateProfile();
    } catch (error) {
      console.error('Error claiming reward:', error);
      showNotification({ title: "Lỗi", message: "Không thể nhận thưởng.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const exchangeBoost = async (cost: number, type: 'x2' | 'x5', durationHours: number) => {
    if ((profile.exp || 0) < cost) {
      showNotification({ title: "Lỗi", message: "Không đủ EXP!", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
      
      // 1. Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          exp: (profile.exp || 0) - cost,
          active_boost_type: type,
          active_boost_end: endTime
        })
        .eq('id', userId);
      if (updateError) throw updateError;

      // 2. Record transaction
      await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: 'BOOST_EXCHANGE',
          amount: cost,
          description: `Đổi Boost ${type} (${durationHours}h) bằng EXP`,
          status: 'COMPLETED'
        }]);

      showNotification({ title: "Thành công", message: `Đã kích hoạt boost ${type}!`, type: "success" });
      onUpdateProfile();
      
      // Refresh history
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'BOOST_EXCHANGE')
        .order('created_at', { ascending: false })
        .limit(5);
      setHistory(data || []);

    } catch (error) {
      console.error('Error exchanging boost:', error);
      showNotification({ title: "Lỗi", message: "Không thể đổi quà.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6 pb-24">
      {/* Tab Switcher */}
      <div className="flex gap-2 bg-black/40 p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('daily')}
          className={`flex-1 min-w-[100px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'daily' ? 'bg-accent text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
        >
          <Gift size={14} /> Điểm Danh
        </button>
        <button 
          onClick={() => setActiveTab('blindbag')}
          className={`flex-1 min-w-[100px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'blindbag' ? 'bg-accent text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
        >
          <Package size={14} /> Túi Mù
        </button>
        <button 
          onClick={() => setActiveTab('wheel')}
          className={`flex-1 min-w-[100px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'wheel' ? 'bg-accent text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
        >
          <Disc size={14} /> Vòng Quay
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'daily' && (
          <motion.div 
            key="daily"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-widest ocean-glow">Thưởng Hàng Ngày</h2>
              <div className="glass px-4 py-2 rounded-xl border-l-2 border-accent">
                <span className="text-[8px] text-gray-500 font-bold uppercase block">EXP hiện có</span>
                <span className="text-sm font-black text-accent">{(profile?.exp || 0).toLocaleString()} EXP</span>
              </div>
            </div>
            
            {/* Boost Info */}
            <div className="glass p-6 rounded-[2rem] space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-accent" size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Trạng thái Tăng tốc: {profile?.active_boost_type || "Không"}</span>
              </div>
              
              {boostInfo ? (
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white/5 p-3 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Thời gian đổi</p>
                    <p className="text-xs font-mono text-white">{formatDateTime(boostInfo.start)}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border-l-2 border-accent">
                    <p className="text-[10px] text-accent uppercase font-bold mb-1">Thời gian hết hạn</p>
                    <p className="text-xs font-mono text-white">{formatDateTime(boostInfo.end)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-gray-500 uppercase italic">Bạn chưa kích hoạt gói tăng tốc nào.</p>
              )}
            </div>

            <div className="glass p-8 rounded-[2rem] text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Clock className="text-accent/20" size={64} />
              </div>
              
              <div className="relative z-10">
                <Gift size={64} className="mx-auto text-accent mb-4" />
                <h3 className="text-xl font-black uppercase tracking-widest">Thưởng Điểm Danh</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Nhận 10 EXP mỗi ngày</p>
                
                <div className="mt-8 space-y-4">
                  {profile.last_daily_reward_date === getLocalDateString() ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2 text-green-500">
                        <CheckCircle2 size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Đã nhận hôm nay</span>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Reset sau</p>
                        <p className="text-2xl font-black font-mono text-accent">{timeLeft}</p>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={claimDailyReward}
                      disabled={loading}
                      className="w-full py-5 bg-accent text-black rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,255,255,0.3)] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin mx-auto" /> : "Nhận ngay 10 EXP"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Đổi quà bằng EXP</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="glass p-6 rounded-[2rem] flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Zap className="text-accent" />
                    <div>
                      <p className="font-bold">x2 số tiền thưởng làm nhiệm vụ (24h)</p>
                      <p className="text-xs text-gray-500">1000 EXP</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => exchangeBoost(1000, 'x2', 24)}
                    disabled={loading}
                    className="px-6 py-2 bg-white/10 rounded-xl font-bold text-xs"
                  >
                    Đổi
                  </button>
                </div>
                <div className="glass p-6 rounded-[2rem] flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Zap className="text-accent" />
                    <div>
                      <p className="font-bold">x5 số tiền thưởng làm nhiệm vụ (6h)</p>
                      <p className="text-xs text-gray-500">5000 EXP</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => exchangeBoost(5000, 'x5', 6)}
                    disabled={loading}
                    className="px-6 py-2 bg-white/10 rounded-xl font-bold text-xs"
                  >
                    Đổi
                  </button>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Lịch sử đổi thưởng</h3>
              <div className="glass p-6 rounded-[2rem] space-y-2">
                {history.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center">Chưa có lịch sử đổi thưởng.</p>
                ) : (
                  history.map((h) => (
                    <div key={h.id} className="flex justify-between text-xs border-b border-white/5 pb-2">
                      <span>{h.description}</span>
                      <span className="text-gray-500">{new Date(h.created_at).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'blindbag' && (
          <motion.div 
            key="blindbag"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-[0.2em] ocean-glow">Bóc Túi Mù</h2>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Mỗi ngày 1 lượt miễn phí - Thử vận may ngay!</p>
            </div>

            <div className="glass p-12 rounded-[3rem] text-center relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {openingBag ? (
                  <motion.div 
                    key="opening"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    className="space-y-8"
                  >
                    <motion.div
                      animate={{ 
                        rotate: [0, -10, 10, -10, 10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                      <Package size={120} className="text-accent mx-auto drop-shadow-[0_0_30px_rgba(0,255,255,0.5)]" />
                    </motion.div>
                    <div className="space-y-2">
                      <p className="text-sm font-black uppercase tracking-widest animate-pulse">Đang bóc túi...</p>
                      {bagHint && <p className="text-[10px] text-accent/60 italic font-bold">{bagHint}</p>}
                    </div>
                  </motion.div>
                ) : bagResult ? (
                  <motion.div 
                    key="result"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${bagResult.jackpot ? 'bg-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.5)]' : 'bg-accent/20'}`}>
                      {bagResult.type === 'EXP' ? <Star size={48} className="text-white" /> : <Coins size={48} className="text-white" />}
                    </div>
                    <div className="space-y-1">
                      <h4 className={`text-3xl font-black uppercase ${bagResult.jackpot ? 'text-yellow-500' : 'text-white'}`}>
                        {bagResult.jackpot ? 'ĐỘC ĐẮC!' : 'CHÚC MỪNG'}
                      </h4>
                      <p className="text-xl font-black text-accent">+{bagResult.label}</p>
                    </div>
                    <button 
                      onClick={() => setBagResult(null)}
                      className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Tiếp tục
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="idle"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-8"
                  >
                    <Package size={120} className="text-gray-700 mx-auto" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button 
                        onClick={() => playBlindBag('FREE')}
                        disabled={profile.last_blind_bag_free_date === getLocalDateString()}
                        className="glass p-4 rounded-2xl border-accent/30 hover:bg-accent/10 transition-all disabled:opacity-30 group"
                      >
                        <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Miễn phí</p>
                        <p className="text-xs font-black text-accent group-hover:scale-110 transition-transform">BÓC NGAY</p>
                      </button>
                      <button 
                        onClick={() => playBlindBag('XU')}
                        className="glass p-4 rounded-2xl border-yellow-500/30 hover:bg-yellow-500/10 transition-all group"
                      >
                        <p className="text-[8px] text-gray-500 uppercase font-black mb-1">20 XU / Lượt</p>
                        <p className="text-xs font-black text-yellow-500 group-hover:scale-110 transition-transform">DÙNG XU</p>
                      </button>
                      <button 
                        onClick={() => playBlindBag('EXP')}
                        className="glass p-4 rounded-2xl border-purple-500/30 hover:bg-purple-500/10 transition-all group"
                      >
                        <p className="text-[8px] text-gray-500 uppercase font-black mb-1">70 EXP / Lượt</p>
                        <p className="text-xs font-black text-purple-500 group-hover:scale-110 transition-transform">DÙNG EXP</p>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Game Stats & Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Trophy className="text-yellow-500" size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Vinh Danh Độc Đắc</h3>
                </div>
                <div className="space-y-3">
                  {leaderboard.filter(l => l.game_type === 'BLIND_BAG').length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic">Chưa có ai trúng độc đắc.</p>
                  ) : (
                    leaderboard.filter(l => l.game_type === 'BLIND_BAG').map((l, i) => (
                      <div key={l.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border-l-2 border-yellow-500">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-yellow-500">#{i+1}</span>
                          <span className="text-xs font-bold">{l.username}</span>
                        </div>
                        <span className="text-xs font-black text-accent">+{l.reward_amount} {l.reward_type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <History className="text-accent" size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Lịch Sử Gần Đây</h3>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {gameHistory.filter(l => l.game_type === 'BLIND_BAG').length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic">Chưa có lịch sử.</p>
                  ) : (
                    gameHistory.filter(l => l.game_type === 'BLIND_BAG').map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-[10px] border-b border-white/5 pb-2">
                        <span className="text-gray-300">{l.username}</span>
                        <div className="flex items-center gap-2">
                          <span className={l.is_jackpot ? 'text-yellow-500 font-bold' : 'text-gray-500'}>
                            {l.reward_amount} {l.reward_type}
                          </span>
                          <span className="text-[8px] text-gray-600">{new Date(l.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'wheel' && (
          <motion.div 
            key="wheel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-[0.2em] ocean-glow">Vòng Quay May Mắn</h2>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Quay là trúng - Cơ hội nhận Lì Xì 43,210 XU!</p>
            </div>

            <div className="glass p-8 md:p-12 rounded-[3rem] text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent pointer-events-none" />
              
              {/* Wheel Container */}
              <div className="relative w-64 h-64 md:w-80 md:h-80 mb-8">
                {/* Pointer */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <div className="w-8 h-8 bg-red-500 rounded-full shadow-lg flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-red-500 absolute top-6" />
                  </div>
                </div>

                {/* The Wheel */}
                <motion.div 
                  className="w-full h-full rounded-full border-8 border-white/10 relative overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.2)]"
                  animate={{ rotate: wheelRotation }}
                  transition={{ duration: 4, ease: [0.45, 0.05, 0.55, 0.95] }}
                >
                  {LUCKY_WHEEL_REWARDS.map((reward, i) => {
                    const angle = 360 / LUCKY_WHEEL_REWARDS.length;
                    return (
                      <div 
                        key={i}
                        className="absolute top-0 left-1/2 w-1/2 h-full origin-left"
                        style={{ 
                          transform: `rotate(${i * angle}deg)`,
                          backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,255,255,0.05)'
                        }}
                      >
                        <div 
                          className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 rotate-90 text-[8px] font-black uppercase tracking-tighter whitespace-nowrap"
                          style={{ transform: `rotate(90deg) translateY(-40px)` }}
                        >
                          {reward.label}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>

                {/* Center Button */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-12 h-12 bg-black border-4 border-accent rounded-full flex items-center justify-center shadow-2xl">
                    <Disc className={`text-accent ${spinning ? 'animate-spin' : ''}`} size={24} />
                  </div>
                </div>
              </div>

              {wheelHint && (
                <p className="text-[10px] text-accent/60 italic font-bold mb-6 animate-pulse">{wheelHint}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg">
                <button 
                  onClick={() => playLuckyWheel('FREE')}
                  disabled={spinning || profile.last_lucky_wheel_free_date === getLocalDateString()}
                  className="glass p-4 rounded-2xl border-accent/30 hover:bg-accent/10 transition-all disabled:opacity-30 group"
                >
                  <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Miễn phí</p>
                  <p className="text-xs font-black text-accent group-hover:scale-110 transition-transform">QUAY NGAY</p>
                </button>
                <button 
                  onClick={() => playLuckyWheel('XU')}
                  disabled={spinning}
                  className="glass p-4 rounded-2xl border-yellow-500/30 hover:bg-yellow-500/10 transition-all group"
                >
                  <p className="text-[8px] text-gray-500 uppercase font-black mb-1">50 XU / Lượt</p>
                  <p className="text-xs font-black text-yellow-500 group-hover:scale-110 transition-transform">DÙNG XU</p>
                </button>
                <button 
                  onClick={() => playLuckyWheel('EXP')}
                  disabled={spinning}
                  className="glass p-4 rounded-2xl border-purple-500/30 hover:bg-purple-500/10 transition-all group"
                >
                  <p className="text-[8px] text-gray-500 uppercase font-black mb-1">100 EXP / Lượt</p>
                  <p className="text-xs font-black text-purple-500 group-hover:scale-110 transition-transform">DÙNG EXP</p>
                </button>
              </div>
            </div>

            {/* Game Stats & Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Trophy className="text-yellow-500" size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Vinh Danh Độc Đắc</h3>
                </div>
                <div className="space-y-3">
                  {leaderboard.filter(l => l.game_type === 'LUCKY_WHEEL').length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic">Chưa có ai trúng độc đắc.</p>
                  ) : (
                    leaderboard.filter(l => l.game_type === 'LUCKY_WHEEL').map((l, i) => (
                      <div key={l.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border-l-2 border-yellow-500">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-yellow-500">#{i+1}</span>
                          <span className="text-xs font-bold">{l.username}</span>
                        </div>
                        <span className="text-xs font-black text-accent">+{l.reward_amount} {l.reward_type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <History className="text-accent" size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Lịch Sử Gần Đây</h3>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {gameHistory.filter(l => l.game_type === 'LUCKY_WHEEL').length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic">Chưa có lịch sử.</p>
                  ) : (
                    gameHistory.filter(l => l.game_type === 'LUCKY_WHEEL').map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-[10px] border-b border-white/5 pb-2">
                        <span className="text-gray-300">{l.username}</span>
                        <div className="flex items-center gap-2">
                          <span className={l.is_jackpot ? 'text-yellow-500 font-bold' : 'text-gray-500'}>
                            {l.reward_amount} {l.reward_type}
                          </span>
                          <span className="text-[8px] text-gray-600">{new Date(l.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyRewards;
