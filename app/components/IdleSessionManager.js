'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// 20 minutes in milliseconds
const INACTIVITY_LIMIT_MS = 20 * 60 * 1000;
// Refresh server session token at most once every 3 minutes while user is active
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

export default function IdleSessionManager() {
  const router = useRouter();
  const lastActiveRef = useRef(Date.now());
  const lastRefreshRef = useRef(Date.now());

  useEffect(() => {
    // 1. Perform logout when inactivity threshold is reached
    async function handleAutoLogout() {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        console.error('Logout error on idle timeout:', e);
      } finally {
        router.push('/?reason=inactive');
        router.refresh();
      }
    }

    // 2. Refresh server session token in the background while user is active
    async function refreshSession() {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.ok) {
          lastRefreshRef.current = Date.now();
        } else if (res.status === 401) {
          handleAutoLogout();
        }
      } catch (e) {
        console.error('Failed to refresh session:', e);
      }
    }

    // 3. Activity handler triggered on user input
    function handleUserActivity() {
      const now = Date.now();
      lastActiveRef.current = now;

      // If active and last server refresh was > 3 minutes ago, extend server session
      if (now - lastRefreshRef.current >= REFRESH_INTERVAL_MS) {
        refreshSession();
      }
    }

    // 4. Timer check running every 10 seconds (handles laptop wake / background tab return)
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActiveRef.current;
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        clearInterval(checkInterval);
        handleAutoLogout();
      }
    }, 10000);

    // 5. Check immediately when user switches tabs or wakes laptop
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActiveRef.current;
        if (elapsed >= INACTIVITY_LIMIT_MS) {
          handleAutoLogout();
        } else {
          handleUserActivity();
        }
      }
    }

    // Listen for common user interaction events
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(checkInterval);
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  return null; // Silent background manager
}
