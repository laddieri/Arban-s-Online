'use client';

import { useState, useMemo } from 'react';
import { formatDisplayPageNumber } from '@/utils/pageFormat';
import { Section } from '@/config/tocSections';
import type { Book } from '@/config/books';
import { useBooks } from '@/hooks/useBooks';
import { searchToc } from '@/utils/tocSearch';

interface TableOfContentsProps {
  book: Book;
  onBookChange: (bookId: string) => void;
  onPageSelect: (page: number) => void;
  currentPage: number;
}


export default function TableOfContents({ book, onBookChange, onPageSelect, currentPage }: TableOfContentsProps) {
  const { books } = useBooks();
  // Track which sections are expanded by key (e.g. "0", "0-1", "0-1-2" for nested)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  const searchResults = useMemo(
    () => searchToc(query, book),
    [query, book]
  );

  const toggleSection = (key: string, depth: number) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Collapse this section and all children
        for (const k of prev) {
          if (k === key || k.startsWith(key + '-')) {
            next.delete(k);
          }
        }
      } else {
        // Accordion at top level: close other top-level sections
        if (depth === 0) {
          for (const k of prev) {
            next.delete(k);
          }
        }
        next.add(key);
      }
      return next;
    });
  };

  const renderSection = (section: Section, key: string, depth: number) => {
    const isExpanded = expandedKeys.has(key);
    const hasSubsections = section.subsections && section.subsections.length > 0;
    const textSize = depth === 0 ? 'text-sm' : 'text-xs';
    const py = depth === 0 ? 'py-2' : 'py-1.5';
    const textColor = depth === 0
      ? 'text-gray-700 dark:text-gray-300'
      : 'text-gray-600 dark:text-gray-400';

    return (
      <div key={key}>
        <div className="flex items-center">
          {/* Expand/collapse toggle */}
          {hasSubsections ? (
            <button
              onClick={() => toggleSection(key, depth)}
              className="p-1 mr-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 active:bg-blue-200 dark:active:bg-gray-600 rounded transition flex-shrink-0"
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
            <span className="w-6 flex-shrink-0" /> // Spacer for alignment
          )}

          {/* Section button */}
          <button
            onClick={() => hasSubsections ? toggleSection(key, depth) : onPageSelect(section.page)}
            className={`flex-1 text-left px-3 ${py} rounded hover:bg-blue-50 dark:hover:bg-gray-800 active:bg-blue-200 dark:active:bg-gray-600 transition ${
              currentPage === section.page
                ? 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-blue-300 font-semibold'
                : textColor
            }`}
          >
            <div className="flex justify-between items-center">
              <span className={textSize}>{section.title}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                p.{formatDisplayPageNumber(section.page, book.pageOffset)}
              </span>
            </div>
          </button>
        </div>

        {/* Subsections - collapsible */}
        {hasSubsections && (
          <div
            className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-200 ${
              isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {section.subsections!.map((subsection, subIndex) =>
              renderSection(subsection, `${key}-${subIndex}`, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Table of Contents
        </h2>

        {/* Book switcher - only shown once there is more than one book */}
        {books.length > 1 && (
          <select
            value={book.id}
            onChange={(e) => onBookChange(e.target.value)}
            aria-label="Select book"
            className="w-full mb-3 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer"
          >
            {books.map(b => (
              <option key={b.id} value={b.id}>{b.shortTitle}</option>
            ))}
          </select>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults.length > 0) {
                onPageSelect(searchResults[0].page);
                setQuery('');
              } else if (e.key === 'Escape') {
                setQuery('');
              }
            }}
            placeholder="Search exercises or page #"
            aria-label="Search table of contents"
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {query.trim() ? (
          /* Search results */
          <div className="space-y-1" data-testid="toc-search-results">
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 px-1">
                No matches. Try an exercise name or a page number.
              </p>
            ) : (
              searchResults.map((result, i) => (
                <button
                  key={`${result.page}-${i}`}
                  onClick={() => {
                    onPageSelect(result.page);
                    setQuery('');
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 dark:hover:bg-gray-800 active:bg-blue-200 dark:active:bg-gray-600 transition"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="min-w-0">
                      <span className={`text-sm block truncate ${result.isPageJump ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                        {result.title}
                      </span>
                      {result.context && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
                          {result.context}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      p.{formatDisplayPageNumber(result.page, book.pageOffset)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          /* Section tree */
          <div className="space-y-1">
            {book.sections.map((section, index) =>
              renderSection(section, String(index), 0)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
