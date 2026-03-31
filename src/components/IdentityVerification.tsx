import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Loader2, 
  ShieldAlert,
  CheckCircle2,
  UserCheck
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

interface IdentityVerificationProps {
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const IdentityVerification: React.FC<IdentityVerificationProps> = ({ email, onSuccess, onCancel }) => {
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
        message: "Kiểm tra email của bạn để lấy mã xác thực.",
        type: "success"
      });
      setStep(2);
    } catch (error: any) {
      console.error("OTP Error:", error);
      // Fallback for demo/dev if API fails
      console.log("%c [XÁC MINH OTP GỐC]: " + newOtp, "color: #add8e6; font-size: 25px; font-weight: bold;");
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
          title: "THÀNH CÔNG",
          message: "Tài khoản của bạn đã được xác minh uy tín và bảo mật.",
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
            className="glass p-8 rounded-[2rem] text-center space-y-6 shadow-2xl"
          >
            <div className="mb-6">
              <div className="w-20 h-20 bg-[#add8e6]/10 rounded-full flex items-center justify-center mx-auto border border-[#add8e6]/20 mb-4">
                <Mail size={40} className="text-[#add8e6] ocean-glow" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Xác minh Email</h2>
              <p className="text-slate-600 text-[10px] mt-2 uppercase tracking-widest">Xác minh để nâng uy tín và bảo mật tài khoản</p>
              
              <div className="mt-4 p-3 bg-[#add8e6]/10 border border-[#add8e6]/20 rounded-xl">
                <p className="text-[9px] text-[#add8e6] font-bold uppercase tracking-widest">
                  XÁC MINH ĐỂ NÂNG UY TÍN CHO TÀI KHOẢN VÀ ĐƯỢC BẢO MẬT TRÁNH MẤT HOẶC HACK
                </p>
              </div>
            </div>
            
            <div className="text-sm text-slate-700 leading-relaxed px-4">
              Nhấn nút bên dưới để nhận mã OTP qua email đăng ký của bạn:
              <br />
              <span className="text-[#add8e6] font-bold">{email}</span>
            </div>

            <button 
              onClick={sendOTP}
              disabled={loading}
              className="w-full bg-[#add8e6] text-black py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black tracking-widest uppercase disabled:opacity-50 transition-all hover:scale-[1.02]"
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

            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center mt-2">
              Nếu không nhận mã thì hãy kiểm tra THƯ RÁC hoặc THƯ SPAM
            </p>

            <button 
              onClick={onCancel}
              className="text-[10px] text-slate-700 font-bold uppercase tracking-widest hover:text-accent transition-colors"
            >
              Để sau
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass p-8 rounded-[2rem] text-center space-y-8 shadow-2xl"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">Nhập OTP</h2>
              <p className="text-xs text-slate-600 uppercase tracking-widest">Đang kiểm tra...</p>
            </div>

            <div className="relative">
              <input 
                type="text" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" 
                className="w-full bg-white border border-[#add8e6]/30 py-5 rounded-2xl text-center text-3xl font-black tracking-[0.4em] text-[#add8e6] outline-none focus:border-[#add8e6] transition-all"
                autoComplete="off"
              />
              {verifying && (
                <div className="mt-4 text-[10px] text-[#add8e6] font-bold uppercase tracking-widest animate-pulse">
                  Đang kiểm tra mã...
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setStep(1)}
                className="text-[10px] text-slate-700 font-bold uppercase tracking-widest hover:text-[#add8e6] transition-colors py-2"
              >
                Quay lại
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IdentityVerification;
