import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Calendar, Users, Star, ArrowRight, Clock, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';

interface LeaderboardProps {
  userId: string;
  profile: any;
}

interface RankingUser {
  id: string;
  username: string;
  tasks_total: number;
  balance: number;
  exp: number;
  avatar_url?: string;
}

interface MonthlyRankingUser {
  user_id: string;
  username: string;
  total_earned: number;
  tasks_count: number;
}

const REWARDS = [
  { rank: 1, reward: 50000 },
  { rank: 2, reward: 40000 },
  { rank: 3, reward: 30000 },
  { rank: 4, reward: 20000 },
  { rank: 5, reward: 10000 },
  { rank: 6, reward: 5000 },
  { rank: 7, reward: 5000 },
  { rank: 8, reward: 5000 },
  { rank: 9, reward: 5000 },
  { rank: 10, reward: 5000 },
];

const Leaderboard: React.FC<LeaderboardProps> = ({ userId, profile }) => {
  const [activeTab, setActiveTab] = useState<'allTime' | 'monthly'>('monthly');
  const [allTimeRankings, setAllTimeRankings] = useState<RankingUser[]>([]);
  const [monthlyRankings, setMonthlyRankings] = useState<MonthlyRankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonthName, setCurrentMonthName] = useState('');

  useEffect(() => {
    const now = new Date();
    const month = now.toLocaleString('vi-VN', { month: 'long' });
    const year = now.getFullYear();
    setCurrentMonthName(`${month} ${year}`);
    
    fetchRankings();
  }, [activeTab]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      if (activeTab === 'allTime') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, tasks_total, balance, exp')
          .order('tasks_total', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setAllTimeRankings(data || []);
      } else {
        // Monthly Ranking Logic
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('user_id, amount, profiles(username)')
          .eq('status', 'COMPLETED')
          .in('type', ['TASK', 'SPECIAL_TASK', 'DAILY_REWARD', 'REFERRAL'])
          .gte('created_at', startOfMonth.toISOString());

        if (transError) throw transError;

        // Group by user_id
        const userStats: Record<string, { username: string, total_earned: number, tasks_count: number }> = {};
        
        transactions?.forEach((t: any) => {
          const uid = t.user_id;
          const username = t.profiles?.username || 'Người dùng ẩn';
          if (!userStats[uid]) {
            userStats[uid] = { username, total_earned: 0, tasks_count: 0 };
          }
          userStats[uid].total_earned += t.amount;
          userStats[uid].tasks_count += 1;
        });

        const sortedMonthly = Object.entries(userStats)
          .map(([user_id, stats]) => ({ user_id, ...stats }))
          .sort((a, b) => b.total_earned - a.total_earned)
          .slice(0, 50);

        setMonthlyRankings(sortedMonthly);
      }
    } catch (err) {
      console.error('Error fetching rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="text-yellow-400 fill-yellow-400" size={20} />;
    if (index === 1) return <Medal className="text-slate-300 fill-slate-300" size={20} />;
    if (index === 2) return <Medal className="text-amber-600 fill-amber-600" size={20} />;
    return <span className="text-xs font-black text-slate-400">#{index + 1}</span>;
  };

  const getRewardForRank = (index: number) => {
    const reward = REWARDS.find(r => r.rank === index + 1);
    return reward ? reward.reward : null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden border-accent/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-accent">
              <Trophy size={24} className="animate-bounce" />
              <h2 className="text-2xl font-black uppercase tracking-tighter">Bảng Xếp Hạng</h2>
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Vinh danh những người dùng tích cực nhất</p>
          </div>
          
          <div className="flex bg-fuchsia-50 p-1.5 rounded-2xl border border-fuchsia-100">
            <button 
              onClick={() => setActiveTab('monthly')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'monthly' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-slate-500 hover:text-accent'}`}
            >
              Đua Top Tháng
            </button>
            <button 
              onClick={() => setActiveTab('allTime')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'allTime' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-slate-500 hover:text-accent'}`}
            >
              Tất Cả
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'monthly' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass p-6 rounded-3xl border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-transparent">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-500">
                <Crown size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-yellow-600 tracking-widest">Top 1 Tháng</h4>
                <p className="text-lg font-black text-slate-900">50,000 XU</p>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">Phần thưởng cao nhất dành cho người dẫn đầu trong tháng {currentMonthName}.</p>
          </div>
          
          <div className="glass p-6 rounded-3xl border-slate-300/20 bg-gradient-to-br from-slate-300/5 to-transparent">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-300/10 flex items-center justify-center text-slate-400">
                <Medal size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Top 2 & 3</h4>
                <p className="text-lg font-black text-slate-900">40K - 30K XU</p>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">Phần thưởng hấp dẫn dành cho vị trí Á quân và hạng ba.</p>
          </div>

          <div className="glass p-6 rounded-3xl border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Medal size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-accent tracking-widest">Top 4 - 10</h4>
                <p className="text-lg font-black text-slate-900">20K - 5K XU</p>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">Cơ hội nhận thưởng dành cho tất cả người dùng trong Top 10.</p>
          </div>
        </div>
      )}

      {/* Rankings Table */}
      <div className="glass rounded-[2.5rem] overflow-hidden border-accent/10">
        <div className="p-6 border-b border-fuchsia-100 flex items-center justify-between bg-fuchsia-50/30">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-accent" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">
              {activeTab === 'monthly' ? `Xếp hạng tháng ${currentMonthName}` : 'Xếp hạng từ trước đến nay'}
            </h3>
          </div>
          {loading && <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-fuchsia-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Hạng</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Người dùng</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  {activeTab === 'monthly' ? 'Thu nhập tháng' : 'Tổng nhiệm vụ'}
                </th>
                {activeTab === 'monthly' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Phần thưởng</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-fuchsia-50">
              {activeTab === 'allTime' ? (
                allTimeRankings.map((user, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={user.id} 
                    className={`hover:bg-fuchsia-50/30 transition-colors ${user.id === userId ? 'bg-accent/5' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-fuchsia-100/50">
                        {getRankIcon(index)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-fuchsia-600 flex items-center justify-center text-white text-[10px] font-black">
                          {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{user.username}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase">Cấp {Math.floor(user.exp / 100) + 1}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={12} className="text-emerald-500" />
                        <span className="text-xs font-black text-slate-900">{user.tasks_total.toLocaleString()}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase ml-1">Nhiệm vụ</span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                monthlyRankings.map((user, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={user.user_id} 
                    className={`hover:bg-fuchsia-50/30 transition-colors ${user.user_id === userId ? 'bg-accent/5' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-fuchsia-100/50">
                        {getRankIcon(index)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-fuchsia-600 flex items-center justify-center text-white text-[10px] font-black">
                          {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{user.username}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase">{user.tasks_count} nhiệm vụ</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Coins size={12} className="text-accent" />
                        <span className="text-xs font-black text-accent">{user.total_earned.toLocaleString()}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase ml-1">Xu</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {getRewardForRank(index) ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <Star size={10} className="fill-emerald-600" />
                          <span className="text-[10px] font-black">+{getRewardForRank(index)?.toLocaleString()} XU</span>
                        </div>
                      ) : (
                        <span className="text-[8px] text-slate-400 font-bold uppercase italic">Cố gắng thêm</span>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
          
          {!loading && (activeTab === 'allTime' ? allTimeRankings.length === 0 : monthlyRankings.length === 0) && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-fuchsia-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Users size={32} />
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Chưa có dữ liệu xếp hạng</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="glass p-6 rounded-3xl border-fuchsia-100 bg-fuchsia-50/30">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent/10 rounded-2xl text-accent">
            <Clock size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Quy tắc trao thưởng</h4>
            <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">
              Phần thưởng đua top tháng sẽ được hệ thống tự động tổng kết và trao vào ví của bạn vào ngày đầu tiên của tháng kế tiếp. 
              Kết quả dựa trên tổng thu nhập từ nhiệm vụ và hoạt động trong tháng hiện tại.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
