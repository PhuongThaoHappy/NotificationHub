# 📬 NotificationHub - Giải Thích Chi Tiết Project

## 🎯 Mục Đích Project

**NotificationHub** là một hệ thống quản lý thông báo tập trung (Notification Aggregation System) giúp:
- 📨 Gom nhất các thông báo từ 4 nền tảng khác nhau (Outlook, Slack, Teams, Discord)
- 🗂️ Sắp xếp và hiển thị theo cách dễ hiểu (Vietnamese timestamp, date grouping)
- ✅ Quản lý trạng thái đã đọc/chưa đọc
- 🔍 Tự động phát hiện và xóa thông báo trùng lặp
- ⚡ Cung cấp API mạnh mẽ cho các ứng dụng frontend

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Port 8080)                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  index.html                                          │   │
│  │  - Giao diện hiển thị danh sách thông báo           │   │
│  │  - Form tìm kiếm, lọc theo platform                 │   │
│  │  - Nút đánh dấu đã đọc, xóa, xóa trùng lặp         │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓ HTTP                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  app.js                                              │   │
│  │  - Gọi API backend tại localhost:5000               │   │
│  │  - Xử lý events từ HTML                             │   │
│  │  - Render dữ liệu lên giao diện                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  style.css - Styling responsive, hiệu ứng                   │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP/JSON
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Port 5000)                       │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  server.js (Express.js)                              │   │
│  │  - Khởi động server Express                         │   │
│  │  - Cấu hình middleware (CORS, body-parser)          │   │
│  │  - Xử lý lỗi, graceful shutdown                     │   │
│  └──────────────────────────────────────────────────────┘   │
│             ↓                                 ↓               │
│  ┌──────────────────┐                ┌──────────────────┐   │
│  │ routes/          │                │ controllers/     │   │
│  │ notifications.js │←──────────────→│ notification     │   │
│  │                  │                │ Controller.js    │   │
│  │ 10 API endpoints │                │                  │   │
│  │ GET, POST, PUT   │                │ 8 business logic │   │
│  │ DELETE           │                │ functions        │   │
│  └──────────────────┘                └──────────────────┘   │
│             ↓                                 ↓               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  utils/ - Các công cụ xử lý dữ liệu                 │   │
│  │                                                      │   │
│  │  ├─ dataNormalizer.js                               │   │
│  │  │  (Chuẩn hóa dữ liệu từ 4 platform khác nhau)    │   │
│  │  │                                                  │   │
│  │  ├─ timestampFormatter.js                           │   │
│  │  │  (Định dạng thời gian tiếng Việt)               │   │
│  │  │                                                  │   │
│  │  ├─ duplicateDetector.js                            │   │
│  │  │  (Tìm kiếm thông báo trùng lặp)                 │   │
│  │  │                                                  │   │
│  │  └─ responseFormatter.js                            │   │
│  │     (Định dạng response JSON)                       │   │
│  └──────────────────────────────────────────────────────┘   │
│             ↓                                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  config.js - Kết nối MySQL (Connection Pooling)     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓ SQL
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (MySQL)                          │
│                                                               │
│  Table: notifications                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ id          | INT (Primary Key)                      │   │
│  │ platform    | VARCHAR(50) - outlook/slack/teams/...  │   │
│  │ sender      | VARCHAR(255) - Người gửi              │   │
│  │ subject     | VARCHAR(500) - Tiêu đề                │   │
│  │ message     | LONGTEXT - Nội dung                   │   │
│  │ created_at  | TIMESTAMP - Thời gian tạo             │   │
│  │ is_read     | BOOLEAN - Đã đọc hay chưa             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Indexes: platform, is_read, created_at (tối ưu tìm kiếm)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow - Dòng Chảy Dữ Liệu

### 1️⃣ **User mở Frontend**
```
User truy cập http://localhost:8080
              ↓
   index.html được tải
              ↓
   app.js tự động gọi:
   GET /api/notifications?page=1&limit=10
              ↓
   Server xử lý request
```

