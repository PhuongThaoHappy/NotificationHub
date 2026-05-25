/**
 * Response Formatter - Định dạng response JSON cho frontend
 */

const { formatTimeAgo, formatDate } = require('./timestampFormatter');
const { removeRedundantData } = require('./dataNormalizer');

/**
 * Format một notification cho response
 */
function formatNotification(notification) {
  const cleaned = removeRedundantData(notification);
  const timestamp = (() => {
    const value = cleaned.timestamp;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }

    return new Date().toISOString();
  })();
  
  return {
    id: cleaned.id,
    platform: cleaned.platform,
    icon: cleaned.icon,
    color: cleaned.color,
    type: cleaned.type,
    sender: cleaned.sender || cleaned.subject || cleaned.platform || 'Unknown',
    subject: cleaned.subject,
    message: cleaned.message,
    timestamp,
    timeAgo: formatTimeAgo(timestamp),
    date: formatDate(timestamp),
    read: cleaned.read
  };
}

/**
 * Format list notifications cho response
 */
function formatNotificationList(notifications) {
  return notifications.map(notif => formatNotification(notif));
}

/**
 * Format pagination response
 */
function formatPaginationResponse(data, page, limit, total) {
  return {
    success: true,
    data: formatNotificationList(data),
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    }
  };
}

/**
 * Format thành công response
 */
function formatSuccessResponse(data = null, message = 'Success') {
  return {
    success: true,
    message,
    data: data ? formatNotificationList(data) : null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format error response
 */
function formatErrorResponse(error, statusCode = 400) {
  return {
    success: false,
    error: {
      code: statusCode,
      message: error.message || error,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Format grouped notifications response
 */
function formatGroupedResponse(groupedData) {
  const result = {};
  
  Object.keys(groupedData).forEach(date => {
    result[date] = formatNotificationList(groupedData[date]);
  });

  return {
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format statistics response
 */
function formatStatsResponse(stats) {
  return {
    success: true,
    data: {
      total: stats.total,
      unread: stats.unread,
      byPlatform: stats.byPlatform,
      byStatus: stats.byStatus
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  formatNotification,
  formatNotificationList,
  formatPaginationResponse,
  formatSuccessResponse,
  formatErrorResponse,
  formatGroupedResponse,
  formatStatsResponse
};
