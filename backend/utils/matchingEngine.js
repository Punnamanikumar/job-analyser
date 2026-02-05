/**
 * Advanced Skill Matching Engine
 * Provides comprehensive skill comparison with weighted scoring
 */

/**
 * Core skill matching function
 * @param {Array<string>} resumeSkills - Skills extracted from resume
 * @param {Array<string>} jobSkills - Skills required for job
 * @param {Object} options - Matching options
 * @returns {Object} - Comprehensive matching results
 */
function compareSkills(resumeSkills, jobSkills, options = {}) {
  const {
    caseSensitive = false,
    fuzzyMatching = true,
    synonyms = true
  } = options;

  // Normalize skills for comparison
  const normalizedResumeSkills = normalizeSkills(resumeSkills, { caseSensitive, synonyms });
  const normalizedJobSkills = normalizeSkills(jobSkills, { caseSensitive, synonyms });

  // Find matches
  const matchedSkills = findMatchedSkills(normalizedResumeSkills, normalizedJobSkills, { fuzzyMatching });
  const missingSkills = findMissingSkills(normalizedJobSkills, matchedSkills);
  const extraSkills = findExtraSkills(normalizedResumeSkills, normalizedJobSkills, { fuzzyMatching });

  // Calculate basic match percentage
  const matchPercentage = calculateMatchPercentage(normalizedJobSkills.length, matchedSkills.length);

  return {
    matchedSkills: Array.from(new Set(matchedSkills)).sort(),
    missingSkills: Array.from(new Set(missingSkills)).sort(),
    extraSkills: Array.from(new Set(extraSkills)).sort(),
    matchPercentage,
    totalJobSkills: normalizedJobSkills.length,
    totalResumeSkills: normalizedResumeSkills.length,
    totalMatches: matchedSkills.length,
    analysis: {
      skillsCoverage: matchedSkills.length / Math.max(normalizedJobSkills.length, 1),
      skillsDiversity: normalizedResumeSkills.length / Math.max(normalizedJobSkills.length, 1),
      overqualification: extraSkills.length > normalizedJobSkills.length
    }
  };
}

/**
 * Weighted skill matching with must-have and nice-to-have categories
 * @param {Object} resumeSkills - Resume skills object
 * @param {Object} jobRequirements - Job requirements with weighted skills
 * @param {Object} weights - Weighting configuration
 * @returns {Object} - Weighted matching results
 */
function compareSkillsWeighted(resumeSkills, jobRequirements, weights = {}) {
  const {
    mustHaveWeight = 0.7,
    niceToHaveWeight = 0.3,
    experienceWeight = 0.0
  } = weights;

  // Ensure we have arrays to work with
  const resumeSkillsArray = Array.isArray(resumeSkills) ? resumeSkills :
    Object.values(resumeSkills).flat();

  const mustHaveSkills = jobRequirements.mustHave || jobRequirements.must_have_skills || [];
  const niceToHaveSkills = jobRequirements.niceToHave || jobRequirements.good_to_have_skills || [];

  // Compare must-have skills
  const mustHaveComparison = compareSkills(resumeSkillsArray, mustHaveSkills);

  // Compare nice-to-have skills
  const niceToHaveComparison = compareSkills(resumeSkillsArray, niceToHaveSkills);

  // Calculate weighted scores
  const mustHaveScore = mustHaveComparison.matchPercentage * (mustHaveWeight / 100);
  const niceToHaveScore = niceToHaveComparison.matchPercentage * (niceToHaveWeight / 100);

  const weightedMatchPercentage = Math.round(
    (mustHaveScore * mustHaveWeight + niceToHaveScore * niceToHaveWeight) * 100 /
    (mustHaveWeight + niceToHaveWeight)
  );

  // Combine all skills for overall analysis
  const allJobSkills = [...mustHaveSkills, ...niceToHaveSkills];
  const overallComparison = compareSkills(resumeSkillsArray, allJobSkills);

  return {
    // Weighted results
    weightedMatchPercentage,
    overallMatchPercentage: overallComparison.matchPercentage,

    // Category breakdowns
    mustHave: {
      ...mustHaveComparison,
      weight: mustHaveWeight,
      weightedScore: mustHaveScore,
      criticalMissing: mustHaveComparison.missingSkills
    },
    niceToHave: {
      ...niceToHaveComparison,
      weight: niceToHaveWeight,
      weightedScore: niceToHaveScore,
      bonus: niceToHaveComparison.matchedSkills
    },

    // Overall analysis
    overall: {
      matchedSkills: overallComparison.matchedSkills,
      missingSkills: overallComparison.missingSkills,
      extraSkills: overallComparison.extraSkills,
      totalSkills: allJobSkills.length,
      skillsGap: mustHaveComparison.missingSkills.length,
      skillsAdvantage: overallComparison.extraSkills.length
    },

    // Scoring details
    scoring: {
      mustHaveWeight,
      niceToHaveWeight,
      mustHaveScore: mustHaveComparison.matchPercentage,
      niceToHaveScore: niceToHaveComparison.matchPercentage,
      finalScore: weightedMatchPercentage
    }
  };
}

