'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { formatBanglaDate, formatBanglaDateTime } from '@/lib/schedule';
import BottomNav from '@/components/BottomNav';
import {
  Camera, LogOut, CheckCircle, XCircle, Activity,
  Fuel, ChevronRight, RefreshCw, ShieldCheck
} from 'lucide-react';

interface Transaction {
  id: string;
  plate_number: string;
  vehicle_type: string;
  fuel_type: string;
  fueled_at: string;
  scheduled_slot: string;
  scheduled_date: string;
}

interface Stats {
  total: number;
  allowed: number;
  rejected: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, allowed: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUser(user);

    // Fetch today's transactions
    const { data: txns } = await supabase
      .from('fuel_transactions')
      .select('*')
      .gte('fueled_at', `${todayStr}T00:00:00`)
      .lt('fueled_at', `${todayStr}T23:59:59`)
      .order('fueled_at', { ascending: false })
      .limit(10);

    if (txns) setTransactions(txns);

    // Fetch stats (today) — count total and approximate allowed/rejected
    const { count: total } = await supabase
      .from('fuel_transactions')
      .select('*', { count: 'exact', head: true })
      .gte('fueled_at', `${todayStr}T00:00:00`);

    setStats({ total: total ?? 0, allowed: total ?? 0, rejected: 0 });
    setLoading(false);
    setRefreshing(false);
  }, [router, supabase, todayStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
  }

  const vehicleEmoji = (type: string) =>
    type === 'motorcycle' ? '🏍' : type === 'car' ? '🚗' : '🚛';

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      {/* ── Header ── */}
      <header style={{
        padding: '20px 20px 16px',
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        borderBottom: '1px solid #1e293b',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(220,38,38,0.35)'
            }}>
              <Fuel size={20} color="white" />
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                জ্বালানি নিয়ন্ত্রণ
              </p>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>
                {user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'অপারেটর'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {user?.user_metadata?.role === 'admin' && (
              <Link href="/admin" style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b'
              }}>
                <ShieldCheck size={18} />
              </Link>
            )}
            <button
              onClick={handleRefresh}
              style={{
                width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#94a3b8'
              }}
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            </button>
            <button
              id="logout-btn"
              onClick={handleLogout}
              style={{
                width: 36, height: 36, borderRadius: 8, background: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', color: '#f87171'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 8 }}>
          {formatBanglaDate(today)}
        </p>
      </header>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── Big CTA ── */}
        <Link
          id="scan-cta-btn"
          href="/scan"
          className="btn btn-primary"
          style={{ fontSize: '1.25rem', minHeight: 72, borderRadius: 16, textDecoration: 'none' }}
        >
          <Camera size={28} />
          নতুন যানবাহন স্ক্যান করুন
        </Link>

        {/* ── Today's Stats ── */}
        <div>
          <p className="label" style={{ marginBottom: 12 }}>আজকের পরিসংখ্যান</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.total}</div>
              <div className="stat-label">মোট চেক</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#4ade80' }}>
                <Activity size={28} style={{ margin: '0 auto' }} />
              </div>
              <div className="stat-label">অনুমোদিত</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#f87171' }}>
                <XCircle size={28} style={{ margin: '0 auto' }} />
              </div>
              <div className="stat-label">প্রত্যাখ্যান</div>
            </div>
          </div>
        </div>

        {/* ── Recent Transactions ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p className="label">সাম্প্রতিক লেনদেন</p>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>আজ</span>
          </div>

          {transactions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
              <Fuel size={40} color="#334155" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#64748b' }}>এখনো কোনো লেনদেন নেই</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.map((tx) => (
                <div key={tx.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', flexShrink: 0
                    }}>
                      {vehicleEmoji(tx.vehicle_type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-plate" style={{
                        fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {tx.plate_number}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                        {formatBanglaDateTime(new Date(tx.fueled_at))} · {tx.fuel_type}
                      </p>
                    </div>
                    <CheckCircle size={18} color="#4ade80" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
