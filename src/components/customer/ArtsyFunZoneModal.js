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
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playTone(freq, type, duration, startVol = 0.12) {
    if (this.muted || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
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
  { id: 'tulip', emoji: '🌷', points: 5, speed: 2.7, size: 30, weight: 28, isHarmful: false },
  { id: 'sunflower', emoji: '🌻', points: 10, speed: 3.1, size: 34, weight: 24, isHarmful: false },
  { id: 'bouquet', emoji: '💐', points: 20, speed: 3.6, size: 32, weight: 14, isHarmful: false },
  { id: 'star', emoji: '⭐', points: 30, speed: 4.2, size: 30, weight: 8, isHarmful: false, isSpecial: true },
  { id: 'thorn', emoji: '🥀', points: -10, speed: 2.9, size: 28, weight: 12, isHarmful: true },
  { id: 'bomb', emoji: '💣', points: -25, speed: 3.5, size: 32, weight: 12, isHarmful: true, isBomb: true },
  { id: 'bee', emoji: '🐝', points: -15, speed: 3.3, size: 28, weight: 12, isHarmful: true, isZigzag: true },
  { id: 'rock', emoji: '🪨', points: -15, speed: 4.1, size: 28, weight: 10, isHarmful: true },
];

function PetalRushGame({ audio, onWinVoucher, onBackToMenu, onClose }) {
  const [gameState, setGameState] = useState('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [basketX, setBasketX] = useState(50);
  const [resultData, setResultData] = useState(null);
  const [playsLeft, setPlaysLeft] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isHitFlashing, setIsHitFlashing] = useState(false);

  const gameAreaRef = useRef(null);
  const animFrameRef = useRef(null);
  const itemsRef = useRef([]);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(20);
  const targetBasketXRef = useRef(50);
  const currentBasketXRef = useRef(50);
  const hadVoucherChanceRef = useRef(true);

  useEffect(() => {
    const info = getDailyPlays('mm_rush_plays', 3);
    setPlaysLeft(info.remaining);
    setHighScore(getGameHighScore('rush'));
  }, []);

  const handlePointerMove = useCallback((clientX) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = Math.max(12, Math.min(88, (relativeX / rect.width) * 100));
    targetBasketXRef.current = percentage;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') targetBasketXRef.current = Math.max(12, targetBasketXRef.current - 14);
      else if (e.key === 'ArrowRight' || e.key === 'd') targetBasketXRef.current = Math.min(88, targetBasketXRef.current + 14);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const addFloatingText = (text, x, y, color = '#EA580C') => {
    const id = Date.now() + Math.random();
    setFloatingTexts((prev) => [...prev.slice(-3), { id, text, x, y, color }]);
    setTimeout(() => setFloatingTexts((prev) => prev.filter((item) => item.id !== id)), 650);
  };

  const triggerHazardFeedback = (isBomb = false) => {
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

    // Dynamic speed ramp as game progresses
    const timeProgress = (20 - timeLeftRef.current) / 20; // 0 to 1
    const speedBoost = 1 + timeProgress * 0.45;

    return {
      id: `${now}_${Math.random().toString(36).substr(2, 5)}`,
      type: selected,
      x: Math.floor(Math.random() * 74) + 13,
      y: -6,
      speed: selected.speed * (0.92 + Math.random() * 0.25) * speedBoost,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: selected.isZigzag ? 0.12 : 0.05,
      wobbleAmp: selected.isZigzag ? 3.5 : 1.5,
    };
  };

  const startRush = () => {
    if (audio) audio.init();

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
    setFloatingTexts([]);
    setResultData(null);
    currentBasketXRef.current = 50;
    targetBasketXRef.current = 50;
    setBasketX(50);
    setGameState('playing');
    lastSpawnRef.current = performance.now();

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          finishRush();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let lastFrame = performance.now();
    const loop = (ts) => {
      const delta = Math.min((ts - lastFrame) / 16.66, 2.0);
      lastFrame = ts;

      // Ultra responsive LERP with smooth dampening
      currentBasketXRef.current += (targetBasketXRef.current - currentBasketXRef.current) * 0.35 * delta;
      setBasketX(currentBasketXRef.current);

      // Dynamic spawn rate: accelerates from 420ms down to 260ms in late game!
      const currentSpawnDelay = Math.max(260, 420 - (20 - timeLeftRef.current) * 8);
      if (ts - lastSpawnRef.current > currentSpawnDelay) {
        itemsRef.current.push(spawnItem(ts));
        lastSpawnRef.current = ts;
      }

      const basketPos = currentBasketXRef.current;
      const currentItems = itemsRef.current;
      const remaining = [];

      for (let i = 0; i < currentItems.length; i++) {
        const item = currentItems[i];
        item.y += item.speed * delta;
        item.wobble += item.wobbleSpeed * delta;
        const currentX = item.x + Math.sin(item.wobble) * item.wobbleAmp;

        if (item.y >= 78 && item.y <= 90) {
          if (Math.abs(currentX - basketPos) <= 15) {
            if (item.type.isHarmful) {
              scoreRef.current = Math.max(0, scoreRef.current + item.type.points);
              setScore(scoreRef.current);
              addFloatingText(`${item.type.points}`, basketPos, 72, '#DC2626');
              triggerHazardFeedback(item.type.isBomb);
              if (item.type.isBomb) {
                if (audio) audio.playBomb();
              } else {
                if (audio) audio.playMiss();
              }
            } else {
              const gained = item.type.points;
              scoreRef.current += gained;
              setScore(scoreRef.current);
              addFloatingText(`+${gained}`, basketPos, 72, item.type.isSpecial ? '#D97706' : '#16A34A');
              if (audio) audio.playCatch();
            }
            continue;
          }
        }
        if (item.y < 102) remaining.push(item);
      }

      itemsRef.current = remaining;
      if (timeLeftRef.current > 0) animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const finishRush = () => {
    cancelAnimationFrame(animFrameRef.current);
    const finalScore = scoreRef.current;
    const hsResult = saveGameHighScore('rush', finalScore);
    setHighScore(hsResult.highScore);

    let tierKey = null;
    if (finalScore >= 220) tierKey = 'DIAMOND';      // ₱30 OFF
    else if (finalScore >= 160) tierKey = 'GOLD';     // ₱20 OFF
    else if (finalScore >= 100) tierKey = 'SILVER';   // ₱10 OFF
    else if (finalScore >= 50) tierKey = 'BRONZE';    // ₱5 OFF

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
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
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
        ref={gameAreaRef}
        className={`${isShaking ? 'arcade-shake' : ''} ${isHitFlashing ? 'arcade-hit-flash' : ''}`}
        onPointerDown={(e) => {
          if (gameState === 'playing') handlePointerMove(e.clientX);
        }}
        onPointerMove={(e) => {
          if (gameState === 'playing') handlePointerMove(e.clientX);
        }}
        onTouchStart={(e) => {
          if (gameState === 'playing' && e.touches && e.touches[0]) handlePointerMove(e.touches[0].clientX);
        }}
        onTouchMove={(e) => {
          if (gameState === 'playing' && e.touches && e.touches[0]) handlePointerMove(e.touches[0].clientX);
        }}
        style={{
          position: 'relative',
          height: '380px',
          background: 'radial-gradient(circle at center, #FFFDFB 0%, #FEF3EB 100%)',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          cursor: gameState === 'playing' ? 'ew-resize' : 'default',
        }}
      >
        {gameState === 'ready' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: '10px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                boxShadow: '0 6px 14px -2px rgba(234, 88, 12, 0.3)',
              }}
            >
              🧺
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1E1E24' }}>
                Petal Rush
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
                Catch blooms and dodge the bombs!
              </p>
            </div>

            {highScore > 0 && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '999px', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 800, color: '#C2410C' }}>
                Best: {highScore} pts
              </div>
            )}

            <button
              onClick={startRush}
              className="arcade-start-btn"
              style={{
                marginTop: '4px',
                background: 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '999px',
                padding: '11px 34px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(234, 88, 12, 0.32)',
              }}
            >
              Play Now
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            {itemsRef.current.map((item) => (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: `translate3d(-50%, -50%, 0) rotate(${Math.sin(item.wobble) * 15}deg)`,
                  fontSize: `${item.type.size}px`,
                  lineHeight: 1,
                  pointerEvents: 'none',
                  willChange: 'transform',
                  filter: item.type.isBomb ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))' : item.type.isSpecial ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))' : 'none',
                }}
              >
                {item.type.emoji}
              </div>
            ))}
            {floatingTexts.map((ft) => (
              <div
                key={ft.id}
                style={{
                  position: 'absolute',
                  left: `${ft.x}%`,
                  top: `${ft.y}%`,
                  transform: 'translate3d(-50%, -50%, 0)',
                  color: ft.color,
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  pointerEvents: 'none',
                  animation: 'floatUp 0.65s ease-out forwards',
                }}
              >
                {ft.text}
              </div>
            ))}
            <div
              style={{
                position: 'absolute',
                left: `${basketX}%`,
                bottom: '14px',
                transform: 'translate3d(-50%, 0, 0)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            >
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🧺</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9A3412', background: '#FED7AA', padding: '1px 8px', borderRadius: '6px', marginTop: '-2px' }}>M&M</div>
            </div>
          </>
        )}

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
  { id: 'flower', emoji: '🌸', points: 12, radius: 26, isHarmful: false },
  { id: 'bouquet', emoji: '💐', points: 20, radius: 28, isHarmful: false },
  { id: 'crown', emoji: '👑', points: 35, radius: 30, isHarmful: false, isSpecial: true },
  { id: 'thorn', emoji: '🥀', points: -15, radius: 24, isHarmful: true },
  { id: 'bomb', emoji: '💣', points: -30, radius: 27, isHarmful: true, isBomb: true },
  { id: 'wasp', emoji: '🐝', points: -20, radius: 24, isHarmful: true },
  { id: 'spider', emoji: '🕷️', points: -15, radius: 24, isHarmful: true },
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 35% chance of spawning hazards / bombs in the mix
    const isHarmful = Math.random() < 0.35;
    const pool = NINJA_TARGETS.filter((t) => t.isHarmful === isHarmful);
    const item = pool[Math.floor(Math.random() * pool.length)];

    const x = 40 + Math.random() * (canvas.width - 80);
    const vx = (Math.random() - 0.5) * 3.6;
    const vy = -(9.2 + Math.random() * 3.4);

    targetsRef.current.push({
      id: Math.random().toString(),
      type: item,
      x,
      y: canvas.height + 15,
      vx,
      vy,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.12,
      sliced: false,
      sliceAlpha: 1,
    });
  };

  const startNinja = () => {
    if (audio) audio.init();

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
    setGameState('playing');
    lastSpawnRef.current = performance.now();

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          finishNinja();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let lastTime = performance.now();
    const loop = (ts) => {
      const dt = Math.min((ts - lastTime) / 16.66, 1.8);
      lastTime = ts;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dynamic multi-item volley spawn
      const spawnDelay = Math.max(380, 560 - (20 - timeLeftRef.current) * 10);
      if (ts - lastSpawnRef.current > spawnDelay) {
        spawnTarget();
        // 45% chance of rapid second throw (cluster throw)
        if (Math.random() < 0.45) {
          setTimeout(spawnTarget, 160);
        }
        // 25% chance of third volley in late game
        if (timeLeftRef.current <= 10 && Math.random() < 0.35) {
          setTimeout(spawnTarget, 280);
        }
        lastSpawnRef.current = ts;
      }

      // Update & render targets
      const remaining = [];
      for (const t of targetsRef.current) {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        t.vy += 0.28 * dt; // gravity
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

      if (timeLeftRef.current > 0) {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
  };

  const handlePointerSlash = (x, y) => {
    if (gameState !== 'playing') return;
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
    cancelAnimationFrame(animRef.current);
    const finalScore = scoreRef.current;
    const hsResult = saveGameHighScore('ninja', finalScore);
    setHighScore(hsResult.highScore);

    let tierKey = null;
    if (finalScore >= 220) tierKey = 'DIAMOND';
    else if (finalScore >= 160) tierKey = 'GOLD';
    else if (finalScore >= 100) tierKey = 'SILVER';
    else if (finalScore >= 50) tierKey = 'BRONZE';

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
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
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
        style={{ position: 'relative', height: '380px', background: 'radial-gradient(circle at center, #FFFDFD 0%, #FFE4E6 100%)', overflow: 'hidden' }}
      >
        {gameState === 'ready' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: '10px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                boxShadow: '0 6px 14px -2px rgba(225, 29, 72, 0.3)',
              }}
            >
              ✂️
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1E1E24' }}>
                Ribbon Ninja
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
                Slice ribbons and avoid the bombs!
              </p>
            </div>

            {highScore > 0 && (
              <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '999px', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 800, color: '#BE123C', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>🏆 Best: {highScore} pts</span>
              </div>
            )}

            <button
              onClick={startNinja}
              className="arcade-start-btn"
              style={{
                marginTop: '4px',
                background: 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '999px',
                padding: '11px 34px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(225, 29, 72, 0.32)',
              }}
            >
              Play Now
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

    const initialStack = [{ x: 95, width: 130, color: '#A855F7' }];
    stackRef.current = initialStack;
    setStack(initialStack);

    const initialMoving = { x: 95, width: 130, speed: 0.0032, color: '#C084FC' };
    movingBlockRef.current = initialMoving;
    setMovingBlock({ width: initialMoving.width, color: initialMoving.color });
    setGameState('playing');

    const startTime = performance.now();
    const loop = (now) => {
      const mb = movingBlockRef.current;
      const elapsed = now - startTime;
      const minX = 10;
      const maxX = 330 - mb.width;
      const progress = (Math.sin(elapsed * mb.speed) + 1) / 2;
      mb.x = minX + progress * (maxX - minX);

      if (movingBlockDomRef.current) {
        movingBlockDomRef.current.style.transform = `translate3d(${mb.x}px, 0, 0)`;
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
  };

  const handleDrop = () => {
    if (gameState !== 'playing') return;
    const mb = movingBlockRef.current;
    const topBlock = stackRef.current[stackRef.current.length - 1];

    const overhangLeft = topBlock.x - mb.x;
    const overhangRight = (mb.x + mb.width) - (topBlock.x + topBlock.width);

    let newWidth = mb.width;
    let newX = mb.x;

    if (Math.abs(overhangLeft) <= 5 && Math.abs(overhangRight) <= 5) {
      newX = topBlock.x;
      newWidth = topBlock.width;
      comboRef.current += 1;
      setCombo(comboRef.current);
      const perfectBonus = 15 + Math.min(20, comboRef.current * 5);
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

    if (stackRef.current.length >= 15 || newWidth < 16) {
      finishStacker();
      return;
    }

    // Faster speed acceleration per floor
    const nextSpeed = Math.min(0.0068, 0.0032 + stackRef.current.length * 0.00028);
    movingBlockRef.current = {
      x: newX,
      width: newWidth,
      speed: nextSpeed,
      color: nextColor,
    };
    setMovingBlock({ width: newWidth, color: nextColor });
  };

  const finishStacker = () => {
    cancelAnimationFrame(animRef.current);
    const finalScore = scoreRef.current;
    const hsResult = saveGameHighScore('stacker', finalScore);
    setHighScore(hsResult.highScore);

    let tierKey = null;
    if (finalScore >= 180) tierKey = 'DIAMOND';
    else if (finalScore >= 140) tierKey = 'GOLD';
    else if (finalScore >= 100) tierKey = 'SILVER';
    else if (finalScore >= 60) tierKey = 'BRONZE';

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
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
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
          background: 'radial-gradient(circle at center, #FAF5FF 0%, #F3E8FF 100%)',
          overflow: 'hidden',
          userSelect: 'none',
          cursor: gameState === 'playing' ? 'pointer' : 'default',
        }}
      >
        {gameState === 'ready' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: '10px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #C084FC 0%, #9333EA 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                boxShadow: '0 6px 14px -2px rgba(147, 51, 234, 0.3)',
              }}
            >
              🏗️
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1E1E24' }}>
                Bloom Stacker
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
                Tap to stack and time perfect drops!
              </p>
            </div>

            {highScore > 0 && (
              <div style={{ background: '#FAF5FF', border: '1px solid #DDD6FE', borderRadius: '999px', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 800, color: '#7E22CE' }}>
                Best: {highScore} pts
              </div>
            )}

            <button
              onClick={startStacker}
              className="arcade-start-btn"
              style={{
                marginTop: '4px',
                background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '999px',
                padding: '11px 34px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(126, 34, 206, 0.32)',
              }}
            >
              Play Now
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
  { id: 'rose', emoji: '🌹', points: 5, radius: 25, speed: 2.5, isHarmful: false },
  { id: 'cherry', emoji: '🌸', points: 10, radius: 27, speed: 2.9, isHarmful: false },
  { id: 'sunflower', emoji: '🌻', points: 15, radius: 29, speed: 3.3, isHarmful: false },
  { id: 'diamond', emoji: '💎', points: 30, radius: 25, speed: 3.9, isHarmful: false, isSpecial: true },
  { id: 'thorn', emoji: '🥀', points: -15, radius: 25, speed: 2.7, isHarmful: true },
  { id: 'bomb', emoji: '💣', points: -30, radius: 27, speed: 3.1, isHarmful: true, isBomb: true },
  { id: 'bee', emoji: '🐝', points: -20, radius: 24, speed: 3.5, isHarmful: true, isZigzag: true },
  { id: 'spark', emoji: '⚡', points: -20, radius: 25, speed: 3.3, isHarmful: true },
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 35% chance of spawning tricky hazard/bomb bubble
    const isHarmful = Math.random() < 0.35;
    const pool = POP_BUBBLES.filter((b) => b.isHarmful === isHarmful);
    const item = pool[Math.floor(Math.random() * pool.length)];

    const radius = item.radius;
    const x = radius + 15 + Math.random() * (canvas.width - radius * 2 - 30);
    const y = startY !== null ? startY : canvas.height + radius + 10;
    const speed = item.speed * (0.92 + Math.random() * 0.25);

    bubblesRef.current.push({
      id: Math.random().toString(),
      type: item,
      x,
      y,
      baseX: x,
      radius,
      speed,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: item.isZigzag ? 0.08 : 0.035 + Math.random() * 0.02,
      wobbleAmp: item.isZigzag ? 24 : 12 + Math.random() * 8,
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
    if (gameState !== 'playing') return;

    for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
      const b = bubblesRef.current[i];
      if (b.popped) continue;

      const dist = Math.hypot(canvasX - b.x, canvasY - b.y);
      if (dist <= b.radius + 18) {
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
    setGameState('playing');
    lastSpawnRef.current = performance.now();

    // Initial bubbles so screen is ready instantly
    setTimeout(() => {
      spawnBubble(80);
      spawnBubble(160);
      spawnBubble(240);
    }, 30);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
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
      const dt = Math.min((ts - lastTime) / 16.66, 1.8);
      lastTime = ts;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fast periodic bubble flow
      if (ts - lastSpawnRef.current > 260) {
        spawnBubble();
        lastSpawnRef.current = ts;
      }

      // Update and draw bubbles
      const nextBubbles = [];
      for (const b of bubblesRef.current) {
        if (!b.popped) {
          b.y -= b.speed * dt;
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

      if (timeLeftRef.current > 0) {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
  };

  const finishPop = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const finalScore = scoreRef.current;
    const hsResult = saveGameHighScore('pop', finalScore);
    setHighScore(hsResult.highScore);

    let tierKey = null;
    if (finalScore >= 160) tierKey = 'DIAMOND';
    else if (finalScore >= 110) tierKey = 'GOLD';
    else if (finalScore >= 70) tierKey = 'SILVER';
    else if (finalScore >= 40) tierKey = 'BRONZE';

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
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
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
        style={{ position: 'relative', height: '380px', background: 'radial-gradient(circle at center, #F0FDF4 0%, #DCFCE7 100%)', overflow: 'hidden', userSelect: 'none' }}
      >
        {gameState === 'ready' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: '10px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                boxShadow: '0 6px 14px -2px rgba(5, 150, 105, 0.3)',
              }}
            >
              🎈
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1E1E24' }}>
                Petal Pop
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
                Pop bubbles and dodge the bombs!
              </p>
            </div>

            {highScore > 0 && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '999px', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 800, color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>🏆 Best: {highScore} pts</span>
              </div>
            )}

            <button
              onClick={startPop}
              className="arcade-start-btn"
              style={{
                marginTop: '4px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '999px',
                padding: '11px 34px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(5, 150, 105, 0.32)',
              }}
            >
              Play Now
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
