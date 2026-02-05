const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

/**
 * Detect file type from multiple sources
 * @param {Object} file - File object with buffer, mimetype, and originalname
 * @returns {string} - Detected file type (pdf, docx, txt)
 */
function detectFileType(file) {
  const { mimetype, originalname } = file;

  // Primary detection via MIME type
  const mimeTypeMap = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt'
  };

  if (mimeTypeMap[mimetype]) {
    return mimeTypeMap[mimetype];
  }

  // Fallback detection via file extension
  const extension = path.extname(originalname).toLowerCase();
  const extensionMap = {
    '.pdf': 'pdf',
    '.docx': 'docx',
    '.doc': 'docx', // Treat .doc as .docx for processing
    '.txt': 'txt'
  };

  if (extensionMap[extension]) {
    console.log(`File type detected via extension: ${extension} -> ${extensionMap[extension]}`);
    return extensionMap[extension];
  }

  // Final fallback - analyze file signature/magic bytes
  const fileSignature = detectFileSignature(file.buffer);
  if (fileSignature) {
    console.log(`File type detected via signature: ${fileSignature}`);
    return fileSignature;
  }

  throw new Error(`Unsupported file type: ${mimetype} (${originalname})`);
}

/**
 * Detect file type by analyzing magic bytes/file signature
 * @param {Buffer} buffer - File buffer
 * @returns {string|null} - Detected file type or null
 */
function detectFileSignature(buffer) {
  if (buffer.length < 4) return null;

  // PDF signature: %PDF
  if (buffer.slice(0, 4).toString() === '%PDF') {
    return 'pdf';
  }

  // DOCX signature: PK (ZIP archive)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    // Additional check for DOCX content
    const content = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
    if (content.includes('word/') || content.includes('docProps/')) {
      return 'docx';
    }
  }

  // Check if it's likely plain text
  const sample = buffer.slice(0, Math.min(512, buffer.length));
  const isText = isLikelyTextFile(sample);
  if (isText) {
    return 'txt';
  }

  return null;
}

/**
 * Check if buffer contains text content
 * @param {Buffer} buffer - File buffer sample
 * @returns {boolean} - True if likely text file
 */
function isLikelyTextFile(buffer) {
  let textCharCount = 0;
  let totalChars = Math.min(buffer.length, 512);

  for (let i = 0; i < totalChars; i++) {
    const byte = buffer[i];
    // Check for printable ASCII characters and common whitespace
    if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
      textCharCount++;
    }
  }

  // If more than 80% are text characters, consider it text
  return (textCharCount / totalChars) > 0.8;
}

/**
 * Process uploaded resume file and extract normalized text content
 * @param {Object} file - Multer file object
 * @returns {Promise<string>} - Normalized text content
 */
