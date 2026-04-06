'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit3, CheckCircle, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { isValidPlate } from '@/lib/plate-validator';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const CameraCapture = dynamic(() => import('@/components/CameraCapture'), { ssr: false });

type Step = 'capture' | 'ocr' | 'confirm';

interface PumpStation {
  id: string;
  name: string;
}

export default function ScanPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  
  const [step, setStep] = useState<Step>('capture');
  const [imageDataURL, setImageDataURL] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car' | 'other'>('motorcycle');
  const [fuelType, setFuelType] = useState<'octane' | 'petrol' | 'diesel'>('octane');
  
  // Pump Management
  const [pumps, setPumps] = useState<PumpStation[]>([]);
  const [selectedPumpId, setSelectedPumpId] = useState('');
  
  const [checking, setChecking] = useState(false);
  const capturedFileRef = useRef<File | null>(null);

  useEffect(() => {
    async function loadPumps() {
      const { data } = await supabase.from('pump_stations').select('id, name');
      if (data) {
        setPumps(data);
        const lastPump = localStorage.getItem('fuelify_last_pump');
        if (lastPump && data.some(p => p.id === lastPump)) {
          setSelectedPumpId(lastPump);
        } else if (data.length > 0) {
          setSelectedPumpId(data[0].id);
        }
      }
    }
    loadPumps();
  }, [supabase]);

  async function handleCapture(dataURL: string, file: File) {
    setImageDataURL(dataURL);
    capturedFileRef.current = file;
    setStep('ocr');
    setOcrLoading(true);

    try {
      const { extractPlateNumber } = await import('@/lib/ocr');
      const result = await extractPlateNumber(file);
      setPlateNumber(result.plateNumber || '');
      setOcrConfidence(result.confidence);
    } catch {
      setPlateNumber('');
    } finally {
      setOcrLoading(false);
      setStep('confirm');
    }
  }

  async function handleCheck() {
    if (!plateNumber.trim()) return;
    
    if (!isValidPlate(plateNumber)) {
      alert('অবৈধ ফরম্যাট! সঠিক ফরম্যাট: ঢাকা মেট্রো-ল ৫০-০২০৩');
      return;
    }

    if (!selectedPumpId) {
      alert('দয়া করে পাম্প স্টেশন নির্বাচন করুন');
      return;
    }

    localStorage.setItem('fuelify_last_pump', selectedPumpId);
    setChecking(true);

    try {
      const res = await fetch('/api/check-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plateNumber: plateNumber.trim() }),
      });
      const data = await res.json();

      // Store result in sessionStorage to pass to result page
      sessionStorage.setItem(
        'checkResult',
        JSON.stringify({ ...data, vehicleType, fuelType, imageDataURL, pumpStationId: selectedPumpId })
      );
      router.push('/result');
    } catch {
      alert('সংযোগ ত্রুটি। পুনরায় চেষ্টা করুন।');
    } finally {
      setChecking(false);
    }
  }

  function reset() {
    setStep('capture');
    setImageDataURL('');
    setPlateNumber('');
    setOcrConfidence(0);
    setOcrLoading(false);
    capturedFileRef.current = null;
  }

  return (
    <div className="page">
      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        position: 'sticky', top: 0, zIndex: 40
      }}>
        <button
          id="scan-back-btn"
          onClick={() => step === 'capture' ? router.push('/dashboard') : reset()}
          style={{
            width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)',
            border: '1px solid #334155', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#94a3b8'
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
            যানবাহন স্ক্যান
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {step === 'capture' ? 'ধাপ ১: ছবি তুলুন' : step === 'ocr' ? 'ধাপ ২: প্লেট পড়া হচ্ছে...' : 'ধাপ ৩: তথ্য নিশ্চিত করুন'}
          </p>
        </div>
        {/* Step dots */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['capture', 'ocr', 'confirm'] as Step[]).map((s) => (
            <div key={s} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: step === s ? '#f59e0b' : s < step || (step === 'confirm' && s === 'ocr') ? '#4ade80' : '#334155',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>
      </header>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── Step 1: Camera ── */}
        {step === 'capture' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid #334155' }}>
              <CameraCapture onCapture={handleCapture} />
            </div>
            <div className="card" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                💡 নম্বর প্লেট স্পষ্টভাবে ফ্রেমের মধ্যে রাখুন। ভালো আলোয় ছবি তুলুন।
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: OCR Loading ── */}
        {step === 'ocr' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '40px 0' }}>
            {imageDataURL && (
              <img
                src={imageDataURL}
                alt="Captured plate"
                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12 }}
              />
            )}
            <div className="spinner" />
            <p style={{ color: '#94a3b8', fontSize: '1rem' }}>নম্বর পড়া হচ্ছে...</p>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 'confirm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Captured image */}
            {imageDataURL && (
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #334155' }}>
                <img
                  src={imageDataURL}
                  alt="Captured"
                  style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* OCR result + edit */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="label">নম্বর প্লেট</label>
                {ocrConfidence > 0 && (
                  <span className={`badge ${ocrConfidence > 70 ? 'badge-green' : 'badge-amber'}`}>
                    {Math.round(ocrConfidence)}% নির্ভুলতা
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="plate-input"
                  type="text"
                  className="input font-plate"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="যেমন: ঢাকা মেট্রো-ল ৫০-০২০৩"
                  style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em', paddingRight: 44 }}
                />
                <Edit3 size={16} color="#64748b" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              {!plateNumber && (
                <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: 6 }}>
                  ⚠️ OCR সফল হয়নি। নম্বর ম্যানুয়ালি টাইপ করুন।
                </p>
              )}
            </div>

            {/* Vehicle type */}
            <div>
              <label className="label">যানবাহনের ধরন</label>
              <div className="selector-group">
                <button
                  id="vehicle-motorcycle"
                  className={`selector-btn ${vehicleType === 'motorcycle' ? 'selected' : ''}`}
                  onClick={() => setVehicleType('motorcycle')}
                >
                  🏍 মোটরসাইকেল
                </button>
                <button
                  id="vehicle-car"
                  className={`selector-btn ${vehicleType === 'car' ? 'selected' : ''}`}
                  onClick={() => setVehicleType('car')}
                >
                  🚗 গাড়ি
                </button>
                <button
                  id="vehicle-other"
                  className={`selector-btn ${vehicleType === 'other' ? 'selected' : ''}`}
                  onClick={() => setVehicleType('other')}
                >
                  🚛 অন্য
                </button>
              </div>
            </div>

            {/* Fuel type */}
            <div>
              <label className="label">জ্বালানির ধরন</label>
              <div className="selector-group">
                {(['octane', 'petrol', 'diesel'] as const).map((ft) => (
                  <button
                    key={ft}
                    id={`fuel-${ft}`}
                    className={`selector-btn ${fuelType === ft ? 'selected' : ''}`}
                    onClick={() => setFuelType(ft)}
                  >
                    {ft === 'octane' ? 'অকটেন' : ft === 'petrol' ? 'পেট্রোল' : 'ডিজেল'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Pump Station Select */}
            <div>
              <label className="label">পাম্প স্টেশন</label>
              <select
                 className="input"
                 value={selectedPumpId}
                 onChange={e => setSelectedPumpId(e.target.value)}
                 style={{ appearance: 'auto', padding: '12px' }}
              >
                 <option value="" disabled>পাম্প স্টেশন নির্বাচন করুন</option>
                 {pumps.map(pump => (
                    <option key={pump.id} value={pump.id}>{pump.name}</option>
                 ))}
              </select>
            </div>

            {/* Check button */}
            <button
              id="check-btn"
              className="btn btn-primary"
              onClick={handleCheck}
              disabled={checking || !plateNumber.trim() || !selectedPumpId}
              style={{ marginTop: 4 }}
            >
              {checking ? (
                <><Loader2 size={20} className="spin" /> চেক করা হচ্ছে...</>
              ) : (
                <><CheckCircle size={20} /> ডাটাবেইজ চেক করুন</>
              )}
            </button>

            <button className="btn btn-ghost" onClick={reset} style={{ minHeight: 48 }}>
              পুনরায় ছবি তুলুন
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
