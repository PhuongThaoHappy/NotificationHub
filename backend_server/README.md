# NotificationHub Backend API

Complete backend server for NotificationHub application with support for multi-platform notification management (Outlook, Slack, Teams, Discord).

## Features Implemented

✅ **Pagination & Infinite Scroll** - Configurable page size (1-50 items) with pagination metadata
✅ **Data Normalization** - Standardize notifications from different platforms (Outlook, Slack, Teams, Discord)
✅ **Response JSON Design** - Clean, structured API responses with formatted timestamps
✅ **Timestamp Formatting** - User-friendly time display ("5 phút trước", "Hôm qua lúc 16:20")
✅ **Data Cleanup** - Remove redundant fields before returning to frontend
✅ **Platform Mapping** - Icon and type mapping for different platforms
✅ **Read/Unread Status Sync** - Update notification status for single or multiple items
✅ **Duplicate Detection** - Identify and remove duplicate notifications

## Project Structure

```
backend_server/
├── server.js                          # Main Express server
├── config.js                          # Database configuration
├── package.json                       # Dependencies
├── .env.example                       # Environment variables template
├── init.sql                           # Database initialization script
│
├── controllers/
│   └── notificationController.js      # Business logic for notifications
│
├── routes/
│   └── notifications.js               # API endpoints
│
└── utils/
    ├── dataNormalizer.js              # Platform data normalization
    ├── timestampFormatter.js          # Timestamp formatting
    ├── duplicateDetector.js           # Duplicate detection logic
    └── responseFormatter.js           # Response formatting
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend_server
npm install
```

### 2. Setup Database

Create a `.env` file based on `.env.example`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=notifyhub_db
DB_PORT=3306
PORT=5000
NODE_ENV=development
```

Then initialize the database:

```bash
# Using MySQL CLI
mysql -u root -p < init.sql

# Or manually execute init.sql in your MySQL client
```

### 3. Start the Server

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Get Notifications with Pagination
```
GET /api/notifications?page=1&limit=20&platform=all&status=all

Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 20, max: 50)
- platform: Filter by platform (all|teams|slack|outlook|discord)
- status: Filter by status (all|read|unread)

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 50,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Get Single Notification
```
GET /api/notifications/:id
```

### Get Notifications Grouped by Date
```
GET /api/notifications/grouped?platform=all&status=all

Response:
{
  "success": true,
  "data": {
    "Hôm nay": [...],
    "Hôm qua": [...],
    "Tuần trước": [...]
  }
}
```

### Get Notification Statistics
```
GET /api/notifications/stats

Response:
{
  "success": true,
  "data": {
    "total": 50,
    "unread": 12,
    "byPlatform": {
      "teams": 15,
      "slack": 20,
      "outlook": 15
    },
    "byStatus": {
      "unread": 12,
      "read": 38
    }
  }
}
```

### Update Single Notification Read Status
```
PUT /api/notifications/:id/read

Request Body:
{
  "is_read": true
}
```

### Update Multiple Notifications Read Status
```
PUT /api/notifications/batch/read

Request Body:
{
  "ids": [1, 2, 3],
  "is_read": true
}
```

### Delete Notification
```
DELETE /api/notifications/:id
```

### Find and Remove Duplicates
```
POST /api/notifications/deduplicate

Response:
{
  "success": true,
  "message": "Found and removed 2 duplicate notifications",
  "data": null
}
```

## Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    "id": "notif_123",
    "platform": "slack",
    "icon": "slack-icon",
    "color": "#e01e5a",
    "type": "chat",
    "sender": "Backend Team",
    "subject": "API Deployment",
    "message": "API notification-service đã deploy thành công lên môi trường Staging.",
    "timestamp": "2024-05-20T10:30:00Z",
    "timeAgo": "5 phút trước",
    "date": "Hôm nay",
    "read": false
  },
  "timestamp": "2024-05-20T10:35:00Z"
}
```

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Invalid request parameters",
    "timestamp": "2024-05-20T10:35:00Z"
  }
}
```

## Data Normalization

The system normalizes notifications from different platforms to a consistent format:

### Outlook Normalization
- Maps `from` → `sender`
- Maps `subject` → `subject`
- Maps `bodyPreview` → `message`
- Maps `receivedDateTime` → `timestamp`
- Maps `isRead` → `read`

### Slack Normalization
- Maps `user` → `sender`
- Maps `channel` → `subject`
- Maps `text` → `message`
- Converts `ts` (Unix timestamp) → ISO format
- Maps `read` → `read`

### Teams Normalization
- Maps `from.displayName` → `sender`
- Maps `subject` → `subject`
- Maps `body.content` → `message`
- Maps `createdDateTime` → `timestamp`
- Maps `read` → `read`

### Discord Normalization
- Maps `author.username` → `sender`
- Maps `guild.name` → `subject`
- Maps `content` → `message`
- Maps `timestamp` → `timestamp`
- Maps `read` → `read`

## Duplicate Detection Algorithm

The system uses a multi-level approach:

1. **Hash-based detection** - Quick identification of exact duplicates
2. **Similarity matching** - Uses Levenshtein distance algorithm
3. **Threshold-based** - Configurable similarity threshold (default: 85%)

Duplicates are detected when:
- Same platform + same ID
- Same sender (100% match) + similar message (85%+ similarity)

## Timestamp Formatting

### Relative Time Format
- "Vừa xong" (< 1 minute ago)
- "5 phút trước" (< 1 hour ago)
- "2 giờ trước" (< 24 hours ago)
- "Hôm qua lúc 16:20" (yesterday)
- "3 ngày trước" (< 7 days ago)
- "2 tuần trước" (< 30 days ago)
- "20 tháng 5 lúc 10:30" (older)

## Database Schema

```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  sender VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  message LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  INDEX idx_platform (platform),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | Database host |
| DB_USER | root | Database user |
| DB_PASSWORD | (empty) | Database password |
| DB_NAME | notifyhub_db | Database name |
| DB_PORT | 3306 | Database port |
| PORT | 5000 | Server port |
| NODE_ENV | development | Environment mode |

## Development

### Run Tests
```bash
# Coming soon
```

### Code Style
- ES6+ JavaScript
- Comments in Vietnamese for consistency with the project
- Modular architecture for scalability

## Performance Considerations

1. **Pagination** - Limited to 50 items per page to prevent memory issues
2. **Indexing** - Database indexes on frequently queried columns
3. **Deduplication** - Can be run periodically to clean up old data
4. **Response Size** - Redundant fields removed before sending to frontend

## Error Handling

The API includes comprehensive error handling:
- 400: Bad Request (invalid parameters)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error (database/server issues)

All errors include descriptive messages and timestamps for debugging.

## Future Enhancements

- [ ] Real-time notifications via WebSockets
- [ ] Integration with actual platform APIs (Outlook Graph, Slack API, etc.)
- [ ] Notification scheduling and rules
- [ ] Full-text search support
- [ ] User authentication and authorization
- [ ] Notification archiving
- [ ] Custom notification templates

## License

MIT

## Support

For issues or questions, please create an issue in the GitHub repository.
