import React, { useState, useEffect, useCallback } from 'react';

const BOOT_LOG_LINES = [
  'VGA BIOS Version 1.10',
  'Copyright (C) 1981, 1982 IBM Corp.',
  '',
  'Processor: 8088 @ 4.77MHz',
  'Bus Type: Legacy ISA',
  '',
  'Verifying DMI Pool Data... Success',
  'Checking IDE Drives... Found Primary Master: CITAS-HDD-V2',
  'Booting from Drive C:...',
  '',
  'INIT_SYSTEM_V2 EXECUTION...',
];

export function BootSequence({ onComplete }) {
  const [ramCount, setRamCount] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [phase, setPhase] = useState('ram'); // 'ram' -> 'log' -> 'done'

  const skip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // RAM Count logic
  useEffect(() => {
    if (phase !== 'ram') return;

    const targetRAM = 640;
    const interval = setInterval(() => {
      setRamCount((prev) => {
        if (prev >= targetRAM) {
          clearInterval(interval);
          setTimeout(() => setPhase('log'), 500);
          return targetRAM;
        }
        return prev + Math.floor(Math.random() * 40) + 10;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [phase]);

  // Text Logging logic
  useEffect(() => {
    if (phase !== 'log') return;

    if (currentLineIndex < BOOT_LOG_LINES.length - 1) {
      const timer = setTimeout(() => {
        setCurrentLineIndex((prev) => prev + 1);
      }, Math.random() * 400 + 100);
      return () => clearTimeout(timer);
    } else {
      // Done logging
      const timer = setTimeout(() => {
        setPhase('done');
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, currentLineIndex, onComplete]);

  // Event listener for skip
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        skip();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [skip]);

  return (
    <div className="bios-container" onClick={skip}>
      <p className="bios-line">
        Main Memory: {ramCount} KB{' '}
        {ramCount >= 640 ? 'OK' : ''}
        {phase === 'ram' && <span className="bios-cursor" />}
      </p>

      {phase !== 'ram' && (
        <>
          {BOOT_LOG_LINES.slice(0, currentLineIndex + 1).map((line, idx) => (
            <p key={idx} className="bios-line">
              {line}
              {idx === currentLineIndex && phase === 'log' && (
                <span className="bios-cursor" />
              )}
            </p>
          ))}
        </>
      )}

      <div className="bios-skip-hint">PRESS SPACE TO SKIP...</div>
    </div>
  );
}
