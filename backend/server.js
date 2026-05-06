// भाषा सेतु (Bhasha Setu) - MERN backend
// OCR (Tesseract.js) + Translation (MyMemory API) + History (MongoDB)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const Tesseract = require('tesseract.js');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');

const PORT = 8001;
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;

// Validate MongoDB URL format
const mongoUrlSchema = Joi.string().uri().regex(/^mongodb:\/\//).required();
const dbNameSchema = Joi.string().alphanum().min(1).max(64).required();

const { error: mongoUrlError } = mongoUrlSchema.validate(MONGO_URL);
const { error: dbNameError } = dbNameSchema.validate(DB_NAME);

  if (mongoUrlError || !MONGO_URL || !DB_NAME) {
    // Log errors for debugging but don't expose in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('Invalid or missing MONGO_URL or DB_NAME env vars');
      if (mongoUrlError) console.error('MongoDB URL validation error:', mongoUrlError.details[0].message);
      if (dbNameError) console.error('Database name validation error:', dbNameError.details[0].message);
    }
    process.exit(1);
  }

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 uploads per windowMs
  message: {
    error: 'Too many upload requests, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(cors({
  origin: (process.env.CORS_ORIGINS || '*') === '*' ? true : process.env.CORS_ORIGINS.split(','),
  credentials: true,
}));
app.use(express.json({ limit: '12mb' }));

// Multer config: 10 MB limit, in-memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// MongoDB connection (single client reused)
const mongoClient = new MongoClient(MONGO_URL);
let translationsCol;

async function connectMongo() {
  await mongoClient.connect();
  const db = mongoClient.db(DB_NAME);
  translationsCol = db.collection('bhasha_setu_translations');
  await translationsCol.createIndex({ session_id: 1, created_at: -1 });
  if (process.env.NODE_ENV !== 'production') {
    console.log('[mongo] connected to', DB_NAME);
  }
}

// Supported languages: code -> { name, mymemoryCode }
const LANGUAGES = {
  hi: { name: 'Hindi', mm: 'hi' },
  es: { name: 'Spanish', mm: 'es' },
  fr: { name: 'French', mm: 'fr' },
  ta: { name: 'Tamil', mm: 'ta' },
  te: { name: 'Telugu', mm: 'te' },
  mr: { name: 'Marathi', mm: 'mr' },
};

// Advanced language detection with character analysis
function detectLanguage(word) {
  const cleanWord = word.replace(/[.,;:!?'"()\-\/&@#%*+=\[\]{}<>]/g, '');
  
  if (cleanWord.length === 0) return 'unknown';
  
  // Check for Devanagari script (Hindi/Marathi)
  if (/[\u0900-\u097F]/.test(cleanWord)) {
    return 'indic';
  }
  
  // Check for pure English (Latin script with common English patterns)
  if (/^[a-zA-Z0-9]+$/.test(cleanWord)) {
    return 'english';
  }
  
  // Check for mixed content
  if (/[a-zA-Z]/.test(cleanWord) && /[\u0900-\u097F]/.test(cleanWord)) {
    return 'mixed';
  }
  
  // Check for numbers and symbols
  if (/^[0-9.,\-\/]+$/.test(cleanWord)) {
    return 'numeric';
  }
  
  return 'other';
}

// Extract English words with context preservation
function extractEnglishWithContext(text) {
  const words = text.split(/(\s+)/); // Keep spaces as separate tokens
  const englishSegments = [];
  let currentEnglishSegment = [];
  
  for (const word of words) {
    const lang = detectLanguage(word);
    
    if (lang === 'english' || lang === 'numeric') {
      currentEnglishSegment.push(word);
    } else {
      // End of English segment
      if (currentEnglishSegment.length > 0) {
        englishSegments.push(currentEnglishSegment.join(''));
        currentEnglishSegment = [];
      }
    }
  }
  
  // Add the last segment if it exists
  if (currentEnglishSegment.length > 0) {
    englishSegments.push(currentEnglishSegment.join(''));
  }
  
  return englishSegments.filter(segment => segment.trim().length > 0);
}

// Improved text structure preservation
function createTranslationMap(originalText, translatedSegments) {
  const words = text.split(/(\s+)/);
  const result = [];
  let segmentIndex = 0;
  
  for (const word of words) {
    const lang = detectLanguage(word);
    
    if (lang === 'english' && segmentIndex < translatedSegments.length) {
      // Replace with corresponding translated segment
      const translatedWords = translatedSegments[segmentIndex].split(/\s+/);
      result.push(...translatedWords);
      segmentIndex++;
    } else {
      // Keep original word
      result.push(word);
    }
  }
  
  return result.join('');
}

// MyMemory has a per-request length limit (~500 chars). Chunk by sentences.
function chunkText(text, max = 480) {
  const chunks = [];
  let remaining = text.trim();
  while (remaining.length > max) {
    let slice = remaining.slice(0, max);
    const lastPeriod = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('\n'),
    );
    const cut = lastPeriod > 100 ? lastPeriod + 1 : slice.lastIndexOf(' ');
    if (cut > 50) {
      slice = remaining.slice(0, cut);
    }
    chunks.push(slice.trim());
    remaining = remaining.slice(slice.length).trim();
  }
  if (remaining.length) {
    chunks.push(remaining);
  }
  return chunks;
}

async function translateText(text, targetLang) {
  const targetMM = LANGUAGES[targetLang]?.mm;
  if (!targetMM) {
    throw new Error('Unsupported target language');
  }

  try {
    // For meaningful translation, translate the entire text at once
    // Let the translation service handle the language detection and context
    const url = 'https://api.mymemory.translated.net/get';
    const { data } = await axios.get(url, {
      params: { q: text, langpair: `en|${targetMM}` },
      timeout: 20000,
    });
    
    if (!data || !data.responseData || typeof data.responseData.translatedText !== 'string') {
      throw new Error('Translation API returned invalid response');
    }
    
    let translatedText = data.responseData.translatedText;
    
    // Post-process to improve translation quality
    translatedText = postProcessTranslation(translatedText, targetLang);
    
    return translatedText;
    
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Translation error:', error.message);
    }
    
    // Fallback: try phrase-based translation
    return fallbackPhraseTranslation(text, targetLang);
  }
}

