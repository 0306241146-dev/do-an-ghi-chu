import React, { useState, useEffect } from 'react';
import { useAppContext } from './AppContext';
import { Settings as SettingsIcon, User, Palette, Sun, Moon, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';

//  Danh sách màu chủ đạo
const COLOR_PRESETS = [
  { name: 'Tím NoteVault', hex: '#7c3aed' },
  { name: 'Xanh Sapphire', hex: '#2563eb' },
  { name: 'Ngọc Lục Bảo', hex: '#059669' },
  { name: 'Hồng Thạch Anh', hex: '#e11d48' },
  { name: 'Hổ Phách', hex: '#d97706' },
];

function Settings({ onUpdate, showToast }) {
  // Lấy dữ liệu profile hiện tại và hàm cập nhật từ Context toàn cục
  const { profile, updateProfile } = useAppContext();

  //  State quản lý form data của form cài đặt (bao gồm tên hiển thị, email, theme, màu chủ đạo, mật khẩu hiện tại và mật khẩu vùng kín mới)
  const [formData, setFormData] = useState({
    displayName: profile.displayName || profile.name || 'Nguyễn Anh Đạt',
    email: profile.email || 'nguyenanhdat@gmail.com',
    theme: profile.theme || 'Light',
    primaryColor: profile.primaryColor || '#7c3aed',
    currentPassword: '', // Mật khẩu cũ (để xác thực khi muốn đổi mật khẩu mới)
    privatePassword: '', // Mật khẩu vùng kín mới
  });

  // State quản lý việc ẩn/hiện text trong ô nhập mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  //  Effect để đồng bộ formData với profile từ Context khi component mount hoặc profile thay đổi
  // Cập nhật lại form data mỗi khi dữ liệu profile từ Context thay đổi (ví dụ khi fetch API xong)
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        displayName: profile.displayName || prev.displayName,
        email: profile.email || prev.email,
        theme: profile.theme || prev.theme,
        primaryColor: profile.primaryColor || prev.primaryColor,
      }));
    }
  }, [profile]); 

  //  Hàm xem trước giao diện (Theme & Color) mà KHÔNG lưu vào database
  // Chỉ thay đổi thuộc tính CSS trên HTML để xem trước, chưa lưu vào database
  const handleThemePreview = (newTheme) => {
    setFormData((prev) => ({ ...prev, theme: newTheme }));
    document.documentElement.setAttribute('data-theme', newTheme.toLowerCase());
  };

  const handleColorPreview = (hex) => {
    setFormData((prev) => ({ ...prev, primaryColor: hex }));
    document.documentElement.style.setProperty('--primary-color', hex);
  };

  //  Effect hoàn tác
  // CỰC KỲ QUAN TRỌNG: Nếu người dùng bấm xem trước màu/theme nhưng KHÔNG bấm lưu,
  // khi họ chuyển sang tab khác (unmount), đoạn code này sẽ trả lại theme/màu gốc.
  useEffect(() => {
    return () => {
      document.documentElement.setAttribute('data-theme', profile.theme.toLowerCase());
      document.documentElement.style.setProperty('--primary-color', profile.primaryColor);
    };
  }, [profile.theme, profile.primaryColor]);

  // Kiểm tra xem hiện tại có đang ở chế độ Dark Mode hay không (phục vụ CSS nội tuyến)
  const isDark = formData.theme === 'Dark' || formData.theme === 'dark';

  //  Định dạng Css
  const themeStyles = {
    cardBg: isDark ? '#1e293b' : '#ffffff',
    textColor: isDark ? '#f8fafc' : '#1e293b',
    subTextColor: isDark ? '#94a3b8' : '#64748b',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    dividerColor: isDark ? '#334155' : '#f1f5f9',
    inputBg: isDark ? '#0f172a' : '#ffffff',
    inputBorder: isDark ? '#475569' : '#cbd5e1',
    badgeBg: isDark ? '#064e3b' : '#ecfdf5',
    badgeText: isDark ? '#34d399' : '#059669',
    badgeBorder: isDark ? '#047857' : '#a7f3d0',
  };

  //  Tiện ích mật khẩu
  // Tạo chuỗi ngẫu nhiên dài 16 ký tự làm mật khẩu bảo mật cao
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let randPass = '';
    for (let i = 0; i < 16; i++) {
      randPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, privatePassword: randPass }));
  };

  // Đánh giá độ mạnh của mật khẩu để hiển thị thanh màu bên dưới
  const getPasswordStrength = (pass) => {
    if (!pass) return { label: 'Chưa nhập', color: '#94a3b8', width: '0%' };
    if (pass.length < 6) return { label: 'Yếu', color: '#ef4444', width: '25%' };
    if (pass.length < 10) return { label: 'Trung bình', color: '#f59e0b', width: '60%' };
    return { label: 'Rất mạnh (Strong)', color: '#10b981', width: '100%' };
  };

  const strength = getPasswordStrength(formData.privatePassword);

  //  Xử lý lưu cài đặt 
  const handleSave = (e) => {
    if (e) e.preventDefault();

    const payload = {
      displayName: formData.displayName,
      email: formData.email,
      theme: formData.theme,
      primaryColor: formData.primaryColor,
    };

    // Nếu người dùng nhập mật khẩu mới, bắt buộc phải có mật khẩu hiện tại
    if (formData.privatePassword.trim()) {
      if (!formData.currentPassword.trim()) {
        alert('Vui lòng nhập Mật khẩu hiện tại để xác minh trước khi đổi mật khẩu mới!');
        return;
      }
      payload.currentPassword = formData.currentPassword.trim();
      payload.privatePassword = formData.privatePassword.trim();
    }

    // Gửi data cập nhật lên Server
    fetch('http://localhost:5000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          if (showToast) showToast('Đã lưu cài đặt tài khoản thành công!');
          updateProfile(data.settings || payload); // Đồng bộ lại Context toàn cục
          setFormData((prev) => ({ ...prev, currentPassword: '', privatePassword: '' })); // Reset ô mật khẩu sau khi đổi thành công
          if (onUpdate) onUpdate(); // Trigger lại dữ liệu nếu cần
        } else {
          alert(data.message || 'Không thể lưu cài đặt!');
        }
      })
      .catch((err) => alert('Không thể kết nối đến máy chủ: ' + err.message));
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif', color: themeStyles.textColor, transition: 'all 0.2s ease', width: '100%', boxSizing: 'border-box' }}>
      
      {/*  TIÊU ĐỀ TRANG CÀI ĐẶT  */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: themeStyles.textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsIcon size={24} /> Cài đặt hệ thống
          </h2>
          <p style={{ margin: '4px 0 0 0', color: themeStyles.subTextColor, fontSize: '14px' }}>
            Quản lý tùy chọn hồ sơ cá nhân và bảo mật của bạn.
          </p>
        </div>
      </div>

      {/*  Hồ sơ và Tài khoản  */}
      <div style={{ background: themeStyles.cardBg, border: `1px solid ${themeStyles.borderColor}`, borderRadius: '12px', padding: '20px', marginBottom: '20px', transition: 'all 0.2s ease' }}>
        <div style={{ marginBottom: '16px', borderBottom: `1px solid ${themeStyles.dividerColor}`, paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: themeStyles.textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} /> Hồ sơ & Tài khoản
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', color: themeStyles.textColor }}>Tên hiển thị (Display Name)</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${themeStyles.inputBorder}`, backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', color: themeStyles.textColor }}>Địa chỉ Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${themeStyles.inputBorder}`, backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/*  Giao diện & Trực quan  */}
      <div style={{ background: themeStyles.cardBg, border: `1px solid ${themeStyles.borderColor}`, borderRadius: '12px', padding: '20px', marginBottom: '20px', transition: 'all 0.2s ease' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', borderBottom: `1px solid ${themeStyles.dividerColor}`, paddingBottom: '12px', color: themeStyles.textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={18} /> Giao diện & Trực quan
        </h3>

        {/* Lựa chọn Dark/Light Mode */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', color: themeStyles.textColor }}>Chế độ hiển thị (Theme Mode)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            
            {/* Box chọn Light Mode */}
            <div
              onClick={() => handleThemePreview('Light')}
              style={{
                border: !isDark ? `2px solid ${formData.primaryColor}` : `1px solid ${themeStyles.borderColor}`,
                borderRadius: '10px',
                padding: '12px',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                color: '#1e293b'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px' }}>
                  <Sun size={16} /> Sáng (Light)
                </span>
                {!isDark && <span style={{ color: formData.primaryColor, fontWeight: 'bold' }}>✓</span>}
              </div>
            </div>

            {/* Box chọn Dark Mode */}
            <div
              onClick={() => handleThemePreview('Dark')}
              style={{
                border: isDark ? `2px solid ${formData.primaryColor}` : `1px solid ${themeStyles.borderColor}`,
                borderRadius: '10px',
                padding: '12px',
                cursor: 'pointer',
                backgroundColor: '#0f172a',
                color: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px' }}>
                  <Moon size={16} /> Tối (Dark)
                </span>
                {isDark && <span style={{ color: formData.primaryColor, fontWeight: 'bold' }}>✓</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Lựa chọn Bảng Màu */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: themeStyles.textColor }}>Màu sắc chủ đạo (Primary Accent)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => handleColorPreview(preset.hex)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: `2px solid ${formData.primaryColor === preset.hex ? preset.hex : 'transparent'}`,
                  boxShadow: formData.primaryColor !== preset.hex ? `inset 0 0 0 1px ${themeStyles.inputBorder}` : 'none',
                  backgroundColor: themeStyles.inputBg,
                  color: themeStyles.textColor,
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: preset.hex, display: 'inline-block' }}></span>
                {preset.name}
              </button>
            ))}

            {/* Chọn màu tùy chỉnh (Color Picker) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', border: `1px solid ${themeStyles.inputBorder}`, backgroundColor: themeStyles.inputBg, padding: '4px 8px', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: themeStyles.subTextColor, fontWeight: 'bold' }}>HEX:</span>
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => handleColorPreview(e.target.value)}
                style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', background: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/*  Đổi mật khẩu Vùng riêng tư  */}
      <div style={{ background: themeStyles.cardBg, border: `1px solid ${themeStyles.borderColor}`, borderRadius: '12px', padding: '20px', marginBottom: '24px', transition: 'all 0.2s ease' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', borderBottom: `1px solid ${themeStyles.dividerColor}`, paddingBottom: '12px', color: themeStyles.textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={18} /> Đổi Mật khẩu Vùng riêng tư
        </h3>

        {/* Mật khẩu hiện tại (Yêu cầu nhập nếu muốn đổi password) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', color: themeStyles.textColor }}>
            Mật khẩu hiện tại *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu hiện tại để xác minh..."
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: `1px solid ${themeStyles.inputBorder}`, backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, fontSize: '14px', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: themeStyles.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {showCurrentPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
        </div>

        {/* Mật khẩu mới */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px', color: themeStyles.textColor }}>Mật khẩu vùng riêng tư mới</label>
            <button type="button" onClick={generateRandomPassword} style={{ background: 'none', border: 'none', color: formData.primaryColor, cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <KeyRound size={14} /> Tạo ngẫu nhiên
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu mới..."
              value={formData.privatePassword}
              onChange={(e) => setFormData({ ...formData, privatePassword: e.target.value })}
              style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: `1px solid ${themeStyles.inputBorder}`, backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, fontSize: '14px', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: themeStyles.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          {/* Thanh hiển thị độ mạnh của mật khẩu */}
          {formData.privatePassword && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ height: '4px', width: '100%', backgroundColor: themeStyles.dividerColor, borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: strength.width, backgroundColor: strength.color, transition: 'width 0.3s ease' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                <span style={{ color: themeStyles.subTextColor }}>Độ mạnh mật khẩu:</span>
                <span style={{ color: strength.color, fontWeight: 'bold' }}>{strength.label}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/*  Button lưu thay đổi  */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          type="button"
          onClick={handleSave}
          style={{ backgroundColor: formData.primaryColor, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', width: '100%', maxWidth: '200px' }}
        >
          ✓ Lưu thay đổi
        </button>
      </div>

    </div>
  );
}

export default Settings;