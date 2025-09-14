import CameraCapture from './components/CameraCapture';

export default function Home() {
  return (
    <main style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Camera Capture</h1>
      <p>Open your phone’s camera, take a photo, and save or upload it for later processing.</p>
      <CameraCapture />
    </main>
  );
}
