const { extractSkills, compareSkills, getSkillStatistics } = require('./skillExtractor');

/**
 * Analyze resume match against job description
 * @param {Object} jobData - Job information
 * @param {string} resumeContent - Resume text content
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeResumeMatch(jobData, resumeContent) {
  try {
    console.log('Starting resume analysis...');

    // Normalize text for analysis
    const jobText = normalizeText(`${jobData.title} ${jobData.description}`);
    const resumeText = normalizeText(resumeContent);

    // Use the new skill extraction system
    const skillComparison = compareSkills(resumeContent, `${jobData.title} ${jobData.description}`);

    // Get detailed skill statistics
    const resumeStats = getSkillStatistics(resumeContent);
    const jobStats = getSkillStatistics(`${jobData.title} ${jobData.description}`);

    // Calculate match percentage
    const matchPercentage = skillComparison.matchPercentage;

    // Generate additional insights
    const insights = generateInsights(jobData, resumeContent, matchPercentage, resumeStats);

    const result = {
      matchPercentage: skillComparison.matchPercentage,
      matchedSkills: skillComparison.matchedSkills.slice(0, 20), // Limit to top 20
      missingSkills: skillComparison.missingSkills.slice(0, 20), // Limit to top 20
      totalJobSkills: skillComparison.totalJobSkills,
      totalResumeSkills: skillComparison.totalResumeSkills,
      insights,
      analysis: {
        strengths: generateStrengths(skillComparison.matchedSkills, resumeStats),
        recommendations: generateRecommendations(skillComparison.missingSkills),
        keywordDensity: calculateKeywordDensity(jobText, resumeText),
        skillsBreakdown: {
          resume: resumeStats,
          job: jobStats,
          comparison: skillComparison
        }
      }
    };

    console.log(`Analysis complete: ${matchPercentage}% match, ${skillComparison.matchedSkills.length} matched skills`);
    return result;

  } catch (error) {
    console.error('Analysis error:', error);
    throw new Error(`Resume analysis failed: ${error.message}`);
  }
}

/**
 * Normalize text for consistent analysis
 * @param {string} text - Input text
 * @returns {string} - Normalized text
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s.+#-]/g, ' ') // Keep letters, numbers, and some special chars
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find skills that match between job and resume
 * @param {Array<string>} jobSkills - Skills from job description
 * @param {Array<string>} resumeSkills - Skills from resume
 * @returns {Array<string>} - Matched skills
 */
function findMatchedSkills(jobSkills, resumeSkills) {
  return jobSkills.filter(skill => resumeSkills.includes(skill));
}

/**
 * Find skills that are required but missing from resume
 * @param {Array<string>} jobSkills - Skills from job description
 * @param {Array<string>} resumeSkills - Skills from resume
 * @returns {Array<string>} - Missing skills
 */
function findMissingSkills(jobSkills, resumeSkills) {
  return jobSkills.filter(skill => !resumeSkills.includes(skill));
}

/**
 * Calculate match percentage
 * @param {Array<string>} jobSkills - Required skills
 * @param {Array<string>} matchedSkills - Matched skills
 * @returns {number} - Match percentage (0-100)
 */
function calculateMatchPercentage(jobSkills, matchedSkills) {
  if (jobSkills.length === 0) return 0;
  return Math.round((matchedSkills.length / jobSkills.length) * 100);
}

/**
 * Generate insights about the resume match
 * @param {Object} jobData - Job information
 * @param {string} resumeContent - Resume content
 * @param {number} matchPercentage - Match percentage
 * @returns {Object} - Generated insights
 */
function generateInsights(jobData, resumeContent, matchPercentage) {
  const insights = {
    overallAssessment: '',
    experienceLevel: assessExperienceLevel(resumeContent),
    industryFit: assessIndustryFit(jobData, resumeContent),
    improvementAreas: []
  };

  // Overall assessment based on match percentage
  if (matchPercentage >= 80) {
    insights.overallAssessment = 'Excellent match! Your resume aligns very well with the job requirements.';
  } else if (matchPercentage >= 60) {
    insights.overallAssessment = 'Good match! You meet most of the key requirements for this position.';
  } else if (matchPercentage >= 40) {
    insights.overallAssessment = 'Moderate match. Consider highlighting relevant skills more prominently.';
  } else {
    insights.overallAssessment = 'Limited match. This role may require additional skills development.';
  }

  return insights;
}

