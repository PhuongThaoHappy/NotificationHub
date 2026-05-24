/**
 * Notification Controller - Xử lý logic thông báo
 */

const { pool } = require('../config');
const { normalizeNotification, removeRedundantData } = require('../utils/dataNormalizer');
const { removeDuplicates } = require('../utils/duplicateDetector');
const { 
  formatPaginationResponse,
  formatSuccessResponse,
  formatErrorResponse,
  formatGroupedResponse,
  formatStatsResponse
} = require('../utils/responseFormatter');
const { formatDate } = require('../utils/timestampFormatter');

/**
 * Lấy danh sách thông báo với pagination
 */
async function getNotifications(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const platform = req.query.platform || null;
    const status = req.query.status || null;

    // Build query
    let query = 'SELECT * FROM notifications';
    const conditions = [];
    const values = [];

    if (platform && platform !== 'all') {
      conditions.push('platform = ?');
      values.push(platform);
    }

    if (status === 'unread') {
      conditions.push('is_read = 0');
    } else if (status === 'read') {
      conditions.push('is_read = 1');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM notifications' +
      (conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '');
    
    const [[{ total }]] = await pool.query(countQuery, values);

    // Get paginated data
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const [rows] = await pool.query(query, [...values, limit, offset]);

    const notifications = rows.map(row => normalizeNotification({
      id: row.id,
      platform: row.platform,
      from: row.sender,
      subject: row.subject,
      bodyPreview: row.message,
      receivedDateTime: row.created_at,
      isRead: row.is_read
    }, row.platform));

    res.json(formatPaginationResponse(notifications, page, limit, total));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json(formatErrorResponse(error, 500));
  }
}

/**
 * Lấy thông báo theo ID
 */
async function getNotificationById(req, res) {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json(formatErrorResponse('Notification not found', 404));
    }

    const row = rows[0];
    const notification = normalizeNotification({
      id: row.id,
      platform: row.platform,
      from: row.sender,
      subject: row.subject,
      bodyPreview: row.message,
      receivedDateTime: row.created_at,
      isRead: row.is_read
    }, row.platform);

    res.json(formatSuccessResponse([notification]));
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json(formatErrorResponse(error, 500));
  }
}

/**
 * Thay đổi trạng thái read/unread
 */
async function updateReadStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_read } = req.body;

    if (typeof is_read !== 'boolean') {
      return res.status(400).json(formatErrorResponse('is_read must be a boolean', 400));
    }

    const [result] = await pool.query(
      'UPDATE notifications SET is_read = ? WHERE id = ?',
      [is_read, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json(formatErrorResponse('Notification not found', 404));
    }

    res.json(formatSuccessResponse(null, 'Status updated successfully'));
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json(formatErrorResponse(error, 500));
  }
}

/**
 * Cập nhật trạng thái cho nhiều thông báo
 */
async function updateMultipleReadStatus(req, res) {
  try {
    const { ids, is_read } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(formatErrorResponse('ids must be a non-empty array', 400));
    }

    if (typeof is_read !== 'boolean') {
      return res.status(400).json(formatErrorResponse('is_read must be a boolean', 400));
    }

    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.query(
      `UPDATE notifications SET is_read = ? WHERE id IN (${placeholders})`,
      [is_read, ...ids]
    );

    res.json(formatSuccessResponse(null, `Updated ${result.affectedRows} notifications`));
  } catch (error) {
    console.error('Error updating multiple notifications:', error);
    res.status(500).json(formatErrorResponse(error, 500));
  }
}

/**
 * Xóa thông báo
 */
async function deleteNotification(req, res) {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM notifications WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json(formatErrorResponse('Notification not found', 404));
    }

    res.json(formatSuccessResponse(null, 'Notification deleted successfully'));
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json(formatErrorResponse(error, 500));
  }
}

/**
 * Lấy thông báo nhóm theo ngày
 */
async function getNotificationsGroupedByDate(req, res) {
  try {
    const platform = req.query.platform || null;
    const status = req.query.status || null;

    let query = 'SELECT * FROM notifications';
    const conditions = [];
    const values = [];

    if (platform && platform !== 'all') {
      conditions.push('platform = ?');
      values.push(platform);
    }

    if (status === 'unread') {
      conditions.push('is_read = 0');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, values);

    const grouped = {};
    rows.forEach(row => {
      const notification = normalizeNotification({
        id: row.id,
        platform: row.platform,
        from: row.sender,
        subject: row.subject,
        bodyPreview: row.message,
        receivedDateTime: row.created_at,
        isRead: row.is_read
      }, row.platform);

      const date = formatDate(notification.timestamp);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(notification);
    });

    res.json(formatGroupedResponse(grouped));
  } catch (error) {
    console.error('Error fetching grouped notifications:', error);
    res.status(500).json(formatErrorResponse(error, 500));
  }
}

/**
 * Lấy thống kê thông báo
 */
async function getNotificationStats(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM notifications');

    let total = rows.length;
    let unread = rows.filter(r => !r.is_read).length;
    let byPlatform = {};
    let byStatus = {
      unread: unread,
      read: total - unread
    };

    rows.forEach(row => {
      if (!byPlatform[row.platform]) byPlatform[row.platform] = 0;
      byPlatform[row.platform]++;
    });

    res.json(formatStatsResponse({ total, unread, byPlatform, byStatus }));
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json(formatErrorResponse(error, 500));
  }
}

/**
 * Tìm và xóa thông báo trùng lặp
 */
async function findAndRemoveDuplicates(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM notifications');

    const notifications = rows.map(row => ({
      id: row.id,
      platform: row.platform,
      sender: row.sender,
      subject: row.subject,
      message: row.message
    }));

    const deduplicated = removeDuplicates(notifications);
    const duplicateIds = notifications
      .filter(n => !deduplicated.find(d => d.id === n.id))
      .map(n => n.id);

    if (duplicateIds.length > 0) {
      const placeholders = duplicateIds.map(() => '?').join(',');
      await pool.query(
        `DELETE FROM notifications WHERE id IN (${placeholders})`,
        duplicateIds
      );
    }

    res.json(formatSuccessResponse(
      null,
      `Found and removed ${duplicateIds.length} duplicate notifications`
    ));
  } catch (error) {
    console.error('Error removing duplicates:', error);
    res.status(500).json(formatErrorResponse(error, 500));
  }
}

module.exports = {
  getNotifications,
  getNotificationById,
  updateReadStatus,
  updateMultipleReadStatus,
  deleteNotification,
  getNotificationsGroupedByDate,
  getNotificationStats,
  findAndRemoveDuplicates
};
