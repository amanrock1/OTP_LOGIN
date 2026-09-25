'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  // Form State
  const [step, setStep] = useState('EMAIL'); // 'EMAIL' or 'OTP'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 min OTP countdown
  const [resendCooldown, setResendCooldown] = useState(0); // 30s resend button cooldown

  // 5-minute OTP expiration timer
  useEffect(() => {
    let interval = null;
    if (step === 'OTP' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timerSeconds]);

  // 30-second Resend button cooldown timer
  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  // Step 1: Send OTP
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to send OTP code.');
      } else {
        setSuccessMessage('Verification code sent to your email.');
        setStep('OTP');
        setTimerSeconds(300);
        setResendCooldown(30);
      }
    } catch {
      setErrorMessage('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e) {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Invalid verification code.');
      } else {
        setSuccessMessage('Verified! Redirecting to dashboard...');
        // Redirect and force router refresh to update session state
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 800);
      }
    } catch {
      setErrorMessage('Network error during verification.');
    } finally {
      setLoading(false);
    }
  }

  // Format seconds to MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="container">
      <div className="auth-card">
        <div className="brand-badge">🔐 Passwordless Auth</div>

        {step === 'EMAIL' ? (
          <div>
            <h1 className="title">Sign in</h1>
            <p className="subtitle">
              Enter your email address to receive a 6-digit one-time verification code.
            </p>

            {errorMessage && <div className="alert-box alert-error">{errorMessage}</div>}
            {successMessage && <div className="alert-box alert-success">{successMessage}</div>}

            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  placeholder="name@example.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading || !email}>
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <h1 className="title">Check your inbox</h1>
            <p className="subtitle">
              We sent a 6-digit code to <span className="highlight-email">{email}</span>
            </p>

            {errorMessage && <div className="alert-box alert-error">{errorMessage}</div>}
            {successMessage && <div className="alert-box alert-success">{successMessage}</div>}

            <div className="timer-box">
              <span>Code expires in:</span>
              <span className="timer-countdown">{formatTime(timerSeconds)}</span>
            </div>

            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label className="form-label" htmlFor="otp">
                  6-Digit Code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="------"
                  className="input-field otp-input"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOtp(val);
                    if (val.length === 6 && !loading) {
                      // Trigger submit automatically when 6 digits entered
                    }
                  }}
                  disabled={loading || timerSeconds === 0}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading || otp.length !== 6 || timerSeconds === 0}
              >
                {loading ? 'Verifying...' : 'Verify & Log In'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleSendOtp}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  disabled={loading}
                  onClick={() => {
                    setStep('EMAIL');
                    setOtp('');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                >
                  Change Email
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
