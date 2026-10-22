const QUEUE_KEY = 'cc-pending-orders';

const readQueue = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
const writeQueue = (q) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));

export const pendingCount = () => readQueue().length;

export async function fetchDishes() {
  const res = await fetch('/api/dishes');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function postOrder(items) {
  let res;
  try {
    res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  } catch {
    throw { transient: true }; // network down — worth retrying later
  }
  if (res.ok) return;
  throw { transient: res.status >= 500 }; // 4xx = bad data, retrying won't help
}

// The register never blocks on the network: if the server is unreachable the
// order is queued in localStorage and re-sent the next time anything succeeds.
export async function submitOrder(items) {
  try {
    await postOrder(items);
    await flushQueue();
  } catch (err) {
    if (err.transient) writeQueue([...readQueue(), { items, at: Date.now() }]);
  }
}

export async function flushQueue() {
  let q = readQueue();
  while (q.length > 0) {
    try {
      await postOrder(q[0].items);
    } catch (err) {
      if (err.transient) break; // server still down — keep the rest queued
      // non-transient (e.g. dish removed from menu): drop it, it can never sync
    }
    q = q.slice(1);
    writeQueue(q);
  }
}

export async function fetchSummary(pin, date) {
  const url = date ? `/api/admin/summary?date=${date}` : '/api/admin/summary';
  const res = await fetch(url, { headers: { 'x-admin-pin': pin } });
  if (res.status === 401) throw Object.assign(new Error('Wrong PIN'), { wrongPin: true });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
