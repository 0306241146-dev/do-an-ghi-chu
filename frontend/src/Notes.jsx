import React, { useState, useEffect, useRef } from 'react';
import { Folder, Trash2, Edit3, RotateCcw, Plus, PenLine, Bold, Italic, List, Link, Code, ChevronUp, ChevronDown, RotateCcwClock } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

function Notes({ primaryColor = '#6366f1', showToast, searchQuery = '', selectedTopicToJump }) {
  //  STATE QUẢN LÝ CHỦ ĐỀ (TOPICS) 
  const [topics, setTopics] = useState(['Học tập', 'Công việc', 'Bài tập']);
  const [topic, setTopic] = useState(() => localStorage.getItem('selectedTopic') || 'Học tập');
  const [newTopicInput, setNewTopicInput] = useState('');
  
  //  STATE QUẢN LÝ GHI CHÚ (NOTES) 
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState({ id: null, title: '', content: '' }); // Dữ liệu đang soạn thảo
  const [highlightedNoteId, setHighlightedNoteId] = useState(null); // ID ghi chú được highlight khi tìm kiếm

  //  STATE QUẢN LÝ THÙNG RÁC 
  const [showTrash, setShowTrash] = useState(false);
  const [trash, setTrash] = useState(() => JSON.parse(localStorage.getItem('noteVaultTrash') || '[]'));

  //  STATE QUẢN LÝ TRÌNH SOẠN THẢO (EDITOR) 
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  
  //  STATE GIAO DIỆN (UI) 
  const [expandedNoteId, setExpandedNoteId] = useState(null); // ID ghi chú đang được mở rộng (xem thêm)

  const editorRef = useRef(null); // Tham chiếu đến thẻ div contentEditable

  // Lưu thùng rác vào localStorage mỗi khi có thay đổi
  useEffect(() => {
    localStorage.setItem('noteVaultTrash', JSON.stringify(trash));
  }, [trash]);

  // Hàm tiện ích lấy tên chủ đề (tránh lỗi object)
  const getTopicName = (t) => (t && typeof t === 'object' ? t.name || t.id : t) || '';

  // Kiểm tra trạng thái format (in đậm, in nghiêng) tại vị trí con trỏ chuột
  const checkActiveStates = () => {
    try {
      setIsBoldActive(document.queryCommandState('bold'));
      setIsItalicActive(document.queryCommandState('italic'));
    } catch (e) {}
  };

  //  Các hàm xử lý chủ đề
  const changeTopic = (newTopic) => {
    const currentName = getTopicName(topic);
    const targetName = getTopicName(newTopic);
    if (currentName === targetName) return;

    // Cảnh báo nếu đang soạn thảo dở dang
    const hasUnsavedTitle = formData.title.trim().length > 0;
    const hasUnsavedContent = editorRef.current && editorRef.current.innerText.trim().length > 0;
    if (hasUnsavedTitle || hasUnsavedContent) {
      if (!window.confirm('Bạn đang có nội dung ghi chú chưa lưu. Chuyển chủ đề sẽ hủy bỏ thay đổi này. Bạn có chắc chắn không?')) return;
    }

    setShowTrash(false);
    setExpandedNoteId(null); 
    setTopic(newTopic);
    localStorage.setItem('selectedTopic', targetName);
  };

  // Hiệu ứng nhảy đến ghi chú/chủ đề khi click từ thanh tìm kiếm
  useEffect(() => {
    if (selectedTopicToJump && selectedTopicToJump.topic) {
      changeTopic(selectedTopicToJump.topic);
      if (selectedTopicToJump.noteId) setHighlightedNoteId(selectedTopicToJump.noteId);
    }
  }, [selectedTopicToJump]);

  // Scroll màn hình tới ghi chú đang được highlight
  useEffect(() => {
    if (highlightedNoteId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`note-card-${highlightedNoteId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [notes, highlightedNoteId]);

  //  Kết nối Api để tải danh sách chủ đề và ghi chú từ server
  const fetchTopics = () => {
    fetch(`${API_BASE}/topics`).then((res) => res.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setTopics(data);
        const currentName = getTopicName(topic);
        if (!data.some((t) => getTopicName(t) === currentName)) changeTopic(data[0]);
      }
    }).catch(() => {});
  };

  const fetchNotes = () => {
    const topicName = getTopicName(topic);
    if (!topicName) return;
    fetch(`${API_BASE}/notes/${encodeURIComponent(topicName)}`).then((res) => res.json()).then((data) => {
      if (Array.isArray(data)) setNotes(data);
    }).catch(() => {});
  };

  // Tải danh sách chủ đề lần đầu
  useEffect(() => { fetchTopics(); }, []);
  
  // Tải lại ghi chú và reset form mỗi khi đổi chủ đề
  useEffect(() => { fetchNotes(); handleResetForm(); }, [topic]);

  //  Xử lý Editer và form data
  const handleEditNote = (note) => {
    setFormData(note);
    if (editorRef.current) editorRef.current.innerHTML = note.content || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    setFormData({ id: null, title: '', content: '' });
    if (editorRef.current) editorRef.current.innerHTML = '';
    setIsBoldActive(false); setIsItalicActive(false); setShowListMenu(false);
  };

  // Đồng bộ nội dung từ contentEditable sang state
  const syncEditorContent = () => {
    if (editorRef.current) {
      if (!editorRef.current.innerText.trim() && editorRef.current.innerHTML !== '') {
        editorRef.current.innerHTML = '';
      }
      setFormData((prev) => ({ ...prev, content: editorRef.current.innerHTML }));
    }
    checkActiveStates();
  };

  // Xử lý phím tắt đặc biệt (ví dụ xóa thẻ link)
  const handleEditorKeyDown = (e) => {
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const node = sel.anchorNode;
        const parentElement = node.nodeType === 3 ? node.parentNode : node;
        const linkNode = parentElement.closest('a');
        if (linkNode) { e.preventDefault(); linkNode.remove(); syncEditorContent(); }
      }
    }
  };

  // Các hàm định dạng văn bản (In đậm, In nghiêng, Chèn Link, Code)
  const applyFormat = (command) => {
    if (!editorRef.current) return;
    if (document.activeElement !== editorRef.current) editorRef.current.focus();
    const selection = window.getSelection();
    const isEmpty = !editorRef.current.innerText.trim() && editorRef.current.innerHTML !== '<br>';

    switch (command) {
      case 'bold':
      case 'italic':
        if (isEmpty || editorRef.current.innerHTML === '<br>') {
          const tag = command === 'bold' ? 'strong' : 'em';
          editorRef.current.innerHTML = `<${tag}><br></${tag}>`;
          const range = document.createRange();
          range.selectNodeContents(editorRef.current.querySelector(tag));
          range.collapse(true);
          selection.removeAllRanges(); selection.addRange(range);
        } else document.execCommand(command, false, null);
        break;
      case 'link': {
        if (!selection || selection.rangeCount === 0) return;
        const anchorNode = selection.anchorNode;
        const parentLink = anchorNode ? (anchorNode.nodeType === 3 ? anchorNode.parentNode : anchorNode).closest('a') : null;
        if (parentLink) {
          if (window.confirm('Bạn có muốn hủy bỏ liên kết này không?')) {
            const range = document.createRange();
            range.selectNodeContents(parentLink);
            selection.removeAllRanges(); selection.addRange(range);
            document.execCommand('unlink', false, null);
          }
        } else {
          const url = prompt('Nhập đường dẫn liên kết (URL):', 'https://');
          if (url && url.trim()) {
            const formattedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
            let linkText = selection.toString();
            if (!linkText) linkText = prompt('Nhập tên hiển thị:', 'Click vào đây') || formattedUrl;
            document.execCommand('insertHTML', false, `<a href="${formattedUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`);
          }
        }
        break;
      }
      case 'code': {
        // ... (Logic chèn thẻ <code>)
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const containerNode = range.commonAncestorContainer;
        const codeParent = containerNode.nodeType === 3 ? containerNode.parentNode.closest('code') : containerNode.closest('code');
        if (codeParent) {
          const textNode = document.createTextNode(codeParent.textContent);
          codeParent.parentNode.replaceChild(textNode, codeParent);
        } else {
          const codeEl = document.createElement('code');
          codeEl.textContent = range.toString() || 'mã_code';
          range.deleteContents(); range.insertNode(codeEl);
          range.setStartAfter(codeEl); range.setEndAfter(codeEl);
          selection.removeAllRanges(); selection.addRange(range);
        }
        break;
      }
      default: break;
    }
    checkActiveStates(); syncEditorContent();
  };

  // Định dạng danh sách (Bullet, Number, Dash)
  const applyListFormat = (type) => {
    if (!editorRef.current) return;
    if (document.activeElement !== editorRef.current) editorRef.current.focus();

    if (!editorRef.current.innerText.trim() && (editorRef.current.innerHTML === '' || editorRef.current.innerHTML === '<br>')) {
      editorRef.current.innerHTML = '<div><br></div>';
      const range = document.createRange();
      range.selectNodeContents(editorRef.current.firstChild);
      range.collapse(true);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    }
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const node = sel.anchorNode;
      const el = node.nodeType === 3 ? node.parentNode : node;
      const currentList = el ? el.closest('ul') : null;
      if (currentList && (type === 'dash' || type === 'bullet')) {
        const currentType = currentList.getAttribute('data-list');
        if (currentType !== type) {
          currentList.setAttribute('data-list', type);
          setShowListMenu(false); syncEditorContent(); return;
        }
      }
    }

    if (type === 'number') document.execCommand('insertOrderedList', false, null);
    else document.execCommand('insertUnorderedList', false, null);

    setTimeout(() => {
      const newSel = window.getSelection();
      if (newSel.rangeCount > 0) {
        const node = newSel.anchorNode;
        const el = node.nodeType === 3 ? node.parentNode : node;
        const ul = el ? el.closest('ul') : null;
        if (ul) ul.setAttribute('data-list', type === 'dash' ? 'dash' : 'bullet');
      }
      syncEditorContent();
    }, 0);
    setShowListMenu(false); checkActiveStates();
  };

  // Đóng/mở rộng chiều cao thẻ ghi chú nếu nội dung quá dài
  const toggleExpand = (id) => {
    if (expandedNoteId === id) {
      setExpandedNoteId(null);
    } else {
      setExpandedNoteId(id);
      setTimeout(() => {
        const el = document.getElementById(`note-card-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  //  CÁC HÀM LƯU / XÓA DỮ LIỆU 
  const handleAddTopic = () => {
    const trimmed = newTopicInput.trim();
    if (!trimmed) return alert('Vui lòng nhập tên chủ đề!');
    if (topics.some((t) => getTopicName(t).toLowerCase() === trimmed.toLowerCase())) return alert(`Chủ đề "${trimmed}" đã tồn tại!`);

    fetch(`${API_BASE}/topics`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: trimmed }),
    }).then((res) => res.json()).then((data) => {
      const addedTopic = data.topic || data.name || trimmed;
      setTopics((prev) => [...prev, addedTopic]);
      changeTopic(addedTopic);
      setNewTopicInput('');
      if (showToast) showToast(`Đã tạo chủ đề "${getTopicName(addedTopic)}"!`);
    }).catch(() => {
      setTopics((prev) => [...prev, trimmed]); changeTopic(trimmed); setNewTopicInput('');
    });
  };

  const handleDeleteTopic = () => {
    if (topics.length <= 1) return alert('Cần giữ lại ít nhất 1 chủ đề!');
    const currentTopicName = getTopicName(topic);
    if (window.confirm(`Xóa chủ đề "${currentTopicName}" và toàn bộ ghi chú bên trong?`)) {
      fetch(`${API_BASE}/topics/${encodeURIComponent(currentTopicName)}`, { method: 'DELETE' })
        .then((res) => res.json()).then((data) => {
          if (data.success) {
            const remaining = topics.filter((t) => getTopicName(t) !== currentTopicName);
            setTopics(remaining); changeTopic(remaining[0]);
            if (showToast) showToast(`Đã xóa chủ đề "${currentTopicName}"!`);
          }
        }).catch(() => alert('Lỗi khi xóa chủ đề!'));
    }
  };

  const handleSaveNote = () => {
    const trimmedTitle = formData.title.trim();
    const contentText = editorRef.current ? editorRef.current.innerText.trim() : '';
    if (!trimmedTitle && !contentText) return alert('Vui lòng nhập nội dung ghi chú!');

    const topicName = getTopicName(topic);
    const payload = { title: formData.title || 'Ghi chú không tiêu đề', content: editorRef.current ? editorRef.current.innerHTML : '' };

    const method = formData.id ? 'PUT' : 'POST';
    const url = formData.id ? `${API_BASE}/notes/${encodeURIComponent(topicName)}/${formData.id}` : `${API_BASE}/notes/${encodeURIComponent(topicName)}`;
    
    fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then((res) => res.json()).then((data) => {
        if (data.success) { fetchNotes(); handleResetForm(); if (showToast) showToast(formData.id ? 'Đã cập nhật ghi chú!' : 'Đã tạo ghi chú mới!'); }
      });
  };

  const handleDeleteNote = (note) => {
    const topicName = getTopicName(topic);
    if (window.confirm('Đưa ghi chú này vào lịch sử đã xóa?')) {
      fetch(`${API_BASE}/notes/${encodeURIComponent(topicName)}/${note.id}`, { method: 'DELETE' })
        .then((res) => res.json()).then((data) => {
          if (data.success) {
            setTrash(prev => [{ ...note, originalTopic: topicName, deletedAt: new Date().toISOString() }, ...prev]);
            fetchNotes();
            if (showToast) showToast('Đã chuyển ghi chú vào Lịch sử xóa!');
          }
        });
    }
  };

  const handleRestoreNote = (note) => {
    const targetTopic = note.originalTopic || getTopicName(topic);
    fetch(`${API_BASE}/notes/${encodeURIComponent(targetTopic)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: note.title, content: note.content }),
    }).then((res) => res.json()).then((data) => {
      if (data.success) {
        setTrash(prev => prev.filter(n => n.id !== note.id));
        if (getTopicName(topic) === targetTopic) fetchNotes();
        if (showToast) showToast('Đã khôi phục ghi chú thành công!');
      }
    });
  };

  const handlePermanentDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn XÓA VĨNH VIỄN ghi chú này? Sẽ không thể khôi phục lại!')) {
      setTrash(prev => prev.filter(n => n.id !== id));
      if (showToast) showToast('Đã xóa vĩnh viễn ghi chú!');
    }
  };

  // Lọc ghi chú dựa trên từ khóa tìm kiếm (truyền từ App.jsx)
  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return note.title && note.title.toLowerCase().includes(query);
  });

  const activeTopicName = getTopicName(topic);

  return (
    <div className="dashboard-body">
      {/* 
         Phần bên trái (Sidebar) - Danh sách chủ đề và nút thêm chủ đề
      */}
      <aside className="sidebar">
        <div className="sidebar-header">CHỦ ĐỀ & PHÂN LOẠI</div>
        <div className="add-topic-inline">
          <input placeholder="Tên chủ đề mới..." value={newTopicInput} onChange={(e) => setNewTopicInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()} />
          <button onClick={handleAddTopic} style={{ backgroundColor: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={18} />
          </button>
        </div>
        <ul className="topic-list">
          {topics.map((t) => {
            const tName = getTopicName(t);
            const isActive = activeTopicName === tName;
            return (
              <li key={tName} className={`topic-item ${isActive ? 'active' : ''}`} onClick={() => changeTopic(t)}>
                <Folder size={16} style={{ marginRight: '8px' }} /> {tName}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* 
         Phần bên phải nội dung chính
      */}
      <main className="main-content">
        
        {/* Khu vực soạn thảo (Ẩn đi nếu đang xem Thùng rác) */}
        {!showTrash && (
          <section className="card-panel">
            <div className="editor-top">
              <div className="editor-title-group">
                <PenLine size={20} color={primaryColor} /> 
                <h3 style={{ color: 'var(--text-main)' }}>{formData.id ? 'Sửa ghi chú' : 'Thêm ghi chú mới'}</h3>
              </div>
              <div className="topic-select-wrapper"><label>Chủ đề hiện tại: <strong>{activeTopicName}</strong></label></div>
            </div>
            <input className="input-note-title" placeholder="Tiêu đề ghi chú..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} onFocus={() => setExpandedNoteId(null)} spellCheck={false} />
            
            {/* Vùng ContentEditable - Editor rich text custom */}
            <div ref={editorRef} className="input-note-content rich-editor" contentEditable spellCheck={false} onInput={syncEditorContent} onKeyDown={handleEditorKeyDown} onKeyUp={() => syncEditorContent()} onMouseUp={checkActiveStates} onFocus={() => setExpandedNoteId(null)} onClick={(e) => { checkActiveStates(); if (e.target.tagName === 'A' && (e.ctrlKey || e.metaKey)) window.open(e.target.href, '_blank', 'noopener,noreferrer'); }} onBlur={syncEditorContent} style={{ minHeight: '120px', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px', outline: 'none', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', overflowY: 'auto', overflowX: 'auto' }}></div>
            
            {/* Thanh công cụ định dạng (Toolbar) */}
            <div className="editor-bottom">
              <div className="toolbar-btns" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" title="In đậm" className={isBoldActive ? 'format-btn-active' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')}><Bold size={14} /></button>
                <button type="button" title="In nghiêng" className={isItalicActive ? 'format-btn-active' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')}><Italic size={14} /></button>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button type="button" title="Kiểu đầu dòng" onMouseDown={(e) => e.preventDefault()} onClick={() => setShowListMenu(!showListMenu)}><List size={14} /></button>
                  {showListMenu && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', gap: '4px', padding: '4px', zIndex: 100 }}>
                      {/* ... Menu chọn kiểu danh sách */}
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListFormat('dash')} style={{ padding: '4px 8px', border: '1px solid var(--border-light)', borderRadius: '4px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListFormat('bullet')} style={{ padding: '4px 8px', border: '1px solid var(--border-light)', borderRadius: '4px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>•</button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListFormat('number')} style={{ padding: '4px 8px', border: '1px solid var(--border-light)', borderRadius: '4px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>1.</button>
                    </div>
                  )}
                </div>
                <button type="button" title="Chèn/Hủy liên kết" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('link')}><Link size={14} /></button>
                <button type="button" title="Đoạn mã" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('code')}><Code size={14} /></button>
              </div>
              <div className="action-btns">
                {formData.id && <button className="btn-secondary" onClick={handleResetForm}>Hủy sửa</button>}
                <button className="btn-primary-purple" style={{ backgroundColor: primaryColor }} onClick={handleSaveNote}>{formData.id ? 'Cập nhật' : '+ Tạo ghi chú'}</button>
              </div>
            </div>
          </section>
        )}

        {/* Khu vực danh sách ghi chú / Thùng rác */}
        <section className="notes-section">
          <div className="section-header">
            <div className="header-left">
              <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px' }}>
                {showTrash ? 'Lịch sử đã xóa' : 'Ghi chú gần đây'}
              </h3>
              <span className="filter-badge">
                {showTrash ? `${trash.length} mục đã xóa` : (searchQuery ? `Tìm trong "${activeTopicName}"` : `Chủ đề: ${activeTopicName}`)}
              </span>
            </div>
            
            {/* Thanh lọc danh mục đã được bổ sung lại */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => { setShowTrash(!showTrash); setExpandedNoteId(null); }} style={{ fontSize: '13px', borderColor: showTrash ? primaryColor : 'var(--border-light)', color: showTrash ? primaryColor : 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
                {showTrash ? <><RotateCcw size={14} style={{ marginRight: '6px' }} /> Quay lại ghi chú</> : <><RotateCcwClock size={14} style={{ marginRight: '6px' }} /> Lịch sử đã xóa</>}
              </button>
              {!showTrash && <button className="btn-delete-topic" onClick={handleDeleteTopic} style={{ display: 'flex', alignItems: 'center' }}>
                <Trash2 size={14} style={{ marginRight: '6px' }} /> Xóa chủ đề này
              </button>}
            </div>
          </div>

          <div className={`recent-notes-container ${expandedNoteId && !showTrash ? 'expanded-mode' : ''}`}>
            {showTrash ? (
              // Hiển thị danh sách xem rác
              trash.length === 0 ? <p className="empty-text">Thùng rác đang trống.</p> : trash.map((note) => (
                <div key={note.id} className="modern-note-card" style={{ border: '1px dashed #ef4444' }}>
                  <div>
                    <span className="note-tag" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>Đã xóa từ: {note.originalTopic}</span>
                    <h4 className="card-title" style={{ marginTop: '8px', color: 'var(--text-main)' }}>{note.title}</h4>
                    <div className="card-body" style={{ maxHeight: '100px', overflow: 'hidden', opacity: 0.7 }} dangerouslySetInnerHTML={{ __html: note.content }} />
                  </div>
                  <div className="card-footer" style={{ marginTop: '12px' }}>
                    <button className="btn-link" style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center' }} onClick={() => handleRestoreNote(note)}>
                      <RotateCcw size={13} style={{ marginRight: '4px' }} /> Khôi phục
                    </button>
                    <button className="btn-link text-danger" onClick={() => handlePermanentDelete(note.id)} style={{ display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={13} style={{ marginRight: '4px' }} /> Xóa hẳn
                    </button>
                  </div>
                </div>
              ))
            ) : (
              // Hiển thị danh sách ghi chú bình thường
              filteredNotes.length === 0 ? (
                <p className="empty-text">{searchQuery ? `Không tìm thấy ghi chú nào.` : `Chưa có ghi chú nào.`}</p>
              ) : (
                filteredNotes.map((note, index) => {
                  const safeId = note.id || `fallback-id-${index}`;
                  
                  // Tính toán trạng thái hiển thị của từng Note Card
                  const isExpanded = expandedNoteId === safeId;
                  const isHidden = expandedNoteId && expandedNoteId !== safeId;
                  const isHighlighted = highlightedNoteId === safeId;
                  
                  // Logic cắt chữ/thu gọn nếu nội dung quá dài (Hơn 140 ký tự hoặc 3 dòng)
                  const plainText = note.content ? note.content.replace(/<[^>]*>?/gm, '') : '';
                  const lineBreaks = (note.content && note.content.match(/<div|<br|<li|<p/gi)) ? note.content.match(/<div|<br|<li|<p/gi).length : 0;
                  const isLong = plainText.length > 140 || lineBreaks >= 3 || (note.content && note.content.length > 300);

                  return (
                    <div 
                      key={safeId} 
                      id={`note-card-${safeId}`} 
                      className={`modern-note-card ${isHighlighted ? 'note-highlight' : ''} ${isExpanded ? 'expanded-card' : ''} ${isHidden ? 'hidden-card' : ''}`} 
                      onMouseEnter={() => { if (isHighlighted) setHighlightedNoteId(null); }}
                    >
                      <div>
                        <span className="note-tag" style={{ backgroundColor: '#e0e7ff', color: primaryColor }}>{activeTopicName}</span>
                        <h4 className="card-title" style={{ color: 'var(--text-main)' }}>{note.title}</h4>
                        <div style={{ position: 'relative' }}>
                          <div className="card-body" style={{
                            maxHeight: !isExpanded ? '110px' : '1500px',
                            overflowY: !isExpanded ? 'hidden' : 'visible',
                            position: 'relative',
                            transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
                          }} dangerouslySetInnerHTML={{ __html: note.content }} />
                          {/* Lớp gradient mờ ảo dưới cùng nếu Note bị thu gọn */}
                          {!isExpanded && isLong && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35px', background: 'linear-gradient(transparent, var(--bg-surface))', pointerEvents: 'none' }} />}
                        </div>
                        {/* Nút Xem Thêm / Thu Gọn */}
                        {isLong && (
                          <button type="button" onClick={() => toggleExpand(safeId)} style={{ background: 'none', border: 'none', color: primaryColor, cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginTop: '6px', padding: 0, display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? <><ChevronUp size={14} style={{ marginRight: '2px' }} /> Thu gọn</> : <><ChevronDown size={14} style={{ marginRight: '2px' }} /> Xem thêm</>}
                          </button>
                        )}
                      </div>
                      <div className="card-footer" style={{ marginTop: '12px' }}>
                        <button className="btn-link" onClick={() => handleEditNote(note)} style={{ display: 'flex', alignItems: 'center' }}>
                          <Edit3 size={13} style={{ marginRight: '4px' }} /> Sửa
                        </button>
                        <button className="btn-link text-danger" onClick={() => handleDeleteNote(note)} style={{ display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={13} style={{ marginRight: '4px' }} /> Xóa
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Notes;