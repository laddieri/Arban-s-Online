'use client';

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
    page: 1,
  },
  {
    title: "Part 1: First Studies",
    page: 5,
    subsections: [
      { title: "The Study of Syncopation", page: 10 },
      { title: "The Turn or Gruppetto", page: 15 },
      { title: "The Trill", page: 20 },
    ],
  },
  {
    title: "Part 2: The Art of Phrasing",
    page: 30,
    subsections: [
      { title: "150 Classic and Popular Melodies", page: 35 },
      { title: "Celebrated Fantaisies and Airs Variés", page: 50 },
    ],
  },
  {
    title: "Part 3: Characteristic Studies",
    page: 80,
    subsections: [
      { title: "14 Characteristic Studies", page: 85 },
      { title: "Grand Method", page: 95 },
    ],
  },
  {
    title: "Part 4: Tonguing Exercises",
    page: 110,
    subsections: [
      { title: "Single Tonguing", page: 115 },
      { title: "Double Tonguing", page: 125 },
      { title: "Triple Tonguing", page: 135 },
    ],
  },
  {
    title: "Part 5: Scales and Arpeggios",
    page: 145,
    subsections: [
      { title: "Major Scales", page: 150 },
      { title: "Minor Scales", page: 160 },
      { title: "Chromatic Scales", page: 170 },
    ],
  },
];

export default function TableOfContents({ onPageSelect, currentPage }: TableOfContentsProps) {
  return (
    <div className="h-full overflow-auto bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Table of Contents
        </h2>
        <div className="space-y-1">
          {sections.map((section, index) => (
            <div key={index}>
              <button
                onClick={() => onPageSelect(section.page)}
                className={`w-full text-left px-3 py-2 rounded hover:bg-blue-50 dark:hover:bg-gray-800 transition ${
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
              {section.subsections && (
                <div className="ml-4 mt-1 space-y-1">
                  {section.subsections.map((subsection, subIndex) => (
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
          ))}
        </div>
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Page numbers in the table of contents are placeholder values.
            Update them in <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">components/TableOfContents.tsx</code> to match your PDF.
          </p>
        </div>
      </div>
    </div>
  );
}
