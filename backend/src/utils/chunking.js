const pdfParse = require('pdf-parse');
const csvParser = require('csv-parser');
const { Readable } = require('stream');

/**
 * Extracts text from a PDF buffer and chunks it.
 * Chunking strategy: split by double newline, or 1000 chars with 200 overlap.
 */
async function processPdfBuffer(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text || '';
  
  if (!text.trim()) {
    return [];
  }
  
  const chunks = [];
  // First, try splitting by double newline to preserve paragraph structure
  const paragraphs = text.split(/\n\n+/);
  
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length < 10) continue;
    
    // If paragraph is larger than 1000 chars, chunk it by sentences
    if (trimmed.length > 1000) {
      // Simple regex to split by sentences
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
      let currentChunk = '';
      
      for (let sentence of sentences) {
        sentence = sentence.trim();
        if (!sentence) continue;
        
        if ((currentChunk.length + sentence.length) > 1000 && currentChunk.length >= 10) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        }
      }
      if (currentChunk.trim().length >= 10) {
        chunks.push(currentChunk.trim());
      }
    } else {
      chunks.push(trimmed);
    }
  }
  
  return chunks;
}

/**
 * Extracts data from a CSV buffer and chunks it.
 * Chunking strategy: Each row becomes a chunk in format "key1: value1, key2: value2"
 */
function processCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    // Create a readable stream from the buffer
    const stream = Readable.from(buffer.toString('utf-8'));
    
    stream
      .pipe(csvParser())
      .on('data', (data) => {
        // Map row to a string
        const rowString = Object.entries(data)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        
        if (rowString) {
          results.push(rowString);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Process an uploaded file buffer based on mimetype.
 * Returns an array of text chunks.
 */
async function extractAndChunkDocument(buffer, mimetype) {
  if (mimetype === 'application/pdf') {
    return await processPdfBuffer(buffer);
  } else if (mimetype === 'text/csv' || mimetype === 'application/csv' || mimetype === 'application/vnd.ms-excel') {
    return await processCsvBuffer(buffer);
  } else {
    throw new Error('Unsupported file type');
  }
}

module.exports = {
  extractAndChunkDocument,
  processPdfBuffer,
  processCsvBuffer
};
