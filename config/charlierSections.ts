import { Section } from './tocSections';

// Table of Contents for Charlier's "36 Études Transcendantes".
// Titles and page numbers extracted from the page scans via OCR
// (scripts/pdf-extract.py + scripts/extract-exercise-titles.mjs) and
// cross-checked against the printed page numbers. Page numbers are the
// book's printed page numbers (which equal the scan's page position, so
// pageOffset is -1: display page N maps to image page-(N-1)).

export const charlierSections: Section[] = [
  {
    title: 'Front Matter',
    page: 1,
    subsections: [
      { title: 'Cover', page: 1 },
      { title: 'Avant-propos', page: 2 },
      { title: 'Note des éditeurs', page: 3 },
    ],
  },
  {
    title: '36 Études',
    page: 4,
    subsections: [
      { title: "No. 1 — De l'articulation", page: 4 },
      { title: 'No. 2 — Du style', page: 5 },
      { title: 'No. 3 — Intervalles (Les tierces)', page: 6 },
      { title: 'No. 4 — Du style', page: 8 },
      { title: "No. 5 — De l'articulation", page: 10 },
      { title: 'No. 6 — Andante cantabile', page: 12 },
      { title: 'No. 7 — Du mécanisme', page: 14 },
      { title: 'No. 8 — Intervalles (Les quartes)', page: 16 },
      { title: 'No. 9 — Scherzetto', page: 18 },
      { title: 'No. 10 — Du rythme', page: 20 },
      { title: 'No. 11 — Fantaisie', page: 22 },
      { title: 'No. 12 — Étude moderne', page: 24 },
      { title: 'No. 13 — Prélude', page: 26 },
      { title: "No. 14 — Pour l'exercice du 3e doigt", page: 27 },
      { title: 'No. 15 — Intervalles (Les quintes)', page: 28 },
      { title: 'No. 16 — Du staccato binaire', page: 30 },
      { title: 'No. 17 — Intervalles (Les sixtes)', page: 32 },
      { title: 'No. 18 — Du staccato ternaire', page: 34 },
      { title: 'No. 19 — Intervalles (Les septièmes)', page: 36 },
      { title: 'No. 20 — Par mouvements conjoints et aux rythmes variés', page: 38 },
      { title: 'No. 21 — Les octaves', page: 40 },
      { title: 'No. 22 — Des différentes articulations du staccato', page: 42 },
      { title: "No. 23 — L'arpège", page: 44 },
      { title: 'No. 24 — À travers la partie de trompette de Richard Wagner', page: 46 },
      { title: 'No. 25 — Du coulé', page: 48 },
      { title: 'No. 26 — Chromatisme', page: 50 },
      { title: 'No. 27 — Fantaisie', page: 52 },
      { title: 'No. 28 — Du staccato ternaire', page: 54 },
      { title: 'No. 29 — Le mordant', page: 56 },
      { title: 'No. 30 — Marche', page: 58 },
      { title: 'No. 31 — En staccato binaire', page: 60 },
      { title: 'No. 32 — De la liaison des harmoniques', page: 62 },
      { title: 'No. 33 — En staccato ternaire', page: 64 },
      { title: 'No. 34 — Fantaisie rythmique', page: 66 },
      { title: 'No. 35 — Étude sur le coulé', page: 68 },
      { title: 'No. 36 — Les trilles', page: 70 },
    ],
  },
];
