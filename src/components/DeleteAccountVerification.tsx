import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Loader2, 
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../context/NotificationContext';
import emailjs from '@emailjs/browser';

const EMAILJS_CONFIG = {
  PUBLIC_KEY: "1JIKXekUB57YWqsHv",
  SERVICE_ID: "service_rpi21gg",
  TEMPLATE_ID: "template_k6yvbwj"
};

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

interface DeleteAccountVerificationProps {
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const DeleteAccountVerification: React.FC<DeleteAccountVerificationProps> = ({ email, onSuccess, onCancel }) => {
  const { showNotification } = useNotification();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  const sendOTP = async () => {
    setLoading(true);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);

    try {
      await emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, {
        to_email: email,
        otp_code: newOtp,
        user_name: "Thành viên wmoneyX"
      });

      showNotification({
        title: "ĐÃ GỬI MÃ",
        message: "Kiểm tra email của bạn để lấy mã xác thực xóa tài khoản.",
        type: "success"
      });
      setStep(2);
    } catch (error: any) {
      console.error("OTP Error:", error);
      // Fallback for demo/dev if API fails
      console.log("%c [XÁC MINH OTP XÓA TK]: " + newOtp, "color: #ef4444; font-size: 25px; font-weight: bold;");
      showNotification({
        title: "LỖI HỆ THỐNG",
        message: "Không thể gửi email xác thực. Vui lòng thử lại sau.",
        type: "error"
      });
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otp.length === 6 && !verifying) {
      handleVerify(otp);
    }
  }, [otp, verifying]);

  const handleVerify = (codeToVerify: string) => {
    setVerifying(true);
    setTimeout(() => {
      if (codeToVerify === generatedOtp) {
        showNotification({
          title: "XÁC NHẬN THÀNH CÔNG",
          message: "Mã xác thực chính xác. Đang tiến hành xóa tài khoản...",
          type: "success"
        });
        onSuccess();
      } else {
        showNotification({
          title: "SAI MÃ",
          message: "Vui lòng kiểm tra lại mã OTP.",
          type: "error"
        });
        setOtp('');
      }
      setVerifying(false);
    }, 800);
  };

  return (
    <div className="max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass p-8 rounded-[2rem] text-center space-y-6 shadow-2xl border-red-500/20"
          >
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 mb-4">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Xác nhận xóa tài khoản</h2>
              <p className="text-slate-600 text-[10px] mt-2 uppercase tracking-widest">Hành động này không thể hoàn tác</p>
              
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest">
                  CẢNH BÁO: TẤT CẢ DỮ LIỆU, SỐ DƯ VÀ LỊCH SỬ CỦA BẠN SẼ BỊ XÓA VĨNH VIỄN
                </p>
              </div>
            </div>
            
            <div className="text-sm text-slate-700 leading-relaxed px-4">
              Nhấn nút bên dưới để nhận mã OTP xác nhận xóa qua email:
              <br />
              <span className="text-red-400 font-bold">{email}</span>
            </div>

            <button 
              onClick={sendOTP}
              disabled={loading}
              className="w-full bg-red-500 text-white py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black tracking-widest uppercase disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                "Gửi mã OTP"
              )}
            </button>

            <button 
              onClick={onCancel}
              className="text-[10px] text-slate-700 font-bold uppercase tracking-widest hover:text-accent transition-colors"
            >
              Hủy bỏ
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass p-8 rounded-[2rem] text-center space-y-6 shadow-2xl border-red-500/20"
          >
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 mb-4">
                <Mail size={40} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nhập mã OTP</h2>
              <p className="text-slate-600 text-[10px] mt-2 uppercase tracking-widest">Mã đã được gửi đến email của bạn</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Nhập 6 số OTP"
                className="w-full bg-white border border-slate-200 p-4 rounded-xl text-2xl tracking-[0.5em] text-center font-black outline-none focus:border-red-500/50 text-slate-900 transition-colors"
                maxLength={6}
              />
              
              <div className="flex items-center justify-between px-2">
                <button 
                  onClick={sendOTP}
                  disabled={loading}
                  className="text-[10px] text-red-400 font-bold uppercase tracking-widest hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  Gửi lại mã
                </button>
                <span className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">
                  {otp.length}/6
                </span>
              </div>
            </div>

            {verifying && (
              <div className="flex items-center justify-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xác thực...
              </div>
            )}

            <button 
              onClick={onCancel}
              className="text-[10px] text-slate-700 font-bold uppercase tracking-widest hover:text-accent transition-colors mt-4"
            >
              Hủy bỏ
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeleteAccountVerification;
