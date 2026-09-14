'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  issueVoucherForTier,
  getActiveVoucher,
  isVoucherExpired,
} from '@/lib/engine/voucherEngine';

// ─────────────────────────────────────────────────────────────
// Synthesized Web Audio Sound FX (Zero Lag, Instant Audio)
// ─────────────────────────────────────────────────────────────
class FunZoneAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {}
  }

  playTone(freq, type, duration, startVol = 0.12) {
    if (this.muted || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  playPop() { this.playTone(560, 'sine', 0.08, 0.18); }
  playCatch() {
    this.playTone(520, 'sine', 0.08, 0.18);
    setTimeout(() => this.playTone(680, 'sine', 0.1, 0.18), 35);
  }
  playSlice() {
    this.playTone(840, 'sine', 0.05, 0.18);
    setTimeout(() => this.playTone(1120, 'triangle', 0.06, 0.2), 20);
  }
  playStack() {
    this.playTone(523.25, 'triangle', 0.08, 0.18);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.2), 45);
  }
  playPerfect() {
    this.playTone(659.25, 'triangle', 0.08, 0.22);
    setTimeout(() => this.playTone(880, 'triangle', 0.08, 0.22), 50);
    setTimeout(() => this.playTone(1174.66, 'triangle', 0.12, 0.25), 100);
  }
  playMiss() { this.playTone(160, 'sawtooth', 0.14, 0.16); }
  playBomb() {
    this.playTone(110, 'sawtooth', 0.22, 0.28);
    setTimeout(() => this.playTone(70, 'sawtooth', 0.28, 0.32), 45);
  }
  playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((note, i) => {
      setTimeout(() => this.playTone(note, 'triangle', 0.2, 0.25), i * 80);
    });
  }
}

// Daily play tracker helper (Voucher reward chances per day)
function getDailyPlays(keyPrefix, maxPlays = 3) {
  if (typeof window === 'undefined') return { used: 0, remaining: maxPlays, canWinVoucher: true };
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `${keyPrefix}_${today}`;
    const used = parseInt(localStorage.getItem(key) || '0', 10);
    return {
      used,
      remaining: Math.max(0, maxPlays - used),
      canWinVoucher: used < maxPlays,
      key,
    };
  } catch {
    return { used: 0, remaining: maxPlays, canWinVoucher: true };
  }
}

function recordDailyPlay(keyPrefix) {
  if (typeof window === 'undefined') return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `${keyPrefix}_${today}`;
    const used = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, (used + 1).toString());
  } catch {}
}

function getGameHighScore(gameKey) {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(`mm_${gameKey}_highscore`) || '0', 10);
  } catch {
    return 0;
  }
}

function saveGameHighScore(gameKey, score) {
  if (typeof window === 'undefined') return { isNew: false, highScore: score };
  try {
    const prev = parseInt(localStorage.getItem(`mm_${gameKey}_highscore`) || '0', 10);
    if (score > prev) {
      localStorage.setItem(`mm_${gameKey}_highscore`, score.toString());
      return { isNew: true, highScore: score };
    }
    return { isNew: false, highScore: prev };
  } catch {
    return { isNew: false, highScore: score };
  }
}

// ─────────────────────────────────────────────────────────────
// GAME 1: PETAL RUSH (Catching Arcade - Fast Pacing & Tricky Hazards)
// ─────────────────────────────────────────────────────────────
const RUSH_ITEMS = [
  { id: 'tulip', emoji: '🌷', points: 5, speed: 3.5, size: 30, weight: 26, isHarmful: false },
  { id: 'sunflower', emoji: '🌻', points: 10, speed: 4.0, size: 34, weight: 22, isHarmful: false },
  { id: 'bouquet', emoji: '💐', points: 20, speed: 4.6, size: 32, weight: 12, isHarmful: false },
  { id: 'star', emoji: '⭐', points: 30, speed: 5.4, size: 30, weight: 8, isHarmful: false, isSpecial: true },
  { id: 'thorn', emoji: '🥀', points: -15, speed: 3.8, size: 28, weight: 14, isHarmful: true },
  { id: 'bomb', emoji: '💣', points: -40, speed: 4.5, size: 32, weight: 14, isHarmful: true, isBomb: true },
  { id: 'bee', emoji: '🐝', points: -25, speed: 4.2, size: 28, weight: 14, isHarmful: true, isZigzag: true },
  { id: 'rock', emoji: '🪨', points: -25, speed: 5.2, size: 28, weight: 12, isHarmful: true },
];

