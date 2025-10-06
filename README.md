# Nutrient Web SDK - Custom Redaction Sidebar with JSON-based Auto-marking

This project demonstrates a React + Vite application that integrates **Nutrient Web SDK** (formerly PSPDFKit) to automatically mark areas for redaction based on JSON data and display them in a custom sidebar.

## 🎯 Features

- **JSON-based Automatic Redaction Marking**: Automatically creates redaction annotations from JSON data containing page indices and bounding boxes
- **Custom Redaction Sidebar**: Interactive sidebar showing all marked redactions with:
  - Page number and extracted text preview
  - Click-to-navigate functionality
  - Accept/Reject buttons for each redaction
- **Real-time Updates**: Sidebar automatically updates when redactions are added, modified, or removed
- **Text Extraction**: Extracts and displays the actual text content under each redaction area
- **Custom Tooltip Actions**: Accept/Reject options directly on annotation tooltips
- **CDN-based Integration**: Uses Nutrient Web SDK via CDN (no npm package required)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A valid Nutrient Web SDK license key
- A PDF document for testing

## 🚀 Getting Started

### 1. Installation

```bash
# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_lkey=YOUR_NUTRIENT_LICENSE_KEY_HERE
```

Replace `YOUR_NUTRIENT_LICENSE_KEY_HERE` with your actual Nutrient Web SDK license key.

### 3. Add Your PDF

Place your PDF file in the `public` directory (e.g., `public/document.pdf`)

### 4. Run the Development Server

```bash
npm run dev
```
### Demo


https://github.com/user-attachments/assets/fb4b4ece-86bc-4e60-a14e-3183b94f9fd6



The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
├── public/
│   └── document.pdf          # Your PDF document
├── src/
│   ├── components/
│   │   └── pdf-viewer-component.jsx  # Main PDF viewer component
│   ├── app.jsx               # App component
│   └── main.jsx              # Entry point
├── index.html                # HTML template with Nutrient CDN
├── .env                      # Environment variables (license key)
├── package.json
└── README.md
```

## 🔧 How It Works

### 1. JSON Data Format

The redaction data is defined as a JSON array with the following structure:

```javascript
const TobeRedacted = `[
  {
    "pageindex": 0,
    "boundingbox": {
      "left": 73.248,
      "top": 128.559,
      "width": 82.425,
      "height": 33.175
    }
  },
  {
    "pageindex": 1,
    "boundingbox": {
      "left": 416.525,
      "top": 266.812,
      "width": 37.332,
      "height": 15.846
    }
  }
]`;
```

**Properties:**
- `pageindex` (number): Zero-based page index where the redaction should be placed
- `boundingbox` (object): Coordinates and dimensions of the redaction area
  - `left` (number): X-coordinate from the left edge
  - `top` (number): Y-coordinate from the top edge
  - `width` (number): Width of the redaction box
  - `height` (number): Height of the redaction box

### 2. Automatic Redaction Creation

When the PDF loads, the application:

1. **Parses the JSON data** into an array of redaction objects
2. **Creates RedactionAnnotation instances** for each item:
   ```javascript
   const rect = new window.NutrientViewer.Geometry.Rect({
     left: boundingbox.left,
     top: boundingbox.top,
     width: boundingbox.width,
     height: boundingbox.height,
   });

   const redactionAnnotation =
     new window.NutrientViewer.Annotations.RedactionAnnotation({
       pageIndex: pageindex,
       boundingBox: rect,
       rects: window.NutrientViewer.Immutable.List([rect]),
     });
   ```
3. **Adds all annotations** to the PDF instance at once
4. **Triggers automatic sidebar update** via event listeners

### 3. Text Extraction

The `extractTextFromRedaction` function:

1. Retrieves all text lines for the specified page
2. Filters text lines that intersect with the redaction bounding box
3. Joins the intersecting text into a readable string
4. Returns the extracted text to display in the sidebar

```javascript
const extractTextFromRedaction = async (instance, pageIndex, boundingBox) => {
  const textLines = await instance.textLinesForPageIndex(pageIndex);
  const intersectingText = textLines
    .filter((textLine) => {
      const textBounds = textLine.boundingBox;
      return !(
        textBounds.left > boundingBox.left + boundingBox.width ||
        textBounds.left + textBounds.width < boundingBox.left ||
        textBounds.top > boundingBox.top + boundingBox.height ||
        textBounds.top + textBounds.height < boundingBox.top
      );
    })
    .map((textLine) => textLine.contents)
    .join(" ");
  return intersectingText.trim();
};
```

### 4. Custom Sidebar

The custom sidebar (`redactionSidebar`) features:

- **Header**: Shows title and count of redactions
- **Scrollable list**: Displays all redaction items with:
  - Page number indicator
  - Extracted text preview (truncated to 3 lines)
  - Accept button (green) - applies only that redaction
  - Reject button (red) - removes the redaction annotation
- **Click navigation**: Clicking an item jumps to the redaction location

### 5. Accept/Reject Functionality

#### Accept Redaction
```javascript
const acceptRedaction = async (redaction) => {
  // 1. Get all redaction annotations from all pages
  // 2. Temporarily remove other redactions
  // 3. Apply only the selected redaction
  // 4. Restore other redactions
  // 5. Update sidebar
  // Or alternatively you can remove the accept button and logic and create one single apply all Redaction button at top, so that the you can avoid the loop of 1 to 5 steps as this may have impact if the document is too big. 
};
```

#### Reject Redaction
```javascript
const rejectRedaction = async (redaction) => {
  // 1. Find the annotation by ID
  // 2. Delete the annotation
  // 3. Update sidebar
};
```

### 6. Event Listeners

The application listens for annotation changes to keep the sidebar synchronized:

```javascript
// Listen for any annotation changes
instance.addEventListener("annotations.change", async () => {
  if (viewState.sidebarMode === "redactionSidebar") {
    await updateSidebarContent();
  }
});

