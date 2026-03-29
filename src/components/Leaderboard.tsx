import React, { useState, useEffect } from 'react';
import { Trophy, Star, Zap, Coins, Loader2, RotateCw, Gift, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';

interface LeaderboardProps {
  userId: string;
  profile: any;
  onUpdateProfile: () => void;
  limit?: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ userId, profile, onUpdateProfile, limit = 30 }) => {
  const { showNotification } = useNotification();
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [vipLeaderboard, setVipLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showWheel, setShowWheel] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<'monthly' | 'vip'>('monthly');

  const REWARDS = [
    { label: "Chúc may mắn", value: 0, type: 'NONE', color: '#333' },
    { label: "100 EXP", value: 100, type: 'EXP', color: '#f59e0b' },
    { label: "50 EXP", value: 50, type: 'EXP', color: '#fbbf24' },
    { label: "5000 Xu", value: 5000, type: 'XU', color: '#10b981' },
    { label: "2000 Xu", value: 2000, type: 'XU', color: '#34d399' },
  ];

  useEffect(() => {
    fetchLeaderboard();
    fetchVipLeaderboard();

    const hasSeenNotice = localStorage.getItem('leaderboard_notice_seen');
    if (!hasSeenNotice) {
      setShowNotice(true);
    }

    // Real-time subscription for profile changes
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('Leaderboard data changed, refetching...');
          fetchLeaderboard();
          fetchVipLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVipLeaderboard = async () => {
    const { data: vipData } = await supabase
      .from('profiles')
      .select('id, username, exp, vip_status')
      .order('exp', { ascending: false })
      .limit(10);
    setVipLeaderboard(vipData || []);
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

      // 1. Ensure current user is reset if needed
      // We fetch the latest profile directly to be sure
      const { data: myProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('last_reset_month, monthly_tasks, monthly_earnings')
        .eq('id', userId)
        .single();

      if (!myProfileError && myProfile && myProfile.last_reset_month !== currentMonth) {
        console.log("Resetting monthly tasks for current user...");
        await supabase
          .from('profiles')
          .update({ 
            monthly_tasks: 0,
            monthly_earnings: 0,
            last_reset_month: currentMonth
          })
          .eq('id', userId);
        
        onUpdateProfile(); // Refresh parent state
      }

      // 2. Fetch top 30 based on monthly_earnings
      // Condition: balance >= 10000
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, monthly_tasks, monthly_earnings, exp, balance, last_reset_month')
        .eq('last_reset_month', currentMonth)
        .gte('balance', 10000)
        .order('monthly_earnings', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Leaderboard fetch error:', error);
        if (error.message?.includes('column "last_reset_month" does not exist') || 
            error.message?.includes('column "monthly_tasks" does not exist') ||
            error.message?.includes('column "monthly_earnings" does not exist')) {
          showNotification({
            title: "Cần Cập Nhật DB",
            message: "Vui lòng chạy mã SQL trong hướng dẫn để tạo các cột Đua Top.",
            type: "error"
          });
        }
        throw error;
      }
      
      setTopUsers(data || []);

      // Tìm rank của user hiện tại trong danh sách đã reset
      const rank = (data || []).findIndex(u => u.id === userId);
      if (rank !== -1) {
        setUserRank(rank + 1);
      } else {
        setUserRank(null);
      }
    } catch (error) {
      console.error('Error in fetchLeaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWheel = () => {
    if (!userRank) {
      showNotification({
        title: "Thông báo",
        message: "Bạn cần có tên trong bảng xếp hạng để tham gia!",
        type: "info"
      });
      return;
    }

    if (userRank >= 4 && userRank <= 30) {
      setShowWheel(true);
    } else if (userRank >= 1 && userRank <= 3) {
      showNotification({
        title: "Thông báo",
        message: "Top 1, 2, 3 đã có phần thưởng cố định, không tham gia vòng quay!",
        type: "info"
      });
    } else {
      showNotification({
        title: "Thông báo",
        message: "Chỉ Top 4 - 30 mới được tham gia vòng quay may mắn!",
        type: "info"
      });
    }
  };

  const handleSpin = async () => {
    if (isSpinning) return;

    // Kiểm tra xem đã quay trong tháng này chưa
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    if (profile.last_spin_month === currentMonth) {
      showNotification({
        title: "Thông báo",
        message: "Bạn đã quay thưởng tháng này rồi!",
        type: "info"
      });
      return;
    }

    setIsSpinning(true);
    
    // Random phần thưởng
    const randomIndex = Math.floor(Math.random() * REWARDS.length);
    const reward = REWARDS[randomIndex];
    
    // Tính toán góc quay (360 * 5 vòng + góc của phần thưởng)
    // Mỗi phần thưởng chiếm 360 / 5 = 72 độ
    const extraDegrees = (randomIndex * 72) + 36; // +36 để vào giữa ô
    const newRotation = rotation + (360 * 5) + (360 - extraDegrees);
    setRotation(newRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      
      try {
        // Cập nhật profile
        const updates: any = {
          last_spin_month: currentMonth
        };

        if (reward.type === 'EXP') {
          updates.exp = (profile.exp || 0) + reward.value;
        } else if (reward.type === 'XU') {
          updates.balance = (profile.balance || 0) + reward.value;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (error) throw error;

        // Ghi log giao dịch nếu có thưởng
        if (reward.value > 0) {
          await supabase.from('transactions').insert([{
            user_id: userId,
            type: 'SPIN_REWARD',
            amount: reward.value,
            description: `Nhận thưởng từ vòng quay: ${reward.label}`,
            status: 'COMPLETED'
          }]);
        }

        showNotification({
          title: reward.value > 0 ? "Chúc mừng!" : "Tiếc quá",
          message: reward.value > 0 ? `Bạn nhận được ${reward.label}` : "Chúc bạn may mắn lần sau!",
          type: reward.value > 0 ? "success" : "info"
        });

        onUpdateProfile();
      } catch (error) {
        console.error('Error updating spin reward:', error);
        showNotification({
          title: "Lỗi",
          message: "Không thể cập nhật phần thưởng.",
          type: "error"
        });
      }
    }, 4000);
  };

  const handleDismissNotice = () => {
    setShowNotice(false);
    localStorage.setItem('leaderboard_notice_seen', 'true');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] ocean-glow">Đua Top Tháng {new Date().getMonth() + 1}</h2>
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Bảng xếp hạng sẽ reset vào ngày 1 hàng tháng</p>
      </div>

      {/* Rewards Info */}
      <div className="glass p-6 rounded-[2rem] border-accent/20">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 text-center">Phần thưởng Top 1, 2, 3</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <Trophy className="mx-auto text-yellow-500 mb-2" size={20} />
            <p className="text-[8px] font-black uppercase text-yellow-500">Top 1</p>
            <p className="text-[10px] font-bold text-white">50.000 Xu</p>
          </div>
          <div className="text-center">
            <Trophy className="mx-auto text-slate-400 mb-2" size={20} />
            <p className="text-[8px] font-black uppercase text-slate-400">Top 2</p>
            <p className="text-[10px] font-bold text-white">40.000 Xu</p>
          </div>
          <div className="text-center">
            <Trophy className="mx-auto text-orange-600 mb-2" size={20} />
            <p className="text-[8px] font-black uppercase text-orange-600">Top 3</p>
            <p className="text-[10px] font-bold text-white">30.000 Xu</p>
          </div>
        </div>
        <p className="text-[9px] text-gray-500 text-center mt-4 uppercase font-bold tracking-widest italic">
          * Phần thưởng Top 1, 2, 3 sẽ được hệ thống tự động gửi vào tài khoản khi sang tháng mới.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 relative">
        <div className="glass p-4 rounded-3xl text-center border-yellow-500/30 bg-yellow-500/5 relative overflow-hidden">
          <Trophy className="mx-auto text-yellow-500 mb-2" size={24} />
          <p className="text-[8px] font-black uppercase text-yellow-500">Top 1</p>
          <div className="mt-1">
            <p className="text-[9px] font-black uppercase truncate text-white/80">
              {topUsers[0]?.username || "Đang chờ..."}
            </p>
            <div className="flex flex-col items-center">
              <p className="text-xs font-black text-accent">{topUsers[0] ? `${topUsers[0].monthly_earnings.toLocaleString()} Xu` : ""}</p>
              <p className="text-[7px] text-gray-500 font-bold uppercase">
                {topUsers[0] ? `Tổng: ${topUsers[0].balance.toLocaleString()} Xu` : ""}
              </p>
            </div>
          </div>
          {topUsers[0] && (
            <div className="absolute -bottom-1 -right-1 opacity-10">
              <Trophy size={40} />
            </div>
          )}
        </div>
        <div className="glass p-4 rounded-3xl text-center border-slate-400/30 bg-slate-400/5 relative overflow-hidden">
          <Trophy className="mx-auto text-slate-400 mb-2" size={24} />
          <p className="text-[8px] font-black uppercase text-slate-400">Top 2</p>
          <div className="mt-1">
            <p className="text-[9px] font-black uppercase truncate text-white/80">
              {topUsers[1]?.username || "Đang chờ..."}
            </p>
            <div className="flex flex-col items-center">
              <p className="text-xs font-black text-accent">{topUsers[1] ? `${topUsers[1].monthly_earnings.toLocaleString()} Xu` : ""}</p>
              <p className="text-[7px] text-gray-500 font-bold uppercase">
                {topUsers[1] ? `Tổng: ${topUsers[1].balance.toLocaleString()} Xu` : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="glass p-4 rounded-3xl text-center border-orange-600/30 bg-orange-600/5 relative overflow-hidden">
          <Trophy className="mx-auto text-orange-600 mb-2" size={24} />
          <p className="text-[8px] font-black uppercase text-orange-600">Top 3</p>
          <div className="mt-1">
            <p className="text-[9px] font-black uppercase truncate text-white/80">
              {topUsers[2]?.username || "Đang chờ..."}
            </p>
            <div className="flex flex-col items-center">
              <p className="text-xs font-black text-accent">{topUsers[2] ? `${topUsers[2].monthly_earnings.toLocaleString()} Xu` : ""}</p>
              <p className="text-[7px] text-gray-500 font-bold uppercase">
                {topUsers[2] ? `Tổng: ${topUsers[2].balance.toLocaleString()} Xu` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Floating Spin Icon */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleOpenWheel}
          className="absolute -right-2 -top-12 w-12 h-12 bg-accent rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(0,255,255,0.3)] z-10 border-4 border-black"
        >
          <RotateCw size={24} className={isSpinning ? "animate-spin" : ""} />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-black">
            <span className="text-[8px] font-black text-white">!</span>
          </div>
        </motion.button>
      </div>

      {/* Spin Wheel Modal */}
      <AnimatePresence>
        {showWheel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSpinning && setShowWheel(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 100 }}
              className="glass p-8 rounded-[3rem] border-accent/20 relative overflow-hidden w-full max-w-sm z-10"
            >
              <button 
                onClick={() => !isSpinning && setShowWheel(false)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white z-30"
              >
                <X size={24} />
              </button>

              <div className="absolute top-0 right-0 p-4">
                <Star className="text-accent animate-pulse" size={20} />
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-lg font-black uppercase tracking-widest mb-1">Vòng Quay May Mắn</h3>
                <p className="text-[9px] text-gray-400 uppercase">Dành riêng cho Top 4 - 30</p>
              </div>

              <div className="relative w-64 h-64 mx-auto mb-8">
                {/* The Wheel */}
                <motion.div 
                  className="w-full h-full rounded-full border-4 border-white/10 relative overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)]"
                  animate={{ rotate: rotation }}
                  transition={{ duration: 4, ease: [0.45, 0.05, 0.55, 0.95] }}
                  style={{ transformOrigin: 'center center' }}
                >
                  {REWARDS.map((r, i) => (
                    <div 
                      key={i}
                      className="absolute top-0 left-1/2 w-1/2 h-full origin-left flex items-center justify-end pr-4"
                      style={{ 
                        transform: `rotate(${i * 72}deg) skewY(-18deg)`,
                        backgroundColor: r.color,
                        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                        opacity: 0.8
                      }}
                    >
                      <span className="text-[8px] font-black uppercase text-white transform rotate-[18deg] origin-center whitespace-nowrap">
                        {r.label}
                      </span>
                    </div>
                  ))}
                </motion.div>
                
                {/* Pointer */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-10">
                  <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-accent"></div>
                </div>
                
                {/* Center Button */}
                <button 
                  onClick={handleSpin}
                  disabled={isSpinning || profile.last_spin_month === new Date().toISOString().slice(0, 7)}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-xl z-20 hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100"
                >
                  {isSpinning ? <Loader2 className="animate-spin" size={20} /> : <RotateCw size={20} />}
                </button>
              </div>

              <p className="text-center text-[8px] text-gray-500 uppercase font-bold tracking-widest">
                {profile.last_spin_month === new Date().toISOString().slice(0, 7) 
                  ? "Bạn đã nhận quà tháng này" 
                  : "Nhấn nút giữa để quay thưởng"}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Leaderboard Table */}
      <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Bảng Xếp Hạng Tháng {new Date().getMonth() + 1}</h3>
            <span className="text-[9px] font-bold text-accent uppercase">{limit === 30 ? 'Top 30' : 'Tất cả'}</span>
          </div>

        <div className="glass rounded-[2rem] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-accent mb-4" />
              <p className="text-[10px] text-gray-500 uppercase font-bold">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {topUsers.length > 0 ? (
                topUsers.map((user, index) => (
                  <div 
                    key={user.id} 
                    className={`flex items-center gap-4 p-4 transition-colors ${user.id === userId ? 'bg-accent/10' : 'hover:bg-white/5'}`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      {index === 0 ? <Trophy className="text-yellow-500" size={20} /> :
                       index === 1 ? <Trophy className="text-slate-400" size={18} /> :
                       index === 2 ? <Trophy className="text-orange-600" size={16} /> :
                       <span className="text-xs font-black text-gray-500">{index + 1}</span>}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                        {user.username}
                        {user.id === userId && <span className="text-[7px] bg-accent text-black px-1.5 py-0.5 rounded-full">BẠN</span>}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-[8px] text-accent font-black">{user.monthly_earnings.toLocaleString()} Xu tháng này</p>
                        <span className="text-[8px] text-gray-500 uppercase font-bold">Tổng: {user.balance.toLocaleString()} Xu</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end text-accent">
                        <Zap size={10} />
                        <span className="text-[10px] font-black">{user.exp.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end text-gray-400">
                        <Trophy size={10} />
                        <span className="text-[10px] font-black">{user.monthly_tasks.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Trophy className="mx-auto text-gray-700 mb-4 opacity-20" size={48} />
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                    Bảng xếp hạng tháng mới đang bắt đầu.<br/>
                    <span className="text-accent">Số dư tối thiểu trên 10.000 Xu để ghi danh!</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notice Pop-up */}
      <AnimatePresence>
        {showNotice && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-80 z-[100]"
          >
            <div className="glass p-5 border-accent/30 bg-gradient-to-br from-accent/10 to-transparent rounded-2xl shadow-2xl flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center shrink-0">
                  <Trophy className="text-accent" size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black uppercase tracking-widest text-accent mb-1">Lưu ý Đua Top</h4>
                  <p className="text-[10px] text-gray-300 leading-relaxed">
                    Số dư tối thiểu trên 10.000 Xu để lọt vào top 30 mới có thể nhận thưởng tháng.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleDismissNotice}
                className="w-full py-2 bg-accent/20 hover:bg-accent text-accent hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leaderboard;
