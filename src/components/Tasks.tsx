import React, { useState, useEffect, useRef } from 'react';
import CountdownTimer from './CountdownTimer';
import { 
  ChevronLeft, 
  Link as LinkIcon, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Zap,
  Cat,
  MapPin,
  Globe,
  Download,
  AlertTriangle as AlertTriangleIcon,
  Smartphone,
  Plane,
  Zap as ZapIcon
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
  // Gán thẳng luôn, bỏ qua check biến môi trường cho chắc chắn 100%
  BLOG_URL: "https://wmoneyx.blogspot.com/", 
  REWARD: 200,
  SPECIAL_REWARD: 1000
};

const TASK_APIS: Record<string, string> = {
  "🔥 TRAFFIC68": "https://traffic68.com/api/quicklink/api?api=tf68_c42992fb620964a590a36f35a0412f70bab3236f1e0aeb08&url=",
  "🔥 TRAFFIC1M": "https://traffic1m.net/apidevelop?api=dfe44a5e9704a90f5932d3f2bd924902&url=",
  "🔥 NHAPMA": "https://service.nhapma.com/api?token=4e715a3b-d40e-4712-91a9-9a7af0564749&url=",
  "🔥 TAPLAYMA": "https://api.taplayma.com/api?token=9015c633-5cbb-42c0-a97a-5d6750d2b291&url=",
  "🔥 LINK4M": "https://link4m.co/api-shorten/v2?api=68208afab6b8fc60542289b6&url=",
  "🔥 UPTOLINK SET3": "https://uptolink.one/api?api=94eeedcdf3928b7bb78a89c19bad78274a69b830&url=",
  "UPTOLINK SET2": "https://uptolink.one/api?api=94eeedcdf3928b7bb78a89c19bad78274a69b830&url=",
  "LINKNGONCOM": "https://linkngon.com/api?api=lqbSkVWzCCIcWZWyt52j2DC9tBu53SEr&url=",
  "🔥 LINKNGONIO": "https://linkngon.io/api?api=5PA5LNPwgcjiVhyRYRhPjam8jGNHpGgELAEPfZH6QzWiBk&url=",
  "TIMMAP": "https://linktot.net/api_timmap.php?token=d121d1761f207cb9bfde19c8be5111cb8d623d83e1e05053ec914728c9ea869c&url=",
  "🔥 BBMKTS": "https://bbmkts.com/dapi?token=d285ce6c761cc5961316783a&longurl=",
  "🔥 LINKTOT": "https://linktot.net/JSON_QL_API.php?token=d121d1761f207cb9bfde19c8be5111cb8d623d83e1e05053ec914728c9ea869c&url=",
  "TRAFICTOT": "https://services.traffictot.com/api/v1/shorten?api_key=3066e5a6df247cd2cf73b122e518a29e061e2823c969cefa75e05252513e6363&url=",
  "4MMO": "https://4mmo.net/api?api=f043a9bcb47e1fe0be2d73825a1a8975a62f60d5&url=",
  "XLINK": "https://xlink.co/api?token=ac55663f-ef85-4849-8ce1-4ca99bd57ce7&url=",
  "LINKTOP": "https://linktop.run/api?api=kDk3dqyoTbFP29S4wNmAbwVuDg5RBS0HQ8M9V8BgfwF8IH&url=",
};

export const TASK_DATA: Record<string, { reward: number, limit: number }> = {
  "🔥 TRAFFIC68": { reward: 500, limit: 2 },
  "🔥 TRAFFIC1M": { reward: 300, limit: 3 },
  "🔥 NHAPMA": { reward: 360, limit: 3 },
  "🔥 TAPLAYMA": { reward: 200, limit: 3 },
  "🔥 LINK4M": { reward: 100, limit: 2 },
  "🔥 UPTOLINK SET3": { reward: 300, limit: 100 },
  "UPTOLINK SET2": { reward: 200, limit: 100 },
  "LINKNGONCOM": { reward: 200, limit: 2 },
  "🔥 LINKNGONIO": { reward: 200, limit: 2 },
  "TIMMAP": { reward: 100, limit: 2 },
  "🔥 BBMKTS": { reward: 200, limit: 1 },
  "🔥 LINKTOT": { reward: 100, limit: 1 },
  "TRAFICTOT": { reward: 100, limit: 3 },
  "4MMO": { reward: 100, limit: 2 },
  "XLINK": { reward: 50, limit: 2 },
  "LINKTOP": { reward: 100, limit: 2 },
};

