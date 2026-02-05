const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Import file processors
const { processResumeFile } = require('./utils/fileProcessor');
const { analyzeResumeMatch } = require('./utils/analyser');
const { analyzeResumeMatchAI, analyzeResumeMatchEnhanced } = require('./utils/enhancedAnalyser');
const { analyzeResumeMatchLocal } = require('./utils/localOllamaAnalyser');
const { compareSkillsWeighted, compareSkills } = require('./utils/matchingEngine');
const {
  createSuccessResponse,
  createErrorResponse,
  formatMatchingResponse,
  formatMatchingError
} = require('./utils/responseFormatter');
const dataManager = require('./utils/dataManager');
const aiConfig = require('./utils/aiConfig');

const app = express();
const PORT = process.env.PORT || 3000;

async function loadPersonalPortfolio() {
  const portfolioPath = path.join(__dirname, "me", "portfolio.txt");
  const addedSkillsPath = path.join(__dirname, "me", "added_skills.json");

  // Load main portfolio
  let portfolioContent = '';
  try {
    portfolioContent = await fs.promises.readFile(portfolioPath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  // Load added skills from JSON and format them prominently
  let addedSkillsContent = '';
  try {
    const addedSkillsData = await fs.promises.readFile(addedSkillsPath, 'utf8');
    const parsed = JSON.parse(addedSkillsData);
    if (parsed.skills && parsed.skills.length > 0) {
      // Format skills prominently so AI recognizes them
      const skillsList = parsed.skills.map(s => `- ${s}`).join('\n');
      addedSkillsContent = `\n\n Technical Skills (Additional)\n\nThe candidate has expertise in the following additional technologies and skills:\n${skillsList}\n\nProficient in: ${parsed.skills.join(', ')}`;
      console.log(`📋 Loaded ${parsed.skills.length} added skills from added_skills.json: ${parsed.skills.join(', ')}`);
    }
  } catch (err) {
    // File doesn't exist or is invalid, that's fine
  }

  // Prepend added skills to ensure they are high priority and not truncated
  // The AI pays more attention to the beginning of the text
  return addedSkillsContent + (addedSkillsContent ? '\n\n' : '') + portfolioContent;
}



/**
 * Helper function to extract resume content from various sources
 * Centralizes resume loading logic to avoid duplication
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object (optional)
 * @returns {Promise<string>} - Resume text content
 */
async function getResumeContent(req, file) {
  // If using personal profile
  if (req.body.usePersonalProfile === true) {
    return await loadPersonalPortfolio();
  }

  // If file uploaded via multer
  if (file) {
    return await processResumeFile(file);
  }

  // If resume data in request body
  const { resume } = req.body;

  if (resume?.binaryData) {
    const buffer = Buffer.from(resume.binaryData, 'base64');
    const mockFile = {
      buffer: buffer,
      mimetype: resume.fileType,
      originalname: resume.filename
    };
    return await processResumeFile(mockFile);
  }

  if (resume?.content) {
    return resume.content;
  }

  throw new Error('No resume content provided');
}

/**
 * Validate URL format
 * @param {string} urlString - URL to validate
 * @returns {boolean} - True if valid URL
 */
function isValidUrl(urlString) {
  try {
    new URL(urlString);
    return true;
  } catch (_) {
    return false;
  }
}

// Security middleware
app.use(helmet());

app.use((req, res, next) => {
  console.log(`Request received at ${new Date().toISOString()} from ${req.originalUrl}`);
  next();
});

// CORS configuration for Chrome extension
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow Chrome extension origins
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Deny other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timing middleware - must be before routes
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, DOCX, and TXT files
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Job Analyser Backend (LinkedIn & Naukri)'
  });
});

// Add skill to added_skills.json (separate from portfolio.txt)
const ADDED_SKILLS_PATH = path.join(__dirname, 'me', 'added_skills.json');

