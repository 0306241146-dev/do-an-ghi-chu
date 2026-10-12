import React, { useState, useEffect, useRef } from 'react';
import PrivateVaultLock from './PrivateVaultLock';
import { Lock, KeyRound, Eye, EyeOff, Edit3, Trash2, Copy, Bold, Italic, List, Link as LinkIcon, Code, ChevronUp, ChevronDown, ShieldAlert, Key, Wallet, ShieldCheck, Layers } from 'lucide-react';

function PrivateNotes({ isUnlocked, onUnlock, onLock, onBackToPublic, searchQuery = '', showToast, selectedPrivateNoteToJump }) {
  const [notes, setNotes] = useState([]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [formCategory, setFormCategory] = useState('Tài khoản');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Tất cả');
  
  const [visibleContentMap, setVisibleContentMap] = useState({});
  const [highlightedNoteId, setHighlightedNoteId] = useState(null);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  
  const [expandedNoteId, setExpandedNoteId] = useState(null);

  const editorRef = useRef(null);

  const fetchPrivateNotes = () => {
    fetch('http://localhost:5000/api/private-notes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setNotes(data);
      })
      .catch((err) => console.error('Lỗi tải ghi chú kín:', err));
  };

  useEffect(() => {
    if (isUnlocked) fetchPrivateNotes();
  }, [isUnlocked]);

  useEffect(() => {
    if (selectedPrivateNoteToJump) {
      setHighlightedNoteId(selectedPrivateNoteToJump);
      setTimeout(() => {
        const el = document.getElementById(`private-note-card-${selectedPrivateNoteToJump}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }, 300);
    }
  }, [notes, selectedPrivateNoteToJump]);

  const checkActiveStates = () => {
    try {
      setIsBoldActive(document.queryCommandState('bold'));
      setIsItalicActive(document.queryCommandState('italic'));
    } catch (e) {}
  };

  const syncEditorContent = () => {
    if (editorRef.current) {
      if (!editorRef.current.innerText.trim() && editorRef.current.innerHTML !== '') editorRef.current.innerHTML = '';
      setFormContent(editorRef.current.innerHTML);
    }
    checkActiveStates();
  };

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
          currentList.setAttribute('data-list', type); setShowListMenu(false); syncEditorContent(); return;
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

  const handleGenerateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let randPass = '';
    for (let i = 0; i < 16; i++) randPass += chars.charAt(Math.floor(Math.random() * chars.length));
    if (editorRef.current) { editorRef.current.innerHTML = `<code>${randPass}</code>`; syncEditorContent(); }
  };

  const handleResetForm = () => {
    setEditingNoteId(null); setFormTitle(''); setFormCategory('Tài khoản'); setFormContent('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setIsBoldActive(false); setIsItalicActive(false); setShowListMenu(false);
  };

  const handleSaveSecret = (e) => {
    e.preventDefault();
    const contentText = editorRef.current ? editorRef.current.innerText.trim() : '';
    if (!formTitle.trim() || (!formContent.trim() && !contentText)) return alert('Vui lòng nhập đầy đủ tiêu đề và nội dung!');

    const payload = { title: formTitle, category: formCategory, content: editorRef.current.innerHTML };
    const method = editingNoteId ? 'PUT' : 'POST';
    const url = editingNoteId ? `http://localhost:5000/api/private-notes/${editingNoteId}` : 'http://localhost:5000/api/private-notes';

    fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then((res) => res.json()).then((data) => {
        if (data.success) {
          fetchPrivateNotes(); handleResetForm();
          if (showToast) showToast(editingNoteId ? 'Đã cập nhật bí mật!' : 'Đã lưu bí mật mới!');
        }
      });
  };

  const handleEdit = (note) => {
    setEditingNoteId(note.id); setFormTitle(note.title); setFormCategory(note.category || 'Tài khoản');
    setFormContent(note.content);
    if (editorRef.current) editorRef.current.innerHTML = note.content || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bí mật này?')) {
      fetch(`http://localhost:5000/api/private-notes/${id}`, { method: 'DELETE' })
        .then((res) => res.json()).then((data) => {
          if (data.success) { fetchPrivateNotes(); if (showToast) showToast('Đã xóa bí mật!'); }
        });
    }
  };

  const handleCopy = (htmlContent) => {
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    navigator.clipboard.writeText(temp.innerText || temp.textContent);
    if (showToast) showToast('Đã sao chép nội dung!');
  };

  const toggleVisibility = (id) => {
    setVisibleContentMap((prev) => {
      const isCurrentlyRevealed = prev[id];
      if (isCurrentlyRevealed && expandedNoteId === id) {
        setExpandedNoteId(null);
      }
      return { ...prev, [id]: !isCurrentlyRevealed };
    });
  };
  
  const toggleExpand = (id) => {
    if (expandedNoteId === id) {
      setExpandedNoteId(null);
    } else {
      setExpandedNoteId(id);
      setTimeout(() => {
        const el = document.getElementById(`private-note-card-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  const filteredNotes = notes.filter((note) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (note.title && note.title.toLowerCase().includes(q));
    const matchesCategory = selectedFilter === 'Tất cả' || note.category === selectedFilter;
    return matchesSearch && matchesCategory;
  });

  if (!isUnlocked) return <PrivateVaultLock onUnlockSuccess={onUnlock} onBackToPublic={onBackToPublic} />;

  return (
    <div className="dashboard-body">
      <style>{`
        .card-title { font-size: 14px !important; font-weight: bold !important; text-transform: none !important; margin-bottom: 0 !important; }
        .rich-editor ul, .card-body ul { padding-left: 20px !important; margin: 6px 0 !important; }
        .rich-editor ul[data-list="dash"], .card-body ul[data-list="dash"] { list-style-type: "- " !important; }
        .rich-editor ul:not([data-list="dash"]), .card-body ul:not([data-list="dash"]) { list-style-type: disc !important; }
        .rich-editor ol, .card-body ol { list-style-type: decimal !important; padding-left: 20px !important; margin: 6px 0 !important; }
        .rich-editor li, .card-body li { display: list-item !important; margin-bottom: 2px !important; }
        .rich-editor blockquote, .card-body blockquote { border-left: 4px solid #cbd5e1; padding-left: 10px; color: #64748b; margin: 8px 0; }
        .rich-editor:empty:before { content: 'Nội dung bí mật của bạn...'; color: #a0aec0; pointer-events: none; }
        .rich-editor a, .card-body a { color: #2563eb !important; text-decoration: underline !important; cursor: pointer; }
        .rich-editor code, .card-body code { background-color: #f1f5f9 !important; color: #e11d48 !important; padding: 2px 6px !important; border-radius: 4px !important; font-family: monospace !important; font-size: 0.9em !important; border: 1px solid #e2e8f0 !important; }
        .note-highlight { box-shadow: 0 0 0 3px var(--primary-color), 0 10px 15px -3px color-mix(in srgb, var(--primary-color) 30%, transparent) !important; border-color: var(--primary-color) !important; transition: all 0.3s ease-in-out; }
        .format-btn-active { background-color: #e2e8f0 !important; border-color: #94a3b8 !important; font-weight: bold; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06); }
        
        .card-body::-webkit-scrollbar { width: 5px; height: 5px; }
        .card-body::-webkit-scrollbar-thumb { background-color: var(--primary-color); border-radius: 4px; opacity: 0.8; }
        .card-body::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <main className="main-content" style={{ width: '100%', minWidth: 0 }}>
        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '42px', height: '42px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>Khu vực Ghi chú Riêng tư</h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>Dữ liệu được bảo mật chuẩn mức cao nhất. Không ai có thể đọc được nội dung của bạn.</p>
            </div>
          </div>
          <button onClick={onLock} style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-main)', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
            <Lock size={14} style={{ marginRight: '6px' }} /> Khóa lại ngay
          </button>
        </div>

        <section className="card-panel" style={{ borderTop: '4px solid #e11d48' }}>
          <div className="editor-top">
            <div className="editor-title-group">
              <Edit3 size={18} color="#e11d48" />
              <h3 style={{ color: 'var(--text-main)' }}>{editingNoteId ? 'Chỉnh sửa bí mật' : 'Thêm bí mật mới'}</h3>
            </div>
            <div className="topic-select-wrapper">
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}>
                <option value="Tài khoản"> Tài khoản / Mật khẩu</option>
                <option value="Tài chính"> Tài chính / Thẻ ATM</option>
                <option value="Bảo mật"> Mã bảo mật / Khôi phục</option>
              </select>
            </div>
          </div>
          <input className="input-note-title" placeholder="Tiêu đề bí mật..." value={formTitle} onChange={(e) => setFormTitle(e.target.value)} onFocus={() => setExpandedNoteId(null)} spellCheck={false} />
          <div ref={editorRef} className="input-note-content rich-editor" contentEditable spellCheck={false} onInput={syncEditorContent} onKeyDown={handleEditorKeyDown} onKeyUp={() => syncEditorContent()} onMouseUp={checkActiveStates} onFocus={() => setExpandedNoteId(null)} onClick={(e) => { checkActiveStates(); if (e.target.tagName === 'A' && (e.ctrlKey || e.metaKey)) window.open(e.target.href, '_blank', 'noopener,noreferrer'); }} onBlur={syncEditorContent} style={{ minHeight: '120px', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px', outline: 'none', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', overflowY: 'auto', overflowX: 'auto' }}></div>
          <div className="editor-bottom">
            <div className="toolbar-btns" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button type="button" title="In đậm" className={isBoldActive ? 'format-btn-active' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')}><Bold size={14} /></button>
              <button type="button" title="In nghiêng" className={isItalicActive ? 'format-btn-active' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')}><Italic size={14} /></button>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button type="button" title="Kiểu đầu dòng" onMouseDown={(e) => e.preventDefault()} onClick={() => setShowListMenu(!showListMenu)}><List size={14} /></button>
                {showListMenu && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', gap: '4px', padding: '4px', zIndex: 100 }}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListFormat('dash')} style={{ padding: '4px 8px', border: '1px solid var(--border-light)', borderRadius: '4px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListFormat('bullet')} style={{ padding: '4px 8px', border: '1px solid var(--border-light)', borderRadius: '4px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>•</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListFormat('number')} style={{ padding: '4px 8px', border: '1px solid var(--border-light)', borderRadius: '4px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>1.</button>
                  </div>
                )}
              </div>
              <button type="button" title="Chèn/Hủy liên kết" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('link')}><LinkIcon size={14} /></button>
              <button type="button" title="Đoạn mã" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('code')}><Code size={14} /></button>
            </div>
            <div className="action-btns">
              <button type="button" onClick={handleGenerateStrongPassword} style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <KeyRound size={13} style={{ marginRight: '4px' }} /> Tạo mật khẩu mạnh
              </button>
              {editingNoteId && <button className="btn-secondary" onClick={handleResetForm}>Hủy sửa</button>}
              <button className="btn-primary-purple" style={{ backgroundColor: '#e11d48' }} onClick={handleSaveSecret}>{editingNoteId ? 'Cập nhật' : '+ Lưu bí mật'}</button>
            </div>
          </div>
        </section>

        <section className="notes-section">
          <div className="section-header">
            <div className="header-left">
              <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px' }}>Danh sách Ghi chú đã lưu</h3>
              <span className="filter-badge" style={{ backgroundColor: '#e2e8f0', color: '#334155' }}>{filteredNotes.length} mục</span>
            </div>
            
            {/* THANH LỌC DANH MỤC ĐÃ ĐƯỢC BỔ SUNG LẠI */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { name: 'Tất cả', icon: <Layers size={13} style={{ marginRight: '4px' }} /> },
                { name: 'Tài khoản', icon: <Key size={13} style={{ marginRight: '4px' }} /> },
                { name: 'Tài chính', icon: <Wallet size={13} style={{ marginRight: '4px' }} /> },
                { name: 'Bảo mật', icon: <ShieldCheck size={13} style={{ marginRight: '4px' }} /> }
              ].map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => { setSelectedFilter(cat.name); setExpandedNoteId(null); }}
                  style={{
                    backgroundColor: selectedFilter === cat.name ? '#e11d48' : 'var(--bg-surface)',
                    color: selectedFilter === cat.name ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-light)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: selectedFilter === cat.name ? 'bold' : 'normal',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className={`recent-notes-container ${expandedNoteId ? 'expanded-mode' : ''}`}>
            {filteredNotes.length === 0 && <p className="empty-text">Không tìm thấy ghi chú bảo mật nào.</p>}

            {filteredNotes.map((note, index) => {
              const safeId = note.id || `fallback-id-${index}`;
              
              const isExpanded = expandedNoteId === safeId;
              const isHidden = expandedNoteId && expandedNoteId !== safeId;
              const isRevealed = visibleContentMap[safeId];
              const isHighlighted = highlightedNoteId === safeId;
              
              const plainText = note.content ? note.content.replace(/<[^>]*>?/gm, '') : '';
              const lineBreaks = (note.content && note.content.match(/<div|<br|<li|<p/gi)) ? note.content.match(/<div|<br|<li|<p/gi).length : 0;
              const isLong = plainText.length > 140 || lineBreaks >= 3 || (note.content && note.content.length > 300);

              return (
                <div 
                  key={safeId} 
                  id={`private-note-card-${safeId}`} 
                  className={`modern-note-card ${isHighlighted ? 'note-highlight' : ''} ${isExpanded ? 'expanded-card' : ''} ${isHidden ? 'hidden-card' : ''}`} 
                  onMouseEnter={() => { if (isHighlighted) setHighlightedNoteId(null); }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="note-tag" style={{ backgroundColor: '#ffe4e6', color: '#e11d48' }}>{note.category}</span>
                      <small style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'flex', alignItems: 'center' }}>
                        <ShieldAlert size={12} style={{ marginRight: '3px' }} /> Bảo mật cấp cao
                      </small>
                    </div>
                    <h4 className="card-title" style={{ color: 'var(--text-main)' }}>{note.title}</h4>
                    <div style={{ position: 'relative' }}>
                      <div className="card-body" style={{ 
                        maxHeight: !isExpanded ? '110px' : '1500px',
                        overflowY: !isExpanded ? 'hidden' : 'visible', 
                        position: 'relative',
                        transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
                      }}>
                        {isRevealed ? <div dangerouslySetInnerHTML={{ __html: note.content }} /> : <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>••••••••••••••••</span>}
                      </div>
                      {!isExpanded && isLong && isRevealed && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35px', background: 'linear-gradient(transparent, var(--bg-surface))', pointerEvents: 'none' }} />}
                    </div>
                    {isLong && isRevealed && (
                      <button type="button" onClick={() => toggleExpand(safeId)} style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginTop: '6px', padding: 0, display: 'flex', alignItems: 'center' }}>
                        {isExpanded ? <><ChevronUp size={14} style={{ marginRight: '2px' }} /> Thu gọn</> : <><ChevronDown size={14} style={{ marginRight: '2px' }} /> Xem thêm</>}
                      </button>
                    )}
                  </div>
                  <div className="card-footer" style={{ marginTop: '12px' }}>
                    <button className="btn-link" onClick={() => toggleVisibility(safeId)} style={{ color: 'var(--text-main)', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      {isRevealed ? <><EyeOff size={13} style={{ marginRight: '4px' }} /> Ẩn</> : <><Eye size={13} style={{ marginRight: '4px' }} /> Hiện</>}
                    </button>
                    <button className="btn-link" onClick={() => handleCopy(note.content)} style={{ display: 'flex', alignItems: 'center' }}>
                      <Copy size={13} style={{ marginRight: '4px' }} /> Copy
                    </button>
                    <button className="btn-link" onClick={() => handleEdit(note)} style={{ display: 'flex', alignItems: 'center' }}>
                      <Edit3 size={13} style={{ marginRight: '4px' }} /> Sửa
                    </button>
                    <button className="btn-link text-danger" onClick={() => handleDelete(note.id)} style={{ display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={13} style={{ marginRight: '4px' }} /> Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

export default PrivateNotes;