// ============================================================
//  lib/plans.js — Free quota and paid packs.
//
//  Free: FREE_VIDEOS_PER_DAY (default 2) per account in any rolling 24h,
//        720p with a "made with carbons.codes" watermark. Videos that fail
//        (status 'error') don't count. Enforced in POST /api/videos.
//  Credits: one credit = one 1080p video with no watermark, spent before the
//        free quota. Nothing sells credits on the public site right now (no
//        prices are shown; people who want more join the early-access list).
//        The Razorpay pack code in routes/billing.js stays for later.
//  An IP cap stops one person farming free videos with many accounts.
// ============================================================

const { db } = require('./db');

const FREE_PER_DAY = parseInt(process.env.FREE_VIDEOS_PER_DAY || '2', 10);
const FREE_PER_IP_PER_DAY = parseInt(process.env.FREE_VIDEOS_PER_IP_PER_DAY || '4', 10);

const PACKS = {
  creator: { id: 'creator', name: 'Creator Pack', amount: 9900, currency: 'INR', credits: 5 },
};

const countFreeByUser = db.prepare(
  "SELECT COUNT(*) AS n FROM video_jobs WHERE user_id = ? AND tier = 'free' AND status != 'error' AND created_at > datetime('now', '-1 day')"
);
const countFreeByIp = db.prepare(
  "SELECT COUNT(*) AS n FROM video_jobs WHERE ip = ? AND tier = 'free' AND status != 'error' AND created_at > datetime('now', '-1 day')"
);
const oldestFree = db.prepare(
  "SELECT created_at FROM video_jobs WHERE user_id = ? AND tier = 'free' AND status != 'error' AND created_at > datetime('now', '-1 day') ORDER BY created_at ASC LIMIT 1"
);

function usage(user) {
  const used = countFreeByUser.get(user.id).n;
  const oldest = oldestFree.get(user.id);
  return {
    credits: user.credits,
    freePerDay: FREE_PER_DAY,
    freeUsed: used,
    freeLeft: Math.max(0, FREE_PER_DAY - used),
    // When the oldest free video in the window ages out, one slot frees up.
    freeResetsAt: used >= FREE_PER_DAY && oldest ? new Date(`${oldest.created_at.replace(' ', 'T')}Z`).getTime() + 86400000 : null,
  };
}

// Decide which tier a new video uses, or why it can't be made.
function pickTier(user, ip) {
  if (user.credits > 0) return { tier: 'paid' };
  const u = usage(user);
  if (u.freeLeft <= 0) {
    return { error: `You've made your ${FREE_PER_DAY} free videos for today. A new one unlocks 24 hours after your first.`, code: 'FREE_LIMIT', usage: u };
  }
  if (ip && countFreeByIp.get(ip).n >= FREE_PER_IP_PER_DAY) {
    return { error: 'Too many free videos from this network today. Try again tomorrow.', code: 'FREE_IP_LIMIT', usage: u };
  }
  return { tier: 'free' };
}

module.exports = { PACKS, FREE_PER_DAY, usage, pickTier };
