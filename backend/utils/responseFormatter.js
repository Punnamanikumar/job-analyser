/**
 * Standardized API Response Formatter
 * Ensures consistent, frontend-friendly JSON responses
 */

/**
 * Standard success response format
 * @param {Object} data - Response data
 * @param {Object} metadata - Optional metadata
 * @returns {Object} - Formatted success response
 */
function createSuccessResponse(data, metadata = {}) {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      processingTime: metadata.processingTime || 0,
      version: '1.0',
      ...metadata
    }
  };
}

/**
 * Standard error response format
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @returns {Object} - Formatted error response
 */
function createErrorResponse(message, code = 'GENERIC_ERROR', details = {}) {
  return {
    success: false,
    timestamp: new Date().toISOString(),
    error: {
      message,
      code,
      details
    }
  };
}

/**
 * Format skill matching results for frontend consumption
 * @param {Object} matchingResults - Raw matching results
 * @param {Object} jobData - Original job data
 * @param {Object} resumeData - Original resume data
 * @returns {Object} - Frontend-friendly response
 */
function formatMatchingResponse(matchingResults, jobData, resumeData) {
  const {
    weightedMatchPercentage,
    mustHave,
    niceToHave,
    overall,
    scoring
  } = matchingResults;

  return {
    // Main results - what frontend needs most
    matchScore: {
      overall: weightedMatchPercentage,
      mustHave: mustHave.matchPercentage,
      niceToHave: niceToHave.matchPercentage,
      recommendation: getMatchRecommendation(weightedMatchPercentage)
    },

    // Skills breakdown for visual display
    skills: {
      matched: {
        mustHave: mustHave.matchedSkills.map(skill => ({
          name: skill,
          category: 'required',
          importance: 'high'
        })),
        niceToHave: niceToHave.matchedSkills.map(skill => ({
          name: skill,
          category: 'preferred',
          importance: 'medium'
        }))
      },
      
      missing: {
        mustHave: mustHave.missingSkills.map(skill => ({
          name: skill,
          category: 'required',
          importance: 'high',
          severity: 'critical'
        })),
        niceToHave: niceToHave.missingSkills.map(skill => ({
          name: skill,
          category: 'preferred',
          importance: 'medium',
          severity: 'minor'
        }))
      },

      extra: overall.extraSkills.slice(0, 15).map(skill => ({
        name: skill,
        category: 'additional',
        importance: 'bonus'
      }))
    },

    // Summary statistics
    summary: {
      totalJobSkills: mustHave.totalJobSkills + niceToHave.totalJobSkills,
      totalMatched: mustHave.totalMatches + niceToHave.totalMatches,
      criticalGaps: mustHave.missingSkills.length,
      bonusSkills: overall.extraSkills.length,
      matchCategory: getMatchCategory(weightedMatchPercentage)
    },

    // Analysis insights
    insights: {
      strengths: generateStrengthsInsights(matchingResults),
      improvements: generateImprovementInsights(matchingResults),
      careerAdvice: generateCareerAdvice(matchingResults, jobData)
    },

    // Detailed scoring (for advanced users)
    scoring: {
      algorithm: 'weighted_matching_v1',
      weights: {
        mustHave: scoring.mustHaveWeight,
        niceToHave: scoring.niceToHaveWeight
      },
      breakdown: {
        mustHaveScore: scoring.mustHaveScore,
        niceToHaveScore: scoring.niceToHaveScore,
        weightedFinal: scoring.finalScore
      }
    },

    // Job and resume context
    context: {
      job: {
        title: jobData.title || 'Unknown Position',
        company: jobData.company || null,
        level: detectJobLevel(jobData.title, jobData.description)
      },
      resume: {
        experience: resumeData.experienceLevel || 'unknown',
        skillCount: resumeData.totalSkills || 0
      }
    }
  };
}

/**
 * Get match recommendation text
 * @param {number} percentage - Match percentage
 * @returns {string} - Recommendation text
 */
function getMatchRecommendation(percentage) {
  if (percentage >= 85) return 'Excellent fit! You meet most requirements.';
  if (percentage >= 70) return 'Good match! Strong candidate for this role.';
  if (percentage >= 55) return 'Moderate fit. Consider highlighting relevant experience.';
  if (percentage >= 40) return 'Some gaps exist. Focus on developing key skills.';
  return 'Significant skill gaps. Consider this for future growth.';
}

/**
 * Get match category for UI display
 * @param {number} percentage - Match percentage
 * @returns {string} - Match category
 */
function getMatchCategory(percentage) {
  if (percentage >= 85) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 55) return 'fair';
  if (percentage >= 40) return 'poor';
  return 'very-poor';
}

/**
 * Generate strengths insights
 * @param {Object} matchingResults - Matching results
 * @returns {Array<string>} - Strengths insights
 */