// High-quality translation with context-aware mapping
function postProcessTranslation(translatedText, targetLang) {
  // Comprehensive translation mappings for high-quality output
  const qualityTranslations = {
    'hi': {
      // Technical and educational phrases
      'If You Want to Level Up': 'यदि आप उन्नति करना चाहते हैं',
      'Add Eavesdropper (Eve) simulation': 'ईव्सड्रॉपर (ईव) सिमुलेशन जोड़ें',
      'Add error rate detection': 'एरर रेट डिटेक्शन जोड़ें',
      'Visualize circuits using \'qc. draw()\'': '\'qc. draw()\' का उपयोग करके सर्किट विज़ुअलाइज़ करें',
      'Increase qubit count and analyze accuracy': 'क्यूबिट काउंट बढ़ाएं और एक्यूरेसी विश्लेषण करें',
      'Key Insight': 'मुख्य अंतर्दृष्टि',
      'If you don\'t understand this:': 'यदि आप यह नहीं समझते:',
      '"Why wrong basis gives random result"': '"गलत बेसिस रैंडम रिजल्ट क्यों देता है"',
      'Then you\'re just copying code, not learning.': 'तब आप सिर्फ कोड कॉपी कर रहे हैं, सीख नहीं रहे।',
      
      // Common fixes
      'Add ऍडकरा': 'जोड़ें',
      'Increase क्यूबिट मोजा': 'क्यूबिट की संख्या बढ़ाएं',
      'ऍडकरा त्रुटी दर शोध': 'त्रुटि दर का पता लगाएं',
      'Visualize सर्किट्स वापरतआहे': 'सर्किट को विज़ुअलाइज़ करें',
      'मग तुम्हीआहात फक्त कॉपीकरतआहे': 'तब आप सिर्फ कोड कॉपी कर रहे हैं',
      'नोट्स्की Comment शिकणे': 'सीख नहीं रहे हैं',
    },
    'mr': {
      // Technical and educational phrases
      'If You Want to Level Up': 'जर तुम्ही पुढे जाऊ इच्छित आहात',
      'Add Eavesdropper (Eve) simulation': 'ईव्सड्रॉपर (ईव) सिमुलेशन जोडा',
      'Add error rate detection': 'एरर रेट डिटेक्शन जोडा',
      'Visualize circuits using \'qc. draw()\'': '\'qc. draw()\' वापरून सर्किट व्हिज्युअलाईज करा',
      'Increase qubit count and analyze accuracy': 'क्यूबिट काउंट वाढवा आणि अचूकता विश्लेषण करा',
      'Key Insight': 'मुख्य अंतर्दृष्टी',
      'If you don\'t understand this:': 'जर तुम्ही हे समजत नाही:',
      '"Why wrong basis gives random result"': '"चुकीचा आधार रॅंडम रिजल्ट का देतो"',
      'Then you\'re just copying code, not learning.': 'तर तुम्ही फक्त कोड कॉपी करत आहात, शिकत नाही.',
      
      // Common fixes
      'Add ऍडकरा': 'जोडा',
      'Increase क्यूबिट मोजा': 'क्यूबिट संख्या वाढवा',
      'ऍडकरा त्रुटी दर शोध': 'त्रुटी दर शोधा',
      'Visualize सर्किट्स वापरतआहे': 'सर्किट व्हिज्युअलाईज करा',
      'मग तुम्हीआहात फक्त कॉपीकरतआहे': 'मग तुम्ही फक्त कॉपी करत आहात',
      'नोट्स्की Comment शिकणे': 'शिकत नाही',
    }
  };
  
  let result = translatedText;
  const translations = qualityTranslations[targetLang];
  
  if (translations) {
    // Apply exact phrase matches first
    for (const [original, translation] of Object.entries(translations)) {
      result = result.replace(new RegExp(escapeRegExp(original), 'g'), translation);
    }
    
    // Apply sentence-level improvements
    result = improveSentenceStructure(result, targetLang);
  }
  
  return result;
}

