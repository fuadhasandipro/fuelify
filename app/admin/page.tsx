'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { formatBanglaDate, formatBanglaDateTime } from '@/lib/schedule';
import {
  ShieldCheck, Search, Download, ArrowLeft, RefreshCw,
  CheckCircle, Fuel, Users, Building2, ChevronRight
} from 'lucide-react';

interface Transaction {
  id: string;
  plate_number: string;
  vehicle_type: string;
  fuel_type: string;
  fueled_at: string;
  scheduled_slot: string;
  scheduled_date: string;
  pump_station_id: string;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPlate, setSearchPlate] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(async (search?: string) => {
    let query = supabase
      .from('fuel_transactions')
      .select('*', { count: 'exact' })
      .order('fueled_at', { ascending: false })
      .limit(50);

    if (search) {
      query = query.ilike('plate_number', `%${search.toUpperCase()}%`);
    }

    const { data, error, count } = await query;
    if (!error && data) {
      setTransactions(data);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if (user.user_metadata?.role !== 'admin') { router.push('/dashboard'); return; }
      fetchTransactions();
    };
    checkAdmin();
  }, [fetchTransactions, router, supabase]);

  function handleSearch() {
    fetchTransactions(searchPlate);
  }

  function exportCSV() {
    const headers = ['প্লেট নম্বর', 'যানবাহন', 'জ্বালানি', 'সময়', 'পরবর্তী সময়', 'স্লট'];
    const rows = transactions.map((t) => [
      t.plate_number,
      t.vehicle_type,
      t.fuel_type,
      new Date(t.fueled_at).toLocaleString('bn-BD'),
      t.scheduled_date,
      t.scheduled_slot,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuel-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
    <div className="page" style={{ paddingBottom: 24 }}>
      {/* ── Header ── */}
      <header style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        borderBottom: '1px solid #334155',
        position: 'sticky', top: 0, zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            id="admin-back-btn"
            onClick={() => router.push('/dashboard')}
            style={{
              width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)',
              border: '1px solid #334155', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#94a3b8'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="#f59e0b" />
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>অ্যাডমিন প্যানেল</h1>
          </div>
          <button
            onClick={() => { setRefreshing(true); fetchTransactions(searchPlate); }}
            style={{
              marginLeft: 'auto', width: 36, height: 36, borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid #334155',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94a3b8'
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#f59e0b' }}>{totalCount}</div>
            <div className="stat-label">মোট লগ</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <Building2 size={24} color="#94a3b8" />
            </div>
            <div className="stat-label">পাম্প স্টেশন</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <Users size={24} color="#94a3b8" />
            </div>
            <div className="stat-label">অপারেটর</div>
          </div>
        </div>

        {/* ── Search + Export ── */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              id="admin-search-input"
              type="text"
              className="input"
              placeholder="প্লেট নম্বর খুঁজুন..."
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ paddingRight: 44 }}
            />
            <button
              id="admin-search-btn"
              onClick={handleSearch}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b',
                display: 'flex', alignItems: 'center'
              }}
            >
              <Search size={18} />
            </button>
          </div>
          <button
            id="export-csv-btn"
            onClick={exportCSV}
            className="btn btn-ghost"
            style={{ minWidth: 52, width: 52, padding: 0, flexShrink: 0 }}
            title="CSV ডাউনলোড"
          >
            <Download size={18} />
          </button>
        </div>

        {/* ── Transaction list ── */}
        <div>
          <p className="label" style={{ marginBottom: 12 }}>
            লেনদেনের তালিকা ({totalCount})
          </p>

          {transactions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
              <Fuel size={40} color="#334155" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#64748b' }}>কোনো রেকর্ড পাওয়া যায়নি</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.map((tx) => (
                <div key={tx.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem', flexShrink: 0
                    }}>
                      {vehicleEmoji(tx.vehicle_type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-plate" style={{
                        fontSize: '1rem', fontWeight: 700, color: '#f1f5f9',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {tx.plate_number}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                        {formatBanglaDateTime(new Date(tx.fueled_at))} · {tx.fuel_type}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: 1 }}>
                        📅 পরবর্তী: {tx.scheduled_date} | {tx.scheduled_slot}
                      </p>
                    </div>
                    <CheckCircle
                      size={16}
                      color="#4ade80"
                      style={{ flexShrink: 0 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
