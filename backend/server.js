const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Khởi tạo thư mục dữ liệu
const dataDir = path.join(__dirname, 'data');
const notesDir = path.join(dataDir, 'notes');
const profileFile = path.join(dataDir, 'profile.json');
const privateNotesFile = path.join(dataDir, 'private.json');
const trashFile = path.join(dataDir, 'trash.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir);
if (!fs.existsSync(trashFile)) fs.writeFileSync(trashFile, '[]', 'utf8');

// Tự động tạo file profile.json nếu chưa tồn tại
if (!fs.existsSync(profileFile)) {
  const defaultHashedPassword = bcrypt.hashSync("123", 10);
  fs.writeFileSync(
    profileFile,
    JSON.stringify({ 
      displayName: "Nguyễn Anh Đạt", 
      email: "nguyenanhdat@gmail.com", 
      theme: "Light", 
      primaryColor: "#007bff", 
      privatePassword: defaultHashedPassword 
    }, null, 2),
    'utf8'
  );
}

if (!fs.existsSync(privateNotesFile)) {
  fs.writeFileSync(privateNotesFile, '[]', 'utf8');
}

const defaultTopics = ['hoc-tap', 'cong-viec', 'ca-nhan'];
defaultTopics.forEach(t => {
  const filePath = path.join(notesDir, `${t}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
  }
});

// Hàm hỗ trợ Đọc/Ghi file an toàn
const readJson = (file) => {
  try {
    if (!fs.existsSync(file)) return {};
    const data = fs.readFileSync(file, 'utf8');
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error(`Lỗi đọc file ${file}:`, err.message);
    return {}; 
  }
};
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
const getTopicFilePath = (topic) => path.join(notesDir, `${topic}.json`);


/* API CÀI ĐẶT (ĐỌC/GHI VÀO PROFILE.JSON) */
app.get('/api/settings', (req, res) => {
  try {
    res.json(readJson(profileFile));
  } catch (err) {
    res.status(500).json({ message: "Lỗi đọc dữ liệu profile" });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const currentProfile = readJson(profileFile);
    let newPassword = currentProfile.privatePassword;

    // Nếu người dùng có yêu cầu đặt/đổi Mật khẩu mới
    if (req.body.privatePassword && req.body.privatePassword.trim() !== '') {
      const currentPassInput = req.body.currentPassword || '';
      const storedHash = currentProfile.privatePassword || '';

      if (storedHash && storedHash.trim() !== '') {
        let isMatch = false;
        try {
          isMatch = bcrypt.compareSync(currentPassInput, storedHash);
        } catch (e) {
          isMatch = (currentPassInput === storedHash);
        }

        if (!isMatch) {
          return res.status(401).json({ success: false, message: "Mật khẩu hiện tại không chính xác!" });
        }
      }
      newPassword = bcrypt.hashSync(req.body.privatePassword.trim(), 10);
    }

    // Cập nhật thông tin vào profile
    const updatedProfile = {
      displayName: req.body.displayName || currentProfile.displayName,
      email: req.body.email || currentProfile.email, 
      theme: req.body.theme || currentProfile.theme,
      primaryColor: req.body.primaryColor || currentProfile.primaryColor,
      privatePassword: newPassword
    };

    writeJson(profileFile, updatedProfile);
    res.json({ success: true, settings: updatedProfile });
  } catch (err) {
    console.error("LỖI KHI LƯU PROFILE:", err);
    res.status(500).json({ message: "Lỗi lưu dữ liệu profile" });
  }
});


/* API CHỦ ĐỀ (TOPICS) */
app.get('/api/topics', (req, res) => {
  try {
    const files = fs.readdirSync(notesDir);
    const topics = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    res.json(topics.length > 0 ? topics : defaultTopics);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách chủ đề" });
  }
});

app.post('/api/topics', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Tên chủ đề không được để trống!" });

    const topicSlug = name
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-");

    const filePath = getTopicFilePath(topicSlug);

    if (fs.existsSync(filePath)) return res.status(400).json({ success: false, message: "Chủ đề này đã tồn tại!" });

    fs.writeFileSync(filePath, '[]', 'utf8');
    res.json({ success: true, topic: topicSlug });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi thêm chủ đề mới!" });
  }
});

app.delete('/api/topics/:topic', (req, res) => {
  const filePath = getTopicFilePath(req.params.topic);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true });
    }
    res.status(404).json({ message: "Không tìm thấy chủ đề" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa chủ đề" });
  }
});


/* API GHI CHÚ CÔNG KHAI (PUBLIC NOTES) */
app.get('/api/notes/:topic', (req, res) => {
  const filePath = getTopicFilePath(req.params.topic);
  try {
    if (!fs.existsSync(filePath)) return res.json([]);
    res.json(readJson(filePath));
  } catch (err) {
    res.status(500).json({ message: "Lỗi tải ghi chú" });
  }
});

app.post('/api/notes/:topic', (req, res) => {
  const filePath = getTopicFilePath(req.params.topic);
  try {
    let notes = fs.existsSync(filePath) ? readJson(filePath) : [];
    if (!Array.isArray(notes)) notes = [];

    const nowTime = new Date().toISOString();
    const newNote = {
      id: Date.now().toString(),
      title: req.body.title || "Không tiêu đề",
      content: req.body.content || "",
      createdAt: nowTime,
      updatedAt: nowTime
    };
    notes.push(newNote);
    writeJson(filePath, notes);
    res.json({ success: true, note: newNote });
  } catch (err) {
    res.status(500).json({ message: "Lỗi thêm ghi chú" });
  }
});

app.put('/api/notes/:topic/:id', (req, res) => {
  const filePath = getTopicFilePath(req.params.topic);
  try {
    let notes = readJson(filePath);
    if (!Array.isArray(notes)) notes = [];
    
    const index = notes.findIndex(n => n.id === req.params.id);
    if (index !== -1) {
      notes[index] = { ...notes[index], title: req.body.title, content: req.body.content, updatedAt: new Date().toISOString() };
      writeJson(filePath, notes);
      return res.json({ success: true });
    }
    res.status(404).json({ message: "Không tìm thấy ghi chú" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi sửa ghi chú" });
  }
});

app.delete('/api/notes/:topic/:id', (req, res) => {
  const filePath = getTopicFilePath(req.params.topic);
  try {
    let notes = readJson(filePath);
    if (!Array.isArray(notes)) notes = [];
    notes = notes.filter(n => n.id !== req.params.id);
    writeJson(filePath, notes);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa ghi chú" });
  }
});


/* API BẢO MẬT & XÁC THỰC */
app.get('/api/auth/check-status', (req, res) => {
  try {
    const profile = readJson(profileFile);
    const hasPassword = !!(profile.privatePassword && profile.privatePassword.trim() !== '');
    res.json({ hasPassword });
  } catch (err) {
    res.status(500).json({ message: "Lỗi kiểm tra trạng thái mật khẩu" });
  }
});

app.post('/api/auth/setup', (req, res) => {
  try {
    const profile = readJson(profileFile);
    const newPass = req.body.password;

    if (!newPass || !newPass.trim()) return res.status(400).json({ message: "Mật khẩu không được để trống!" });

    profile.privatePassword = bcrypt.hashSync(newPass.trim(), 10);
    writeJson(profileFile, profile);

    res.json({ success: true, message: "Khởi tạo mật khẩu thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khởi tạo mật khẩu" });
  }
});

app.post('/api/auth/verify', (req, res) => {
  try {
    const profile = readJson(profileFile);
    const storedHash = profile.privatePassword || '';
    const inputPassword = req.body.password || '';

    let isMatch = false;
    try {
      isMatch = bcrypt.compareSync(inputPassword, storedHash);
    } catch (e) {
      isMatch = (inputPassword === storedHash);
    }

    if (isMatch) res.json({ success: true });
    else res.status(401).json({ success: false, message: "Mật khẩu không chính xác!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xác thực mật khẩu" });
  }
});


/* API GHI CHÚ RIÊNG TƯ (PRIVATE NOTES) */
app.get('/api/private-notes', (req, res) => {
  try {
    let notes = readJson(privateNotesFile);
    res.json(Array.isArray(notes) ? notes : []);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách ghi chú riêng tư" });
  }
});

app.post('/api/private-notes', (req, res) => {
  try {
    let notes = readJson(privateNotesFile);
    if (!Array.isArray(notes)) notes = [];
    
    const nowTime = new Date().toISOString();
    const newNote = {
      id: Date.now().toString(),
      title: req.body.title || "Không tiêu đề",
      category: req.body.category || "Tài khoản",
      content: req.body.content || "",
      createdAt: nowTime,
      updatedAt: nowTime
    };
    notes.unshift(newNote);
    writeJson(privateNotesFile, notes);
    res.json({ success: true, note: newNote });
  } catch (err) {
    res.status(500).json({ message: "Lỗi lưu ghi chú bí mật" });
  }
});

app.put('/api/private-notes/:id', (req, res) => {
  try {
    let notes = readJson(privateNotesFile);
    if (!Array.isArray(notes)) notes = [];

    const index = notes.findIndex(n => n.id === req.params.id);
    if (index !== -1) {
      notes[index] = { ...notes[index], title: req.body.title, category: req.body.category, content: req.body.content, updatedAt: new Date().toISOString() };
      writeJson(privateNotesFile, notes);
      return res.json({ success: true });
    }
    res.status(404).json({ message: "Không tìm thấy ghi chú bí mật" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi cập nhật ghi chú bí mật" });
  }
});

app.delete('/api/private-notes/:id', (req, res) => {
  try {
    let notes = readJson(privateNotesFile);
    if (!Array.isArray(notes)) notes = [];
    notes = notes.filter(n => n.id !== req.params.id);
    writeJson(privateNotesFile, notes);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa ghi chú bí mật" });
  }
});

app.listen(PORT, () => console.log(`Server đang chạy tại http://localhost:${PORT}`));