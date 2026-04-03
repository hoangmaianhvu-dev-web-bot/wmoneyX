import React, { useState, useEffect, useCallback } from 'react';

export default function NetworkIP() {
  const [ip, setIp] = useState<string>('0.0.0.0');
  const [countryCode, setCountryCode] = useState<string>('vn');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVpn, setIsVpn] = useState(false);

  const fetchIPInfo = useCallback(async () => {
    const ipApis = [
      'https://ipapi.co/json/',
      'https://api.ipify.org?format=json',
      'https://api64.ipify.org?format=json',
      'https://ident.me/.json'
    ];

    let foundIp = '';
    
    // Try to get IP and extra info from ipapi.co first as it's most detailed
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.ip) {
        foundIp = data.ip;
        setIp(data.ip);
        if (data.country_code) setCountryCode(data.country_code.toLowerCase());
        // Some APIs or headers might suggest VPN, but usually we just show the current public IP
        setIsLoaded(true);
        return;
      }
    } catch (e) {
      console.warn("Primary IP fetch failed, trying fallbacks...");
    }

    // Fallbacks
    for (const api of ipApis) {
      try {
        const res = await fetch(api);
        const data = await res.json();
        const potentialIp = data.ip || data.query || data.ip_addr;
        if (potentialIp) {
          foundIp = potentialIp;
          setIp(foundIp);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!foundIp) {
      setIp('Lỗi kết nối');
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    fetchIPInfo();
    
    // Check for IP changes every 10 seconds (useful for VPN toggling)
    const interval = setInterval(fetchIPInfo, 10000);
    return () => clearInterval(interval);
  }, [fetchIPInfo]);

  return (
    <div 
      className="ip-badge min-w-[140px] justify-center cursor-pointer hover:bg-purple-100 transition-colors" 
      title="Click để cập nhật IP"
      onClick={() => {
        setIsLoaded(false);
        fetchIPInfo();
      }}
    >
      <div className={`flex items-center transition-all duration-500 ${isLoaded ? 'scale-100 opacity-100' : 'scale-90 opacity-50'}`}>
        <span className={`fi fi-${countryCode}`}></span>
      </div>
      <div className="flex flex-col items-start">
        <span className={`ip-text transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-50'}`}>
          {ip}
        </span>
      </div>
    </div>
  );
}
