// Table of Contents data for Arban's Complete Method.
// Negative page numbers are preface pages (displayed as Roman numerals).
// Shared by the sidebar tree (TableOfContents) and search (utils/tocSearch).

export interface Section {
  title: string;
  page: number;
  subsections?: Section[];
}

export const sections: Section[] = [
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
    title: "First Studies",
    page: 11,
    subsections: [
      {
        title: "First Studies",
        page: 11,
        subsections: [
          { title: "#1 --> #6", page: 11 },
          { title: "#7 -->#9", page: 12 },
        ],
      },
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
      { title: "Minor Scales", page: 75 },
      { title: "Chromatic Scales", page: 76 },
      { title: "Chromatic Triples", page: 80 },
    ],
  },
  {
    title: "Grace Notes",
    page: 87,
    subsections: [
      { title: "Preparatory Exercises on the Gruppetto", page: 91 },
      { title: "The Gruppetto", page: 99 },
      { title: "The Double Appoggiatura", page: 104 },
      { title: "The Simple Appoggiatura", page: 106 },
      { title: "The Portamento", page: 110 },
      { title: "The Trill or Shake", page: 111 },
      { title: "The Mordant", page: 120 },
    ],
  },
  {
    title: "More Advanced Studies",
    page: 123,
    subsections: [
      { title: "Studies on the Intervals", page: 125 },
      { title: "Octaves and Tenths", page: 131 },
      { title: "Exercises on Triplets", page: 132 },
      { title: "Exercises on Sixteenth Notes", page: 137 },
      { title: "Major and Minor Chords", page: 142 },
      { title: "The Chord of the Dominant Seventh", page: 147 },
      { title: "The Chord of the Diminished Seventh", page: 149 },
      { title: "Cadenzas", page: 152 },
    ],
  },
  {
    title: "Tonguing",
    page: 153,
    subsections: [
      { title: "Triple Tonguing", page: 155 },
      { title: "Double Tonguing", page: 175 },
      { title: "The Slur and Double Tonguing", page: 183 },
      { title: "Tonguing as Applied to the Trumpet", page: 188 },
    ],
  },
  {
    title: "The Art of Phrasing",
    page: 191,
    subsections: [
      { title: "150 Classic and Popular Melodies", page: 191 },
      { title: "68 Duets", page: 246 },
    ],
  },
  {
    title: "Characteristic Studies",
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
];
