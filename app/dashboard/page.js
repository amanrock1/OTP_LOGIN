import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import LogoutButton from './LogoutButton';
import IdleSessionManager from '../components/IdleSessionManager';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    redirect('/');
  }

  const session = await verifySessionToken(sessionCookie.value);
  if (!session || !session.email) {
    redirect('/');
  }

  return (
    <div className="container" style={{ maxWidth: 540 }}>
      {/* Background manager handles 20-minute inactivity auto-logout */}
      <IdleSessionManager />

      <div className="dashboard-card">
        <div className="status-badge">
          <span className="status-dot"></span>
          Session Active
        </div>

        <h1 className="title" style={{ fontSize: 28, marginBottom: 12 }}>
          Welcome Back!
        </h1>
        <p className="subtitle" style={{ marginBottom: 32 }}>
          You are securely authenticated as:
          <br />
          <strong style={{ color: '#60a5fa', fontSize: 18, marginTop: 4, display: 'inline-block' }}>
            {session.email}
          </strong>
        </p>

        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            padding: 20,
            textAlign: 'left',
            marginBottom: 32,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>
            Active Security Controls
          </div>
          <ul style={{ listStyle: 'none', fontSize: 13, color: '#d1d5db', lineHeight: 1.8 }}>
            <li>🛡️ <strong>JWT Signature:</strong> Verified on Edge Runtime (jose)</li>
            <li>🍪 <strong>Cookie:</strong> HTTP-Only, Secure, SameSite=Lax</li>
            <li>⏱️ <strong>Inactivity Timeout:</strong> Auto-logout after 20 mins of idle</li>
            <li>🔑 <strong>OTP Storage:</strong> SHA-256 Hashed in Upstash Redis</li>
            <li>⏳ <strong>Automatic Expiry:</strong> 5-Minute OTP TTL</li>
            <li>🚦 <strong>Brute-force Shield:</strong> Max 5 failed attempts per email</li>
          </ul>
        </div>

        <LogoutButton />
      </div>
    </div>
  );
}
