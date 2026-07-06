'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MIN_BPM = 40;
const MAX_BPM = 240;
const LOOKAHEAD_MS = 25; // how often the scheduler runs
const SCHEDULE_AHEAD_S = 0.12; // how far ahead to schedule audio

const BEAT_OPTIONS = [2, 3, 4, 6];

export default function Metronome() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(-1);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextNoteTimeRef = useRef(0);
  const beatRef = useRef(0);
  const bpmRef = useRef(bpm);
  const beatsPerMeasureRef = useRef(beatsPerMeasure);
  const tapTimesRef = useRef<number[]>([]);

  bpmRef.current = bpm;
  beatsPerMeasureRef.current = beatsPerMeasure;

  const scheduleClick = useCallback((time: number, accent: boolean) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1760 : 880;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.09);
  }, []);

  // Lookahead scheduler: setInterval wakes often, audio events are placed on
  // the AudioContext clock so timing stays tight even if the main thread jitters
  const schedulerTick = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const beat = beatRef.current;
      scheduleClick(nextNoteTimeRef.current, beat === 0);

      // Flip the visual indicator when the click actually sounds
      const delayMs = Math.max(0, (nextNoteTimeRef.current - ctx.currentTime) * 1000);
      setTimeout(() => setCurrentBeat(beat), delayMs);

      beatRef.current = (beat + 1) % beatsPerMeasureRef.current;
      nextNoteTimeRef.current += 60 / bpmRef.current;
    }
  }, [scheduleClick]);

  const start = useCallback(async () => {
    if (!audioCtxRef.current) {
      const Ctor: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new Ctor();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    beatRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    timerRef.current = setInterval(schedulerTick, LOOKAHEAD_MS);
    setIsPlaying(true);
  }, [schedulerTick]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(-1);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const clampBpm = (value: number) =>
    Math.min(Math.max(Math.round(value), MIN_BPM), MAX_BPM);

  const changeBpm = (value: number) => {
    setBpm(clampBpm(value));
  };

  // Tap tempo: average the last few tap intervals
  const handleTap = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    // A pause longer than 2s starts a fresh measurement
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      taps.length = 0;
    }
    taps.push(now);
    if (taps.length > 5) taps.shift();
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      changeBpm(60000 / avgMs);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 h-full select-none">
      {/* BPM display */}
      <div className="text-center">
        <div className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums">
          {bpm}
        </div>
        <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          BPM
        </div>
      </div>

      {/* Beat indicator */}
      <div className="flex justify-center gap-2" data-testid="beat-dots">
        {Array.from({ length: beatsPerMeasure }, (_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-colors duration-75 ${
              currentBeat === i
                ? i === 0
                  ? 'bg-blue-600'
                  : 'bg-blue-400'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* BPM controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => changeBpm(bpm - 1)}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-lg font-bold"
          title="Slower"
        >
          −
        </button>
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={(e) => changeBpm(parseInt(e.target.value, 10))}
          className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          title="Tempo"
        />
        <button
          onClick={() => changeBpm(bpm + 1)}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-lg font-bold"
          title="Faster"
        >
          +
        </button>
      </div>

      {/* Time signature */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Beats:</span>
        {BEAT_OPTIONS.map(n => (
          <button
            key={n}
            onClick={() => setBeatsPerMeasure(n)}
            className={`px-3 py-1 rounded text-sm transition ${
              beatsPerMeasure === n
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Start/stop and tap tempo */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={isPlaying ? stop : start}
          className={`flex-1 py-3 rounded-lg font-semibold text-white transition ${
            isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isPlaying ? 'Stop' : 'Start'}
        </button>
        <button
          onClick={handleTap}
          className="px-6 py-3 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          title="Tap repeatedly to set the tempo"
        >
          Tap
        </button>
      </div>
    </div>
  );
}