function generateStrengthsInsights(matchingResults) {
  const insights = [];
  const { mustHave, niceToHave, overall } = matchingResults;

  if (mustHave.matchPercentage >= 80) {
    insights.push('Strong alignment with core requirements');
  }

  if (niceToHave.matchPercentage >= 70) {
    insights.push('Excellent additional qualifications');
  }

  if (overall.extraSkills.length > 10) {
    insights.push('Diverse technical background with many bonus skills');
  }

  if (mustHave.missingSkills.length === 0) {
    insights.push('Meets all essential requirements');
  }

  // Category-specific strengths
  const skillCategories = categorizeSkills([...mustHave.matchedSkills, ...niceToHave.matchedSkills]);
  Object.entries(skillCategories).forEach(([category, skills]) => {
    if (skills.length >= 3) {
      insights.push(`Strong ${category} expertise`);
    }
  });

  return insights.slice(0, 5); // Limit to top 5
}

/**
 * Generate improvement insights
 * @param {Object} matchingResults - Matching results
 * @returns {Array<string>} - Improvement insights
 */
function generateImprovementInsights(matchingResults) {
  const insights = [];
  const { mustHave, niceToHave } = matchingResults;

  if (mustHave.missingSkills.length > 0) {
    insights.push(`Focus on developing: ${mustHave.missingSkills.slice(0, 3).join(', ')}`);
  }

  if (mustHave.missingSkills.length > 5) {
    insights.push('Consider additional training to meet core requirements');
  }

  if (niceToHave.missingSkills.length > 0 && mustHave.missingSkills.length <= 2) {
    insights.push(`Enhance profile with: ${niceToHave.missingSkills.slice(0, 3).join(', ')}`);
  }

  return insights.slice(0, 3); // Limit to top 3
}

/**
 * Generate career advice
 * @param {Object} matchingResults - Matching results
 * @param {Object} jobData - Job data
 * @returns {Array<string>} - Career advice
 */
function generateCareerAdvice(matchingResults, jobData) {
  const advice = [];
  const { mustHave, overall } = matchingResults;

  // Experience level advice
  const jobLevel = detectJobLevel(jobData.title, jobData.description);
  if (jobLevel === 'senior' && mustHave.matchPercentage < 70) {
    advice.push('Consider gaining more hands-on experience in key technologies');
  }

  if (jobLevel === 'entry' && overall.extraSkills.length > 15) {
    advice.push('You may be overqualified - consider more senior positions');
  }

  // Industry-specific advice
  if (jobData.description && jobData.description.toLowerCase().includes('startup')) {
    advice.push('Highlight adaptability and willingness to wear multiple hats');
  }

  return advice.slice(0, 3); // Limit to top 3
}

/**
 * Detect job level from title and description
 * @param {string} title - Job title
 * @param {string} description - Job description
 * @returns {string} - Job level (entry, mid, senior, lead)
 */
function detectJobLevel(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
    return 'senior';
  }
  if (text.includes('junior') || text.includes('entry') || text.includes('graduate')) {
    return 'entry';
  }
  if (text.includes('mid') || text.match(/\b\d+\+?\s*years?\b/) && !text.includes('1 year')) {
    return 'mid';
  }
  return 'mid'; // Default assumption
}

/**
 * Categorize skills by domain
 * @param {Array<string>} skills - Skills array
 * @returns {Object} - Skills grouped by category
 */
function categorizeSkills(skills) {
  const categories = {
    'Frontend': ['react', 'angular', 'vue', 'javascript', 'typescript', 'html', 'css'],
    'Backend': ['node.js', 'python', 'java', 'express', 'django', 'spring'],
    'Database': ['mysql', 'postgresql', 'mongodb', 'redis'],
    'Cloud': ['aws', 'azure', 'google cloud', 'docker', 'kubernetes'],
    'Mobile': ['react native', 'flutter', 'ios', 'android'],
    'Data': ['machine learning', 'data science', 'python', 'r', 'sql']
  };

  const result = {};
  Object.entries(categories).forEach(([category, categorySkills]) => {
    result[category] = skills.filter(skill =>
      categorySkills.some(catSkill =>
        skill.toLowerCase().includes(catSkill.toLowerCase())
      )
    );
  });

  return result;
}

/**
 * Format error response for skill matching failures
 * @param {Error} error - Original error
 * @param {string} context - Error context
 * @returns {Object} - Formatted error response
 */
function formatMatchingError(error, context = 'skill_matching') {
  const errorMap = {
    'INVALID_SKILLS_FORMAT': 'Skills data format is invalid',
    'MISSING_JOB_DATA': 'Job description data is missing',
    'MISSING_RESUME_DATA': 'Resume data is missing',
    'PROCESSING_FAILED': 'Skill processing failed',
    'AI_SERVICE_UNAVAILABLE': 'AI service temporarily unavailable'
  };

  const errorCode = error.code || 'PROCESSING_FAILED';
  const userMessage = errorMap[errorCode] || 'An error occurred during skill matching';

  return createErrorResponse(userMessage, errorCode, {
    context,
    originalError: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  formatMatchingResponse,
  formatMatchingError,
  getMatchRecommendation,
  getMatchCategory,
  generateStrengthsInsights,
  generateImprovementInsights,
  generateCareerAdvice,
  categorizeSkills
};