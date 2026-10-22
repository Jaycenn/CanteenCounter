import { useState } from 'react';
import { fetchSummary } from '../api';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

// Even the admin login is tap-only: a 4-digit pad, verified by the server.
export default function PinPad({ onUnlock }) {
  const [entry, setEntry] = useState('');
  const [shake, setShake] = useState(0);
  const [checking, setChecking] = useState(false);

  async function press(key) {
    if (checking || !key) return;
    if (key === '⌫') return setEntry((e) => e.slice(0, -1));
    const next = entry + key;
    setEntry(next);
    if (next.length < PIN_LENGTH) return;
    setChecking(true);
    try {
      await fetchSummary(next);
      onUnlock(next);
    } catch {
      setShake((s) => s + 1); // wrong PIN (or server hiccup): shake and clear
      setEntry('');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="pin-screen">
      <button className="ghost-btn pin-back" onClick={() => (window.location.hash = '')}>
        ← Register
      </button>
      <h1 className="pin-title">Admin PIN</h1>
      <div className="pin-dots" key={shake} data-shake={shake > 0 ? '' : undefined}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`pin-dot ${i < entry.length ? 'filled' : ''}`} />
        ))}
      </div>
      <div className="pin-pad">
        {KEYS.map((k, i) => (
          <button key={i} className="pin-key" disabled={!k} onPointerDown={() => press(k)}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
