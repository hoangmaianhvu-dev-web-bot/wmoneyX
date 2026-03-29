import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  Link as LinkIcon, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useNotification } from '../context/NotificationContext';

interface TasksProps {
  balance: number;
  userId: string;
  profile: any;
  onBack: () => void;
  onUpdateBalance: (newBalance: number) => void;
  onUpdateProfile?: () => void;
}

const CONFIG = {
  // 2. Cấu hình VuotNhanh (Cập nhật từ image_59018b.png)
  API_KEY: import.meta.env.VITE_VUOTNHANH_API || "d2ccf7ae-8029-45a8-a149-0013ec3447da", 
  BASE_API_URL: import.meta.env.VITE_VUOTNHANH_URL || "https://vuotnhanh.com/api?api=", 
  BLOG_URL: import.meta.env.VITE_BLOG_URL || "https://xacminhnhiemvu.blogspot.com/",
  REWARD: 200,
  SPECIAL_REWARD: 1000
};

const Tasks: React.FC<TasksProps> = ({ balance, userId, profile, onBack, onUpdateBalance, onUpdateProfile }) => {
  const [currentSessionCode, setCurrentSessionCode] = useState("");
  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const reward = React.useMemo(() => {
    let r = CONFIG.REWARD;
    if (profile?.active_boost_type && profile?.active_boost_end) {
      const now = new Date();
      const endTime = new Date(profile.active_boost_end);
      
      if (endTime > now) {
        if (profile.active_boost_type === 'x2') r *= 2;
        if (profile.active_boost_type === 'x5') r *= 5;
        console.log(`Boost active: ${profile.active_boost_type}, New reward: ${r}`);
      } else {
        console.log("Boost expired or not active");
      }
    }
    return r;
  }, [profile]);

  const { showNotification } = useNotification();

  const generateCode = () => {
    const digits = "123456789";
    let code = "";
    for (let i = 0; i < 7; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  };

  const checkVPN = async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (!timezone.includes("Asia/Saigon") && !timezone.includes("Asia/Ho_Chi_Minh"));
  };

  const startTask = async () => {
    setIsGenerating(true);
    console.log("Starting task creation...");
    
    try {
      if (await checkVPN()) {
        showNotification({
          title: "CẢNH BÁO",
          message: "Vui lòng tắt VPN/Proxy/1.1.1.1",
          type: "warning"
        });
        setIsGenerating(false);
        return;
      }

      const newCode = generateCode();
      setCurrentSessionCode(newCode);
      
      const targetUrl = `${CONFIG.BLOG_URL}?code=${newCode}`;
      const apiRequestUrl = `${CONFIG.BASE_API_URL}${CONFIG.API_KEY}&url=${encodeURIComponent(targetUrl)}`;
      const finalProxyUrl = `/api-server/proxy-vuotnhanh?url=${encodeURIComponent(apiRequestUrl)}`;
      
      console.log("Proxy URL:", finalProxyUrl);

      const response = await fetch(finalProxyUrl);
      console.log("Proxy response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Proxy error response:", errorText);
        throw new Error(`Proxy error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Proxy response result:", result);
      
      if (result.status === "success" && result.shortenedUrl) {
        window.open(result.shortenedUrl, "_blank");
        setIsTaskStarted(true);
        showNotification({
          title: "HỆ THỐNG",
          message: "Đã mở trang nhiệm vụ!",
          type: "success"
        });
      } else {
        throw new Error(result.message || "API Error");
      }
    } catch (error) {
      console.error("Lỗi tạo link:", error);
      showNotification({
        title: "LỖI",
        message: "Không thể kết nối API. Thử lại sau!",
        type: "error"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (code.length === 7) {
      setIsChecking(true);
      
      setTimeout(async () => {
        if (code === currentSessionCode) {
          await handleSuccess();
        } else {
          showNotification({
            title: "SAI MÃ",
            message: "Mã không khớp hoặc đã hết hạn",
            type: "error"
          });
          setVerifyCode("");
          setIsChecking(false);
        }
      }, 1000);
    }
  };

  const handleSuccess = async (isSpecialTask: boolean = false) => {
    try {
      console.log("Starting handleSuccess for user:", userId);
      
      // Fetch latest balance directly from DB to avoid stale prop issues
      const { data: currentProfile, error: fetchBalanceError } = await supabase
        .from('profiles')
        .select('balance, tasks_total, special_tasks_total, tasks_today, monthly_tasks, monthly_earnings, last_reset_month, exp, last_task_reset_date')
        .eq('id', userId)
        .single();
      
      if (fetchBalanceError) {
        console.error("Error fetching latest balance:", fetchBalanceError);
        throw fetchBalanceError;
      }
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      const today = new Date().toISOString().split('T')[0];
      
      const isNewMonth = currentProfile?.last_reset_month !== currentMonth;
      const isNewDay = currentProfile?.last_task_reset_date !== today;
      
      const currentMonthlyTasks = isNewMonth ? 0 : (currentProfile?.monthly_tasks || 0);
      const currentMonthlyEarnings = isNewMonth ? 0 : (currentProfile?.monthly_earnings || 0);
      const currentTodayTasks = isNewDay ? 0 : (currentProfile?.tasks_today || 0);

      const currentBalance = currentProfile?.balance || 0;
      const currentExp = currentProfile?.exp || 0;
      const taskReward = isSpecialTask ? CONFIG.SPECIAL_REWARD : reward;
      const newBalance = currentBalance + taskReward;
      const newExp = currentExp + 10; // Award 10 EXP per task
      
      console.log("Current balance:", currentBalance, "New balance:", newBalance);
      console.log("Current EXP:", currentExp, "New EXP:", newExp);
      
      const updateData: any = {
        balance: newBalance,
        exp: newExp,
        tasks_today: currentTodayTasks + 1,
        monthly_tasks: currentMonthlyTasks + 1,
        monthly_earnings: currentMonthlyEarnings + taskReward,
        last_reset_month: currentMonth,
        last_task_reset_date: today
      };

      if (isSpecialTask) {
        updateData.special_tasks_total = (currentProfile?.special_tasks_total || 0) + 1;
      } else {
        updateData.tasks_total = (currentProfile?.tasks_total || 0) + 1;
      }

      // Update profile in Supabase (combined update)
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
      
      if (updateError) {
        console.error("Profile update error:", updateError);
        throw updateError;
      }
      console.log("Profile updated successfully");
      
      // 1.5 Record transaction
      const { error: transError } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: 'TASK',
          amount: taskReward,
          description: isSpecialTask ? 'Hoàn thành nhiệm vụ đặc biệt' : 'Hoàn thành nhiệm vụ',
          status: 'COMPLETED'
        }]);
      
      if (transError) {
        console.error("Transaction record error:", transError);
      }

      onUpdateBalance(newBalance);
      if (onUpdateProfile) {
        await onUpdateProfile();
      }
      
      showNotification({
        title: "NHIỆM VỤ XONG",
        message: `Đã cộng ${taskReward.toLocaleString()} Xu và 10 EXP vào tài khoản`,
        type: "success"
      });
      
      // Reset state
      setIsTaskStarted(false);
      setVerifyCode("");
      setIsChecking(false);
      setCurrentSessionCode("");
    } catch (error: any) {
      console.error('Error in handleSuccess:', error);
      showNotification({
        title: "Lỗi",
        message: error.message || "Có lỗi xảy ra khi cộng tiền. Vui lòng thử lại.",
        type: "error"
      });
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 relative">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 glass flex items-center justify-center text-accent shrink-0 rounded-xl hover:bg-accent hover:text-black transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-black uppercase tracking-widest ocean-glow">Nhiệm Vụ</h2>
        </div>
        <div className="glass px-4 py-2 border-l-2 border-accent/30 rounded-xl">
          <span className="text-[8px] text-gray-500 font-bold uppercase block">Số dư hiện tại</span>
          <span className="text-sm font-black text-accent">{balance.toLocaleString()} Xu</span>
        </div>
      </header>

      {/* Cảnh báo */}
      <div className="border-l-4 border-red-500 bg-red-500/10 p-4 rounded-xl space-y-2">
        <h3 className="text-[10px] font-black uppercase text-red-500 flex items-center gap-2">
          <AlertTriangle size={12} /> Quy định nghiêm ngặt
        </h3>
        <p className="text-[9px] text-gray-400 leading-relaxed uppercase tracking-tighter">
          Cấm <span className="text-white">VPN, Proxy, 1.1.1.1</span>, Cheat view. Mỗi nhiệm vụ có <span className="text-accent">Mã Định Danh Duy Nhất</span>, gian lận sẽ bị khóa tài khoản.
        </p>
      </div>

      {/* Danh sách nhiệm vụ hệ thống */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
          <CheckCircle2 size={16} /> Danh sách nhiệm vụ hệ thống
        </h3>
        <div className="glass p-6 rounded-[2rem] border-white/10">
          <div className="flex flex-wrap gap-2">
            {/* HOT Tasks */}
            {['LINK4M', 'TRAFFIC1M', 'TRAFFIC68'].map(task => (
              <span key={task} className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] font-black uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                🔥 {task}
              </span>
            ))}
            {/* Normal Tasks */}
            {['YEUMONEY', 'UPTOLINK', 'TRAFICTOT', 'LINKNGONME', 'LINKNGONIO', 'BBMKTS', 'LINKTOP', 'TAPLAYMA', 'XLINK', '4MMO', 'NHAPMA'].map(task => (
              <span key={task} className="px-3 py-1.5 rounded-lg glass border-white/10 text-gray-300 text-[10px] font-bold uppercase">
                {task}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Gợi ý nhiệm vụ */}
      <div className="glass p-4 rounded-xl border-accent/30 bg-accent/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0">
          <CheckCircle2 size={16} />
        </div>
        <div>
          <h4 className="text-[10px] font-black uppercase text-accent">Gợi ý nhiệm vụ hôm nay</h4>
          <p className="text-[9px] text-gray-400 mt-0.5">Nhiệm vụ <span className="text-white font-bold">LINK4M</span> đang có tỷ lệ duyệt nhanh nhất. Hãy thử ngay!</p>
        </div>
      </div>

      {/* Nhiệm vụ */}
      <div className="space-y-4">
        <div className="glass p-6 relative overflow-hidden group rounded-[2rem]">
          <div className="absolute top-0 right-0 bg-accent text-black text-[8px] font-black px-4 py-1 rounded-bl-xl uppercase">
            Không giới hạn
          </div>
          
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 glass flex items-center justify-center text-2xl text-accent shrink-0 rounded-2xl">
              <LinkIcon size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black uppercase mb-1">Vượt link rút gọn</h3>
              <p className="text-[10px] text-gray-400 mb-4">Phần thưởng: <span className="text-accent font-bold">{reward} Xu</span></p>
              
              <button 
                onClick={startTask}
                disabled={isGenerating}
                className="btn-task w-full py-3 rounded-xl text-[10px] uppercase tracking-widest disabled:opacity-50"
              >
                {isGenerating ? 'ĐANG TẠO LINK...' : (isTaskStarted ? 'Lấy link mới' : 'Thực hiện nhiệm vụ')}
              </button>
            </div>
          </div>
        </div>

        {/* Ô nhập mã xác nhận */}
        <AnimatePresence>
          {isTaskStarted && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass p-6 border-accent/30 rounded-[2rem]"
            >
              <div className="text-center mb-4">
                <h3 className="text-[10px] font-black uppercase text-accent tracking-widest mb-1">Xác minh hoàn thành</h3>
                <p className="text-[9px] text-gray-500 uppercase italic">Mã 7 số xáo trộn - Hiệu lực 1 lần</p>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  maxLength={7} 
                  value={verifyCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setVerifyCode(val);
                    handleVerify(val);
                  }}
                  placeholder="Dán mã vào đây..." 
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-center text-2xl font-black tracking-[0.5em] text-accent outline-none focus:border-accent/50"
                />
                {isChecking && (
                  <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-[8px] text-accent font-bold uppercase animate-pulse">Đang xác thực mã định danh...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bảng nhiệm vụ đặc biệt (Gộp) */}
        <div className="glass p-6 relative overflow-hidden group rounded-[2rem] border-red-500/30 bg-red-500/5">
          <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black px-4 py-1 rounded-bl-xl uppercase shadow-[0_0_10px_rgba(239,68,68,0.5)]">
            HOT
          </div>
          
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 glass flex items-center justify-center text-2xl text-red-500 shrink-0 rounded-2xl border-red-500/30">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black uppercase mb-1 text-white">Nhiệm vụ đặc biệt</h3>
              <div className="flex items-center gap-3 text-[10px] mb-4">
                <span className="text-red-400 font-bold">Thưởng: {CONFIG.SPECIAL_REWARD} Xu</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">Không giới hạn lượt làm</span>
              </div>

              <button 
                onClick={async () => {
                  const el = document.getElementById('special-task-options');
                  if (el) {
                    el.classList.toggle('hidden');
                  }
                }}
                className="w-full py-3 bg-red-500/20 text-red-400 border border-red-500/50 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                Bắt đầu
              </button>
            </div>
          </div>

          {/* Special Task Options (Hidden by default) */}
          <div id="special-task-options" className="hidden mt-4 pt-4 border-t border-red-500/20 space-y-2">
            <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3 text-center">Chọn nhiệm vụ</h4>
            {['REVIEW MAP', 'ĐÁNH GIÁ MAP', 'TẠO EMAIL'].map((task, idx) => (
              <button
                key={idx}
                onClick={() => {
                  showNotification({
                    title: "HỆ THỐNG",
                    message: "Nhiệm vụ vẫn đang update, vui lòng quay lại sau!",
                    type: "warning"
                  });
                }}
                className="w-full py-3 px-4 glass border-red-500/20 rounded-xl flex items-center justify-between hover:bg-red-500/10 transition-all group/btn"
              >
                <span className="text-[10px] font-bold text-white uppercase">{task}</span>
                <ChevronLeft size={14} className="text-red-500 rotate-180 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hướng dẫn */}
      <div className="mt-8 glass p-6 border-dashed border-white/10 rounded-[2rem]">
        <h4 className="text-[10px] font-black uppercase text-gray-500 mb-4 tracking-widest text-center">Cách lấy mã xác minh</h4>
        <div className="space-y-4 text-[9px] text-gray-400 uppercase tracking-tighter">
          <p><span className="text-white font-bold">01.</span> Nhấn nút thực hiện để hệ thống sinh link nhiệm vụ qua VuotNhanh.</p>
          <p><span className="text-white font-bold">02.</span> Vượt link rút gọn để đến trang Blog đích.</p>
          <p><span className="text-white font-bold">03.</span> Chờ 10 giây tại trang Blog đích để mã hiện ra, sau đó sao chép và quay lại đây.</p>
          <p><span className="text-white font-bold">04.</span> Dán mã vào ô xác nhận phía trên để nhận thưởng.</p>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
