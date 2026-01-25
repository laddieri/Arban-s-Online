# Arban's Online - Interactive E-Book Viewer

An interactive web-based e-book viewer for Arban's Complete Conservatory Method for Trumpet/Cornet. This application allows you to read through the famous method book with a modern, user-friendly interface.

## Features

- 📖 **E-book Style Reading**: Smooth page-by-page navigation like a real book
- 📑 **Table of Contents**: Quick navigation to different sections of the method
- 🚀 **Fast Loading**: Image-based viewer loads 2-3x faster than PDF rendering
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- 🌓 **Dark Mode Support**: Automatically adapts to your system's color scheme
- 🔢 **Page Jumping**: Enter a specific page number to jump directly to it
- ⚡ **Smart Preloading**: Automatically preloads next/previous pages for instant navigation
- ☁️ **CDN-Powered**: Served from Cloudflare R2 for fast global access

## Prerequisites

- Node.js 18.0 or higher
- npm (comes with Node.js)
- A PDF copy of Arban's Complete Method
- Cloudflare account (free tier works great) or other image hosting

## Quick Start

### 1. Convert Your PDF to Images

```bash
# Install dependencies
pip install pdf2image Pillow

# Convert PDF to images (see scripts/README.md for detailed instructions)
python scripts/convert-pdf.py arbans-method.pdf
```

This creates a `pdf-pages` folder with numbered images (page-001.jpg, page-002.jpg, etc.)

See `scripts/README.md` for detailed conversion instructions and troubleshooting.

### 2. Upload Images to Cloudflare R2

1. Create a free Cloudflare account at https://cloudflare.com
2. Go to R2 Object Storage and create a bucket
3. Upload all images from the `pdf-pages` folder
4. Enable public access and get your public URL

See `HOSTING-GUIDE.md` for detailed hosting instructions.

### 3. Configure the Application

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your settings:
# - Add your Cloudflare R2 bucket URL
# - Set the total number of pages
# - Specify image format (jpg, png, or webp)
```

Example `.env.local`:
```bash
NEXT_PUBLIC_IMAGE_BASE_URL=https://pub-abc123.r2.dev
NEXT_PUBLIC_TOTAL_PAGES=350
NEXT_PUBLIC_IMAGE_FORMAT=jpg
```

See `SETUP-GUIDE.md` for detailed configuration instructions.

### 4. Install Dependencies and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

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

The table of contents is defined in `components/TableOfContents.tsx:20`. You'll need to update the page numbers to match your specific book:

```typescript
const sections: Section[] = [
  {
    title: "Title Page & Introduction",
    page: 1,  // Update this to match your book
  },
  // ... more sections
];
```

To find the correct page numbers:
1. Run the application
2. Navigate to each major section using the image viewer
3. Note the page number shown in the navigation bar
4. Update the `sections` array in `components/TableOfContents.tsx`

## Project Structure

```
Arban-s-Online/
├── app/
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Main page with sidebar and viewer
│   └── globals.css             # Global styles
├── components/
│   ├── ImageViewer.tsx         # Image viewer with navigation
│   ├── PDFViewer.tsx           # Legacy PDF viewer (not used)
│   └── TableOfContents.tsx     # Navigation sidebar
├── config/
│   └── app.config.ts           # Application configuration
├── scripts/
│   ├── convert-pdf.py          # Python script to convert PDF
│   ├── convert-pdf.sh          # Bash script to convert PDF
│   ├── convert-pdf-windows.bat # Windows batch script
│   └── README.md               # Conversion guide
├── .env.example                # Example environment variables
├── .env.local                  # Your settings (create this)
├── SETUP-GUIDE.md              # Detailed setup instructions
├── HOSTING-GUIDE.md            # Hosting options guide
├── next.config.js              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Project dependencies
```

## Technologies Used

- **Next.js 15**: React framework for production
- **Image-Based Architecture**: Fast loading with CDN caching (2-3x faster than PDF)
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Cloudflare R2**: Object storage with zero egress fees
- **Smart Preloading**: Automatically loads next/previous pages

## Customization

### Changing Image Settings

Edit `.env.local` to change your image configuration:

```bash
# Use a different bucket or hosting service
NEXT_PUBLIC_IMAGE_BASE_URL=https://your-custom-url.com

# Update total pages
NEXT_PUBLIC_TOTAL_PAGES=400

# Change image format
NEXT_PUBLIC_IMAGE_FORMAT=webp
```

### Using Different Image Naming

If your images use a different naming pattern, edit `components/ImageViewer.tsx:48`:

```typescript
const getImageUrl = (pageNum: number) => {
  const paddedNum = formatPageNumber(pageNum);
  // Change this pattern to match your images
  return `${baseUrl}/page-${paddedNum}.${imageFormat}`;
}
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
- Full-text search (if using OCR on images)
- Page zoom controls
- Print individual pages

## Troubleshooting

### Images Not Loading

**Check your configuration:**
- Verify `.env.local` has the correct `NEXT_PUBLIC_IMAGE_BASE_URL`
- Test the URL directly in browser: `https://your-bucket/page-001.jpg`
- Check browser console (F12) for error messages

**Common issues:**
- Bucket is not public (enable public access in Cloudflare R2)
- CORS is not configured (see SETUP-GUIDE.md)
- Wrong image format in config (check if using jpg, png, or webp)
- Images in subfolder but URL doesn't include it

See `SETUP-GUIDE.md` for detailed troubleshooting.

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
