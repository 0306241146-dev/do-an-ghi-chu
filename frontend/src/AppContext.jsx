import React, { createContext, useState, useEffect, useContext } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    const savedTheme = localStorage.getItem('appTheme') || 'Light';
    const savedColor = localStorage.getItem('appColor') || '#7c3aed';
    
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', savedTheme.toLowerCase());
      document.documentElement.style.setProperty('--primary-color', savedColor);
    }

    return {
      displayName: 'Nguyễn Anh Đạt',
      email: 'nguyenanhdat@gmail.com',
      theme: savedTheme,
      primaryColor: savedColor,
    };
  });

  const fetchSettings = () => {
    const apiUrl = 'http://localhost:5000/api/settings';
    // ĐÃ SỬA: Thêm cache: 'no-store' để cấm trình duyệt lấy dữ liệu cũ
    fetch(apiUrl, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const currentTheme = data.theme || 'Light';
          const currentPrimary = data.primaryColor || '#7c3aed';

          document.documentElement.setAttribute('data-theme', currentTheme.toLowerCase());
          document.documentElement.style.setProperty('--primary-color', currentPrimary);
          
          localStorage.setItem('appTheme', currentTheme);
          localStorage.setItem('appColor', currentPrimary);

          setProfile((prev) => ({
            ...prev,
            displayName: data.displayName || prev.displayName,
            email: data.email || prev.email,
            theme: currentTheme,
            primaryColor: currentPrimary,
          }));
        }
      })
      .catch((err) => console.error('Lỗi tải cài đặt toàn cục:', err));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const changeTheme = (newTheme) => {
    setProfile((prev) => ({ ...prev, theme: newTheme }));
    document.documentElement.setAttribute('data-theme', newTheme.toLowerCase());
    localStorage.setItem('appTheme', newTheme);
  };

  const changePrimaryColor = (colorHex) => {
    setProfile((prev) => ({ ...prev, primaryColor: colorHex }));
    document.documentElement.style.setProperty('--primary-color', colorHex);
    localStorage.setItem('appColor', colorHex);
  };

  const updateProfile = (newProfile) => {
    setProfile((prev) => ({ ...prev, ...newProfile }));
    if (newProfile.theme) changeTheme(newProfile.theme);
    if (newProfile.primaryColor) changePrimaryColor(newProfile.primaryColor);
  };

  return (
    <AppContext.Provider
      value={{
        profile,
        changeTheme,
        changePrimaryColor,
        updateProfile,
        fetchSettings,
        isDark: profile.theme === 'Dark' || profile.theme === 'dark',
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}