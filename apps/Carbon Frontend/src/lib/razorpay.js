// Razorpay Checkout: create an order on our backend, open the popup, then
// verify the signature on our backend so credits are added.
import { api } from './api';

function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Razorpay. Check your connection.'));
    document.body.appendChild(s);
  });
}

export async function buyPack(pack = 'creator', { email, name } = {}) {
  const order = await api('/api/billing/order', { method: 'POST', body: { pack } });
  await loadScript();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Carbon',
      description: `${order.pack.name}: ${order.pack.credits} HD launch videos`,
      prefill: { email: email || '', name: name || '' },
      theme: { color: '#ff5b1f' },
      handler: async (resp) => {
        try {
          resolve(await api('/api/billing/verify', { method: 'POST', body: resp }));
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
    });
    rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed.')));
    rzp.open();
  });
}
