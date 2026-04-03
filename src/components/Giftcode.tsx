import React, { useState } from 'react';
import { Gift, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../supabase';

interface GiftcodeProps {
  userId: string;
  onUpdateProfile?: () => void;
}

export default function Giftcode({ userId, onUpdateProfile }: GiftcodeProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleRedeem = async () => {
    if (!code.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mã giftcode' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const upperCode = code.trim().toUpperCase();

      // 1. Check if giftcode exists and is valid
      const { data: giftcode, error: fetchError } = await supabase
        .from('giftcodes')
        .select('*')
        .eq('code', upperCode)
        .single();

      if (fetchError || !giftcode) {
        throw new Error('Mã giftcode không tồn tại hoặc đã hết hạn');
      }

      if (giftcode.current_uses >= giftcode.max_uses) {
        throw new Error('Mã giftcode đã hết lượt sử dụng');
      }

      if (giftcode.expires_at && new Date(giftcode.expires_at) < new Date()) {
        throw new Error('Mã giftcode đã hết hạn');
      }

      // 2. Check if user already used this code
      const { data: existingUse, error: useError } = await supabase
        .from('giftcode_uses')
        .select('id')
        .eq('giftcode_id', giftcode.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (useError) {
        console.error('Error checking existing use:', useError);
        throw new Error('Có lỗi xảy ra khi kiểm tra lịch sử sử dụng');
      }

      if (existingUse) {
        throw new Error('Bạn đã sử dụng mã giftcode này rồi');
      }

      // 3. Record the use
      const { error: insertError } = await supabase
        .from('giftcode_uses')
        .insert({
          giftcode_id: giftcode.id,
          user_id: userId
        });

      if (insertError) throw new Error('Có lỗi xảy ra khi lưu lịch sử, vui lòng thử lại');

      // 4. Update giftcode uses
      const { error: updateError } = await supabase
        .from('giftcodes')
        .update({ current_uses: giftcode.current_uses + 1 })
        .eq('id', giftcode.id);

      if (updateError) throw new Error('Có lỗi xảy ra khi cập nhật mã, vui lòng thử lại');

      // 5. Add reward to user balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();

      if (profileError) throw new Error('Không thể lấy thông tin số dư');

      const newBalance = (profile.balance || 0) + giftcode.reward;

      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId);

      if (balanceError) throw new Error('Không thể cập nhật số dư');

      // 6. Record transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: giftcode.reward,
          type: 'GIFTCODE',
          description: `Nhập mã giftcode: ${upperCode}`
        });

      if (onUpdateProfile) {
        onUpdateProfile();
      }
      
      setMessage({ type: 'success', text: `Nhập mã thành công! Bạn nhận được ${giftcode.reward} XU` });
      setCode('');

    } catch (error: any) {
      console.error('Giftcode error:', error);
      if (error.message?.includes('relation "giftcodes" does not exist')) {
        setMessage({ type: 'error', text: 'Tính năng giftcode đang được bảo trì (chưa có bảng dữ liệu)' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra, vui lòng thử lại sau' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden border-accent/20">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 flex items-center justify-center border border-fuchsia-100">
            <Gift className="text-accent" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">Nhập Giftcode</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nhận phần thưởng hấp dẫn</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">
              Mã Giftcode
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="NHẬP MÃ TẠI ĐÂY..."
              className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all uppercase"
            />
          </div>

          {message && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 border border-green-100 text-green-600' : 'bg-red-50 border border-red-100 text-red-600'}`}>
              {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <XCircle size={18} className="shrink-0 mt-0.5" />}
              <p className="text-xs font-bold">{message.text}</p>
            </div>
          )}

          <button
            onClick={handleRedeem}
            disabled={isLoading || !code.trim()}
            className="w-full py-3.5 bg-accent text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                ĐANG KIỂM TRA...
              </>
            ) : (
              'NHẬN THƯỞNG'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