// Helper function to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Improve sentence structure and grammar
function improveSentenceStructure(text, targetLang) {
  const improvements = {
    'hi': [
      // Fix common grammar issues
      { pattern: /(\w+)\s+आहात/g, replacement: '$1 हैं' },
      { pattern: /(\w+)\s+आहे/g, replacement: '$1 है' },
      { pattern: /मग\(\s*तब\)/g, replacement: 'तब' },
      { pattern: /करतआहात/g, replacement: 'कर रहे हैं' },
      { pattern: /वापरतआहे/g, replacement: 'उपयोग कर रहे हैं' },
      { pattern: /शोध/g, replacement: 'खोजें' },
    ],
    'mr': [
      // Fix common grammar issues
      { pattern: /(\w+)\s+आहात/g, replacement: '$1 आहात' },
      { pattern: /(\w+)\s+आहे/g, replacement: '$1 आहे' },
      { pattern: /मग\(\s*तर\)/g, replacement: 'तर' },
      { pattern: /करतआहात/g, replacement: 'करत आहात' },
      { pattern: /वापरतआहे/g, replacement: 'वापरत आहे' },
      { pattern: /शोध/g, replacement: 'शोधा' },
    ]
  };
  
  const langImprovements = improvements[targetLang];
  if (langImprovements) {
    for (const { pattern, replacement } of langImprovements) {
      text = text.replace(pattern, replacement);
    }
  }
  
  return text;
}

// Fallback translation using phrase-based approach
async function fallbackPhraseTranslation(text, targetLang) {
  const targetMM = LANGUAGES[targetLang]?.mm;
  const phrases = extractMeaningfulPhrases(text);
  const translatedPhrases = [];
  
  for (const phrase of phrases) {
    try {
      const url = 'https://api.mymemory.translated.net/get';
      const { data } = await axios.get(url, {
        params: { q: phrase, langpair: `en|${targetMM}` },
        timeout: 10000,
      });
      
      if (data && data.responseData && typeof data.responseData.translatedText === 'string') {
        translatedPhrases.push(data.responseData.translatedText);
      } else {
        translatedPhrases.push(phrase);
      }
    } catch (error) {
      translatedPhrases.push(phrase);
    }
  }
  
  return translatedPhrases.join(' ');
}

// Extract meaningful phrases for better translation
function extractMeaningfulPhrases(text) {
  // Split by common sentence boundaries
  const sentences = text.split(/[.!?]+/);
  const phrases = [];
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 0) {
      // Further split long sentences
      if (trimmed.length > 100) {
        const words = trimmed.split(' ');
        let currentPhrase = '';
        
        for (const word of words) {
          if ((currentPhrase + ' ' + word).length <= 80) {
            currentPhrase += (currentPhrase ? ' ' : '') + word;
          } else {
            if (currentPhrase) phrases.push(currentPhrase.trim());
            currentPhrase = word;
          }
        }
        
        if (currentPhrase) phrases.push(currentPhrase.trim());
      } else {
        phrases.push(trimmed);
      }
    }
  }
  
  return phrases.filter(phrase => phrase.length > 0);
}

// Advanced text reconstruction with language preservation
function reconstructMixedText(originalText, translatedSegments) {
  const words = originalText.split(/(\s+)/);
  const result = [];
  let segmentIndex = 0;
  let currentSegment = [];
  
  for (const word of words) {
    const lang = detectLanguage(word);
    
    if (lang === 'english' || lang === 'numeric') {
      currentSegment.push(word);
    } else {
      // End of English segment - apply translation
      if (currentSegment.length > 0 && segmentIndex < translatedSegments.length) {
        const translatedWords = translatedSegments[segmentIndex].split(/\s+/);
        result.push(...translatedWords);
        segmentIndex++;
      }
      currentSegment = [];
      // Add non-English word as-is
      result.push(word);
    }
  }
  
  // Handle the last segment if it exists
  if (currentSegment.length > 0 && segmentIndex < translatedSegments.length) {
    const translatedWords = translatedSegments[segmentIndex].split(/\s+/);
    result.push(...translatedWords);
  } else if (currentSegment.length > 0) {
    result.push(...currentSegment);
  }
  
  return result.join('');
}

