const { getAllSkills, SKILL_ALIASES, getSkillsByCategory } = require('./skillsDictionary');

/**
 * Extract technical skills from plain text using dictionary-based matching
 * @param {string} text - Plain text input (resume, job description, etc.)
 * @param {Object} options - Extraction options
 * @returns {Array<string>} - Array of unique normalized skill names
 */
function extractSkills(text, options = {}) {
  const {
    caseSensitive = false,
    includeVariations = true,
    minWordLength = 2,
    categories = null // null means all categories, or specify array like ['programming', 'frontend']
  } = options;

  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize input text
  const normalizedText = caseSensitive ? text : text.toLowerCase();
  
  // Get skills to search for
  const skillsToSearch = categories ? 
    categories.flatMap(cat => getSkillsByCategory(cat)) : 
    getAllSkills();

  const foundSkills = new Set();

  // Primary skill matching
  skillsToSearch.forEach(skill => {
    const searchSkill = caseSensitive ? skill : skill.toLowerCase();
    
    if (searchSkill.length >= minWordLength && isSkillPresent(normalizedText, searchSkill)) {
      foundSkills.add(skill);
    }
  });

  // Alias matching
  if (includeVariations) {
    Object.entries(SKILL_ALIASES).forEach(([alias, canonical]) => {
      const searchAlias = caseSensitive ? alias : alias.toLowerCase();
      
      if (searchAlias.length >= minWordLength && isSkillPresent(normalizedText, searchAlias)) {
        foundSkills.add(canonical);
      }
    });
  }

  // Pattern-based extraction for common formats
  if (includeVariations) {
    const additionalSkills = extractPatternBasedSkills(normalizedText);
    additionalSkills.forEach(skill => foundSkills.add(skill));
  }

  return Array.from(foundSkills).sort();
}

/**
 * Check if a skill is present in the text with word boundaries
 * @param {string} text - Normalized text to search in
 * @param {string} skill - Skill to search for
 * @returns {boolean} - True if skill is found
 */
function isSkillPresent(text, skill) {
  // Handle multi-word skills
  if (skill.includes(' ') || skill.includes('.') || skill.includes('#') || skill.includes('+')) {
    // For multi-word skills, check for exact phrase
    return text.includes(skill);
  }

  // For single words, use word boundaries to avoid false positives
  const regex = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'i');
  return regex.test(text);
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} - Escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
}

/**
 * Extract skills using pattern matching for common formats
 * @param {string} text - Normalized text
 * @returns {Array<string>} - Additional skills found via patterns
 */
function extractPatternBasedSkills(text) {
  const additionalSkills = [];

  // Pattern 1: Version numbers (e.g., "react 18", "python 3.9")
  const versionPatterns = [
    /\\b(react|angular|vue|python|java|node\\.js|php)\\s+\\d+(\\.\\d+)?/gi,
    /\\b(javascript|typescript)\\s+(es\\d+|es20\\d{2})/gi
  ];

  versionPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const skill = match.split(/\\s+/)[0].toLowerCase();
        if (skill) {
          additionalSkills.push(skill);
        }
      });
    }
  });

  // Pattern 2: File extensions as technology indicators
  const extensionMap = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala'
  };

  Object.entries(extensionMap).forEach(([ext, skill]) => {
    if (text.includes(ext)) {
      additionalSkills.push(skill);
    }
  });

  // Pattern 3: Common abbreviations and acronyms
  const acronymPatterns = {
    'html5': 'html',
    'css3': 'css',
    'es6': 'javascript',
    'es2015': 'javascript',
    'es2020': 'javascript',
    'aws lambda': 'aws',
    'azure devops': 'azure',
    'google cloud': 'gcp'
  };

  Object.entries(acronymPatterns).forEach(([pattern, skill]) => {
    if (text.includes(pattern.toLowerCase())) {
      additionalSkills.push(skill);
    }
  });

  return additionalSkills;
}

/**
 * Extract skills with confidence scores
 * @param {string} text - Input text
 * @param {Object} options - Extraction options
 * @returns {Array<Object>} - Skills with confidence scores
 */