// Listen for annotation creation
instance.addEventListener("annotations.create", async (annotation) => {
  if (annotation instanceof window.NutrientViewer.Annotations.RedactionAnnotation) {
    await updateSidebarContent();
  }
});

// Listen for annotation deletion
instance.addEventListener("annotations.delete", async () => {
  await updateSidebarContent();
});
```

## 🎨 Customization

### Modifying the JSON Data

Update the `TobeRedacted` constant in [src/components/pdf-viewer-component.jsx](src/components/pdf-viewer-component.jsx):

```javascript
const TobeRedacted = `[
  {
    "pageindex": 0,
    "boundingbox": {
      "left": 100,
      "top": 200,
      "width": 150,
      "height": 30
    }
  }
]`;
```

### Styling the Sidebar

Modify the inline styles in the `updateSidebarContent` function to change:
- Colors
- Fonts
- Spacing
- Button styles
- Hover effects

### Changing Redaction Appearance

Customize redaction annotations by adding properties:

```javascript
const redactionAnnotation =
  new window.NutrientViewer.Annotations.RedactionAnnotation({
    pageIndex: pageindex,
    boundingBox: rect,
    rects: window.NutrientViewer.Immutable.List([rect]),
    fillColor: new window.NutrientViewer.Color({ r: 0, g: 0, b: 0 }), // Black fill
    overlayText: "REDACTED", // Text overlay
  });
```

## 🛠️ Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

## 📚 Key Concepts

### RedactionAnnotation
Represents an area to be redacted. Properties:
- `pageIndex`: Page where the redaction appears
- `boundingBox`: Overall bounding box of the redaction
- `rects`: Immutable list of rectangles (required, must contain at least one rect)
- `fillColor`: Color of the redaction overlay
- `overlayText`: Text to display over redacted area

### Immutable.List
Nutrient uses Immutable.js for data structures. Always wrap arrays in `Immutable.List()`:
```javascript
window.NutrientViewer.Immutable.List([rect1, rect2])
```

### Apply Redactions
Permanently removes content under redaction annotations:
```javascript
await instance.applyRedactions();
```
**Note**: This is irreversible. The redaction annotation is removed and the content is permanently deleted.

## 🔍 Debugging

Enable verbose logging by checking the browser console for:
- `"Nutrient Viewer loaded successfully"`
- `"Created X redaction annotations from JSON"`
- `"Annotations changed, updating sidebar..."`
- `"All Redactions:"` (shows current redactions)

## ⚠️ Important Notes

1. **License Key**: Ensure your Nutrient license key is valid and has redaction features enabled
2. **CDN Version**: This project uses the CDN version. Check `index.html` for the script URL
3. **Browser Compatibility**: Modern browsers (Chrome, Firefox, Safari, Edge) are supported
4. **Coordinates**: Bounding box coordinates are in PDF points (1/72 inch)
5. **Applied Redactions**: Once applied, redactions permanently remove content from the PDF

## 🤝 Support

For issues related to:
- **Nutrient Web SDK**: Contact [Nutrient Support](https://nutrient.io/support/)
- **This Project**: Check the code comments in [src/components/pdf-viewer-component.jsx](src/components/pdf-viewer-component.jsx)

## 📄 License

This project is for demonstration purposes. Nutrient Web SDK requires a commercial license.

---

**Built with React + Vite + Nutrient Web SDK**