/**
 * Assess experience level from resume
 * @param {string} resumeContent - Resume content
 * @returns {string} - Experience level assessment
 */
function assessExperienceLevel(resumeContent) {
  const text = resumeContent.toLowerCase();

  // Look for experience indicators
  const seniorIndicators = ['senior', 'lead', 'principal', 'architect', 'manager', 'director'];
  const midIndicators = ['5+ years', '5 years', '6 years', '7 years', '8 years', '9 years'];
  const juniorIndicators = ['junior', 'entry level', 'graduate', 'intern', 'recent graduate'];

  if (seniorIndicators.some(indicator => text.includes(indicator))) {
    return 'Senior Level';
  } else if (midIndicators.some(indicator => text.includes(indicator))) {
    return 'Mid Level';
  } else if (juniorIndicators.some(indicator => text.includes(indicator))) {
    return 'Junior Level';
  }

  return 'Not Determined';
}

/**
 * Assess industry fit
 * @param {Object} jobData - Job information
 * @param {string} resumeContent - Resume content
 * @returns {string} - Industry fit assessment
 */
function assessIndustryFit(jobData, resumeContent) {
  // This is a simplified assessment - in reality, you'd use more sophisticated analysis
  const jobText = `${jobData.title} ${jobData.description}`.toLowerCase();
  const resumeText = resumeContent.toLowerCase();

  const industries = {
    'fintech': ['financial', 'banking', 'payment', 'trading', 'investment'],
    'healthcare': ['healthcare', 'medical', 'hospital', 'patient', 'clinical'],
    'ecommerce': ['ecommerce', 'retail', 'shopping', 'marketplace', 'commerce'],
    'saas': ['saas', 'software as a service', 'subscription', 'cloud'],
    'startup': ['startup', 'early stage', 'venture', 'growth']
  };

  for (const [industry, keywords] of Object.entries(industries)) {
    if (keywords.some(keyword => jobText.includes(keyword))) {
      if (keywords.some(keyword => resumeText.includes(keyword))) {
        return `Strong ${industry} experience`;
      } else {
        return `Limited ${industry} experience`;
      }
    }
  }

  return 'General technology background';
}

/**
 * Generate strengths based on matched skills
 * @param {Array<string>} matchedSkills - Matched skills
 * @returns {Array<string>} - Strengths
 */
function generateStrengths(matchedSkills) {
  const strengths = [];

  if (matchedSkills.length > 10) {
    strengths.push('Strong technical skill alignment with job requirements');
  }

  if (matchedSkills.some(skill => ['react', 'angular', 'vue.js'].includes(skill))) {
    strengths.push('Frontend development expertise');
  }

  if (matchedSkills.some(skill => ['node.js', 'python', 'java'].includes(skill))) {
    strengths.push('Backend development capabilities');
  }

  if (matchedSkills.some(skill => ['aws', 'azure', 'docker', 'kubernetes'].includes(skill))) {
    strengths.push('Cloud and DevOps knowledge');
  }

  return strengths.slice(0, 5); // Limit to top 5
}

/**
 * Generate recommendations based on missing skills
 * @param {Array<string>} missingSkills - Missing skills
 * @returns {Array<string>} - Recommendations
 */
function generateRecommendations(missingSkills) {
  const recommendations = [];

  if (missingSkills.length > 0) {
    recommendations.push(`Consider learning: ${missingSkills.slice(0, 3).join(', ')}`);
  }

  if (missingSkills.some(skill => ['react', 'angular', 'vue.js'].includes(skill))) {
    recommendations.push('Strengthen frontend framework knowledge');
  }

  if (missingSkills.some(skill => ['aws', 'azure', 'docker'].includes(skill))) {
    recommendations.push('Gain cloud platform experience');
  }

  return recommendations.slice(0, 5); // Limit to top 5
}

/**
 * Calculate keyword density between job and resume
 * @param {string} jobText - Job description text
 * @param {string} resumeText - Resume text
 * @returns {number} - Keyword density score
 */
function calculateKeywordDensity(jobText, resumeText) {
  const jobWords = jobText.split(' ').filter(word => word.length > 3);
  const resumeWords = resumeText.split(' ');
  const commonWords = jobWords.filter(word => resumeWords.includes(word));

  return jobWords.length > 0 ? Math.round((commonWords.length / jobWords.length) * 100) : 0;
}

module.exports = {
  analyzeResumeMatch,
  normalizeText,
  calculateKeywordDensity
};