async function processResumeFile(file) {
  try {
    const { buffer, originalname } = file;

    console.log(`Processing file: ${originalname}, size: ${buffer.length} bytes`);

    // Detect file type
    const fileType = detectFileType(file);
    console.log(`Detected file type: ${fileType}`);

    let rawText;

    // Extract text based on file type
    switch (fileType) {
      case 'pdf':
        rawText = await processPDF(buffer);
        break;

      case 'docx':
        rawText = await processDOCX(buffer);
        break;

      case 'txt':
        rawText = processTextFile(buffer);
        break;

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Normalize the extracted text
    const normalizedText = normalizeResumeText(rawText);

    console.log(`Text extraction complete: ${rawText.length} -> ${normalizedText.length} characters`);
    return normalizedText;

  } catch (error) {
    console.error('File processing error:', error);
    throw new Error(`Failed to process resume file: ${error.message}`);
  }
}

/**
 * Extract text from PDF buffer
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function processPDF(buffer) {
  try {
    console.log('Extracting text from PDF...');
    const data = await pdfParse(buffer, {
      // PDF parsing options
      normalizeWhitespace: false, // We'll handle normalization ourselves
      disableCombineTextItems: false
    });

    const text = data.text;

    if (!text || text.trim().length < 10) {
      throw new Error('PDF appears to be empty, scanned, or text could not be extracted');
    }

    // Additional PDF-specific cleaning
    const cleanedText = cleanPDFText(text);

    console.log(`PDF processed: ${text.length} -> ${cleanedText.length} characters extracted`);
    console.log(`PDF metadata: ${data.numpages} pages, ${data.numrender} rendered items`);

    return cleanedText;
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}

/**
 * Extract text from DOCX buffer
 * @param {Buffer} buffer - DOCX file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function processDOCX(buffer) {
  try {
    console.log('Extracting text from DOCX...');
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value;

    if (!text || text.trim().length < 10) {
      throw new Error('DOCX appears to be empty or text could not be extracted');
    }

    // Log any conversion warnings
    if (result.messages && result.messages.length > 0) {
      console.log('DOCX processing messages:', result.messages.slice(0, 5)); // Limit to 5 messages
    }

    console.log(`DOCX processed: ${text.length} characters extracted`);
    return text;
  } catch (error) {
    console.error('DOCX processing error:', error);
    throw new Error(`DOCX processing failed: ${error.message}`);
  }
}

/**
 * Process plain text file with encoding detection
 * @param {Buffer} buffer - Text file buffer
 * @returns {string} - Text content
 */
function processTextFile(buffer) {
  try {
    console.log('Processing text file...');

    // Try different encodings
    const encodings = ['utf-8', 'latin1', 'ascii'];
    let text = '';

    for (const encoding of encodings) {
      try {
        text = buffer.toString(encoding);
        // Check if the text makes sense (no weird characters)
        if (isValidTextContent(text)) {
          console.log(`Text file processed with encoding: ${encoding}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!text || text.trim().length < 10) {
      throw new Error('Text file appears to be empty or corrupted');
    }

    console.log(`Text file processed: ${text.length} characters`);
    return text;
  } catch (error) {
    console.error('Text file processing error:', error);
    throw new Error(`Text file processing failed: ${error.message}`);
  }
}

/**
 * Check if text content is valid (no excessive weird characters)
 * @param {string} text - Text to validate
 * @returns {boolean} - True if valid
 */
function isValidTextContent(text) {
  if (!text) return false;

  // Count printable vs non-printable characters
  let printableCount = 0;
  const sampleSize = Math.min(200, text.length);

  for (let i = 0; i < sampleSize; i++) {
    const charCode = text.charCodeAt(i);
    // Printable ASCII + common unicode characters
    if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode === 9) {
      printableCount++;
    }
  }

  return (printableCount / sampleSize) > 0.7;
}

/**
 * Clean PDF-specific formatting issues
 * @param {string} text - Raw PDF text
 * @returns {string} - Cleaned text
 */
function cleanPDFText(text) {
  return text
    // Remove PDF artifacts
    .replace(/\f/g, '\n') // Form feed to newline
    // eslint-disable-next-line no-control-regex
    .replace(/\u0000/g, '') // Remove null characters
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '') // Remove control characters
    // Fix common PDF extraction issues
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
    .replace(/(\w)(\d)/g, '$1 $2') // Add space between word and number
    .replace(/(\d)(\w)/g, '$1 $2') // Add space between number and word
    // Normalize whitespace
    .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
    .replace(/\n[ \t]+/g, '\n') // Remove leading whitespace on lines
    .replace(/[ \t]+\n/g, '\n') // Remove trailing whitespace on lines
    .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
}

/**
 * Normalize resume text for analysis
 * @param {string} text - Raw extracted text
 * @returns {string} - Normalized text
 */
function normalizeResumeText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text content provided for normalization');
  }

  console.log('Normalizing extracted text...');

  return text
    // Basic cleaning
    .trim()

    // Remove email addresses and phone numbers (for privacy)
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE]')

    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

    // Clean up spacing
    .replace(/\t/g, ' ') // Convert tabs to spaces
    .replace(/[ \u00A0]+/g, ' ') // Multiple spaces/non-breaking spaces to single space
    .replace(/\n[ ]+/g, '\n') // Remove leading spaces on new lines
    .replace(/[ ]+\n/g, '\n') // Remove trailing spaces before newlines
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2

    // Remove special characters but keep basic punctuation
    .replace(/[^\w\s\n.,;:()/\-+#@[\]]/g, ' ')

    // Clean up word boundaries
    .replace(/\b(\w)\1{2,}\b/g, '$1$1') // Reduce repeated characters (e.g., 'aaa' -> 'aa')

    // Final cleanup
    .replace(/\s+/g, ' ') // Normalize all whitespace to single spaces
    .replace(/\n\s+\n/g, '\n\n') // Clean up paragraph breaks
    .trim();
}

/**
 * Create a clean version for keyword analysis (lowercase, minimal punctuation)
 * @param {string} normalizedText - Already normalized text
 * @returns {string} - Analysis-ready text
 */
function prepareForAnalysis(normalizedText) {
  return normalizedText
    .toLowerCase()
    .replace(/[^\w\s\n+#]/g, ' ') // Keep only words, spaces, newlines, + and #
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract basic resume metadata
 * @param {string} text - Resume text
 * @returns {Object} - Metadata object
 */
function extractResumeMetadata(text) {
  const metadata = {
    wordCount: 0,
    lineCount: 0,
    hasEducation: false,
    hasExperience: false,
    hasSkills: false,
    estimatedSections: []
  };

  if (!text) return metadata;

  const lowerText = text.toLowerCase();

  // Basic counts
  metadata.wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  metadata.lineCount = text.split('\n').length;

  // Section detection
  metadata.hasEducation = /\b(education|degree|university|college|school)\b/.test(lowerText);
  metadata.hasExperience = /\b(experience|work|employment|position|job)\b/.test(lowerText);
  metadata.hasSkills = /\b(skills|technologies|proficient|expertise)\b/.test(lowerText);

  // Common section headers
  const sectionPatterns = [
    { name: 'Education', pattern: /\b(education|academic)\b/ },
    { name: 'Experience', pattern: /\b(experience|employment|work history)\b/ },
    { name: 'Skills', pattern: /\b(skills|technical skills|core competencies)\b/ },
    { name: 'Projects', pattern: /\b(projects|portfolio)\b/ },
    { name: 'Certifications', pattern: /\b(certifications|certificates)\b/ }
  ];

  sectionPatterns.forEach(section => {
    if (section.pattern.test(lowerText)) {
      metadata.estimatedSections.push(section.name);
    }
  });

  return metadata;
}

module.exports = {
  processResumeFile,
  detectFileType,
  detectFileSignature,
  processPDF,
  processDOCX,
  processTextFile,
  normalizeResumeText,
  prepareForAnalysis,
  cleanPDFText,
  extractResumeMetadata
};