// utils/localOllamaAnalyser.js
const fetch = require('node-fetch');
const { analyzeResumeMatch } = require('./analyser');
const aiConfig = require('./aiConfig');

const OLLAMA_URL = aiConfig.getBaseUrl();
const OLLAMA_MODEL = aiConfig.getModel();

if (aiConfig.isLocalAnalysis() && !process.env.OLLAMA_MODEL) {
  console.warn('⚠️  OLLAMA_MODEL not set in .env, using default: llama3');
}

/**
 * Analyze resume using Ollama local LLM
 * @param {Object} jobData - Job data with title and description
 * @param {string} resumeContent - Resume text content
 * @param {Function} onProgress - Optional callback for progress updates
 * RESPONSE STRUCTURE MUST MATCH enhancedAnalyser
 */
async function analyzeResumeMatchLocal(jobData, resumeContent, onProgress = null) {
  const sendProgress = (step, message, percentage = null) => {
    if (onProgress) {
      onProgress({ step, message, percentage, timestamp: Date.now() });
    }
    console.log(`🦙 [${step}] ${message}`);
  };

  sendProgress('starting', `Using Ollama local model: ${OLLAMA_MODEL}`, 0);

  try {
    // 1️⃣ Build same AI prompt used for cloud AI
    sendProgress('preparing', 'Building analysis prompt...', 10);
    const prompt = buildOllamaPrompt(jobData, resumeContent);

    // 2️⃣ Call Ollama
    sendProgress('ai_extraction', 'Extracting skills with Ollama AI (this may take 30-60 seconds)...', 20);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.1
        }
      })
    });

    sendProgress('ai_complete', 'AI analysis complete, parsing response...', 70);
    const data = await response.json();

    if (!data.response) {
      throw new Error('Empty response from Ollama');
    }

    // 3️⃣ Parse JSON safely
    let aiResult;
    try {
      aiResult = JSON.parse(extractJSON(data.response));
    } catch (e) {
      throw new Error('Invalid JSON returned by Ollama');
    }

    // 4️⃣ Run existing baseline analysis
    sendProgress('matching', 'Running skill matching analysis...', 85);
    const standardAnalysis = await analyzeResumeMatch(jobData, resumeContent);

    // 5️⃣ Merge results EXACTLY like enhancedAnalyser
    sendProgress('complete', 'Analysis complete!', 100);

    return combineAnalysisResults(standardAnalysis, {
      aiAnalysis: aiResult,
      aiEnabled: true
    });

  } catch (error) {
    console.error('🦙 Ollama analysis failed:', error.message);
    sendProgress('fallback', `AI failed: ${error.message}. Using dictionary analysis...`, 90);

    const fallbackResult = await analyzeResumeMatch(jobData, resumeContent);
    sendProgress('complete', 'Fallback analysis complete', 100);

    return {
      ...fallbackResult,
      analysisMethod: 'dictionary_only',
      aiAvailable: false
    };
  }
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
 * Prompt builder – must force strict JSON
 */
// function buildOllamaPrompt(jobData, resumeContent) {
//   return `
// You are an AI resume analyzer.

// IMPORTANT RULES:
// - Return ONLY valid JSON
// - Do NOT include markdown
// - Do NOT include explanations
// - Do NOT add or remove fields
// - Use ONLY the JSON structure provided below
// - Do NOT hallucinate skills or experience
// - Base analysis strictly on the given text

// JOB TITLE:
// ${jobData.title}

// JOB DESCRIPTION:
// ${jobData.description}

// RESUME:
// ${resumeContent}

// ANALYSIS GUIDELINES:

// 1. SKILLS
// - Identify must-have and good-to-have skills from the job description
// - Match them against resume skills
// - Proficiency levels:
//   - expert: strong evidence, leadership or long-term usage
//   - proficient: solid hands-on experience
//   - familiar: limited or brief exposure
// - If a skill is not mentioned in the resume, treat it as missing

// 2. EXPERIENCE ANALYSIS
// - From the job description:
//   - Detect required years of experience if mentioned (e.g., "3+ years", "minimum 5 years")
//   - Detect seniority level (junior, mid, senior, lead)
// - From the resume:
//   - Detect years of experience if explicitly mentioned
//   - Infer seniority from job titles and responsibilities if needed
// - Set:
//   - levelMatch = true if resume level >= job level
//   - yearsMatch = true if resume years >= job required years
// - If years are unclear or not mentioned, set yearsMatch = false

// 3. SCORING
// - Percentages must be between 0 and 100
// - overallScore should reflect:
//   - Skill matching
//   - Experience alignment
// - Missing must-have skills should reduce the score significantly

// 4. SKILL GAPS
// - critical: missing must-have skills
// - minor: missing good-to-have skills
// - severity:
//   - high: many critical gaps
//   - medium: few critical gaps
//   - low: no critical gaps

// RETURN JSON IN EXACTLY THIS STRUCTURE (DO NOT CHANGE IT):
// {
//   "mustHaveMatch": {
//     "percentage": number,
//     "matched": [{ "skill": string, "proficiency": "expert|proficient|familiar" }],
//     "missing": [{ "skill": string, "proficiency": null }]
//   },
//   "goodToHaveMatch": {
//     "percentage": number,
//     "matched": [{ "skill": string, "proficiency": "expert|proficient|familiar" }],
//     "missing": [{ "skill": string, "proficiency": null }]
//   },
//   "overallScore": number,
//   "experienceAlignment": {
//     "levelMatch": boolean,
//     "yearsMatch": boolean,
//     "assessment": "excellent|good|needs_improvement"
//   },
//   "skillsGaps": {
//     "critical": string[],
//     "minor": string[],
//     "severity": "low|medium|high"
//   }
// }
// `;
// }



