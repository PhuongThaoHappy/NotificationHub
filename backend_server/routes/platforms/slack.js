const express = require('express');
const axios = require('axios');
const router = express.Router();
const verifySlackRequest = require('../../middleware/verifySlack');
const { pool } = require('../../config');
const { normalizeNotification } = require('../../utils/dataNormalizer');

// Simple in-memory cache for Slack user display names
// Map<userId, { name: string, expiresAt: number }>
const slackUserCache = new Map();
const SLACK_USER_CACHE_TTL = Number(process.env.SLACK_USER_CACHE_TTL_MS || 1000 * 60 * 15); // default 15m
const SLACK_USER_CACHE_MAX = Number(process.env.SLACK_USER_CACHE_MAX || 2000);

// Cache for bot user id (from auth.test) per team or token
const slackBotIdCache = new Map();
const SLACK_BOT_ID_CACHE_TTL = Number(process.env.SLACK_BOT_ID_CACHE_TTL_MS || 1000 * 60 * 15);

async function upsertSlackTokenRecord({ teamId = null, accessToken, scope = null, refreshToken = null, expiresAt = null }) {
  if (!accessToken) {
    return false;
  }

  const [existingRows] = await pool.query(
    'SELECT id FROM platform_tokens WHERE platform = ? AND team_id <=> ? LIMIT 1',
    ['slack', teamId]
  );

  if (existingRows.length > 0) {
    await pool.query(
      'UPDATE platform_tokens SET access_token = ?, refresh_token = ?, scope = ?, expires_at = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
      [accessToken, refreshToken, scope, expiresAt, existingRows[0].id]
    );
    return true;
  }

  await pool.query(
    'INSERT INTO platform_tokens (platform, team_id, access_token, refresh_token, scope, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    ['slack', teamId, accessToken, refreshToken, scope, expiresAt]
  );

  return true;
}

async function syncSlackTokenFromEnv() {
  if (!process.env.SLACK_BOT_TOKEN) {
    return false;
  }

  try {
    return await upsertSlackTokenRecord({
      teamId: process.env.SLACK_TEAM_ID || null,
      accessToken: process.env.SLACK_BOT_TOKEN,
      scope: process.env.SLACK_SCOPE || null,
      refreshToken: process.env.SLACK_REFRESH_TOKEN || null,
      expiresAt: process.env.SLACK_EXPIRES_AT || null
    });
  } catch (error) {
    console.warn('Could not sync Slack token from env to platform_tokens:', error.message || error);
    return false;
  }
}

async function getSlackAccessToken(teamId) {
  if (process.env.SLACK_BOT_TOKEN) {
    return process.env.SLACK_BOT_TOKEN;
  }

  try {
    if (teamId) {
      const [rows] = await pool.query(
        'SELECT access_token FROM platform_tokens WHERE platform = ? AND team_id = ? ORDER BY created_at DESC LIMIT 1',
        ['slack', teamId]
      );

      if (rows.length > 0 && rows[0].access_token) {
        return rows[0].access_token;
      }
    }

    const [rows] = await pool.query(
      'SELECT access_token FROM platform_tokens WHERE platform = ? ORDER BY created_at DESC LIMIT 1',
      ['slack']
    );

    if (rows.length > 0 && rows[0].access_token) {
      return rows[0].access_token;
    }
  } catch (error) {
    console.warn('Could not load Slack access token:', error.message || error);
  }

  return null;
}

async function resolveSlackSenderName(event, teamId) {
  const fallbackName = event.user_profile?.display_name
    || event.user_profile?.real_name
    || event.username
    || event.bot_profile?.name
    || event.user;

  const userId = event.user;
  if (!userId) {
    return fallbackName || 'Unknown';
  }

  // Check cache first
  try {
    const cached = slackUserCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.name;
    }
  } catch (err) {
    // ignore cache errors
  }
  const accessToken = await getSlackAccessToken(teamId);
  if (!accessToken) {
    console.warn('No Slack token found in env or platform_tokens; falling back to user ID');
    return fallbackName || userId;
  }

  try {
    const response = await axios.get('https://slack.com/api/users.info', {
      params: { user: userId },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = response.data;
    if (!data?.ok) {
      console.warn('Slack users.info returned non-ok response:', data);
      return fallbackName || userId;
    }

    const profile = data?.user?.profile || {};
    const resolved = profile.display_name
      || profile.display_name_normalized
      || profile.real_name
      || profile.real_name_normalized
      || data?.user?.name
      || fallbackName
      || userId;

    // store in cache
    try {
      // simple size eviction: if over max, delete oldest entry
      if (slackUserCache.size >= SLACK_USER_CACHE_MAX) {
        const firstKey = slackUserCache.keys().next().value;
        if (firstKey) slackUserCache.delete(firstKey);
      }
      slackUserCache.set(userId, { name: resolved, expiresAt: Date.now() + SLACK_USER_CACHE_TTL });
    } catch (err) {
      // ignore cache set errors
    }

    return resolved;
  } catch (error) {
    console.warn('Could not resolve Slack sender name:', {
      message: error.message,
      responseData: error.response?.data,
      status: error.response?.status
    });
    return fallbackName || userId;
  }
}

async function getSlackBotUserId(teamId) {
  // Try cache
  try {
    const cached = slackBotIdCache.get(teamId || '__default');
    if (cached && cached.expiresAt > Date.now()) return cached.id;
  } catch (err) {}

  const accessToken = await getSlackAccessToken(teamId);
  if (!accessToken) return null;

  try {
    const resp = await axios.get('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = resp.data;
    if (data?.ok && data.user_id) {
      const id = data.user_id;
      slackBotIdCache.set(teamId || '__default', { id, expiresAt: Date.now() + SLACK_BOT_ID_CACHE_TTL });
      return id;
    }
  } catch (err) {
    console.warn('Could not fetch Slack bot user id via auth.test:', err?.message || err);
  }

  return null;
}

function shouldIgnoreSlackEvent(event) {
  if (!event || typeof event !== 'object') {
    return true;
  }

  const ignoredSubtypes = new Set([
    'channel_join',
    'group_join',
    'member_joined_channel',
    'bot_message'
  ]);

  if (event.subtype && ignoredSubtypes.has(event.subtype)) {
    return true;
  }

  if (event.type === 'member_joined_channel' || event.type === 'channel_joined') {
    return true;
  }

  return false;
}

// OAuth callback - exchange code for token and store
router.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const resp = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        code,
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        redirect_uri: process.env.SLACK_REDIRECT_URI
      }
    });

    const data = resp.data;
    if (!data.ok) return res.status(400).send('OAuth failed: ' + JSON.stringify(data));

    try {
      await upsertSlackTokenRecord({
        teamId: (data.team && data.team.id) || null,
        accessToken: data.access_token || data.authed_user?.access_token || null,
        scope: data.scope || null,
        refreshToken: data.refresh_token || null,
        expiresAt: data.expires_in ? new Date(Date.now() + (Number(data.expires_in) * 1000)) : null
      });
    } catch (e) {
      console.warn('Could not save Slack token to DB:', e.message || e);
    }

    res.send('Slack app installed successfully');
  } catch (err) {
    console.error('Slack OAuth error:', err.message || err);
    res.status(500).send('OAuth exchange failed');
  }
});