### 2️⃣ **Server xử lý GET /api/notifications**
```
Frontend request
    ↓
routes/notifications.js
    ↓
notificationController.getNotifications()
    ↓
Lấy dữ liệu từ MySQL: 
  SELECT * FROM notifications 
  WHERE (platform = ? if filtered)
  LIMIT ? OFFSET ?
    ↓
Lặp qua từng row, áp dụng:
  - dataNormalizer.removeRedundantData() → Xóa trường không cần
  - timestampFormatter.formatTimeAgo() → "5 phút trước"
  - timestampFormatter.formatDate() → "Hôm nay"
    ↓
responseFormatter.formatPaginationResponse()
    ↓
Response JSON gửi lại
    ↓
Frontend nhận dữ liệu
    ↓
app.js render lên giao diện
```

### 3️⃣ **User đánh dấu đã đọc**
```
User click vào nút "Đánh dấu đã đọc"
    ↓
app.js gọi:
PUT /api/notifications/:id/read
    ↓
notificationController.markAsRead(id, true)
    ↓
MySQL UPDATE:
UPDATE notifications SET is_read = true WHERE id = ?
    ↓
Response success
    ↓
Frontend cập nhật UI
```

### 4️⃣ **User xóa thông báo trùng lặp**
```
User click "Xóa Trùng Lặp"
    ↓
Frontend gọi:
POST /api/notifications/deduplicate
    ↓
notificationController.findAndRemoveDuplicates()
    ↓
Lấy tất cả notifications
    ↓
duplicateDetector.removeDuplicates()
    ├─ Lần 1: Tìm exact duplicates (hash giống nhau)
    │         → Xóa ngay
    │
    └─ Lần 2: Tìm similar notifications
             Kiểm tra: sender similarity > 95% AND message similarity > 85%
             Dùng Levenshtein distance algorithm
             → Xóa cái nào trùng
    ↓
Xóa từ MySQL
    ↓
Response success
```

---

## 🔄 Data Normalization - Chuẩn Hóa Dữ Liệu

### Vấn Đề
Mỗi platform (Outlook, Slack, Teams, Discord) có cấu trúc dữ liệu khác nhau:

```
OUTLOOK:
{
  from: "john@example.com",
  subject: "Meeting at 3pm",
  bodyPreview: "Let's discuss the project...",
  receivedDateTime: "2026-05-24T10:30:00Z"
}

SLACK:
{
  user: "U123456",
  channel: "C123456", 
  text: "Great project!",
  ts: "1705420200.000100"  ← Unix timestamp
}

TEAMS:
{
  from: { displayName: "Alice" },
  subject: "Project Update",
  bodyPreview: "Completed the backend...",
  receivedDateTime: "2026-05-24T10:30:00Z"
}
```

### Giải Pháp
```javascript
// dataNormalizer.js chuẩn hóa tất cả thành format chung:

{
  id: 1,
  platform: "slack",      ← Loại platform
  sender: "John Doe",      ← Người gửi
  subject: "#general",     ← Chủ đề
  message: "Great!",       ← Nội dung
  timestamp: "2026-05-24T10:30:00Z",  ← Thời gian ISO
  is_read: false,          ← Trạng thái
  icon: "slack-icon",      ← Icon
  color: "#36C5F0",        ← Màu
  type: "chat"             ← Loại (email/chat)
}
```

---

## 🕐 Timestamp Formatting - Định Dạng Thời Gian

### Time Ago Format (Thời gian tương đối)
```javascript
formatTimeAgo(timestamp):
  - Vừa xong             (< 1 phút)
  - 5 phút trước         (< 1 giờ)
  - 2 giờ trước          (< 1 ngày)
  - Hôm qua lúc 16:20    (1 ngày trước)
  - 3 ngày trước         (< 1 tuần)
```

### Date Format (Ngày tháng)
```javascript
formatDate(timestamp):
  - Hôm nay              (Hôm nay)
  - Hôm qua              (Hôm qua)
  - Thứ Năm              (Ngày tuần này)
  - Tuần trước           (Tuần trước)
  - 24 tháng 5           (Cách đây lâu)
```

---

## 🔍 Duplicate Detection - Phát Hiện Trùng Lặp

