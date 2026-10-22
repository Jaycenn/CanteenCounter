import { useEffect, useState } from 'react';
import Register from './components/Register';
import Admin from './components/Admin';

// Two screens, hash-routed, no router dependency: the register at "/" and the
// admin page at "#/admin". Staff can never wander anywhere else.
export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return hash === '#/admin' ? <Admin /> : <Register />;
}
