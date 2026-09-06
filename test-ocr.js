const { extractTextWithOcr } = require('./lib/ocr');

const fs = require('fs');
const base64 = fs.readFileSync('./test.pdf', { encoding: 'base64' });

console.log('Testing OCR with base64 length:', base64.length);
console.log('OCR_SPACE_API_KEY from env:', process.env.OCR_SPACE_API_KEY ? 'present' : 'missing');

extractTextWithOcr(base64, 'PDF')
  .then(result => {
    console.log('OCR Result:', result);
    if (result.error) {
      console.error('OCR Error:', result.error);
    } else {
      console.log('OCR Text:', result.text.substring(0, 200) + (result.text.length > 200 ? '...' : ''));
    }
  })
  .catch(err => {
    console.error('Failed to call OCR:', err);
  });