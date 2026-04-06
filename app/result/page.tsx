'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatBanglaDate, formatBanglaDateTime } from '@/lib/schedule';
import { CheckCircle, XCircle, Camera, LayoutDashboard, Loader2, Calendar, Clock } from 'lucide-react';

interface CheckResult {
  allowed: boolean;
  plateNumber: string;
  lastFueled?: string;
  nextAllowedAt?: string;
  scheduledSlot?: string;
  scheduledDate?: string;
  hoursRemaining?: number;
  message: string;
  vehicleType?: string;
  fuelType?: string;
  imageDataURL?: string;
  pumpStationId?: string;
}

interface LoggedResult {
  schedule: {
    returnDate: string;
    slotLabel: string;
  };
}

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<CheckResult | null>(null);
  const [logged, setLogged] = useState<LoggedResult | null>(null);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('checkResult');
    if (!raw) { router.push('/scan'); return; }
    setResult(JSON.parse(raw));
  }, [router]);

  async function handleLog() {
    if (!result) return;
    setLogging(true);

    try {
      const res = await fetch('/api/log-fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: result.plateNumber,
          vehicleType: result.vehicleType ?? 'other',
          fuelType: result.fuelType ?? 'petrol',
          pumpStationId: result.pumpStationId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLogged(data);
        sessionStorage.removeItem('checkResult');
      } else {
        alert('লগ করা যায়নি: ' + (data.error ?? 'অজানা ত্রুটি'));
      }
    } catch {
      alert('নেটওয়ার্ক সমস্যা।');
    } finally {
      setLogging(false);
    }
  }

  if (!result) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  // ── ALLOWED + LOGGED ──────────────────────────────────────────────────────
  if (result.allowed && logged) {
    const returnDate = new Date(logged.schedule.returnDate);

    return (
      <div className="result-screen" style={{ background: 'linear-gradient(180deg, #14532d 0%, #0f172a 100%)', color: 'white', gap: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '5rem', lineHeight: 1, marginBottom: 12 }}>✅</div>
          <div className="result-title">লগ সম্পন্ন</div>
          <div className="result-plate">{result.plateNumber}</div>
        </div>

        {/* Schedule card */}
        <div style={{
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          borderRadius: 16, padding: '20px', width: '100%', marginBottom: 24,
          border: '1px solid rgba(255,255,255,0.15)'
        }}>
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📅 পরবর্তী সুযোগ
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Calendar size={20} opacity={0.7} />
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formatBanglaDate(returnDate)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Clock size={20} opacity={0.7} />
            <span style={{ fontSize: '1rem' }}>{logged.schedule.slotLabel}</span>
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button id="new-scan-after-log" className="btn" onClick={() => router.push('/scan')}
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Camera size={20} /> নতুন স্ক্যান
          </button>
          <button id="to-dashboard-after-log" className="btn btn-ghost" onClick={() => router.push('/dashboard')}
            style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
            <LayoutDashboard size={20} /> ড্যাশবোর্ড
          </button>
        </div>
      </div>
    );
  }

  // ── ALLOWED (not yet logged) ───────────────────────────────────────────────
  if (result.allowed) {
    return (
      <div className="result-screen" style={{ background: 'linear-gradient(180deg, #166534 0%, #0f172a 100%)', color: 'white' }}>
        <div className="result-icon">✅</div>
        <div className="result-title">অনুমোদিত</div>
        <div className="result-plate">{result.plateNumber}</div>

        <div style={{
          background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16,
          width: '100%', marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {result.lastFueled ? (
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              শেষ জ্বালানি: {formatBanglaDateTime(new Date(result.lastFueled))}
            </p>
          ) : (
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>🆕 প্রথমবার আসছেন</p>
          )}
          <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: 6 }}>
            {result.vehicleType === 'motorcycle' ? '🏍' : result.vehicleType === 'car' ? '🚗' : '🚛'}&nbsp;
            {result.vehicleType} &nbsp;·&nbsp; {result.fuelType}
          </p>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            id="log-btn"
            className="btn"
            onClick={handleLog}
            disabled={logging}
            style={{ background: 'white', color: '#166534', minHeight: 60, fontSize: '1.1rem', fontWeight: 700 }}
          >
            {logging
              ? <><Loader2 size={20} className="spin" /> লগ করা হচ্ছে...</>
              : <><CheckCircle size={22} /> লগ করুন</>}
          </button>
          <button id="new-scan-allowed" className="btn btn-ghost" onClick={() => router.push('/scan')}
            style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
            <Camera size={18} /> নতুন স্ক্যান
          </button>
        </div>
      </div>
    );
  }

  // ── REJECTED ──────────────────────────────────────────────────────────────
  const nextAllowed = result.nextAllowedAt ? new Date(result.nextAllowedAt) : null;
  const hours = result.hoursRemaining ?? 0;
  const daysLeft = Math.floor(hours / 24);
  const hoursLeft = hours % 24;

  return (
    <div className="result-screen" style={{ background: 'linear-gradient(180deg, #7f1d1d 0%, #0f172a 100%)', color: 'white' }}>
      <div className="result-icon">🚫</div>
      <div className="result-title">অনুমোদিত নয়</div>
      <div className="result-plate">{result.plateNumber}</div>

      <div style={{
        background: 'rgba(0,0,0,0.25)', borderRadius: 16, padding: '20px',
        width: '100%', marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', flexDirection: 'column', gap: 12
      }}>
        {result.lastFueled && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>শেষ জ্বালানি</span>
            <span style={{ fontWeight: 600 }}>{formatBanglaDateTime(new Date(result.lastFueled))}</span>
          </div>
        )}
        {nextAllowed && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>পরবর্তী সুযোগ</span>
            <span style={{ fontWeight: 600 }}>{formatBanglaDate(nextAllowed)}</span>
          </div>
        )}
        {result.scheduledSlot && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>নির্ধারিত সময়</span>
            <span style={{ fontWeight: 600 }}>{result.scheduledSlot}</span>
          </div>
        )}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ opacity: 0.7, fontSize: '0.8rem', marginBottom: 4 }}>বাকি সময়</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {daysLeft > 0 ? `${daysLeft} দিন ` : ''}{hoursLeft} ঘণ্টা
          </p>
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button id="new-scan-rejected" className="btn" onClick={() => router.push('/scan')}
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
          <Camera size={20} /> নতুন স্ক্যান
        </button>
        <button id="to-dashboard-rejected" className="btn btn-ghost" onClick={() => router.push('/dashboard')}
          style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
          <LayoutDashboard size={18} /> ড্যাশবোর্ড
        </button>
      </div>
    </div>
  );
}
