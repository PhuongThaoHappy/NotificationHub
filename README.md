# 📬 NotificationHub

A comprehensive notification management system that aggregates notifications from multiple platforms (Outlook, Slack, Teams, Discord) into a unified interface with advanced features like duplicate detection, read status synchronization, and intelligent timestamp formatting.

## ✨ Features

### Backend API
- 📊 **Pagination & Filtering** - Configurable page size, platform filtering, read/unread status filtering
- 🔄 **Data Normalization** - Unified format for notifications from 4 different platforms (Outlook, Slack, Teams, Discord)
- 🕐 **Smart Timestamps** - Vietnamese-formatted relative times ("5 phút trước") and date grouping ("Hôm nay", "Hôm qua")
- 🎯 **Duplicate Detection** - Levenshtein distance algorithm for intelligent duplicate identification
- ✅ **Status Management** - Single and batch read/unread status updates
- 📁 **Date Grouping** - Automatic grouping by date with Vietnamese translations
- 🏷️ **Platform Metadata** - Icons and color coding for each notification source
- 🚀 **Performance** - Connection pooling, efficient data compression, demo mode fallback

### Frontend UI
- 🎨 Clean, responsive design
- 📱 Mobile-friendly interface
- 🔔 Real-time notification updates (mockup ready for API integration)
- 🌙 Light/Dark mode support (UI framework ready)

## 🏗️ Project Structure

```
NotificationHub/
├── index.html                    # Frontend UI (HTML template)
├── style.css                     # Frontend styling
├── app.js                        # Frontend JavaScript (API client)
├── README.md                     # This file
│
└── backend_server/
    ├── server.js                 # Express.js entry point
    ├── package.json              # Dependencies & scripts
    ├── .env                      # Environment configuration
    ├── init.sql                  # Database initialization script
    ├── README.md                 # API documentation
    │
    ├── config.js                 # MySQL connection configuration
    ├── controllers/
    │   └── notificationController.js   # Business logic (8 functions)
    ├── routes/
    │   └── notifications.js            # API routes (10 endpoints)
    └── utils/
        ├── dataNormalizer.js           # Platform-specific data normalization
        ├── timestampFormatter.js       # Vietnamese timestamp formatting
        ├── duplicateDetector.js        # Levenshtein-based duplicate detection
        └── responseFormatter.js        # Standardized response JSON formatting
```

## 📋 Prerequisites

### System Requirements
- **Node.js** v14 or higher
- **npm** v6 or higher
- **MySQL** 5.7+ (optional for production; demo mode available)
- **Browser** with ES6 support (Modern Chrome, Firefox, Safari, Edge)

### Optional
- **MySQL Workbench** - For database management
- **Postman** - For API testing

## 🚀 Quick Start

### 1️⃣ Installation

```bash
# Clone the repository
git clone https://github.com/mrhan68/NotificationHub.git
cd NotificationHub

# Install backend dependencies
cd backend_server
npm install
cd ..

# Install frontend (optional - only if using http-server)
npm install -g http-server
```

### 2️⃣ Configuration

Create a `.env` file in `backend_server/`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=notifyhub_db
PORT=5000
NODE_ENV=development
```

**Note:** If MySQL is not available, the backend automatically runs in demo mode with sample data.

### 3️⃣ Database Setup (Optional)

```bash
# If you have MySQL installed:
mysql -u root -p < backend_server/init.sql

# Or manually:
# 1. Create database: CREATE DATABASE notifyhub_db;
# 2. Create table and insert sample data from init.sql
```

### 4️⃣ Start the Servers

**Terminal 1 - Backend (Port 5000):**
```bash
cd backend_server
npm start
# Or with auto-reload: npm run dev
```

**Terminal 2 - Frontend (Port 8080):**
```bash
npx http-server -p 8080
# Or if installed globally: http-server -p 8080
```

### 5️⃣ Access the Application

- 🌐 **Frontend:** http://localhost:8080
- 🔌 **Backend API:** http://localhost:5000
- 📚 **API Docs:** http://localhost:5000/api/info

## 📡 API Endpoints

All endpoints are documented in detail in [backend_server/README.md](./backend_server/README.md)

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get paginated notifications with filtering |
| GET | `/api/notifications/stats` | Get notification statistics |
| GET | `/api/notifications/grouped` | Get notifications grouped by date |
| GET | `/api/notifications/:id` | Get single notification |
| PUT | `/api/notifications/:id/read` | Update single notification status |
| PUT | `/api/notifications/batch/read` | Batch update notification status |
| DELETE | `/api/notifications/:id` | Delete notification |
| POST | `/api/notifications/deduplicate` | Detect & remove duplicates |
| GET | `/api/health` | Health check |
| GET | `/api/info` | API information |

## 🧪 Testing

### Manual Testing with curl

```bash
# Get all notifications
curl http://localhost:5000/api/notifications

