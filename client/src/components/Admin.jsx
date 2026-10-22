import { useCallback, useEffect, useState } from 'react';
import { fetchSummary } from '../api';
import { peso } from '../money';
import PinPad from './PinPad';

export default function Admin() {
  const [pin, setPin] = useState(() => sessionStorage.getItem('cc-admin-pin'));

  if (!pin) {
    return (
      <PinPad
        onUnlock={(p) => {
          sessionStorage.setItem('cc-admin-pin', p);
          setPin(p);
        }}
      />
    );
  }
  return (
    <Dashboard
      pin={pin}
      onLock={() => {
        sessionStorage.removeItem('cc-admin-pin');
        setPin(null);
      }}
    />
  );
}

function Dashboard({ pin, onLock }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setSummary(await fetchSummary(pin));
    } catch (err) {
      if (err.wrongPin) onLock(); // PIN changed on the server — ask again
      else setError(true);
    }
  }, [pin, onLock]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin">
      <header className="admin-header">
        <button className="ghost-btn" onClick={() => (window.location.hash = '')}>
          ← Register
        </button>
        <h1>End of Day{summary ? ` — ${summary.date}` : ''}</h1>
        <div className="admin-header-actions">
          <button className="ghost-btn" onClick={load}>
            ↻ Refresh
          </button>
          <button className="ghost-btn" onClick={onLock}>
            Lock
          </button>
        </div>
      </header>

      {error && (
        <p className="admin-error">
          Couldn't load the summary.{' '}
          <button className="ghost-btn" onClick={load}>
            Retry
          </button>
        </p>
      )}

      {summary && (
        <>
          <section className="cash-cards">
            <div className="cash-card">
              <span className="cash-label">Cash expected in drawer</span>
              <span className="cash-value">{peso(summary.totalCents)}</span>
            </div>
            <div className="cash-card">
              <span className="cash-label">Orders today</span>
              <span className="cash-value">{summary.ordersCount}</span>
            </div>
          </section>

          <table className="sales-table">
            <thead>
              <tr>
                <th>Dish</th>
                <th>Sold</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {summary.dishes.map((d) => (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td>{d.qty}</td>
                  <td>{peso(d.revenueCents)}</td>
                </tr>
              ))}
              {summary.dishes.length === 0 && (
                <tr>
                  <td colSpan="3" className="sales-empty">
                    No sales recorded today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
