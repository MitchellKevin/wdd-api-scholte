/* Casino sound manager — Web Audio API + ElevenLabs TTS */
(function () {
  'use strict';

  const MUTE_KEY = 'bj_muted';
  let muted = localStorage.getItem(MUTE_KEY) === 'true';
  let audioCtx = null;

  // Raw ArrayBuffers pre-fetched before AudioContext is created
  const rawCache   = new Map();
  // Decoded AudioBuffers ready to play
  const audioCache = new Map();

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // ── Synthetic effects ───────────────────────────────────────────────────────

  function playChip() {
    if (muted) return;
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        const s = t + i * 0.045;
        osc.frequency.setValueAtTime(1600 - i * 200, s);
        osc.frequency.exponentialRampToValueAtTime(800, s + 0.07);
        gain.gain.setValueAtTime(0.22, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.12);
        osc.start(s);
        osc.stop(s + 0.12);
      }
    } catch (e) {}
  }

  function playCard() {
    if (muted) return;
    try {
      const ctx     = getCtx();
      const t       = ctx.currentTime;
      const bufSize = Math.floor(ctx.sampleRate * 0.07);
      const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data    = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
      }
      const src    = ctx.createBufferSource();
      src.buffer   = buf;
      const hpf    = ctx.createBiquadFilter();
      hpf.type     = 'highpass';
      hpf.frequency.value = 2200;
      const gain   = ctx.createGain();
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      src.connect(hpf);
      hpf.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
    } catch (e) {}
  }

  function playWin() {
    if (muted) return;
    try {
      const ctx   = getCtx();
      const t     = ctx.currentTime;
      const freqs = [523, 659, 784, 1047];
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const s  = t + i * 0.09;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.14, s + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.25);
        osc.start(s);
        osc.stop(s + 0.25);
      });
    } catch (e) {}
  }

  function playLose() {
    if (muted) return;
    try {
      const ctx   = getCtx();
      const t     = ctx.currentTime;
      const freqs = [392, 349, 311];
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const s  = t + i * 0.09;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.12, s + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.22);
        osc.start(s);
        osc.stop(s + 0.22);
      });
    } catch (e) {}
  }

  // Swoosh — hole card reveal
  function playSwoosh() {
    if (muted) return;
    try {
      const ctx     = getCtx();
      const t       = ctx.currentTime;
      const dur     = 0.18;
      const bufSize = Math.floor(ctx.sampleRate * dur);
      const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data    = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / bufSize);
      }
      const src  = ctx.createBufferSource();
      src.buffer = buf;
      const bpf  = ctx.createBiquadFilter();
      bpf.type   = 'bandpass';
      bpf.frequency.setValueAtTime(3000, t);
      bpf.frequency.exponentialRampToValueAtTime(800, t + dur);
      bpf.Q.value = 1.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(bpf);
      bpf.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
    } catch (e) {}
  }

  // Card rattle — shuffle
  function playShuffle() {
    if (muted) return;
    try {
      const ctx = getCtx();
      const t   = ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        const bufSize = Math.floor(ctx.sampleRate * 0.04);
        const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data    = buf.getChannelData(0);
        for (let j = 0; j < bufSize; j++) {
          data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / bufSize, 1.5);
        }
        const src  = ctx.createBufferSource();
        src.buffer = buf;
        const hpf  = ctx.createBiquadFilter();
        hpf.type   = 'highpass';
        hpf.frequency.value = 1800;
        const gain = ctx.createGain();
        const s    = t + i * 0.065 + Math.random() * 0.02;
        gain.gain.setValueAtTime(0.13 + Math.random() * 0.06, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.05);
        src.connect(hpf);
        hpf.connect(gain);
        gain.connect(ctx.destination);
        src.start(s);
      }
    } catch (e) {}
  }

  // Cash register ding — win payout
  function playCashRegister() {
    if (muted) return;
    try {
      const ctx  = getCtx();
      const t    = ctx.currentTime;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 1318; // E6
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.start(t);
      osc.stop(t + 0.65);
      // mechanical click
      const bufSize = Math.floor(ctx.sampleRate * 0.02);
      const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data    = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
      }
      const src    = ctx.createBufferSource();
      src.buffer   = buf;
      const gClick = ctx.createGain();
      gClick.gain.value = 0.2;
      src.connect(gClick);
      gClick.connect(ctx.destination);
      src.start(t);
    } catch (e) {}
  }

  // Subtle two-tone — new round start
  function playStartTone() {
    if (muted) return;
    try {
      const ctx   = getCtx();
      const t     = ctx.currentTime;
      [440, 554].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const s  = t + i * 0.06;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.08, s + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.2);
        osc.start(s);
        osc.stop(s + 0.22);
      });
    } catch (e) {}
  }

  // ── ElevenLabs TTS ──────────────────────────────────────────────────────────

  async function playTTS(text) {
    if (muted) return;
    try {
      const ctx = getCtx();

      let audioBuf = audioCache.get(text);
      if (!audioBuf) {
        let ab = rawCache.get(text);
        if (!ab) {
          const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
          if (!res.ok) return;
          ab = await res.arrayBuffer();
          rawCache.set(text, ab);
        }
        // slice() so decodeAudioData doesn't detach the raw buffer
        audioBuf = await ctx.decodeAudioData(ab.slice(0));
        audioCache.set(text, audioBuf);
      }

      if (muted) return;
      const src    = ctx.createBufferSource();
      src.buffer   = audioBuf;
      const gain   = ctx.createGain();
      gain.gain.value = 0.85;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch (e) {
      console.warn('[Sound] TTS failed:', e);
    }
  }

  // Pre-fetch TTS audio as raw bytes — staggered to avoid rate limiting
  function prewarm() {
    // Ordered by when they're first needed during a game session
    const phrases = [
      'Good luck',
      'Dealer shows an ace',
      'Bust',
      'Standing pat.',
      'Bold move...',
      'Interesting...',
      'Doubling down!',
      'Split!',
      'Dealer busts. Lucky you.',
      'Player wins',
      'Dealer wins',
      'Blackjack!',
      'Twenty-one!',
      'Push',
      'Big winner!',
      'House always wins.',
      'Shuffle up and deal',
      'No more bets',
      'Place your bets',
      'Come back anytime',
    ];
    phrases.forEach((text, i) => {
      if (rawCache.has(text) || audioCache.has(text)) return;
      setTimeout(() => {
        fetch(`/api/tts?text=${encodeURIComponent(text)}`)
          .then(r => r.ok ? r.arrayBuffer() : null)
          .then(ab => { if (ab) rawCache.set(text, ab); })
          .catch(() => {});
      }, i * 200);
    });
  }

  // ── Mute button wiring ──────────────────────────────────────────────────────

  function initMuteBtn() {
    const btn = document.getElementById('muteBtn');
    if (!btn) return;
    function refresh() {
      btn.textContent = muted ? '🔇' : '🔊';
      btn.setAttribute('aria-pressed', String(muted));
    }
    refresh();
    btn.addEventListener('click', () => {
      muted = !muted;
      localStorage.setItem(MUTE_KEY, muted);
      refresh();
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  window.Sound = {
    get muted() { return muted; },
    playChip,
    playCard,
    playWin,
    playLose,
    playSwoosh,
    playShuffle,
    playCashRegister,
    playStartTone,
    prewarm,
    say: {
      noMoreBets  : () => playTTS('No more bets'),
      dealerWins  : () => playTTS('Dealer wins'),
      playerWins  : () => playTTS('Player wins'),
      blackjack   : () => playTTS('Blackjack!'),
      bust        : () => playTTS('Bust'),
      push        : () => playTTS('Push'),
      placeBets   : () => playTTS('Place your bets'),
      boldMove    : () => playTTS('Bold move...'),
      dealerAce   : () => playTTS('Dealer shows an ace'),
      doubling    : () => playTTS('Doubling down!'),
      split       : () => playTTS('Split!'),
      dealerBust  : () => playTTS('Dealer busts. Lucky you.'),
      twentyOne   : () => playTTS('Twenty-one!'),
      houseWins   : () => playTTS('House always wins.'),
      bigWinner   : () => playTTS('Big winner!'),
      standing    : () => playTTS('Standing pat.'),
      shuffleUp   : () => playTTS('Shuffle up and deal'),
      interesting : () => playTTS('Interesting...'),
      goodLuck    : () => playTTS('Good luck'),
      comeBack    : () => playTTS('Come back anytime'),
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initMuteBtn(); prewarm(); });
  } else {
    initMuteBtn();
    prewarm();
  }
})();