function extractSkillsWithConfidence(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const normalizedText = text.toLowerCase();
  const skills = extractSkills(text, options);
  
  return skills.map(skill => ({
    skill,
    confidence: calculateSkillConfidence(normalizedText, skill),
    category: findSkillCategory(skill)
  })).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate confidence score for a skill based on context
 * @param {string} text - Normalized text
 * @param {string} skill - Skill name
 * @returns {number} - Confidence score (0-1)
 */
function calculateSkillConfidence(text, skill) {
  let confidence = 0.5; // Base confidence

  // Factor 1: Frequency of mentions
  const occurrences = (text.match(new RegExp(escapeRegExp(skill.toLowerCase()), 'g')) || []).length;
  confidence += Math.min(occurrences * 0.1, 0.3);

  // Factor 2: Context clues
  const contextPatterns = [
    `experience with ${skill}`,
    `proficient in ${skill}`,
    `expert in ${skill}`,
    `skilled in ${skill}`,
    `${skill} development`,
    `${skill} programming`,
    `years of ${skill}`,
    `${skill} projects`
  ];

  const contextFound = contextPatterns.some(pattern => 
    text.includes(pattern.toLowerCase())
  );
  if (contextFound) {
    confidence += 0.2;
  }

  // Factor 3: Section placement (if in skills section)
  const skillsSectionPattern = /skills?[\\s\\S]*?(?=\\n\\n|$)/i;
  const skillsSection = text.match(skillsSectionPattern);
  if (skillsSection && skillsSection[0].toLowerCase().includes(skill.toLowerCase())) {
    confidence += 0.2;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Find which category a skill belongs to
 * @param {string} skill - Skill name
 * @returns {string|null} - Category name or null if not found
 */
function findSkillCategory(skill) {
  const { SKILLS_DICTIONARY } = require('./skillsDictionary');
  
  for (const [category, skills] of Object.entries(SKILLS_DICTIONARY)) {
    if (skills.includes(skill.toLowerCase())) {
      return category;
    }
  }
  return null;
}

/**
 * Get skill statistics from text
 * @param {string} text - Input text
 * @returns {Object} - Statistics object
 */
function getSkillStatistics(text) {
  const skills = extractSkillsWithConfidence(text);
  const categoryCounts = {};
  
  skills.forEach(({ category }) => {
    if (category) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }
  });

  return {
    totalSkills: skills.length,
    highConfidenceSkills: skills.filter(s => s.confidence > 0.7).length,
    categoryBreakdown: categoryCounts,
    topSkills: skills.slice(0, 10),
    averageConfidence: skills.length > 0 ? 
      skills.reduce((sum, s) => sum + s.confidence, 0) / skills.length : 0
  };
}

/**
 * Compare skills between two texts (e.g., resume vs job description)
 * @param {string} resumeText - Resume text
 * @param {string} jobText - Job description text
 * @returns {Object} - Comparison results
 */
function compareSkills(resumeText, jobText) {
  const resumeSkills = new Set(extractSkills(resumeText));
  const jobSkills = new Set(extractSkills(jobText));
  
  const matchedSkills = [...resumeSkills].filter(skill => jobSkills.has(skill));
  const missingSkills = [...jobSkills].filter(skill => !resumeSkills.has(skill));
  const extraSkills = [...resumeSkills].filter(skill => !jobSkills.has(skill));
  
  const matchPercentage = jobSkills.size > 0 ? 
    Math.round((matchedSkills.length / jobSkills.size) * 100) : 0;

  return {
    matchPercentage,
    matchedSkills: matchedSkills.sort(),
    missingSkills: missingSkills.sort(),
    extraSkills: extraSkills.sort(),
    totalJobSkills: jobSkills.size,
    totalResumeSkills: resumeSkills.size
  };
}

module.exports = {
  extractSkills,
  extractSkillsWithConfidence,
  compareSkills,
  getSkillStatistics,
  calculateSkillConfidence,
  findSkillCategory,
  isSkillPresent
};