// Helper to load added skills
async function loadAddedSkills() {
  try {
    const data = await fs.promises.readFile(ADDED_SKILLS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { skills: [], addedAt: [] };
    }
    throw err;
  }
}

// Helper to save added skills
async function saveAddedSkills(skillsData) {
  await fs.promises.writeFile(ADDED_SKILLS_PATH, JSON.stringify(skillsData, null, 2), 'utf8');
}

app.post('/api/add-skill', async (req, res) => {
  try {
    const { skill, jobUrl } = req.body;

    if (!skill || typeof skill !== 'string' || skill.trim().length === 0) {
      return res.status(400).json(createErrorResponse(
        'Skill is required',
        'MISSING_SKILL'
      ));
    }

    const skillName = skill.trim().toLowerCase();

    // Load existing added skills
    const skillsData = await loadAddedSkills();

    // Check if skill already exists
    if (skillsData.skills.includes(skillName)) {
      return res.json(createSuccessResponse({
        message: 'Skill already exists in your added skills',
        skill: skillName,
        alreadyExists: true,
        totalSkills: skillsData.skills.length
      }));
    }

    // Add the new skill
    skillsData.skills.push(skillName);
    skillsData.addedAt.push(new Date().toISOString());

    await saveAddedSkills(skillsData);

    // If jobUrl provided, delete cached analysis so next run picks up new skill
    if (jobUrl) {
      try {
        // Pass empty object instead of null to avoid TypeError
        await dataManager.deleteAnalysis(jobUrl, {});
        console.log(`🗑️ Deleted cached analysis for URL to force re-analysis with new skill`);
      } catch (e) {
        console.log('No cached analysis to delete:', e.message);
      }
    }

    console.log(`✅ Added skill to added_skills.json: ${skillName} (Total: ${skillsData.skills.length})`);

    res.json(createSuccessResponse({
      message: 'Skill added successfully',
      skill: skillName,
      alreadyExists: false,
      totalSkills: skillsData.skills.length,
      cacheCleared: !!jobUrl
    }));

  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json(createErrorResponse(
      'Failed to add skill',
      'ADD_SKILL_ERROR'
    ));
  }
});

// Get all added skills
app.get('/api/added-skills', async (req, res) => {
  try {
    const skillsData = await loadAddedSkills();
    res.json(createSuccessResponse({
      skills: skillsData.skills,
      count: skillsData.skills.length
    }));
  } catch (error) {
    console.error('Get added skills error:', error);
    res.status(500).json(createErrorResponse(
      'Failed to get added skills',
      'GET_SKILLS_ERROR'
    ));
  }
});

// Check if analysis exists for a URL
app.post('/api/check-analysis', async (req, res) => {
  try {
    const { url, resumeInfo } = req.body;

    if (!url) {
      return res.status(400).json(createErrorResponse(
        'URL is required',
        'MISSING_URL'
      ));
    }

    if (resumeInfo) {
      // Check for specific resume
      const analysisInfo = await dataManager.checkAnalysisExists(url, resumeInfo);
      res.json(createSuccessResponse({
        exists: !!analysisInfo,
        info: analysisInfo
      }));
    } else {
      // Get all analyses for this job
      const allAnalyses = await dataManager.findAllAnalysesForJob(url);
      res.json(createSuccessResponse({
        exists: allAnalyses.length > 0,
        count: allAnalyses.length,
        analyses: allAnalyses.map(a => ({
          resumeInfo: a.resumeInfo,
          timestamp: a.timestamp,
          matchScore: a.matchScore,
          filename: a.filename
        }))
      }));
    }

  } catch (error) {
    console.error('Check analysis error:', error);
    res.status(500).json(createErrorResponse(
      'Failed to check analysis',
      'CHECK_ANALYSIS_ERROR'
    ));
  }
});

