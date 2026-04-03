import React, { useState, useEffect, useRef } from 'react';
import { 
  Gift, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  Package, 
  Disc, 
  History, 
  Trophy, 
  Coins, 
  Star, 
  ChevronRight, 
  ChevronLeft, 
  Lock, 
  FileText, 
  Flame, 
  Calendar,
  ShoppingCart,
  ShoppingBag,
  Gem,
  Backpack,
  ArrowRightLeft,
  User,
  Shield,
  Wallet,
  Sparkles,
  PackageOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';
import { getLevelInfo } from '../utils/levelUtils';

interface DailyRewardsProps {
  userId: string;
  profile: any;
  onUpdateProfile: () => void;
  onNavigate?: (tab: any) => void;
}

type GameTab = 'daily' | 'checkin' | 'wheel';

const DailyRewards: React.FC<DailyRewardsProps> = ({ userId, profile, onUpdateProfile, onNavigate }) => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<GameTab>('checkin');
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
  const [buySpinsAmount, setBuySpinsAmount] = useState(1);
  const [showBuySpinsModal, setShowBuySpinsModal] = useState(false);
  const [showJewelryShop, setShowJewelryShop] = useState(false);
  const [showBackpack, setShowBackpack] = useState(false);
  const [exchangeQuantity, setExchangeQuantity] = useState(1);
  const [showChestResult, setShowChestResult] = useState(false);
  const [showExchangeChoice, setShowExchangeChoice] = useState(false);
  const [lastExchangedQuantity, setLastExchangedQuantity] = useState(0);
  const [chestResult, setChestResult] = useState<{ amount: number, type: string } | null>(null);
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

  const [todayTaskCount, setTodayTaskCount] = useState(0);

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

    // Fetch today's task count
    const today = getLocalDateString();
    const { count, error } = await supabase
      .from('task_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed_at', today);
      
    if (!error && count !== null) {
      setTodayTaskCount(count);
    }
  };

  useEffect(() => {
    fetchGameData();
    const interval = setInterval(fetchGameData, 30000);
    return () => clearInterval(interval);
  }, []);

  const openChallengeEnvelope = async () => {
    if (todayTaskCount < 100) {
      showNotification({ title: "Chưa đủ điều kiện", message: "Bạn cần hoàn thành 100 nhiệm vụ hôm nay.", type: "error" });
      return;
    }

    const today = getLocalDateString();
    if (profile.last_challenge_reward_date === today) {
      showNotification({ title: "Đã nhận", message: "Bạn đã nhận thưởng thử thách hôm nay rồi.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      // Random reward between 500 and 5000
      const rewardAmount = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          balance: profile.balance + rewardAmount,
          last_challenge_reward_date: today
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Record transaction
      await supabase.from('transactions').insert([{
        user_id: userId,
        amount: rewardAmount,
        type: 'CHALLENGE_REWARD',
        description: `Thưởng thử thách hàng ngày: ${rewardAmount} Xu`
      }]);

      showNotification({ title: "Chúc mừng", message: `Bạn nhận được ${rewardAmount} Xu từ thử thách!`, type: "success" });
      onUpdateProfile();
    } catch (error) {
      console.error("Error claiming challenge reward:", error);
      showNotification({ title: "Lỗi", message: "Không thể nhận thưởng thử thách.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

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

  const buyWheelSpins = async () => {
    if (loading || buySpinsAmount < 1) return;
    const totalCost = buySpinsAmount * 360;
    if ((profile.balance || 0) < totalCost) {
      showNotification({ title: "Lỗi", message: "Không đủ XU để mua lượt quay!", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          balance: (profile.balance || 0) - totalCost,
          wheel_spins: (profile.wheel_spins || 0) + buySpinsAmount
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('transactions').insert([{
        user_id: userId,
        type: 'WHEEL_SPIN_PURCHASE',
        amount: totalCost,
        description: `Mua ${buySpinsAmount} lượt quay vòng quay`,
        status: 'COMPLETED'
      }]);

      showNotification({ title: "Thành công", message: `Đã mua ${buySpinsAmount} lượt quay!`, type: "success" });
      setShowBuySpinsModal(false);
      onUpdateProfile();
    } catch (err) {
      console.error(err);
      showNotification({ title: "Lỗi", message: "Không thể mua lượt quay.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const playLuckyWheel = async () => {
    if (spinning) return;

    if ((profile.wheel_spins || 0) < 1) {
      showNotification({ title: "Lỗi", message: "Bạn không còn lượt quay! Hãy mua thêm lượt.", type: "error" });
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
          const isBigLixi = Math.random() < 0.1;
          finalRewardAmount = isBigLixi ? 43210 : 2222;
          finalRewardType = 'XU';
        }

        // Update Profile
        const updates: any = {
          balance: (profile.balance || 0),
          exp: (profile.exp || 0),
          wheel_spins: (profile.wheel_spins || 0) - 1
        };

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
        .in('type', ['BOOST_EXCHANGE', 'EXP_EXCHANGE', 'LIXI_EXCHANGE'])
        .order('created_at', { ascending: false })
        .limit(10);
      
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

  const claimCheckin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const today = getLocalDateString();
      if (profile.last_checkin_date === today) {
        showNotification({ title: "Thông báo", message: "Bạn đã điểm danh hôm nay rồi!", type: "info" });
        return;
      }

      // Calculate new streak
      let newStreak = (profile.checkin_streak || 0) + 1;
      const lastDate = profile.last_checkin_date;
      if (lastDate) {
        const last = new Date(lastDate);
        const now = new Date(today);
        const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 1) {
          newStreak = 1; // Reset streak if missed a day
        }
      } else {
        newStreak = 1;
      }
      
      // If streak > 7, reset to 1
      if (newStreak > 7) newStreak = 1;

      // New Rewards: Day 1 = 5, Day 2 = 10, ... Day 7 = 35
      const rewardAmount = newStreak * 5;

      const { error } = await supabase
        .from('profiles')
        .update({
          exp: (profile.exp || 0) + rewardAmount,
          stars: (profile.stars || 0) + rewardAmount,
          last_checkin_date: today,
          checkin_streak: newStreak
        })
        .eq('id', userId);

      if (error) throw error;

      // Record transaction
      await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: 'CHECKIN_REWARD',
          amount: rewardAmount,
          description: `Điểm danh ngày ${newStreak} (Nhận ${rewardAmount} EXP & ${rewardAmount} Sao)`,
          status: 'COMPLETED'
        }]);

      showNotification({ 
        title: "Thành công", 
        message: `Bạn nhận được ${rewardAmount} EXP và ${rewardAmount} Sao cho ngày ${newStreak}!`, 
        type: "success" 
      });
      onUpdateProfile();
    } catch (error) {
      console.error('Error checkin:', error);
      showNotification({ title: "Lỗi", message: "Không thể điểm danh.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

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

  const exchangeBoost = async (cost: number, type: 'x2', durationHours: number) => {
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
        .in('type', ['BOOST_EXCHANGE', 'EXP_EXCHANGE', 'LIXI_EXCHANGE'])
        .order('created_at', { ascending: false })
        .limit(10);
      setHistory(data || []);

    } catch (error) {
      console.error('Error exchanging boost:', error);
      showNotification({ title: "Lỗi", message: "Không thể đổi quà.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const exchangeExpForXu = async () => {
    const cost = 100000;
    const reward = 10000;
    if ((profile.exp || 0) < cost) {
      showNotification({ title: "Lỗi", message: "Không đủ 100,000 EXP!", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          exp: (profile.exp || 0) - cost,
          balance: (profile.balance || 0) + reward
        })
        .eq('id', userId);
      if (updateError) throw updateError;

      await supabase.from('transactions').insert([{
        user_id: userId,
        type: 'EXP_EXCHANGE',
        amount: reward,
        description: `Đổi 100,000 EXP lấy 10,000 Xu`,
        status: 'COMPLETED'
      }]);

      showNotification({ title: "Thành công", message: "Đã đổi 10,000 Xu!", type: "success" });
      onUpdateProfile();
      
      // Refresh history
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .in('type', ['BOOST_EXCHANGE', 'EXP_EXCHANGE', 'LIXI_EXCHANGE'])
        .order('created_at', { ascending: false })
        .limit(10);
      setHistory(data || []);
    } catch (error) {
      console.error('Error exchanging EXP for Xu:', error);
      showNotification({ title: "Lỗi", message: "Không thể đổi quà.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const exchangeExpForLixi = async () => {
    const cost = 10000;
    if ((profile.exp || 0) < cost) {
      showNotification({ title: "Lỗi", message: "Không đủ 10,000 EXP!", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const isJackpot = Math.random() < 0.01;
      const randomReward = isJackpot 
        ? Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000 
        : Math.floor(Math.random() * (1999 - 200 + 1)) + 200;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          exp: (profile.exp || 0) - cost,
          balance: (profile.balance || 0) + randomReward
        })
        .eq('id', userId);
      if (updateError) throw updateError;

      await supabase.from('transactions').insert([{
        user_id: userId,
        type: 'LIXI_EXCHANGE',
        amount: randomReward,
        description: `Dùng 10,000 EXP nhận Lì xì ${randomReward} Xu`,
        status: 'COMPLETED'
      }]);

      showNotification({ title: "Chúc mừng", message: `Bạn nhận được Lì xì ${randomReward} Xu!`, type: "success" });
      onUpdateProfile();

      // Refresh history
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .in('type', ['BOOST_EXCHANGE', 'EXP_EXCHANGE', 'LIXI_EXCHANGE'])
        .order('created_at', { ascending: false })
        .limit(10);
      setHistory(data || []);
    } catch (error) {
      console.error('Error exchanging EXP for Lixi:', error);
      showNotification({ title: "Lỗi", message: "Không thể nhận Lì xì.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const exchangeStarsForChests = async () => {
    const costPerChest = 100; // 100 stars per chest
    const totalCost = exchangeQuantity * costPerChest;

    if ((profile.stars || 0) < totalCost) {
      showNotification({ title: "Lỗi", message: `Không đủ ${totalCost} Sao!`, type: "error" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          stars: (profile.stars || 0) - totalCost,
          chests_count: (profile.chests_count || 0) + exchangeQuantity
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('transactions').insert([{
        user_id: userId,
        type: 'CHEST_EXCHANGE',
        amount: exchangeQuantity,
        description: `Đổi ${totalCost} Sao lấy ${exchangeQuantity} Rương Random`,
        status: 'COMPLETED'
      }]);

      showNotification({ 
        title: "Thành công", 
        message: `Đã đổi ${exchangeQuantity} Rương! Rương đã được chuyển vào Tủ Đồ.`, 
        type: "success" 
      });
      onUpdateProfile();
      setShowJewelryShop(false);
      setLastExchangedQuantity(exchangeQuantity);
      setShowExchangeChoice(true);
    } catch (error) {
      console.error('Error exchanging stars:', error);
      showNotification({ title: "Lỗi", message: "Không thể đổi rương.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const openMultipleChests = async (count: number) => {
    if ((profile.chests_count || 0) < count) return;

    setLoading(true);
    try {
      let totalReward = 0;
      for (let i = 0; i < count; i++) {
        const rand = Math.random() * 100;
        if (rand < 0.1) {
          totalReward += 20000;
        } else if (rand < 0.3) {
          totalReward += Math.floor(Math.random() * (19999 - 10000 + 1)) + 10000;
        } else if (rand < 36.3) {
          totalReward += Math.floor(Math.random() * (9999 - 5555 + 1)) + 5555;
        } else {
          totalReward += Math.floor(Math.random() * (5549 - 5 + 1)) + 5;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          balance: (profile.balance || 0) + totalReward,
          chests_count: (profile.chests_count || 0) - count
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('transactions').insert([{
        user_id: userId,
        type: 'CHEST_OPEN_MULTI',
        amount: totalReward,
        description: `Mở ${count} Rương Random nhận ${totalReward} Xu`,
        status: 'COMPLETED'
      }]);

      setChestResult({ amount: totalReward, type: 'XU' });
      setShowChestResult(true);
      setShowExchangeChoice(false);
      onUpdateProfile();
    } catch (error) {
      console.error('Error opening chests:', error);
      showNotification({ title: "Lỗi", message: "Không thể mở rương.", type: "error" });
    } finally {
      setLoading(false);
    }
  };
  const openChest = async () => {
    if ((profile.chests_count || 0) < 1) {
      showNotification({ title: "Lỗi", message: "Bạn không có rương nào!", type: "error" });
      return;
    }

    setLoading(true);
    try {
      // Probabilities:
      // Large (20,000): 0.1%
      // Medium (10,000 - 19,999): 0.2%
      // Regular (5,555 - 9,999): 36%
      // Small (5 - 5,549): 63.7%
      
      const rand = Math.random() * 100;
      let reward = 0;

      if (rand < 0.1) {
        reward = 20000;
      } else if (rand < 0.3) { // 0.1 + 0.2
        reward = Math.floor(Math.random() * (19999 - 10000 + 1)) + 10000;
      } else if (rand < 36.3) { // 0.3 + 36
        reward = Math.floor(Math.random() * (9999 - 5555 + 1)) + 5555;
      } else {
        reward = Math.floor(Math.random() * (5549 - 5 + 1)) + 5;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          balance: (profile.balance || 0) + reward,
          chests_count: (profile.chests_count || 0) - 1
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('transactions').insert([{
        user_id: userId,
        type: 'CHEST_OPEN',
        amount: reward,
        description: `Mở Rương Random nhận ${reward} Xu`,
        status: 'COMPLETED'
      }]);

      setChestResult({ amount: reward, type: 'XU' });
      setShowChestResult(true);
      onUpdateProfile();
    } catch (error) {
      console.error('Error opening chest:', error);
      showNotification({ title: "Lỗi", message: "Không thể mở rương.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6 pb-24">
      {/* Header Section from User HTML */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-panel p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-50" />
          
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-accent/30 p-1 bg-black/20">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.3)]">
                <User size={40} className="text-black" />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded-lg shadow-lg">
              LV.{getLevelInfo(profile.exp || 0).level}
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-2 relative">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">
                {profile.username} <span className="text-accent/50 text-sm">#{userId.slice(0, 4)}</span>
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <Shield size={12} className="text-yellow-500" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Hạng: {getLevelInfo(profile.exp || 0).title}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              <div className="flex flex-col items-center justify-center gap-1 bg-black/30 px-2 py-3 rounded-2xl border border-white/5 w-full">
                <Star size={16} className="text-yellow-400" />
                <div className="text-center">
                  <p className="text-[8px] text-slate-500 font-black uppercase leading-none mb-1">EXP</p>
                  <p className="text-[10px] font-black text-white leading-none">{(profile.exp || 0).toLocaleString('vi-VN')}</p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 bg-black/30 px-2 py-3 rounded-2xl border border-white/5 w-full">
                <Sparkles size={16} className="text-yellow-500" />
                <div className="text-center">
                  <p className="text-[8px] text-slate-500 font-black uppercase leading-none mb-1">SAO</p>
                  <p className="text-[10px] font-black text-white leading-none">{(profile.stars || 0).toLocaleString('vi-VN')}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBackpack(true)}
                className="flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-3 rounded-2xl border border-white/10 w-full transition-all text-center relative group/tudo"
              >
                <div className="relative">
                  <Backpack size={16} className="text-accent group-hover/tudo:rotate-12 transition-transform" />
                  {profile.chests_count > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce">
                      {profile.chests_count}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[8px] text-white font-black uppercase leading-none mb-1">TỦ ĐỒ</p>
                  <p className="text-[6px] text-slate-500 font-bold uppercase tracking-tighter">NHẬN RƯƠNG</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-[2.5rem] border-white/10 flex flex-col justify-between bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">Số dư khả dụng</p>
            <h3 className="text-3xl font-black text-white tracking-tighter">
              {(profile.balance || 0).toLocaleString('vi-VN')} <span className="text-sm text-slate-500">XU</span>
            </h3>
          </div>
          <button 
            onClick={() => onNavigate?.('wallet')}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <ArrowRightLeft size={16} />
            RÚT TOÀN BỘ XU
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('checkin')}
          className={`flex-1 min-w-[120px] py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${activeTab === 'checkin' ? 'bg-accent text-black shadow-[0_0_20px_rgba(0,255,255,0.3)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
        >
          <Calendar size={14} /> Điểm Danh
        </button>
        <button 
          onClick={() => setActiveTab('daily')}
          className={`flex-1 min-w-[120px] py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${activeTab === 'daily' ? 'bg-accent text-black shadow-[0_0_20px_rgba(0,255,255,0.3)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
        >
          <Zap size={14} /> Thử Thách
        </button>
        <button 
          onClick={() => setActiveTab('wheel')}
          className={`flex-1 min-w-[120px] py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${activeTab === 'wheel' ? 'bg-accent text-black shadow-[0_0_20px_rgba(0,255,255,0.3)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
        >
          <Disc size={14} /> Vòng Quay
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'checkin' && (
          <motion.div 
            key="checkin"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="glass-panel p-8 rounded-[3rem] border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] -mr-32 -mt-32" />
              
              <div className="flex justify-between items-end mb-8 relative">
                <div>
                  <h3 className="text-2xl font-black text-white italic flex items-center gap-3 tracking-tight">
                    <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                      <Gift size={24} />
                    </div>
                    DAILY ADVENTURE
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Bỏ lỡ sẽ bị khóa hành trình</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Hành trình: 7 Ngày</p>
                  <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent shadow-[0_0_10px_rgba(0,255,255,0.5)] transition-all duration-1000"
                      style={{ width: `${((profile.checkin_streak || 0) / 7) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 relative">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const hasCheckedInToday = profile.last_checkin_date === getLocalDateString();
                  let status: 'done' | 'active' | 'locked' = 'locked';
                  
                  if (day <= (profile.checkin_streak || 0)) {
                    status = 'done';
                  } else if (day === (profile.checkin_streak || 0) + 1 && !hasCheckedInToday) {
                    status = 'active';
                  } else {
                    status = 'locked';
                  }

                  const reward = day * 5;

                  return (
                    <motion.div
                      key={day}
                      whileHover={status === 'active' ? { scale: 1.05, y: -5 } : {}}
                      whileTap={status === 'active' ? { scale: 0.95 } : {}}
                      onClick={() => status === 'active' && claimCheckin()}
                      className={`
                        relative p-4 rounded-[2rem] flex flex-col items-center justify-between h-40 border-2 transition-all duration-300
                        ${status === 'done' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 
                          status === 'active' ? 'bg-gradient-to-b from-accent/20 to-blue-600/20 border-accent shadow-[0_0_30px_rgba(0,255,255,0.15)] text-white cursor-pointer' : 
                          'bg-white/5 border-white/5 text-slate-600 opacity-40'}
                      `}
                    >
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">Ngày</p>
                        <p className="text-2xl font-black italic leading-none">{day}</p>
                      </div>

                      <div className="relative">
                        {status === 'done' ? (
                          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={24} className="text-black" />
                          </div>
                        ) : status === 'active' ? (
                          <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 animate-bounce">
                            <Star size={28} className="text-black" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                            <Lock size={24} className="text-slate-700" />
                          </div>
                        )}
                      </div>

                      <div className="text-center space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-tighter">+{reward} EXP</p>
                        <p className="text-[10px] font-black uppercase tracking-tighter text-yellow-500">+{reward} SAO</p>
                      </div>

                      {status === 'active' && (
                        <div className="absolute inset-0 rounded-[2rem] border-2 border-accent animate-pulse pointer-events-none" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  onClick={() => setShowJewelryShop(true)}
                  className="glass-panel p-6 rounded-3xl border-white/5 bg-white/5 group hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-500">
                      <Gem size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Tiệm Kim Hoàn</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Đổi vật phẩm quý hiếm</p>
                    </div>
                    <ChevronRight className="ml-auto text-slate-700 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'daily' && (
          <motion.div 
            key="daily"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Flame className="text-orange-500" size={24} />
              <h2 className="text-xl font-black uppercase tracking-widest text-slate-800">Thử Thách Hàng Ngày</h2>
            </div>

            {/* Challenge Card */}
            <div className="bg-[#2a3441] rounded-[2rem] p-8 text-center relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/30">
                  <span className="text-yellow-300 font-bold text-xl">福</span>
                </div>
                
                <h3 className="text-2xl font-black text-white mb-2">Hoàn thành 100 nhiệm vụ</h3>
                <p className="text-sm text-slate-300 mb-8">Mở phong bao lì xì may mắn — Nhận ngẫu nhiên <span className="text-yellow-400 font-bold">500 - 5,000 VNĐ</span></p>
                
                <div className="w-full max-w-md mx-auto mb-8">
                  <div className="flex justify-between text-xs font-bold text-white mb-2">
                    <span>{todayTaskCount} / 100 nhiệm vụ</span>
                    <span>{Math.min(100, Math.floor((todayTaskCount / 100) * 100))}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/30 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (todayTaskCount / 100) * 100)}%` }}
                    />
                  </div>
                </div>

                {profile.last_challenge_reward_date === getLocalDateString() ? (
                  <button disabled className="px-8 py-3 bg-white/10 text-white/50 rounded-xl font-bold flex items-center gap-2">
                    <CheckCircle2 size={18} /> Đã nhận hôm nay
                  </button>
                ) : todayTaskCount >= 100 ? (
                  <button 
                    onClick={openChallengeEnvelope}
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Gift size={18} />}
                    Mở Phong Bao
                  </button>
                ) : (
                  <button disabled className="px-8 py-3 bg-white/10 text-white/50 rounded-xl font-bold flex items-center gap-2">
                    <Lock size={18} /> Còn {100 - todayTaskCount} nhiệm vụ nữa
                  </button>
                )}
              </div>
            </div>

            {/* Rules Card */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <FileText size={16} />
                </div>
                <h3 className="text-lg font-black text-slate-800">Luật chơi</h3>
              </div>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <span>Hoàn thành 100 nhiệm vụ trong 1 ngày (00:00 - 23:59)</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <span>Chỉ tính nhiệm vụ đã được Admin duyệt</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <span>Phong bao lì xì ngẫu nhiên: 500 - 5,000 VNĐ</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <span>Mỗi ngày chỉ mở 1 lần, reset lúc 00:00</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <span>Không chấp nhận buff/cheat — Phát hiện sẽ khóa tài khoản</span>
                </li>
              </ul>
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
              <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Mỗi ngày 1 lượt miễn phí - Thử vận may ngay!</p>
            </div>

            <div className="glass p-12 rounded-[3rem] text-center relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center border-accent/30 bg-accent/10 shadow-[0_0_40px_rgba(0,255,255,0.15)]">
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
                        <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Miễn phí</p>
                        <p className="text-xs font-black text-accent group-hover:scale-110 transition-transform">BÓC NGAY</p>
                      </button>
                      <button 
                        onClick={() => playBlindBag('XU')}
                        className="glass p-4 rounded-2xl border-yellow-500/30 hover:bg-yellow-500/10 transition-all group"
                      >
                        <p className="text-[8px] text-slate-500 uppercase font-black mb-1">20 XU / Lượt</p>
                        <p className="text-xs font-black text-yellow-500 group-hover:scale-110 transition-transform">DÙNG XU</p>
                      </button>
                      <button 
                        onClick={() => playBlindBag('EXP')}
                        className="glass p-4 rounded-2xl border-purple-500/30 hover:bg-purple-500/10 transition-all group"
                      >
                        <p className="text-[8px] text-slate-500 uppercase font-black mb-1">70 EXP / Lượt</p>
                        <p className="text-xs font-black text-purple-500 group-hover:scale-110 transition-transform">DÙNG EXP</p>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Game Stats & Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass p-6 rounded-[2rem] space-y-4 border-yellow-500/20 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.05)]">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Trophy className="text-yellow-500" size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Vinh Danh Độc Đắc</h3>
                </div>
                <div className="space-y-3">
                  {leaderboard.filter(l => l.game_type === 'BLIND_BAG').length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">Chưa có ai trúng độc đắc.</p>
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

              <div className="glass p-6 rounded-[2rem] space-y-4 border-accent/20 bg-accent/5 shadow-[0_0_20px_rgba(0,255,255,0.05)]">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <History className="text-accent" size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Lịch Sử Gần Đây</h3>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {gameHistory.filter(l => l.game_type === 'BLIND_BAG').length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">Chưa có lịch sử.</p>
                  ) : (
                    gameHistory.filter(l => l.game_type === 'BLIND_BAG').map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-[10px] border-b border-white/5 pb-2">
                        <span className="text-slate-700 font-medium">{l.username}</span>
                        <div className="flex items-center gap-2">
                          <span className={l.is_jackpot ? 'text-yellow-500 font-bold' : 'text-slate-600'}>
                            {l.reward_amount} {l.reward_type}
                          </span>
                          <span className="text-[8px] text-slate-500">{new Date(l.created_at).toLocaleTimeString()}</span>
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
              <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Quay là trúng - Cơ hội nhận Lì Xì 43,210 XU!</p>
            </div>

            <div className="glass p-8 md:p-12 rounded-[3rem] text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[500px] border-accent/30 bg-accent/10 shadow-[0_0_40px_rgba(0,255,255,0.15)]">
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

              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 glass p-3 rounded-xl border-accent/20 text-center">
                    <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Lượt quay hiện có</p>
                    <p className="text-xl font-black text-accent">{profile.wheel_spins || 0}</p>
                  </div>
                  <button 
                    onClick={() => setShowBuySpinsModal(true)}
                    className="flex-1 glass p-3 rounded-xl border-yellow-500/30 hover:bg-yellow-500/10 transition-all group flex flex-col items-center justify-center"
                  >
                    <p className="text-[8px] text-slate-500 uppercase font-black mb-1">360 XU / Lượt</p>
                    <div className="flex items-center gap-1">
                      <ShoppingCart size={12} className="text-yellow-500" />
                      <p className="text-xs font-black text-yellow-500 group-hover:scale-110 transition-transform">MUA LƯỢT</p>
                    </div>
                  </button>
                </div>

                <button 
                  onClick={playLuckyWheel}
                  disabled={spinning || (profile.wheel_spins || 0) < 1}
                  className="w-full py-4 bg-gradient-to-r from-accent to-blue-600 text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {spinning ? 'Đang quay...' : 'QUAY NGAY'}
                </button>
              </div>
            </div>

            {/* Buy Spins Modal */}
            <AnimatePresence>
              {showBuySpinsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowBuySpinsModal(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md glass p-8 rounded-[2.5rem] border-accent/30 shadow-[0_0_50px_rgba(0,255,255,0.2)] space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-black uppercase tracking-widest text-white">Mua Lượt Quay</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Giá: 360 Xu / 1 Lượt</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase ml-2">Số lượng lượt quay</label>
                        <input 
                          type="number" 
                          min="1"
                          value={buySpinsAmount}
                          onChange={(e) => setBuySpinsAmount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-accent/50 transition-all"
                        />
                      </div>

                      <div className="glass p-4 rounded-2xl border-white/5 bg-white/5 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">Tổng thanh toán:</span>
                        <span className="text-lg font-black text-yellow-500">{buySpinsAmount * 360} XU</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowBuySpinsModal(false)}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={buyWheelSpins}
                        disabled={loading || (profile.balance || 0) < buySpinsAmount * 360}
                        className="flex-1 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {loading ? 'Đang xử lý...' : 'Xác nhận mua'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Game Stats & Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass p-6 rounded-[2rem] space-y-4 border-yellow-500/20 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.05)]">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Trophy className="text-yellow-500" size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Vinh Danh Độc Đắc</h3>
                </div>
                <div className="space-y-3">
                  {leaderboard.filter(l => l.game_type === 'LUCKY_WHEEL').length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">Chưa có ai trúng độc đắc.</p>
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

              <div className="glass p-6 rounded-[2rem] space-y-4 border-accent/20 bg-accent/5 shadow-[0_0_20px_rgba(0,255,255,0.05)]">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <History className="text-accent" size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Lịch Sử Gần Đây</h3>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {gameHistory.filter(l => l.game_type === 'LUCKY_WHEEL').length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">Chưa có lịch sử.</p>
                  ) : (
                    gameHistory.filter(l => l.game_type === 'LUCKY_WHEEL').map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-[10px] border-b border-white/5 pb-2">
                        <span className="text-slate-700 font-medium">{l.username}</span>
                        <div className="flex items-center gap-2">
                          <span className={l.is_jackpot ? 'text-yellow-500 font-bold' : 'text-slate-600'}>
                            {l.reward_amount} {l.reward_type}
                          </span>
                          <span className="text-[8px] text-slate-500">{new Date(l.created_at).toLocaleTimeString()}</span>
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

      {/* Jewelry Shop Modal */}
      <AnimatePresence>
        {showJewelryShop && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJewelryShop(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg glass p-8 rounded-[2.5rem] border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.2)] space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-500 mx-auto mb-4">
                  <Gem size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">Tiệm Kim Hoàn</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sử dụng SAO để đổi lấy Rương Random</p>
              </div>

              <div className="space-y-6">
                <div className="glass p-6 rounded-3xl border-white/10 bg-white/5 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                      <Gift size={28} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white uppercase tracking-tight">Rương Random</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Nhận ngẫu nhiên: 5 Xu - 20,000 Xu</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Số lượng đổi</span>
                      <span className="text-lg font-black text-accent">{exchangeQuantity} Rương</span>
                    </div>
                    <input 
                      type="range"
                      min="1"
                      max="99"
                      value={exchangeQuantity}
                      onChange={(e) => setExchangeQuantity(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                    <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase px-1">
                      <span>1</span>
                      <span>99</span>
                    </div>
                  </div>

                  <div className="glass p-4 rounded-2xl border-white/5 bg-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">Tổng chi phí:</span>
                    <span className="text-lg font-black text-yellow-500">{exchangeQuantity * 100} SAO</span>
                  </div>

                  <button 
                    onClick={exchangeStarsForChests}
                    disabled={loading || (profile.stars || 0) < exchangeQuantity * 100}
                    className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Đang xử lý...' : 'Xác nhận đổi'}
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Chi tiết phần thưởng rương</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Rương Lớn (20k)</p>
                      <p className="text-xs font-black text-yellow-500">0.1%</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Rương Trung (10k-20k)</p>
                      <p className="text-xs font-black text-orange-500">0.2%</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Rương Vừa (5.5k-10k)</p>
                      <p className="text-xs font-black text-blue-500">36%</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Rương Nhỏ (5-5.5k)</p>
                      <p className="text-xs font-black text-slate-400">63.7%</p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowJewelryShop(false)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Backpack Modal */}
      <AnimatePresence>
        {showBackpack && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBackpack(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg glass p-8 rounded-[2.5rem] border-accent/30 shadow-[0_0_50px_rgba(0,255,255,0.2)] space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4">
                  <Backpack size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">Tủ Đồ Của Bạn</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Danh sách rương vật phẩm đang sở hữu</p>
              </div>

              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {profile.chests_count > 0 ? (
                  Array.from({ length: profile.chests_count }).map((_, i) => (
                    <div key={i} className="glass p-4 rounded-2xl border-white/5 bg-white/5 flex justify-between items-center group hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-500">
                          <Gift size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white uppercase">Rương Random #{i + 1}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Thử nhân phẩm: 5 - 20,000 Xu</p>
                        </div>
                      </div>
                      <button 
                        onClick={openChest}
                        disabled={loading}
                        className="px-6 py-3 bg-accent text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/20"
                      >
                        Mở Rương
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-700">
                      <PackageOpen size={32} />
                    </div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Tủ đồ trống rỗng</p>
                    <button 
                      onClick={() => { setShowBackpack(false); setShowJewelryShop(true); }}
                      className="text-accent text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                      Đến Tiệm Kim Hoàn để đổi rương
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowBackpack(false)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chest Result Modal */}
      <AnimatePresence>
        {showChestResult && chestResult && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
              className="relative w-full max-w-sm glass p-10 rounded-[3rem] border-yellow-500/50 shadow-[0_0_100px_rgba(234,179,8,0.3)] text-center space-y-8"
            >
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full blur-3xl"
                />
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center text-black mx-auto relative z-10 shadow-2xl">
                  <Coins size={48} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black text-yellow-500 uppercase tracking-[0.3em]">Chúc mừng bạn nhận được</p>
                <h3 className="text-5xl font-black text-white tracking-tighter">
                  {(chestResult?.amount || 0).toLocaleString('vi-VN')} <span className="text-xl text-yellow-500">XU</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">Phần thưởng đã được cộng vào số dư</p>
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={() => setShowChestResult(false)}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Tuyệt vời!
                </button>
                {profile.chests_count > 0 && (
                  <button 
                    onClick={() => { setShowChestResult(false); openChest(); }}
                    className="w-full py-4 bg-accent text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all"
                  >
                    Mở rương tiếp theo ({profile.chests_count})
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Exchange Choice Modal */}
      <AnimatePresence>
        {showExchangeChoice && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass p-10 rounded-[3rem] border-accent/30 shadow-[0_0_50px_rgba(0,255,255,0.2)] text-center space-y-8"
            >
              <div className="w-20 h-20 bg-accent/20 rounded-3xl flex items-center justify-center text-accent mx-auto shadow-lg shadow-accent/10">
                <PackageOpen size={40} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Đã Đổi Thành Công!</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Bạn có {lastExchangedQuantity} Rương Random mới</p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => openMultipleChests(lastExchangedQuantity)}
                  className="w-full py-5 bg-accent text-black rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Star size={16} /> Mở Ngay ({lastExchangedQuantity})
                </button>
                <button 
                  onClick={() => setShowExchangeChoice(false)}
                  className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Backpack size={16} /> Tích Lũy Vào Tủ Đồ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyRewards;
