'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : true;
  const supportsGetUserMedia =
    typeof navigator !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setUploadedImage(dataUrl);
        setFrozenFrame(dataUrl);
        stopCamera();
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      };
      reader.readAsDataURL(file);
    }
  };

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

    const track = stream?.getVideoTracks()?.[0];
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

    // Get base64 data URL instead of blob URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setFrozenFrame(dataUrl);
    stopCamera();

    // ✅ Show toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }

  function handleRetry() {
    setBlob(null);
    setFrozenFrame(null);
    startCamera();
  }

  const router = useRouter();

  function handleNext() {
    if (frozenFrame) {
      try {
        // Store the image data in sessionStorage instead of URL
        sessionStorage.setItem('capturedPhoto', frozenFrame);
        // Navigate to the preview page
        router.push('/preview');
      } catch (error) {
        console.error('Error storing photo in sessionStorage:', error);
        setError('Failed to save the photo. Please try again.');
      }
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setBlob(file);
      
      // Convert File to data URL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFrozenFrame(dataUrl);
        
        // ✅ Toast on file capture too
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      };
      reader.readAsDataURL(file);
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

      {/* Center overlay: Start camera or upload (only if no stream and no frozen frame) */}
      {!stream && !frozenFrame && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
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
            {busy ? 'Starting…' : 'Take a Photo'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={centerBtnStyle(false, true)}
          >
            Upload an Image
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
        {!frozenFrame ? (
          <button
            onClick={capture}
            disabled={!stream || busy}
            style={pillBtnStyle(true, !stream || busy)}
          >
            Capture
          </button>
        ) : (
          <>
            <button
              onClick={handleRetry}
              style={pillBtnStyle(false, false)}
            >
              Retry
            </button>
            <button
              onClick={handleNext}
              disabled={!frozenFrame}
              style={pillBtnStyle(true, !frozenFrame)}
            >
              Next
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function centerBtnStyle(disabled: boolean, secondary = false): React.CSSProperties {
  return {
    padding: '14px 22px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.28)',
    background: secondary ? 'rgba(255,255,255,0.9)' : 'white',
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