// Get existing analysis for a URL
app.post('/api/get-analysis', async (req, res) => {
  try {
    const { url, resumeInfo } = req.body;

    if (!url) {
      return res.status(400).json(createErrorResponse(
        'URL is required',
        'MISSING_URL'
      ));
    }

    if (resumeInfo) {
      // Get specific analysis for resume
      const savedData = await dataManager.loadAnalysisResult(url, resumeInfo);

      if (!savedData) {
        return res.status(404).json(createErrorResponse(
          'No analysis found for this URL and resume',
          'ANALYSIS_NOT_FOUND'
        ));
      }

      res.json(createSuccessResponse({
        analysis: savedData.analysisData,
        metadata: {
          url: savedData.url,
          analyzedAt: savedData.timestamp,
          savedAt: savedData.metadata?.savedAt,
          isFromFile: true,
          resumeInfo: savedData.analysisData?.metadata?.resumeInfo,
          aiEnabled: savedData.analysisData?.metadata?.aiEnabled ?? false,
          analysisMethod: savedData.analysisData?.metadata?.analysisMethod || 'unknown'
        }
      }));
    } else {
      // Get all analyses for this job
      const allAnalyses = await dataManager.findAllAnalysesForJob(url);

      if (allAnalyses.length === 0) {
        return res.status(404).json(createErrorResponse(
          'No analyses found for this URL',
          'ANALYSIS_NOT_FOUND'
        ));
      }

      res.json(createSuccessResponse({
        analyses: allAnalyses.map(a => ({
          analysis: a.data.analysisData,
          metadata: {
            url: a.data.url,
            analyzedAt: a.timestamp,
            savedAt: a.data.metadata?.savedAt,
            isFromFile: true,
            resumeInfo: a.resumeInfo,
            filename: a.filename,
            aiEnabled: a.data.analysisData?.metadata?.aiEnabled ?? false,
            analysisMethod: a.data.analysisData?.metadata?.analysisMethod || 'unknown'
          }
        }))
      }));
    }

  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json(createErrorResponse(
      'Failed to retrieve analysis',
      'GET_ANALYSIS_ERROR'
    ));
  }
});

// Delete analysis for a URL
app.delete('/api/delete-analysis', async (req, res) => {
  try {
    const { url, resumeInfo } = req.body;

    if (!url) {
      return res.status(400).json(createErrorResponse(
        'URL is required',
        'MISSING_URL'
      ));
    }

    if (resumeInfo) {
      // Delete specific analysis
      const deleted = await dataManager.deleteAnalysis(url, resumeInfo);
      res.json(createSuccessResponse({
        deleted: deleted,
        message: deleted ? 'Analysis deleted successfully' : 'No analysis found to delete'
      }));
    } else {
      // Delete all analyses for this job
      const allAnalyses = await dataManager.findAllAnalysesForJob(url);
      let deletedCount = 0;

      for (const analysis of allAnalyses) {
        const deleted = await dataManager.deleteAnalysis(url, analysis.resumeInfo);
        if (deleted) deletedCount++;
      }

      res.json(createSuccessResponse({
        deleted: deletedCount > 0,
        deletedCount: deletedCount,
        message: `${deletedCount} analyses deleted successfully`
      }));
    }

  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json(createErrorResponse(
      'Failed to delete analysis',
      'DELETE_ANALYSIS_ERROR'
    ));
  }
});

