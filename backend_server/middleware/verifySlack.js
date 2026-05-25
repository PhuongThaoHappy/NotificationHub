const crypto = require('crypto');

function verifySlackRequest(req, res, next) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const timestamp = req.headers['x-slack-request-timestamp'];
  const signature = req.headers['x-slack-signature'];

  if (!signingSecret) {
    console.warn('SLACK_SIGNING_SECRET not set; skipping verification');
    return next();
  }

  if (!timestamp || !signature) {
    return res.status(400).send('Missing Slack signature headers');
  }

  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (Math.abs(age) > 60 * 5) {
    return res.status(400).send('Ignored: timestamp outside allowed window');
  }

  const raw = req.rawBody || (req.body ? JSON.stringify(req.body) : '');
  const base = `v0:${timestamp}:${raw}`;
  const mySig = 'v0=' + crypto.createHmac('sha256', signingSecret).update(base).digest('hex');

  try {
    const a = Buffer.from(mySig);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return res.status(401).send('Invalid signature');
    if (!crypto.timingSafeEqual(a, b)) return res.status(401).send('Invalid signature');
  } catch (err) {
    return res.status(401).send('Invalid signature');
  }

  next();
}

module.exports = verifySlackRequest;
