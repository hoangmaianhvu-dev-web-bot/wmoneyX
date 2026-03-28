import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { NotificationProvider } from './context/NotificationContext.tsx';

// Fix 1: Fetch Proxy
if (typeof (window as any).fetchProxy === 'undefined') {
    const originalFetch = window.fetch;
    (window as any).fetchProxy = new Proxy(originalFetch, {
        apply(target, thisArg, args) {
            // Thực thi fetch gốc
            const r = target.apply(thisArg, args);
            
            // Xử lý callback ẩn (không làm gián đoạn luồng chính)
            if ((window as any)?.fechCallback && r instanceof Promise) {
                r.then((res: Response) => {
                    try {
                        const clone = res.clone();
                        (window as any).fechCallback(args[0], args[1], clone);
                    } catch (e) {}
                }).catch(() => {});
            }
            
            // TRẢ VỀ PROMISE GỐC: Tránh lỗi Failed to fetch / Empty Response
            return r; 
        }
    });
    Object.defineProperty(window, 'fetch', {
        value: (window as any).fetchProxy,
        writable: true,
        configurable: true
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </StrictMode>,
);

