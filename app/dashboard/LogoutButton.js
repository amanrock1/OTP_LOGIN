'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="btn-primary"
      style={{
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#fca5a5',
        boxShadow: 'none',
      }}
    >
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}