// SSE Streaming endpoint for real-time progress updates (prevents timeout)
app.post('/api/analyze-resume-stream', upload.single('resumeFile'), async (req, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Helper to send SSE events
  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    sendEvent('progress', { step: 'starting', message: 'Processing request...', percentage: 0 });

    let jobData, resumeContent;

    // Handle different request formats
    if (req.file) {
      jobData = JSON.parse(req.body.jobData || '{}');
      resumeContent = await processResumeFile(req.file);
    } else {
      const { jobData: jd, resume, usePersonalProfile } = req.body;
      jobData = jd;

      if (usePersonalProfile === true) {
        resumeContent = await loadPersonalPortfolio();
      } else if (resume?.binaryData) {
        const buffer = Buffer.from(resume.binaryData, 'base64');
        const mockFile = {
          buffer: buffer,
          mimetype: resume.fileType,
          originalname: resume.filename
        };
        resumeContent = await processResumeFile(mockFile);
      } else if (resume?.content) {
        resumeContent = resume.content;
      } else {
        throw new Error('No resume content provided');
      }
    }

    // Validate data
    if (!jobData || !jobData.title || !jobData.description) {
      sendEvent('error', { message: 'Invalid job data. Title and description are required.' });
      res.end();
      return;
    }

    if (!resumeContent || resumeContent.trim().length === 0) {
      sendEvent('error', { message: 'Resume content is empty or could not be processed' });
      res.end();
      return;
    }

    sendEvent('progress', { step: 'ready', message: 'Data prepared, checking for cached results...', percentage: 5 });

    const config = aiConfig.getConfig();
    const forceRerun = req.body.forceRerun === true;

    // Build resume info for cache lookup
    let resumeInfo = {
      filename: req.body.resume?.filename || (req.file ? req.file.originalname : 'unknown'),
      fileSize: req.body.resume?.fileSize || (req.file ? req.file.size : 0)
    };
    if (req.body.usePersonalProfile === true) {
      resumeInfo = {
        filename: 'portfolio.txt',
        fileSize: typeof resumeContent === 'string' ? resumeContent.length : 0
      };
    }

    // Check for cached results (unless force rerun)
    if (!forceRerun) {
      sendEvent('progress', { step: 'cache_check', message: 'Checking for existing analysis...', percentage: 8 });

      try {
        const existingAnalysis = await dataManager.loadAnalysisResult(jobData.url, resumeInfo, jobData.description || '');

        if (existingAnalysis) {
          console.log('✅ [Streaming] Found cached result for this resume');

          // Send cached result
          sendEvent('result', {
            success: true,
            timestamp: new Date().toISOString(),
            analysis: existingAnalysis.analysisData.analysis || existingAnalysis.analysisData,
            metadata: {
              jobTitle: jobData.title,
              isFromCache: true,
              cacheTimestamp: existingAnalysis.timestamp,
              aiEnabled: existingAnalysis.analysisData.metadata?.aiEnabled || false,
              analysisMethod: existingAnalysis.analysisData.metadata?.analysisMethod || 'cached'
            }
          });
          res.end();
          return;
        } else {
          console.log('🆕 [Streaming] No cached result found, proceeding with fresh analysis...');
        }
      } catch (cacheError) {
        console.log('⚠️ [Streaming] Cache check error:', cacheError.message);
      }
    } else {
      console.log('🔄 [Streaming] Force rerun requested, skipping cache check...');
    }

    sendEvent('progress', { step: 'analyzing', message: 'Starting AI analysis...', percentage: 10 });

    // Progress callback function for streaming updates
    const onProgress = (progressData) => {
      sendEvent('progress', progressData);
    };

    let analysisResult;

    if (config.isLocal) {
      // Use local Ollama with progress updates
      analysisResult = await analyzeResumeMatchLocal(jobData, resumeContent, onProgress);
    } else {
      // For cloud AI, send a simple progress update
      sendEvent('progress', { step: 'ai_extraction', message: 'Extracting skills with cloud AI...', percentage: 30 });
      analysisResult = await analyzeResumeMatchEnhanced(jobData, resumeContent);
      sendEvent('progress', { step: 'complete', message: 'Analysis complete!', percentage: 100 });
    }

    // Save analysis result
    try {
      await dataManager.saveAnalysisResult(jobData.url, {
        success: true,
        analysis: analysisResult,
        metadata: {
          aiEnabled: analysisResult.aiAvailable,
          analysisMethod: analysisResult.analysisMethod,
          provider: config.provider
        }
      }, resumeInfo, jobData.description);
      console.log('💾 [Streaming] Analysis saved for URL:', jobData.url);
    } catch (saveError) {
      console.error('⚠️ [Streaming] Failed to save analysis:', saveError.message);
    }

    // Send final result
    sendEvent('result', {
      success: true,
      timestamp: new Date().toISOString(),
      analysis: analysisResult,
      metadata: {
        jobTitle: jobData.title,
        resumeWordCount: resumeContent.split(/\s+/).length,
        processingTime: Date.now() - req.startTime,
        aiEnabled: analysisResult.aiAvailable,
        analysisMethod: analysisResult.analysisMethod,
        provider: config.provider
      }
    });

  } catch (error) {
    console.error('Streaming analysis error:', error);
    sendEvent('error', { message: error.message || 'Analysis failed' });
  } finally {
    res.end();
  }
});

