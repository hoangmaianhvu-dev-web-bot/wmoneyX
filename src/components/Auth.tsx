import React, { useState } from 'react';
import { supabase } from '../supabase';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../context/NotificationContext';
import emailjs from '@emailjs/browser';
import HCaptcha from '@hcaptcha/react-hcaptcha';

const EMAILJS_CONFIG = {
  PUBLIC_KEY: "1JIKXekUB57YWqsHv",
  SERVICE_ID: "service_rpi21gg",
  TEMPLATE_ID: "template_k6yvbwj"
};

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

interface AuthProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function Auth({ onBack, onSuccess }: AuthProps) {
  const { showNotification } = useNotification();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const hcaptchaRef = React.useRef<HCaptcha>(null);

  React.useEffect(() => {
    setCaptchaToken(null);
    hcaptchaRef.current?.resetCaptcha();
  }, [mode]);

  React.useEffect(() => {
    if (mode === 'forgot' && otpSent && otp.length === 6) {
      if (otp === generatedOtp) {
        setIsOtpVerified(true);
      } else {
        setIsOtpVerified(false);
      }
    }
  }, [otp, mode, otpSent, generatedOtp]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      setMode('register');
    }
  }, []);

  const handleSignIn = async (identifier: string, password: string) => {
    try {
      let loginEmail = identifier;

      // Check if identifier is an email
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

      if (!isEmail) {
        // Try to find email by username
        // Note: This requires the profiles table to be readable by unauthenticated users or a specific policy
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('username', identifier)
          .single();

        if (profileError || !profileData) {
          return { success: false, message: 'Tài khoản hoặc email không tồn tại.' };
        }
        loginEmail = profileData.email;
      }

      // Sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) {
        if (error.message !== 'Invalid login credentials') {
          console.error('Auth Error:', error.message);
        }
        let errorMsg = error.message;
        if (error.message === 'Invalid login credentials') {
          errorMsg = 'Email/Tài khoản hoặc mật khẩu không chính xác.';
        }
        return { success: false, message: errorMsg };
      }
      
      return { success: true, user: data.user };
    } catch (err: any) {
      console.error('Connection Error:', err);
      return { success: false, message: 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.' };
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Verify hCaptcha
    if (!captchaToken) {
      setError('Vui lòng hoàn thành mã xác thực.');
      setLoading(false);
      return;
    }

    try {
      const verifyResponse = await fetch('/api/verify-hcaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      });
      const verifyData = await verifyResponse.json();
      if (!verifyData.success) {
        setError('Xác thực hCaptcha thất bại. Vui lòng thử lại.');
        hcaptchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        setLoading(false);
        return;
      }

      if (mode === 'register') {
        // Clear any stale session before signing up
        await supabase.auth.signOut().catch(() => {});

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              referral_code: referralCode,
            }
          }
        });
        if (signUpError) throw signUpError;
        showNotification({
          title: "Đăng ký thành công",
          message: "Vui lòng kiểm tra email để xác nhận tài khoản.",
          type: "success"
        });
      } else if (mode === 'login') {
        const result = await handleSignIn(email, password);
        if (!result.success) {
          setError(result.message || 'Đăng nhập thất bại');
          return;
        }
        
        console.log('User signed in:', result.user);
        onSuccess();
      } else if (mode === 'forgot') {
        // ... (existing forgot password logic)
        if (!otpSent) {
          // Generate and send OTP
          const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(newOtp);

          try {
            await emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, {
              to_email: email,
              otp_code: newOtp,
              user_name: "Thành viên wmoneyX"
            });
          } catch (err: any) {
            throw new Error("Không thể gửi email xác thực. Vui lòng thử lại sau.");
          }

          setOtpSent(true);
          showNotification({
            title: "Gửi thành công",
            message: "Kiểm tra hộp thư của bạn để lấy mã OTP.",
            type: "info"
          });
        } else {
          // Verify OTP and change password
          if (otp !== generatedOtp) {
            throw new Error("Mã OTP không chính xác");
          }
          if (newPassword.length < 6) {
            throw new Error("Mật khẩu mới phải từ 6 ký tự");
          }
          
          showNotification({
            title: "Thành công",
            message: "Mật khẩu đã được thay đổi.",
            type: "success"
          });
          setMode('login');
          setOtpSent(false);
          setOtp('');
          setNewPassword('');
        }
      }
    } catch (err: any) {
      let msg = err.message || 'Đã xảy ra lỗi hệ thống.';
      
      if (msg !== 'Invalid login credentials' && msg !== 'User already registered') {
        console.error('Auth Error:', err);
      }
      
      if (msg.includes('fetch') || msg.includes('EMPTY')) {
        msg = 'Không thể kết nối máy chủ. Kiểm tra internet hoặc Supabase Status.';
      } else if (msg === 'Invalid login credentials') {
        msg = 'Email/Tài khoản hoặc mật khẩu không chính xác.';
      } else if (msg === 'User already registered') {
        msg = 'Email này đã được đăng ký.';
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-white font-sans relative z-10">
      <div className="w-full max-w-sm">
        {/* Logo Area */}
        <div className="text-center mb-10">
          <button onClick={onBack} className="inline-block group">
            <h1 className="text-5xl font-black italic tracking-tighter ocean-glow mb-2 transition-transform group-hover:scale-105">wmoneyX</h1>
          </button>
          <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em]">Hệ thống kiếm tiền VIP</p>
        </div>

        {/* Auth Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 shadow-2xl rounded-[28px]"
        >
          {/* Tabs Navigation */}
          {mode !== 'forgot' && (
            <div className="flex mb-8 border-b border-white/5">
              <button 
                onClick={() => setMode('login')}
                className={`flex-1 pb-3 text-sm font-bold tracking-widest transition-all relative ${mode === 'login' ? 'text-accent' : 'text-gray-600'}`}
              >
                ĐĂNG NHẬP
                {mode === 'login' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-accent shadow-[0_0_10px_#add8e6]" />
                )}
              </button>
              <button 
                onClick={() => setMode('register')}
                className={`flex-1 pb-3 text-sm font-bold tracking-widest transition-all relative ${mode === 'register' ? 'text-accent' : 'text-gray-600'}`}
              >
                ĐĂNG KÝ
                {mode === 'register' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-accent shadow-[0_0_10px_#add8e6]" />
                )}
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="text-center mb-8">
              <h3 className="text-sm font-black uppercase text-accent tracking-widest">Khôi phục mật khẩu</h3>
              <p className="text-[9px] text-gray-500 mt-1 uppercase">Xác minh qua hệ thống bảo mật</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold ml-1 tracking-widest">
                {mode === 'login' ? 'Email / Tài khoản' : 'Địa chỉ Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                <input 
                  type={mode === 'login' ? "text" : "email"} 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'login' ? "Email hoặc Tên tài khoản" : "example@gmail.com"} 
                  className="w-full bg-white/5 border border-white/10 text-white py-4 pl-12 pr-4 rounded-2xl text-sm focus:border-accent focus:bg-white/8 outline-none transition-all focus:ring-1 focus:ring-accent/20"
                />
              </div>
            </div>

            {mode === 'forgot' && otpSent && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold ml-1 tracking-widest">Mã OTP 6 số</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="NHẬP MÃ 6 SỐ" 
                      className={`w-full bg-white/5 border ${isOtpVerified ? 'border-emerald-500/50' : 'border-accent/30'} py-4 rounded-2xl text-center text-xl font-black tracking-[0.5em] ${isOtpVerified ? 'text-emerald-500' : 'text-accent'} outline-none focus:border-accent transition-all`}
                    />
                    {isOtpVerified && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                        <ShieldCheck size={20} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold ml-1 tracking-widest">Mật khẩu mới</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full bg-white/5 border border-white/10 text-white py-4 pl-12 pr-12 rounded-2xl text-sm focus:border-accent focus:bg-white/8 outline-none transition-all focus:ring-1 focus:ring-accent/20"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-accent transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {mode !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Mật khẩu</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot')}
                      className="text-[9px] text-accent uppercase font-bold hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required={mode !== 'forgot'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full bg-white/5 border border-white/10 text-white py-4 pl-12 pr-12 rounded-2xl text-sm focus:border-accent focus:bg-white/8 outline-none transition-all focus:ring-1 focus:ring-accent/20"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-accent transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-[10px] text-accent uppercase font-bold ml-1 tracking-widest">Mã giới thiệu (Nếu có)</label>
                <input 
                  type="text" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Nhập mã giới thiệu" 
                  className="w-full bg-white/5 border border-accent/20 text-accent py-4 px-6 rounded-2xl text-sm font-bold focus:border-accent focus:bg-white/8 outline-none transition-all"
                />
              </div>
            )}

            <div className="flex justify-center py-2">
              <HCaptcha
                sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY || "74289632-2ab6-47a2-9046-dd6e37b09250"}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                ref={hcaptchaRef}
                theme="dark"
              />
            </div>

            {mode === 'forgot' && (
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest text-center mt-4">
                Nếu không nhận mã thì hãy kiểm tra THƯ RÁC hoặc THƯ SPAM
              </p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-accent text-black rounded-2xl font-black text-xs uppercase tracking-widest mt-4 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                mode === 'login' ? 'Vào hệ thống' : mode === 'register' ? 'Tạo tài khoản ngay' : (otpSent ? 'Xác nhận đổi mật khẩu' : 'Gửi mã xác nhận')
              )}
            </button>

            {mode === 'forgot' && (
              <button 
                type="button" 
                onClick={() => {
                  setMode('login');
                  setOtpSent(false);
                }}
                className="w-full text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 hover:text-white transition-colors"
              >
                Quay lại đăng nhập
              </button>
            )}
          </form>
        </motion.div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-medium">
            © 2026 Developed by <span className="text-white/60 font-bold">HOANG MAI ANH VU</span>
          </p>
        </div>
      </div>
    </div>
  );
}
