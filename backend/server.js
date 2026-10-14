//  IMPORT THƯ VIỆN 
const express = require('express');   // Framework web để tạo server HTTP và định nghĩa API
const cors = require('cors');         // Cho phép frontend (port 3000) gọi API backend (port 5000)
const fs = require('fs');             // Đọc/ghi file trên ổ cứng (dùng thay database)
const path = require('path');         // Xử lý đường dẫn file an toàn trên mọi OS
const bcrypt = require('bcryptjs');   // Mã hóa (hash) mật khẩu, không lưu mật khẩu dạng rõ

//  KHỞI TẠO SERVER 
const app = express();                // Tạo ứng dụng Express
const PORT = 5000;                    // Server sẽ chạy trên cổng 5000

app.use(cors());                      // Bật CORS cho toàn bộ request
app.use(express.json());              // Tự động parse body JSON từ request gửi lên

//  CẤU HÌNH ĐƯỜNG DẪN DỮ LIỆU 
const dataDir = path.join(__dirname, 'data');            // Thư mục gốc chứa toàn bộ dữ liệu
const notesDir = path.join(dataDir, 'notes');            // Thư mục chứa ghi chú công khai (theo chủ đề)
const profileFile = path.join(dataDir, 'profile.json');  // File lưu thông tin người dùng (tên, email, theme, mật khẩu)
const privateNotesFile = path.join(dataDir, 'private.json'); // File lưu ghi chú riêng tư (cần mật khẩu)
const trashFile = path.join(dataDir, 'trash.json');      // File lưu ghi chú đã xóa (thùng rác)

//  TẠO DỮ LIỆU MẶC ĐỊNH (CHẠY LẦN ĐẦU) 
// Tạo thư mục data/ và notes/ nếu chưa có
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir);
// Tạo file thùng rác rỗng nếu chưa có
if (!fs.existsSync(trashFile)) fs.writeFileSync(trashFile, '[]', 'utf8');

// Tạo file profile.json mặc định nếu chưa tồn tại (mật khẩu mặc định: "123")
if (!fs.existsSync(profileFile)) {
  const defaultHashedPassword = bcrypt.hashSync("123", 10); // Hash mật khẩu "123" với 10 rounds
  fs.writeFileSync(
    profileFile,
    JSON.stringify({ 
      displayName: "Nguyễn Anh Đạt", 
      email: "nguyenanhdat@gmail.com", 
      theme: "Light", 
      primaryColor: "#007bff", 
      privatePassword: defaultHashedPassword  // Lưu dạng hash, KHÔNG lưu "123" dạng rõ
    }, null, 2),
    'utf8'
  );
}

// Tạo file ghi chú riêng tư rỗng nếu chưa có
if (!fs.existsSync(privateNotesFile)) {
  fs.writeFileSync(privateNotesFile, '[]', 'utf8');
}

