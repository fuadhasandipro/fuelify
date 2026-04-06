'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { formatBanglaDate, formatBanglaDateTime } from '@/lib/schedule';
import BottomNav from '@/components/BottomNav';
import {
  Camera, LogOut, Search, Building2,
  Fuel, RefreshCw, X, Plus, Download,
  Filter, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Transaction {
  id: string;
  plate_number: string;
  vehicle_type: string;
  fuel_type: string;
  fueled_at: string;
  scheduled_slot: string;
  scheduled_date: string;
  pump_stations?: { name: string; id: string } | null;
}

interface PumpStation {
  id: string;
  name: string;
}

interface Stats {
  total: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0 });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pump Management
  const [showAddPump, setShowAddPump] = useState(false);
  const [newPumpName, setNewPumpName] = useState('');
  const [newPumpLocation, setNewPumpLocation] = useState('');
  const [addingPump, setAddingPump] = useState(false);

  // Filters & Pagination
  const [pumps, setPumps] = useState<PumpStation[]>([]);
  const [searchPlate, setSearchPlate] = useState('');
  const [pumpFilter, setPumpFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [fuelFilter, setFuelFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    supabase.from('pump_stations').select('id, name').then(({ data }) => {
      if (data) setPumps(data);
    });
  }, [supabase]);

  const fetchData = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUser(user);

    let query = supabase
      .from('fuel_transactions')
      .select('*, pump_stations(id, name)', { count: 'exact' })
      .order('fueled_at', { ascending: sortOrder === 'asc' });

    if (searchPlate) query = query.ilike('plate_number', `%${searchPlate.toUpperCase()}%`);
    if (pumpFilter) query = query.eq('pump_station_id', pumpFilter);
    if (vehicleFilter) query = query.eq('vehicle_type', vehicleFilter);
    if (fuelFilter) query = query.eq('fuel_type', fuelFilter);

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: txns, count } = await query;
    if (txns) setTransactions(txns);
    if (count !== null) setStats({ total: count });
    
    setLoading(false);
    setRefreshing(false);
  }, [router, supabase, searchPlate, pumpFilter, vehicleFilter, fuelFilter, sortOrder, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchData(true);
  }

  function handleFilterChange(callback: () => void) {
    setPage(1);
    callback();
  }

  function exportCSV() {
    const headers = ['প্লেট নম্বর', 'পাম্প স্টেশন', 'যানবাহন', 'জ্বালানি', 'সময়', 'পরবর্তী সময়', 'স্লট'];
    const rows = transactions.map((t) => [
      t.plate_number,
      t.pump_stations?.name ?? 'অজ্ঞাত',
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

  async function handleAddPump(e: React.FormEvent) {
    e.preventDefault();
    if (!newPumpName.trim()) return;
    setAddingPump(true);
    const { error } = await supabase.from('pump_stations').insert({
      name: newPumpName.trim(),
      location: newPumpLocation.trim(),
    });
    if (error) {
      alert('পাম্প যোগ করা যায়নি: ' + error.message);
    } else {
      alert('নতুন পাম্প সফলভাবে যোগ করা হয়েছে।');
      setNewPumpName('');
      setNewPumpLocation('');
      setShowAddPump(false);
      // reload pumps
      const { data } = await supabase.from('pump_stations').select('id, name');
      if (data) setPumps(data);
    }
    setAddingPump(false);
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

  const totalPages = Math.ceil(stats.total / pageSize);

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
                জ্বালানি নিয়ন্ত্রণ (অপারেটর)
              </p>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>
                {user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'অপারেটর'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => fetchData(true)}
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
        
        {/* ── Quick Actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
           <button className="btn" onClick={() => setShowAddPump(true)} style={{ minHeight: 48, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.9rem' }}>
              <Building2 size={18} /> নতুন পাম্প যোগ
           </button>
           <button className="btn btn-ghost" onClick={exportCSV} style={{ border: '1px solid rgba(255,255,255,0.1)', minHeight: 48, fontSize: '0.9rem' }}>
              <Download size={18} /> CSV ডাউনলোড
           </button>
        </div>

        {/* ── Add Pump Modal Focus ── */}
        {showAddPump && (
          <div style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 20,
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>নতুন পাম্প যোগ করুন</h3>
              <button onClick={() => setShowAddPump(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPump} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" className="input" placeholder="পাম্পের নাম (যেমন: মেসার্স রহিম...)" value={newPumpName} onChange={e => setNewPumpName(e.target.value)} required />
              <input type="text" className="input" placeholder="স্থান/ঠিকানা" value={newPumpLocation} onChange={e => setNewPumpLocation(e.target.value)} />
              <button type="submit" className="btn btn-primary" disabled={addingPump}>
                {addingPump ? <RefreshCw className="spin" size={18} /> : <Plus size={18} />} যোগ করুন
              </button>
            </form>
          </div>
        )}

        {/* ── Filters Section ── */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
           
           <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                 <input
                  type="text"
                  className="input font-plate"
                  placeholder="প্লেট নম্বর খুঁজুন..."
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value)}
                  style={{ paddingRight: 40 }}
                 />
                 <button
                  type="submit"
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#f59e0b', display: 'flex', alignItems: 'center', cursor: 'pointer'
                  }}
                 >
                  <Search size={18} />
                 </button>
              </div>
              
              <button 
                type="button"
                onClick={() => setShowFilters(!showFilters)} 
                className={`btn ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
                style={{ width: 48, padding: 0, flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Filter size={18} />
              </button>
           </form>

           {showFilters && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
               <select className="input" value={pumpFilter} onChange={e => handleFilterChange(() => setPumpFilter(e.target.value))}>
                 <option value="">সব পাম্প স্টেশন</option>
                 {pumps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>

               <div style={{ display: 'flex', gap: 8 }}>
                 <select className="input" value={vehicleFilter} onChange={e => handleFilterChange(() => setVehicleFilter(e.target.value))} style={{ flex: 1 }}>
                   <option value="">সব যান</option>
                   <option value="motorcycle">মোটরসাইকেল</option>
                   <option value="car">গাড়ি</option>
                   <option value="other">অন্য</option>
                 </select>

                 <select className="input" value={fuelFilter} onChange={e => handleFilterChange(() => setFuelFilter(e.target.value))} style={{ flex: 1 }}>
                   <option value="">সব জ্বালানি</option>
                   <option value="octane">অকটেন</option>
                   <option value="petrol">পেট্রোল</option>
                   <option value="diesel">ডিজেল</option>
                 </select>
               </div>

               <select className="input" value={sortOrder} onChange={e => handleFilterChange(() => setSortOrder(e.target.value as 'asc'|'desc'))}>
                 <option value="desc">নতুন লেনদেনগুলো আগে</option>
                 <option value="asc">পুরাতন লেনদেনগুলো আগে</option>
               </select>
             </div>
           )}
        </div>

        {/* ── Transaction list ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p className="label">সকল লেনদেন ({stats.total})</p>
          </div>

          {transactions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
              <Fuel size={40} color="#334155" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#64748b' }}>কোনো লেনদেন নেই</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.map((tx) => (
                <div key={tx.id} className="card" style={{ padding: '16px', position: 'relative' }}>
                  
                  {/* The top row: Icon + Plate + Fueled Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', flexShrink: 0
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
                      
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                        {formatBanglaDateTime(new Date(tx.fueled_at))} · {tx.fuel_type}
                      </p>

                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Building2 size={12} /> {tx.pump_stations?.name ?? 'অজ্ঞাত পাম্প'}
                      </p>
                    </div>
                  </div>

                  {/* Scheduled Block Highlights */}
                  <div style={{ 
                     marginTop: 12, padding: '10px 12px', background: 'rgba(74, 222, 128, 0.05)', 
                     border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 10,
                     display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                     <span style={{ fontSize: '0.75rem', color: '#4ade80', textTransform: 'uppercase' }}>পরবর্তী সুযোগ</span>
                     <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>{tx.scheduled_date}</p>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{tx.scheduled_slot}</p>
                     </div>
                  </div>
                  
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <button 
                  className="btn btn-ghost" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => p - 1)}
                  style={{ width: 'auto', padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <ChevronLeft size={18} /> পূর্ববর্তী
                </button>
                
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                   পৃষ্ঠা {page} / {totalPages}
                </span>

                <button 
                  className="btn btn-ghost" 
                  disabled={page >= totalPages} 
                  onClick={() => setPage(p => p + 1)}
                  style={{ width: 'auto', padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  পরবর্তী <ChevronRight size={18} />
                </button>
             </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
