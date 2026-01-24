# Arban's Online - Interactive E-Book Viewer

An interactive web-based e-book viewer for Arban's Complete Conservatory Method for Trumpet/Cornet. This application allows you to read through the famous method book with a modern, user-friendly interface.

## Features

- 📖 **E-book Style Reading**: Scroll through pages smoothly like a digital book
- 📑 **Table of Contents**: Quick navigation to different sections of the method
- ⌨️ **Keyboard Navigation**: Use arrow keys or page controls to navigate
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🌓 **Dark Mode Support**: Automatically adapts to your system's color scheme
- 🔢 **Page Jumping**: Enter a specific page number to jump directly to it

## Prerequisites

- Node.js 18.0 or higher
- npm (comes with Node.js)
- A PDF copy of Arban's Complete Method (see instructions below)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Your PDF File

Place your PDF file in the `public` folder and name it `arbans-method.pdf`:

```
public/arbans-method.pdf
```

See `public/PDF-INSTRUCTIONS.md` for more details.

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 4. Build for Production

```bash
npm run build
npm start
```

## Usage

### Navigation

- **Table of Contents**: Click on any section in the left sidebar to jump to that page
- **Page Controls**: Use the Previous/Next buttons at the bottom to navigate sequentially
- **Direct Page Entry**: Type a page number in the input field to jump to a specific page
- **Mobile Menu**: On mobile devices, tap the menu icon to show/hide the table of contents

### Customizing the Table of Contents

The table of contents is defined in `components/TableOfContents.tsx`. You'll need to update the page numbers to match your specific PDF:

```typescript
const sections: Section[] = [
  {
    title: "Title Page & Introduction",
    page: 1,  // Update this to match your PDF
  },
  // ... more sections
];
```

To find the correct page numbers:
1. Open your PDF in the application
2. Navigate to each major section
3. Note the page number
4. Update the `sections` array in `components/TableOfContents.tsx`

## Project Structure

```
Arban-s-Online/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main page with sidebar and viewer
│   └── globals.css         # Global styles
├── components/
│   ├── PDFViewer.tsx       # PDF rendering and page controls
│   └── TableOfContents.tsx # Navigation sidebar
├── public/
│   ├── arbans-method.pdf   # Your PDF file (not included)
│   └── PDF-INSTRUCTIONS.md # Instructions for adding the PDF
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
```

## Technologies Used

- **Next.js 15**: React framework for production
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **react-pdf**: PDF rendering library
- **PDF.js**: Mozilla's PDF rendering engine

## Customization

### Changing the PDF Path

Edit `app/page.tsx` and change the `pdfUrl` prop:

```typescript
<PDFViewer
  pdfUrl="/your-custom-filename.pdf"
  currentPage={currentPage}
  onPageChange={handlePageChange}
/>
```

### Styling

The application uses Tailwind CSS. You can customize colors and styling in:
- `tailwind.config.ts` - Theme configuration
- `app/globals.css` - Global styles
- Component files - Component-specific styles

### Adding More Features

Some ideas for extensions:
- Bookmark favorite pages
- Add practice notes to specific exercises
- Create custom practice routines
- Add audio playback for exercises
- Implement search functionality

## Troubleshooting

### PDF Not Loading

- Verify the PDF file is in `public/arbans-method.pdf`
- Check browser console for errors
- Ensure the PDF is not corrupted
- Try with a different PDF to isolate the issue

### Build Errors

If you encounter build errors:
```bash
rm -rf node_modules .next
npm install
npm run dev
```

### Styling Issues

Clear your browser cache and hard reload (Ctrl+Shift+R or Cmd+Shift+R)

## License

This code is provided as-is for educational purposes. Please ensure you have the legal right to use any PDF files with this viewer.

The Arban's Complete Conservatory Method book is in the public domain in most countries, but verify the copyright status in your jurisdiction.

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## Acknowledgments

- Jean-Baptiste Arban for creating this timeless method book
- The open-source community for the excellent tools and libraries
- IMSLP for preserving and sharing public domain music scores
