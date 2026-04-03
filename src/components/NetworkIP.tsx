import React, { useState, useEffect } from 'react';

export default function NetworkIP() {
  const [ip, setIp] = useState<string>('0.0.0.0');
  const [countryCode, setCountryCode] = useState<string>('vn');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchIPInfo = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.ip) {
          setIp(data.ip);
          if (data.country_code) {
            setCountryCode(data.country_code.toLowerCase());
          }
        }
      } catch (error) {
        console.error('Error fetching IP info:', error);
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const d = await res.json();
          if (d.ip) setIp(d.ip);
        } catch (e) {
          setIp('Không xác định');
        }
      } finally {
        setIsLoaded(true);
      }
    };

    fetchIPInfo();
  }, []);

  return (
    <div className="ip-badge">
      <div className="flex items-center transition-all duration-500" style={{ transform: isLoaded ? 'scale(1)' : 'scale(0.8)', opacity: isLoaded ? 1 : 0.5 }}>
        <span className={`fi fi-${countryCode}`}></span>
      </div>
      <span className="ip-text transition-all duration-500" style={{ opacity: isLoaded ? 1 : 0.5 }}>
        {ip}
      </span>
    </div>
  );
}
