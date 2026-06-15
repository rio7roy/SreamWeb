const fs = require('fs');
const path = require('path');

// pdf-parse was already installed
const { PDFParse } = require('pdf-parse');

const pdfPath = path.resolve('C:/Users/maria/Downloads/HUB item - Copy of STREAM 2026.pdf');

async function extractPdf() {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse();
  const data = await parser.loadPDF(dataBuffer);
  
  const text = data.getAllTexts ? data.getAllTexts().join('\n') : JSON.stringify(data, null, 2);
  const outputPath = path.resolve(__dirname, 'data', 'pdf_extracted_text.txt');
  fs.writeFileSync(outputPath, text);
  console.log('Saved to:', outputPath);
  console.log('\n--- First 3000 chars ---\n');
  console.log(text.substring(0, 3000));
}

extractPdf().catch(err => console.error('Error:', err.message));
