const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('C:\\Users\\maria\\Downloads\\Stream Ecosystem Hub Items Check List 1 .pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text.substring(0, 1000));
}).catch(function(err) {
    console.error('Error:', err);
});
