'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, RefreshCw, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string, file: File) => void;
  onAutoScan?: (imageData: string, file: File) => Promise<boolean>;
}

export default function CameraCapture({ onCapture, onAutoScan }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    setCameraError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('ক্যামেরা খোলা যাচ্ছে না। গ্যালারি ব্যবহার করুন।');
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera, facingMode]);

  useEffect(() => {
    if (!cameraActive || !onAutoScan) return;

    let isScanning = false;
    const interval = setInterval(async () => {
      if (isScanning) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      const dataURL = canvas.toDataURL('image/jpeg', 0.85);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'auto-scan.jpg', { type: 'image/jpeg' });
        
        isScanning = true;
        try {
          const success = await onAutoScan(dataURL, file);
          if (success) {
            clearInterval(interval);
            streamRef.current?.getTracks().forEach((t) => t.stop());
          }
        } catch {
          // suppress loop errors
        } finally {
          isScanning = false;
        }
      }, 'image/jpeg', 0.85);
    }, 2500); // Poll every 2.5 seconds

    return () => clearInterval(interval);
  }, [cameraActive, onAutoScan]);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    const dataURL = canvas.toDataURL('image/jpeg', 0.92);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], 'plate-capture.jpg', { type: 'image/jpeg' });
        onCapture(dataURL, file);
        streamRef.current?.getTracks().forEach((t) => t.stop());
      },
      'image/jpeg',
      0.92
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataURL = ev.target?.result as string;
      onCapture(dataURL, file);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    reader.readAsDataURL(file);
  }

  function toggleCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Camera viewport */}
      <div
        className="camera-container"
        style={{ height: 260, borderRadius: '16px 16px 0 0', background: '#000' }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }}
        />
        
        {cameraActive && (
          <>
            {/* Overlay guide */}
            <div className="camera-overlay">
              <div style={{ position: 'relative', width: '80%', aspectRatio: '3/1' }}>
                <div className="plate-frame" style={{ width: '100%', height: '100%' }} />
                {onAutoScan && <div className="laser-line" />}
                <div className="corner corner-tl" />
                <div className="corner corner-tr" />
                <div className="corner corner-bl" />
                <div className="corner corner-br" />
              </div>
            </div>
            {/* Guide text */}
            <div style={{
              position: 'absolute', bottom: 12, left: 0, right: 0,
              textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem'
            }}>
              নম্বর প্লেট ফ্রেমের মধ্যে রাখুন
            </div>
            {/* Flip button */}
            <button
              onClick={toggleCamera}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white'
              }}
            >
              <RefreshCw size={16} />
            </button>
          </>
        )}
        
        {!cameraActive && (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: '#64748b', padding: 24
          }}>
            <Camera size={48} strokeWidth={1.5} />
            {cameraError ? (
              <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#f87171' }}>{cameraError}</p>
            ) : (
              <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>ক্যামেরা শুরু হচ্ছে...</p>
            )}
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 0 }}>
        {cameraActive && (
          <button
            id="capture-btn"
            onClick={capture}
            className="btn btn-danger"
            style={{ borderRadius: '0 0 0 16px', flex: 2, fontSize: '1rem' }}
          >
            <Camera size={22} /> ছবি তুলুন
          </button>
        )}
        <button
          id="gallery-btn"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-ghost"
          style={{
            borderRadius: cameraActive ? '0 0 16px 0' : '0 0 16px 16px',
            flex: 1, fontSize: '0.85rem', borderTop: 'none',
            borderLeft: cameraActive ? '1px solid var(--border)' : 'none'
          }}
        >
          <Upload size={18} /> গ্যালারি
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