// ------------


// function buildOllamaPrompt(jobData, resumeContent) {
//   return `
// You are an AI resume analyzer.

// Return ONLY valid JSON. No markdown. No explanations.

// JOB TITLE:
// ${jobData.title}

// JOB DESCRIPTION:
// ${jobData.description}

// RESUME:
// ${resumeContent}

// Return JSON in this exact structure:
// {
//   "mustHaveMatch": {
//     "percentage": number,
//     "matched": [{ "skill": string, "proficiency": "expert|proficient|familiar" }],
//     "missing": [{ "skill": string, "proficiency": null }]
//   },
//   "goodToHaveMatch": {
//     "percentage": number,
//     "matched": [{ "skill": string, "proficiency": "expert|proficient|familiar" }],
//     "missing": [{ "skill": string, "proficiency": null }]
//   },
//   "overallScore": number,
//   "experienceAlignment": {
//     "levelMatch": boolean,
//     "yearsMatch": boolean,
//     "assessment": "excellent|good|needs_improvement"
//   },
//   "skillsGaps": {
//     "critical": string[],
//     "minor": string[],
//     "severity": "low|medium|high"
//   }
// }
// `;
// }






// ----------------





function buildOllamaPrompt(jobData, resumeContent) {
  return `
You are an AI resume analyzer.

IMPORTANT RULES (MUST FOLLOW):
- Return ONLY valid JSON
- Do NOT include markdown
- Do NOT include explanations
- Do NOT add, remove, or rename fields
- Use ONLY the JSON structure provided below
- Do NOT hallucinate skills or experience
- Base conclusions strictly on the provided text
- When information is partial, prefer reasonable inference over strict rejection

--------------------------------
JOB DETAILS
--------------------------------
Job Title:
${jobData.title}

Job Description:
${jobData.description}

--------------------------------
RESUME CONTENT
--------------------------------
${resumeContent}

--------------------------------
ANALYSIS GUIDELINES
--------------------------------

1. SKILL ANALYSIS
- Identify MUST-HAVE and GOOD-TO-HAVE skills from the job description
- Match them against skills explicitly mentioned in the resume
- Proficiency levels:
  - "expert": strong evidence, leadership, or long-term usage
  - "proficient": solid hands-on experience
  - "familiar": limited exposure or brief mention
- If a skill is not mentioned in the resume, treat it as missing

2. EXPERIENCE ANALYSIS
- From the JOB:
  - Detect required years of experience if mentioned (e.g., "3+ years", "minimum 5 years")
  - Detect seniority level (junior, mid, senior, lead, principal)

- From the RESUME:
  - If years are explicitly mentioned, use them
  - If date ranges are present (e.g., "2018–2024"), estimate total years conservatively
  - If no dates or years are present:
    - Infer experience from job titles and responsibilities
    - Senior/Lead titles imply at least mid–senior experience

- Matching logic:
  - levelMatch = true if inferred resume level >= job level
  - yearsMatch = true if:
      a) explicit or estimated years meet the job requirement, OR
      b) seniority inference reasonably meets the requirement
  - Set yearsMatch = false ONLY if there is clear evidence of insufficient experience

- Experience assessment:
  - "excellent": levelMatch = true AND yearsMatch = true
  - "good": one of them is true
  - "needs_improvement": both are false

3. SCORING
- Skill match percentages must be realistic (0–100)
- overallScore should reflect:
  - Skill matching (primary factor)
  - Experience alignment (secondary factor)
- Missing MUST-HAVE skills must reduce the overallScore significantly

4. SKILL GAPS
- "critical": missing MUST-HAVE skills
- "minor": missing GOOD-TO-HAVE skills
- severity:
  - "high": many critical gaps
  - "medium": few critical gaps
  - "low": no critical gaps

--------------------------------
RETURN JSON IN EXACTLY THIS STRUCTURE
(DO NOT CHANGE IT)
--------------------------------
{
  "mustHaveMatch": {
    "percentage": number,
    "matched": [{ "skill": string, "proficiency": "expert|proficient|familiar" }],
    "missing": [{ "skill": string, "proficiency": null }]
  },
  "goodToHaveMatch": {
    "percentage": number,
    "matched": [{ "skill": string, "proficiency": "expert|proficient|familiar" }],
    "missing": [{ "skill": string, "proficiency": null }]
  },
  "overallScore": number,
  "experienceAlignment": {
    "levelMatch": boolean,
    "yearsMatch": boolean,
    "resumeYears": number,
    "jobRequiredYears": number,
    "resumeLevel": "junior|mid|senior|lead|principal",
    "jobLevel": "junior|mid|senior|lead|principal",
    "assessment": "excellent|good|needs_improvement"
  },
  "skillsGaps": {
    "critical": string[],
    "minor": string[],
    "severity": "low|medium|high"
  }
}
`;
}



/**
 * Extract JSON from LLM text safely
 */
function extractJSON(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('JSON not found in response');
  }
  return text.slice(start, end + 1);
}

module.exports = {
  analyzeResumeMatchLocal
};