function PetalRushGame({ audio, onWinVoucher, onBackToMenu, onClose }) {
  const [gameState, setGameState] = useState('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [resultData, setResultData] = useState(null);
  const [playsLeft, setPlaysLeft] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isHitFlashing, setIsHitFlashing] = useState(false);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const isPlayingRef = useRef(false);
  const itemsRef = useRef([]);
  const floatersRef = useRef([]);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(20);
  const targetBasketXRef = useRef(180);
  const currentBasketXRef = useRef(180);
  const hadVoucherChanceRef = useRef(true);

  useEffect(() => {
    const info = getDailyPlays('mm_rush_plays', 3);
    setPlaysLeft(info.remaining);
    setHighScore(getGameHighScore('rush'));
  }, []);

  const updateBasketPosition = useCallback((clientX) => {
    if (!canvasRef.current || !isPlayingRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = ((clientX - rect.left) / rect.width) * 360;
    targetBasketXRef.current = Math.max(30, Math.min(330, relativeX));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlayingRef.current) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') targetBasketXRef.current = Math.max(30, targetBasketXRef.current - 38);
      else if (e.key === 'ArrowRight' || e.key === 'd') targetBasketXRef.current = Math.min(330, targetBasketXRef.current + 38);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addFloatingText = (text, x, y, color = '#EA580C') => {
    floatersRef.current.push({
      id: Math.random(),
      text,
      x,
      y,
      color,
      alpha: 1,
    });
  };

  const triggerHazardFeedback = () => {
    setIsShaking(true);
    setIsHitFlashing(true);
    setTimeout(() => setIsShaking(false), 320);
    setTimeout(() => setIsHitFlashing(false), 320);
  };

  const spawnItem = (now) => {
    const totalWeight = RUSH_ITEMS.reduce((acc, item) => acc + item.weight, 0);
    let random = Math.random() * totalWeight;
    let selected = RUSH_ITEMS[0];
    for (const item of RUSH_ITEMS) {
      if (random < item.weight) { selected = item; break; }
      random -= item.weight;
    }

    // Dynamic speed ramp as game progresses (starts brisk at 1.0x, scales up to 1.6x)
    const timeProgress = (20 - timeLeftRef.current) / 20;
    const speedBoost = 1.0 + timeProgress * 0.60;

    return {
      id: `${now}_${Math.random().toString(36).substr(2, 5)}`,
      type: selected,
      x: 35 + Math.random() * 290,
      y: -20,
      speed: (selected.speed * 1.05) * (0.95 + Math.random() * 0.3) * speedBoost,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: selected.isZigzag ? 0.16 : 0.06,
      wobbleAmp: selected.isZigzag ? 16 : 7,
    };
  };

  const startRush = () => {
    if (audio) audio.init();

    // Clean any previous running game
    isPlayingRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const canWin = playsLeft > 0;
    hadVoucherChanceRef.current = canWin;
    if (canWin) {
      recordDailyPlay('mm_rush_plays');
      setPlaysLeft((prev) => Math.max(0, prev - 1));
    }

    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(20);
    timeLeftRef.current = 20;
    itemsRef.current = [];
    floatersRef.current = [];
    setResultData(null);
    currentBasketXRef.current = 180;
    targetBasketXRef.current = 180;
    isPlayingRef.current = true;
    setGameState('playing');
    lastSpawnRef.current = performance.now();

    timerIntervalRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(timerIntervalRef.current);
        finishRush();
      }
    }, 1000);

    let lastFrame = performance.now();
    const loop = (ts) => {
      if (!isPlayingRef.current || timeLeftRef.current <= 0) return;

      const delta = Math.min((ts - lastFrame) / 16.66, 2.0);
      lastFrame = ts;

      const canvas = canvasRef.current;
      if (!canvas) {
        if (isPlayingRef.current && timeLeftRef.current > 0) {
          animFrameRef.current = requestAnimationFrame(loop);
        }
        return;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Snappy responsive LERP
      currentBasketXRef.current += (targetBasketXRef.current - currentBasketXRef.current) * 0.42 * delta;
      const basketPos = currentBasketXRef.current;

      // Dynamic spawn rate: starts at 420ms, accelerates down to 190ms in final seconds
      const currentSpawnDelay = Math.max(190, 420 - (20 - timeLeftRef.current) * 14);
      if (ts - lastSpawnRef.current > currentSpawnDelay) {
        itemsRef.current.push(spawnItem(ts));
        lastSpawnRef.current = ts;
      }

      const currentItems = itemsRef.current;
      const remaining = [];

      for (let i = 0; i < currentItems.length; i++) {
        const item = currentItems[i];
        item.y += item.speed * delta * 1.1;
        item.wobble += item.wobbleSpeed * delta;
        const currentX = item.x + Math.sin(item.wobble) * item.wobbleAmp;

        // Catch Hitbox (Basket is at y=320..355)
        if (item.y >= 305 && item.y <= 345) {
          if (Math.abs(currentX - basketPos) <= 38) {
            if (item.type.isHarmful) {
              scoreRef.current = Math.max(0, scoreRef.current + item.type.points);
              setScore(scoreRef.current);
              addFloatingText(`${item.type.points}`, basketPos, 290, '#DC2626');
              triggerHazardFeedback();
              if (item.type.isBomb) {
                if (audio) audio.playBomb();
              } else {
                if (audio) audio.playMiss();
              }
            } else {
              const gained = item.type.points;
              scoreRef.current += gained;
              setScore(scoreRef.current);
              addFloatingText(`+${gained}`, basketPos, 290, item.type.isSpecial ? '#D97706' : '#16A34A');
              if (audio) audio.playCatch();
            }
            continue;
          }
        }

        // Draw falling item
        ctx.save();
        ctx.translate(currentX, item.y);
        ctx.rotate(Math.sin(item.wobble) * 0.25);
        if (item.type.isBomb) {
          ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
          ctx.shadowBlur = 10;
        } else if (item.type.isSpecial) {
          ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
          ctx.shadowBlur = 12;
        }
        ctx.font = `${item.type.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.type.emoji, 0, 0);
        ctx.restore();

        if (item.y < canvas.height + 30) remaining.push(item);
      }

      itemsRef.current = remaining;

      // Draw Basket
      ctx.save();
      ctx.translate(basketPos, 340);
      ctx.font = '38px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧺', 0, 0);

      // Basket badge
      ctx.fillStyle = '#FED7AA';
      ctx.beginPath();
      ctx.roundRect(-20, 16, 40, 14, 4);
      ctx.fill();
      ctx.fillStyle = '#9A3412';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('M&M', 0, 24);
      ctx.restore();

      // Render floating scores
      const nextFloaters = [];
      for (const f of floatersRef.current) {
        f.y -= 1.3 * delta;
        f.alpha -= 0.035 * delta;
        if (f.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, f.alpha);
          ctx.fillStyle = f.color;
          ctx.font = '900 17px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f.text, f.x, f.y);
          ctx.restore();
          nextFloaters.push(f);
        }
      }
      floatersRef.current = nextFloaters;

      if (isPlayingRef.current && timeLeftRef.current > 0) {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const finishRush = () => {
    isPlayingRef.current = false;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const finalScore = scoreRef.current;
    const hsResult = saveGameHighScore('rush', finalScore);
    setHighScore(hsResult.highScore);

    let tierKey = null;
    if (finalScore >= 300) tierKey = 'DIAMOND';     // ₱50 OFF (Min. spend ₱1200)
    else if (finalScore >= 200) tierKey = 'GOLD';   // ₱20 OFF (Min. spend ₱600)
    else if (finalScore >= 100) tierKey = 'SILVER'; // ₱10 OFF (Min. spend ₱350)

    if (hadVoucherChanceRef.current && tierKey) {
      const res = issueVoucherForTier(tierKey);
      setResultData({
        won: true,
        voucher: res.voucher,
        score: finalScore,
        isNewHighScore: hsResult.isNew,
        highScore: hsResult.highScore,
      });
      if (audio) audio.playWin();
      if (onWinVoucher) onWinVoucher(res.voucher);
    } else {
      setResultData({
        won: false,
        isFreePlay: !hadVoucherChanceRef.current,
        score: finalScore,
        tierKey,
        isNewHighScore: hsResult.isNew,
        highScore: hsResult.highScore,
      });
      if (audio) {
        if (finalScore >= 50) audio.playWin();
        else audio.playMiss();
      }
    }
    setGameState('result');
  };

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {gameState === 'playing' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#C2410C' }}>Score:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#EA580C' }}>{score}</span>
          </div>
          <div style={{ background: timeLeft <= 5 ? '#FEE2E2' : '#FFF', color: timeLeft <= 5 ? '#DC2626' : '#1E1E24', padding: '3px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', border: '1px solid rgba(0,0,0,0.08)' }}>
            {timeLeft}s
          </div>
        </div>
      )}

      <div
        className={`${isShaking ? 'arcade-shake' : ''} ${isHitFlashing ? 'arcade-hit-flash' : ''}`}
        style={{
          position: 'relative',
          height: '380px',
          background: '#FFFFFF',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          cursor: gameState === 'playing' ? 'ew-resize' : 'default',
        }}
      >
        {gameState === 'ready' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '18px 20px',
              gap: '14px',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1E1E24' }}>
                Petal Rush
              </h4>
              {highScore > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EA580C', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '3px 10px', borderRadius: '999px' }}>
                  Best: {highScore} pts
                </span>
              )}
            </div>

            {/* Rules Box */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Controls */}
              <div style={{ fontSize: '0.82rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Controls:</span> Drag basket left & right
              </div>

              {/* Targets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#16A34A' }}>Collect (+pts)</span>
                  <span style={{ fontSize: '1.15rem', letterSpacing: '4px' }}>🌷 🌻 💐 ⭐</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>Avoid (-pts)</span>
                  <span style={{ fontSize: '1.15rem', letterSpacing: '4px' }}>💣 🥀 🐝 🪨</span>
                </div>
              </div>

              {/* Reward */}
              <div style={{ fontSize: '0.78rem', color: '#64748B', paddingTop: '8px', borderTop: '1px solid #E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Score <strong style={{ color: '#0F172A' }}>100+ pts</strong> to win discount vouchers.
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startRush}
              className="arcade-start-btn"
              style={{
                width: '100%',
                background: '#EA580C',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                textAlign: 'center',
              }}
            >
              Start Game
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={360}
          height={380}
          onPointerDown={(e) => updateBasketPosition(e.clientX)}
          onPointerMove={(e) => updateBasketPosition(e.clientX)}
          onTouchStart={(e) => {
            if (e.touches && e.touches[0]) updateBasketPosition(e.touches[0].clientX);
          }}
          onTouchMove={(e) => {
            if (e.touches && e.touches[0]) updateBasketPosition(e.touches[0].clientX);
          }}
          style={{
            width: '100%',
            height: '100%',
            display: gameState === 'playing' ? 'block' : 'none',
            touchAction: 'none',
          }}
        />

        {gameState === 'result' && resultData && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: '14px', background: 'rgba(255,253,249,0.98)' }}>
            {resultData.won ? (
              <>
                <div style={{ background: '#FFF7ED', border: '1.5px solid #F97316', borderRadius: '16px', padding: '14px 20px', width: '100%', maxWidth: '280px', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.12)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voucher Unlocked</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#EA580C', display: 'block', margin: '4px 0 2px' }}>₱{resultData.voucher.discount} OFF</span>
                  <div style={{ fontSize: '0.78rem', color: '#1E1E24', fontWeight: 700, fontFamily: 'monospace', background: '#FED7AA', padding: '3px 10px', borderRadius: '6px', display: 'inline-block', marginTop: '4px' }}>
                    {resultData.voucher.code}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#78716C', display: 'block', marginTop: '6px', fontWeight: 500 }}>Min. spend ₱{resultData.voucher.minSpend}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button onClick={startRush} style={{ background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: '999px', padding: '10px 20px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                    Play Again
                  </button>
                  <button onClick={onClose} style={{ background: '#EA580C', color: '#FFF', border: 'none', borderRadius: '999px', padding: '10px 22px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}>
                    Shop Now
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Final Score</span>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1E1E24', lineHeight: 1 }}>{resultData.score} pts</span>
                  {resultData.isNewHighScore ? (
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#EA580C', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '2px 10px', borderRadius: '999px', marginTop: '4px' }}>
                      New High Score!
                    </span>
                  ) : resultData.highScore > 0 ? (
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>
                      Best: {resultData.highScore} pts
                    </span>
                  ) : null}
                  {resultData.score < 100 && (
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>
                      So close! Just {100 - resultData.score} more pts for a voucher!
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button onClick={startRush} className="arcade-start-btn" style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)', color: '#FFF', border: 'none', borderRadius: '999px', padding: '10px 24px', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.28)' }}>
                    Play Again
                  </button>
                  <button onClick={onBackToMenu} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: '999px', padding: '10px 20px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                    Menu
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GAME 2: RIBBON NINJA (Slash & Slice Action - Multi-Target Volleys & Bombs)
// ─────────────────────────────────────────────────────────────
const NINJA_TARGETS = [
  { id: 'ribbon', emoji: '🎀', points: 8, radius: 24, isHarmful: false },
  { id: 'flower', emoji: '🌸', points: 14, radius: 26, isHarmful: false },
  { id: 'bouquet', emoji: '💐', points: 22, radius: 28, isHarmful: false },
  { id: 'crown', emoji: '👑', points: 40, radius: 30, isHarmful: false, isSpecial: true },
  { id: 'thorn', emoji: '🥀', points: -20, radius: 24, isHarmful: true },
  { id: 'bomb', emoji: '💣', points: -45, radius: 27, isHarmful: true, isBomb: true },
  { id: 'wasp', emoji: '🐝', points: -25, radius: 24, isHarmful: true },
  { id: 'spider', emoji: '🕷️', points: -25, radius: 24, isHarmful: true },
];

function RibbonNinjaGame({ audio, onWinVoucher, onBackToMenu, onClose }) {
  const [gameState, setGameState] = useState('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [playsLeft, setPlaysLeft] = useState(3);
  const [resultData, setResultData] = useState(null);
  const [highScore, setHighScore] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isHitFlashing, setIsHitFlashing] = useState(false);

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const isPlayingRef = useRef(false);
  const timeoutIdsRef = useRef([]);
  const targetsRef = useRef([]);
  const slashTrailRef = useRef([]);
  const particlesRef = useRef([]);
  const isDraggingRef = useRef(false);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(20);
  const hadVoucherChanceRef = useRef(true);

  useEffect(() => {
    const info = getDailyPlays('mm_ninja_plays', 3);
    setPlaysLeft(info.remaining);
    setHighScore(getGameHighScore('ninja'));
  }, []);

  const triggerHazardFeedback = () => {
    setIsShaking(true);
    setIsHitFlashing(true);
    setTimeout(() => setIsShaking(false), 320);
    setTimeout(() => setIsHitFlashing(false), 320);
  };

  const createSliceParticles = (x, y, isHarmful, isBomb) => {
    const colors = isBomb
      ? ['#EF4444', '#DC2626', '#991B1B', '#F59E0B']
      : isHarmful
      ? ['#DC2626', '#991B1B', '#78716C']
      : ['#FB7185', '#F43F5E', '#FDA4AF', '#FCD34D'];

    const count = isBomb ? 18 : 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = isBomb ? 3.5 + Math.random() * 4.5 : 2.0 + Math.random() * 3.0;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: isBomb ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
        alpha: 1,
        decay: isBomb ? 0.035 : 0.05,
      });
    }
  };

  const spawnTarget = () => {
    if (!isPlayingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 42% chance of spawning hazards / bombs in the mix
    const isHarmful = Math.random() < 0.42;
    const pool = NINJA_TARGETS.filter((t) => t.isHarmful === isHarmful);
    const item = pool[Math.floor(Math.random() * pool.length)];

    const x = 35 + Math.random() * (canvas.width - 70);
    const vx = (Math.random() - 0.5) * 4.6;
    // Faster dynamic toss speed (scales to 1.45x)
    const timeFactor = 1.0 + ((20 - timeLeftRef.current) / 20) * 0.45;
    const vy = -(9.6 + Math.random() * 3.4) * timeFactor;

    targetsRef.current.push({
      id: Math.random().toString(),
      type: item,
      x,
      y: canvas.height + 15,
      vx,
      vy,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.18,
      sliced: false,
      sliceAlpha: 1,
    });
  };

  const startNinja = () => {
    if (audio) audio.init();

    // Cleanup previous runs
    isPlayingRef.current = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];

    const canWin = playsLeft > 0;
    hadVoucherChanceRef.current = canWin;
    if (canWin) {
      recordDailyPlay('mm_ninja_plays');
      setPlaysLeft((prev) => Math.max(0, prev - 1));
    }

    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(20);
    timeLeftRef.current = 20;
    targetsRef.current = [];
    slashTrailRef.current = [];
    particlesRef.current = [];
    setResultData(null);
    isPlayingRef.current = true;
    setGameState('playing');
    lastSpawnRef.current = performance.now();

    timerIntervalRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(timerIntervalRef.current);
        finishNinja();
      }
    }, 1000);

    let lastTime = performance.now();
    const loop = (ts) => {
      if (!isPlayingRef.current || timeLeftRef.current <= 0) return;

      const dt = Math.min((ts - lastTime) / 16.66, 1.8);
      lastTime = ts;

      const canvas = canvasRef.current;
      if (!canvas) {
        if (isPlayingRef.current && timeLeftRef.current > 0) {
          animRef.current = requestAnimationFrame(loop);
        }
        return;
      }
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dynamic multi-item volley spawn (starts at 460ms down to 240ms)
      const spawnDelay = Math.max(240, 460 - (20 - timeLeftRef.current) * 13);
      if (ts - lastSpawnRef.current > spawnDelay) {
        spawnTarget();
        // 55% chance of rapid second throw
        if (Math.random() < 0.55) {
          const tId = setTimeout(() => {
            if (isPlayingRef.current) spawnTarget();
          }, 130);
          timeoutIdsRef.current.push(tId);
        }
        // 35% chance of third volley in late game
        if (timeLeftRef.current <= 12 && Math.random() < 0.40) {
          const tId = setTimeout(() => {
            if (isPlayingRef.current) spawnTarget();
          }, 220);
          timeoutIdsRef.current.push(tId);
        }
        lastSpawnRef.current = ts;
      }

      // Update & render targets
      const remaining = [];
      for (const t of targetsRef.current) {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        t.vy += 0.35 * dt; // slightly stronger gravity for crisper arc
        t.rotation += t.vRot * dt;

        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rotation);

        if (t.sliced) {
          t.sliceAlpha -= 0.08 * dt;
          ctx.globalAlpha = Math.max(0, t.sliceAlpha);
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(t.type.isBomb ? '💥' : '✨', 0, 0);
        } else {
          // Add menacing glow for bombs
          if (t.type.isBomb) {
            ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
            ctx.shadowBlur = 10;
          } else if (t.type.isSpecial) {
            ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
            ctx.shadowBlur = 12;
          }
          ctx.font = `${t.type.radius * 1.2}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(t.type.emoji, 0, 0);
        }
        ctx.restore();

        if (t.y < canvas.height + 40 && (!t.sliced || t.sliceAlpha > 0)) {
          remaining.push(t);
        }
      }
      targetsRef.current = remaining;

      // Update & render slice particles
      const nextParticles = [];
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;
        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          nextParticles.push(p);
        }
      }
      particlesRef.current = nextParticles;

      // Render blade trail
      const trail = slashTrailRef.current;
      if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length - 1; i++) {
          const xc = (trail[i].x + trail[i + 1].x) / 2;
          const yc = (trail[i].y + trail[i + 1].y) / 2;
          ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
        }
        ctx.lineTo(trail[trail.length - 1].x, trail[trail.length - 1].y);
        ctx.strokeStyle = '#F43F5E';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
        ctx.shadowBlur = 8;
        ctx.stroke();
      }

      slashTrailRef.current = trail
        .map((p) => ({ ...p, age: p.age + 1 }))
        .filter((p) => p.age < 7);

      if (isPlayingRef.current && timeLeftRef.current > 0) {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
  };

  const handlePointerSlash = (x, y) => {
    if (!isPlayingRef.current) return;
    slashTrailRef.current.push({ x, y, age: 0 });

    for (const t of targetsRef.current) {
      if (t.sliced) continue;
      const dist = Math.hypot(t.x - x, t.y - y);
      if (dist <= t.type.radius + 14) {
        t.sliced = true;
        createSliceParticles(t.x, t.y, t.type.isHarmful, t.type.isBomb);

        if (t.type.isHarmful) {
          scoreRef.current = Math.max(0, scoreRef.current + t.type.points);
          setScore(scoreRef.current);
          triggerHazardFeedback();
          if (t.type.isBomb) {
            if (audio) audio.playBomb();
          } else {
            if (audio) audio.playMiss();
          }
        } else {
          const gained = t.type.points;
          scoreRef.current += gained;
          setScore(scoreRef.current);
          if (audio) audio.playSlice();
        }
      }
    }
  };

  const finishNinja = () => {
    isPlayingRef.current = false;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];

    const finalScore = scoreRef.current;
    const hsResult = saveGameHighScore('ninja', finalScore);
    setHighScore(hsResult.highScore);

    let tierKey = null;
    if (finalScore >= 300) tierKey = 'DIAMOND';     // ₱50 OFF (Min. spend ₱1200)
    else if (finalScore >= 200) tierKey = 'GOLD';   // ₱20 OFF (Min. spend ₱600)
    else if (finalScore >= 100) tierKey = 'SILVER'; // ₱10 OFF (Min. spend ₱350)

    if (hadVoucherChanceRef.current && tierKey) {
      const res = issueVoucherForTier(tierKey);
      setResultData({
        won: true,
        voucher: res.voucher,
        score: finalScore,
        isNewHighScore: hsResult.isNew,
        highScore: hsResult.highScore,
      });
      if (audio) audio.playWin();
      if (onWinVoucher) onWinVoucher(res.voucher);
    } else {
      setResultData({
        won: false,
        isFreePlay: !hadVoucherChanceRef.current,
        score: finalScore,
        tierKey,
        isNewHighScore: hsResult.isNew,
        highScore: hsResult.highScore,
      });
      if (audio) {
        if (finalScore >= 50) audio.playWin();
        else audio.playMiss();
      }
    }
    setGameState('result');
  };

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timeoutIdsRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {gameState === 'playing' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#FFF1F2', borderBottom: '1px solid #FECDD3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#BE123C' }}>Score:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#E11D48' }}>{score}</span>
          </div>
          <div style={{ background: timeLeft <= 5 ? '#FEE2E2' : '#FFF', color: timeLeft <= 5 ? '#DC2626' : '#1E1E24', padding: '3px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', border: '1px solid rgba(0,0,0,0.08)' }}>
            {timeLeft}s
          </div>
        </div>
      )}

      <div
        className={`${isShaking ? 'arcade-shake' : ''} ${isHitFlashing ? 'arcade-hit-flash' : ''}`}
        style={{ position: 'relative', height: '380px', background: '#FFFFFF', overflow: 'hidden' }}
      >
        {gameState === 'ready' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '18px 20px',
              gap: '14px',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1E1E24' }}>
                Ribbon Ninja
              </h4>
              {highScore > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E11D48', background: '#FFF1F2', border: '1px solid #FECDD3', padding: '3px 10px', borderRadius: '999px' }}>
                  Best: {highScore} pts
                </span>
              )}
            </div>

            {/* Rules Box */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Controls */}
              <div style={{ fontSize: '0.82rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Controls:</span> Swipe ribbons to slice
              </div>

              {/* Targets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#16A34A' }}>Slice (+pts)</span>
                  <span style={{ fontSize: '1.15rem', letterSpacing: '4px' }}>🎀 🌸 💐 👑</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>Avoid (-pts)</span>
                  <span style={{ fontSize: '1.15rem', letterSpacing: '4px' }}>💣 🥀 🐝 🕷️</span>
                </div>
              </div>

              {/* Reward */}
              <div style={{ fontSize: '0.78rem', color: '#64748B', paddingTop: '8px', borderTop: '1px solid #E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Score <strong style={{ color: '#0F172A' }}>100+ pts</strong> to win discount vouchers.
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startNinja}
              className="arcade-start-btn"
              style={{
                width: '100%',
                background: '#E11D48',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
                textAlign: 'center',
              }}
            >
              Start Game
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={360}
          height={380}
          onPointerDown={(e) => {
            isDraggingRef.current = true;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 360;
            const y = ((e.clientY - rect.top) / rect.height) * 380;
            handlePointerSlash(x, y);
          }}
          onPointerUp={() => (isDraggingRef.current = false)}
          onPointerMove={(e) => {
            if (isDraggingRef.current) {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 360;
              const y = ((e.clientY - rect.top) / rect.height) * 380;
              handlePointerSlash(x, y);
            }
          }}
          style={{ width: '100%', height: '100%', display: gameState === 'playing' ? 'block' : 'none', cursor: 'crosshair', touchAction: 'none' }}
        />

        {gameState === 'result' && resultData && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: '14px', background: 'rgba(255,253,249,0.98)' }}>
            {resultData.won ? (
              <>
                <div style={{ background: '#FFF1F2', border: '1.5px solid #F43F5E', borderRadius: '16px', padding: '14px 20px', width: '100%', maxWidth: '280px', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.12)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#BE123C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voucher Unlocked</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#E11D48', display: 'block', margin: '4px 0 2px' }}>₱{resultData.voucher.discount} OFF</span>
                  <div style={{ fontSize: '0.78rem', color: '#1E1E24', fontWeight: 700, fontFamily: 'monospace', background: '#FECDD3', padding: '3px 10px', borderRadius: '6px', display: 'inline-block', marginTop: '4px' }}>
                    {resultData.voucher.code}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#78716C', display: 'block', marginTop: '6px', fontWeight: 500 }}>Min. spend ₱{resultData.voucher.minSpend}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button onClick={startNinja} style={{ background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: '999px', padding: '10px 20px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                    Play Again
                  </button>
                  <button onClick={onClose} style={{ background: '#E11D48', color: '#FFF', border: 'none', borderRadius: '999px', padding: '10px 22px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}>
                    Shop Now
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Final Score</span>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1E1E24', lineHeight: 1 }}>{resultData.score} pts</span>
                  {resultData.isNewHighScore ? (
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#E11D48', background: '#FFF1F2', border: '1px solid #FECDD3', padding: '2px 10px', borderRadius: '999px', marginTop: '4px' }}>
                      New High Score!
                    </span>
                  ) : resultData.highScore > 0 ? (
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>
                      Best: {resultData.highScore} pts
                    </span>
                  ) : null}
                  {resultData.score < 100 && (
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>
                      So close! Just {100 - resultData.score} more pts for a voucher!
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button onClick={startNinja} className="arcade-start-btn" style={{ background: 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)', color: '#FFF', border: 'none', borderRadius: '999px', padding: '10px 24px', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.28)' }}>
                    Play Again
                  </button>
                  <button onClick={onBackToMenu} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: '999px', padding: '10px 20px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                    Menu
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GAME 3: BLOOM STACKER (Tower Stacking Rhythm)
// ─────────────────────────────────────────────────────────────
function BloomStackerGame({ audio, onWinVoucher, onBackToMenu, onClose }) {
  const [gameState, setGameState] = useState('ready');
  const [score, setScore] = useState(0);
  const [towerHeight, setTowerHeight] = useState(0);
  const [playsLeft, setPlaysLeft] = useState(3);
  const [resultData, setResultData] = useState(null);
  const [highScore, setHighScore] = useState(0);
  const [stack, setStack] = useState([{ x: 95, width: 130, color: '#A855F7' }]);
  const [movingBlock, setMovingBlock] = useState({ width: 130, color: '#C084FC' });
  const [combo, setCombo] = useState(0);

  const stackRef = useRef([{ x: 95, width: 130, color: '#A855F7' }]);
  const movingBlockRef = useRef({ x: 95, width: 130, speed: 0.0032, color: '#C084FC' });
  const movingBlockDomRef = useRef(null);
  const animRef = useRef(null);
  const isPlayingRef = useRef(false);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const hadVoucherChanceRef = useRef(true);

  useEffect(() => {
    const info = getDailyPlays('mm_stack_plays', 3);
    setPlaysLeft(info.remaining);
    setHighScore(getGameHighScore('stacker'));
  }, []);

  const startStacker = () => {
    if (audio) audio.init();

    // Clean previous run
    isPlayingRef.current = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const canWin = playsLeft > 0;
    hadVoucherChanceRef.current = canWin;
    if (canWin) {
      recordDailyPlay('mm_stack_plays');
      setPlaysLeft((prev) => Math.max(0, prev - 1));
    }

    setScore(0);
    scoreRef.current = 0;
    setCombo(0);
    comboRef.current = 0;
    setTowerHeight(1);
    setResultData(null);

    // Initial base block starts slightly narrower for more challenge (108px vs 130px)
    const initialStack = [{ x: 106, width: 108, color: '#A855F7' }];
    stackRef.current = initialStack;
    setStack(initialStack);

    // Faster initial moving block speed (0.0035)
    const initialMoving = { x: 106, width: 108, speed: 0.0035, color: '#C084FC' };
    movingBlockRef.current = initialMoving;
    setMovingBlock({ width: initialMoving.width, color: initialMoving.color });
    isPlayingRef.current = true;
    setGameState('playing');

    const startTime = performance.now();
    const loop = (now) => {
      if (!isPlayingRef.current) return;

      const mb = movingBlockRef.current;
      const elapsed = now - startTime;
      const minX = 10;
      const maxX = 330 - mb.width;
      const progress = (Math.sin(elapsed * mb.speed) + 1) / 2;
      mb.x = minX + progress * (maxX - minX);

      if (movingBlockDomRef.current) {
        movingBlockDomRef.current.style.transform = `translate3d(${mb.x}px, 0, 0)`;
      }

      if (isPlayingRef.current) {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
  };

  const handleDrop = () => {
    if (!isPlayingRef.current || gameState !== 'playing') return;
    const mb = movingBlockRef.current;
    const topBlock = stackRef.current[stackRef.current.length - 1];

    const overhangLeft = topBlock.x - mb.x;
    const overhangRight = (mb.x + mb.width) - (topBlock.x + topBlock.width);

    let newWidth = mb.width;
    let newX = mb.x;

    // Tighter perfect drop tolerance (3.5px instead of 5px)
    if (Math.abs(overhangLeft) <= 3.5 && Math.abs(overhangRight) <= 3.5) {
      newX = topBlock.x;
      newWidth = topBlock.width;
      comboRef.current += 1;
      setCombo(comboRef.current);
      const perfectBonus = 15 + Math.min(25, comboRef.current * 6);
      scoreRef.current += perfectBonus;
      if (audio) audio.playPerfect();
    } else if (mb.x + mb.width > topBlock.x && mb.x < topBlock.x + topBlock.width) {
      comboRef.current = 0;
      setCombo(0);
      if (mb.x < topBlock.x) {
        newWidth = mb.width - (topBlock.x - mb.x);
        newX = topBlock.x;
      } else {
        newWidth = (topBlock.x + topBlock.width) - mb.x;
        newX = mb.x;
      }
      scoreRef.current += 10;
      if (audio) audio.playStack();
    } else {
      finishStacker();
      return;
    }

    setScore(scoreRef.current);

    const colors = ['#C084FC', '#F472B6', '#FB923C', '#34D399', '#60A5FA', '#FBBF24'];
    const nextColor = colors[stackRef.current.length % colors.length];

    stackRef.current.push({ x: newX, width: newWidth, color: mb.color });
    setStack([...stackRef.current]);
    setTowerHeight(stackRef.current.length);

    if (stackRef.current.length >= 15 || newWidth < 18) {
      finishStacker();
      return;
    }

    // Faster speed acceleration per floor (ramps to 0.0076)
    const nextSpeed = Math.min(0.0076, 0.0035 + stackRef.current.length * 0.00038);
    movingBlockRef.current = {
      x: newX,
      width: newWidth,
      speed: nextSpeed,
      color: nextColor,
    };
    setMovingBlock({ width: newWidth, color: nextColor });
  };

  const finishStacker = () => {
    isPlayingRef.current = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const finalScore = scoreRef.current;
    const hsResult = saveGameHighScore('stacker', finalScore);
    setHighScore(hsResult.highScore);

    let tierKey = null;
    if (finalScore >= 300) tierKey = 'DIAMOND';     // ₱50 OFF (Min. spend ₱1200)
    else if (finalScore >= 200) tierKey = 'GOLD';   // ₱20 OFF (Min. spend ₱600)
    else if (finalScore >= 100) tierKey = 'SILVER'; // ₱10 OFF (Min. spend ₱350)

    if (hadVoucherChanceRef.current && tierKey) {
      const res = issueVoucherForTier(tierKey);
      setResultData({
        won: true,
        voucher: res.voucher,
        score: finalScore,
        height: stackRef.current.length,
        isNewHighScore: hsResult.isNew,
        highScore: hsResult.highScore,
      });
      if (audio) audio.playWin();
      if (onWinVoucher) onWinVoucher(res.voucher);
    } else {
      setResultData({
        won: false,
        isFreePlay: !hadVoucherChanceRef.current,
        score: finalScore,
        height: stackRef.current.length,
        tierKey,
        isNewHighScore: hsResult.isNew,
        highScore: hsResult.highScore,
      });
      if (audio) {
        if (finalScore >= 60) audio.playWin();
        else audio.playMiss();
      }
    }
    setGameState('result');
  };

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {gameState === 'playing' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#FAF5FF', borderBottom: '1px solid #E9D5FF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#7E22CE' }}>Score:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#9333EA' }}>{score}</span>
            {combo > 1 && (
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#D97706', background: '#FEF3C7', padding: '1px 6px', borderRadius: '6px' }}>
                🔥 x{combo}
              </span>
            )}
          </div>
          <div style={{ background: '#FFF', color: '#1E1E24', padding: '3px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', border: '1px solid rgba(0,0,0,0.08)' }}>
            Stack: {stack.length}/15
          </div>
        </div>
      )}

      <div
        onPointerDown={handleDrop}
        style={{
          position: 'relative',
          height: '380px',
          background: '#FFFFFF',
          overflow: 'hidden',
          userSelect: 'none',
          cursor: gameState === 'playing' ? 'pointer' : 'default',
        }}
      >
        {gameState === 'ready' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '18px 20px',
              gap: '14px',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1E1E24' }}>
                Bloom Stacker
              </h4>
              {highScore > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9333EA', background: '#FAF5FF', border: '1px solid #DDD6FE', padding: '3px 10px', borderRadius: '999px' }}>
                  Best: {highScore} pts
                </span>
              )}
            </div>

            {/* Rules Box */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Controls */}
              <div style={{ fontSize: '0.82rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Controls:</span> Tap screen to drop block
              </div>

              {/* Targets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#16A34A' }}>Perfect drop</span>
                  <span style={{ fontWeight: 700, color: '#16A34A', fontSize: '0.8rem' }}>Combo bonus (+pts)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>Miss tower</span>
                  <span style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.8rem' }}>Game over</span>
                </div>
              </div>

              {/* Reward */}
              <div style={{ fontSize: '0.78rem', color: '#64748B', paddingTop: '8px', borderTop: '1px solid #E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Score <strong style={{ color: '#0F172A' }}>100+ pts</strong> to win discount vouchers.
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startStacker}
              className="arcade-start-btn"
              style={{
                width: '100%',
                background: '#9333EA',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(147, 51, 234, 0.25)',
                textAlign: 'center',
              }}
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            {/* The Moving Block */}
            <div
              ref={movingBlockDomRef}
              style={{
                position: 'absolute',
                bottom: `${Math.min(265, 30 + stack.length * 17)}px`,
                left: 0,
                transform: `translate3d(${movingBlockRef.current.x}px, 0, 0)`,
                width: `${movingBlock.width}px`,
                height: '18px',
                background: movingBlock.color,
                borderRadius: '5px',
                border: '1.5px solid #FFF',
                boxShadow: '0 3px 8px rgba(0,0,0,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                willChange: 'transform',
                pointerEvents: 'none',
              }}
            >
              🌸
            </div>

            {/* Stacked Blocks */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {stack.map((block, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    bottom: `${30 + idx * 17}px`,
                    left: `${block.x}px`,
                    width: `${block.width}px`,
                    height: '18px',
                    background: block.color,
                    borderRadius: '5px',
                    border: '1.5px solid #FFF',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
                  }}
                />
              ))}
            </div>

            <div style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.72rem', fontWeight: 700, color: '#7E22CE', pointerEvents: 'none' }}>
              Tap anywhere to drop!
            </div>
          </>
        )}

        {gameState === 'result' && resultData && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: '14px', background: 'rgba(255,253,249,0.98)' }}>
            {resultData.won ? (
              <>
                <div style={{ background: '#FAF5FF', border: '1.5px solid #9333EA', borderRadius: '16px', padding: '14px 20px', width: '100%', maxWidth: '280px', boxShadow: '0 4px 12px rgba(147, 51, 234, 0.12)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7E22CE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voucher Unlocked</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#9333EA', display: 'block', margin: '4px 0 2px' }}>₱{resultData.voucher.discount} OFF</span>
                  <div style={{ fontSize: '0.78rem', color: '#1E1E24', fontWeight: 700, fontFamily: 'monospace', background: '#E9D5FF', padding: '3px 10px', borderRadius: '6px', display: 'inline-block', marginTop: '4px' }}>
                    {resultData.voucher.code}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#78716C', display: 'block', marginTop: '6px', fontWeight: 500 }}>Min. spend ₱{resultData.voucher.minSpend}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button onClick={startStacker} style={{ background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: '999px', padding: '10px 20px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                    Play Again
                  </button>
                  <button onClick={onClose} style={{ background: '#7E22CE', color: '#FFF', border: 'none', borderRadius: '999px', padding: '10px 22px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}>
                    Shop Now
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{resultData.height || 0} Layers Built</span>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1E1E24', lineHeight: 1 }}>{resultData.score} pts</span>
                  {resultData.isNewHighScore ? (
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#7E22CE', background: '#FAF5FF', border: '1px solid #E9D5FF', padding: '2px 10px', borderRadius: '999px', marginTop: '4px' }}>
                      New High Score!
                    </span>
                  ) : resultData.highScore > 0 ? (
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>
                      Best: {resultData.highScore} pts
                    </span>
                  ) : null}
                  {resultData.score < 100 && (
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>
                      So close! Just {100 - resultData.score} more pts for a voucher!
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button onClick={startStacker} className="arcade-start-btn" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)', color: '#FFF', border: 'none', borderRadius: '999px', padding: '10px 24px', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(126, 34, 206, 0.28)' }}>
                    Play Again
                  </button>
                  <button onClick={onBackToMenu} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: '999px', padding: '10px 20px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                    Menu
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GAME 4: PETAL POP (Bubble Reflex Action - Bomb Bubbles & Sparks)
// ─────────────────────────────────────────────────────────────
const POP_BUBBLES = [
  { id: 'rose', emoji: '🌹', points: 6, radius: 25, speed: 3.4, isHarmful: false },
  { id: 'cherry', emoji: '🌸', points: 12, radius: 27, speed: 3.9, isHarmful: false },
  { id: 'sunflower', emoji: '🌻', points: 18, radius: 29, speed: 4.4, isHarmful: false },
  { id: 'diamond', emoji: '💎', points: 35, radius: 25, speed: 5.2, isHarmful: false, isSpecial: true },
  { id: 'thorn', emoji: '🥀', points: -20, radius: 25, speed: 3.6, isHarmful: true },
  { id: 'bomb', emoji: '💣', points: -45, radius: 27, speed: 4.2, isHarmful: true, isBomb: true },
  { id: 'bee', emoji: '🐝', points: -25, radius: 24, speed: 4.8, isHarmful: true, isZigzag: true },
  { id: 'spark', emoji: '⚡', points: -25, radius: 25, speed: 4.4, isHarmful: true },
];

function PetalPopGame({ audio, onWinVoucher, onBackToMenu, onClose }) {
  const [gameState, setGameState] = useState('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [playsLeft, setPlaysLeft] = useState(3);
  const [resultData, setResultData] = useState(null);
  const [highScore, setHighScore] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isHitFlashing, setIsHitFlashing] = useState(false);

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const bubblesRef = useRef([]);
  const particlesRef = useRef([]);
  const floatersRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const isPlayingRef = useRef(false);
  const timeoutIdsRef = useRef([]);
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(15);
  const lastSpawnRef = useRef(0);
  const hadVoucherChanceRef = useRef(true);

  useEffect(() => {
    const info = getDailyPlays('mm_pop_plays', 3);
    setPlaysLeft(info.remaining);
    setHighScore(getGameHighScore('pop'));
  }, []);

  const triggerHazardFeedback = () => {
    setIsShaking(true);
    setIsHitFlashing(true);
    setTimeout(() => setIsShaking(false), 320);
    setTimeout(() => setIsHitFlashing(false), 320);
  };

  const spawnBubble = (startY = null) => {
    if (!isPlayingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 42% chance of spawning tricky hazard/bomb bubble
    const isHarmful = Math.random() < 0.42;
    const pool = POP_BUBBLES.filter((b) => b.isHarmful === isHarmful);
    const item = pool[Math.floor(Math.random() * pool.length)];

    const radius = item.radius;
    const x = radius + 15 + Math.random() * (canvas.width - radius * 2 - 30);
    const y = startY !== null ? startY : canvas.height + radius + 10;
    const speed = item.speed * (0.95 + Math.random() * 0.3);

    bubblesRef.current.push({
      id: Math.random().toString(),
      type: item,
      x,
      y,
      baseX: x,
      radius,
      speed,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: item.isZigzag ? 0.12 : 0.05 + Math.random() * 0.03,
      wobbleAmp: item.isZigzag ? 30 : 16 + Math.random() * 10,
      popped: false,
    });
  };

  const createBurst = (x, y, isHarmful, isBomb) => {
    const colors = isBomb
      ? ['#EF4444', '#DC2626', '#991B1B', '#F59E0B']
      : isHarmful
      ? ['#EF4444', '#F87171', '#B91C1C', '#991B1B']
      : ['#10B981', '#34D399', '#F472B6', '#FBBF24', '#60A5FA'];

    const count = isBomb ? 20 : 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = isBomb ? 3.5 + Math.random() * 4.5 : 2.5 + Math.random() * 3.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: isBomb ? 3 + Math.random() * 4 : 3 + Math.random() * 3,
        alpha: 1,
        decay: isBomb ? 0.035 : 0.04 + Math.random() * 0.03,
      });
    }
  };

  const popAt = (canvasX, canvasY) => {
    if (!isPlayingRef.current) return;

    for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
      const b = bubblesRef.current[i];
      if (b.popped) continue;

      const dist = Math.hypot(canvasX - b.x, canvasY - b.y);
      if (dist <= b.radius + 12) {
        b.popped = true;

        createBurst(b.x, b.y, b.type.isHarmful, b.type.isBomb);

        if (b.type.isHarmful) {
          scoreRef.current = Math.max(0, scoreRef.current + b.type.points);
          setScore(scoreRef.current);
          triggerHazardFeedback();
          floatersRef.current.push({
            x: b.x,
            y: b.y,
            text: `${b.type.points}`,
            color: '#DC2626',
            alpha: 1,
          });
          if (b.type.isBomb) {
            if (audio) audio.playBomb();
          } else {
            if (audio) audio.playMiss();
          }
        } else {
          scoreRef.current += b.type.points;
          setScore(scoreRef.current);
          floatersRef.current.push({
            x: b.x,
            y: b.y,
            text: `+${b.type.points}`,
            color: b.type.isSpecial ? '#D97706' : '#059669',
            alpha: 1,
          });
          if (audio) audio.playPop();
        }
        break;
      }
    }
  };

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    popAt(x, y);
  };

  const startPop = () => {
    if (audio) audio.init();

    // Clean previous runs
    isPlayingRef.current = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];

    const canWin = playsLeft > 0;
    hadVoucherChanceRef.current = canWin;
    if (canWin) {
      recordDailyPlay('mm_pop_plays');
      setPlaysLeft((prev) => Math.max(0, prev - 1));
    }

    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(15);
    timeLeftRef.current = 15;
    bubblesRef.current = [];
    particlesRef.current = [];
    floatersRef.current = [];
    setResultData(null);
    isPlayingRef.current = true;
    setGameState('playing');
    lastSpawnRef.current = performance.now();

    // Initial bubbles so screen is ready instantly
    const t1 = setTimeout(() => {
      if (isPlayingRef.current) {
        spawnBubble(80);
        spawnBubble(160);
        spawnBubble(240);
      }
    }, 30);
    timeoutIdsRef.current.push(t1);

    timerIntervalRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(timerIntervalRef.current);
        finishPop();
      }
    }, 1000);

    let lastTime = performance.now();
    const loop = (ts) => {
      if (!isPlayingRef.current || timeLeftRef.current <= 0) return;

      const dt = Math.min((ts - lastTime) / 16.66, 1.8);
      lastTime = ts;

      const canvas = canvasRef.current;
      if (!canvas) {
        if (isPlayingRef.current && timeLeftRef.current > 0) {
          animRef.current = requestAnimationFrame(loop);
        }
        return;
      }
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Accelerated bubble flow (starts at 360ms, ramps to 180ms)
      const spawnDelay = Math.max(180, 360 - (15 - timeLeftRef.current) * 12);
      if (ts - lastSpawnRef.current > spawnDelay) {
        spawnBubble();
        lastSpawnRef.current = ts;
      }

      // Fast upward velocity scaling (1.0x up to 1.65x)
      const speedScale = 1.0 + ((15 - timeLeftRef.current) / 15) * 0.65;
      const nextBubbles = [];
      for (const b of bubblesRef.current) {
        if (!b.popped) {
          b.y -= b.speed * speedScale * dt;
          b.wobble += b.wobbleSpeed * dt;
          b.x = b.baseX + Math.sin(b.wobble) * b.wobbleAmp;

          // Render Bubble
          ctx.save();
          ctx.translate(b.x, b.y);

          // Bubble glow / background
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          if (b.type.isBomb) {
            ctx.fillStyle = 'rgba(254, 202, 202, 0.9)';
            ctx.strokeStyle = '#DC2626';
            ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(220, 38, 38, 0.6)';
            ctx.shadowBlur = 10;
          } else if (b.type.isHarmful) {
            ctx.fillStyle = 'rgba(254, 226, 226, 0.85)';
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.35)';
            ctx.shadowBlur = 8;
          } else if (b.type.isSpecial) {
            const grad = ctx.createRadialGradient(-b.radius * 0.3, -b.radius * 0.3, 2, 0, 0, b.radius);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.7, 'rgba(254, 243, 199, 0.9)');
            grad.addColorStop(1, 'rgba(245, 158, 11, 0.5)');
            ctx.fillStyle = grad;
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
            ctx.shadowBlur = 10;
          } else {
            const grad = ctx.createRadialGradient(-b.radius * 0.3, -b.radius * 0.3, 2, 0, 0, b.radius);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.7, 'rgba(236, 253, 245, 0.85)');
            grad.addColorStop(1, 'rgba(16, 185, 129, 0.4)');
            ctx.fillStyle = grad;
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(16, 185, 129, 0.25)';
            ctx.shadowBlur = 8;
          }
          ctx.fill();
          ctx.stroke();

          // Bubble glass shine
          ctx.shadowColor = 'transparent';
          ctx.beginPath();
          ctx.ellipse(-b.radius * 0.32, -b.radius * 0.35, b.radius * 0.28, b.radius * 0.16, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.fill();

          // Emoji
          ctx.font = `${b.radius * 1.1}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.type.emoji, 0, 2);

          ctx.restore();

          if (b.y + b.radius > -20) {
            nextBubbles.push(b);
          }
        }
      }
      bubblesRef.current = nextBubbles;

      // Update & render burst particles
      const nextParticles = [];
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;
        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          nextParticles.push(p);
        }
      }
      particlesRef.current = nextParticles;

      // Update & render floating score indicators
      const nextFloaters = [];
      for (const f of floatersRef.current) {
        f.y -= 1.2 * dt;
        f.alpha -= 0.03 * dt;
        if (f.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, f.alpha);
          ctx.fillStyle = f.color;
          ctx.font = '900 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f.text, f.x, f.y);
          ctx.restore();
          nextFloaters.push(f);
        }
      }
      floatersRef.current = nextFloaters;

      if (isPlayingRef.current && timeLeftRef.current > 0) {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
  };

  const finishPop = () => {
    isPlayingRef.current = false;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];

    const finalScore = scoreRef.current;
    const hsResult = saveGameHighScore('pop', finalScore);
    setHighScore(hsResult.highScore);

    let tierKey = null;
    if (finalScore >= 300) tierKey = 'DIAMOND';     // ₱50 OFF (Min. spend ₱1200)
    else if (finalScore >= 200) tierKey = 'GOLD';   // ₱20 OFF (Min. spend ₱600)
    else if (finalScore >= 100) tierKey = 'SILVER'; // ₱10 OFF (Min. spend ₱350)

    if (hadVoucherChanceRef.current && tierKey) {
      const res = issueVoucherForTier(tierKey);
      setResultData({
        won: true,
        voucher: res.voucher,
        score: finalScore,
        isNewHighScore: hsResult.isNew,
        highScore: hsResult.highScore,
      });
      if (audio) audio.playWin();
      if (onWinVoucher) onWinVoucher(res.voucher);
    } else {
      setResultData({
        won: false,
        isFreePlay: !hadVoucherChanceRef.current,
        score: finalScore,
        tierKey,
        isNewHighScore: hsResult.isNew,
        highScore: hsResult.highScore,
      });
      if (audio) {
        if (finalScore >= 40) audio.playWin();
        else audio.playMiss();
      }
    }
    setGameState('result');
  };

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timeoutIdsRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {gameState === 'playing' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#ECFDF5', borderBottom: '1px solid #A7F3D0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#047857' }}>Score:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669' }}>{score}</span>
          </div>
          <div style={{ background: timeLeft <= 5 ? '#FEE2E2' : '#FFF', color: timeLeft <= 5 ? '#DC2626' : '#1E1E24', padding: '3px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', border: '1px solid rgba(0,0,0,0.08)' }}>
            {timeLeft}s
          </div>
        </div>
      )}

      <div
        className={`${isShaking ? 'arcade-shake' : ''} ${isHitFlashing ? 'arcade-hit-flash' : ''}`}
        style={{ position: 'relative', height: '380px', background: '#FFFFFF', overflow: 'hidden', userSelect: 'none' }}
      >
        {gameState === 'ready' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '18px 20px',
              gap: '14px',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1E1E24' }}>
                Petal Pop
              </h4>
              {highScore > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: '999px' }}>
                  Best: {highScore} pts
                </span>
              )}
            </div>

            {/* Rules Box */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Controls */}
              <div style={{ fontSize: '0.82rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Controls:</span> Tap rising bubbles to pop
              </div>

              {/* Targets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#16A34A' }}>Pop (+pts)</span>
                  <span style={{ fontSize: '1.15rem', letterSpacing: '4px' }}>🌹 🌸 🌻 💎</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>Avoid (-pts)</span>
                  <span style={{ fontSize: '1.15rem', letterSpacing: '4px' }}>💣 🥀 🐝 ⚡</span>
                </div>
              </div>

              {/* Reward */}
              <div style={{ fontSize: '0.78rem', color: '#64748B', paddingTop: '8px', borderTop: '1px solid #E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Score <strong style={{ color: '#0F172A' }}>100+ pts</strong> to win discount vouchers.
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startPop}
              className="arcade-start-btn"
              style={{
                width: '100%',
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                textAlign: 'center',
              }}
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <canvas
            ref={canvasRef}
            width={340}
            height={380}
            onPointerDown={handlePointerDown}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: 'pointer',
              touchAction: 'none',
            }}
          />
        )}

        {gameState === 'result' && resultData && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: '14px', background: 'rgba(255,253,249,0.98)' }}>
            {resultData.won ? (
              <>
                <div style={{ background: '#ECFDF5', border: '1.5px solid #10B981', borderRadius: '16px', padding: '14px 20px', width: '100%', maxWidth: '280px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voucher Unlocked</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669', display: 'block', margin: '4px 0 2px' }}>₱{resultData.voucher.discount} OFF</span>
                  <div style={{ fontSize: '0.78rem', color: '#1E1E24', fontWeight: 700, fontFamily: 'monospace', background: '#A7F3D0', padding: '3px 10px', borderRadius: '6px', display: 'inline-block', marginTop: '4px' }}>
                    {resultData.voucher.code}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#78716C', display: 'block', marginTop: '6px', fontWeight: 500 }}>Min. spend ₱{resultData.voucher.minSpend}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button onClick={startPop} style={{ background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: '999px', padding: '10px 20px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                    Play Again
                  </button>
                  <button onClick={onClose} style={{ background: '#059669', color: '#FFF', border: 'none', borderRadius: '999px', padding: '10px 22px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}>
                    Shop Now
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Final Score</span>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1E1E24', lineHeight: 1 }}>{resultData.score} pts</span>
                  {resultData.isNewHighScore ? (
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 10px', borderRadius: '999px', marginTop: '4px' }}>
                      New High Score!
                    </span>
                  ) : resultData.highScore > 0 ? (
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>
                      Best: {resultData.highScore} pts
                    </span>
                  ) : null}
                  {resultData.score < 100 && (
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>
                      So close! Just {100 - resultData.score} more pts for a voucher!
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button onClick={startPop} className="arcade-start-btn" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFF', border: 'none', borderRadius: '999px', padding: '10px 24px', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.28)' }}>
                    Play Again
                  </button>
                  <button onClick={onBackToMenu} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: '999px', padding: '10px 20px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                    Menu
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN ARTSY ARCADE MODAL
// ─────────────────────────────────────────────────────────────
export default function ArtsyFunZoneModal({ isOpen, onClose }) {
  const [activeGameId, setActiveGameId] = useState('menu');
  const [activeVoucher, setActiveVoucher] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new FunZoneAudio();
  }, []);

  const refreshActiveVoucher = useCallback(() => {
    const v = getActiveVoucher();
    setActiveVoucher(v);
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshActiveVoucher();
      setActiveGameId('menu');
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      const prevTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
        document.body.style.touchAction = prevTouchAction || '';
      };
    }
  }, [isOpen, refreshActiveVoucher]);

  useEffect(() => {
    const handleVoucherUpdate = (e) => {
      if (e.detail) setActiveVoucher(e.detail);
      else refreshActiveVoucher();
    };
    window.addEventListener('mm_voucher_updated', handleVoucherUpdate);
    window.addEventListener('mm_wallet_updated', handleVoucherUpdate);
    return () => {
      window.removeEventListener('mm_voucher_updated', handleVoucherUpdate);
      window.removeEventListener('mm_wallet_updated', handleVoucherUpdate);
    };
  }, [refreshActiveVoucher]);

  const toggleSound = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="arcade-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        touchAction: 'none',
        overscrollBehavior: 'contain',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
    >
      <div
        className="arcade-modal-container"
        style={{
          width: '100%',
          maxWidth: '395px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeGameId !== 'menu' && (
              <button
                onClick={() => setActiveGameId('menu')}
                style={{
                  background: '#FFF7ED',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EA580C',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <i className="fa-solid fa-arrow-left"></i>
              </button>
            )}
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#1E1E24' }}>
              M&M Artsy Arcade
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={toggleSound}
              style={{
                background: isMuted ? '#F3F4F6' : '#FFF7ED',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isMuted ? '#9CA3AF' : '#EA580C',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#F3F4F6',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4B5563',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Active Voucher Banner */}
        {activeVoucher && !isVoucherExpired(activeVoucher) && !activeVoucher.used && (
          <div
            style={{
              padding: '7px 16px',
              background: '#FFF7ED',
              borderBottom: '1px solid #FED7AA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#C2410C' }}>
              ₱{activeVoucher.discount} OFF Active
            </span>
            <span style={{ fontSize: '0.72rem', color: '#78716C', fontWeight: 600 }}>
              Min. spend ₱{activeVoucher.minSpend}
            </span>
          </div>
        )}

        {/* Body Content */}
        <div key={activeGameId} className="arcade-view-fade">
          {activeGameId === 'menu' ? (
            <div style={{ padding: '16px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                }}
              >
                {/* 1. Petal Rush */}
                <button
                  type="button"
                  onClick={() => setActiveGameId('rush')}
                  className="arcade-game-card arcade-card-rush"
                >
                  <div className="card-icon-wrap">
                    🧺
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E1E24', marginTop: '10px', textAlign: 'center', lineHeight: 1.2 }}>
                    Petal Rush
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#C2410C', background: 'rgba(234, 88, 12, 0.1)', padding: '2px 8px', borderRadius: '999px', marginTop: '4px' }}>
                    Catch & Win
                  </span>
                </button>

                {/* 2. Ribbon Ninja */}
                <button
                  type="button"
                  onClick={() => setActiveGameId('ninja')}
                  className="arcade-game-card arcade-card-ninja"
                >
                  <div className="card-icon-wrap">
                    ✂️
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E1E24', marginTop: '10px', textAlign: 'center', lineHeight: 1.2 }}>
                    Ribbon Ninja
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#BE123C', background: 'rgba(225, 29, 72, 0.1)', padding: '2px 8px', borderRadius: '999px', marginTop: '4px' }}>
                    Slice & Win
                  </span>
                </button>

                {/* 3. Bloom Stacker */}
                <button
                  type="button"
                  onClick={() => setActiveGameId('stacker')}
                  className="arcade-game-card arcade-card-stacker"
                >
                  <div className="card-icon-wrap">
                    🏗️
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E1E24', marginTop: '10px', textAlign: 'center', lineHeight: 1.2 }}>
                    Bloom Stacker
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#6D28D9', background: 'rgba(124, 58, 237, 0.1)', padding: '2px 8px', borderRadius: '999px', marginTop: '4px' }}>
                    Stack & Win
                  </span>
                </button>

                {/* 4. Petal Pop */}
                <button
                  type="button"
                  onClick={() => setActiveGameId('pop')}
                  className="arcade-game-card arcade-card-pop"
                >
                  <div className="card-icon-wrap">
                    🎈
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E1E24', marginTop: '10px', textAlign: 'center', lineHeight: 1.2 }}>
                    Petal Pop
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#047857', background: 'rgba(5, 150, 105, 0.1)', padding: '2px 8px', borderRadius: '999px', marginTop: '4px' }}>
                    Pop & Win
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              {activeGameId === 'rush' && <PetalRushGame audio={audioRef.current} onWinVoucher={setActiveVoucher} onBackToMenu={() => setActiveGameId('menu')} onClose={onClose} />}
              {activeGameId === 'ninja' && <RibbonNinjaGame audio={audioRef.current} onWinVoucher={setActiveVoucher} onBackToMenu={() => setActiveGameId('menu')} onClose={onClose} />}
              {activeGameId === 'stacker' && <BloomStackerGame audio={audioRef.current} onWinVoucher={setActiveVoucher} onBackToMenu={() => setActiveGameId('menu')} onClose={onClose} />}
              {activeGameId === 'pop' && <PetalPopGame audio={audioRef.current} onWinVoucher={setActiveVoucher} onBackToMenu={() => setActiveGameId('menu')} onClose={onClose} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