// Enhanced matching endpoint with weighted scoring
app.post('/api/analyze-resume-enhanced', upload.single('resumeFile'), async (req, res) => {
  const startTime = Date.now();

  try {
    console.log('Enhanced analysis request received:', {
      hasFile: !!req.file,
      bodyKeys: Object.keys(req.body)
    });

    let jobData, resumeContent;

    // Handle different request formats
    if (req.file) {
      // Multipart form data with file upload
      try {
        jobData = JSON.parse(req.body.jobData || '{}');
      } catch (e) {
        return res.status(400).json(createErrorResponse(
          'Invalid job data format',
          'INVALID_JSON'
        ));
      }
      resumeContent = await processResumeFile(req.file);
    } else {
      // JSON payload from Chrome extension
      const { jobData: jd, resume, usePersonalProfile } = req.body;
      jobData = jd;

      if (usePersonalProfile === true) {
        try {
          resumeContent = await loadPersonalPortfolio();
        } catch (e) {
          return res.status(400).json(createErrorResponse(
            'Failed to load personal profile',
            'FILE_PROCESSING_ERROR'
          ));
        }
      } else if (resume?.binaryData) {
        // Handle base64 encoded file data
        try {
          const buffer = Buffer.from(resume.binaryData, 'base64');
          const mockFile = {
            buffer: buffer,
            mimetype: resume.fileType,
            originalname: resume.filename
          };
          resumeContent = await processResumeFile(mockFile);
        } catch (e) {
          return res.status(400).json(createErrorResponse(
            'Failed to process uploaded file',
            'FILE_PROCESSING_ERROR'
          ));
        }
      } else if (resume?.content) {
        resumeContent = resume.content;
      } else {
        return res.status(400).json(createErrorResponse(
          'No resume content provided',
          'MISSING_RESUME_DATA'
        ));
      }
    }

    // If request flag or env flag is enabled, override resume content with personal portfolio
    try {
      const usePersonal = req.body.usePersonalProfile === true;
      if (usePersonal) {
        resumeContent = await loadPersonalPortfolio();
        console.log('Using personal portfolio.txt for enhanced analysis (flag/env)');
      }
    } catch (e) {
      console.warn('Failed to load portfolio.txt, using provided resume content:', e.message);
    }

    // Validate required data
    if (!jobData || !jobData.title || !jobData.description) {
      return res.status(400).json(createErrorResponse(
        'Invalid job data. Title and description are required.',
        'MISSING_JOB_DATA',
        { received: Object.keys(jobData || {}) }
      ));
    }

    if (!resumeContent || resumeContent.trim().length === 0) {
      return res.status(400).json(createErrorResponse(
        'Resume content is empty or could not be processed',
        'EMPTY_RESUME_CONTENT'
      ));
    }

    console.log('Processing enhanced analysis:', {
      jobTitle: jobData.title,
      resumeLength: resumeContent.length,
      jobDescriptionPreview: jobData.description ? jobData.description.substring(0, 200) : 'NO DESCRIPTION',
      hasKeySkills: jobData.description ? jobData.description.includes('Key Skills:') : false,
      resumeInfo: {
        filename: req.file?.originalname || req.body.resume?.filename || 'unknown',
        fileSize: req.file?.size || req.body.resume?.fileSize || (typeof resumeContent === 'string' ? resumeContent.length : 0)
      }
    });

    // Check for existing analysis first (unless force rerun is requested)
    const forceRerun = req.body.forceRerun === true;

    // Prepare resume info for cache checking
    let resumeInfo = {
      filename: req.file?.originalname || req.body.resume?.filename || 'unknown',
      fileSize: req.file?.size || req.body.resume?.fileSize || (typeof resumeContent === 'string' ? resumeContent.length : 0)
    };
    // Adjust resumeInfo when using personal profile content
    if (req.body.usePersonalProfile === true) {
      resumeInfo = {
        filename: 'portfolio.txt',
        fileSize: typeof resumeContent === 'string' ? resumeContent.length : 0
      };
    }

    if (!forceRerun) {
      console.log('🔍 Checking for existing analysis with specific resume...');

      try {
        const existingAnalysis = await dataManager.loadAnalysisResult(jobData.url, resumeInfo, jobData.description || '');

        if (existingAnalysis) {
          console.log('✅ Found exact match for this resume, returning cached result');

          // Add a flag to indicate this is from storage
          const cachedResponse = {
            ...existingAnalysis.analysisData,
            metadata: {
              ...existingAnalysis.analysisData.metadata,
              isFromCache: true,
              cacheTimestamp: existingAnalysis.timestamp
            }
          };

          return res.json(cachedResponse);
        } else {
          console.log('🆕 No existing analysis found for this resume, proceeding with fresh analysis...');
        }
      } catch (cacheError) {
        console.log('⚠️ Error checking cache, proceeding with fresh analysis:', cacheError.message);
      }
    } else {
      console.log('🔄 Force rerun requested, skipping cache check...');
    }

    // Perform AI-enhanced skill extraction first
    let analysisResult;
    try {
      const aiOptions = {
        useAI: true,
        aiModel: req.body.aiModel || 'openai/gpt-4o-mini',
        includeDetails: true
      };
      // analysisResult = await analyzeResumeMatchAI(jobData, resumeContent, aiOptions);
      analysisResult = await analyzeResumeMatchEnhanced(jobData, resumeContent, aiOptions);
    } catch (aiError) {
      console.log('AI analysis failed, using dictionary fallback:', aiError.message);
      analysisResult = await analyzeResumeMatch(jobData, resumeContent);
    }

    console.log('Analysis result structure:', {
      matchPercentage: analysisResult.matchPercentage,
      matchedSkillsCount: analysisResult.matchedSkills?.length || 0,
      missingSkillsCount: analysisResult.missingSkills?.length || 0,
      hasJobSkills: !!analysisResult.jobSkills,
      hasResumeSkills: !!analysisResult.resumeSkills
    });

    // If AI analysis failed and we're using basic analysis, format it differently
    if (!analysisResult.jobSkills || !analysisResult.resumeSkills) {
      // Use the basic analysis results directly
      // Build categorized skills from matched/missing to populate preferred section
      const jobSkillsUnified = Array.from(new Set([
        ...(analysisResult.matchedSkills || []),
        ...(analysisResult.missingSkills || [])
      ]));

      const { mustHaveSkills, niceToHaveSkills } = categorizeJobSkills(jobData, jobSkillsUnified);

      const matchedMustHave = mustHaveSkills.filter(s => (analysisResult.matchedSkills || []).includes(s));
      const matchedNiceToHave = niceToHaveSkills.filter(s => (analysisResult.matchedSkills || []).includes(s));
      const missingMustHave = mustHaveSkills.filter(s => (analysisResult.missingSkills || []).includes(s));
      const missingNiceToHave = niceToHaveSkills.filter(s => (analysisResult.missingSkills || []).includes(s));

      const mustHavePercent = mustHaveSkills.length > 0
        ? Math.round((matchedMustHave.length / mustHaveSkills.length) * 100)
        : 100;
      const niceToHavePercent = niceToHaveSkills.length > 0
        ? Math.round((matchedNiceToHave.length / niceToHaveSkills.length) * 100)
        : 100;

      const basicResponse = {
        matchScore: {
          overall: analysisResult.matchPercentage || 0,
          mustHave: mustHavePercent,
          niceToHave: niceToHavePercent,
          recommendation: getRecommendationText(analysisResult.matchPercentage || 0)
        },
        skills: {
          matched: {
            mustHave: matchedMustHave.map(skill => ({ name: skill })),
            niceToHave: matchedNiceToHave.map(skill => ({ name: skill }))
          },
          missing: {
            mustHave: missingMustHave.map(skill => ({ name: skill })),
            niceToHave: missingNiceToHave.map(skill => ({ name: skill }))
          },
          extra: []
        },
        // Ensure insights match the frontend's expected structure
        insights: {
          strengths: analysisResult.analysis?.strengths || ['Strong alignment with core requirements'],
          improvements: analysisResult.analysis?.recommendations || [],
          careerAdvice: []
        }
      };

      const successResponse = createSuccessResponse(basicResponse, {
        processingTime: Date.now() - startTime,
        analysisMethod: analysisResult.analysisMethod || 'basic',
        aiEnabled: false,
        version: '1.0',
        resumeInfo: {
          filename: req.file?.originalname || req.body.resume?.filename || 'unknown',
          fileSize: req.file?.size || req.body.resume?.fileSize || (typeof resumeContent === 'string' ? resumeContent.length : 0),
          analyzedAt: new Date().toISOString()
        }
      });

      // Save basic analysis result to file
      try {
        await dataManager.saveAnalysisResult(jobData.url, successResponse, resumeInfo, jobData.description || '');
      } catch (saveError) {
        console.error('Failed to save basic analysis result:', saveError);
      }

      return res.json(successResponse);
    }

    // Extract skills for enhanced matching
    const jobSkills = analysisResult.jobSkills || [];
    const resumeSkills = analysisResult.resumeSkills || [];

    // Categorize job skills (must-have vs nice-to-have)
    const { mustHaveSkills, niceToHaveSkills } = categorizeJobSkills(jobData, jobSkills);

    // Perform weighted matching (expects job requirements object)
    const matchingResults = compareSkillsWeighted(
      resumeSkills,
      { mustHave: mustHaveSkills, niceToHave: niceToHaveSkills },
      {
        mustHaveWeight: 0.7,
        niceToHaveWeight: 0.3
      }
    );

    // Format response for frontend
    const formattedResponse = formatMatchingResponse(matchingResults, jobData, {
      totalSkills: resumeSkills.length,
      experienceLevel: detectExperienceLevel(resumeContent)
    });

    // Add processing metadata
    const processingTime = Date.now() - startTime;
    const successResponse = createSuccessResponse(formattedResponse, {
      processingTime,
      analysisMethod: analysisResult.analysisMethod || 'enhanced',
      aiEnabled: analysisResult.aiAvailable !== false,
      version: '1.0',
      resumeInfo: {
        filename: req.file?.originalname || req.body.resume?.filename || 'unknown',
        fileSize: req.file?.size || req.body.resume?.fileSize || (typeof resumeContent === 'string' ? resumeContent.length : 0),
        analyzedAt: new Date().toISOString()
      }
    });

    // Save analysis result to file
    try {
      await dataManager.saveAnalysisResult(jobData.url, successResponse, resumeInfo, jobData.description || '');
    } catch (saveError) {
      console.error('Failed to save analysis result:', saveError);
      // Don't fail the request if saving fails
    }

    res.json(successResponse);

  } catch (error) {
    console.error('Enhanced analysis error:', error);

    const errorResponse = formatMatchingError(error, 'enhanced_analysis');
    res.status(500).json(errorResponse);
  }
});

