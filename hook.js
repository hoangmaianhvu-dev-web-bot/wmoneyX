/**
 * PHẦN 1: CONFIGURATION
 * Giữ nguyên tiền tố VITE_ để Vite có thể đọc được biến từ Vercel.
 */
const CONFIG = {
    SUPABASE_URL: "https://kblrdjxvsagdfjstchwp.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibHJkanh2c2FnZGZqc3RjaHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODI1OTAsImV4cCI6MjA4OTc1ODU5MH0.SA7S3BmghnpLb2lXgpfU1aZ--1nFUAWEx6Tyr2iOGm4",
    EMAILJS: {
        PUBLIC_KEY: "1JIKXekUB57YWqsHv",
        SERVICE_ID: "service_rpi21gg",
        TEMPLATE_ID: "template_k6yvbwj"
    }
};

/**
 * PHẦN 2: FIX FETCH PROXY (Sửa lỗi image_588930.png - ERR_EMPTY_RESPONSE)
 * Tuyệt đối không xóa return r.
 */
if (typeof window.fetchProxy === 'undefined') {
    const originalFetch = window.fetch;
    window.fetchProxy = new Proxy(originalFetch, {
        apply(target, thisArg, args) {
            // Thực thi fetch gốc
            const r = target.apply(thisArg, args);
            
            // Xử lý callback ẩn (không làm gián đoạn luồng chính)
            if (window?.fechCallback && r instanceof Promise) {
                r.then((res) => {
                    try {
                        const clone = res.clone();
                        window.fechCallback(args[0], args[1], clone);
                    } catch (e) {}
                }).catch(() => {});
            }
            
            // TRẢ VỀ PROMISE GỐC: Tránh lỗi Failed to fetch / Empty Response
            return r; 
        }
    });
    Object.defineProperty(window, 'fetch', {
        value: window.fetchProxy,
        writable: true,
        configurable: true
    });
}

/**
 * PHẦN 3: HÀM ĐĂNG NHẬP CHUẨN (Giữ cấu trúc gốc)
 */
async function handleSignIn(email, password) {
  try {
    // Kiểm tra biến môi trường có tiền tố VITE_
    const url = import.meta.env.VITE_SUPABASE_URL || CONFIG.SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || CONFIG.SUPABASE_KEY;

    if (!url || !key) {
        throw new Error("Lỗi: Thiếu cấu hình Supabase.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      if (error.message !== 'Invalid login credentials') {
        console.error('Auth Error:', error.message);
      }
      alert('Đăng nhập thất bại: ' + error.message);
      return { success: false, message: error.message };
    }
    
    return { success: true, user: data.user };
  } catch (err) {
    console.error('Connection Error:', err);
    alert('Lỗi kết nối máy chủ. Vui lòng kiểm tra Site URL trong Supabase.');
    return { success: false, error: err };
  }
}
