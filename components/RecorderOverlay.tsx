'use client';

import { useState, useRef, useEffect } from 'react';

// Floating in-browser recorder: a compact camera card pinned over the
// viewer so the sheet music stays visible (and scrollable) while
// recording - on phones too. Recording is fully local: the user records
// a take, reviews it, downloads the file, uploads it to their own
// YouTube account, and pastes the link into the submission form.
// No Google OAuth, no upload quota, no server involvement.

interface RecorderOverlayProps {
  /** Basis for the downloaded file name, e.g. "arban-page-202" */
  fileStem: string;
  /** Ready-made YouTube title for the exercise (copy button) */
  suggestedTitle: string;
  onClose: () => void;
  /** Open the submission form to paste the uploaded link */
  onSubmitLink: () => void;
}

type Stage = 'idle' | 'live' | 'recording' | 'recorded';

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(t =>
    MediaRecorder.isTypeSupported(t)
  );
}

export default function RecorderOverlay({
  fileStem,
  suggestedTitle,
  onClose,
  onSubmitLink,
}: RecorderOverlayProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [fileExt, setFileExt] = useState('webm');
  const [copied, setCopied] = useState(false);
  // While recording the card collapses to a tiny pill so the top line of
  // music isn't covered; this re-opens the preview to check the framing
  const [previewDuringRec, setPreviewDuringRec] = useState(false);
  // Set when navigator.share() rejected for a real reason (not a dismissed
  // sheet); switches the recorded view back to the download-first layout
  const [shareFailed, setShareFailed] = useState(false);

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
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
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
    } catch {
      setError('Could not access the camera/microphone. Check the browser permissions.');
    }
  };

  // Attach the live stream to the preview element whenever it renders
  useEffect(() => {
    if ((stage === 'live' || stage === 'recording') && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage, previewDuringRec]);

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
      setRecordedBlob(blob);
      setRecordingUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      stopStream();
      setStage('recorded');
    };
    recorder.start();
    recorderRef.current = recorder;
    setPreviewDuringRec(false);
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
    setRecordedBlob(null);
    setShareFailed(false);
    startCamera();
  };

  // On Android/iOS the system share sheet can hand the video file straight
  // to the YouTube app's upload flow - far more reliable than a
  // youtube.com/upload link, which Android reroutes to the app where it
  // dead-ends. Desktop browsers don't support file sharing and keep the
  // download + upload-page flow.
  //
  // The file's MIME type must be the bare container type: MediaRecorder
  // reports e.g. "video/webm;codecs=vp8,opus", and Chrome validates
  // shareable files against plain types - the codecs suffix makes share()
  // reject instantly.
  const recordedFile = recordedBlob
    ? new File([recordedBlob], `${fileStem}.${fileExt}`, {
        type: (recordedBlob.type || 'video/webm').split(';')[0],
      })
    : null;
  const canShareFile =
    !shareFailed &&
    recordedFile !== null &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [recordedFile] });

  const shareToYouTube = async () => {
    if (!recordedFile) return;
    try {
      await navigator.share({ files: [recordedFile], title: suggestedTitle });
    } catch (err) {
      // Dismissing the share sheet is fine; anything else means sharing
      // doesn't work on this device - say so and fall back to download
      if ((err as DOMException)?.name === 'AbortError') return;
      setShareFailed(true);
      setError(
        'Sharing is not working on this device. Use Download, then upload the ' +
          'file in the YouTube app: tap + (Create) → Upload a video.'
      );
    }
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

  if (stage === 'recording' && !previewDuringRec) {
    // Collapsed while recording: just a REC pill so the music stays readable
    return (
      <div
        data-testid="recorder-pill"
        className="fixed right-2 top-24 sm:top-16 z-40 flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-gray-900/90 text-white rounded-full shadow-2xl text-sm"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
        <span className="font-mono">{formatTime(seconds)}</span>
        <button
          type="button"
          onClick={() => setPreviewDuringRec(true)}
          aria-label="Show the camera preview"
          title="Check the framing"
          className="p-1 rounded-full hover:bg-white/20 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={stopRecording}
          className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-full font-medium transition"
        >
          ■ Stop
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="recorder-overlay"
      className="fixed right-2 top-24 sm:top-16 z-40 w-60 sm:w-72 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-600 overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-red-600 text-white">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Record a take
        </span>
        <button
          onClick={onClose}
          aria-label="Close recorder"
          className="p-1 hover:bg-red-500 rounded transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-2.5 space-y-2 text-sm">
        {stage === 'idle' && (
          <>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              The music stays visible while you record. Nothing is uploaded -
              the take stays on your device.
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
            >
              Turn on camera
            </button>
          </>
        )}

        {(stage === 'live' || stage === 'recording') && (
          <>
            {/* Muted preview: players would hear themselves delayed */}
            <video ref={videoRef} autoPlay muted playsInline className="w-full rounded bg-black aspect-video" />
            {stage === 'live' ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium"
              >
                ● Start recording
              </button>
            ) : (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex-1 px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition text-sm font-medium"
                >
                  ■ Stop ({formatTime(seconds)})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDuringRec(false)}
                  aria-label="Hide the camera preview"
                  title="Collapse so the music is visible"
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
                >
                  ▾
                </button>
              </div>
            )}
          </>
        )}

        {stage === 'recorded' && recordingUrl && (
          <>
            <video src={recordingUrl} controls playsInline className="w-full rounded bg-black aspect-video" data-testid="recorded-playback" />
            {canShareFile ? (
              // Phones/tablets: the share sheet hands the file straight to
              // the YouTube app's upload flow
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={shareToYouTube}
                  data-testid="share-take"
                  className="col-span-2 px-2 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium"
                >
                  1. Share to YouTube…
                </button>
                <button
                  type="button"
                  onClick={onSubmitLink}
                  className="px-2 py-1.5 bg-green-700 text-white rounded hover:bg-green-600 transition text-xs font-medium"
                >
                  2. Save the link
                </button>
                <button
                  type="button"
                  onClick={retake}
                  className="px-2 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-xs"
                >
                  Retake
                </button>
                <a
                  href={recordingUrl}
                  download={`${fileStem}.${fileExt}`}
                  className="col-span-2 text-center text-xs text-blue-600 hover:underline"
                  data-testid="download-take"
                >
                  or download the file
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <a
                  href={recordingUrl}
                  download={`${fileStem}.${fileExt}`}
                  className="px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs font-medium text-center"
                  data-testid="download-take"
                >
                  1. Download
                </a>
                <a
                  href="https://www.youtube.com/upload"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs font-medium text-center"
                >
                  2. YouTube ↗
                </a>
                <button
                  type="button"
                  onClick={onSubmitLink}
                  className="px-2 py-1.5 bg-green-700 text-white rounded hover:bg-green-600 transition text-xs font-medium"
                >
                  3. Save the link
                </button>
                <button
                  type="button"
                  onClick={retake}
                  className="px-2 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-xs"
                >
                  Retake
                </button>
              </div>
            )}
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>
                Suggested title{' '}
                <button type="button" onClick={copyTitle} className="text-blue-600 hover:underline">
                  {copied ? 'copied ✓' : '(copy)'}
                </button>
                :
              </p>
              <p className="font-mono bg-gray-100 dark:bg-gray-900 rounded px-1.5 py-1 break-words" data-testid="suggested-title">
                {suggestedTitle}
              </p>
              <p>
                {canShareFile
                  ? 'Pick YouTube in the share sheet, finish the upload there ("Unlisted" works fine), then come back and save the video link.'
                  : '"Unlisted" visibility on YouTube works fine.'}
              </p>
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
