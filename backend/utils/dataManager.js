const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Data persistence manager for LinkedIn analysis results
 * Handles saving and loading analysis data per URL
 */

class DataManager {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.ensureDataDirectory();
  }

  /**
   * Ensure data directory exists
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Generate a safe filename from URL, resume information, and optionally job description
   * @param {string} url - Job URL
   * @param {Object} resumeInfo - Resume information (filename, fileSize)
   * @param {string} jobDescription - Optional job description for cache invalidation
   * @returns {string} - Safe filename
   */
  generateFilename(url, resumeInfo = {}, jobDescription = '') {
    // Create a hash of the URL for a safe filename
    const urlHash = crypto.createHash('md5').update(url).digest('hex');

    // If resume info provided, include it in filename for uniqueness
    let resumeHash = '';
    if (resumeInfo.filename && resumeInfo.fileSize) {
      const resumeKey = `${resumeInfo.filename}_${resumeInfo.fileSize}`;
      resumeHash = '_' + crypto.createHash('md5').update(resumeKey).digest('hex').substring(0, 8);
    }

    // Include job description hash if provided (for cache invalidation when content changes)
    let descHash = '';
    if (jobDescription && jobDescription.length > 0) {
      descHash = '_' + crypto.createHash('md5').update(jobDescription).digest('hex').substring(0, 8);
    }

    const hostname = new URL(url).hostname.replace(/\./g, '_');
    return `${hostname}_${urlHash}${resumeHash}${descHash}.json`;
  }

  /**
   * Save analysis result to file
   * @param {string} url - Job URL
   * @param {Object} analysisData - Complete analysis data
   * @param {Object} resumeInfo - Resume information for unique filename
   * @param {string} jobDescription - Job description for cache key
   * @returns {Promise<boolean>} - Success status
   */
  async saveAnalysisResult(url, analysisData, resumeInfo = {}, jobDescription = '') {
    try {
      const filename = this.generateFilename(url, resumeInfo, jobDescription);
      const filepath = path.join(this.dataDir, filename);

      const dataToSave = {
        url: url,
        timestamp: new Date().toISOString(),
        analysisData: analysisData,
        metadata: {
          savedAt: new Date().toISOString(),
          version: '1.0',
          fileFormat: 'linkedin-analyzer-v1'
        }
      };

      await fs.promises.writeFile(filepath, JSON.stringify(dataToSave, null, 2));
      console.log(`💾 Analysis saved for URL: ${url}`);
      return true;
    } catch (error) {
      console.error('Error saving analysis result:', error);
      return false;
    }
  }

  /**
   * Load analysis result from file
   * @param {string} url - Job URL
   * @param {Object} resumeInfo - Resume information for unique filename
   * @param {string} jobDescription - Job description for cache key
   * @returns {Promise<Object|null>} - Loaded analysis data or null
   */
  async loadAnalysisResult(url, resumeInfo = {}, jobDescription = '') {
    try {
      const filename = this.generateFilename(url, resumeInfo, jobDescription);
      const filepath = path.join(this.dataDir, filename);

      if (!fs.existsSync(filepath)) {
        return null;
      }

      const fileContent = await fs.promises.readFile(filepath, 'utf8');
      const data = JSON.parse(fileContent);

      console.log(`📂 Loaded analysis for URL: ${url}`);
      return data;
    } catch (error) {
      console.error('Error loading analysis result:', error);
      return null;
    }
  }

  /**
   * Check if analysis exists for URL and specific resume
   * @param {string} url - Job URL
   * @param {Object} resumeInfo - Resume information for unique filename
   * @returns {Promise<Object|null>} - Analysis metadata or null
   */
  async checkAnalysisExists(url, resumeInfo = {}) {
    try {
      const filename = this.generateFilename(url, resumeInfo);
      const filepath = path.join(this.dataDir, filename);

      if (!fs.existsSync(filepath)) {
        return null;
      }

      const stats = fs.statSync(filepath);
      const fileContent = await fs.promises.readFile(filepath, 'utf8');
      const data = JSON.parse(fileContent);

      return {
        exists: true,
        lastAnalyzed: data.timestamp,
        savedAt: data.metadata?.savedAt || stats.mtime.toISOString(),
        aiEnabled: data.analysisData?.metadata?.aiEnabled || false,
        analysisMethod: data.analysisData?.metadata?.analysisMethod || 'unknown',
        matchScore: data.analysisData?.data?.matchScore?.overall || data.analysisData?.analysis?.matchPercentage || 0,
        fileSize: stats.size
      };
    } catch (error) {
      console.error('Error checking analysis existence:', error);
      return null;
    }
  }

  /**
   * Delete analysis for URL and specific resume
   * @param {string} url - Job URL
   * @param {Object} resumeInfo - Resume information for unique filename
   * @returns {Promise<boolean>} - Success status
   */
  async deleteAnalysis(url, resumeInfo = {}) {
    try {
      const filename = this.generateFilename(url, resumeInfo);
      const filepath = path.join(this.dataDir, filename);

      if (fs.existsSync(filepath)) {
        await fs.promises.unlink(filepath);
        console.log(`🗑️  Deleted analysis for URL: ${url}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting analysis:', error);
      return false;
    }
  }

  /**
   * Find all analysis files for a specific job URL
   * @param {string} url - Job URL
   * @returns {Promise<Array>} - List of analysis files for this job
   */
  async findAllAnalysesForJob(url) {
    try {
      const urlHash = crypto.createHash('md5').update(url).digest('hex');
      const hostname = new URL(url).hostname.replace(/\./g, '_');
      const basePattern = `${hostname}_${urlHash}`;

      const files = await fs.promises.readdir(this.dataDir);
      const jobAnalyses = [];

      for (const file of files) {
        if (file.startsWith(basePattern) && file.endsWith('.json')) {
          const filepath = path.join(this.dataDir, file);
          const content = await fs.promises.readFile(filepath, 'utf8');
          const data = JSON.parse(content);

          jobAnalyses.push({
            filename: file,
            resumeInfo: data.analysisData?.metadata?.resumeInfo,
            timestamp: data.timestamp,
            matchScore: data.analysisData?.data?.matchScore?.overall || 0,
            data: data
          });
        }
      }

      return jobAnalyses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error finding analyses for job:', error);
      return [];
    }
  }

  /**
   * List all saved analyses
   * @returns {Promise<Array>} - List of analysis metadata
   */
  async listAllAnalyses() {
    try {
      const files = await fs.promises.readdir(this.dataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      // Process files in parallel for better performance
      const analyses = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const filepath = path.join(this.dataDir, file);
            const [stats, content] = await Promise.all([
              fs.promises.stat(filepath),
              fs.promises.readFile(filepath, 'utf8')
            ]);
            const data = JSON.parse(content);

            return {
              url: data.url,
              timestamp: data.timestamp,
              matchScore: data.analysisData?.data?.matchScore?.overall || data.analysisData?.analysis?.matchPercentage || 0,
              aiEnabled: data.analysisData?.metadata?.aiEnabled || false,
              fileSize: stats.size,
              filename: file
            };
          } catch (fileError) {
            console.warn(`Skipping corrupted file: ${file}`, fileError.message);
            return null;
          }
        })
      );

      // Filter out null entries and sort by timestamp
      return analyses
        .filter(a => a !== null)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error listing analyses:', error);
      return [];
    }
  }
}

module.exports = new DataManager();