### Thuật Toán
```
Bước 1: Tìm EXACT DUPLICATES
        Hash từng notification
        Nếu hash giống → Xóa ngay

Bước 2: Tìm SIMILAR NOTIFICATIONS
        So sánh từng cặp:
        
        - Kiểm tra sender similarity:
          Dùng Levenshtein distance
          "John Doe" vs "John Do" → similarity > 95%? 
          → Có thể là người cùng 1
        
        - Kiểm tra message similarity:
          "Great project" vs "Great project!" → similarity > 85%?
          → Có thể là nội dung cùng 1
        
        - Nếu cả 2 điều kiện đúng:
          → Xóa 1 notification
```

### Ví Dụ
```
Notification A:
  sender: "John Doe"
  message: "Let's discuss the project"

Notification B:
  sender: "Jon Doe"          ← Nhầm chính tả
  message: "Lets discuss the project"  ← Thiếu dấu

Similarity Check:
  - sender: "John Doe" vs "Jon Doe" = 85% (< 95%) ❌
  - message: 95% similarity (> 85%) ✅
  
  Result: Không xóa vì sender không giống
```

---

## 📡 API Endpoints - 10 Endpoint

### 1. **GET /api/notifications** - Lấy danh sách thông báo
```
Query params:
  ?page=1&limit=10          - Phân trang
  &platform=slack           - Lọc theo platform
  &status=unread            - Lọc theo trạng thái

Response:
{
  success: true,
  data: [
    {
      id: 1,
      platform: "slack",
      sender: "John",
      subject: "#general",
      message: "Hello!",
      timeAgo: "5 phút trước",
      date: "Hôm nay",
      is_read: false
    }
  ],
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 45,
    totalPages: 5,
    hasNextPage: true
  }
}
```

### 2. **GET /api/notifications/stats** - Thống kê
```
Response:
{
  success: true,
  data: {
    total: 45,
    unread: 12,
    read: 33,
    byPlatform: {
      slack: 15,
      outlook: 12,
      teams: 18,
      discord: 0
    }
  }
}
```

### 3. **GET /api/notifications/grouped** - Gom theo ngày
```
Response:
{
  success: true,
  data: {
    "Hôm nay": [
      { id: 1, sender: "Alice", ... },
      { id: 2, sender: "Bob", ... }
    ],
    "Hôm qua": [
      { id: 3, sender: "Charlie", ... }
    ],
    "Tuần trước": [...]
  }
}
```

### 4. **GET /api/notifications/:id** - Lấy 1 thông báo
```
Response:
{
  success: true,
  data: { id: 1, sender: "Alice", message: "...", ... }
}
```

### 5. **PUT /api/notifications/:id/read** - Đánh dấu 1 thông báo
```
Body:
{ "is_read": true }

Response:
{ success: true, message: "Updated" }
```

### 6. **PUT /api/notifications/batch/read** - Batch update
```
Body:
{
  "ids": [1, 2, 3, 4, 5],
  "is_read": true
}

Response:
{ success: true, updated: 5 }
```

### 7. **DELETE /api/notifications/:id** - Xóa 1 thông báo
```
Response:
{ success: true, message: "Deleted" }
```

### 8. **POST /api/notifications/deduplicate** - Xóa trùng lặp
```
Response:
{
  success: true,
  data: {
    duplicatesRemoved: 3,
    remaining: 42
  }
}
```

### 9. **GET /api/health** - Health check
```
Response:
{ status: "OK", timestamp: "..." }
```

### 10. **GET /api/info** - Thông tin API
```
Response:
{
  name: "NotificationHub API",
  version: "1.0.0",
  endpoints: ["/api/notifications", "/api/stats", ...]
}
```

---

## 🛠️ Tech Stack - Công Nghệ Sử Dụng

### Backend
```
Express.js 4.18.2
  ↓ (Framework web tạo server HTTP)

MySQL2 3.6.5
  ↓ (Driver kết nối MySQL, có connection pooling)

dotenv 16.3.1
  ↓ (Đọc biến môi trường từ .env)

body-parser 1.20.2
  ↓ (Parse JSON từ request body)

cors 2.8.5
  ↓ (Cho phép frontend gọi từ port khác)
```

### Frontend
```
HTML5 - Tạo cấu trúc trang
CSS3 - Styling responsive
Vanilla JavaScript - Xử lý logic (không cần framework)
```