// Tạo 3 file chủ đề mặc định: hoc-tap.json, cong-viec.json, ca-nhan.json
const defaultTopics = ['hoc-tap', 'cong-viec', 'ca-nhan'];
defaultTopics.forEach(t => {
  const filePath = path.join(notesDir, `${t}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8'); // Mỗi file bắt đầu với mảng rỗng []
  }
});

//  HÀM TIỆN ÍCH ĐỌC/GHI FILE 
/**
 * Đọc file JSON và trả về object/array JavaScript
 * - Nếu file không tồn tại → trả về {}
 * - Nếu file bị lỗi (JSON sai cú pháp) → in lỗi ra console, trả về {}
 */
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

/**
 * Ghi object/array JavaScript vào file JSON (format đẹp, indent 2 spaces)
 */
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

/**
 * Lấy đường dẫn file của một chủ đề
 * VD: "hoc-tap" → "data/notes/hoc-tap.json"
 */
const getTopicFilePath = (topic) => path.join(notesDir, `${topic}.json`);

//  NHÓM 1: API CÀI ĐẶT (Settings) - Đọc/Ghi vào profile.json
/**
 * [ĐỌC CÀI ĐẶT] GET /api/settings
 * - Đọc file profile.json và trả về toàn bộ thông tin cài đặt
 * - Trả về: { displayName, email, theme, primaryColor, privatePassword }
 */
app.get('/api/settings', (req, res) => {
  try {
    res.json(readJson(profileFile));
  } catch (err) {
    res.status(500).json({ message: "Lỗi đọc dữ liệu profile" });
  }
});

/**
 * [CẬP NHẬT CÀI ĐẶT] POST /api/settings
 * - Cập nhật thông tin người dùng (tên, email, theme, màu chủ đạo)
 * - Nếu gửi kèm mật khẩu mới → phải xác thực mật khẩu cũ trước khi đổi
 * - Body: { displayName, email, theme, primaryColor, currentPassword?, privatePassword? }
 */
app.post('/api/settings', (req, res) => {
  try {
    const currentProfile = readJson(profileFile);        // Đọc profile hiện tại
    let newPassword = currentProfile.privatePassword;    // Mặc định giữ mật khẩu cũ

    // ── Xử lý đổi mật khẩu (nếu có) ──
    if (req.body.privatePassword && req.body.privatePassword.trim() !== '') {
      const currentPassInput = req.body.currentPassword || '';  // Mật khẩu cũ người dùng nhập
      const storedHash = currentProfile.privatePassword || '';  // Hash mật khẩu đang lưu

      // Nếu đã có mật khẩu cũ → bắt buộc phải nhập đúng mới cho đổi
      if (storedHash && storedHash.trim() !== '') {
        let isMatch = false;
        try {
          isMatch = bcrypt.compareSync(currentPassInput, storedHash); // So sánh với hash
        } catch (e) {
          isMatch = (currentPassInput === storedHash); // Fallback: so sánh trực tiếp
        }

        if (!isMatch) {
          return res.status(401).json({ success: false, message: "Mật khẩu hiện tại không chính xác!" });
        }
      }
      newPassword = bcrypt.hashSync(req.body.privatePassword.trim(), 10); // Hash mật khẩu mới
    }

    // Lưu profile đã cập nhật 
    const updatedProfile = {
      displayName: req.body.displayName || currentProfile.displayName,
      email: req.body.email || currentProfile.email, 
      theme: req.body.theme || currentProfile.theme,
      primaryColor: req.body.primaryColor || currentProfile.primaryColor,
      privatePassword: newPassword
    };

    writeJson(profileFile, updatedProfile);               // Ghi vào file
    res.json({ success: true, settings: updatedProfile }); // Trả kết quả về frontend
  } catch (err) {
    console.error("LỖI KHI LƯU PROFILE:", err);
    res.status(500).json({ message: "Lỗi lưu dữ liệu profile" });
  }
});

// NHÓM 2: API CHỦ ĐỀ (Topics) - Quản lý các chủ đề ghi chú
/**
 * [LẤY DANH SÁCH CHỦ ĐỀ] GET /api/topics
 * - Đọc tất cả file .json trong thư mục notes/
 * - Trả về mảng tên chủ đề: ["hoc-tap", "cong-viec", "ca-nhan", ...]
 */
app.get('/api/topics', (req, res) => {
  try {
    const files = fs.readdirSync(notesDir);                                      // Đọc danh sách file trong thư mục notes/
    const topics = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')); // Lọc file .json, bỏ đuôi .json
    res.json(topics.length > 0 ? topics : defaultTopics);                        // Nếu rỗng thì trả về 3 chủ đề mặc định
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách chủ đề" });
  }
});

/**
 * [TẠO CHỦ ĐỀ MỚI] POST /api/topics
 * - Nhận tên chủ đề từ body, chuyển thành slug (VD: "Sức Khỏe" → "suc-khoe")
 * - Tạo file mới: notes/suc-khoe.json với nội dung []
 * - Body: { name: "Sức Khỏe" }
 */
app.post('/api/topics', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Tên chủ đề không được để trống!" });

    // Chuyển tên thành slug: bỏ dấu tiếng Việt, lowercase, thay dấu cách bằng gạch ngang
    const topicSlug = name
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // Bỏ dấu tiếng Việt
      .replace(/[đĐ]/g, "d")                             // Chuyển đ/Đ → d
      .replace(/[^a-z0-9 -]/g, "")                       // Bỏ ký tự đặc biệt
      .replace(/\s+/g, "-");                              // Dấu cách → gạch ngang

    const filePath = getTopicFilePath(topicSlug);

    if (fs.existsSync(filePath)) return res.status(400).json({ success: false, message: "Chủ đề này đã tồn tại!" });

    fs.writeFileSync(filePath, '[]', 'utf8');              // Tạo file JSON rỗng cho chủ đề mới
    res.json({ success: true, topic: topicSlug });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi thêm chủ đề mới!" });
  }
});

/**
 * [XÓA CHỦ ĐỀ] DELETE /api/topics/:topic
 * - Xóa file JSON của chủ đề đó
 * - VD: DELETE /api/topics/suc-khoe → Xóa file notes/suc-khoe.json
 */
app.delete('/api/topics/:topic', (req, res) => {
  const filePath = getTopicFilePath(req.params.topic);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);                             // Xóa file khỏi ổ cứng
      return res.json({ success: true });
    }
    res.status(404).json({ message: "Không tìm thấy chủ đề" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa chủ đề" });
  }
});

// NHÓM 3: API GHI CHÚ CÔNG KHAI (Public Notes) - CRUD ghi chú theo chủ đề
/**
 * [LẤY GHI CHÚ THEO CHỦ ĐỀ] GET /api/notes/:topic
 * - Đọc file JSON của chủ đề và trả về danh sách ghi chú
 * - VD: GET /api/notes/hoc-tap → Trả mảng ghi chú trong hoc-tap.json
 */
app.get('/api/notes/:topic', (req, res) => {
  const filePath = getTopicFilePath(req.params.topic);
  try {
    if (!fs.existsSync(filePath)) return res.json([]);     // Chủ đề chưa có → trả mảng rỗng
    res.json(readJson(filePath));
  } catch (err) {
    res.status(500).json({ message: "Lỗi tải ghi chú" });
  }
});

/**
 * [THÊM GHI CHÚ MỚI] POST /api/notes/:topic
 * - Tạo ghi chú mới với id = timestamp, thêm vào cuối mảng
 * - Body: { title: "Tiêu đề", content: "Nội dung" }
 * - VD: POST /api/notes/hoc-tap → Thêm ghi chú vào hoc-tap.json
 */
app.post('/api/notes/:topic', (req, res) => {
  const filePath = getTopicFilePath(req.params.topic);
  try {
    let notes = fs.existsSync(filePath) ? readJson(filePath) : []; // Đọc ghi chú hiện có
    if (!Array.isArray(notes)) notes = [];                         // Đảm bảo là mảng

    const nowTime = new Date().toISOString();                      // Lấy thời gian hiện tại
    const newNote = {
      id: Date.now().toString(),                                   // ID = timestamp (đảm bảo duy nhất)
      title: req.body.title || "Không tiêu đề",                   // Tiêu đề (mặc định nếu không có)
      content: req.body.content || "",                             // Nội dung
      createdAt: nowTime,                                          // Thời gian tạo
      updatedAt: nowTime                                           // Thời gian cập nhật (ban đầu = tạo)
    };
    notes.push(newNote);                                           // Thêm vào CUỐI mảng
    writeJson(filePath, notes);                                    // Lưu file
    res.json({ success: true, note: newNote });                    // Trả ghi chú vừa tạo
  } catch (err) {
    res.status(500).json({ message: "Lỗi thêm ghi chú" });
  }
});

/**
 * [SỬA GHI CHÚ] PUT /api/notes/:topic/:id
 * - Tìm ghi chú theo id, cập nhật title + content + updatedAt
 * - VD: PUT /api/notes/hoc-tap/1697299200000
 * - Body: { title: "Tiêu đề mới", content: "Nội dung mới" }
 */
app.put('/api/notes/:topic/:id', (req, res) => {
  const filePath = getTopicFilePath(req.params.topic);
  try {
    let notes = readJson(filePath);
    if (!Array.isArray(notes)) notes = [];
    
    const index = notes.findIndex(n => n.id === req.params.id);    // Tìm vị trí ghi chú theo id
    if (index !== -1) {
      // Giữ lại dữ liệu cũ (...notes[index]), ghi đè title, content, cập nhật updatedAt
      notes[index] = { ...notes[index], title: req.body.title, content: req.body.content, updatedAt: new Date().toISOString() };
      writeJson(filePath, notes);
      return res.json({ success: true });
    }
    res.status(404).json({ message: "Không tìm thấy ghi chú" }); // Không tìm thấy id
  } catch (err) {
    res.status(500).json({ message: "Lỗi sửa ghi chú" });
  }
});

/**
 * [XÓA GHI CHÚ] DELETE /api/notes/:topic/:id
 * - Lọc bỏ ghi chú có id trùng khớp, lưu lại file
 * - VD: DELETE /api/notes/hoc-tap/1697299200000
 */
app.delete('/api/notes/:topic/:id', (req, res) => {
  const filePath = getTopicFilePath(req.params.topic);
  try {
    let notes = readJson(filePath);
    if (!Array.isArray(notes)) notes = [];
    notes = notes.filter(n => n.id !== req.params.id);             // Giữ lại tất cả trừ ghi chú có id cần xóa
    writeJson(filePath, notes);                                    // Lưu lại file (đã bớt 1 ghi chú)
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa ghi chú" });
  }
});

//  NHÓM 4: API BẢO MẬT & XÁC THỰC (Auth) - Quản lý mật khẩu ghi chú riêng tư
/**
 * [KIỂM TRA ĐÃ CÓ MẬT KHẨU CHƯA] GET /api/auth/check-status
 * - Kiểm tra trong profile.json xem đã đặt mật khẩu chưa
 * - Trả về: { hasPassword: true/false }
 * - Frontend dùng để quyết định hiện form "Tạo mật khẩu" hay "Nhập mật khẩu"
 */
app.get('/api/auth/check-status', (req, res) => {
  try {
    const profile = readJson(profileFile);
    const hasPassword = !!(profile.privatePassword && profile.privatePassword.trim() !== '');
    res.json({ hasPassword });
  } catch (err) {
    res.status(500).json({ message: "Lỗi kiểm tra trạng thái mật khẩu" });
  }
});

/**
 * [TẠO MẬT KHẨU LẦN ĐẦU] POST /api/auth/setup
 * - Dùng khi người dùng chưa có mật khẩu, tạo mật khẩu mới
 * - Body: { password: "matkhau123" }
 * - Mật khẩu sẽ được hash bằng bcrypt trước khi lưu
 */
app.post('/api/auth/setup', (req, res) => {
  try {
    const profile = readJson(profileFile);
    const newPass = req.body.password;

    if (!newPass || !newPass.trim()) return res.status(400).json({ message: "Mật khẩu không được để trống!" });

    profile.privatePassword = bcrypt.hashSync(newPass.trim(), 10); // Hash mật khẩu rồi lưu
    writeJson(profileFile, profile);

    res.json({ success: true, message: "Khởi tạo mật khẩu thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khởi tạo mật khẩu" });
  }
});

/**
 * [XÁC THỰC MẬT KHẨU] POST /api/auth/verify
 * - Người dùng nhập mật khẩu → so sánh với hash đã lưu
 * - Đúng → { success: true } → cho phép xem ghi chú riêng tư
 * - Sai → 401 { success: false } → từ chối truy cập
 * - Body: { password: "matkhau123" }
 */
app.post('/api/auth/verify', (req, res) => {
  try {
    const profile = readJson(profileFile);
    const storedHash = profile.privatePassword || '';     // Hash đã lưu trong profile
    const inputPassword = req.body.password || '';        // Mật khẩu người dùng nhập

    let isMatch = false;
    try {
      isMatch = bcrypt.compareSync(inputPassword, storedHash); // So sánh mật khẩu với hash
    } catch (e) {
      isMatch = (inputPassword === storedHash);                // Fallback: so sánh trực tiếp
    }

    if (isMatch) res.json({ success: true });                  // ✅ Đúng mật khẩu
    else res.status(401).json({ success: false, message: "Mật khẩu không chính xác!" }); // ❌ Sai
  } catch (err) {
    res.status(500).json({ message: "Lỗi xác thực mật khẩu" });
  }
});

//   NHÓM 5: API GHI CHÚ RIÊNG TƯ (Private Notes) - Cần mật khẩu mới xem được
/**
 * [LẤY TẤT CẢ GHI CHÚ RIÊNG TƯ] GET /api/private-notes
 * - Đọc file private.json và trả về danh sách ghi chú riêng tư
 * - Khác Public Notes: không chia theo chủ đề, lưu chung 1 file
 */
app.get('/api/private-notes', (req, res) => {
  try {
    let notes = readJson(privateNotesFile);
    res.json(Array.isArray(notes) ? notes : []);           // Đảm bảo trả về mảng
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách ghi chú riêng tư" });
  }
});

/**
 * [THÊM GHI CHÚ RIÊNG TƯ] POST /api/private-notes
 * - Tạo ghi chú riêng tư mới, thêm vào ĐẦU mảng (unshift, không phải push)
 * - Khác Public Notes: có thêm trường "category" (phân loại: Tài khoản, Mật khẩu...)
 * - Body: { title: "Gmail", category: "Tài khoản", content: "email: abc@gmail.com" }
 */
app.post('/api/private-notes', (req, res) => {
  try {
    let notes = readJson(privateNotesFile);
    if (!Array.isArray(notes)) notes = [];
    
    const nowTime = new Date().toISOString();
    const newNote = {
      id: Date.now().toString(),                           // ID duy nhất
      title: req.body.title || "Không tiêu đề",           // Tiêu đề
      category: req.body.category || "Tài khoản",         // Phân loại (khác với Public Notes)
      content: req.body.content || "",                     // Nội dung bí mật
      createdAt: nowTime,                                  // Thời gian tạo
      updatedAt: nowTime                                   // Thời gian cập nhật
    };
    notes.unshift(newNote);                                // Thêm vào ĐẦU mảng (ghi chú mới nhất ở trên cùng)
    writeJson(privateNotesFile, notes);                    // Lưu file
    res.json({ success: true, note: newNote });
  } catch (err) {
    res.status(500).json({ message: "Lỗi lưu ghi chú bí mật" });
  }
});

/**
 * [SỬA GHI CHÚ RIÊNG TƯ] PUT /api/private-notes/:id
 * - Tìm ghi chú theo id, cập nhật title + category + content + updatedAt
 * - VD: PUT /api/private-notes/1697299200000
 * - Body: { title: "Gmail mới", category: "Email", content: "..." }
 */
app.put('/api/private-notes/:id', (req, res) => {
  try {
    let notes = readJson(privateNotesFile);
    if (!Array.isArray(notes)) notes = [];

    const index = notes.findIndex(n => n.id === req.params.id);    // Tìm vị trí theo id
    if (index !== -1) {
      // Giữ dữ liệu cũ, ghi đè title, category, content, cập nhật updatedAt
      notes[index] = { ...notes[index], title: req.body.title, category: req.body.category, content: req.body.content, updatedAt: new Date().toISOString() };
      writeJson(privateNotesFile, notes);
      return res.json({ success: true });
    }
    res.status(404).json({ message: "Không tìm thấy ghi chú bí mật" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi cập nhật ghi chú bí mật" });
  }
});

/**
 * [XÓA GHI CHÚ RIÊNG TƯ] DELETE /api/private-notes/:id
 * - Lọc bỏ ghi chú có id trùng, lưu lại file
 * - VD: DELETE /api/private-notes/1697299200000
 */
app.delete('/api/private-notes/:id', (req, res) => {
  try {
    let notes = readJson(privateNotesFile);
    if (!Array.isArray(notes)) notes = [];
    notes = notes.filter(n => n.id !== req.params.id);   // Lọc bỏ ghi chú cần xóa
    writeJson(privateNotesFile, notes);                  // Lưu lại
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa ghi chú bí mật" });
  }
});

//  KHỞI ĐỘNG SERVER 
// Bật server lắng nghe request tại http://localhost:5000
app.listen(PORT, () => console.log(`Server đang chạy tại http://localhost:${PORT}`));