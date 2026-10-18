// ============================================================
//  routes/billing.js — Buy credit packs with Razorpay (INR).
//
//  1. POST /api/billing/order   (signed in) → creates a Razorpay order
//  2. Browser opens Razorpay Checkout with that order id
//  3. POST /api/billing/verify  (signed in) → checks the payment signature
//     and adds credits
//  4. POST /api/billing/webhook (Razorpay → us) → same grant, as a backup if
//     the browser closes before step 3. Grants are idempotent per order.
//
//  Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
// ============================================================

const crypto = require('crypto');
const express = require('express');
const axios = require('axios');
const { db } = require('../lib/db');
const { requireUser } = require('../lib/auth');
const { PACKS } = require('../lib/plans');

const router = express.Router();

const keyId = () => process.env.RAZORPAY_KEY_ID || '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET || '';
const configured = () => Boolean(keyId() && keySecret());

const insertPayment = db.prepare('INSERT INTO payments (order_id, user_id, pack, amount, credits) VALUES (?, ?, ?, ?, ?)');
const getPayment = db.prepare('SELECT * FROM payments WHERE order_id = ?');
const markPaid = db.prepare("UPDATE payments SET status = 'paid', payment_id = ? WHERE order_id = ? AND status != 'paid'");
const addCredits = db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?');

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Adds the pack's credits once per order, no matter how many times it's called.
const grant = db.transaction((orderId, paymentId) => {
  const p = getPayment.get(orderId);
  if (!p) return { ok: false, reason: 'unknown order' };
  if (markPaid.run(paymentId, orderId).changes === 0) return { ok: true, already: true, payment: p };
  addCredits.run(p.credits, p.user_id);
  return { ok: true, payment: p };
});

router.get('/billing/config', (req, res) => {
  res.json({ enabled: configured(), keyId: configured() ? keyId() : null, packs: Object.values(PACKS) });
});

router.post('/billing/order', requireUser, async (req, res) => {
  if (!configured()) return res.status(503).json({ error: 'Payments are not set up yet.', code: 'PAYMENTS_OFF' });
  const pack = PACKS[req.body?.pack || 'creator'];
  if (!pack) return res.status(400).json({ error: 'Unknown pack' });
  try {
    const { data } = await axios.post(
      'https://api.razorpay.com/v1/orders',
      { amount: pack.amount, currency: pack.currency, receipt: `c_${Date.now()}`, notes: { user_id: req.user.id, pack: pack.id } },
      { auth: { username: keyId(), password: keySecret() }, timeout: 15000 }
    );
    insertPayment.run(data.id, req.user.id, pack.id, pack.amount, pack.credits);
    res.json({ orderId: data.id, amount: pack.amount, currency: pack.currency, keyId: keyId(), pack });
  } catch (err) {
    console.error('[billing] order failed:', err.response?.data || err.message);
    res.status(502).json({ error: 'Could not start the payment. Try again.' });
  }
});

router.post('/billing/verify', requireUser, (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  if (!configured() || !orderId || !paymentId || !signature) return res.status(400).json({ error: 'Missing payment details' });
  const p = getPayment.get(orderId);
  if (!p || p.user_id !== req.user.id) return res.status(404).json({ error: 'Order not found' });
  if (!safeEqual(hmac(keySecret(), `${orderId}|${paymentId}`), signature)) {
    return res.status(400).json({ error: 'Payment could not be verified.' });
  }
  const result = grant(orderId, paymentId);
  res.json({ ok: true, credits: p.credits, already: Boolean(result.already) });
});

// Mounted with express.raw() in server.js: the signature covers the raw body.
async function webhook(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.get('x-razorpay-signature');
  if (!secret || !signature || !Buffer.isBuffer(req.body) || !safeEqual(hmac(secret, req.body), signature)) {
    return res.status(400).json({ error: 'bad signature' });
  }
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'bad body' });
  }
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const pay = event.payload?.payment?.entity;
    const orderId = pay?.order_id || event.payload?.order?.entity?.id;
    if (orderId) grant(orderId, pay?.id || null);
  }
  res.json({ ok: true });
}

module.exports = { router, webhook, grant, hmac };
