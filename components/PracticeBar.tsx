'use client';

// Slim bar shown while practicing a list: current position and one-tap
// movement through the list's exercises (across books when items span them).

export interface PracticeItem {
  book: string;
  page: number;
  title: string | null;
}

export interface PracticeSession {
  name: string;
  items: PracticeItem[];
  index: number;
}

interface PracticeBarProps {
  session: PracticeSession;
  onJump: (index: number) => void;
  onExit: () => void;
}

export default function PracticeBar({ session, onJump, onExit }: PracticeBarProps) {
  const { name, items, index } = session;
  const item = items[index];
  const label = item?.title?.trim() || `Page ${item?.page ?? '?'}`;

  return (
    <div
      data-testid="practice-bar"
      className="bg-indigo-700 text-white px-3 py-1.5 flex items-center gap-2 text-sm shadow-md z-20"
    >
      <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
      <span className="font-medium truncate max-w-[30%]" title={name}>
        {name}
      </span>
      <span className="opacity-80 shrink-0">
        {index + 1} / {items.length}
      </span>
      <span className="truncate flex-1 opacity-90" title={label}>
        {label}
      </span>
      <button
        onClick={() => onJump(index - 1)}
        disabled={index <= 0}
        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
        title="Previous exercise in the list"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => onJump(index + 1)}
        disabled={index >= items.length - 1}
        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
        title="Next exercise in the list"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button
        onClick={onExit}
        className="px-2 py-1 rounded hover:bg-indigo-600 transition shrink-0"
        title="Stop practicing this list"
        aria-label="Stop practicing this list"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
