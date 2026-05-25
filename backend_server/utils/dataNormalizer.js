/**
 * Data Normalizer - Chuẩn hóa dữ liệu từ các platform khác nhau
 */

const platformConfig = {
  outlook: {
    icon: 'outlook-icon',
    color: '#0078d4',
    type: 'email'
  },
  zalo: {
    icon: 'zalo-icon',
    color: '#0068ff',
    type: 'chat'
  },
  slack: {
    icon: 'slack-icon',
    color: '#e01e5a',
    type: 'chat'
  },
  teams: {
    icon: 'teams-icon',
    color: '#6264a7',
    type: 'chat'
  },
  discord: {
    icon: 'discord-icon',
    color: '#5865f2',
    type: 'chat'
  }
};

/**
 * Chuẩn hóa thông báo từ Outlook
 */
function normalizeOutlookNotification(rawData) {
  return {
    id: rawData.id,
    platform: 'outlook',
    sender: rawData.from || rawData.sender,
    subject: rawData.subject,
    message: rawData.bodyPreview || rawData.body,
    timestamp: new Date(rawData.receivedDateTime || rawData.createdTime),
    read: rawData.isRead || false,
    icon: platformConfig.outlook.icon,
    color: platformConfig.outlook.color,
    type: platformConfig.outlook.type,
    originalData: rawData
  };
}

/**
 * Chuẩn hóa thông báo từ Slack
 */
function normalizeSlackNotification(rawData) {
  const timestampValue = rawData.ts || rawData.timestamp;
  const parsedTimestamp = (() => {
    if (timestampValue === undefined || timestampValue === null || timestampValue === '') {
      return null;
    }

    const numericTimestamp = Number.parseFloat(timestampValue);
    if (Number.isNaN(numericTimestamp)) {
      const dateFromValue = new Date(timestampValue);
      return Number.isNaN(dateFromValue.getTime()) ? null : dateFromValue;
    }

    const dateFromSeconds = new Date(numericTimestamp < 1e12 ? numericTimestamp * 1000 : numericTimestamp);
    return Number.isNaN(dateFromSeconds.getTime()) ? null : dateFromSeconds;
  })();

  return {
    id: rawData.ts || rawData.id,
    platform: 'slack',
    sender: rawData.senderName || rawData.displayName || rawData.username || rawData.user,
    subject: rawData.channel || 'Direct Message',
    message: rawData.text || rawData.message,
    timestamp: parsedTimestamp || new Date(),
    read: rawData.read || false,
    icon: platformConfig.slack.icon,
    color: platformConfig.slack.color,
    type: platformConfig.slack.type,
    originalData: rawData
  };
}

/**
 * Chuẩn hóa thông báo từ Teams
 */
function normalizeTeamsNotification(rawData) {
  return {
    id: rawData.id,
    platform: 'teams',
    sender: rawData.from?.displayName || rawData.sender,
    subject: rawData.subject || rawData.channel,
    message: rawData.body?.content || rawData.message,
    timestamp: new Date(rawData.createdDateTime || rawData.timestamp),
    read: rawData.read || false,
    icon: platformConfig.teams.icon,
    color: platformConfig.teams.color,
    type: platformConfig.teams.type,
    originalData: rawData
  };
}

/**
 * Chuẩn hóa thông báo từ Zalo
 */
function normalizeZaloNotification(rawData) {
  return {
    id: rawData.id || rawData.messageId || rawData.msgId,
    platform: 'zalo',
    sender: rawData.sender?.name || rawData.sender || rawData.senderName || rawData.userName || rawData.from,
    subject: rawData.subject || rawData.conversationName || rawData.threadName || 'Zalo',
    message: rawData.message || rawData.text || rawData.content,
    timestamp: new Date(rawData.timestamp || rawData.createdAt || rawData.sentAt || Date.now()),
    read: rawData.read || rawData.isRead || false,
    icon: platformConfig.zalo.icon,
    color: platformConfig.zalo.color,
    type: platformConfig.zalo.type,
    originalData: rawData
  };
}

/**
 * Chuẩn hóa thông báo từ Discord
 */
function normalizeDiscordNotification(rawData) {
  return {
    id: rawData.id,
    platform: 'discord',
    sender: rawData.author?.username || rawData.username,
    subject: rawData.guild?.name || rawData.channel,
    message: rawData.content || rawData.message,
    timestamp: new Date(rawData.timestamp),
    read: rawData.read || false,
    icon: platformConfig.discord.icon,
    color: platformConfig.discord.color,
    type: platformConfig.discord.type,
    originalData: rawData
  };
}

/**
 * Chuẩn hóa thông báo dựa trên platform
 */
function normalizeNotification(rawData, platform) {
  switch(platform) {
    case 'outlook':
      return normalizeOutlookNotification(rawData);
    case 'zalo':
      return normalizeZaloNotification(rawData);
    case 'slack':
      return normalizeSlackNotification(rawData);
    case 'teams':
      return normalizeTeamsNotification(rawData);
    case 'discord':
      return normalizeDiscordNotification(rawData);
    default:
      return rawData;
  }
}

/**
 * Loại bỏ dữ liệu dư thừa
 */
function removeRedundantData(notification) {
  const essentialFields = [
    'id',
    'platform',
    'sender',
    'subject',
    'message',
    'timestamp',
    'read',
    'icon',
    'color',
    'type'
  ];

  const cleaned = {};
  essentialFields.forEach(field => {
    if (notification[field] !== undefined) {
      cleaned[field] = notification[field];
    }
  });

  return cleaned;
}

module.exports = {
  normalizeNotification,
  normalizeOutlookNotification,
  normalizeZaloNotification,
  normalizeSlackNotification,
  normalizeTeamsNotification,
  normalizeDiscordNotification,
  removeRedundantData,
  platformConfig
};
