import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  UserRound, 
  History, 
  ShieldCheck, 
  UserPlus, 
  Book, 
  LogOut, 
  ChevronRight,
  Info,
  Copy,
  Check,
  ShieldAlert,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../context/NotificationContext';
import IdentityVerification from './IdentityVerification';
import DeleteAccountVerification from './DeleteAccountVerification';
import { EffectType, effectNames } from './EffectsManager';
import { supabase } from '../supabase';
import { getLevelInfo } from '../utils/levelUtils';

interface SettingsProps {
  profile: any;
  onLogout: () => void;
  onBack: () => void;
  onOpenAdmin: () => void;
  onVerifySuccess: () => void;
  showVerifyRedDot?: boolean;
  currentEffect: EffectType;
  onEffectChange: (effect: EffectType) => void;
}

type SettingsPage = 'profile' | 'history' | 'referral' | 'security' | 'guide' | 'contact' | 'report';

export default function Settings({ profile, onLogout, onBack, onOpenAdmin, onVerifySuccess, showVerifyRedDot, currentEffect, onEffectChange }: SettingsProps) {
  const { showNotification } = useNotification();
  const [activePage, setActivePage] = useState<SettingsPage>('profile');
  const [securityTab, setSecurityTab] = useState<'pw' | 'verify'>('pw');
  const [copied, setCopied] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [reportText, setReportText] = useState('');
  const [reporting, setReporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (activePage === 'history') {
      fetchHistory();
    }
  }, [activePage]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, withdrawals(*)')
        .eq('user_id', profile.id)
        .neq('type', 'TASK') // Exclude TASK transactions
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const ADMIN_ID = "22072009";

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const pageTitles: Record<SettingsPage, string> = {
    profile: 'Hồ Sơ',
    history: 'Lịch Sử',
    referral: 'Giới Thiệu',
    security: 'Bảo Mật',
    guide: 'Hướng Dẫn',
    contact: 'Liên Hệ',
    report: 'Báo Lỗi'
  };

  const levelInfo = profile ? getLevelInfo(profile.exp || 0) : { level: 1, vip: 1, currentLevelExp: 0, nextLevelExp: 10, progress: 0 };

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 text-center relative overflow-hidden md:col-span-1 border-accent/20 bg-accent/5 shadow-lg rounded-3xl">
          <div className="w-20 h-20 bg-accent/10 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-accent/20">
            <UserRound size={40} className="text-accent" />
          </div>
          <h3 className="text-xl font-black italic tracking-tighter text-slate-900">{profile?.username || '0'}</h3>
          <div className="text-[8px] px-2 py-1 rounded bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black uppercase mt-2 inline-block">
            VIP {levelInfo.vip}
          </div>
          
          {profile?.is_admin && (
            <p className="text-[10px] text-accent font-black tracking-widest mt-2">ID: {ADMIN_ID}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[9px] text-slate-600 uppercase font-bold">Số dư</p>
              <p className="text-accent font-black">{profile?.balance.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[9px] text-slate-600 uppercase font-bold">Nhiệm vụ</p>
              <p className="text-accent font-black">{profile?.tasks_total || 0}</p>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm mt-4">
            <p className="text-[9px] text-slate-600 uppercase font-bold mb-2">Hiệu ứng nền</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent shadow-md" />
              <span className="text-[10px] font-bold text-slate-800">Dải LED Neon (Mặc định)</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 h-fit">
          <MenuButton 
            icon={History} 
            label="Lịch sử giao dịch" 
            onClick={() => setActivePage('history')} 
          />
          <MenuButton 
            icon={ShieldCheck} 
            label="Bảo mật tài khoản" 
            onClick={() => setActivePage('security')} 
            showDot={showVerifyRedDot}
          />
          <MenuButton 
            icon={UserPlus} 
            label="Mời bạn bè" 
            onClick={() => setActivePage('referral')} 
          />
          <MenuButton 
            icon={Book} 
            label="Hướng dẫn sử dụng" 
            onClick={() => setActivePage('guide')} 
          />
          <MenuButton 
            icon={Info} 
            label="Liên hệ hỗ trợ" 
            onClick={() => setActivePage('contact')} 
          />
          <MenuButton 
            icon={ShieldAlert} 
            label="Báo lỗi hệ thống" 
            onClick={() => setActivePage('report')} 
          />
          {profile?.is_admin && (
            <button 
              onClick={onOpenAdmin}
              className="bg-white p-5 flex justify-between items-center border border-accent/20 hover:bg-accent/5 sm:col-span-2 group transition-all rounded-2xl shadow-md"
            >
              <div className="flex items-center gap-4 text-accent">
                <ShieldAlert size={20} />
                <span className="text-sm font-bold uppercase">Quản trị hệ thống (Admin)</span>
              </div>
              <ChevronRight size={14} className="text-accent" />
            </button>
          )}
          <button 
            onClick={onLogout}
            className="bg-rose-50 p-5 flex justify-between items-center border border-red-100 hover:bg-rose-100 sm:col-span-2 group transition-all rounded-2xl shadow-md"
          >
            <div className="flex items-center gap-4 text-rose-600">
              <LogOut size={20} />
              <span className="text-sm font-bold uppercase">Đăng xuất tài khoản</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => {
    const filteredTransactions = transactions.filter(tx => {
      if (historyFilter === 'ALL') return true;
      if (historyFilter === 'IN') return tx.type === 'REFERRAL' || tx.type === 'REFUND';
      if (historyFilter === 'OUT') return tx.type === 'WITHDRAW';
      return true;
    });

    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setHistoryFilter('ALL')}
            className={`${historyFilter === 'ALL' ? 'bg-accent text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'} text-[9px] font-black px-6 py-2 rounded-full transition-all`}
          >
            TẤT CẢ
          </button>
          <button 
            onClick={() => setHistoryFilter('IN')}
            className={`${historyFilter === 'IN' ? 'bg-accent text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'} text-[9px] font-black px-6 py-2 rounded-full transition-all`}
          >
            HOA HỒNG
          </button>
          <button 
            onClick={() => setHistoryFilter('OUT')}
            className={`${historyFilter === 'OUT' ? 'bg-accent text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'} text-[9px] font-black px-6 py-2 rounded-full transition-all`}
          >
            RÚT TIỀN
          </button>
        </div>

        {loadingHistory ? (
          <div className="bg-white p-16 text-center rounded-3xl border border-slate-100">
            <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] text-slate-700 uppercase font-black tracking-widest">Đang tải lịch sử...</p>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="bg-white p-4 flex items-center justify-between group hover:bg-slate-50 transition-all rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === 'WITHDRAW' ? 'bg-red-50 text-red-600' : 
                    tx.type === 'REFUND' ? 'bg-blue-50 text-blue-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    {tx.type === 'WITHDRAW' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">{tx.description}</h4>
                    {tx.withdrawals && (
                      <div className="mt-1 space-y-0.5">
                        {tx.withdrawals.method === 'bank' && (
                          <p className="text-[8px] text-slate-600 font-bold uppercase">
                            {tx.withdrawals.details?.bank} - {tx.withdrawals.details?.stk}
                          </p>
                        )}
                        {tx.withdrawals.method === 'e-wallet' && (
                          <p className="text-[8px] text-slate-600 font-bold uppercase">
                            {tx.withdrawals.details?.type} - {tx.withdrawals.details?.phone}
                          </p>
                        )}
                        {tx.withdrawals.method === 'card' && (
                          <p className="text-[8px] text-slate-600 font-bold uppercase">
                            {tx.withdrawals.details?.type} - {tx.withdrawals.details?.cardEmail}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={10} className="text-slate-500" />
                      <span className="text-[9px] text-slate-500 font-bold uppercase">
                        {new Date(tx.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${
                    tx.type === 'WITHDRAW' ? 'text-red-600' : 
                    tx.type === 'REFUND' ? 'text-blue-600' :
                    'text-emerald-600'
                  }`}>
                    {tx.type === 'WITHDRAW' ? '-' : '+'}{tx.amount.toLocaleString()}
                  </p>
                  <div className="flex justify-end mt-1">
                    <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      tx.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                      tx.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 
                      'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {tx.status === 'COMPLETED' ? 'Thành công' : tx.status === 'PENDING' ? 'Đang chờ' : 'Đã hủy'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-16 text-center rounded-3xl border border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Book size={32} className="text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Không có giao dịch nào</p>
          </div>
        )}
      </div>
    );
  };

  const renderReferral = () => {
    const referralCode = profile?.referral_code || '0';
    const referralLink = `${window.location.origin}/?ref=${referralCode}`;

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-white p-8 text-center space-y-8 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Mã Giới Thiệu Của Bạn</h3>
            <div className="bg-slate-50 border border-accent/30 p-5 rounded-2xl flex items-center justify-between">
              <span className="text-2xl font-black text-accent tracking-[0.2em]">WMX-{referralCode}</span>
              <button 
                onClick={() => handleCopy(`WMX-${referralCode}`, 'code')}
                className="text-[10px] bg-accent text-white px-4 py-2 rounded-lg font-black uppercase flex items-center gap-2"
              >
                {copied === 'code' ? <Check size={12} /> : <Copy size={12} />}
                {copied === 'code' ? 'Đã chép' : 'Sao chép'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Đường Dẫn Giới Thiệu</h3>
            <div className="bg-slate-50 border border-accent/30 p-5 rounded-2xl flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-600 font-bold truncate">{referralLink}</span>
              <button 
                onClick={() => handleCopy(referralLink, 'link')}
                className="shrink-0 text-[10px] bg-accent text-white px-4 py-2 rounded-lg font-black uppercase flex items-center gap-2"
              >
                {copied === 'link' ? <Check size={12} /> : <Copy size={12} />}
                {copied === 'link' ? 'Đã chép' : 'Sao chép'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-accent font-black uppercase">Hoa hồng: 1,000 Xu / Người</p>
            <p className="text-[10px] text-slate-500 italic">Điều kiện: Người được giới thiệu phải có số dư từ 1,500 Xu trở lên.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 text-center rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Người đã mời</p>
            <p className="text-2xl font-black text-accent">0</p>
          </div>
          <div className="bg-white p-6 text-center rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Hoa hồng nhận</p>
            <p className="text-2xl font-black text-accent">0</p>
          </div>
        </div>
      </div>
    );
  };

  const handleDeleteAccount = async () => {
    try {
      const userId = profile.id;

      // 1. Xóa các giao dịch trước (vì có thể có foreign key tới withdrawals)
      await supabase.from('transactions').delete().eq('user_id', userId);
      
      // 2. Xóa các dữ liệu liên quan khác
      await Promise.all([
        supabase.from('withdrawals').delete().eq('user_id', userId),
        supabase.from('payment_proofs').delete().eq('user_id', userId),
        supabase.from('reports').delete().eq('user_id', userId),
        supabase.from('game_logs').delete().eq('user_id', userId)
      ]);

      // 3. Xóa profile cuối cùng
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      
      // 4. Đăng xuất và xóa session
      await supabase.auth.signOut();
      
      showNotification({
        title: "ĐÃ XÓA TÀI KHOẢN",
        message: "Toàn bộ dữ liệu của bạn đã được xóa sạch khỏi hệ thống.",
        type: "success"
      });
      
      onLogout();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      showNotification({
        title: "LỖI",
        message: "Không thể xóa toàn bộ dữ liệu. Vui lòng liên hệ Admin.",
        type: "error"
      });
    }
  };

  const renderSecurity = () => {
    if (showDeleteConfirm) {
      return (
        <DeleteAccountVerification
          email={profile?.email || ''}
          onSuccess={handleDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      );
    }

    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setSecurityTab('pw')} 
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${securityTab === 'pw' ? 'bg-accent text-white' : 'text-slate-500'}`}
          >
            Đổi mật khẩu
          </button>
          <button 
            onClick={() => setSecurityTab('verify')} 
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition relative ${securityTab === 'verify' ? 'bg-accent text-white' : 'text-slate-500'}`}
          >
            Xác minh Email
            {showVerifyRedDot && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444] animate-pulse"></span>
            )}
          </button>
        </div>

        {securityTab === 'pw' ? (
          <div className="bg-white p-8 space-y-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="space-y-4">
              <input type="password" placeholder="Mật khẩu hiện tại" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-accent/50 text-slate-900" />
              <input type="password" placeholder="Mật khẩu mới" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-accent/50 text-slate-900" />
              <button className="w-full btn-primary py-4 rounded-xl text-[11px] font-black tracking-widest uppercase mt-4">Cập nhật mật khẩu</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {profile?.is_verified ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 text-center space-y-4 rounded-3xl border border-slate-100 shadow-sm"
              >
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-widest text-emerald-600">Đã Xác Minh Uy Tín</h3>
                <p className="text-xs text-slate-600">Tài khoản của bạn đã được xác minh để nâng cao uy tín và bảo mật tránh mất hoặc hack.</p>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Email liên kết</p>
                  <p className="text-sm font-bold text-slate-900">{profile?.email}</p>
                </div>
              </motion.div>
            ) : (
              <IdentityVerification 
                email={profile?.email || ''}
                onSuccess={onVerifySuccess}
                onCancel={() => setSecurityTab('pw')}
              />
            )}
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-slate-100">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-4 rounded-xl text-[11px] font-black tracking-widest uppercase bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
          >
            <ShieldAlert size={16} />
            Xóa tài khoản
          </button>
        </div>
      </div>
    );
  };

  const renderContact = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 space-y-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-widest text-accent mb-4">Thông tin liên hệ</h3>
        <div className="space-y-4">
          <a href="https://t.me/VanhTRUM" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition border border-slate-100">
            <span className="text-accent font-black">TELE ADMIN</span>
            <span className="text-xs text-slate-600">@VanhTRUM</span>
          </a>
          <a href="https://zalo.me/0337117930" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition border border-slate-100">
            <span className="text-accent font-black">ZALO ADMIN</span>
            <span className="text-xs text-slate-600">0337117930</span>
          </a>
          <a href="https://t.me/+Drg0EEs27Nw1ZTdl" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition border border-slate-100">
            <span className="text-accent font-black">NHÓM TELE</span>
            <span className="text-xs text-slate-600">Tham gia nhóm</span>
          </a>
          <a href="https://zalo.me/g/ogveojfwhm3n4ballgzy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition border border-slate-100">
            <span className="text-accent font-black">NHÓM ZALO</span>
            <span className="text-xs text-slate-600">Tham gia nhóm</span>
          </a>
        </div>
      </div>
    </div>
  );

  const renderGuide = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 space-y-6 text-left rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-widest text-accent mb-4">Hướng dẫn sử dụng wmoneyX</h3>
        
        <div className="space-y-6">
          <section>
            <h4 className="text-xs font-black uppercase text-slate-900 mb-2">1. Cách kiếm tiền</h4>
            <ul className="text-[11px] text-slate-600 space-y-2 list-disc ml-4">
              <li>Hoàn thành các nhiệm vụ hàng ngày trong mục <span className="text-accent">"Nhiệm Vụ"</span>.</li>
              <li>Tham gia các trò chơi trong mục <span className="text-accent">"Thưởng Ngày"</span> (Bóc túi mù, Vòng quay may mắn).</li>
              <li>Giới thiệu bạn bè tham gia để nhận hoa hồng <span className="text-accent">1,000 Xu</span> cho mỗi người.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-xs font-black uppercase text-slate-900 mb-2">2. Điều kiện nhận hoa hồng</h4>
            <p className="text-[11px] text-slate-600">
              Người được giới thiệu phải đạt số dư từ <span className="text-accent">1,500 Xu</span> trở lên thì người giới thiệu mới nhận được thưởng.
            </p>
          </section>

          <section>
            <h4 className="text-xs font-black uppercase text-slate-900 mb-2">3. Cấp độ và VIP</h4>
            <ul className="text-[11px] text-slate-600 space-y-2 list-disc ml-4">
              <li>Tích lũy EXP từ các hoạt động để tăng cấp độ.</li>
              <li>Cấp độ càng cao, quyền lợi VIP càng lớn, giúp tăng thu nhập từ nhiệm vụ.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-xs font-black uppercase text-slate-900 mb-2">4. Rút tiền</h4>
            <ul className="text-[11px] text-slate-600 space-y-2 list-disc ml-4">
              <li>Bạn có thể rút tiền về Ngân hàng, Ví điện tử hoặc Thẻ cào.</li>
              <li>Đảm bảo tài khoản đã được <span className="text-accent">xác minh email</span> để thực hiện rút tiền.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-xs font-black uppercase text-slate-900 mb-2">5. Hỗ trợ</h4>
            <p className="text-[11px] text-slate-600">
              Nếu gặp lỗi, hãy sử dụng mục "Báo lỗi hệ thống" hoặc liên hệ trực tiếp với Admin qua Telegram/Zalo trong phần "Liên hệ hỗ trợ".
            </p>
          </section>
        </div>
      </div>
    </div>
  );

  const renderReport = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 space-y-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-widest text-accent mb-4">Báo cáo lỗi</h3>
        <textarea 
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          placeholder="Mô tả lỗi bạn gặp phải..."
          className="w-full h-40 bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-accent/50 text-slate-900"
        />
        <button 
          onClick={async () => {
            if (!reportText.trim()) return;
            setReporting(true);
            await supabase.from('reports').insert([{ user_id: profile.id, content: reportText }]);
            setReporting(false);
            setReportText('');
            showNotification({ title: 'Thành công', message: 'Đã gửi báo cáo', type: 'success' });
          }}
          disabled={reporting || !reportText.trim()}
          className="w-full btn-primary py-4 rounded-xl text-[11px] font-black tracking-widest uppercase"
        >
          {reporting ? 'Đang gửi...' : 'Gửi báo cáo'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ contain: 'content' }}>
      <header className="flex items-center gap-4 py-6 mb-8">
        <button 
          onClick={() => activePage === 'profile' ? onBack() : setActivePage('profile')} 
          className="w-10 h-10 glass flex items-center justify-center text-accent shrink-0 hover:bg-accent hover:text-black transition-all"
          style={{ willChange: 'transform' }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-black uppercase tracking-widest ocean-glow">{pageTitles[activePage]}</h2>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transform: 'translate3d(0,0,0)' }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          style={{ willChange: 'transform, opacity' }}
        >
          {activePage === 'profile' && renderProfile()}
          {activePage === 'history' && renderHistory()}
          {activePage === 'referral' && renderReferral()}
          {activePage === 'security' && renderSecurity()}
          {activePage === 'guide' && renderGuide()}
          {activePage === 'contact' && renderContact()}
          {activePage === 'report' && renderReport()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function MenuButton({ icon: Icon, label, onClick, showDot }: { icon: any, label: string, onClick: () => void, showDot?: boolean }) {
  return (
    <button onClick={onClick} className="bg-white p-5 flex justify-between items-center border border-slate-100 hover:bg-slate-50 transition-all group relative rounded-2xl shadow-sm">
      <div className="flex items-center gap-4">
        <Icon size={20} className="text-accent group-hover:scale-110 transition-transform" /> 
        <span className="text-sm font-bold uppercase tracking-tight text-slate-900">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {showDot && (
          <span className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444] animate-pulse"></span>
        )}
        <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}