/**
 * Get recommendation text based on match percentage
 * @param {number} percentage - Match percentage
 * @returns {string} - Recommendation text
 */
function getRecommendationText(percentage) {
  if (percentage >= 80) return 'Excellent match! You meet most requirements.';
  if (percentage >= 60) return 'Good fit. Strong alignment with job requirements.';
  if (percentage >= 40) return 'Moderate fit. Consider highlighting relevant experience.';
  return 'Limited match. Additional skill development may be needed.';
}

/**
 * Categorize job skills into must-have vs nice-to-have
 * @param {Object} jobData - Job description data
 * @param {Array<string>} jobSkills - Extracted job skills
 * @returns {Object} - Categorized skills
 */
function categorizeJobSkills(jobData, jobSkills) {
  const description = (jobData.description || '').toLowerCase();
  const mustHaveSkills = [];
  const niceToHaveSkills = [];

  // Keywords that indicate must-have skills
  const mustHaveIndicators = [
    'required', 'must have', 'essential', 'mandatory', 'minimum',
    'qualified candidates must', 'you must', 'required experience',
    'minimum qualifications', 'basic requirements'
  ];

  // Keywords that indicate nice-to-have skills
  const niceToHaveIndicators = [
    'preferred', 'nice to have', 'bonus', 'plus', 'advantage',
    'would be great', 'additional', 'preferred qualifications',
    'nice-to-have', 'a plus', 'beneficial'
  ];

  // Split description into sections
  const sections = description.split(/(?:\n|\.|!|\?)+/);

  jobSkills.forEach(skill => {
    const skillLower = skill.toLowerCase();
    let isMustHave = false;
    let isNiceToHave = false;

    // Check each section for the skill
    sections.forEach(section => {
      if (section.includes(skillLower)) {
        const hasMustHaveIndicator = mustHaveIndicators.some(indicator =>
          section.includes(indicator)
        );
        const hasNiceToHaveIndicator = niceToHaveIndicators.some(indicator =>
          section.includes(indicator)
        );

        if (hasMustHaveIndicator) isMustHave = true;
        if (hasNiceToHaveIndicator) isNiceToHave = true;
      }
    });

    // Default logic: first 70% of skills are must-have, rest are nice-to-have
    if (!isMustHave && !isNiceToHave) {
      const index = jobSkills.indexOf(skill);
      isMustHave = index < (jobSkills.length * 0.7);
    }

    if (isMustHave && !isNiceToHave) {
      mustHaveSkills.push(skill);
    } else {
      niceToHaveSkills.push(skill);
    }
  });

  return { mustHaveSkills, niceToHaveSkills };
}

