import React, { useState, useEffect } from 'react';
import { Clock, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';

const RedEnvelopeIcon = ({ className = "", size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#ef4444" stroke="#facc15" strokeWidth="1.5"/>
    <path d="M4 8C9.5 11 14.5 11 20 8" stroke="#facc15" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="3" fill="#facc15" />
    <rect x="11" y="11" width="2" height="2" fill="#ef4444" />
  </svg>
);

interface RedEnvelopeWidgetProps {
  userId: string;
  profile: any;
  onUpdateProfile: () => void;
}

const RedEnvelopeWidget: React.FC<RedEnvelopeWidgetProps> = ({ userId, profile, onUpdateProfile }) => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [canClaimRedEnvelope, setCanClaimRedEnvelope] = useState(false);
  const [redEnvelopeTimeLeft, setRedEnvelopeTimeLeft] = useState<string>("");
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);

  useEffect(() => {
    const checkRedEnvelopeStatus = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Define the two time slots: 12:00 - 12:30 and 20:00 - 20:30
      const isNoonSlot = currentHour === 12 && currentMinute < 30;
      const isEveningSlot = currentHour === 20 && currentMinute < 30;
      
      const currentSlot = isNoonSlot ? 'noon' : (isEveningSlot ? 'evening' : null);
      
      let canClaim = false;
      if (currentSlot) {
        // Check if already claimed in this slot
        const lastClaim = profile?.last_red_envelope_claim;
        if (lastClaim) {
          const lastClaimDate = new Date(lastClaim);
          const isSameDay = lastClaimDate.toDateString() === now.toDateString();
          const lastClaimHour = lastClaimDate.getHours();
          const lastClaimMinute = lastClaimDate.getMinutes();
          
          const wasNoonClaim = lastClaimHour === 12 && lastClaimMinute < 30;
          const wasEveningClaim = lastClaimHour === 20 && lastClaimMinute < 30;
          
          if (isSameDay && ((currentSlot === 'noon' && wasNoonClaim) || (currentSlot === 'evening' && wasEveningClaim))) {
            canClaim = false;
          } else {
            canClaim = true;
          }
        } else {
          canClaim = true;
        }
      } else {
        canClaim = false;
      }
      
      setCanClaimRedEnvelope(canClaim);

      // Calculate next claim time
      let nextTime = new Date(now);
      if (currentHour < 12) {
        nextTime.setHours(12, 0, 0, 0);
      } else if (currentHour === 12 && currentMinute < 30) {
        if (!canClaim) {
          nextTime.setHours(20, 0, 0, 0);
        } else {
          nextTime.setHours(12, 0, 0, 0); // Already available
        }
      } else if (currentHour < 20) {
        nextTime.setHours(20, 0, 0, 0);
      } else if (currentHour === 20 && currentMinute < 30) {
        if (!canClaim) {
          nextTime.setDate(nextTime.getDate() + 1);
          nextTime.setHours(12, 0, 0, 0);
        } else {
          nextTime.setHours(20, 0, 0, 0); // Already available
        }
      } else {
        nextTime.setDate(nextTime.getDate() + 1);
        nextTime.setHours(12, 0, 0, 0);
      }
      setNextClaimTime(nextTime);
    };

    checkRedEnvelopeStatus();
    const interval = setInterval(checkRedEnvelopeStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [profile?.last_red_envelope_claim]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      
      // Red Envelope Countdown
      if (nextClaimTime && !canClaimRedEnvelope) {
        const reDiff = nextClaimTime.getTime() - now.getTime();
        if (reDiff > 0) {
          const reHours = Math.floor(reDiff / (1000 * 60 * 60));
          const reMinutes = Math.floor((reDiff % (1000 * 60 * 60)) / (1000 * 60));
          const reSeconds = Math.floor((reDiff % (1000 * 60)) / 1000);
          setRedEnvelopeTimeLeft(`${reHours.toString().padStart(2, '0')}:${reMinutes.toString().padStart(2, '0')}:${reSeconds.toString().padStart(2, '0')}`);
        } else {
          setRedEnvelopeTimeLeft("00:00:00");
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextClaimTime, canClaimRedEnvelope]);

  const claimRedEnvelope = async () => {
    if (!canClaimRedEnvelope) return;
    setLoading(true);
    try {
      const rewards = [1000, 500, 50, 250, 30, 100];
      let rewardAmount = rewards[Math.floor(Math.random() * rewards.length)];

      // Kiểm tra giới hạn cho 500 và 1000
      if (rewardAmount === 500 || rewardAmount === 1000) {
        const { count, error: countError } = await supabase
          .from('red_envelope_claims')
          .select('*', { count: 'exact', head: true })
          .eq('amount', rewardAmount);
        
        if (count && count >= 5) {
          // Nếu đã đủ 5 người, re-roll sang các mức nhỏ hơn
          rewardAmount = [50, 250, 30, 100][Math.floor(Math.random() * 4)];
        }
      }

      const now = new Date().toISOString();

      // Cập nhật số dư
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          balance: (profile.balance || 0) + rewardAmount,
          last_red_envelope_claim: now
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Lưu giao dịch
      await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: 'DAILY_REWARD',
          amount: rewardAmount,
          description: 'Nhận Lì Xì',
          status: 'COMPLETED'
        }]);

      // Lưu lịch sử nếu là 500 hoặc 1000
      if (rewardAmount === 500 || rewardAmount === 1000) {
        await supabase
          .from('red_envelope_claims')
          .insert([{
            user_id: userId,
            username: profile.username || 'Người dùng',
            amount: rewardAmount
          }]);
      }

      showNotification({ title: "Thành công", message: `Đã nhận lì xì ${rewardAmount} Xu!`, type: "success" });
      onUpdateProfile();
      setIsOpen(false);
    } catch (error) {
      console.error('Error claiming red envelope:', error);
      showNotification({ title: "Lỗi", message: "Không thể nhận lì xì.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('red_envelope_claims')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setHistory(data);
    };
    if (isOpen) fetchHistory();
  }, [isOpen]);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Don't render anything if profile isn't loaded
  if (!profile) return null;

  return (
    <>
      {/* Floating Button Container */}
      <motion.div
        drag
        dragConstraints={{ 
          left: -(windowSize.width - 80), 
          right: 0, 
          top: -(windowSize.height - 120), 
          bottom: 0 
        }}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          setTimeout(() => setIsDragging(false), 100);
        }}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
      >
        <motion.button
          className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)] border-2 border-yellow-500"
          animate={canClaimRedEnvelope && !isDragging ? { y: [0, -10, 0], rotate: [0, -5, 5, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          onClick={() => {
            if (!isDragging) setIsOpen(true);
          }}
        >
          <RedEnvelopeIcon className="text-yellow-400" size={28} />
          {canClaimRedEnvelope && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
          )}
        </motion.button>
      </motion.div>

      {/* Popup Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm glass p-6 rounded-3xl border border-red-500/30 shadow-2xl relative"
            >
              <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <X size={20} />
              </button>
              
              <div className="text-center space-y-4 mt-2">
                <h3 className="text-lg font-black text-red-500 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">Lì Xì Giờ Vàng</h3>
                <p className="text-[10px] text-gray-400">12:00 - 12:30 & 20:00 - 20:30</p>
                
                {canClaimRedEnvelope ? (
                  <button 
                    onClick={claimRedEnvelope}
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : "Mở Lì Xì Ngay"}
                  </button>
                ) : (
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-red-400 uppercase font-bold mb-1">Lì xì tiếp theo sau</p>
                    <p className="text-2xl font-black font-mono text-white">{redEnvelopeTimeLeft}</p>
                  </div>
                )}

                {history.length > 0 && (
                  <div className="mt-6 text-left">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Lịch sử nhận lì xì lớn (500/1k):</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {history.map((item) => (
                        <div key={item.id} className="flex justify-between text-[10px] bg-black/20 p-2 rounded">
                          <span className="text-white">{item.username}</span>
                          <span className="text-yellow-400 font-bold">{item.amount} Xu</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RedEnvelopeWidget;
