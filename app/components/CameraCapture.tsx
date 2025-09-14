'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false); // ✅ toast state

  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : true;
  const supportsGetUserMedia =
    typeof navigator !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  async function startCamera() {
    if (!supportsGetUserMedia) {
      setError('Camera API not supported by this browser.');
      fileInputRef.current?.click();
      return;
    }
    if (!isSecure) {
      setError('Camera requires HTTPS (or localhost). Open this page over HTTPS.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      setFrozenFrame(null); // clear old frame
    } catch (err) {
      console.warn('getUserMedia failed:', err);
      setError('Could not access the camera.');
      fileInputRef.current?.click();
    } finally {
      setBusy(false);
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;

    const track = stream?.getVideoTracks?.[0];
    const settings = track ? track.getSettings() : {};
    const w = (settings.width as number) || videoRef.current.videoWidth || 1280;
    const h = (settings.height as number) || videoRef.current.videoHeight || 720;

    const maxDim = 1920;
    let outW = w,
      outH = h;
    if (Math.max(w, h) > maxDim) {
      const scale = maxDim / Math.max(w, h);
      outW = Math.round(w * scale);
      outH = Math.round(h * scale);
    }

    const canvas = canvasRef.current!;
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, outW, outH);

    canvas.toBlob((b) => {
      if (b) {
        setBlob(b);
        const url = URL.createObjectURL(b);
        setFrozenFrame(url);
        stopCamera();

        // ✅ Show toast
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    }, 'image/jpeg', 0.92);
  }

  async function upload() {
    if (!blob) return;
    const form = new FormData();
    form.append('photo', blob, `capture-${Date.now()}.jpg`);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) {
      alert('Upload failed');
      return;
    }
    const data = await res.json().catch(() => ({}));
    alert('Uploaded ✔' + (data.url ? `\nURL: ${data.url}` : ''));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setBlob(file);
      const url = URL.createObjectURL(file);
      setFrozenFrame(url);

      // ✅ Toast on file capture too
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  }

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        height: '100svh',
        width: '100vw',
        background: 'black',
        overflow: 'hidden',
      }}
    >
      {/* Fullscreen video (hidden if frozen) */}
      {!frozenFrame && (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            background: '#000',
          }}
        />
      )}

      {/* Frozen frame */}
      {frozenFrame && (
        <img
          src={frozenFrame}
          alt="Captured"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />

      {/* Toast overlay */}
      {showToast && (
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 180, 0, 0.85)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          📸 Photo captured!
        </div>
      )}

      {/* Center overlay: Start camera (only if no stream and no frozen frame) */}
      {!stream && !frozenFrame && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.25) 100%)',
            padding: 16,
          }}
        >
          <button
            onClick={startCamera}
            disabled={busy}
            aria-busy={busy}
            style={centerBtnStyle(busy)}
          >
            {busy ? 'Starting…' : 'Start camera'}
          </button>
        </div>
      )}

      {/* Bottom overlay controls */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 16px calc(env(safe-area-inset-bottom, 0) + 16px)',
          display: 'flex',
          gap: 14,
          justifyContent: 'center',
          alignItems: 'center',
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.65) 100%)',
        }}
      >
        <button
          onClick={capture}
          disabled={!stream || busy}
          style={pillBtnStyle(true, !stream || busy)}
        >
          Capture
        </button>

        <button
          onClick={upload}
          disabled={!blob}
          style={pillBtnStyle(false, !blob)}
          title={blob ? 'Upload last photo' : 'Take a photo first'}
        >
          Upload
        </button>
      </div>
    </div>
  );
}

function centerBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '14px 22px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.28)',
    background: 'white',
    color: 'black',
    fontSize: 16,
    fontWeight: 700,
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
  };
}

function pillBtnStyle(primary = false, disabled = false): React.CSSProperties {
  return {
    padding: '14px 22px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.28)',
    background: primary ? 'white' : 'rgba(0,0,0,0.55)',
    color: primary ? 'black' : 'white',
    fontSize: 16,
    fontWeight: 700,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  };
}
