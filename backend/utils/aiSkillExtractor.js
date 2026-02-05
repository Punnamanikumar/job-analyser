const OpenAI = require('openai');
const { extractSkills } = require('./skillExtractor'); // Fallback to dictionary-based extraction
const aiConfig = require('./aiConfig');

/**
 * AI-Based Skill Extraction using Large Language Models
 * Provides semantic skill detection and categorization
 * Supports OpenRouter and OpenAI providers
 */

class AISkillExtractor {
  constructor(options = {}) {
    const config = aiConfig.getConfig();

    // Skip initialization for local providers
    if (config.isLocal) {
      this.openai = null;
      console.log('🦙 AI Skill Extractor: Local mode (Ollama) - using enhanced analyser');
      return;
    }

    this.apiKey = options.apiKey || config.apiKey;
    this.model = options.model || config.model;
    this.maxTokens = options.maxTokens || 1500;
    this.temperature = options.temperature || 0.1; // Low temperature for consistent output
    this.provider = config.provider;

    if (this.apiKey) {
      const clientConfig = {
        apiKey: this.apiKey,
        baseURL: config.baseUrl
      };

      // Add OpenRouter-specific headers
      if (config.provider === 'openrouter') {
        clientConfig.defaultHeaders = {
          'HTTP-Referer': config.refererUrl,
          'X-Title': 'LinkedIn Analyser'
        };
      }

      this.openai = new OpenAI(clientConfig);
      console.log(`🤖 Using ${config.provider.toUpperCase()} for AI analysis with model: ${this.model}`);
    } else {
      console.warn('⚠️  AI API key not found. AI extraction will fallback to dictionary-based extraction.');
    }
  }

