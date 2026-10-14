import React, { useState, useEffect } from 'react';
import { useAppContext } from './AppContext';
import Notes from './Notes';
import PrivateNotes from './PrivateNotes';
import SettingsView from './Settings';
import { ScrollText, Lock, Settings, Search, ShieldLock } from 'lucide-react';
import './App.css';

function App() {
  // Lấy thông tin user (profile) và hàm tải cài đặt (fetchSettings) từ Context toàn cục
  const { profile, fetchSettings } = useAppContext();

  // State quản lý Tab đang active (Notes, Private, Settings). 
  // Lưu vào localStorage để giữ nguyên tab khi tải lại trang.
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'notes';
  });

  // States quản lý thanh tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // States để xử lý việc click vào kết quả tìm kiếm và nhảy đến đúng ghi chú
  const [selectedTopicToJump, setSelectedTopicToJump] = useState(null);
  const [selectedPrivateNoteToJump, setSelectedPrivateNoteToJump] = useState(null);
  
  // State kiểm tra xem Vùng riêng tư đã được mở khóa bằng mật khẩu chưa
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false);

  // Hàm xử lý khi người dùng chuyển Tab
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    localStorage.setItem('activeTab', tabName);
    
    // Reset tìm kiếm khi đổi tab
    setSearchQuery('');
    setIsSearchOpen(false);

    // Tự động khóa lại Vùng riêng tư nếu rời sang tab khác (bảo mật)
    if (tabName !== 'private') {
      setIsPrivateUnlocked(false);
    }
  };

  // Effect xử lý logic Tìm kiếm mỗi khi searchQuery, activeTab hoặc trạng thái khóa thay đổi
  useEffect(() => {
    // Nếu ô tìm kiếm trống, đóng menu và xóa kết quả
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const q = searchQuery.toLowerCase().trim();

    // 1. Tìm kiếm trong Ghi chú công khai
    if (activeTab === 'notes') {
      fetch('http://localhost:5000/api/topics')
        .then((res) => res.json())
        .then(async (topics) => {
          if (!Array.isArray(topics)) return;
          let allNotes = [];
          
          // Lấy ghi chú của tất cả các chủ đề (topics)
          for (const topic of topics) {
            const topicName = typeof topic === 'object' ? topic.name : topic;
            try {
              const resNotes = await fetch(`http://localhost:5000/api/notes/${encodeURIComponent(topicName)}`);
              const notesData = await resNotes.json();
              if (Array.isArray(notesData)) {
                notesData.forEach(note => allNotes.push({ ...note, topicName, isPrivate: false }));
              }
            } catch (err) { console.error(err); }
          }
          // Lọc ra các ghi chú có tiêu đề chứa từ khóa tìm kiếm
          const filtered = allNotes.filter(n => n.title && n.title.toLowerCase().includes(q));
          setSearchResults(filtered);
          setIsSearchOpen(true);
        })
        .catch((err) => console.error(err));
    } 
    // 2. Tìm kiếm trong Ghi chú riêng tư (chỉ khi ĐÃ MỞ KHÓA)
    else if (activeTab === 'private' && isPrivateUnlocked) {
      fetch('http://localhost:5000/api/private-notes')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const filtered = data
              .filter(n => n.title && n.title.toLowerCase().includes(q))
              .map(n => ({ ...n, isPrivate: true }));
            setSearchResults(filtered);
            setIsSearchOpen(true);
          }
        })
        .catch((err) => console.error('Lỗi tìm kiếm bí mật:', err));
    }
  }, [searchQuery, activeTab, isPrivateUnlocked]);

  // Hàm hiển thị thông báo góc dưới màn hình (Toast) trong 3 giây
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Lấy dữ liệu hiển thị user từ Context
  const userName = profile.displayName || profile.name || 'Nguyễn Anh Đạt';
  const primaryColor = profile.primaryColor || '#7c3aed';
  const avatarLetter = userName ? userName.trim().charAt(0).toUpperCase() : 'U';

  // Logic hiển thị Placeholder cho thanh tìm kiếm tùy theo tab hiện tại
  let searchPlaceholder = "Tìm kiếm ghi chú công khai...";
  let isSearchDisabled = false;

  if (activeTab === 'private') {
    if (!isPrivateUnlocked) {
      searchPlaceholder = "Vui lòng mở khóa để tìm kiếm...";
      isSearchDisabled = true; // Khóa thanh tìm kiếm nếu vault chưa mở
    } else {
      searchPlaceholder = "Tìm kiếm bí mật riêng tư...";
    }
  } else if (activeTab === 'settings') {
    searchPlaceholder = "Không khả dụng trong Cài đặt";
    isSearchDisabled = true;
  }

  return (
    <div className="dashboard-container">
      {/* Hiển thị Toast thông báo nếu có */}
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}

      {/*  HEADER NAVBAR  */}
      <header className="top-navbar" style={{ height: 'auto', minHeight: '64px', boxSizing: 'border-box' }}>
        <div className="nav-left">
          {/* Logo & Tên ứng dụng */}
          <div className="brand-logo">
            <span className="logo-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <ShieldLock size={26} color={primaryColor} />
            </span>
            <div>
              <div className="brand-title">
                <strong>NoteVault</strong> <span className="badge-pro">PRO</span>
              </div>
              <small className="brand-sub">Không gian làm việc & Bảo mật</small>
            </div>
          </div>

          {/* Thanh menu điều hướng (Tabs) */}
          <nav className="nav-tabs">
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => handleTabChange('notes')}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <ScrollText size={16} style={{ marginRight: '6px' }} /> Ghi chú công khai
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'private' ? 'active' : ''}`}
              onClick={() => handleTabChange('private')}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <Lock size={16} style={{ marginRight: '6px' }} /> Vùng riêng tư 
              {isPrivateUnlocked ? <span style={{color:'#10b981', marginLeft:'4px', fontSize: '11px'}}> (Đã mở)</span> : <span className="dot-alert"></span>}
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <Settings size={16} style={{ marginRight: '6px' }} /> Cài đặt hệ thống
            </button>
          </nav>
        </div>

        <div className="nav-right">
          {/* Search */}
          <div className="search-box" style={{ position: 'relative' }}>
            <span className="search-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              disabled={isSearchDisabled}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery.trim() && !isSearchDisabled) setIsSearchOpen(true); }}
              style={{ opacity: isSearchDisabled ? 0.5 : 1, cursor: isSearchDisabled ? 'not-allowed' : 'text' }}
            />
            {/* Nút xóa kết quả tìm kiếm nhanh (dấu X) */}
            {searchQuery && !isSearchDisabled && (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' }}
                onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}

            {/* Menu Dropdown hiển thị kết quả tìm kiếm */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="search-dropdown-menu">
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', padding: '4px 8px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
                  KẾT QUẢ TÌM KIẾM ({searchResults.length})
                </div>
                {searchResults.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      // Xử lý khi click vào kết quả: Truyền ID để component con tự scroll tới
                      if (note.isPrivate) {
                        setSelectedPrivateNoteToJump(note.id);
                      } else {
                        setSelectedTopicToJump({ topic: note.topicName, noteId: note.id });
                      }
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="search-result-item"
                  >
                    <div style={{ overflow: 'hidden', marginRight: '10px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {note.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {note.content ? note.content.replace(/<[^>]*>?/gm, '').substring(0, 45) + '...' : ''}
                      </div>
                    </div>
                    {/* Hiển thị Badge báo hiệu đây là Note Công khai hay Riêng tư */}
                    {note.isPrivate ? (
                      <span className="badge-private" style={{ display: 'flex', alignItems: 'center' }}>
                        <Lock size={10} style={{ marginRight: '3px' }} /> {note.category}
                      </span>
                    ) : (
                      <span className="badge-public" style={{ color: primaryColor, display: 'flex', alignItems: 'center' }}>
                        <ScrollText size={10} style={{ marginRight: '3px' }} /> {note.topicName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* user profile */}
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px', flexShrink: 0 }}>
            <div className="avatar" style={{ backgroundColor: primaryColor, width: '36px', height: '36px', minWidth: '36px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                avatarLetter
              )}
            </div>
            <div className="user-details" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '150px', overflow: 'hidden' }}>
              <span className="user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', lineHeight: '1.2' }}>
                Xin chào, <strong>{userName}</strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content hạ tầng*/}
      {/* Tuỳ thuộc vào Tab đang chọn mà Render Component tương ứng */}
      <div className="dashboard-body-wrap">
        
        {/* Tab 1: Ghi chú công khai */}
        {activeTab === 'notes' && (
          <Notes
            primaryColor={primaryColor}
            showToast={showToast}
            searchQuery={searchQuery}
            selectedTopicToJump={selectedTopicToJump} // Truyền dữ liệu để scroll tới note nếu search
          />
        )}

        {/* Tab 2: Ghi chú riêng tư */}
        {activeTab === 'private' && (
          <PrivateNotes 
            isUnlocked={isPrivateUnlocked}
            onUnlock={() => setIsPrivateUnlocked(true)}
            onLock={() => setIsPrivateUnlocked(false)}
            onBackToPublic={() => handleTabChange('notes')} 
            searchQuery={searchQuery}
            showToast={showToast} 
            selectedPrivateNoteToJump={selectedPrivateNoteToJump} // Truyền dữ liệu để scroll tới note nếu search
          />
        )}

        {/* Tab 3: Cài đặt hệ thống */}
        {activeTab === 'settings' && (
          <SettingsView onUpdate={fetchSettings} showToast={showToast} />
        )}
      </div>
    </div>
  );
}

export default App;