/**
 * Normalize skills array
 * @param {Array<string>} skills - Raw skills array
 * @param {Object} options - Normalization options
 * @returns {Array<string>} - Normalized skills
 */
function normalizeSkills(skills, options = {}) {
  const { caseSensitive = false, synonyms = true } = options;

  if (!Array.isArray(skills)) return [];

  let normalized = skills
    .filter(skill => skill && typeof skill === 'string')
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0);

  if (!caseSensitive) {
    normalized = normalized.map(skill => skill.toLowerCase());
  }

  // Apply synonym mapping if enabled
  if (synonyms) {
    normalized = normalized.map(skill => applySynonyms(skill));
  }

  return Array.from(new Set(normalized)); // Remove duplicates
}

/**
 * Apply synonym mapping to skill
 * @param {string} skill - Original skill
 * @returns {string} - Normalized skill with synonyms applied
 */
function applySynonyms(skill) {
  const synonymMap = {
    'js': 'javascript',
    'ts': 'typescript',
    'reactjs': 'react',
    'react.js': 'react',
    'vuejs': 'vue.js',
    'angular.js': 'angular',
    'nodejs': 'node.js',
    'node': 'node.js',
    'postgres': 'postgresql',
    'mongo': 'mongodb',
    'k8s': 'kubernetes',
    'docker containers': 'docker',
    'containerization': 'docker',
    'aws cloud': 'aws',
    'amazon web services': 'aws',
    'google cloud platform': 'google cloud',
    'gcp': 'google cloud',
    'microsoft azure': 'azure',
    'ml': 'machine learning',
    'ai': 'artificial intelligence',
    'devops': 'dev ops',
    'ci/cd': 'continuous integration',
    'rest api': 'rest',
    'restful': 'rest',
    'frontend': 'front-end',
    'backend': 'back-end',
    'fullstack': 'full-stack',
    'full stack': 'full-stack'
  };

  return synonymMap[skill.toLowerCase()] || skill;
}

/**
 * Find skills that match between resume and job requirements
 * @param {Array<string>} resumeSkills - Normalized resume skills
 * @param {Array<string>} jobSkills - Normalized job skills
 * @param {Object} options - Matching options
 * @returns {Array<string>} - Matched skills
 */
function findMatchedSkills(resumeSkills, jobSkills, options = {}) {
  const { fuzzyMatching = true } = options;
  const matches = [];

  for (const jobSkill of jobSkills) {
    for (const resumeSkill of resumeSkills) {
      if (skillsMatch(resumeSkill, jobSkill, fuzzyMatching)) {
        matches.push(jobSkill); // Use job skill name for consistency
        break; // Only count each job skill once
      }
    }
  }

  return matches;
}

/**
 * Find skills required by job but missing from resume
 * @param {Array<string>} jobSkills - Job required skills
 * @param {Array<string>} matchedSkills - Already matched skills
 * @returns {Array<string>} - Missing skills
 */
function findMissingSkills(jobSkills, matchedSkills) {
  return jobSkills.filter(skill => !matchedSkills.includes(skill));
}

/**
 * Find extra skills in resume not required by job
 * @param {Array<string>} resumeSkills - Resume skills
 * @param {Array<string>} jobSkills - Job required skills
 * @param {Object} options - Matching options
 * @returns {Array<string>} - Extra skills
 */
function findExtraSkills(resumeSkills, jobSkills, options = {}) {
  const { fuzzyMatching = true } = options;
  const extras = [];

  for (const resumeSkill of resumeSkills) {
    let isRequired = false;
    for (const jobSkill of jobSkills) {
      if (skillsMatch(resumeSkill, jobSkill, fuzzyMatching)) {
        isRequired = true;
        break;
      }
    }
    if (!isRequired) {
      extras.push(resumeSkill);
    }
  }

  return extras;
}