/**
 * Detect experience level from resume content
 * @param {string} resumeContent - Resume text content
 * @returns {string} - Experience level (entry, mid, senior)
 */
function detectExperienceLevel(resumeContent) {
  const content = resumeContent.toLowerCase();

  // Look for years of experience
  const yearMatches = content.match(/(\d+)[+\s]*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/g);
  if (yearMatches) {
    const years = Math.max(...yearMatches.map(match =>
      parseInt(match.match(/\d+/)[0])
    ));

    if (years >= 5) return 'senior';
    if (years >= 2) return 'mid';
    return 'entry';
  }

  // Check for seniority indicators
  if (content.includes('senior') || content.includes('lead') || content.includes('principal')) {
    return 'senior';
  }

  if (content.includes('junior') || content.includes('entry') || content.includes('intern')) {
    return 'entry';
  }

  // Default to mid-level
  return 'mid';
}

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size too large. Maximum size is 10MB.'
      });
    }
  }

  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Note: Request timing middleware is defined above, after body parser

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Job Analyser Backend Server (LinkedIn & Naukri)`);
  console.log(`📍 Running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Analyze endpoint: http://localhost:${PORT}/api/analyze-resume`);
  console.log(`🌐 Supported sites: LinkedIn, Naukri`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);

  // Log AI configuration
  aiConfig.logConfiguration();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});