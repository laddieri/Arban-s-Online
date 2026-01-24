# PDF File Instructions

To use this Arban's Method e-book viewer, you need to add your PDF file.

## Steps:

1. Place your Arban's Method PDF file in this `public` folder
2. Rename it to `arbans-method.pdf`
3. The file should be located at: `public/arbans-method.pdf`

## Important Notes:

- The PDF file is excluded from git (see `.gitignore`) because PDF files are typically too large for version control
- Make sure you have the legal right to use the PDF file
- The recommended file is the public domain version of Arban's Complete Conservatory Method for Trumpet

## Alternative Approach:

If you want to use a different filename or location, you can update the path in `app/page.tsx`:

```typescript
<PDFViewer
  pdfUrl="/your-custom-filename.pdf"  // Change this line
  currentPage={currentPage}
  onPageChange={handlePageChange}
/>
```

## Finding the PDF:

The complete Arban's method book is available from various sources:
- Public domain versions can be found at IMSLP (International Music Score Library Project)
- Check your local music library
- Purchase from music retailers

Once you have the PDF file in place, the viewer will automatically load it when you run the application.