# Get paginated notifications (page 1, 10 items)
curl "http://localhost:5000/api/notifications?page=1&limit=10"

# Filter by platform
curl "http://localhost:5000/api/notifications?platform=slack&status=unread"

# Get grouped notifications
curl http://localhost:5000/api/notifications/grouped

# Mark as read (batch)
curl -X PUT http://localhost:5000/api/notifications/batch/read \
  -H "Content-Type: application/json" \
  -d '{"ids":[1,2,3],"is_read":true}'

# Remove duplicates
curl -X POST http://localhost:5000/api/notifications/deduplicate
```

### Automated Testing with Postman
- Import the Postman collection from [backend_server/README.md](./backend_server/README.md)
- Run the full test suite

## 🌍 Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "platform": "slack",
      "sender": "John Doe",
      "subject": "#general",
      "message": "Great project!",
      "timestamp": "2026-05-24T10:30:00Z",
      "timeAgo": "5 phút trước",
      "date": "Hôm nay",
      "is_read": false,
      "icon": "slack-icon",
      "color": "#36C5F0",
      "type": "chat"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalItems": 45,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Invalid page number",
    "timestamp": "2026-05-24T10:30:00Z"
  }
}
```

## 🌐 Supported Platforms

| Platform | Fields Mapped | Icon | Color |
|----------|---------------|------|-------|
| **Outlook** | sender, subject, message, timestamp | outlook-icon | #0078D4 |
| **Slack** | sender, channel, message, timestamp | slack-icon | #36C5F0 |
| **Teams** | sender, subject, message, timestamp | teams-icon | #6264A7 |
| **Discord** | sender, subject, message, timestamp | discord-icon | #5865F2 |

## 🛠️ Technology Stack

### Backend
- **Express.js** 4.18.2 - Web framework
- **MySQL2** 3.6.5 - Database driver with connection pooling
- **Body-parser** 1.20.2 - Request body parsing
- **CORS** 2.8.5 - Cross-origin resource sharing
- **dotenv** 16.3.1 - Environment variable management
- **Nodemon** 3.0.1 - Development auto-reload

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling & animations
- **Vanilla JavaScript** - No dependencies

## 📚 Documentation

- 📖 **API Documentation:** [backend_server/README.md](./backend_server/README.md)
- 🚀 **Vietnamese Deployment Guide:** [HƯỚNG_DẪN_TRIỂN_KHAI.md](./HƯỚNG_DẪN_TRIỂN_KHAI.md)
- ✅ **Test Report:** [backend_server/TEST_REPORT.md](./backend_server/TEST_REPORT.md)

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is already in use
netstat -ano | findstr :5000

# If in use, either:
# 1. Kill the process: taskkill /PID [PID] /F
# 2. Change PORT in .env file
```

### Database connection fails
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1"

# Verify .env credentials
cat backend_server/.env

# Check init.sql is in backend_server/
ls backend_server/init.sql
```

### CORS errors
- Ensure backend is running on port 5000
- Check that frontend makes requests to `http://localhost:5000`
- CORS is configured in `backend_server/server.js`

## 📦 Deployment

For production deployment instructions, see [HƯỚNG_DẪN_TRIỂN_KHAI.md](./HƯỚNG_DẪN_TRIỂN_KHAI.md) (Vietnamese guide includes):
- PM2 process management
- Nginx reverse proxy configuration
- SSL/HTTPS setup with Certbot
- Environment-specific configurations
- Performance optimization
- Security best practices

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

- **Original Repository:** [PhuongThaoHappy/NotificationHub](https://github.com/PhuongThaoHappy/NotificationHub)
- **Forked & Enhanced By:** [mrhan68/NotificationHub](https://github.com/mrhan68/NotificationHub)

## 📞 Support

For issues, questions, or suggestions:
1. Check the [troubleshooting section](#-troubleshooting)
2. Review the [API documentation](./backend_server/README.md)
3. Open an issue on GitHub

---

**Happy Notifying!** 🎉

Last Updated: May 24, 2026  
Version: 1.0.0
