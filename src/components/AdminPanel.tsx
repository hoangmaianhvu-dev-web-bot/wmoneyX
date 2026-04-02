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
  Plus,
  Trophy
} from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';
import PaymentQR from './PaymentQR';

interface AdminPanelProps {
  onBack: () => void;
}

type AdminTab = 'users' | 'payouts' | 'notify' | 'settings' | 'reports' | 'proofs' | 'special_tasks' | 'mods' | 'ranking';

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
  const [mods, setMods] = useState<any[]>([]);

  // Editing user state
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Notification form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifHistory, setNotifHistory] = useState<any[]>([]);
  const [specialTasks, setSpecialTasks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Proof form
  const [proofTitle, setProofTitle] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [addingProof, setAddingProof] = useState(false);

  // Ranking state
  const [monthlyRankings, setMonthlyRankings] = useState<any[]>([]);
  const [isDistributing, setIsDistributing] = useState(false);

  // Settings form
  const [refBonus, setRefBonus] = useState(1000);
  const [minWithdraw, setMinWithdraw] = useState(50000);

  const SPECIAL_TASKS_LIST = [
    { id: 'Review Map', name: 'Review Map', type: 'map', reward: 1500 },
    { id: 'Review Trip', name: 'Review Trip', type: 'trip', reward: 3000 },
    { id: 'Review App/Tải App', name: 'Review App/Tải App', type: 'app', reward: 500 },
  ];

  const TASK_DATA: Record<string, { reward: number, limit: number }> = {
    "🔥 LINK4M": { reward: 100, limit: 2 },
    "🔥 TRAFFIC1M": { reward: 300, limit: 3 },
    "🔥 TRAFFIC68": { reward: 200, limit: 2 },
    "TRAFICTOT": { reward: 100, limit: 3 },
    "🔥 LINKTOT": { reward: 100, limit: 1 },
    "🔥 LINKNGONIO": { reward: 200, limit: 2 },
    "🔥 BBMKTS": { reward: 200, limit: 1 },
    "TIMMAP": { reward: 100, limit: 2 },
    "LINKTOP": { reward: 100, limit: 2 },
    "LINKNGONCOM": { reward: 200, limit: 2 },
    "🔥 TAPLAYMA": { reward: 150, limit: 3 },
    "XLINK": { reward: 50, limit: 2 },
    "4MMO": { reward: 100, limit: 2 },
    "🔥 NHAPMA": { reward: 100, limit: 3 },
    "🔥 UPTOLINK SET3": { reward: 200, limit: 100 },
    "UPTOLINK SET2": { reward: 150, limit: 100 },
  };

  // QR Modal
  const [showQR, setShowQR] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceTasks, setMaintenanceTasks] = useState<string[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    task: any;
    stage: number;
    action: 'APPROVED' | 'REJECTED';
    actionText: string;
  }>({
    show: false,
    task: null,
    stage: 0,
    action: 'APPROVED',
    actionText: ''
  });

  useEffect(() => {
    fetchData();
    if (activeTab === 'notify') fetchNotifHistory();
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'proofs') fetchProofs();
    if (activeTab === 'special_tasks') fetchSpecialTasks();
    if (activeTab === 'mods') fetchMods();
    if (activeTab === 'settings') fetchMaintenanceTasks();
    if (activeTab === 'ranking') fetchMonthlyRanking();
  }, [activeTab]);

  const fetchMonthlyRanking = async (monthOffset = 0) => {
    try {
      setLoading(true);
      const date = new Date();
      date.setMonth(date.getMonth() + monthOffset);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('user_id, amount, profiles(username, email)')
        .eq('status', 'COMPLETED')
        .in('type', ['TASK', 'SPECIAL_TASK', 'DAILY_REWARD', 'REFERRAL'])
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (error) throw error;

      const userStats: Record<string, any> = {};
      transactions?.forEach((t: any) => {
        const uid = t.user_id;
        if (!userStats[uid]) {
          userStats[uid] = { 
            user_id: uid, 
            username: t.profiles?.username || 'N/A', 
            email: t.profiles?.email || 'N/A',
            total_earned: 0 
          };
        }
        userStats[uid].total_earned += t.amount;
      });

      const sorted = Object.values(userStats)
        .sort((a: any, b: any) => b.total_earned - a.total_earned)
        .slice(0, 20);

      setMonthlyRankings(sorted);
    } catch (err) {
      console.error('Error fetching monthly ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  const distributeMonthlyRewards = async () => {
    if (isDistributing) return;
    
    const confirm = window.confirm("Bạn có chắc chắn muốn trao thưởng cho TOP 10 của tháng TRƯỚC không? Hành động này nên được thực hiện vào ngày đầu tiên của tháng mới.");
    if (!confirm) return;

    setIsDistributing(true);
    try {
      // Get previous month
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Check if already rewarded
      const { data: settings } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `rewarded_month_${monthKey}`)
        .single();
      
      if (settings) {
        alert(`Tháng ${monthKey} đã được trao thưởng trước đó!`);
        setIsDistributing(false);
        return;
      }

      // Fetch top 10 for previous month
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('user_id, amount')
        .eq('status', 'COMPLETED')
        .in('type', ['TASK', 'SPECIAL_TASK', 'DAILY_REWARD', 'REFERRAL'])
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      const userStats: Record<string, number> = {};
      transactions?.forEach((t: any) => {
        userStats[t.user_id] = (userStats[t.user_id] || 0) + t.amount;
      });

      const top10 = Object.entries(userStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const REWARDS = [50000, 40000, 30000, 20000, 10000, 5000, 5000, 5000, 5000, 5000];

      for (let i = 0; i < top10.length; i++) {
        const [userId, _] = top10[i];
        const rewardAmount = REWARDS[i];

        // Update balance
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
        if (profile) {
          await supabase.from('profiles').update({ balance: profile.balance + rewardAmount }).eq('id', userId);
          
          // Add transaction
          await supabase.from('transactions').insert([{
            user_id: userId,
            amount: rewardAmount,
            type: 'DAILY_REWARD',
            status: 'COMPLETED',
            description: `Thưởng Đua Top Tháng ${monthKey} - Hạng ${i + 1}`
          }]);

          // Add notification
          await supabase.from('notifications').insert([{
            user_id: userId,
            title: "Chúc mừng!",
            body: `Bạn đã đạt Hạng ${i + 1} trong cuộc đua Top tháng ${monthKey} và nhận được ${rewardAmount.toLocaleString()} Xu thưởng!`,
            type: 'system'
          }]);
        }
      }

      // Mark month as rewarded
      await supabase.from('system_settings').insert([{
        key: `rewarded_month_${monthKey}`,
        value: { rewarded_at: new Date().toISOString(), top_users: top10 }
      }]);

      showNotification({ title: "Thành công", message: `Đã trao thưởng cho TOP 10 tháng ${monthKey}`, type: "success" });
    } catch (err) {
      console.error('Error distributing rewards:', err);
      showNotification({ title: "Lỗi", message: "Không thể trao thưởng tháng.", type: "error" });
    } finally {
      setIsDistributing(false);
    }
  };

  const fetchMaintenanceTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_tasks')
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Table or key doesn't exist, ignore for now or handle as empty
          setMaintenanceTasks([]);
        } else {
          throw error;
        }
      } else if (data) {
        setMaintenanceTasks(data.value || []);
      }
    } catch (err) {
      console.error('Error fetching maintenance tasks:', err);
    }
  };

  const toggleMaintenanceTask = async (taskId: string) => {
    const isMaintained = maintenanceTasks.includes(taskId);
    const newMaintenanceTasks = isMaintained 
      ? maintenanceTasks.filter(id => id !== taskId)
      : [...maintenanceTasks, taskId];
    
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'maintenance_tasks', value: newMaintenanceTasks });
      
      if (error) throw error;
      
      setMaintenanceTasks(newMaintenanceTasks);
      showNotification({ 
        title: "Thành công", 
        message: `${isMaintained ? 'Gỡ' : 'Đã'} bảo trì nhiệm vụ: ${taskId}`, 
        type: "success" 
      });
    } catch (err) {
      console.error('Error updating maintenance tasks:', err);
      showNotification({ title: "Lỗi", message: "Không thể cập nhật trạng thái bảo trì.", type: "error" });
    }
  };

  const fetchMods = async () => {
    try {
      const { data, error } = await supabase
        .from('mods')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMods(data || []);
    } catch (err) {
      console.error('Error fetching mods:', err);
    }
  };

  const deleteMod = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bản mod này?")) return;
    try {
      const { error } = await supabase.from('mods').delete().eq('id', id);
      if (error) throw error;
      showNotification({ title: "Thành công", message: "Đã xóa bản mod.", type: "success" });
      fetchMods();
    } catch (err) {
      console.error('Error deleting mod:', err);
      showNotification({ title: "Lỗi", message: "Không thể xóa bản mod.", type: "error" });
    }
  };

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

  const fetchSpecialTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('special_task_submissions')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      console.log('Fetched special tasks:', data);
      setSpecialTasks(data || []);
    } catch (err) {
      console.error('Error fetching special tasks:', err);
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

  const handleSpecialTaskApproval = (task: any, stage: number, action: 'APPROVED' | 'REJECTED') => {
    const actionText = action === 'APPROVED' ? 'DUYỆT' : 'TỪ CHỐI';
    setConfirmModal({
      show: true,
      task,
      stage,
      action,
      actionText
    });
  };

  const confirmSpecialTaskAction = async () => {
    const { task, stage, action } = confirmModal;
    if (!task) return;

    try {
      let updateData: any = {};
      let notificationMessage = '';
      let rewardAmount = 0;

      if (stage === 1) {
        updateData = {
          status_1: action,
          approved_at_1: action === 'APPROVED' ? new Date().toISOString() : null,
          total_status: action === 'REJECTED' ? 'REJECTED' : 'PENDING'
        };
        notificationMessage = action === 'APPROVED' ? 'Duyệt lần 1 thành công!' : 'Nhiệm vụ bị từ chối ở lần 1.';
      } else {
        updateData = {
          status_2: action,
          total_status: action === 'APPROVED' ? 'COMPLETED' : 'REJECTED'
        };
        notificationMessage = action === 'APPROVED' ? 'Duyệt lần 2 thành công! Đã cộng thưởng.' : 'Nhiệm vụ bị từ chối ở lần 2.';
        if (action === 'APPROVED') {
          const taskInfo = SPECIAL_TASKS_LIST.find(t => t.id === task.task_type);
          rewardAmount = task.reward_amount || taskInfo?.reward || 1000;
        }
      }

      const { error } = await supabase
        .from('special_task_submissions')
        .update(updateData)
        .eq('id', task.id);
      if (error) throw error;

      if (rewardAmount > 0) {
        // Add reward to user balance and increment special_tasks_total and tasks_today
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('balance, special_tasks_total, tasks_today')
            .eq('id', task.user_id)
            .single();
          
          if (profileError) throw profileError;

          if (profile) {
            const updatePayload: any = {
              balance: (profile.balance || 0) + rewardAmount,
              tasks_today: (profile.tasks_today || 0) + 1
            };
            
            // Only update special_tasks_total if it exists in the profile object
            if ('special_tasks_total' in profile) {
              updatePayload.special_tasks_total = (profile.special_tasks_total || 0) + 1;
            }

            await supabase.from('profiles').update(updatePayload).eq('id', task.user_id);
            
            await supabase.from('transactions').insert([{
              user_id: task.user_id,
              type: 'TASK',
              amount: rewardAmount,
              description: 'Hoàn thành nhiệm vụ đặc biệt',
              status: 'COMPLETED'
            }]);
          }
        } catch (profileErr) {
          console.error('Error updating profile after special task approval:', profileErr);
          // Fallback: at least try to update balance if everything else fails
          await supabase.rpc('increment_balance', { user_id: task.user_id, amount: rewardAmount });
        }
      }

      // Send notification
      await supabase.from('notifications').insert([{
        user_id: task.user_id,
        title: 'Thông báo nhiệm vụ',
        body: notificationMessage,
        type: 'SYSTEM',
        created_at: new Date().toISOString()
      }]);

      showNotification({ title: "Thành công", message: notificationMessage, type: "success" });
      setConfirmModal({ ...confirmModal, show: false });
      fetchSpecialTasks();
      fetchData(); // Refresh stats at the top
    } catch (err) {
      console.error('Error approving task:', err);
      showNotification({ title: "Lỗi", message: "Không thể xử lý yêu cầu.", type: "error" });
    }
  };

  const updateTaskReward = async (taskId: string, newReward: number) => {
    try {
      const { error } = await supabase
        .from('special_task_submissions')
        .update({ reward_amount: newReward })
        .eq('id', taskId);
      
      if (error) throw error;
      
      // Update local state
      setSpecialTasks(prev => prev.map(t => t.id === taskId ? { ...t, reward_amount: newReward } : t));
      
      showNotification({ title: "Thành công", message: "Đã cập nhật phần thưởng.", type: "success" });
    } catch (err) {
      console.error('Error updating task reward:', err);
      showNotification({ title: "Lỗi", message: "Không thể cập nhật phần thưởng.", type: "error" });
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

  const saveSettings = async () => {
    try {
      // In a real app, we'd save to a settings table. 
      // For now, we'll just show success as we don't have a settings table schema defined.
      showNotification({ title: "Thành công", message: "Đã cập nhật cấu hình hệ thống.", type: "success" });
    } catch (err) {
      console.error('Error saving settings:', err);
      showNotification({ title: "Lỗi", message: "Không thể lưu cấu hình.", type: "error" });
    }
  };

  const updateUserBalance = async () => {
    if (!editingUser) return;
    setIsUpdatingUser(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', editingUser.id);
      
      if (error) throw error;
      
      showNotification({ 
        title: "Thành công", 
        message: `Đã cập nhật số dư cho ${editingUser.username}`, 
        type: "success" 
      });
      
      setEditingUser(null);
      fetchData(); // Refresh user list
    } catch (err) {
      console.error('Error updating balance:', err);
      showNotification({ title: "Lỗi", message: "Không thể cập nhật số dư.", type: "error" });
    } finally {
      setIsUpdatingUser(false);
    }
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
    const bankCode = (bank || "").toLowerCase();
    return `https://img.vietqr.io/image/${bankCode}-${stk}-compact2.png?amount=${payout.amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(name)}`;
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
        {(['users', 'payouts', 'special_tasks', 'mods', 'notify', 'ranking', 'proofs', 'settings', 'reports'] as AdminTab[]).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative ${activeTab === tab ? 'text-accent' : 'text-gray-500 hover:text-white'}`}
          >
            {tab === 'users' ? 'Thành Viên' : 
             tab === 'payouts' ? 'Duyệt Rút' : 
             tab === 'special_tasks' ? 'Duyệt NV Đặc Biệt' :
             tab === 'mods' ? 'Bản Mod' :
             tab === 'notify' ? 'Thông Báo' : 
             tab === 'ranking' ? 'Xếp Hạng' :
             tab === 'proofs' ? 'Thanh Toán' : 
             tab === 'reports' ? 'Báo Lỗi' : 'Cài Đặt'}
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
                            <button 
                              onClick={() => {
                                setEditingUser(u);
                                setNewBalance(u.balance || 0);
                              }}
                              className="w-8 h-8 glass flex items-center justify-center text-accent hover:bg-accent hover:text-black transition-all rounded-lg"
                            >
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

        {activeTab === 'mods' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-widest text-accent">Quản lý bản Mod</h3>
              <p className="text-xs text-gray-400 font-bold uppercase">Tổng cộng: {mods.length} bản mod</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mods.map((mod) => (
                <div key={mod.id} className="glass p-6 rounded-3xl border-accent/10 flex flex-col justify-between">
                  <div>
                    <div className="w-full h-32 bg-white/5 rounded-2xl mb-4 overflow-hidden">
                      {mod.image_url ? (
                        <img src={mod.image_url} alt={mod.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <ImageIcon size={32} />
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-white mb-2">{mod.title}</h4>
                    <p className="text-[10px] text-gray-400 line-clamp-2 mb-4">{mod.description}</p>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[8px] font-black uppercase px-2 py-1 bg-accent/10 text-accent rounded-full border border-accent/20">
                        {mod.category}
                      </span>
                      <span className="text-[8px] font-black uppercase px-2 py-1 bg-white/5 text-gray-400 rounded-full border border-white/10">
                        v{mod.version}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-gray-500">
                      <TrendingUp size={12} />
                      <span className="text-[10px] font-bold uppercase">{mod.download_count || 0} lượt tải</span>
                    </div>
                    <button 
                      onClick={() => deleteMod(mod.id)}
                      className="text-red-500 hover:text-red-400 transition-colors"
                      title="Xóa mod"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {mods.length === 0 && (
                <div className="col-span-full py-20 text-center glass rounded-3xl">
                  <Server className="mx-auto text-gray-600 mb-4" size={48} />
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-widest italic">Chưa có bản mod nào được đăng tải</p>
                </div>
              )}
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
                <button 
                  onClick={() => setShowMaintenanceModal(true)}
                  className="w-full glass py-3 rounded-xl text-[10px] font-black tracking-widest uppercase text-accent border-accent/20 hover:bg-accent/10 transition-all mb-3"
                >
                  Bảo trì nhiệm vụ
                </button>
                <button className="w-full glass py-3 rounded-xl text-[10px] font-black tracking-widest uppercase text-red-400 border-red-500/20 hover:bg-red-500/10 transition-all">
                  Bảo trì toàn hệ thống
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-widest text-accent">Bảng Xếp Hạng Tháng</h3>
              <div className="flex gap-3">
                <button 
                  onClick={() => fetchMonthlyRanking(-1)}
                  className="px-4 py-2 glass border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Tháng trước
                </button>
                <button 
                  onClick={() => fetchMonthlyRanking(0)}
                  className="px-4 py-2 glass border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Tháng này
                </button>
                <button 
                  onClick={distributeMonthlyRewards}
                  disabled={isDistributing}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  {isDistributing ? 'Đang xử lý...' : <><Trophy size={14} /> Trao thưởng tháng trước</>}
                </button>
              </div>
            </div>

            <div className="glass rounded-[2.5rem] overflow-hidden border-accent/10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Hạng</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Người dùng</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Email</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Thu nhập</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Dự kiến thưởng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {monthlyRankings.map((user, index) => (
                    <tr key={user.user_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`text-xs font-black ${index < 3 ? 'text-accent' : 'text-gray-500'}`}>#{index + 1}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-white">{user.username}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-gray-400">{user.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-emerald-400">{user.total_earned.toLocaleString()} Xu</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {index < 10 ? (
                          <span className="text-[10px] font-black text-yellow-500">
                            +{[50000, 40000, 30000, 20000, 10000, 5000, 5000, 5000, 5000, 5000][index].toLocaleString()} Xu
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {monthlyRankings.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest italic">Chưa có dữ liệu cho tháng này</p>
                </div>
              )}
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

        {activeTab === 'special_tasks' && (
          <div className="glass p-8 rounded-3xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">Duyệt nhiệm vụ đặc biệt</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] min-w-[800px]">
                <thead className="bg-white/5 text-gray-500 uppercase font-black tracking-widest">
                  <tr>
                    <th className="p-4">Người dùng</th>
                    <th className="p-4">Loại nhiệm vụ</th>
                    <th className="p-4">Link bài review</th>
                    <th className="p-4">Phần thưởng</th>
                    <th className="p-4">Duyệt 1 (24h)</th>
                    <th className="p-4">Duyệt 2 (10 ngày)</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {specialTasks.length > 0 ? specialTasks.map(task => (
                    <tr key={task.id} className="hover:bg-white/5 transition">
                      <td className="p-4">{task.profiles?.username || 'Unknown'}</td>
                      <td className="p-4">{task.task_type}</td>
                      <td className="p-4">
                        <a href={task.review_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Xem bài</a>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            value={task.reward_amount || 0} 
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSpecialTasks(prev => prev.map(t => t.id === task.id ? { ...t, reward_amount: val } : t));
                            }}
                            onBlur={(e) => updateTaskReward(task.id, Number(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateTaskReward(task.id, Number((e.target as HTMLInputElement).value));
                              }
                            }}
                            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-accent font-black outline-none focus:border-accent/50 text-[10px]"
                          />
                          <span className="text-accent font-black">XU</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {task.status_1?.toUpperCase() === 'PENDING' ? (
                          <CountdownTimer startTime={task.created_at} durationMs={24 * 60 * 60 * 1000} />
                        ) : (
                          <span className={`font-black uppercase ${task.status_1?.toUpperCase() === 'APPROVED' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {task.status_1}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {task.status_1?.toUpperCase() === 'APPROVED' && task.status_2?.toUpperCase() === 'PENDING' ? (
                          <CountdownTimer startTime={task.approved_at_1} durationMs={10 * 24 * 60 * 60 * 1000} />
                        ) : task.status_2?.toUpperCase() === 'PENDING' ? (
                          <span className="text-gray-500 font-black uppercase">Chờ duyệt 1</span>
                        ) : (
                          <span className={`font-black uppercase ${task.status_2?.toUpperCase() === 'APPROVED' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {task.status_2}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md font-black text-[9px] uppercase ${
                          task.total_status?.toUpperCase() === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500' : 
                          task.total_status?.toUpperCase() === 'REJECTED' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {task.total_status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-3">
                          {(!task.status_1 || task.status_1?.toUpperCase() === 'PENDING') && (
                            <>
                              <button 
                                onClick={() => handleSpecialTaskApproval(task, 1, 'APPROVED')} 
                                className="w-8 h-8 flex items-center justify-center bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/30 transition-all group relative font-black"
                                title="Duyệt lần 1 (Y)"
                              >
                                Y
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Duyệt 1</span>
                              </button>
                              <button 
                                onClick={() => handleSpecialTaskApproval(task, 1, 'REJECTED')} 
                                className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-all group relative font-black"
                                title="Từ chối lần 1 (X)"
                              >
                                X
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Hủy 1</span>
                              </button>
                            </>
                          )}
                          {(task.status_1?.toUpperCase() === 'APPROVED' && (!task.status_2 || task.status_2?.toUpperCase() === 'PENDING')) && (
                            <>
                              <button 
                                onClick={() => handleSpecialTaskApproval(task, 2, 'APPROVED')} 
                                className="w-8 h-8 flex items-center justify-center bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/30 transition-all group relative font-black"
                                title="Duyệt lần 2 (Y)"
                              >
                                Y
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Duyệt 2</span>
                              </button>
                              <button 
                                onClick={() => handleSpecialTaskApproval(task, 2, 'REJECTED')} 
                                className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-all group relative font-black"
                                title="Từ chối lần 2 (X)"
                              >
                                X
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Hủy 2</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-500 italic uppercase font-black tracking-widest">Chưa có nhiệm vụ nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'mods' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-widest text-accent italic">Quản lý bản Mod</h3>
              <p className="text-xs text-gray-400 font-bold uppercase">Tổng cộng: {mods.length} bản mod</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mods.map((mod) => (
                <div key={mod.id} className="glass p-6 rounded-3xl border-accent/10 flex flex-col justify-between">
                  <div>
                    <div className="w-full h-32 bg-white/5 rounded-2xl mb-4 overflow-hidden">
                      {mod.image_url ? (
                        <img src={mod.image_url} alt={mod.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <ImageIcon size={32} />
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-white mb-2">{mod.title}</h4>
                    <p className="text-[10px] text-gray-400 line-clamp-2 mb-4">{mod.description}</p>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[8px] font-black uppercase px-2 py-1 bg-accent/10 text-accent rounded-full border border-accent/20">
                        {mod.category}
                      </span>
                      <span className="text-[8px] font-black uppercase px-2 py-1 bg-white/5 text-gray-400 rounded-full border border-white/10">
                        v{mod.version}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-gray-500">
                      <TrendingUp size={12} />
                      <span className="text-[10px] font-bold uppercase">{mod.download_count || 0} lượt tải</span>
                    </div>
                    <button 
                      onClick={() => deleteMod(mod.id)}
                      className="text-red-500 hover:text-red-400 transition-colors"
                      title="Xóa mod"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {mods.length === 0 && (
                <div className="col-span-full py-20 text-center glass rounded-3xl">
                  <Server className="mx-auto text-gray-600 mb-4" size={48} />
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-widest italic">Chưa có bản mod nào được đăng tải</p>
                </div>
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
              <h3 className="text-sm font-black uppercase text-accent tracking-widest">
                {selectedPayout?.details?.type === 'momo' || selectedPayout?.details?.type === 'zalopay' ? 'Thanh toán Ví điện tử' : 'Thanh toán VietQR'}
              </h3>
              
              {selectedPayout?.details?.type === 'momo' || selectedPayout?.details?.type === 'zalopay' ? (
                <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <PaymentQR 
                    userPhone={selectedPayout?.details?.phone || ''} 
                    withdrawAmount={selectedPayout?.amount || 0} 
                    orderId={selectedPayout?.id || ''} 
                  />
                </div>
              ) : (
                <div className="bg-white p-4 rounded-[2rem] inline-block mx-auto shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <img 
                    src={getVietQRUrl(selectedPayout)} 
                    alt="VietQR" 
                    className="w-64 h-64"
                  />
                </div>
              )}

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

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass w-full max-w-md p-8 space-y-6 relative z-10 rounded-[2.5rem] border-accent/20"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-widest text-accent italic">Sửa Thành Viên</h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Thành viên</p>
                  <p className="text-lg font-black text-white">{editingUser.username}</p>
                  <p className="text-[10px] text-gray-400">{editingUser.email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Số dư hiện tại (Xu)</label>
                  <input 
                    type="number" 
                    value={newBalance}
                    onChange={(e) => setNewBalance(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-lg font-black text-accent outline-none focus:border-accent/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    onClick={() => setEditingUser(null)}
                    className="py-4 rounded-xl text-[11px] font-black tracking-widest uppercase border border-white/10 text-gray-400 hover:bg-white/5 transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={updateUserBalance}
                    disabled={isUpdatingUser}
                    className="btn-primary py-4 rounded-xl text-[11px] font-black tracking-widest uppercase flex items-center justify-center gap-2"
                  >
                    {isUpdatingUser ? (
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    ) : (
                      <Check size={16} />
                    )}
                    Cập nhật
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Maintenance Modal */}
        {showMaintenanceModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMaintenanceModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass p-8 w-full max-w-2xl relative z-10 rounded-[40px] border-accent/20 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black uppercase text-accent tracking-widest">Bảo trì nhiệm vụ</h3>
                <button onClick={() => setShowMaintenanceModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest">Nhiệm vụ chính</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.keys(TASK_DATA).map(taskId => (
                      <div key={taskId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold text-white truncate mr-2">{taskId}</span>
                        <button 
                          onClick={() => toggleMaintenanceTask(taskId)}
                          className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${
                            maintenanceTasks.includes(taskId) 
                              ? 'bg-red-500 text-white' 
                              : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'
                          }`}
                        >
                          {maintenanceTasks.includes(taskId) ? 'Đang bảo trì' : 'Hoạt động'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest">Nhiệm vụ đặc biệt</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SPECIAL_TASKS_LIST.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold text-white truncate mr-2">{task.name}</span>
                        <button 
                          onClick={() => toggleMaintenanceTask(task.id)}
                          className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${
                            maintenanceTasks.includes(task.id) 
                              ? 'bg-red-500 text-white' 
                              : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'
                          }`}
                        >
                          {maintenanceTasks.includes(task.id) ? 'Đang bảo trì' : 'Hoạt động'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => setShowMaintenanceModal(false)}
                  className="w-full py-4 btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                  Hoàn tất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Confirmation Modal */}
        {confirmModal.show && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal({ ...confirmModal, show: false })}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass p-8 w-full max-w-sm text-center space-y-6 relative z-10 rounded-[40px] border-accent/20"
            >
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${confirmModal.action === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                {confirmModal.action === 'APPROVED' ? <Check size={32} /> : <X size={32} />}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase text-white tracking-widest">Xác nhận hành động</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed">
                  Bạn có chắc chắn muốn <span className={confirmModal.action === 'APPROVED' ? 'text-emerald-500' : 'text-red-500'}>{confirmModal.actionText}</span> nhiệm vụ này ở <span className="text-accent">LẦN {confirmModal.stage}</span>?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                  className="py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400"
                >
                  Hủy
                </button>
                <button 
                  onClick={confirmSpecialTaskAction}
                  className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-black ${confirmModal.action === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'}`}
                >
                  Xác nhận
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
