import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Users, 
  Clock, 
  TrendingUp, 
  Server, 
  Search, 
  Edit, 
  Check, 
  X, 
  Bell, 
  Settings as SettingsIcon,
  ShieldCheck,
  ExternalLink,
  Wallet,
  Image as ImageIcon,
  Trash2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';

interface AdminPanelProps {
  onBack: () => void;
}

type AdminTab = 'users' | 'payouts' | 'notify' | 'settings' | 'reports' | 'proofs';

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingPayouts: 0,
    todayRevenue: 0,
    totalTasks: 0,
    totalSpecialTasks: 0,
    totalSystemBalance: 0,
    totalModDownloads: 0
  });
  const [modStats, setModStats] = useState<any[]>([]);

  // Notification form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifHistory, setNotifHistory] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Proof form
  const [proofTitle, setProofTitle] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [addingProof, setAddingProof] = useState(false);

  // Settings form
  const [refBonus, setRefBonus] = useState(1000);
  const [minWithdraw, setMinWithdraw] = useState(50000);

  // QR Modal
  const [showQR, setShowQR] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);

  useEffect(() => {
    fetchData();
    if (activeTab === 'notify') fetchNotifHistory();
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'proofs') fetchProofs();
  }, [activeTab]);

  const fetchProofs = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProofs(data || []);
    } catch (err) {
      console.error('Error fetching proofs:', err);
    }
  };

  const addProof = async () => {
    if (!proofUrl.trim()) return;
    setAddingProof(true);
    try {
      const { error } = await supabase
        .from('payment_proofs')
        .insert([{ title: proofTitle, image_url: proofUrl }]);
      if (error) throw error;
      showNotification({ title: "Thành công", message: "Đã thêm chứng minh thanh toán.", type: "success" });
      setProofTitle('');
      setProofUrl('');
      fetchProofs();
    } catch (err) {
      console.error('Error adding proof:', err);
      showNotification({ title: "Lỗi", message: "Không thể thêm chứng minh.", type: "error" });
    } finally {
      setAddingProof(false);
    }
  };

  const toggleBan = async (user: any, shouldBan: boolean) => {
    const action = shouldBan ? 'ban' : 'gỡ ban';
    
    console.log('Attempting to update user ban status:', { userId: user.id, username: user.username, shouldBan, userObject: user });

    if (!window.confirm(`Bạn có chắc chắn muốn ${action} người dùng ${user.username}?`)) {
      return;
    }

    const reason = shouldBan ? 'Vi phạm quy định hệ thống' : null;

    try {
      // First, check if the user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching user before update:', fetchError);
        throw new Error(`User not found or error fetching user: ${fetchError.message}`);
      }

      console.log('User found, proceeding with update:', existingUser);

      const { data, error } = await supabase
        .from('profiles')
        .update({ is_banned: shouldBan, ban_reason: reason })
        .eq('id', user.id)
        .select();
      
      console.log('Supabase update result:', { data, error });

      if (error) {
        console.error('Supabase update error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn('Update successful but no rows affected. User ID:', user.id);
        throw new Error('No data returned from update, check if user ID exists or if RLS policies are blocking the update.');
      }

      showNotification({ title: "Thành công", message: `Đã ${shouldBan ? 'ban' : 'mở ban'} người dùng.`, type: "success" });
      fetchData();
    } catch (err) {
      console.error('Error toggling ban:', err);
      showNotification({ title: "Lỗi", message: `Không thể cập nhật trạng thái ban: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`, type: "error" });
    }
  };

  const deleteProof = async (id: string) => {
    try {
      const { error } = await supabase.from('payment_proofs').delete().eq('id', id);
      if (error) throw error;
      showNotification({ title: "Thành công", message: "Đã xóa chứng minh.", type: "success" });
      fetchProofs();
    } catch (err) {
      console.error('Error deleting proof:', err);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const fetchNotifHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotifHistory(data || []);
    } catch (err) {
      console.error('Error fetching notification history:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching admin data...');
      // Fetch Stats
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: pendingCount } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'PENDING');
      
      const { data: profileData } = await supabase.from('profiles').select('balance');
      const totalSystemBalance = profileData?.reduce((sum, p) => sum + (p.balance || 0), 0) || 0;
      
      // Calculate total tasks from transactions table
      const { count: totalTasks } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'TASK')
        .eq('status', 'COMPLETED')
        .eq('description', 'Hoàn thành nhiệm vụ');
      console.log('Total Normal Tasks:', totalTasks);
        
      const { count: totalSpecialTasks } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'TASK')
        .eq('status', 'COMPLETED')
        .eq('description', 'Hoàn thành nhiệm vụ đặc biệt');
      console.log('Total Special Tasks:', totalSpecialTasks);

      const { data: modData } = await supabase.from('mods').select('title, category, download_count');
      const totalModDownloads = modData?.reduce((sum, m) => sum + (m.download_count || 0), 0) || 0;
      
      // Group mod stats by category
      const categoryStats = modData?.reduce((acc: any, mod) => {
        const cat = mod.category || 'Khác';
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += (mod.download_count || 0);
        return acc;
      }, {});

      const formattedModStats = Object.entries(categoryStats || {}).map(([name, count]) => ({ name, count }));
      setModStats(formattedModStats);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: revenueData } = await supabase.from('transactions')
        .select('amount')
        .in('type', ['TASK', 'REFERRAL', 'DAILY_REWARD'])
        .eq('status', 'COMPLETED')
        .gte('created_at', today.toISOString());
      
      const totalRevenue = revenueData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        pendingPayouts: pendingCount || 0,
        todayRevenue: totalRevenue,
        totalTasks: totalTasks || 0,
        totalSpecialTasks: totalSpecialTasks || 0,
        totalSystemBalance,
        totalModDownloads
      });

      if (activeTab === 'users') {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching users:', error);
          showNotification({ title: "Lỗi", message: "Không thể tải danh sách người dùng.", type: "error" });
        } else {
          console.log('Fetched users:', data);
          setUsers(data || []);
        }
      } else if (activeTab === 'payouts') {
        const { data } = await supabase.from('withdrawals').select('*, profiles(username, email)').eq('status', 'PENDING').order('created_at', { ascending: false });
        setPayouts(data || []);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async (payout: any, approve: boolean) => {
    if (approve) {
      setSelectedPayout(payout);
      if (payout.method === 'card') {
        setShowCardModal(true);
      } else {
        setShowQR(true);
      }
    } else {
      try {
        // Reject payout: Return balance to user
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', payout.user_id).single();
        if (profile) {
          await supabase.from('profiles').update({ balance: profile.balance + payout.amount }).eq('id', payout.user_id);
        }
        await supabase.from('withdrawals').update({ status: 'REJECTED' }).eq('id', payout.id);
        // Update transaction status
        await supabase.from('transactions').update({ status: 'REJECTED' }).eq('withdrawal_id', payout.id);
        
        // Record a new REFUND transaction
        await supabase.from('transactions').insert([{
          user_id: payout.user_id,
          type: 'REFUND',
          amount: payout.amount,
          description: `Hoàn tiền rút (${payout.method.toUpperCase()})`,
          status: 'COMPLETED'
        }]);

        showNotification({ title: "Thành công", message: "Đã hủy yêu cầu và hoàn tiền cho người dùng.", type: "success" });
        fetchData();
      } catch (error) {
        console.error('Error rejecting payout:', error);
      }
    }
  };

  const confirmPayout = async () => {
    if (!selectedPayout) return;
    try {
      await supabase.from('withdrawals').update({ status: 'COMPLETED' }).eq('id', selectedPayout.id);
      // Update transaction status
      await supabase.from('transactions').update({ status: 'COMPLETED' }).eq('withdrawal_id', selectedPayout.id);
      showNotification({ title: "Thành công", message: "Giao dịch đã được đánh dấu là hoàn tất.", type: "success" });
      setShowQR(false);
      setShowCardModal(false);
      setSelectedPayout(null);
      fetchData();
    } catch (error) {
      console.error('Error completing payout:', error);
    }
  };

  const sendGlobalNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      showNotification({ title: "Lỗi", message: "Vui lòng nhập đầy đủ tiêu đề và nội dung.", type: "error" });
      return;
    }

    try {
      // Find existing channel
      let channel = supabase.getChannels().find(c => c.topic.includes('global_notifications'));
      
      const sendPayload = async () => {
        try {
          const notificationData = {
            title: notifTitle,
            body: notifBody,
            created_at: new Date().toISOString()
          };

          // Save to database
          const { error: dbError } = await supabase
            .from('notifications')
            .insert([notificationData]);

          if (dbError) console.error('Error saving notification to DB:', dbError);

          await channel?.send({
            type: 'broadcast',
            event: 'notification',
            payload: { 
              id: Date.now().toString(),
              ...notificationData
            }
          });
          
          showNotification({ title: "Thành công", message: "Đã gửi thông báo đến tất cả người dùng đang online.", type: "success" });
          setNotifTitle('');
          setNotifBody('');
        } catch (err) {
          console.error('Error sending broadcast:', err);
          showNotification({ title: "Lỗi", message: "Không thể gửi thông báo.", type: "error" });
        }
      };

      if (!channel) {
        channel = supabase.channel('global_notifications');
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await sendPayload();
          }
        });
      } else {
        await sendPayload();
      }

    } catch (error) {
      console.error('Error sending notification:', error);
      showNotification({ title: "Lỗi", message: "Không thể gửi thông báo.", type: "error" });
    }
  };

  const saveSettings = () => {
    showNotification({ title: "Thành công", message: "Đã cập nhật cấu hình hệ thống.", type: "success" });
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getVietQRUrl = (payout: any) => {
    if (!payout || !payout.details) return "";
    const { bank, stk, name } = payout.details;
    const description = payout.id;
    return `https://img.vietqr.io/image/${bank.toLowerCase()}-${stk}-compact2.png?amount=${payout.amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(name)}`;
  };

  return (
    <div className="space-y-6" style={{ contain: 'content' }}>
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 glass flex items-center justify-center text-accent shrink-0 rounded-xl hover:scale-105 transition-transform"
            style={{ willChange: 'transform' }}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-black uppercase tracking-widest text-accent italic">Quản Trị</h2>
        </div>
        <div className="px-3 py-1 bg-accent/10 border border-accent/30 rounded-full">
          <span className="text-[9px] font-black text-accent uppercase tracking-widest">Admin Mode</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Thành Viên', value: stats.totalUsers, icon: Users, color: '' },
          { label: 'Chờ Rút', value: stats.pendingPayouts, icon: Clock, color: 'text-yellow-500' },
          { label: 'Hôm nay (Xu)', value: stats.todayRevenue.toLocaleString(), icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Tổng Nhiệm Vụ', value: (stats.totalTasks + stats.totalSpecialTasks).toLocaleString(), icon: Check, color: 'text-blue-400' },
          { label: 'NV Thường', value: stats.totalTasks.toLocaleString(), icon: Check, color: 'text-accent' },
          { label: 'NV Đặc Biệt', value: stats.totalSpecialTasks.toLocaleString(), icon: Check, color: 'text-red-500' },
          { label: 'Tổng Số Dư', value: stats.totalSystemBalance.toLocaleString(), icon: Wallet, color: 'text-purple-400' },
          { label: 'Lượt Tải Mod', value: stats.totalModDownloads.toLocaleString(), icon: ExternalLink, color: 'text-orange-400' }
        ].map((stat, i) => (
          <div key={i} className="glass p-4 rounded-2xl hover:scale-105 transition-all duration-300 hover:rotate-y-6 hover:rotate-x-2" style={{ willChange: 'transform' }}>
            <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-center justify-between">
              <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
              <stat.icon size={16} className={`${stat.color || 'text-accent'}/50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Mod Download Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {modStats.map((ms, idx) => (
          <div key={idx} className="glass p-3 rounded-xl flex items-center justify-between border-white/5">
            <span className="text-[9px] font-black uppercase text-gray-400">{ms.name}</span>
            <span className="text-xs font-black text-accent">{ms.count.toLocaleString()} lượt</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/5 overflow-x-auto no-scrollbar">
        {(['users', 'payouts', 'notify', 'proofs', 'settings', 'reports'] as AdminTab[]).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative ${activeTab === tab ? 'text-accent' : 'text-gray-500 hover:text-white'}`}
          >
            {tab === 'users' ? 'Thành Viên' : tab === 'payouts' ? 'Duyệt Rút' : tab === 'notify' ? 'Thông Báo' : tab === 'proofs' ? 'Thanh Toán' : tab === 'reports' ? 'Báo Lỗi' : 'Cài Đặt'}
            {activeTab === tab && (
              <motion.div layoutId="admin-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent shadow-[0_0_10px_#add8e6]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Tìm ID hoặc Username..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-3 pl-10 rounded-xl text-xs outline-none focus:border-accent/50"
                />
              </div>
            </div>
            <div className="glass overflow-hidden rounded-2xl border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] min-w-[600px]">
                  <thead className="bg-white/5 text-gray-500 uppercase font-black tracking-widest">
                    <tr>
                      <th className="p-4">Thành Viên</th>
                      <th className="p-4">Số Dư</th>
                      <th className="p-4">Nhiệm Vụ</th>
                      <th className="p-4">Cấp Bậc</th>
                      <th className="p-4">Xác Minh</th>
                      <th className="p-4 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.length > 0 ? filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition">
                        <td className="p-4">
                          <div className="font-black text-white">{u.username}</div>
                          <div className="text-[8px] text-gray-500 font-bold uppercase">{u.email}</div>
                          <div className="text-[7px] text-gray-600">ID: {u.id}</div>
                          {u.is_banned && <div className="text-[8px] font-black text-red-500 uppercase mt-1">Bị Ban</div>}
                        </td>
                        <td className="p-4 font-black text-accent">{(u.balance || 0).toLocaleString()}</td>
                        <td className="p-4">
                          <div className="text-[10px] font-black text-blue-400">{(u.tasks_total || 0) + (u.special_tasks_total || 0)}</div>
                          <div className="text-[8px] text-gray-500">T: {u.tasks_total || 0} | ĐB: {u.special_tasks_total || 0}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-md font-black text-[8px] uppercase ${u.vip_status === 'VIP GOLD' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-zinc-800 text-zinc-500'}`}>
                            {u.vip_status}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.is_verified ? (
                            <span className="text-emerald-500 flex items-center gap-1 font-bold"><ShieldCheck size={10} /> YES</span>
                          ) : (
                            <span className="text-gray-600 font-bold">NO</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {u.is_banned ? (
                              <button 
                                onClick={() => toggleBan(u, false)}
                                className="w-8 h-8 glass flex items-center justify-center transition-all rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white"
                                title="Gỡ ban"
                              >
                                <Check size={12} />
                              </button>
                            ) : (
                              <button 
                                onClick={() => toggleBan(u, true)}
                                className="w-8 h-8 glass flex items-center justify-center transition-all rounded-lg text-red-500 hover:bg-red-500 hover:text-white"
                                title="Ban"
                              >
                                <X size={12} />
                              </button>
                            )}
                            <button className="w-8 h-8 glass flex items-center justify-center text-accent hover:bg-accent hover:text-black transition-all rounded-lg">
                              <Edit size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-gray-500 italic">Không tìm thấy thành viên nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="space-y-4">
            <div className="glass overflow-hidden rounded-2xl border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] min-w-[600px]">
                  <thead className="bg-white/5 text-gray-500 uppercase font-black tracking-widest">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Số Tiền</th>
                      <th className="p-4">Thông Tin</th>
                      <th className="p-4 text-right">Xử Lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payouts.length > 0 ? payouts.map(p => (
                      <tr key={p.id} className="hover:bg-white/5 transition">
                        <td className="p-4">
                          <div className="font-black text-white">{p.profiles?.username || 'Unknown'}</div>
                          <div className="text-[8px] text-gray-500 font-bold uppercase">{p.email}</div>
                        </td>
                        <td className="p-4 font-black text-yellow-500">{p.amount.toLocaleString()}</td>
                        <td className="p-4">
                          {p.method === 'bank' && (
                            <>
                              <div className="text-[9px] font-black uppercase text-white">{p.details?.bank}</div>
                              <div className="text-[9px] text-gray-400">{p.details?.stk}</div>
                              <div className="text-[9px] text-accent font-bold uppercase">{p.details?.name}</div>
                            </>
                          )}
                          {p.method === 'e-wallet' && (
                            <>
                              <div className="text-[9px] font-black uppercase text-white">{p.details?.type}</div>
                              <div className="text-[9px] text-gray-400">{p.details?.phone}</div>
                              <div className="text-[9px] text-accent font-bold uppercase">{p.details?.name}</div>
                            </>
                          )}
                          {p.method === 'card' && (
                            <>
                              <div className="text-[9px] font-black uppercase text-white">{p.details?.type}</div>
                              <div className="text-[9px] text-gray-400">{p.details?.cardEmail}</div>
                              <div className="text-[9px] text-accent font-bold uppercase italic">Gửi qua Email</div>
                            </>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handlePayout(p, true)}
                              className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white hover:bg-emerald-600 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={() => handlePayout(p, false)}
                              className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white hover:bg-red-600 transition-all shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-gray-500 italic uppercase font-black tracking-widest">Không có yêu cầu chờ duyệt</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notify' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass p-8 space-y-6 rounded-3xl">
              <div className="flex items-center gap-3 text-accent mb-2">
                <Bell size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">Thông báo hệ thống</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Tiêu đề</label>
                  <input 
                    type="text" 
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="VD: Bảo trì hệ thống" 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-accent/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Nội dung</label>
                  <textarea 
                    rows={4} 
                    value={notifBody}
                    onChange={(e) => setNotifBody(e.target.value)}
                    placeholder="Nhập nội dung thông báo..." 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-accent/50"
                  />
                </div>
                <button 
                  onClick={sendGlobalNotification}
                  className="w-full btn-primary py-4 rounded-xl text-[11px] font-black tracking-[0.2em] uppercase mt-2"
                >
                  Gửi thông báo ngay
                </button>
              </div>
            </div>

            <div className="glass p-8 rounded-3xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">Lịch sử thông báo</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {notifHistory.length > 0 ? (
                  notifHistory.map((n) => (
                    <div key={n.id} className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <p className="text-xs font-bold text-accent">{n.title}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{n.body}</p>
                      <p className="text-[8px] text-gray-600 mt-2">{new Date(n.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">Chưa có lịch sử thông báo</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="glass p-8 space-y-6 rounded-3xl">
              <div className="flex items-center gap-3 text-accent mb-2">
                <SettingsIcon size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">Cấu hình Xu</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Thưởng Referral (Xu)</label>
                  <input 
                    type="number" 
                    value={refBonus}
                    onChange={(e) => setRefBonus(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-accent/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Rút tối thiểu (Xu)</label>
                  <input 
                    type="number" 
                    value={minWithdraw}
                    onChange={(e) => setMinWithdraw(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-accent/50"
                  />
                </div>
                <button 
                  onClick={saveSettings}
                  className="w-full btn-primary py-3 rounded-xl text-[10px] font-black tracking-widest uppercase mt-4"
                >
                  Cập nhật cấu hình
                </button>
              </div>
            </div>

            <div className="glass p-8 space-y-6 rounded-3xl">
              <div className="flex items-center gap-3 text-blue-400 mb-2">
                <Server size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">Hệ thống</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-gray-400">Trạng thái Server</span>
                  <span className="text-[10px] font-black uppercase text-emerald-500">Hoạt động</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-gray-400">Phiên bản</span>
                  <span className="text-[10px] font-black uppercase text-white">v2.4.0</span>
                </div>
                <button className="w-full glass py-3 rounded-xl text-[10px] font-black tracking-widest uppercase text-red-400 border-red-500/20 hover:bg-red-500/10 transition-all">
                  Bảo trì toàn hệ thống
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="glass p-8 rounded-3xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">Danh sách báo lỗi</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {reports.length > 0 ? (
                reports.map((r) => (
                  <div key={r.id} className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-accent">{r.profiles?.username || 'Ẩn danh'}</p>
                      <p className="text-[8px] text-gray-500">{new Date(r.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <p className="text-[10px] text-gray-300 mt-2">{r.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">Chưa có báo cáo lỗi nào</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'proofs' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-8 space-y-6 rounded-3xl md:col-span-1">
              <div className="flex items-center gap-3 text-accent mb-2">
                <ImageIcon size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">Thêm chứng minh</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Tiêu đề (Tùy chọn)</label>
                  <input 
                    type="text" 
                    value={proofTitle}
                    onChange={(e) => setProofTitle(e.target.value)}
                    placeholder="VD: Rút 500k MoMo" 
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-accent/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Link ảnh (URL)</label>
                  <input 
                    type="text" 
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://..." 
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-accent/50"
                  />
                </div>
                <button 
                  onClick={addProof}
                  disabled={addingProof}
                  className="w-full btn-primary py-3 rounded-xl text-[10px] font-black tracking-widest uppercase mt-2 flex items-center justify-center gap-2"
                >
                  {addingProof ? 'Đang thêm...' : <><Plus size={14} /> Thêm ảnh</>}
                </button>
              </div>
            </div>

            <div className="glass p-8 rounded-3xl md:col-span-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">Danh sách hình ảnh</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
                {proofs.length > 0 ? (
                  proofs.map((p) => (
                    <div key={p.id} className="group relative aspect-[3/4] rounded-xl overflow-hidden glass border-white/5">
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                        <p className="text-[8px] font-black text-white uppercase mb-2">{p.title || 'Không tiêu đề'}</p>
                        <button 
                          onClick={() => deleteProof(p.id)}
                          className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4 col-span-full italic">Chưa có hình ảnh nào.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQR(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass p-8 w-full max-w-sm text-center space-y-6 relative z-10 rounded-[40px] border-accent/20"
            >
              <h3 className="text-sm font-black uppercase text-accent tracking-widest">Thanh toán VietQR</h3>
              
              <div className="bg-white p-4 rounded-[2rem] inline-block mx-auto shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <img 
                  src={getVietQRUrl(selectedPayout)} 
                  alt="VietQR" 
                  className="w-64 h-64"
                />
              </div>

              <div className="text-left space-y-3 text-[10px] bg-white/5 p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase">Ngân hàng:</span>
                  <span className="text-white font-black">{selectedPayout?.details?.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase">Số tài khoản:</span>
                  <span className="text-white font-black">{selectedPayout?.details?.stk}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase">Số tiền:</span>
                  <span className="text-accent font-black">{selectedPayout?.amount?.toLocaleString()} VND</span>
                </div>
                <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                  <span className="text-gray-500 font-bold uppercase">Nội dung chuyển khoản:</span>
                  <span className="text-white font-mono text-[9px] break-all bg-black/40 p-2 rounded-lg">
                    {selectedPayout ? selectedPayout.id : ''}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowQR(false)}
                  className="py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400"
                >
                  Hủy
                </button>
                <button 
                  onClick={confirmPayout}
                  className="py-4 btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                  Đã chuyển
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Card Modal */}
      <AnimatePresence>
        {showCardModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCardModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass p-8 w-full max-w-sm text-center space-y-6 relative z-10 rounded-[40px] border-accent/20"
            >
              <h3 className="text-sm font-black uppercase text-accent tracking-widest">Thanh toán Thẻ Cào</h3>
              
              <div className="text-left space-y-3 text-[10px] bg-white/5 p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase">Email nhận mã:</span>
                  <span className="text-white font-black">{selectedPayout?.details?.cardEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase">Số tiền:</span>
                  <span className="text-accent font-black">{selectedPayout?.amount?.toLocaleString()} Xu</span>
                </div>
                <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                  <span className="text-gray-500 font-bold uppercase">Nội dung thanh toán (Copy):</span>
                  <div className="text-white font-mono text-[9px] break-all bg-black/40 p-2 rounded-lg relative">
                    {`Xác nhận thanh toán thẻ cào ${selectedPayout?.details?.type} cho đơn rút ${selectedPayout?.id}`}
                    <button 
                      onClick={() => navigator.clipboard.writeText(`Xác nhận thanh toán thẻ cào ${selectedPayout?.details?.type} cho đơn rút ${selectedPayout?.id}`)}
                      className="absolute top-1 right-1 bg-accent text-black px-2 py-1 rounded text-[8px] font-black uppercase"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowCardModal(false)}
                  className="py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400"
                >
                  Hủy
                </button>
                <button 
                  onClick={confirmPayout}
                  className="py-4 btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                  Đã duyệt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;