### Database
```
MySQL 5.7+
  - Table: notifications
  - Indexes: platform, is_read, created_at
```

---

## 🚀 Cách Chạy Project

### Bước 1: Install Dependencies
```bash
cd backend_server
npm install
```

### Bước 2: Tạo .env
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=notifyhub_db
PORT=5000
NODE_ENV=development
```

### Bước 3: Start Backend
```bash
cd backend_server
npm start
# Chạy trên port 5000
```

### Bước 4: Start Frontend
```bash
# Terminal khác
npx http-server -p 8080
# Chạy trên port 8080
```

### Bước 5: Truy cập
- Frontend: http://localhost:8080
- Backend API: http://localhost:5000
- API Info: http://localhost:5000/api/info

---

## 📁 Folder Structure - Cấu Trúc Thư Mục

```
NotificationHub/
│
├── index.html                ← Frontend giao diện
├── style.css                 ← Frontend styling
├── app.js                    ← Frontend logic
├── README.md                 ← Hướng dẫn chung
│
└── backend_server/
    ├── server.js             ← Entry point Express
    ├── package.json          ← Dependencies
    ├── .env                  ← Cấu hình môi trường
    ├── init.sql              ← Database schema
    │
    ├── config.js             ← MySQL connection
    │
    ├── controllers/
    │   └── notificationController.js   ← 8 business logic functions
    │
    ├── routes/
    │   └── notifications.js            ← 10 API endpoints
    │
    └── utils/
        ├── dataNormalizer.js           ← Chuẩn hóa dữ liệu
        ├── timestampFormatter.js       ← Định dạng thời gian
        ├── duplicateDetector.js        ← Phát hiện trùng lặp
        └── responseFormatter.js        ← Định dạng response
```

---

## 💾 Database Schema - Cơ Sở Dữ Liệu

```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(50),                    -- outlook, slack, teams, discord
  sender VARCHAR(255),                     -- Người gửi
  subject VARCHAR(500),                    -- Tiêu đề
  message LONGTEXT,                        -- Nội dung
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Thời gian tạo
  is_read BOOLEAN DEFAULT FALSE,           -- Đã đọc?
  INDEX idx_platform (platform),           -- Index tối ưu tìm kiếm
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);
```

---

## 🧪 Ví Dụ Sử Dụng - Examples

### Lấy tất cả thông báo chưa đọc từ Slack
```bash
curl "http://localhost:5000/api/notifications?platform=slack&status=unread&page=1&limit=5"
```

### Đánh dấu multiple notifications đã đọc
```bash
curl -X PUT http://localhost:5000/api/notifications/batch/read \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [1, 2, 3, 4, 5],
    "is_read": true
  }'