const Tasks: React.FC<TasksProps> = ({ balance, userId, profile, onBack, onUpdateBalance, onUpdateProfile }) => {
  const [currentSessionCode, setCurrentSessionCode] = useState("");
  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSpecialGuide, setShowSpecialGuide] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<'main' | 'special' | null>(null);
  const [taskCreationTime, setTaskCreationTime] = useState("");
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [specialTasks, setSpecialTasks] = useState<any[]>([]);
  const [reviewLink, setReviewLink] = useState("");
  const [taskType, setTaskType] = useState("Khác");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSpecialTask, setSelectedSpecialTask] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('vi-VN', { hour12: false }));
  const [isExecutingApi, setIsExecutingApi] = useState(false);
  const [maintenanceTasks, setMaintenanceTasks] = useState<string[]>([]);

  const SPECIAL_TASKS_LIST = [
    { id: 'Review Map', name: 'Review Map', type: 'map', icon: MapPin, color: 'text-blue-500', bg: 'bg-blue-50', reward: 1500, guide: 'Truy cập Google Maps, tìm địa điểm yêu cầu và để lại đánh giá 5 sao kèm hình ảnh.' },
    { id: 'Review Trip', name: 'Review Trip', type: 'trip', icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-50', reward: 3000, guide: 'Truy cập TripAdvisor, tìm địa điểm và để lại đánh giá chi tiết kèm hình ảnh.' },
    { id: 'Review App/Tải App', name: 'Review App/Tải App', type: 'app', icon: Download, color: 'text-violet-500', bg: 'bg-violet-50', reward: 500, guide: 'Tải ứng dụng từ Google Play/App Store, sử dụng và để lại đánh giá 5 sao.' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('vi-VN', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchTaskCounts();
      fetchSpecialTasks();
      fetchMaintenanceTasks();

      // Real-time subscription for special tasks
      const specialTasksChannel = supabase
        .channel(`special-tasks-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'special_task_submissions',
            filter: `user_id=eq.${userId}`
          },
          () => {
            fetchSpecialTasks();
          }
        )
        .subscribe();

      // Real-time subscription for maintenance tasks
      const maintenanceChannel = supabase
        .channel('maintenance-tasks')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'system_settings',
            filter: 'key=eq.maintenance_tasks'
          },
          (payload: any) => {
            if (payload.new && payload.new.value) {
              setMaintenanceTasks(payload.new.value);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(specialTasksChannel);
        supabase.removeChannel(maintenanceChannel);
      };
    }
  }, [userId]);

  const fetchMaintenanceTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_tasks')
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') console.error('Error fetching maintenance tasks:', error);
      } else if (data) {
        setMaintenanceTasks(data.value || []);
      }
    } catch (err) {
      console.error('Error in fetchMaintenanceTasks:', err);
    }
  };

  const fetchSpecialTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('special_task_submissions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSpecialTasks(data || []);
    } catch (err) {
      console.error('Error fetching special tasks:', err);
    }
  };

  const executeSpecialTaskApi = async (type: string) => {
    const API_URL_GOC = "https://linktot.net/api_rv.php?token=d121d1761f207cb9bfde19c8be5111cb8d623d83e1e05053ec914728c9ea869c&url=https://xacminh.github.io/wmoneyx/";
    
    // 1. Kiểm tra thiết bị nếu là APP
    if (type === 'app') {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!isMobile) {
        showNotification({ 
          title: "Lỗi thiết bị", 
          message: "Nhiệm vụ APP chỉ hoạt động trên điện thoại. Không hỗ trợ máy tính!", 
          type: "error" 
        });
        return;
      }
    }

    setIsExecutingApi(true);

    try {
      // 2. Gọi API gốc
      const response = await fetch(API_URL_GOC);
      const rawResponse = await response.text(); 

      let linkPath = "";
      if (rawResponse.includes("window.location.href")) {
        const match = rawResponse.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
        linkPath = match ? match[1] : "";
      } else {
        linkPath = rawResponse.trim();
      }

      if (!linkPath || !linkPath.includes('.rv')) {
        throw new Error("Không phản hồi link .rv hợp lệ");
      }

      // 3. Đổi đuôi dựa trên nhiệm vụ
      let finalLink = linkPath;
      if (type === "trip") {
        finalLink = linkPath.replace(".rv", ".tr");
      } else if (type === "app") {
        finalLink = linkPath.replace(".rv", ".ap");
      }
      // Nếu là map thì giữ nguyên .rv, không cần xử lý thêm

      // Nối domain nếu là đường dẫn tương đối
      if (finalLink.startsWith("/")) {
        finalLink = "https://linktot.net" + finalLink;
      }

      // 4. Mở trang nhiệm vụ ở tab mới
      window.open(finalLink, "_blank");
      
      // Đóng modal chi tiết để user quay lại màn hình chính
      setSelectedSpecialTask(null);
      setExpandedCategory(null);
      
      showNotification({ 
        title: "Hệ thống", 
        message: "Nhiệm vụ đã được mở ở tab mới. Vui lòng hoàn thành theo hướng dẫn tại trang đích!", 
        type: "success" 
      });

    } catch (error: any) {
      showNotification({ title: "Lỗi hệ thống", message: error.message, type: "error" });
    } finally {
      setIsExecutingApi(false);
    }
  };

  const fetchTaskCounts = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('task_completions')
        .select('task_name')
        .eq('user_id', userId)
        .eq('completed_at', today);

      if (error) {
        console.error("Error fetching task counts:", error);
        return;
      }

      const counts: Record<string, number> = {};
      data?.forEach((item: any) => {
        counts[item.task_name] = (counts[item.task_name] || 0) + 1;
      });
      setTaskCounts(counts);
    } catch (error) {
      console.error("Error in fetchTaskCounts:", error);
    }
  };

  const reward = React.useMemo(() => {
    let r = selectedTask ? (TASK_DATA[selectedTask]?.reward || CONFIG.REWARD) : CONFIG.REWARD;
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
  }, [profile, selectedTask]);

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

  const startTask = (taskName: string) => {
    if (taskName === "YEUMONEY") {
      showNotification({
        title: "HỆ THỐNG",
        message: "Hiện tại không có nhiệm vụ nào cho YEUMONEY",
        type: "info"
      });
      return;
    }

    const currentCount = taskCounts[taskName] || 0;
    const limit = TASK_DATA[taskName]?.limit || 0;
    const tasksToday = profile?.tasks_today || 0;
    const totalTasksLimit = Object.values(TASK_DATA).reduce((sum, task) => sum + task.limit, 0);

    if (tasksToday >= totalTasksLimit) {
      showNotification({
        title: "GIỚI HẠN",
        message: `Bạn đã đạt giới hạn ${totalTasksLimit} nhiệm vụ mỗi ngày!`,
        type: "warning"
      });
      return;
    }

    if (currentCount >= limit) {
      showNotification({
        title: "GIỚI HẠN",
        message: `Bạn đã hết lượt làm nhiệm vụ ${taskName} hôm nay!`,
        type: "warning"
      });
      return;
    }

    setSelectedTask(taskName);
    setTaskCreationTime(new Date().toLocaleTimeString('vi-VN'));
    setShowTaskModal(true);
  };

  const confirmTask = async () => {
    if (!selectedTask) return;
    const taskName = selectedTask;
    // setShowTaskModal(false); // Keep modal open to show loading animation

    const apiBaseUrl = TASK_APIS[taskName];
    if (!apiBaseUrl) {
      showNotification({
        title: "LỖI",
        message: "Không tìm thấy cấu hình cho nhiệm vụ này",
        type: "error"
      });
      return;
    }

    setIsGenerating(true);
    console.log("Starting task creation for:", taskName);
    
    try {
      if (await checkVPN()) {
        showNotification({
          title: "CẢNH BÁO",
          message: "Vui lòng tắt VPN/Proxy/1.1.1.1",
          type: "warning"
        });
        setIsGenerating(false);
        setShowTaskModal(false);
        return;
      }

      const newCode = generateCode();
      setCurrentSessionCode(newCode);
      
      const targetUrl = `${CONFIG.BLOG_URL}?code=${newCode}`;
      let apiRequestUrl = `${apiBaseUrl}${encodeURIComponent(targetUrl)}`;
      
      // Xử lý cơ chế riêng cho Uptolink
      if (taskName.includes('UPTOLINK SET2')) apiRequestUrl += "&type=4";
      if (taskName.includes('UPTOLINK SET3')) apiRequestUrl += "&type=3";
      
      console.log("API Request URL:", apiRequestUrl);

      let response;
      const proxyList = [
        (url: string) => url, // Direct
        (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
      ];

      for (let i = 0; i < proxyList.length; i++) {
        try {
          const currentUrl = proxyList[i](apiRequestUrl);
          console.log(`Attempt ${i + 1}: Fetching from ${currentUrl}`);
          response = await fetch(currentUrl, {
            method: 'GET'
          });
          if (response.ok) {
            console.log(`Attempt ${i + 1} succeeded!`);
            break;
          } else {
            console.warn(`Attempt ${i + 1} failed with status: ${response.status}`);
          }
        } catch (e) {
          console.warn(`Attempt ${i + 1} threw error:`, e);
        }
        // Small delay before next attempt if current one failed
        if (i < proxyList.length - 1) await new Promise(r => setTimeout(r, 500));
      }

      if (!response || !response.ok) {
        throw new Error("Failed to generate link after all attempts. Please check your network or try another task.");
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error("API returned empty response. Please try again later.");
      }
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response as JSON:", responseText);
        throw new Error("API returned invalid data format. Please try again later.");
      }
      
      console.log("Response result:", result);
      
      // TRÍCH XUẤT LINK LINH HOẠT TỪ NHIỀU CẤU TRÚC JSON
      const link = 
        result.shortenedUrl || 
        result.url || 
        result.bbmktsUrl || 
        result.short_url ||
        result.data?.short_url; // Cấu trúc lồng nhau của một số API

      const isSuccess = result.status === "success" || result.success === true || !!link;

      if (isSuccess && link) {
        window.open(link, "_blank");
        setShowTaskModal(false);
        setExpandedCategory('verification');
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
      setShowTaskModal(false);
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
      const taskReward = isSpecialTask ? CONFIG.SPECIAL_REWARD : (selectedTask ? TASK_DATA[selectedTask]?.reward : 0);
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

      // Record task completion for limit tracking
      if (!isSpecialTask && selectedTask) {
        const { error: completionError } = await supabase
          .from('task_completions')
          .insert([{
            user_id: userId,
            task_name: selectedTask,
            completed_at: today
          }]);
        
        if (completionError) {
          console.error("Task completion record error:", completionError);
        } else {
          // Update local counts
          setTaskCounts(prev => ({
            ...prev,
            [selectedTask]: (prev[selectedTask] || 0) + 1
          }));
        }
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
          <span className="text-[8px] text-slate-700 font-bold uppercase block">Số dư hiện tại</span>
          <span className="text-sm font-black text-accent">{balance.toLocaleString()} Xu</span>
        </div>
      </header>

      {/* Cảnh báo */}
      <div className="border-l-4 border-red-500 bg-red-500/10 p-4 rounded-xl space-y-2">
        <h3 className="text-[10px] font-black uppercase text-red-500 flex items-center gap-2">
          <AlertTriangle size={12} /> Quy định nghiêm ngặt
        </h3>
        <p className="text-[9px] text-slate-700 leading-relaxed uppercase tracking-tighter">
          Cấm <span className="text-white">VPN, Proxy, 1.1.1.1</span>, Cheat view. Mỗi nhiệm vụ có <span className="text-accent">Mã Định Danh Duy Nhất</span>, gian lận sẽ bị khóa tài khoản.
        </p>
      </div>

      {/* Nhiệm vụ */}
      <div className="space-y-4">
        <div className="anime-card p-8 text-center shadow-[0_10px_30px_rgba(217,70,239,0.15)] border-violet-200 relative">
          <div className="w-16 h-16 mx-auto bg-violet-50 rounded-full flex items-center justify-center mb-4 border-2 border-violet-200">
            <Zap className="text-accent" size={32} />
          </div>
          <h3 className="text-xl font-black text-violet-900 uppercase tracking-widest mb-2">HỆ THỐNG NHIỆM VỤ</h3>
          <p className="text-[10px] text-violet-700 uppercase tracking-widest mb-6">Hoàn thành nhiệm vụ để nhận phần thưởng</p>
          <button 
            onClick={() => setExpandedCategory('main')}
            disabled={isGenerating}
            className="w-full py-4 bg-accent rounded-full text-white font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] disabled:opacity-50"
          >
            {isGenerating ? 'ĐANG TẠO...' : `CHỌN NHIỆM VỤ - HIỆN CÓ ${Object.keys(TASK_APIS).length} / ${profile?.tasks_today || 0}`}
          </button>

          {/* Main Task Options (Moved to expanded view) */}
        </div>

        {/* Bảng nhiệm vụ đặc biệt (Gộp) */}
        <div className="anime-card p-8 text-center shadow-[0_10px_30px_rgba(217,70,239,0.15)] border-violet-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-accent text-white text-[8px] font-black px-4 py-1 rounded-bl-xl uppercase shadow-[0_0_10px_rgba(217,70,239,0.5)]">
            HOT
          </div>
          <div className="w-16 h-16 mx-auto bg-violet-50 rounded-full flex items-center justify-center mb-4 border-2 border-violet-200">
            <Zap className="text-accent" size={32} />
          </div>
          <h3 className="text-xl font-black text-violet-900 uppercase tracking-widest mb-2">NHIỆM VỤ ĐẶC BIỆT</h3>
          <p className="text-[10px] text-violet-700 uppercase tracking-widest mb-6">Thưởng: {CONFIG.SPECIAL_REWARD} Xu • Không giới hạn lượt làm</p>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setExpandedCategory('special')}
              className="w-full py-4 bg-accent rounded-full text-white font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)]"
            >
              CHỌN NHIỆM VỤ HIÊN CÓ 3 / {profile?.special_tasks_total || 0}
            </button>
          </div>
        </div>

        {/* Full-screen expanded view */}
        <AnimatePresence>
          {expandedCategory && (
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="fixed inset-0 z-[300] bg-white p-6 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setExpandedCategory(null)} className="text-black">
                  <ChevronLeft size={24} />
                </button>
                <h3 className="text-lg font-black uppercase text-black tracking-widest">
                  {expandedCategory === 'main' ? 'HỆ THỐNG NHIỆM VỤ' : 'NHIỆM VỤ ĐẶC BIỆT'}
                </h3>
                <div className="w-6" />
              </div>
              
              {expandedCategory === 'main' ? (
                <div className="space-y-2">
                  {Object.keys(TASK_DATA)
                    .sort((a, b) => {
                      const aMaintained = maintenanceTasks.includes(a);
                      const bMaintained = maintenanceTasks.includes(b);
                      if (aMaintained && !bMaintained) return 1;
                      if (!aMaintained && bMaintained) return -1;
                      return 0;
                    })
                    .map((taskName, idx) => {
                    const isMaintained = maintenanceTasks.includes(taskName);
                    const isHotTask = ["🔥 TRAFFIC68", "🔥 TRAFFIC1M", "🔥 NHAPMA"].includes(taskName);
                    return (
                      <button
                        key={idx}
                        disabled={isMaintained}
                        onClick={() => startTask(taskName)}
                        className={`w-full py-3 px-4 glass border-white/10 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all group/btn relative overflow-hidden ${isMaintained ? 'opacity-50 grayscale cursor-not-allowed' : ''} ${isHotTask ? 'border-red-500/50 bg-red-50/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}`}
                      >
                        {isMaintained && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                            <span className="text-[8px] font-black uppercase tracking-widest bg-red-500 text-white px-2 py-1 rounded-full">Bảo trì</span>
                          </div>
                        )}
                        <div className="flex flex-col items-start">
                          <span className={`text-[10px] font-bold uppercase ${isHotTask ? "text-red-600 animate-pulse" : "text-black"}`}>{taskName}</span>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[8px] font-bold text-slate-500 uppercase">{TASK_DATA[taskName].limit} LƯỢT/NGÀY</span>
                            <span className={`text-[8px] font-bold uppercase ${isHotTask ? "text-red-500" : "text-accent"}`}>+{TASK_DATA[taskName].reward} XU</span>
                          </div>
                        </div>
                        <ChevronLeft size={14} className={`${isHotTask ? "text-red-500" : "text-accent"} rotate-180 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all`} />
                      </button>
                    );
                  })}
                </div>
              ) : expandedCategory === 'verification' ? (
                <div className="space-y-5">
                  <div className="text-center mb-4">
                    <h3 className="text-[10px] font-black uppercase text-accent tracking-widest mb-1">Xác minh hoàn thành</h3>
                    <p className="text-[9px] text-slate-400 uppercase italic">Mã 7 số xáo trộn - Hiệu lực 1 lần</p>
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
                  <button 
                    onClick={() => {
                      setIsTaskStarted(false);
                      setExpandedCategory(null);
                    }}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    HỦY BỎ
                  </button>
                </div>
              ) : expandedCategory === 'special' ? (
                <div className="space-y-4">
                  {!selectedSpecialTask ? (
                    <div className="grid grid-cols-1 gap-3">
                      {SPECIAL_TASKS_LIST.map((task) => {
                        const isMaintained = maintenanceTasks.includes(task.id);
                        return (
                          <button
                            key={task.id}
                            disabled={isMaintained}
                            onClick={() => {
                              setSelectedSpecialTask(task.id);
                              setTaskType(task.id);
                            }}
                            className={`w-full p-4 glass border-white/10 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all group relative overflow-hidden ${isMaintained ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                          >
                            {isMaintained && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                                <span className="text-[8px] font-black uppercase tracking-widest bg-red-500 text-white px-2 py-1 rounded-full">Bảo trì</span>
                              </div>
                            )}
                            <div className={`w-12 h-12 rounded-xl ${task.bg} flex items-center justify-center shrink-0`}>
                              <task.icon className={task.color} size={24} />
                            </div>
                            <div className="flex-1 text-left">
                              <h4 className="text-xs font-black text-black uppercase">{task.name}</h4>
                              <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Thưởng: {CONFIG.SPECIAL_REWARD} Xu</p>
                            </div>
                            <ChevronLeft size={16} className="text-accent rotate-180 opacity-0 group-hover:opacity-100 transition-all" />
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setExpandedCategory('history')}
                        className="w-full py-3 px-4 glass border-accent/30 rounded-xl flex items-center justify-between hover:bg-accent/10 transition-all group/btn mt-4"
                      >
                        <span className="text-[10px] font-bold text-accent uppercase">XEM LỊCH SỬ NHIỆM VỤ</span>
                        <ChevronLeft size={14} className="text-accent rotate-180 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center justify-between mb-8">
                        <button onClick={() => setSelectedSpecialTask(null)} className="text-2xl text-gray-800">
                          <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-center flex-1">Chi Tiết Nhiệm Vụ</h2>
                        <div className="w-6"></div>
                      </div>

                      <div className="flex justify-center mb-10">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-500 text-3xl">
                          {React.createElement(SPECIAL_TASKS_LIST.find(t => t.id === selectedSpecialTask)?.icon || ZapIcon, { size: 32 })}
                        </div>
                      </div>

                      <div className="space-y-4 text-sm font-bold">
                        <div className="flex justify-between uppercase">
                          <span className="text-gray-500">Nguồn nhiệm vụ</span>
                          <span className="text-purple-600 flex items-center">
                            <ZapIcon className="text-orange-500 mr-1" size={14} fill="currentColor" /> 
                            <span>{SPECIAL_TASKS_LIST.find(t => t.id === selectedSpecialTask)?.name.toUpperCase()}</span>
                          </span>
                        </div>
                        <div className="flex justify-between uppercase">
                          <span className="text-gray-500">Số lượt làm</span>
                          <span className="text-green-500">KHÔNG GIỚI HẠN</span>
                        </div>
                        <div className="flex justify-between uppercase">
                          <span className="text-gray-500">Giới hạn thời gian</span>
                          <span className="text-purple-600">1 LƯỢT / 1 GIỜ</span>
                        </div>
                        <div className="flex justify-between uppercase">
                          <span className="text-gray-500">Phần thưởng</span>
                          <span className="text-yellow-500">{SPECIAL_TASKS_LIST.find(t => t.id === selectedSpecialTask)?.reward} XU</span>
                        </div>
                        <div className="flex justify-between uppercase">
                          <span className="text-gray-500">Thời gian tạo</span>
                          <span className="text-red-600">{currentTime}</span>
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-100 rounded-xl p-4 mt-8">
                        <div className="flex items-start text-red-500 mb-2">
                          <AlertTriangleIcon className="mt-1 mr-2 shrink-0" size={14} />
                          <span className="font-black text-xs uppercase">Cảnh báo quan trọng</span>
                        </div>
                        <ul className="text-[10px] text-red-400 font-bold leading-relaxed space-y-1 ml-6 list-disc uppercase">
                          <li>Sau 1 tiếng sẽ được làm tiếp</li>
                          <li>Cấm Cheat View / Gian lận</li>
                          <li>Phát hiện gian lận sẽ khóa tài khoản vĩnh viễn</li>
                        </ul>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-8">
                        <p className="text-[9px] text-blue-600 font-bold uppercase leading-relaxed text-center italic">
                          Lưu ý: Sau khi nhấn "Bắt đầu", hệ thống sẽ chuyển bạn đến trang nhiệm vụ. 
                          Vui lòng thực hiện theo hướng dẫn tại đó và nộp bằng chứng tại trang web đích để được ghi nhận.
                        </p>
                      </div>

                      <div className="flex items-center gap-4 mt-8">
                        <button 
                          onClick={() => setSelectedSpecialTask(null)} 
                          className="flex-1 font-black text-red-500 uppercase tracking-widest text-[10px]"
                        >
                          Hủy bỏ
                        </button>
                        <button 
                          disabled={isExecutingApi}
                          onClick={async () => {
                            const task = SPECIAL_TASKS_LIST.find(t => t.id === selectedSpecialTask);
                            if (task) {
                              await executeSpecialTaskApi(task.type);
                            }
                          }}
                          className="flex-[2] bg-purple-600 text-white font-black py-4 rounded-2xl uppercase shadow-lg shadow-purple-200 flex items-center justify-center tracking-widest text-[10px] disabled:opacity-50"
                        >
                          {isExecutingApi ? 'ĐANG TẠO...' : 'Bắt đầu'}
                        </button>
                      </div>

                      {/* Rainbow LED Bar */}
                      <div className="h-1 w-full relative overflow-hidden rounded-full mt-auto">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-purple-500 to-red-500 animate-rainbow-led" />
                      </div>
                    </div>
                  )}
                </div>
              ) : expandedCategory === 'history' ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-black tracking-widest">Lịch sử nhiệm vụ đặc biệt</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] min-w-[800px]">
                      <thead className="bg-white/5 text-gray-500 uppercase font-black tracking-widest">
                        <tr>
                          <th className="p-4">Loại</th>
                          <th className="p-4">Phần thưởng</th>
                          <th className="p-4">Duyệt 1 (24h)</th>
                          <th className="p-4">Duyệt 2 (10 ngày)</th>
                          <th className="p-4">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {specialTasks.length > 0 ? specialTasks.map(task => (
                          <tr key={task.id} className="hover:bg-white/5 transition">
                            <td className="p-4">{task.task_type}</td>
                            <td className="p-4 text-accent font-black">+{task.reward_amount?.toLocaleString()} XU</td>
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
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="p-12 text-center text-gray-500 italic uppercase font-black tracking-widest">Chưa có lịch sử nhiệm vụ</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Thông báo nổi khi chọn nhiệm vụ */}
      <AnimatePresence>
        {showTaskModal && selectedTask && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-[300] bg-white p-6 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => !isGenerating && setShowTaskModal(false)} className="text-black">
                <ChevronLeft size={24} />
              </button>
              <h3 className="text-lg font-black uppercase text-black tracking-widest">CHI TIẾT NHIỆM VỤ</h3>
              <div className="w-6" />
            </div>
              {isGenerating ? (
                <div className="p-8 text-center space-y-6">
                  <div className="relative w-24 h-24 mx-auto">
                    <motion.div
                      animate={{ 
                        rotate: 360,
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                        scale: { duration: 1, repeat: Infinity }
                      }}
                      className="absolute inset-0 rounded-full border-4 border-t-accent border-r-transparent border-b-accent/20 border-l-transparent"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Cat className="text-accent animal-running" size={40} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">ĐANG TẠO NHIỆM VỤ</h3>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                      Vui lòng đợi trong giây lát
                      <span className="loading-dots ml-1">
                        <span>.</span><span>.</span><span>.</span>
                      </span>
                    </p>
                  </div>

                  <div className="bg-accent/5 border border-accent/10 p-4 rounded-2xl">
                    <p className="text-[9px] text-accent/60 font-bold uppercase leading-relaxed italic">
                      "Hệ thống đang kết nối với máy chủ an toàn để lấy link nhiệm vụ cho bạn..."
                    </p>
                  </div>
                </div>
              ) : isTaskStarted ? (
                <div className="p-6 space-y-5">
                  <div className="text-center mb-4">
                    <h3 className="text-[10px] font-black uppercase text-accent tracking-widest mb-1">Xác minh hoàn thành</h3>
                    <p className="text-[9px] text-slate-400 uppercase italic">Mã 7 số xáo trộn - Hiệu lực 1 lần</p>
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
                  <button 
                    onClick={() => {
                      setIsTaskStarted(false);
                      setShowTaskModal(false);
                    }}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    HỦY BỎ
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto bg-accent/20 rounded-full flex items-center justify-center mb-3">
                      <Zap className="text-accent" size={24} />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">XÁC NHẬN NHIỆM VỤ</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-[10px] font-bold text-red-500 uppercase">Nguồn nhiệm vụ</span>
                      <span className="text-[10px] font-black text-accent uppercase">{selectedTask}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-[10px] font-bold text-red-500 uppercase">Số lượt làm</span>
                      <span className="text-[10px] font-black text-red-500 uppercase">{taskCounts[selectedTask || ""] || 0} / {selectedTask ? TASK_DATA[selectedTask]?.limit : 1} (Hàng ngày)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-[10px] font-bold text-red-500 uppercase">Tổng giới hạn ngày</span>
                      <span className="text-[10px] font-black text-accent uppercase">{profile?.tasks_today || 0} / {Object.values(TASK_DATA).reduce((sum, task) => sum + task.limit, 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-[10px] font-bold text-red-500 uppercase">Phần thưởng</span>
                      <span className="text-[10px] font-black text-yellow-500 uppercase">{reward} XU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-[10px] font-bold text-red-500 uppercase">Thời gian tạo</span>
                      <span className="text-[10px] font-black text-red-500 uppercase">{taskCreationTime}</span>
                    </div>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertTriangle size={14} />
                      <span className="text-[10px] font-black uppercase tracking-wider">CẢNH BÁO QUAN TRỌNG</span>
                    </div>
                    <p className="text-[9px] text-red-400 font-bold leading-relaxed uppercase">
                      • CẤM SỬ DỤNG VPN / PROXY / 1.1.1.1<br/>
                      • CẤM CHEAT VIEW / GIAN LẬN<br/>
                      • PHÁT HIỆN GIAN LẬN SẼ KHÓA TÀI KHOẢN VĨNH VIỄN
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setShowTaskModal(false)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      HỦY BỎ
                    </button>
                    <button 
                      onClick={confirmTask}
                      className="flex-1 py-3 bg-accent text-bg rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(173,216,230,0.4)]"
                    >
                      BẮT ĐẦU
                    </button>
                  </div>
                </div>
              )}

              {/* LED Running Effect */}
              <div className="h-1.5 w-full led-bar" />
            </motion.div>
        )}
      </AnimatePresence>

      {/* Hướng dẫn */}
      <AnimatePresence>
        {showGuide && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuide(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-[200] bg-white p-6 overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-accent tracking-widest">Hướng dẫn lấy mã</h3>
                <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-white">
                  <ExternalLink size={18} />
                </button>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black shrink-0 text-[10px]">1</div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-white mb-0.5">Bắt đầu nhiệm vụ</h4>
                    <p className="text-[9px] text-slate-300">Nhấn nút <span className="text-accent">"Thực hiện nhiệm vụ"</span>. Hệ thống sẽ tự động mở một tab mới chứa link rút gọn.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black shrink-0 text-[10px]">2</div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-white mb-0.5">Vượt link rút gọn</h4>
                    <p className="text-[9px] text-slate-300">Thực hiện các bước xác minh (Captcha, Click button) theo yêu cầu của trang rút gọn để tiếp tục.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black shrink-0 text-[10px]">3</div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-white mb-0.5">Truy cập trang đích</h4>
                    <p className="text-[9px] text-slate-300">Sau khi vượt link, bạn sẽ được chuyển đến trang Blog đích. Hãy cuộn xuống dưới cùng của trang.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black shrink-0 text-[10px]">4</div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-white mb-0.5">Lấy mã xác nhận</h4>
                    <p className="text-[9px] text-slate-300">Tìm nút <span className="text-accent">"LẤY MÃ NGAY"</span> hoặc chờ đồng hồ đếm ngược (thường là 10-30 giây). Mã 7 chữ số sẽ hiện ra.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black shrink-0 text-[10px]">5</div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-white mb-0.5">Nhập mã & Nhận thưởng</h4>
                    <p className="text-[9px] text-slate-300">Sao chép mã đó, quay lại ứng dụng wmoneyX và dán vào ô <span className="text-accent">"Dán mã vào đây"</span> để nhận Xu.</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                <p className="text-[8px] text-red-400 font-bold uppercase leading-relaxed">
                  Lưu ý: Không sử dụng VPN/Proxy. Mỗi mã chỉ có hiệu lực một lần và sẽ hết hạn sau một khoảng thời gian ngắn.
                </p>
              </div>

              <button 
                onClick={() => setShowGuide(false)}
                className="w-full py-3 btn-primary rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Đã hiểu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hướng dẫn nhiệm vụ đặc biệt */}
      <AnimatePresence>
        {showSpecialGuide && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSpecialGuide(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass p-6 w-[92%] max-w-[360px] space-y-4 relative z-10 rounded-[2rem] border-red-500/20 overflow-y-auto max-h-[85vh]"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-red-500 tracking-widest">Hướng dẫn nhiệm vụ đặc biệt</h3>
                <button onClick={() => setShowSpecialGuide(false)} className="text-gray-500 hover:text-white">
                  <ExternalLink size={18} />
                </button>
              </div>

              <div className="space-y-4 text-left">
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                  <p className="text-[9px] text-red-400 font-bold leading-relaxed">
                    Có thể thực hiện KHÔNG GIỚI HẠN, tuy nhiên để đảm bảo tỷ lệ hiện review cao nhất thì có thể chờ vài tiếng review 1 lần hoặc dùng vài tài khoản Google khác nhau nếu muốn.
                  </p>
                  <p className="text-[9px] text-red-400 font-bold leading-relaxed mt-2">
                    Vui lòng thực hiện đúng yêu cầu nhiệm vụ, Admin sẽ kiểm tra để ban và không thanh toán nếu bạn cố ý không tuân thủ!
                  </p>
                  <p className="text-[9px] text-red-500 font-black uppercase leading-relaxed mt-2">
                    Cảnh báo: Nếu cố ý không hoàn thành nhiệm vụ và có hành vi gian lận khi kiểm tra thì Admin hoàn toàn có quyền khóa tài khoản và không thanh toán.
                  </p>
                  <p className="text-[9px] text-red-400 font-bold leading-relaxed mt-2">
                    Mong mọi người có ý thức để cùng nhau kiếm coins nhé.
                  </p>
                </div>

                <h4 className="text-[10px] font-black uppercase text-white mb-2">HƯỚNG DẪN CHI TIẾT:</h4>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-black shrink-0 text-[10px]">1</div>
                  <div>
                    <p className="text-[10px] text-gray-300 font-bold mt-1">Xem video hướng dẫn và bật FakeGPS</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-black shrink-0 text-[10px]">2</div>
                  <div>
                    <p className="text-[10px] text-gray-300 font-bold mt-1">Đăng nhập vào TripAdvisitor và vào nhiệm vụ được yêu cầu</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-black shrink-0 text-[10px]">3</div>
                  <div>
                    <p className="text-[10px] text-gray-300 font-bold mt-1">Viết đánh giá theo yêu cầu nhiệm vụ.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-black shrink-0 text-[10px]">4</div>
                  <div>
                    <p className="text-[10px] text-gray-300 font-bold mt-1">Copy lại link đánh giá</p>
                    <p className="text-[8px] text-gray-500 mt-0.5">(VD: https://www.tripadvisor.com.vn/ShowUserReview...)</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSpecialGuide(false)}
                className="w-full py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors"
              >
                Đã hiểu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
