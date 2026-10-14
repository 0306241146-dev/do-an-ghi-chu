import React, { useState, useEffect } from 'react';
// Import bộ icon từ lucide-react
import { Lock, KeyRound, Eye, EyeOff, ArrowLeft, Unlock } from 'lucide-react';

function PrivateVaultLock({ onUnlockSuccess, onBackToPublic }) {
  //  State quản lý trạng thái
  const [isFirstTime, setIsFirstTime] = useState(false); // Cờ kiểm tra xem người dùng đã thiết lập mật khẩu vault chưa
  const [password, setPassword] = useState(''); // Lưu trữ mật khẩu người dùng đang nhập
  const [confirmPassword, setConfirmPassword] = useState(''); // Lưu trữ mật khẩu xác nhận (chỉ dùng cho lần đầu thiết lập)
  const [showPassword, setShowPassword] = useState(false); // Trạng thái ẩn/hiện mật khẩu (biểu tượng con mắt)
  const [errorMsg, setErrorMsg] = useState(''); // Lưu thông báo lỗi hiển thị lên giao diện (nhập sai, không khớp...)

  //  1. Kiểm tra trạng thái lần đầu tiên sử dụng (chưa có mật khẩu) hay đã thiết lập rồi
  //  Gọi API backend để kiểm tra trạng thái
  // Chạy một lần duy nhất khi component vừa được render
  useEffect(() => {
    fetch('http://localhost:5000/api/auth/check-status')
      .then((res) => res.json())
      .then((data) => {
        // Nếu backend trả về chưa có mật khẩu -> Bật chế độ Khởi tạo lần đầu
        if (data && data.hasPassword === false) {
          setIsFirstTime(true);
        }
      })
      .catch((err) => console.error('Lỗi kiểm tra mật khẩu:', err));
  }, []);

  //  2. Xử lý khi người dùng submit form (thiết lập mật khẩu hoặc mở khóa)
  const handleSubmit = (e) => {
    e.preventDefault(); // Ngăn trình duyệt reload lại trang khi submit form
    
    // Validate cơ bản: Không cho phép gửi nếu chưa nhập gì
    if (!password.trim()) {
      setErrorMsg('Vui lòng nhập mật mã!');
      return;
    }

    if (isFirstTime) {
      //  Trường hợp 1: Lần đầu tiên thiết lập mật khẩu bảo vệ 
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
            onUnlockSuccess(); // Gọi hàm callback để thông báo cho component cha (App.jsx/PrivateNotes.jsx) mở khóa UI
          } else {
            setErrorMsg(data.message || 'Lỗi khởi tạo mật khẩu');
          }
        });
    } else {
      //  Trường hợp 2: Người dùng đã thiết lập mật khẩu trước đó, chỉ cần nhập mật khẩu đã thiết lập
      fetch('http://localhost:5000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setErrorMsg(''); // Xóa lỗi cũ nếu có
            onUnlockSuccess(); // Mật khẩu chính xác -> Mở khóa
          } else {
            setErrorMsg('Mật khẩu không chính xác!');
          }
        })
        .catch(() => setErrorMsg('Không thể kết nối đến máy chủ!'));
    }
  };

  return (
    <div className="vault-lock-screen">
      {/*  Thanh điều hướng trên cùng  */}
      <div className="vault-top-bar">
        <button className="btn-back-link" onClick={onBackToPublic} style={{ display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={14} style={{ marginRight: '6px' }} /> Quay lại Ghi chú công khai
        </button>
        <span className="vault-badge-tag" style={{ display: 'flex', alignItems: 'center' }}>
          <Lock size={12} style={{ marginRight: '4px' }} /> Phân vùng bảo vệ
        </span>
      </div>

      {/*  Khung nhập mật khẩu (FORM)  */}
      <div className="vault-card">
        {/* Icon Header thay đổi linh hoạt tùy theo việc đang tạo mới hay đang mở khóa */}
        <div className="vault-icon-container">
          <div className="vault-icon-box">
            <span className="vault-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              {isFirstTime ? <KeyRound size={32} /> : <Lock size={32} />}
            </span>
          </div>
        </div>

        {/* Tiêu đề và Mô tả thay đổi theo trạng thái isFirstTime */}
        <h2 className="vault-title">
          {isFirstTime ? 'Khởi tạo Mật khẩu Bảo vệ' : 'Mật khẩu Vùng Riêng tư'}
        </h2>
        <p className="vault-subtitle">
          {isFirstTime
            ? 'Đây là lần đầu tiên bạn sử dụng. Vui lòng thiết lập mật khẩu chuyên biệt để bảo vệ các ghi chú riêng tư.'
            : 'Vui lòng nhập mật mã chuyên biệt để giải mã và mở khóa toàn bộ ghi chú bảo mật cá nhân.'}
        </p>

        <form onSubmit={handleSubmit} className="vault-form">
          {/* Trường nhập mật khẩu chính */}
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
                  if (errorMsg) setErrorMsg(''); // Tự động dọn sạch dòng báo lỗi khi người dùng bắt đầu gõ lại
                }}
                autoFocus // Tự động focus vào ô này khi trang vừa được tải lên
              />
              {/* Nút bật tắt ẩn/hiện mật khẩu */}
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

          {/* Trường nhập lại mật khẩu (Chỉ render ra UI nếu là lần đầu thiết lập) */}
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
                    if (errorMsg) setErrorMsg(''); // Tương tự, xóa lỗi khi đang gõ
                  }}
                />
              </div>
            </div>
          )}

          {/* Khu vực hiển thị thông báo lỗi (Màu đỏ) */}
          {errorMsg && <p className="vault-error-msg">{errorMsg}</p>}

          {/* Nút submit xác nhận */}
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