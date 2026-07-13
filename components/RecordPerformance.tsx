'use client';

import { useState, useRef, useEffect } from 'react';

// In-browser recorder for performance videos. Recording stays fully local:
// the user records a take, reviews it, downloads the file, uploads it to
// their own YouTube account (their storage, their visibility settings), and
// pastes the link into the submission form below. No Google OAuth, no
// upload quota, no server involvement.

interface RecordPerformanceProps {
  /** Basis for the downloaded file name, e.g. "arban-page-202" */
  fileStem: string;
  /** Ready-made YouTube title for the exercise (copy button) */
  suggestedTitle: string;
}

type Stage = 'idle' | 'live' | 'recording' | 'recorded';

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(t =>
    MediaRecorder.isTypeSupported(t)
  );
}

export default function RecordPerformance({ fileStem, suggestedTitle }: RecordPerformanceProps) {
  const [expanded, setExpanded] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [fileExt, setFileExt] = useState('webm');
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  // Full cleanup on unmount: camera off, blob URL released
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stop();
      stopStream();
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        // Speech-oriented processing (echo cancellation, noise suppression,
        // auto gain) mangles music - a sustained trumpet note reads as
        // "noise" and gets pumped or filtered. Record the microphone raw.
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      setStage('live');
      // srcObject is set after render via the effect below
    } catch {
      setError('Could not access the camera/microphone. Check the browser permissions.');
    }
  };

  // Attach the live stream to the preview element whenever it renders
  useEffect(() => {
    if ((stage === 'live' || stage === 'recording') && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

  const startRecording = () => {
    if (!streamRef.current) return;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined
    );
    setFileExt(mimeType?.startsWith('video/mp4') ? 'mp4' : 'webm');
    chunksRef.current = [];
    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      setRecordingUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      stopStream();
      setStage('recorded');
    };
    recorder.start();
    recorderRef.current = recorder;
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    setStage('recording');
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  };

  const retake = () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl(null);
    startCamera();
  };

  const copyTitle = async () => {
    try {
      await navigator.clipboard.writeText(suggestedTitle);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; the title is visible to copy by hand
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        data-testid="record-toggle"
        className="w-full mb-4 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Record your performance here
      </button>
    );
  }

  return (
    <div
      data-testid="record-performance"
      className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Record your performance
        </h3>
        <button
          type="button"
          onClick={() => {
            stopRecording();
            stopStream();
            setStage('idle');
            setExpanded(false);
          }}
          aria-label="Close recorder"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {stage === 'idle' && (
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            Record a take right here (nothing is uploaded - it stays on your device),
            then post it to your own YouTube and paste the link below.
          </p>
          <button
            type="button"
            onClick={startCamera}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
          >
            Turn on camera
          </button>
        </div>
      )}

      {(stage === 'live' || stage === 'recording') && (
        <div className="space-y-2">
          {/* Live preview is muted: the player would hear themselves delayed */}
          <video ref={videoRef} autoPlay muted playsInline className="w-full rounded bg-black aspect-video" />
          {stage === 'live' ? (
            <button
              type="button"
              onClick={startRecording}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium"
            >
              ● Start recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition text-sm font-medium"
            >
              ■ Stop ({formatTime(seconds)})
            </button>
          )}
        </div>
      )}

      {stage === 'recorded' && recordingUrl && (
        <div className="space-y-3">
          <video src={recordingUrl} controls playsInline className="w-full rounded bg-black aspect-video" data-testid="recorded-playback" />
          <div className="flex flex-wrap gap-2">
            <a
              href={recordingUrl}
              download={`${fileStem}.${fileExt}`}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
              data-testid="download-take"
            >
              1. Download the take
            </a>
            <a
              href="https://www.youtube.com/upload"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium"
            >
              2. Upload it on YouTube ↗
            </a>
            <button
              type="button"
              onClick={retake}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
            >
              Retake
            </button>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>
              Suggested YouTube title{' '}
              <button
                type="button"
                onClick={copyTitle}
                className="text-blue-600 hover:underline"
              >
                {copied ? 'copied ✓' : '(copy)'}
              </button>
              :
            </p>
            <p className="font-mono bg-gray-100 dark:bg-gray-900 rounded px-2 py-1 break-words" data-testid="suggested-title">
              {suggestedTitle}
            </p>
            <p>
              &quot;Unlisted&quot; visibility works fine if you&apos;d rather not post publicly.
              Once YouTube finishes processing, paste the video link into the form below.
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
