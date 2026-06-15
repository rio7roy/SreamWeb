const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('C:/Users/maria/Downloads/Stream Ecosystem Hub Items Check List 1 .pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('pdf_text.txt', data.text);
    console.log('Saved to pdf_text.txt');
});
