/**
 * Timestamp Formatter - Định dạng timestamp theo cách thân thiện với người dùng
 */

const vietnameseMonths = [
  'tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
  'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'
];

function toValidDate(timestamp) {
  if (timestamp instanceof Date) {
    return Number.isNaN(timestamp.getTime()) ? null : timestamp;
  }

  if (timestamp === undefined || timestamp === null || timestamp === '') {
    return null;
  }

  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format timestamp dạng thân thiện: "5 phút trước", "Hôm qua lúc 16:20"
 */
function formatTimeAgo(timestamp) {
  const date = toValidDate(timestamp);
  if (!date) {
    return 'Vừa xong';
  }

  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Vừa xong';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }
  if (diffDays === 1) {
    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `Hôm qua lúc ${timeStr}`;
  }
  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }

  const day = date.getDate();
  const month = vietnameseMonths[date.getMonth()];
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${month} lúc ${time}`;
}

/**
 * Format timestamp dạng ngày: "Hôm nay", "Hôm qua", "Tuần trước"
 */
function formatDate(timestamp) {
  const date = toValidDate(timestamp);
  if (!date) {
    return 'Hôm nay';
  }

  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Hôm nay';
  }
  if (diffDays === 1) {
    return 'Hôm qua';
  }
  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? 'Tuần trước' : `${weeks} tuần trước`;
  }

  const day = date.getDate();
  const month = vietnameseMonths[date.getMonth()];
  return `${day} ${month}`;
}

/**
 * Format timestamp dạng chuẩn ISO
 */
function formatISO(timestamp) {
  const date = toValidDate(timestamp) || new Date();
  return date.toISOString();
}

/**
 * Format timestamp dạng tùy chỉnh
 */
function formatCustom(timestamp, format = 'DD/MM/YYYY HH:mm') {
  const date = toValidDate(timestamp) || new Date();
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

module.exports = {
  formatTimeAgo,
  formatDate,
  formatISO,
  formatCustom
};