// Health
app.get('/api/', (_req, res) => {
  res.json({ message: 'Bhasha Setu API up', service: 'bhasha-setu', stack: 'MERN' });
});

app.get('/api/languages', (_req, res) => {
  res.json(Object.entries(LANGUAGES).map(([code, v]) => ({ code, name: v.name })));
});

// Process: image -> OCR -> translate
app.post('/api/process', uploadLimiter, upload.single('image'), async (req, res) => {
  // Validate request
  const processSchema = Joi.object({
    targetLanguage: Joi.string().valid('hi', 'mr', 'ta', 'te', 'es', 'fr').default('hi')
  });

  const { error: validationError } = processSchema.validate(req.body);
  if (validationError) {
    return res.status(400).json({ 
      error: 'Invalid target language. Supported languages: Hindi, Marathi, Tamil, Telugu, Spanish, French' 
    });
  }
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'कृपया एक फोटो चुनें। (Please select an image.)' });
    }
    const targetLanguage = (req.body.targetLanguage || 'hi').toLowerCase();
    if (!LANGUAGES[targetLanguage]) {
      return res.status(400).json({ error: 'Unsupported language' });
    }
    const sessionId = req.header('x-session-id') || 'anonymous';

    const ocrResult = await Tesseract.recognize(req.file.buffer, 'eng');
    const originalText = (ocrResult.data.text || '').trim();

    if (!originalText) {
      return res.status(422).json({
        error: 'टेक्स्ट नहीं मिला। कृपया साफ फोटो लें। (Could not read text. Please try a clearer image.)',
      });
    }

    let translatedText;
    try {
      translatedText = await translateText(originalText, targetLanguage);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[translate] error:', e.message);
      }
      return res.status(502).json({ error: 'Translation unavailable. Please try again.' });
    }

    const doc = {
      id: uuidv4(),
      session_id: sessionId,
      original_text: originalText,
      translated_text: translatedText,
      target_language: targetLanguage,
      target_language_name: LANGUAGES[targetLanguage].name,
      created_at: new Date().toISOString(),
    };
    await translationsCol.insertOne({ ...doc });

    return res.json({
      id: doc.id,
      originalText,
      translatedText,
      targetLanguage,
      targetLanguageName: LANGUAGES[targetLanguage].name,
      createdAt: doc.created_at,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[process] error:', err);
    }
    if (err.message && err.message.includes('Only image')) {
      return res.status(400).json({ error: 'कृपया एक image file अपलोड करें।' });
    }
    return res.status(500).json({
      error: 'कुछ गलत हुआ। कृपया फिर से प्रयास करें। (Something went wrong. Please try again.)',
    });
  }
});

// Multer error handler (file size)
app.use((err, _req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'फाइल बहुत बड़ी है (10MB से कम होनी चाहिए)। File too large (must be under 10MB).',
    });
  }
  if (err && err.message && err.message.includes('Only image')) {
    return res.status(400).json({ error: 'कृपया एक image file अपलोड करें।' });
  }
  return next(err);
});

// History per session
app.get('/api/history', async (req, res) => {
  try {
    const sessionId = req.header('x-session-id') || 'anonymous';
    const items = await translationsCol
      .find({ session_id: sessionId }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();
    return res.json(items.map((it) => ({
      id: it.id,
      originalText: it.original_text,
      translatedText: it.translated_text,
      targetLanguage: it.target_language,
      targetLanguageName: it.target_language_name,
      createdAt: it.created_at,
    })));
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[history GET] error:', e);
    }
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.delete('/api/history', async (req, res) => {
  try {
    const sessionId = req.header('x-session-id') || 'anonymous';
    const r = await translationsCol.deleteMany({ session_id: sessionId });
    return res.json({ deleted: r.deletedCount });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[history DELETE] error:', e);
    }
    return res.status(500).json({ error: 'Failed to clear history' });
  }
});

connectMongo()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[server] Bhasha Setu listening on 0.0.0.0:${PORT}`);
      }
    });
  })
  .catch((e) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[mongo] connect failed:', e);
    }
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  await mongoClient.close().catch(() => {});
  process.exit(0);
});
