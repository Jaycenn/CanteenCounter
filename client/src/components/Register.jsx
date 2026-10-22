import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchDishes, submitOrder, pendingCount, flushQueue } from '../api';
import { peso } from '../money';
import DishButton from './DishButton';

const SAVED_FLASH_MS = 900;
const ADMIN_HOLD_MS = 1500;

export default function Register() {
  const [dishes, setDishes] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(false);
  const [taps, setTaps] = useState([]); // every tap in order — UNDO pops the last one
  const [flash, setFlash] = useState({ id: null, seq: 0 });
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(pendingCount());
  const savedTimer = useRef(null);
  const adminTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    fetchDishes()
      .then((d) => alive && setDishes(d))
      .catch(() => alive && setLoadError(true));
    flushQueue().then(() => alive && setPending(pendingCount()));
    return () => {
      alive = false;
      clearTimeout(savedTimer.current);
      clearTimeout(adminTimer.current);
    };
  }, []);

  const total = useMemo(() => taps.reduce((sum, d) => sum + d.price_cents, 0), [taps]);

  // qty per dish, keyed by the dish object itself; Map keeps first-tap order
  // so the badges and the one-line summary read in the order dishes were rung up
  const counts = useMemo(() => {
    const m = new Map();
    for (const dish of taps) m.set(dish, (m.get(dish) || 0) + 1);
    return m;
  }, [taps]);

  function clearSavedFlash() {
    clearTimeout(savedTimer.current);
    setSaved(false);
  }

  function handleTap(dish) {
    clearSavedFlash(); // tapping during the “SAVED” flash starts the next order instantly
    setTaps((t) => [...t, dish]);
    setFlash((f) => ({ id: dish.id, seq: f.seq + 1 }));
  }

  function handleUndo() {
    clearSavedFlash();
    setTaps((t) => t.slice(0, -1));
  }

  async function handleConfirm() {
    if (taps.length === 0) return;
    const items = [...counts].map(([dish, qty]) => ({ dishId: dish.id, qty }));
    setTaps([]); // reset immediately — the next customer is already talking
    setSaved(true);
    savedTimer.current = setTimeout(() => setSaved(false), SAVED_FLASH_MS);
    await submitOrder(items); // network failures are queued locally, never block the line
    setPending(pendingCount());
  }

  // Long-press the shop name to reach the admin page — invisible during service
  function startAdminHold() {
    adminTimer.current = setTimeout(() => {
      window.location.hash = '#/admin';
    }, ADMIN_HOLD_MS);
  }
  function cancelAdminHold() {
    clearTimeout(adminTimer.current);
  }

  if (loadError) {
    return (
      <div className="screen-msg">
        <p>Can't reach the server.</p>
        <button className="retry-btn" onClick={() => window.location.reload()}>
          TAP TO RETRY
        </button>
      </div>
    );
  }
  if (!dishes) {
    return (
      <div className="screen-msg">
        <p>Loading menu…</p>
      </div>
    );
  }

  return (
    <div className="register" onContextMenu={(e) => e.preventDefault()}>
      <header className={`total-bar ${saved ? 'is-saved' : ''}`}>
        <div
          className="shop-name"
          onPointerDown={startAdminHold}
          onPointerUp={cancelAdminHold}
          onPointerLeave={cancelAdminHold}
        >
          John Cen's Kitchenette
          {pending > 0 && <span className="pending-chip">{pending} to sync</span>}
        </div>
        <div className="total" key={saved ? 'saved' : total}>
          {saved ? 'SAVED ✓' : peso(total)}
        </div>
        <div className="order-line">
          {taps.length > 0
            ? [...counts].map(([dish, qty]) => `${dish.name} ×${qty}`).join('  ·  ')
            : saved
              ? 'Ready for the next customer'
              : 'Tap dishes to start an order'}
        </div>
      </header>

      <main className="dish-grid">
        {dishes.map((dish) => (
          <DishButton
            key={dish.id}
            dish={dish}
            count={counts.get(dish) || 0}
            flashSeq={flash.id === dish.id ? flash.seq : 0}
            onTap={handleTap}
          />
        ))}
      </main>

      <footer className="action-bar">
        <button className="undo-btn" disabled={taps.length === 0} onPointerDown={handleUndo}>
          ⌫ UNDO
        </button>
        <button className="confirm-btn" disabled={taps.length === 0} onClick={handleConfirm}>
          CONFIRM ORDER
        </button>
      </footer>
    </div>
  );
}