// Events endpoint
// Respond to url_verification BEFORE signature verification
router.post('/events', (req, res, next) => {
  // Minimal logging: only output debug info when DEBUG_SLACK env flag is true
  if (process.env.DEBUG_SLACK === 'true') {
    try {
      console.log('--- Slack /events received ---');
      console.log('All headers:', req.headers);
      console.log('x-slack-request-timestamp (via get):', req.get('x-slack-request-timestamp'));
      console.log('x-slack-signature (via get):', req.get('x-slack-signature'));
      console.log('Raw body length:', req.rawBody ? req.rawBody.length : 0);
      console.log('Raw body preview:', (req.rawBody || JSON.stringify(req.body)).slice(0, 200));
    } catch (e) {
      console.warn('Failed to log Slack request debug info', e);
    }
  }

  if (req.body && req.body.type === 'url_verification' && req.body.challenge) {
    // Slack expects the raw challenge string in response (plain text)
    res.type('text').status(200).send(String(req.body.challenge));
    return;
  }

  next();
}, verifySlackRequest, async (req, res) => {
  try {
    const body = req.body;
    if (body.type === 'event_callback' && body.event) {
      const event = body.event;

      if (shouldIgnoreSlackEvent(event)) {
        if (process.env.DEBUG_SLACK === 'true') console.log('Ignoring Slack system event:', { type: event.type, subtype: event.subtype, channel: event.channel, user: event.user });
        return res.status(200).json({ ok: true, ignored: true });
      }

      // Ignore events originating from the bot itself or any configured ignored user ids
      const botUserId = await getSlackBotUserId(body.team_id).catch(() => null);
      const ignoredEnv = (process.env.SLACK_IGNORED_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

      if ((event.user && botUserId && event.user === botUserId) || event.bot_id) {
        if (process.env.DEBUG_SLACK === 'true') console.log('Ignoring Slack event from bot/self', { user: event.user, bot_id: event.bot_id, botUserId });
        return res.status(200).json({ ok: true, ignored: true });
      }

      if (event.user && ignoredEnv.includes(event.user)) {
        if (process.env.DEBUG_SLACK === 'true') console.log('Ignoring Slack event from configured ignored user id', { user: event.user });
        return res.status(200).json({ ok: true, ignored: true });
      }

      const senderName = await resolveSlackSenderName(event, body.team_id);
      // Ensure we always have something useful to save as sender: prefer resolved name, fall back to user id, then 'Unknown'
      const senderNameResolved = senderName || event.user || 'Unknown';

      const normalizedInput = {
        id: event.client_msg_id || event.ts || event.event_id,
        user: event.user || event.bot_id,
        senderName: senderNameResolved,
        username: event.username,
        channel: event.channel || event.channel_name,
        text: event.text || event.message || event.body,
        ts: event.ts || event.event_ts || event.event_time
      };

      const notification = normalizeNotification(normalizedInput, 'slack');
      const createdAt = notification.timestamp instanceof Date && !Number.isNaN(notification.timestamp.getTime())
        ? notification.timestamp
        : new Date();

      await pool.query(
        'INSERT INTO notifications (platform, sender, subject, message, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?)',
        [notification.platform, notification.sender, notification.subject || null, notification.message, createdAt, Boolean(notification.read)]
      );

      return res.status(200).json({ ok: true });
    }

    res.status(200).end();
  } catch (err) {
    console.error('Error handling Slack event:', err);
    res.status(500).end();
  }
});

module.exports = router;
module.exports.syncSlackTokenFromEnv = syncSlackTokenFromEnv;
module.exports.upsertSlackTokenRecord = upsertSlackTokenRecord;