  /**
   * Extract skills from resume text using AI
   * @param {string} resumeText - Resume content
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} - Structured skill extraction results
   */
  async extractResumeSkills(resumeText, options = {}) {
    if (!this.openai) {
      return this.fallbackExtraction(resumeText, 'resume');
    }

    const prompt = this.buildResumeExtractionPrompt(resumeText);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('resume')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return this.validateAndNormalizeResult(result, 'resume');

    } catch (error) {
      console.error('AI extraction failed:', error.message);
      console.log('Falling back to dictionary-based extraction...');
      return this.fallbackExtraction(resumeText, 'resume');
    }
  }

  /**
   * Extract skills from job description using AI
   * @param {string} jobText - Job description content
   * @param {string} jobTitle - Job title for context
   * @returns {Promise<Object>} - Structured skill requirements
   */
  async extractJobSkills(jobText, jobTitle = '') {
    if (!this.openai) {
      return this.fallbackExtraction(jobText, 'job');
    }

    const prompt = this.buildJobExtractionPrompt(jobText, jobTitle);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('job')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return this.validateAndNormalizeResult(result, 'job');

    } catch (error) {
      console.error('AI extraction failed:', error.message);
      console.log('Falling back to dictionary-based extraction...');
      return this.fallbackExtraction(jobText, 'job');
    }
  }

  /**
   * Get system prompt based on extraction type
   * @param {string} type - 'resume' or 'job'
   * @returns {string} - System prompt
   */
  getSystemPrompt(type) {
    if (type === 'resume') {
      return `You are an expert resume parser specialized in extracting technical skills from candidate profiles. 

Your task is to:
1. Identify all technical skills mentioned in the resume
2. Categorize skills by proficiency level (expert, proficient, familiar)
3. Group skills by domain (programming, frameworks, databases, cloud, etc.)
4. Extract years of experience when mentioned
5. Identify certifications and education relevant to technical skills

Return a JSON object with this exact structure:
{
  "technical_skills": {
    "expert": ["skill1", "skill2"],
    "proficient": ["skill3", "skill4"], 
    "familiar": ["skill5", "skill6"]
  },
  "skills_by_category": {
    "programming_languages": ["language1", "language2"],
    "frameworks": ["framework1", "framework2"],
    "databases": ["db1", "db2"],
    "cloud_platforms": ["platform1", "platform2"],
    "tools": ["tool1", "tool2"],
    "other": ["other1", "other2"]
  },
  "experience_level": "junior|mid|senior|expert",
  "years_of_experience": number,
  "certifications": ["cert1", "cert2"],
  "education": "degree_level"
}

Rules:
- Only extract technical skills, ignore soft skills
- Normalize skill names (e.g., "JS" -> "JavaScript")
- Be conservative with proficiency levels
- Use lowercase for all skill names
- Return empty arrays if no skills found in a category`;
    } else {
      return `You are an expert job requirements analyzer specialized in extracting technical skill requirements from job descriptions.

Your task is to:
1. Identify required vs preferred technical skills
2. Categorize skills by importance (must_have vs good_to_have)
3. Extract experience level requirements
4. Identify specific technologies, frameworks, and tools mentioned
5. Determine seniority level from requirements

Return a JSON object with this exact structure:
{
  "must_have_skills": ["skill1", "skill2"],
  "good_to_have_skills": ["skill3", "skill4"],
  "skills_by_category": {
    "programming_languages": ["language1", "language2"],
    "frameworks": ["framework1", "framework2"],
    "databases": ["db1", "db2"],
    "cloud_platforms": ["platform1", "platform2"],
    "tools": ["tool1", "tool2"],
    "other": ["other1", "other2"]
  },
  "experience_requirements": {
    "minimum_years": number,
    "preferred_years": number,
    "seniority_level": "junior|mid|senior|expert"
  },
  "required_certifications": ["cert1", "cert2"],
  "preferred_qualifications": ["qual1", "qual2"]
}

Rules:
- Distinguish between required and preferred skills carefully
- Extract specific version numbers when mentioned (e.g., "React 18")
- Normalize skill names consistently
- Use lowercase for all skill names
- Look for phrases like "required", "must have", "essential" vs "preferred", "nice to have", "plus"
- IMPORTANT: If the job description starts with "EXPERIENCE REQUIRED: X - Y years", use X as minimum_years and Y as preferred_years. This is the official job requirement.
- If you see "EXPERIENCE REQUIRED: 5 - 10 years", set minimum_years to 5 and preferred_years to 10.
- Ignore any other experience mentions in the job body (like "3+ years") if EXPERIENCE REQUIRED is specified.`;
    }
  }

  /**
   * Build resume extraction prompt
   * @param {string} resumeText - Resume content
   * @returns {string} - Extraction prompt
   */
  buildResumeExtractionPrompt(resumeText) {
    return `Please analyze the following resume and extract technical skills according to the specified JSON format:

    RESUME TEXT:
    ${resumeText.substring(0, 20000)} ${resumeText.length > 20000 ? '...[truncated]' : ''}

    Focus on:
    - Programming languages and their proficiency levels
    - Frameworks, libraries, and technologies
    - Databases and data technologies  
    - Cloud platforms and DevOps tools
    - Development tools and methodologies
    - Years of experience mentioned with specific technologies
    - Technical certifications and relevant education

    Extract only technical skills and ignore soft skills like "communication" or "leadership".`;
  }

  /**
   * Build job extraction prompt
   * @param {string} jobText - Job description content
   * @param {string} jobTitle - Job title for context
   * @returns {string} - Extraction prompt
   */
  buildJobExtractionPrompt(jobText, jobTitle) {
    return `Please analyze the following job description and extract technical skill requirements according to the specified JSON format:

    JOB TITLE: ${jobTitle}

    JOB DESCRIPTION:
    ${jobText.substring(0, 20000)} ${jobText.length > 20000 ? '...[truncated]' : ''}

    Focus on:
    - Required vs preferred technical skills
    - Specific technologies, programming languages, frameworks
    - Database and infrastructure requirements
    - Cloud platform and DevOps tool requirements
    - Minimum and preferred years of experience
    - Required certifications
    - Seniority level indicators

    Pay attention to language that indicates importance:
    - Required/Must have/Essential/Required → must_have_skills
    - Preferred/Nice to have/Plus/Bonus → good_to_have_skills`;
  }

  /**
   * Validate and normalize AI extraction results
   * @param {Object} result - Raw AI extraction result
   * @param {string} type - 'resume' or 'job'
   * @returns {Object} - Validated and normalized result
   */
  validateAndNormalizeResult(result, type) {
    try {
      if (type === 'resume') {
        return {
          technical_skills: {
            expert: this.normalizeSkills(result.technical_skills?.expert || []),
            proficient: this.normalizeSkills(result.technical_skills?.proficient || []),
            familiar: this.normalizeSkills(result.technical_skills?.familiar || [])
          },
          skills_by_category: {
            programming_languages: this.normalizeSkills(result.skills_by_category?.programming_languages || []),
            frameworks: this.normalizeSkills(result.skills_by_category?.frameworks || []),
            databases: this.normalizeSkills(result.skills_by_category?.databases || []),
            cloud_platforms: this.normalizeSkills(result.skills_by_category?.cloud_platforms || []),
            tools: this.normalizeSkills(result.skills_by_category?.tools || []),
            other: this.normalizeSkills(result.skills_by_category?.other || [])
          },
          experience_level: result.experience_level || 'unknown',
          years_of_experience: result.years_of_experience || 0,
          certifications: result.certifications || [],
          education: result.education || 'unknown',
          extraction_method: 'ai'
        };
      } else {
        return {
          must_have_skills: this.normalizeSkills(result.must_have_skills || []),
          good_to_have_skills: this.normalizeSkills(result.good_to_have_skills || []),
          skills_by_category: {
            programming_languages: this.normalizeSkills(result.skills_by_category?.programming_languages || []),
            frameworks: this.normalizeSkills(result.skills_by_category?.frameworks || []),
            databases: this.normalizeSkills(result.skills_by_category?.databases || []),
            cloud_platforms: this.normalizeSkills(result.skills_by_category?.cloud_platforms || []),
            tools: this.normalizeSkills(result.skills_by_category?.tools || []),
            other: this.normalizeSkills(result.skills_by_category?.other || [])
          },
          experience_requirements: {
            minimum_years: result.experience_requirements?.minimum_years || 0,
            preferred_years: result.experience_requirements?.preferred_years || 0,
            seniority_level: result.experience_requirements?.seniority_level || 'unknown'
          },
          required_certifications: result.required_certifications || [],
          preferred_qualifications: result.preferred_qualifications || [],
          extraction_method: 'ai'
        };
      }
    } catch (error) {
      console.error('Result validation failed:', error);
      throw new Error('Invalid AI extraction result format');
    }
  }

  /**
   * Normalize skill names
   * @param {Array<string>} skills - Raw skills array
   * @returns {Array<string>} - Normalized skills
   */
  normalizeSkills(skills) {
    if (!Array.isArray(skills)) return [];

    return skills
      .map(skill => {
        if (typeof skill !== 'string') return null;
        return skill
          .toLowerCase()
          .trim()
          .replace(/[^\w\s.+#-]/g, '') // Keep only alphanumeric, spaces, dots, plus, hash, dash
          .replace(/\s+/g, ' '); // Normalize spaces
      })
      .filter(skill => skill && skill.length > 1)
      .filter((skill, index, array) => array.indexOf(skill) === index); // Remove duplicates
  }

  /**
   * Fallback to dictionary-based extraction when AI is unavailable
   * @param {string} text - Text to analyze
   * @param {string} type - 'resume' or 'job'
   * @returns {Object} - Fallback extraction result
   */
  fallbackExtraction(text, type) {
    console.log('Using dictionary-based fallback extraction...');

    const skills = extractSkills(text);

    if (type === 'resume') {
      return {
        technical_skills: {
          expert: [],
          proficient: skills.slice(0, Math.ceil(skills.length * 0.6)),
          familiar: skills.slice(Math.ceil(skills.length * 0.6))
        },
        skills_by_category: {
          programming_languages: skills.filter(s => ['javascript', 'python', 'java', 'typescript'].includes(s)),
          frameworks: skills.filter(s => ['react', 'angular', 'vue.js', 'express', 'django'].includes(s)),
          databases: skills.filter(s => ['mysql', 'postgresql', 'mongodb', 'redis'].includes(s)),
          cloud_platforms: skills.filter(s => ['aws', 'azure', 'google cloud'].includes(s)),
          tools: skills.filter(s => ['git', 'docker', 'kubernetes'].includes(s)),
          other: skills
        },
        experience_level: 'unknown',
        years_of_experience: 0,
        certifications: [],
        education: 'unknown',
        extraction_method: 'dictionary_fallback'
      };
    } else {
      return {
        must_have_skills: skills.slice(0, Math.ceil(skills.length * 0.7)),
        good_to_have_skills: skills.slice(Math.ceil(skills.length * 0.7)),
        skills_by_category: {
          programming_languages: skills.filter(s => ['javascript', 'python', 'java', 'typescript'].includes(s)),
          frameworks: skills.filter(s => ['react', 'angular', 'vue.js', 'express', 'django'].includes(s)),
          databases: skills.filter(s => ['mysql', 'postgresql', 'mongodb', 'redis'].includes(s)),
          cloud_platforms: skills.filter(s => ['aws', 'azure', 'google cloud'].includes(s)),
          tools: skills.filter(s => ['git', 'docker', 'kubernetes'].includes(s)),
          other: skills
        },
        experience_requirements: {
          minimum_years: 0,
          preferred_years: 0,
          seniority_level: 'unknown'
        },
        required_certifications: [],
        preferred_qualifications: [],
        extraction_method: 'dictionary_fallback'
      };
    }
  }
}

/**
 * Convenience function to create AI extractor instance
 * @param {Object} options - Configuration options
 * @returns {AISkillExtractor} - AI extractor instance
 */
function createAIExtractor(options = {}) {
  return new AISkillExtractor(options);
}

/**
 * Extract skills from resume using AI
 * @param {string} resumeText - Resume content
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} - Extraction results
 */
async function extractResumeSkillsAI(resumeText, options = {}) {
  const extractor = createAIExtractor(options);
  return await extractor.extractResumeSkills(resumeText, options);
}

/**
 * Extract skills from job description using AI
 * @param {string} jobText - Job description content
 * @param {string} jobTitle - Job title for context
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} - Extraction results
 */
async function extractJobSkillsAI(jobText, jobTitle = '', options = {}) {
  const extractor = createAIExtractor(options);
  return await extractor.extractJobSkills(jobText, jobTitle);
}

module.exports = {
  AISkillExtractor,
  createAIExtractor,
  extractResumeSkillsAI,
  extractJobSkillsAI
};