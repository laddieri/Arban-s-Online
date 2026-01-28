'use client';

import { useState } from 'react';
import { formatDisplayPageNumber } from '@/utils/pageFormat';
import { appConfig } from '@/config/app.config';

interface Section {
  title: string;
  page: number;
  subsections?: Section[];
}

interface TableOfContentsProps {
  onPageSelect: (page: number) => void;
  currentPage: number;
}

// Table of Contents based on typical Arban's Method structure
// Negative page numbers are preface pages (displayed as Roman numerals)
// Page numbers use the pageOffset to map to actual image files
const sections: Section[] = [
  {
    title: "Title Page and Introduction",
    page: -7,
    subsections: [
      { title: "Cover", page: -7 },
      { title: "Musical Terms", page: -6 },
      { title: "Report", page: -5 },
      { title: "Arban Biography", page: -4 },
      { title: "Preface", page: -3 },
      { title: "Table of Harmonics", page: -1 },
      { title: "Diagram of Cornet", page: 0 },
      { title: "Compass of Cornet", page: 1 },
      { title: "Position of Mouthpiece on the Lips", page: 3 },
      { title: "Style", page: 6 },
    ],
  },
  {
    title: "Part 1: First Studies",
    page: 11,
    subsections: [
      { title: "The Study of Syncopation", page: 23 },
      { title: "Studies on Dotted Eighth Notes", page: 26 },
      { title: "Studies of the Slur, Explanation", page: 37 },
      { title: "Studies of the Slur", page: 39 },
      { title: "Lip Trills", page: 44 },
    ],
  },
  {
    title: "Scale Studies",
    page: 57,
    subsections: [
      { title: "Major Scales", page: 59 },
      { title: "The Trill", page: 111 },
      { title: "The Turn or Gruppetto", page: 84 },
      { title: "The Trill", page: 111 },
    ],
  },
  {
    title: "Part 2: The Art of Phrasing",
    page: 191,
    subsections: [
      { title: "150 Classic and Popular Melodies", page: 191 },
      { title: "68 Duets", page: 246 },
    ],
  },
  {
    title: "Part 3: Characteristic Studies",
    page: 285,
    subsections: [
      { title: "#1", page: 285 },
      { title: "#2", page: 286 },
      { title: "#3", page: 287 },
      { title: "#4", page: 288 },
      { title: "#5", page: 289 },
      { title: "#6", page: 290 },
      { title: "#7", page: 291 },
      { title: "#8", page: 292 },
      { title: "#9", page: 293 },
      { title: "#10", page: 294 },
      { title: "#11", page: 295 },
      { title: "#12", page: 296 },
      { title: "#13", page: 297 },
      { title: "#14", page: 298 },
    ],
  },
  {
    title: "Celebrated Fantaisies and Airs Variés",
    page: 300,
    subsections: [
      { title: "Fantasie and Variations on a Cavatina", page: 301 },
      { title: "Fantasie and Variations on Acteon", page: 305 },
      { title: "Fantasie Brilliante", page: 309 },
      { title: "Variations on a Tyrolean Song", page: 313 },
      { title: "Variations on a song 'The Beautiful Snow'", page: 317 },
      { title: "Cavatina and Variations", page: 320 },
      { title: "Air Varie on a Folk Song 'The Little Swiss Boy'", page: 323 },
      { title: "Fantasie and Variations on a German Theme", page: 331 },
      { title: "Variations on a favorite theme by C.M. von Weber", page: 335 },
      { title: "Fantasie and Variations on the Carnival of Venice", page: 339 },
      { title: "Variations on a theme from Norma by V. Bellini", page: 344 },
    ],
  },
  {
    title: "Part 4: Tonguing Exercises",
    page: 153,
    subsections: [
      { title: "Single Tonguing", page: 108 },
      { title: "Double Tonguing", page: 175 },
      { title: "Triple Tonguing", page: 155 },
    ],
  },
  {
    title: "Part 5: Scales and Arpeggios",
    page: 58,
    subsections: [
      { title: "Major Scales", page: 59 },
      { title: "Minor Scales", page: 75 },
      { title: "Chromatic Scales", page: 76 },
    ],
  },
];

export default function TableOfContents({ onPageSelect, currentPage }: TableOfContentsProps) {
  // Track which sections are expanded (by index) - all collapsed by default
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const toggleSection = (index: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="h-full overflow-auto bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Table of Contents
        </h2>
        <div className="space-y-1">
          {sections.map((section, index) => {
            const isExpanded = expandedSections.has(index);
            const hasSubsections = section.subsections && section.subsections.length > 0;

            return (
              <div key={index}>
                <div className="flex items-center">
                  {/* Expand/collapse toggle */}
                  {hasSubsections ? (
                    <button
                      onClick={() => toggleSection(index)}
                      className="p-1 mr-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                      aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <span className="w-6" /> // Spacer for alignment
                  )}

                  {/* Section button */}
                  <button
                    onClick={() => onPageSelect(section.page)}
                    className={`flex-1 text-left px-3 py-2 rounded hover:bg-blue-50 dark:hover:bg-gray-800 transition ${
                      currentPage === section.page
                        ? 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{section.title}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        p.{formatDisplayPageNumber(section.page, appConfig.pageOffset)}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Subsections - collapsible */}
                {hasSubsections && (
                  <div
                    className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-200 ${
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    {section.subsections!.map((subsection, subIndex) => (
                      <button
                        key={subIndex}
                        onClick={() => onPageSelect(subsection.page)}
                        className={`w-full text-left px-3 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-gray-800 transition ${
                          currentPage === subsection.page
                            ? 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs">{subsection.title}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            p.{formatDisplayPageNumber(subsection.page, appConfig.pageOffset)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
