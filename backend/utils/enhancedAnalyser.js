// utils/enhancedAnalyser.js

const { analyzeResumeMatch } = require('./analyser');
const {
  extractResumeSkillsAI,
  extractJobSkillsAI
} = require('./aiSkillExtractor');
const { analyzeResumeMatchLocal } = require('./localOllamaAnalyser');
const aiConfig = require('./aiConfig');

/**
 * ======================================================
 * EXISTING FUNCTION — CLOUD AI ANALYSIS (UNCHANGED)
 * ======================================================
 */
async function analyzeResumeMatchAI(jobData, resumeContent, options = {}) {
  const config = aiConfig.getConfig();
  const { useAI = true, aiModel = config.model } = options;

  console.log('Starting enhanced resume analysis (cloud AI)...');

  try {
    let aiResults = null;

    if (useAI) {
      console.log(`🤖 Using ${config.provider.toUpperCase()} for skill extraction...`);

      try {
        const [resumeSkillsAI, jobSkillsAI] = await Promise.all([
          extractResumeSkillsAI(resumeContent, { model: aiModel }),
          extractJobSkillsAI(
            `${jobData.title} ${jobData.description}`,
            jobData.title,
            { model: aiModel }
          )
        ]);

        aiResults = {
          resumeSkills: resumeSkillsAI,
          jobSkills: jobSkillsAI,
          aiAnalysis: performAIAnalysis(resumeSkillsAI, jobSkillsAI),
          aiEnabled: true
        };
      } catch (aiError) {
        console.error('Cloud AI failed, falling back...');
        console.error(aiError.message);
      }
    }

    // Always run baseline analysis
    const standardAnalysis = await analyzeResumeMatch(jobData, resumeContent);

    if (aiResults) {
      return combineAnalysisResults(standardAnalysis, aiResults);
    }

    return {
      ...standardAnalysis,
      analysisMethod: 'dictionary_only',
      aiAvailable: false
    };
  } catch (error) {
    console.error('Enhanced analysis error:', error);
    throw new Error(`Enhanced resume analysis failed: ${error.message}`);
  }
}

/**
 * ======================================================
 * 🆕 NEW FUNCTION — AUTO ROUTER (LOCAL OLLAMA / CLOUD)
 * ======================================================
 * Routes to local Ollama or cloud AI based on configuration
 */
async function analyzeResumeMatchEnhanced(jobData, resumeContent, options = {}) {
  const config = aiConfig.getConfig();

  if (config.isLocal) {
    console.log(`🦙 Using local Ollama analysis with model: ${config.model}`);
    return analyzeResumeMatchLocal(jobData, resumeContent);
  }

  return analyzeResumeMatchAI(jobData, resumeContent, options);
}

/**
 * ======================================================
 * AI ANALYSIS LOGIC (EXISTING)
 * ======================================================
 */
function performAIAnalysis(resumeSkills, jobSkills) {
  const resumeSkillsWeighted = [
    ...resumeSkills.technical_skills.expert.map(s => ({ skill: s, weight: 1.0 })),
    ...resumeSkills.technical_skills.proficient.map(s => ({ skill: s, weight: 0.8 })),
    ...resumeSkills.technical_skills.familiar.map(s => ({ skill: s, weight: 0.6 }))
  ];

  const mustHaveMatches = jobSkills.must_have_skills.map(requiredSkill => {
    const match = resumeSkillsWeighted.find(rs =>
      skillsMatch(rs.skill, requiredSkill)
    );
    return {
      skill: requiredSkill,
      matched: !!match,
      proficiency: match ? getProficiencyLevel(match.skill, resumeSkills) : null,
      weight: match ? match.weight : 0
    };
  });

  const goodToHaveMatches = jobSkills.good_to_have_skills.map(preferredSkill => {
    const match = resumeSkillsWeighted.find(rs =>
      skillsMatch(rs.skill, preferredSkill)
    );
    return {
      skill: preferredSkill,
      matched: !!match,
      proficiency: match ? getProficiencyLevel(match.skill, resumeSkills) : null,
      weight: match ? match.weight : 0
    };
  });

  const mustHaveScore =
    mustHaveMatches.length > 0
      ? (mustHaveMatches.reduce((s, m) => s + (m.matched ? m.weight : 0), 0) /
        mustHaveMatches.length) *
      100
      : 100;

  const goodToHaveScore =
    goodToHaveMatches.length > 0
      ? (goodToHaveMatches.reduce((s, m) => s + (m.matched ? m.weight : 0), 0) /
        goodToHaveMatches.length) *
      100
      : 100;

  return {
    mustHaveMatch: {
      percentage: Math.round(mustHaveScore),
      matched: mustHaveMatches.filter(m => m.matched),
      missing: mustHaveMatches.filter(m => !m.matched),
      total: mustHaveMatches.length
    },
    goodToHaveMatch: {
      percentage: Math.round(goodToHaveScore),
      matched: goodToHaveMatches.filter(m => m.matched),
      missing: goodToHaveMatches.filter(m => !m.matched),
      total: goodToHaveMatches.length
    },
    overallScore: Math.round(mustHaveScore * 0.7 + goodToHaveScore * 0.3),
    experienceAlignment: assessExperienceAlignment(
      resumeSkills.experience_level,
      jobSkills.experience_requirements.seniority_level,
      resumeSkills.years_of_experience,
      jobSkills.experience_requirements.minimum_years
    ),
    skillsGaps: identifySkillGaps(mustHaveMatches, goodToHaveMatches)
  };
}

