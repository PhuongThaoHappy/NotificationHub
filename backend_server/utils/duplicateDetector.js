/**
 * Duplicate Detector - Phát hiện và xử lý thông báo trùng lặp
 */

/**
 * Tính toán hash cho một thông báo
 */
function calculateNotificationHash(notification) {
  const { platform, sender, subject, message } = notification;
  const str = `${platform}|${sender}|${subject}|${message}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Tính độ tương tự giữa 2 chuỗi (0-1)
 */
function calculateStringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[len2][len1];
}

/**
 * Kiểm tra xem 2 thông báo có phải là bản sao không
 */
function isDuplicate(notif1, notif2, similarityThreshold = 0.85) {
  // Nếu cùng platform và ID thì chắc chắn là trùng
  if (notif1.platform === notif2.platform && notif1.id === notif2.id) {
    return true;
  }

  // Kiểm tra sender và message tương tự
  const senderSimilarity = calculateStringSimilarity(
    notif1.sender.toLowerCase(),
    notif2.sender.toLowerCase()
  );
  
  const messageSimilarity = calculateStringSimilarity(
    notif1.message.toLowerCase(),
    notif2.message.toLowerCase()
  );

  // Nếu sender giống 100% và message giống trên 85% thì coi là trùng
  if (senderSimilarity > 0.95 && messageSimilarity > similarityThreshold) {
    return true;
  }

  return false;
}

/**
 * Loại bỏ thông báo trùng lặp từ mảng
 */
function removeDuplicates(notifications) {
  const result = [];
  const seen = new Set();

  for (const notif of notifications) {
    const hash = calculateNotificationHash(notif);
    
    // Kiểm tra hash
    if (seen.has(hash)) {
      continue;
    }

    // Kiểm tra duplicate với các notification đã xử lý
    let isDup = false;
    for (const resultNotif of result) {
      if (isDuplicate(notif, resultNotif)) {
        isDup = true;
        break;
      }
    }

    if (!isDup) {
      result.push(notif);
      seen.add(hash);
    }
  }

  return result;
}

/**
 * Phát hiện nhóm thông báo trùng lặp
 */
function findDuplicateGroups(notifications) {
  const groups = [];
  const processed = new Set();

  for (let i = 0; i < notifications.length; i++) {
    if (processed.has(i)) continue;

    const group = [notifications[i]];
    processed.add(i);

    for (let j = i + 1; j < notifications.length; j++) {
      if (processed.has(j)) continue;

      if (isDuplicate(notifications[i], notifications[j])) {
        group.push(notifications[j]);
        processed.add(j);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}

module.exports = {
  isDuplicate,
  removeDuplicates,
  findDuplicateGroups,
  calculateNotificationHash,
  calculateStringSimilarity
};