```

### Xóa thông báo trùng lặp
```bash
curl -X POST http://localhost:5000/api/notifications/deduplicate
```

### Lấy thông báo gom theo ngày
```bash
curl http://localhost:5000/api/notifications/grouped
```

---

## 🎯 8 Tính Năng Chính - Features

| # | Tính Năng | Vị Trí Code | Mô Tả |
|---|-----------|-----------|-------|
| 1 | Phân trang | `notificationController.getNotifications()` | Lấy dữ liệu theo page/limit |
| 2 | Chuẩn hóa dữ liệu | `dataNormalizer.js` | Chuyển 4 format khác nhau thành 1 format chung |
| 3 | Định dạng response | `responseFormatter.js` | Đóng gói dữ liệu thành JSON chuẩn |
| 4 | Định dạng thời gian | `timestampFormatter.js` | Thời gian tiếng Việt ("5 phút trước", "Hôm nay") |
| 5 | Xóa trường thừa | `dataNormalizer.removeRedundantData()` | Chỉ giữ những trường cần thiết |
| 6 | Icon & color | `dataNormalizer.js` | Map icon/color cho mỗi platform |
| 7 | Quản lý trạng thái | `markAsRead()`, `updateMultipleReadStatus()` | Đánh dấu đã đọc/chưa đọc |
| 8 | Phát hiện trùng lặp | `duplicateDetector.js` | Tìm và xóa notifications trùng (Levenshtein algorithm) |

---

## ❓ FAQ - Các Câu Hỏi Thường Gặp

### Q: Dữ liệu từ đâu ra?
A: Hiện tại là dữ liệu giả mạo (sample data) trong `init.sql`. Trong production, backend sẽ kết nối trực tiếp với API của Outlook, Slack, Teams, Discord để lấy data thực.

### Q: Làm sao phát hiện trùng lặp?
A: Dùng 2 bước:
1. Hash giống nhau → Xóa ngay
2. Levenshtein distance: So sánh độ tương đồng của sender + message

### Q: Tại sao chia utils thành 4 file?
A: Single Responsibility - Mỗi file chỉ làm 1 việc:
- `dataNormalizer` = chuẩn hóa
- `timestampFormatter` = định dạng thời gian
- `duplicateDetector` = phát hiện trùng
- `responseFormatter` = định dạng response

### Q: Connection pooling là gì?
A: Tạo sẵn 10 connections đến MySQL, tái sử dụng thay vì tạo mới mỗi lần. Nhanh hơn!

### Q: Tại sao có demo mode?
A: Nếu MySQL không khả dụng, server vẫn chạy bình thường với sample data. Cho phép dev mà không cần setup MySQL.

---

## 📊 Sample Data - Dữ Liệu Mẫu

```javascript
{
  id: 1,
  platform: "slack",
  sender: "Nguyễn Văn A",
  subject: "#general",
  message: "Hôm nay họp lúc 3h nhé!",
  created_at: "2026-05-24 10:30:00",
  is_read: false,
  timeAgo: "5 phút trước",
  date: "Hôm nay",
  icon: "slack-icon",
  color: "#36C5F0",
  type: "chat"
}
```

---

## 🔐 Security Notes - Lưu Ý Bảo Mật

- ✅ Input validation - Validate tất cả query params
- ✅ SQL injection prevention - Dùng prepared statements (MySQL2)
- ✅ CORS - Cấu hình cho phép request từ frontend
- ⚠️ TODO: Authentication/Authorization - Chưa có, cần thêm
- ⚠️ TODO: Rate limiting - Chưa có, cần thêm
- ⚠️ TODO: HTTPS - Chỉ dành cho production

---

## 📈 Performance Optimization - Tối Ưu Hiệu Năng

1. **Connection Pooling** - Reuse MySQL connections
2. **Indexes** - Index trên platform, is_read, created_at
3. **Pagination** - Lấy từng trang thay vì all records
4. **Data Filtering** - Filter trên database, không trên code
5. **Response Compression** - Xóa trường không cần

---

## 🔄 Development Workflow - Quy Trình Phát Triển

```
1. User mở frontend (http://localhost:8080)
   ↓
2. Frontend tự động gọi API:
   GET /api/notifications?page=1&limit=10
   ↓
3. Backend nhận request:
   - notificationController.getNotifications()
   - Gọi MySQL lấy data
   - Chuẩn hóa dữ liệu qua dataNormalizer
   - Định dạng response qua responseFormatter
   ↓
4. Return JSON response
   ↓
5. Frontend nhận JSON:
   - Parse JSON
   - Render HTML
   - Hiển thị lên màn hình
   ↓
6. User interaction:
   - Click "Đánh dấu đã đọc"
   - Frontend gọi: PUT /api/notifications/:id/read
   - Backend update MySQL
   - Response success
   - Frontend update UI
```

---

## ✅ Checklist Kiểm Tra

- [x] Backend chạy trên port 5000
- [x] Frontend chạy trên port 8080
- [x] API /health return OK
- [x] API /notifications return dữ liệu
- [x] Pagination hoạt động
- [x] Timestamp định dạng Vietnamese
- [x] Duplicate detection hoạt động
- [x] Batch update read status
- [ ] MySQL setup (optional)
- [ ] Production deployment

---

## 📞 Liên Hệ & Hỗ Trợ

- 🐛 **Bug Report:** GitHub Issues
- 💬 **Questions:** Check README.md & TEST_REPORT.md
- 📚 **Docs:** backend_server/README.md
- 🚀 **Deployment:** HƯỚNG_DẪN_TRIỂN_KHAI.md

---

**Happy Coding! 🎉**

Version: 1.0.0  
Last Updated: May 24, 2026