/**
 * Check if two skills match
 * @param {string} skill1 - First skill
 * @param {string} skill2 - Second skill
 * @param {boolean} fuzzyMatching - Enable fuzzy matching
 * @returns {boolean} - Whether skills match
 */
function skillsMatch(skill1, skill2, fuzzyMatching = true) {
  const s1 = skill1.toLowerCase().trim();
  const s2 = skill2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return true;

  if (fuzzyMatching) {
    // One contains the other (e.g., "react" matches "react.js")
    if (s1.includes(s2) || s2.includes(s1)) return true;

    // Check for common word overlaps
    const words1 = s1.split(/[\s\-._]+/);
    const words2 = s2.split(/[\s\-._]+/);

    // If any significant word matches
    for (const word1 of words1) {
      if (word1.length > 2) { // Only check significant words
        for (const word2 of words2) {
          if (word2.length > 2 && word1 === word2) {
            return true;
          }
        }
      }
    }

    // Levenshtein distance for typos (for skills longer than 4 characters)
    if (s1.length > 4 && s2.length > 4) {
      const distance = levenshteinDistance(s1, s2);
      const maxLength = Math.max(s1.length, s2.length);
      const similarity = (maxLength - distance) / maxLength;
      return similarity > 0.85; // 85% similarity threshold
    }
  }

  return false;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate match percentage
 * @param {number} totalRequired - Total required skills
 * @param {number} totalMatched - Total matched skills
 * @returns {number} - Match percentage (0-100)
 */
function calculateMatchPercentage(totalRequired, totalMatched) {
  if (totalRequired === 0) return 100;
  return Math.round((totalMatched / totalRequired) * 100);
}

/**
 * Generate detailed skill analysis report
 * @param {Object} matchingResults - Results from compareSkillsWeighted
 * @returns {Object} - Detailed analysis report
 */
function generateSkillAnalysisReport(matchingResults) {
  const { mustHave, niceToHave, overall, scoring } = matchingResults;

  return {
    summary: {
      overallScore: matchingResults.weightedMatchPercentage,
      recommendation: getRecommendation(matchingResults.weightedMatchPercentage),
      criticalGaps: mustHave.missingSkills.length,
      bonusSkills: niceToHave.matchedSkills.length
    },

    strengths: {
      coreSkillsMatch: mustHave.matchPercentage,
      additionalSkills: overall.extraSkills.length,
      skillsDiversity: overall.extraSkills.length > 5 ? 'high' : overall.extraSkills.length > 2 ? 'medium' : 'low'
    },

    areas_for_improvement: {
      criticalSkills: mustHave.missingSkills.slice(0, 5),
      recommendedSkills: niceToHave.missingSkills.slice(0, 3),
      priorityLevel: mustHave.missingSkills.length > 3 ? 'high' : mustHave.missingSkills.length > 1 ? 'medium' : 'low'
    },

    detailed_breakdown: {
      must_have: {
        required: mustHave.totalJobSkills,
        matched: mustHave.totalMatches,
        missing: mustHave.missingSkills,
        percentage: mustHave.matchPercentage
      },
      nice_to_have: {
        available: niceToHave.totalJobSkills,
        matched: niceToHave.totalMatches,
        missing: niceToHave.missingSkills,
        percentage: niceToHave.matchPercentage
      },
      additional: {
        count: overall.extraSkills.length,
        skills: overall.extraSkills.slice(0, 10) // Limit to top 10
      }
    }
  };
}

/**
 * Get recommendation based on match percentage
 * @param {number} matchPercentage - Weighted match percentage
 * @returns {string} - Recommendation text
 */
function getRecommendation(matchPercentage) {
  if (matchPercentage >= 85) return 'Excellent match - Highly recommended';
  if (matchPercentage >= 70) return 'Good match - Recommended for interview';
  if (matchPercentage >= 55) return 'Fair match - Consider with additional evaluation';
  if (matchPercentage >= 40) return 'Partial match - Significant gaps present';
  return 'Poor match - Major skill development required';
}

module.exports = {
  compareSkills,
  compareSkillsWeighted,
  generateSkillAnalysisReport,
  normalizeSkills,
  skillsMatch,
  calculateMatchPercentage,
  findMatchedSkills,
  findMissingSkills,
  findExtraSkills
};