/**
 * ======================================================
 * HELPERS (EXISTING)
 * ======================================================
 */
function skillsMatch(skill1, skill2) {
  const s1 = skill1.toLowerCase().trim();
  const s2 = skill2.toLowerCase().trim();

  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;

  const aliases = {
    js: 'javascript',
    ts: 'typescript',
    'node.js': 'node',
    reactjs: 'react',
    k8s: 'kubernetes'
  };

  return (aliases[s1] || s1) === (aliases[s2] || s2);
}

function getProficiencyLevel(skill, resumeSkills) {
  if (resumeSkills.technical_skills.expert.includes(skill)) return 'expert';
  if (resumeSkills.technical_skills.proficient.includes(skill)) return 'proficient';
  if (resumeSkills.technical_skills.familiar.includes(skill)) return 'familiar';
  return 'unknown';
}

function assessExperienceAlignment(resumeLevel, jobLevel, resumeYears, jobMinYears) {
  const levelScores = { junior: 1, mid: 2, senior: 3, expert: 4, unknown: 2 };

  const resumeScore = levelScores[resumeLevel] || 2;
  const jobScore = levelScores[jobLevel] || 2;

  // Ensure we're comparing numbers
  const actualResumeYears = parseFloat(resumeYears) || 0;
  const actualJobMinYears = parseFloat(jobMinYears) || 0;

  const levelMatch = resumeScore >= jobScore;
  const yearsMatch = actualResumeYears >= actualJobMinYears;

  return {
    levelMatch,
    yearsMatch,
    resumeYears: actualResumeYears,
    jobRequiredYears: actualJobMinYears,
    resumeLevel: resumeLevel || 'unknown',
    jobLevel: jobLevel || 'unknown',
    assessment:
      levelMatch && yearsMatch
        ? 'excellent'
        : levelMatch || yearsMatch
          ? 'good'
          : 'needs_improvement'
  };
}

function identifySkillGaps(mustHaveMatches, goodToHaveMatches) {
  const critical = mustHaveMatches.filter(m => !m.matched).map(m => m.skill);
  const minor = goodToHaveMatches.filter(m => !m.matched).map(m => m.skill);

  return {
    critical,
    minor,
    totalGaps: critical.length + minor.length,
    severity: critical.length > 3 ? 'high' : critical.length > 1 ? 'medium' : 'low'
  };
}

function combineAnalysisResults(standardAnalysis, aiResults) {
  return {
    ...standardAnalysis,
    ai: aiResults.aiAnalysis,
    analysisMethod: 'ai_enhanced',
    aiAvailable: true
  };
}

/**
 * ======================================================
 * EXPORTS — NOTHING REMOVED
 * ======================================================
 */
module.exports = {
  // existing exports
  analyzeResumeMatchAI,
  performAIAnalysis,
  combineAnalysisResults,
  skillsMatch,
  assessExperienceAlignment,

  // new (optional)
  analyzeResumeMatchEnhanced
};
