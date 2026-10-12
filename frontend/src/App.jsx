import React, { useState, useEffect } from 'react';
import { useAppContext } from './AppContext';
import Notes from './Notes';
import PrivateNotes from './PrivateNotes';
import SettingsView from './Settings';
import { ScrollText, Lock, Settings, Search, ShieldLock } from 'lucide-react';
import './App.css';

function App() {
  const { profile, fetchSettings } = useAppContext();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'notes';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [selectedTopicToJump, setSelectedTopicToJump] = useState(null);
  const [selectedPrivateNoteToJump, setSelectedPrivateNoteToJump] = useState(null);
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    localStorage.setItem('activeTab', tabName);
    
    setSearchQuery('');
    setIsSearchOpen(false);

    if (tabName !== 'private') {
      setIsPrivateUnlocked(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const q = searchQuery.toLowerCase().trim();

    if (activeTab === 'notes') {
      fetch('http://localhost:5000/api/topics')
        .then((res) => res.json())
        .then(async (topics) => {
          if (!Array.isArray(topics)) return;
          let allNotes = [];
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
          const filtered = allNotes.filter(n => n.title && n.title.toLowerCase().includes(q));
          setSearchResults(filtered);
          setIsSearchOpen(true);
        })
        .catch((err) => console.error(err));
    } 
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const userName = profile.displayName || profile.name || 'Nguyễn Anh Đạt';
  const primaryColor = profile.primaryColor || '#7c3aed';
  const avatarLetter = userName ? userName.trim().charAt(0).toUpperCase() : 'U';

  let searchPlaceholder = "Tìm kiếm ghi chú công khai...";
  let isSearchDisabled = false;

  if (activeTab === 'private') {
    if (!isPrivateUnlocked) {
      searchPlaceholder = "Vui lòng mở khóa để tìm kiếm...";
      isSearchDisabled = true;
    } else {
      searchPlaceholder = "Tìm kiếm bí mật riêng tư...";
    }
  } else if (activeTab === 'settings') {
    searchPlaceholder = "Không khả dụng trong Cài đặt";
    isSearchDisabled = true;
  }

  return (
    <div className="dashboard-container">
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}

      <header className="top-navbar" style={{ height: 'auto', minHeight: '64px', boxSizing: 'border-box' }}>
        <div className="nav-left">
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
            {searchQuery && !isSearchDisabled && (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' }}
                onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}

            {isSearchOpen && searchResults.length > 0 && (
              <div className="search-dropdown-menu">
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', padding: '4px 8px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
                  KẾT QUẢ TÌM KIẾM ({searchResults.length})
                </div>
                {searchResults.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
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

      <div className="dashboard-body-wrap">
        {activeTab === 'notes' && (
          <Notes
            primaryColor={primaryColor}
            showToast={showToast}
            searchQuery={searchQuery}
            selectedTopicToJump={selectedTopicToJump}
          />
        )}
        {activeTab === 'private' && (
          <PrivateNotes 
            isUnlocked={isPrivateUnlocked}
            onUnlock={() => setIsPrivateUnlocked(true)}
            onLock={() => setIsPrivateUnlocked(false)}
            onBackToPublic={() => handleTabChange('notes')} 
            searchQuery={searchQuery}
            showToast={showToast} 
            selectedPrivateNoteToJump={selectedPrivateNoteToJump}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView onUpdate={fetchSettings} showToast={showToast} />
        )}
      </div>
    </div>
  );
}

export default App;