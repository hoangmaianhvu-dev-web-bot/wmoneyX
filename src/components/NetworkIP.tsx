import React, { useState, useEffect } from 'react';

export default function NetworkIP() {
  const [ip, setIp] = useState<string>('0.0.0.0');
  const [countryCode, setCountryCode] = useState<string>('vn');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchIPInfo = async () => {
      // Try multiple APIs for robustness
      const apis = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
        'https://ip-api.com/json'
      ];

      let foundIp = '';
      let foundCountry = 'vn';

      // First try to get IP quickly
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        if (data.ip) {
          foundIp = data.ip;
          setIp(data.ip);
        }
      } catch (e) {
        console.error("Ipify failed", e);
      }

      // Then try to get country info
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.ip) {
          if (!foundIp) {
            foundIp = data.ip;
            setIp(data.ip);
          }
          if (data.country_code) {
            foundCountry = data.country_code.toLowerCase();
            setCountryCode(foundCountry);
          }
        }
      } catch (e) {
        console.error("Ipapi failed", e);
      }

      if (!foundIp) {
        setIp('Không xác định');
      }
      setIsLoaded(true);
    };

    fetchIPInfo();
  }, []);

  return (
    <div className="ip-badge min-w-[120px] justify-center">
      <div className={`flex items-center transition-all duration-500 ${isLoaded ? 'scale-100 opacity-100' : 'scale-90 opacity-50'}`}>
        <span className={`fi fi-${countryCode}`}></span>
      </div>
      <span className={`ip-text transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-50'}`}>
        {ip}
      </span>
    </div>
  );
}
