import React, { createContext, useState, useEffect, useContext } from 'react';

// 1. Khởi tạo Context toàn cục cho ứng dụng
const AppContext = createContext();

export function AppProvider({ children }) {
  // 2. Khởi tạo State profile chứa thông tin user, theme và màu chủ đạo
  const [profile, setProfile] = useState(() => {
    // Lấy cài đặt đã lưu trong localStorage (nếu có), nếu không dùng mặc định
    const savedTheme = localStorage.getItem('appTheme') || 'Light';
    const savedColor = localStorage.getItem('appColor') || '#7c3aed';
    
    // Áp dụng ngay Theme và Màu sắc vào thẻ <html> (document.documentElement) 
    // ngay từ lúc khởi tạo để tránh tình trạng "nháy/giật" giao diện (flicker) khi tải trang
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

  // 3. Hàm gọi API để lấy cấu hình (settings) mới nhất từ Server Backend
  const fetchSettings = () => {
    const apiUrl = 'http://localhost:5000/api/settings';
    // Thêm cache: 'no-store' để bắt buộc trình duyệt lấy dữ liệu mới nhất từ server, không dùng cache cũ
    fetch(apiUrl, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const currentTheme = data.theme || 'Light';
          const currentPrimary = data.primaryColor || '#7c3aed';

          // Cập nhật lại giao diện (CSS Variables) theo dữ liệu từ server
          document.documentElement.setAttribute('data-theme', currentTheme.toLowerCase());
          document.documentElement.style.setProperty('--primary-color', currentPrimary);
          
          // Lưu vào bộ nhớ cục bộ để dùng cho lần mở web tiếp theo
          localStorage.setItem('appTheme', currentTheme);
          localStorage.setItem('appColor', currentPrimary);

          // Cập nhật lại state của profile
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

  // Gọi hàm fetchSettings một lần duy nhất khi ứng dụng vừa load lên (Mount)
  useEffect(() => {
    fetchSettings();
  }, []);

  // 4. Các hàm hỗ trợ thay đổi giao diện ngay lập tức (dùng trong trang Cài đặt)
  
  // Hàm đổi Theme (Sáng/Tối)
  const changeTheme = (newTheme) => {
    setProfile((prev) => ({ ...prev, theme: newTheme }));
    document.documentElement.setAttribute('data-theme', newTheme.toLowerCase());
    localStorage.setItem('appTheme', newTheme);
  };

  // Hàm đổi Màu chủ đạo (Primary Color)
  const changePrimaryColor = (colorHex) => {
    setProfile((prev) => ({ ...prev, primaryColor: colorHex }));
    document.documentElement.style.setProperty('--primary-color', colorHex);
    localStorage.setItem('appColor', colorHex);
  };

  // Hàm cập nhật toàn bộ Profile
  const updateProfile = (newProfile) => {
    setProfile((prev) => ({ ...prev, ...newProfile }));
    if (newProfile.theme) changeTheme(newProfile.theme);
    if (newProfile.primaryColor) changePrimaryColor(newProfile.primaryColor);
  };

  // 5. Trả về Provider bọc lấy toàn bộ ứng dụng, 
  // cung cấp các giá trị và hàm xử lý này cho bất kỳ Component con nào cần dùng
  return (
    <AppContext.Provider
      value={{
        profile,
        changeTheme,
        changePrimaryColor,
        updateProfile,
        fetchSettings,
        // Cờ tiện ích để các component dễ dàng kiểm tra xem có đang ở chế độ Dark Mode không
        isDark: profile.theme === 'Dark' || profile.theme === 'dark',
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// 6. Custom Hook giúp các Component khác lấy dữ liệu dễ dàng hơn
// Thay vì phải import useContext và AppContext ở khắp nơi, chỉ cần dùng: const { profile } = useAppContext();
export function useAppContext() {
  return useContext(AppContext);
}