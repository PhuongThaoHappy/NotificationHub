const axios = require('axios');
require('dotenv').config();

const { pool } = require('../config');

async function getSlackAccessToken() {
  if (process.env.SLACK_BOT_TOKEN) {
    return process.env.SLACK_BOT_TOKEN;
  }

  const [rows] = await pool.query(
    'SELECT access_token FROM platform_tokens WHERE platform = ? ORDER BY created_at DESC LIMIT 1',
    ['slack']
  );

  return rows[0]?.access_token || null;
}

async function resolveDisplayName(userId, accessToken) {
  const response = await axios.get('https://slack.com/api/users.info', {
    params: { user: userId },
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const data = response.data;
  if (!data?.ok) {
    throw new Error(data?.error || 'users.info failed');
  }

  const profile = data.user?.profile || {};
  return profile.display_name
    || profile.display_name_normalized
    || profile.real_name
    || profile.real_name_normalized
    || data.user?.name
    || userId;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const accessToken = await getSlackAccessToken();

  if (!accessToken) {
    throw new Error('No Slack token found in SLACK_BOT_TOKEN or platform_tokens');
  }

  const [rows] = await pool.query(
    "SELECT DISTINCT sender FROM notifications WHERE platform = 'slack' AND sender REGEXP '^U[0-9A-Z]+'"
  );

  if (rows.length === 0) {
    console.log('No Slack user IDs found to backfill.');
    return;
  }

  console.log(`Found ${rows.length} Slack sender IDs to backfill`);

  for (const row of rows) {
    const userId = row.sender;
    try {
      const displayName = await resolveDisplayName(userId, accessToken);
      console.log(`${userId} -> ${displayName}`);

      if (!dryRun) {
        await pool.query(
          "UPDATE notifications SET sender = ? WHERE platform = 'slack' AND sender = ?",
          [displayName, userId]
        );
      }
    } catch (error) {
      console.warn(`Failed to resolve ${userId}:`, error.response?.data || error.message || error);
    }
  }

  if (!dryRun) {
    console.log('Backfill completed.');
  } else {
    console.log('Dry run completed. No rows were updated.');
  }
}

main()
  .then(() => pool.end())
  .catch(async error => {
    console.error('Slack sender backfill failed:', error.message || error);
    try {
      await pool.end();
    } catch (_) {}
    process.exit(1);
  });