import React, { useState, useEffect } from 'react';
// Import bộ icon từ lucide-react
import { Lock, KeyRound, Eye, EyeOff, ArrowLeft, Unlock } from 'lucide-react';

function PrivateVaultLock({ onUnlockSuccess, onBackToPublic }) {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Kiểm tra trạng thái mật khẩu trên Server khi mở màn hình
  useEffect(() => {
    fetch('http://localhost:5000/api/auth/check-status')
      .then((res) => res.json())
      .then((data) => {
        // Nếu chưa có mật khẩu -> Bật chế độ Khởi tạo lần đầu
        if (data && data.hasPassword === false) {
          setIsFirstTime(true);
        }
      })
      .catch((err) => console.error('Lỗi kiểm tra mật khẩu:', err));
  }, []);

  // 2. Xử lý Mở khóa hoặc Khởi tạo
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Vui lòng nhập mật mã!');
      return;
    }

    if (isFirstTime) {
      // TRƯỜNG HỢP 1: LẦN ĐẦU TIÊN -> THIẾT LẬP MẬT KHẨU MỚI
      if (password !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không trùng khớp!');
        return;
      }

      fetch('http://localhost:5000/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            alert('🎉 Đã khởi tạo mật khẩu bảo vệ thành công!');
            onUnlockSuccess();
          } else {
            setErrorMsg(data.message || 'Lỗi khởi tạo mật khẩu');
          }
        });
    } else {
      // TRƯỜNG HỢP 2: TỪ LẦN THỨ 2 TRỞ ĐI -> XÁC THỰC MỞ KHÓA
      fetch('http://localhost:5000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setErrorMsg('');
            onUnlockSuccess();
          } else {
            setErrorMsg('Mật khẩu không chính xác!');
          }
        })
        .catch(() => setErrorMsg('Không thể kết nối đến máy chủ!'));
    }
  };

  return (
    <div className="vault-lock-screen">
      <div className="vault-top-bar">
        <button className="btn-back-link" onClick={onBackToPublic} style={{ display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={14} style={{ marginRight: '6px' }} /> Quay lại Ghi chú công khai
        </button>
        <span className="vault-badge-tag" style={{ display: 'flex', alignItems: 'center' }}>
          <Lock size={12} style={{ marginRight: '4px' }} /> Phân vùng bảo vệ
        </span>
      </div>

      <div className="vault-card">
        <div className="vault-icon-container">
          <div className="vault-icon-box">
            <span className="vault-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              {isFirstTime ? <KeyRound size={32} /> : <Lock size={32} />}
            </span>
          </div>
        </div>

        <h2 className="vault-title">
          {isFirstTime ? 'Khởi tạo Mật khẩu Bảo vệ' : 'Mật khẩu Vùng Riêng tư'}
        </h2>
        <p className="vault-subtitle">
          {isFirstTime
            ? 'Đây là lần đầu tiên bạn sử dụng. Vui lòng thiết lập mật khẩu chuyên biệt để bảo vệ các ghi chú riêng tư.'
            : 'Vui lòng nhập mật mã chuyên biệt để giải mã và mở khóa toàn bộ ghi chú bảo mật cá nhân.'}
        </p>

        <form onSubmit={handleSubmit} className="vault-form">
          <div style={{ marginBottom: '14px' }}>
            <label className="vault-label">
              {isFirstTime ? 'MẬT KHẨU MỚI *' : 'MẬT KHẨU MỞ KHÓA *'}
            </label>
            <div className="vault-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={isFirstTime ? 'Nhập mật khẩu mới...' : 'Nhập mật mã vùng riêng tư...'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                autoFocus
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {/* Ô nhập lại mật khẩu chỉ hiển thị khi Khởi tạo lần đầu */}
          {isFirstTime && (
            <div style={{ marginBottom: '14px' }}>
              <label className="vault-label">XÁC NHẬN MẬT KHẨU MỚI *</label>
              <div className="vault-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu..."
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                />
              </div>
            </div>
          )}

          {errorMsg && <p className="vault-error-msg">{errorMsg}</p>}

          <button type="submit" className="btn-unlock-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isFirstTime ? (
              <><KeyRound size={16} style={{ marginRight: '6px' }} /> Thiết lập & Mở khóa</>
            ) : (
              <><Unlock size={16} style={{ marginRight: '6px' }} /> Mở khóa Vùng riêng tư</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PrivateVaultLock;