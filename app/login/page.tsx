'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Fuel, Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('ইমেইল বা পাসওয়ার্ড সঠিক নয়');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="page" style={{ minHeight: '100dvh', justifyContent: 'center', padding: '24px' }}>
      {/* Logo / Brand */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '20px',
          background: 'linear-gradient(135deg, #dc2626, #991b1b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 32px rgba(220,38,38,0.4)'
        }}>
          <Fuel size={40} color="white" />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>
          জ্বালানি নিয়ন্ত্রণ সিস্টেম
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: 6 }}>
          ইশ্বরগঞ্জ পাইলট প্রকল্প
        </p>
      </div>

      {/* Login Card */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 24, color: '#f1f5f9' }}>
          অপারেটর লগইন
        </h2>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">ইমেইল</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="আপনার ইমেইল"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label">পাসওয়ার্ড</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="পাসওয়ার্ড"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                  display: 'flex', alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: '0.9rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button id="login-btn" type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? (
              <><div className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} /> লগইন হচ্ছে...</>
            ) : (
              <><LogIn size={20} /> লগইন করুন</>
            )}
          </button>
        </form>
      </div>

      <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.8rem', marginTop: 24 }}>
        ইশ্বরগঞ্জ উপজেলা পরিষদ
      </p>
    </div>
  );
}
