'use client';

import { useState } from 'react';

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
// Page numbers should be updated based on your actual PDF
const sections: Section[] = [
  {
    title: "Title Page & Introduction",
    page: 0,
  },
  {
    title: "Part 1: First Studies",
    page: 18,
    subsections: [
      { title: "The Study of Syncopation", page: 10 },
      { title: "The Turn or Gruppetto", page: 91 },
      { title: "The Trill", page: 118 },
    ],
  },
  {
    title: "Part 2: The Art of Phrasing",
    page: 198,
    subsections: [
      { title: "150 Classic and Popular Melodies", page: 198 },
      { title: "68 Duets", page: 253 },
    ],
  },
  {
    title: "Part 3: Characteristic Studies",
    page: 292,
    subsections: [
      { title: "#1", page: 292 },
      { title: "#2", page: 293 },
      { title: "#3", page: 294 },
      { title: "#4", page: 295 },
      { title: "#5", page: 296 },
      { title: "#6", page: 297 },
      { title: "#7", page: 298 },
      { title: "#8", page: 299 },
      { title: "#9", page: 300 },
      { title: "#10", page: 301 },
      { title: "#11", page: 302 },
      { title: "#12", page: 303 },
      { title: "#13", page: 304 },
      { title: "#14", page: 305 },
    ],
  },
  {
    title: "Celebrated Fantaisies and Airs Variés",
    page: 307,
    subsections: [
      { title: "Fantasie and Variations on a Cavatina", page: 308 },
      { title: "Fantasie and Variations on Acteon", page: 312 },
      { title: "Fantasie Brilliante", page: 316 },
      { title: "Variations on a Tyrolean Song", page: 320 },
      { title: "Variations on a song 'The Beautiful Snow'", page: 324 },
      { title: "Cavatina and Variations", page: 327 },
      { title: "Air Varie on a Folk Song 'The Little Swiss Boy'", page: 330 },
      { title: "Fantasie and Variations on a German Theme", page: 338 },
      { title: "Variations on a favorite theme by C.M. von Weber", page: 342 },
      { title: "Fantasie and Variations on the Carnival of Venice", page: 346 },
      { title: "Variations on a theme from Norma by V. Bellini", page: 351 },
    ],
  },
  {
    title: "Part 4: Tonguing Exercises",
    page: 160,
    subsections: [
      { title: "Single Tonguing", page: 115 },
      { title: "Double Tonguing", page: 182 },
      { title: "Triple Tonguing", page: 162 },
    ],
  },
  {
    title: "Part 5: Scales and Arpeggios",
    page: 65,
    subsections: [
      { title: "Major Scales", page: 66 },
      { title: "Minor Scales", page: 82 },
      { title: "Chromatic Scales", page: 83 },
    ],
  },
];

export default function TableOfContents({ onPageSelect, currentPage }: TableOfContentsProps) {
  // Track which sections are expanded (by index)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5]));

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
                        p.{section.page}
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
                            p.{subsection.page}
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
