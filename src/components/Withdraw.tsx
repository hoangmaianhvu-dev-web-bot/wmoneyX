import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  Landmark, 
  Smartphone, 
  Ticket, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';
import IdentityVerification from './IdentityVerification';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface WithdrawProps {
  balance: number;
  userId: string;
  email: string;
  isVerified: boolean;
  onBack: () => void;
  onUpdateBalance: (newBalance: number) => void;
  onVerifySuccess: () => void;
}

type WithdrawMethod = 'bank' | 'e-wallet' | 'card';

const Withdraw: React.FC<WithdrawProps> = ({ balance, userId, email, isVerified, onBack, onUpdateBalance, onVerifySuccess }) => {
  const { showNotification } = useNotification();
  const [method, setMethod] = useState<WithdrawMethod>('bank');
  const [amount, setAmount] = useState<string>('');
  const [bank, setBank] = useState<string>('');
  const [stk, setStk] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [walletType, setWalletType] = useState<string>('momo');
  const [cardType, setCardType] = useState<string>('viettel');
  const [cardEmail, setCardEmail] = useState<string>(email);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const hcaptchaRef = useRef<HCaptcha>(null);

  useEffect(() => {
    fetchWithdrawals();
  }, [userId]);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!isVerified) {
      showNotification({
        title: "YÊU CẦU XÁC MINH",
        message: "Bạn cần xác minh tài khoản để rút tiền. Xác minh giúp nâng cao uy tín và bảo mật, tránh mất hoặc hack tài khoản.",
        type: "error"
      });
      setShowVerification(true);
      return;
    }

    const numAmount = Number(amount);
    if (!amount || numAmount < 10000) {
      showNotification({
        title: "Lỗi",
        message: "Số tiền rút tối thiểu là 10,000 Xu",
        type: "error"
      });
      return;
    }
    
    if (numAmount > balance) {
      showNotification({
        title: "Lỗi",
        message: "Số dư không đủ để thực hiện giao dịch này.",
        type: "error"
      });
      return;
    }

    if (!captchaToken) {
      showNotification({
        title: "Lỗi",
        message: "Vui lòng hoàn thành mã xác thực hCaptcha.",
        type: "error"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Verify hCaptcha server-side
      const verifyResponse = await fetch('/api/verify-hcaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      });
      const verifyData = await verifyResponse.json();
      
      if (!verifyData.success) {
        showNotification({
          title: "Lỗi",
          message: "Xác thực hCaptcha thất bại. Vui lòng thử lại.",
          type: "error"
        });
        hcaptchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        setIsSubmitting(false);
        return;
      }

      const numAmount = Number(amount);
      const newBalance = balance - numAmount;
      
      // 1. Prepare details based on method
      let details: any = {};
      if (method === 'bank') {
        details = { bank, stk, name };
      } else if (method === 'e-wallet') {
        details = { type: walletType, phone, name };
      } else if (method === 'card') {
        details = { type: cardType, cardEmail };
      }

      // 2. Insert withdrawal request
      const { data: withdrawData, error: withdrawError } = await supabase
        .from('withdrawals')
        .insert([{
          user_id: userId,
          email: email,
          amount: numAmount,
          method: method,
          status: 'PENDING',
          details: details
        }])
        .select()
        .single();

      if (withdrawError) throw withdrawError;

      // 2.5 Record transaction
      await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: 'WITHDRAW',
          amount: numAmount,
          description: `Rút tiền (${method.toUpperCase()})`,
          status: 'PENDING',
          withdrawal_id: withdrawData.id
        }]);

      // 3. Update balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId);

      if (balanceError) throw balanceError;

      onUpdateBalance(newBalance);
      setIsSubmitting(false);
      setShowSuccess(true);
      showNotification({
        title: "Yêu cầu đã gửi",
        message: "Yêu cầu rút tiền của bạn đang được xử lý.",
        type: "success"
      });
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      showNotification({
        title: "Lỗi",
        message: error.message || "Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại.",
        type: "error"
      });
      setIsSubmitting(false);
    }
  };

  if (showVerification) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-4 py-4">
          <button 
            onClick={() => setShowVerification(false)}
            className="w-10 h-10 glass flex items-center justify-center text-accent shrink-0 rounded-xl"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-black uppercase tracking-widest text-accent italic">Xác Minh</h2>
        </header>
        
        <IdentityVerification 
          email={email}
          onSuccess={() => {
            setShowVerification(false);
            onVerifySuccess();
          }}
          onCancel={() => setShowVerification(false)}
        />
      </div>
    );
  }

  if (showSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-widest mb-2 text-emerald-500">Thành Công!</h2>
        <p className="text-gray-400 text-sm max-w-xs mb-8">
          Yêu cầu rút {Number(amount).toLocaleString()} Xu đã được gửi. Vui lòng chờ hệ thống kiểm duyệt trong khung giờ 22h-23h hàng ngày.
        </p>
        <button 
          onClick={onBack}
          className="btn-primary px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest"
        >
          Quay lại trang chủ
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4 py-4">
        <button 
          onClick={onBack}
          className="w-10 h-10 glass flex items-center justify-center text-accent shrink-0 rounded-xl"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-black uppercase tracking-widest text-accent italic">Rút Tiền</h2>
      </header>

      <div className="space-y-6">
        {/* Tab chuyển đổi phương thức */}
        <div className="grid grid-cols-3 gap-2 p-1 glass rounded-2xl">
          <button 
            onClick={() => setMethod('bank')}
            className={`py-3 rounded-xl flex flex-col items-center gap-1 transition ${method === 'bank' ? 'bg-accent text-black' : 'text-gray-500 hover:text-white'}`}
          >
            <Landmark size={16} />
            <span className="text-[8px] font-black uppercase">Ngân Hàng</span>
          </button>
          <button 
            onClick={() => setMethod('e-wallet')}
            className={`py-3 rounded-xl flex flex-col items-center gap-1 transition ${method === 'e-wallet' ? 'bg-accent text-black' : 'text-gray-500 hover:text-white'}`}
          >
            <Smartphone size={16} />
            <span className="text-[8px] font-black uppercase">Ví MoMo/ZL</span>
          </button>
          <button 
            onClick={() => setMethod('card')}
            className={`py-3 rounded-xl flex flex-col items-center gap-1 transition ${method === 'card' ? 'bg-accent text-black' : 'text-gray-500 hover:text-white'}`}
          >
            <Ticket size={16} />
            <span className="text-[8px] font-black uppercase">Thẻ Cào/Game</span>
          </button>
        </div>

        <div className="glass p-6 md:p-8 space-y-6 rounded-3xl">
          {/* Form Ngân Hàng */}
          {method === 'bank' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Chọn Ngân Hàng</label>
                <div className="relative">
                  <select 
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full bg-zinc-900/80 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-accent/50 appearance-none text-white"
                  >
                    <option value="" className="bg-zinc-900">-- Chọn ngân hàng --</option>
                    <option value="vcb" className="bg-zinc-900">Vietcombank</option>
                    <option value="tcb" className="bg-zinc-900">Techcombank</option>
                    <option value="mb" className="bg-zinc-900">MB Bank</option>
                    <option value="vpb" className="bg-zinc-900">VPBank</option>
                    <option value="acb" className="bg-zinc-900">ACB</option>
                    <option value="vtb" className="bg-zinc-900">VietinBank</option>
                    <option value="bidv" className="bg-zinc-900">BIDV</option>
                    <option value="tpb" className="bg-zinc-900">TPBank</option>
                    <option value="agri" className="bg-zinc-900">Agribank</option>
                    <option value="shb" className="bg-zinc-900">SHB</option>
                    <option value="hdb" className="bg-zinc-900">HDBank</option>
                    <option value="scb" className="bg-zinc-900">SCB</option>
                    <option value="stb" className="bg-zinc-900">Sacombank</option>
                    <option value="vab" className="bg-zinc-900">VietA Bank</option>
                    <option value="ocb" className="bg-zinc-900">OCB</option>
                    <option value="msb" className="bg-zinc-900">MSB</option>
                    <option value="sea" className="bg-zinc-900">SeABank</option>
                    <option value="vbb" className="bg-zinc-900">VietBank</option>
                    <option value="pvn" className="bg-zinc-900">PVcomBank</option>
                    <option value="abb" className="bg-zinc-900">ABBANK</option>
                    <option value="bab" className="bg-zinc-900">Bac A Bank</option>
                    <option value="bvb" className="bg-zinc-900">BaoViet Bank</option>
                    <option value="vccb" className="bg-zinc-900">Viet Capital Bank</option>
                    <option value="exim" className="bg-zinc-900">Eximbank</option>
                    <option value="lienviet" className="bg-zinc-900">LPBank</option>
                    <option value="namabank" className="bg-zinc-900">Nam A Bank</option>
                    <option value="ncb" className="bg-zinc-900">NCB</option>
                    <option value="pgb" className="bg-zinc-900">PGBank</option>
                    <option value="saigonbank" className="bg-zinc-900">Saigonbank</option>
                    <option value="uob" className="bg-zinc-900">UOB</option>
                    <option value="woori" className="bg-zinc-900">Woori Bank</option>
                    <option value="shinhan" className="bg-zinc-900">Shinhan Bank</option>
                    <option value="cbbank" className="bg-zinc-900">CBBank</option>
                    <option value="oceanbank" className="bg-zinc-900">OceanBank</option>
                    <option value="gpbank" className="bg-zinc-900">GPBank</option>
                    <option value="cake" className="bg-zinc-900">CAKE by VPBank</option>
                    <option value="ubank" className="bg-zinc-900">Ubank</option>
                    <option value="timo" className="bg-zinc-900">Timo</option>
                    <option value="kbank" className="bg-zinc-900">KBank</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <input 
                type="text" 
                placeholder="Số tài khoản" 
                value={stk}
                onChange={(e) => setStk(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-accent/50 text-white" 
              />
              <input 
                type="text" 
                placeholder="Tên chủ tài khoản (VIẾT HOA KHÔNG DẤU)" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-accent/50 text-white" 
              />
            </div>
          )}

          {/* Form Ví Điện Tử */}
          {method === 'e-wallet' && (
            <div className="space-y-4">
              <div className="flex gap-4 mb-4">
                <label className="flex-1 cursor-pointer">
                  <input 
                    type="radio" 
                    name="ewallet" 
                    value="momo" 
                    checked={walletType === 'momo'}
                    onChange={(e) => setWalletType(e.target.value)}
                    className="hidden peer" 
                  />
                  <div className="glass p-4 text-center peer-checked:border-accent peer-checked:bg-accent/5 transition rounded-2xl">
                    <span className="text-[10px] font-black uppercase">MoMo</span>
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input 
                    type="radio" 
                    name="ewallet" 
                    value="zalopay" 
                    checked={walletType === 'zalopay'}
                    onChange={(e) => setWalletType(e.target.value)}
                    className="hidden peer" 
                  />
                  <div className="glass p-4 text-center peer-checked:border-accent peer-checked:bg-accent/5 transition rounded-2xl">
                    <span className="text-[10px] font-black uppercase">ZaloPay</span>
                  </div>
                </label>
              </div>
              <input 
                type="text" 
                placeholder="Số điện thoại ví" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-accent/50 text-white" 
              />
              <input 
                type="text" 
                placeholder="Tên chủ ví" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-accent/50 text-white" 
              />
            </div>
          )}

          {/* Form Thẻ Cào/Game */}
          {method === 'card' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Loại thẻ</label>
                <div className="relative">
                  <select 
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    className="w-full bg-zinc-900/80 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-accent/50 appearance-none text-white"
                  >
                    <option value="viettel" className="bg-zinc-900">Viettel</option>
                    <option value="vinaphone" className="bg-zinc-900">Vinaphone</option>
                    <option value="mobifone" className="bg-zinc-900">Mobifone</option>
                    <option value="garena" className="bg-zinc-900">Garena</option>
                    <option value="zing" className="bg-zinc-900">Zing (Vinagame)</option>
                    <option value="vcoin" className="bg-zinc-900">Vcoin</option>
                    <option value="gate" className="bg-zinc-900">Gate</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Email nhận mã thẻ</label>
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="Nhập email nhận mã thẻ" 
                    value={cardEmail}
                    onChange={(e) => setCardEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-accent/50 text-white" 
                  />
                  <button 
                    onClick={() => setCardEmail(email)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-accent uppercase hover:underline"
                  >
                    Dùng email đăng ký
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Nhập số tiền & Xác nhận */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-gray-500 font-bold uppercase">Số tiền rút (Xu)</span>
              <span className="text-xs text-accent font-black uppercase">Min: 10,000</span>
            </div>
            <div className="relative">
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Nhập số Xu muốn rút" 
                className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-xl font-black text-accent outline-none focus:border-accent/50" 
              />
              <button 
                onClick={() => setAmount(balance.toString())}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-accent uppercase hover:underline"
              >
                Tất cả
              </button>
            </div>
            
            <div className="flex justify-center py-2">
              <HCaptcha
                sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY || "74289632-2ab6-47a2-9046-dd6e37b09250"}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                ref={hcaptchaRef}
                theme="dark"
              />
            </div>

            <button 
              onClick={handleWithdraw}
              disabled={isSubmitting}
              className="w-full btn-primary py-5 rounded-2xl text-[11px] font-black tracking-[0.2em] uppercase mt-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận rút tiền'}
            </button>
            
            <div className="p-4 bg-white/5 rounded-2xl space-y-2">
              <p className="text-[10px] text-gray-400 flex items-center gap-2">
                <Clock size={12} className="text-accent" /> Thời gian xử lý: 22 giờ - 23 giờ hàng ngày.
              </p>
              <p className="text-[10px] text-gray-400 flex items-center gap-2">
                <AlertTriangle size={12} className="text-yellow-500" /> Kiểm tra kỹ thông tin trước khi xác nhận.
              </p>
            </div>
          </div>
        </div>
        
        {/* Lịch sử rút tiền */}
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-white px-4">Lịch sử rút tiền</h3>
          
          {withdrawals.length > 0 ? (
            Object.entries(
              withdrawals.reduce((groups: Record<string, any[]>, w) => {
                const date = new Date(w.created_at);
                const dateKey = date.toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(w);
                return groups;
              }, {})
            ).map(([date, items]: [string, any[]]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl w-fit ml-2 shadow-sm border border-emerald-100">
                  <span className="text-[10px] font-black uppercase tracking-wider">Ngày {date}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
                
                <div className="space-y-4 px-2">
                  {items.map((w) => {
                    const fee = 0;
                    const netAmount = w.amount;
                    const statusText = w.status === 'PENDING' ? 'Đang xử lý' : w.status === 'COMPLETED' ? 'Rút tiền thành công' : 'Rút tiền thất bại';
                    const statusColor = w.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' : w.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200';
                    
                    return (
                      <div key={w.id} className="bg-white rounded-[2rem] p-6 shadow-2xl text-black space-y-5 border border-gray-100 relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                        
                        <div className="flex justify-between items-start relative z-10">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-gray-900 tracking-tight">Rút tiền</span>
                              <div className={`w-1.5 h-1.5 rounded-full ${w.status === 'PENDING' ? 'bg-amber-500' : w.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                            </div>
                            <span className={`inline-block text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${statusColor}`}>
                              {statusText}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-gray-900">-{w.amount.toLocaleString('vi-VN')}</span>
                            <span className="text-[10px] font-black text-gray-400 ml-1 uppercase">Xu</span>
                          </div>
                        </div>
                        
                        <div className="space-y-3 pt-2 relative z-10">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Phí giao dịch (0%)</span>
                            <span className="text-gray-600 font-black">0 Xu</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] py-2 border-y border-gray-50">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Thực nhận</span>
                            <span className="text-emerald-600 font-black text-sm">{netAmount.toLocaleString('vi-VN')} Xu</span>
                          </div>
                          
                          <div className="pt-2 space-y-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Mã đơn hàng</span>
                              <span className="text-[10px] text-gray-500 font-mono bg-gray-50 p-2 rounded-lg break-all select-all border border-gray-100">
                                {w.id}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Thời gian tạo</span>
                              <span className="text-[10px] text-gray-600 font-bold">
                                {new Date(w.created_at).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour12: false
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="glass p-12 rounded-[2.5rem] text-center border-white/5">
              <Clock className="mx-auto text-gray-700 mb-4 opacity-20" size={48} />
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Chưa có lịch sử giao dịch</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
