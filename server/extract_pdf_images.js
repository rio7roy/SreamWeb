const fs = require('fs');
const path = require('path');
const { exportImages } = require('pdf-export-images');

const pdfPath = 'C:/Users/maria/Downloads/HUB item - Copy of STREAM 2026.pdf';
const outputDir = path.resolve(__dirname, 'public', 'uploads', 'pdf_images');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function extract() {
  console.log('Extracting images from PDF...');
  try {
    const images = await exportImages(pdfPath, outputDir);
    console.log(`✅ Extracted ${images.length} images to ${outputDir}`);
    
    // List first few images
    images.slice(0, 10).forEach((img, idx) => {
      console.log(`  ${idx+1}. ${img.name}`);
    });
  } catch (err) {
    console.error('Error extracting images:', err);
  }
}

extract();
