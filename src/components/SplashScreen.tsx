import { useState, useEffect } from 'react';
import verticalLogoWhite from '../assets/AITextSense_Vertical_White.png';

interface SplashScreenProps {
  durationMs?: number;
  onFinish?: () => void;
}

export default function SplashScreen({ durationMs = 3000, onFinish }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out slightly before total duration
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, Math.max(0, durationMs - 400));

    // Unmount/hide after full duration
    const unmountTimer = setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [durationMs, onFinish]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#000000] select-none transition-opacity duration-400 ease-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundColor: '#000000',
      }}
    >
      <div className="flex flex-col items-center justify-center p-4 max-w-full text-center">
        {/* Logo reduced to 50% of previous size (690px -> 345px) */}
        <div className="relative flex items-center justify-center">
          <img
            src={verticalLogoWhite}
            alt="AI TextSense"
            className="relative object-contain"
            style={{
              width: '345px',
              maxWidth: '43vw',
              maxHeight: '33vh',
            }}
          />
        </div>

        {/* Progress indicator */}
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <div className="w-28 h-0.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
            <div
              className="h-full bg-gradient-to-r from-accent via-indigo-400 to-accent rounded-full animate-[progress_3s_ease-in-out_forwards]"
              style={{
                animationDuration: `${durationMs}ms`,
              }}
            />
          </div>
          <span className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase">
            Initializing Forensic Engine...
          </span>
          <span className="mt-1 text-[8px] font-mono tracking-wide text-neutral-600">
            © 2026 Wilson Volpe · All rights reserved
          </span>
        </div>
      </div>
    </div>
  );
}
