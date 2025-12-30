/**
 * AI Bridge - Node.js ↔ Python Communication Layer
 *
 * R&D Component: Inter-Process Communication for AI Services
 * Hypothesis: Spawn-based IPC adds <500ms latency overhead vs in-process
 * Methodology: Spawn Python processes, JSON serialization for data exchange,
 *              timeout handling, error recovery
 * Success Metric: Average latency <= 500ms, 99% success rate
 * Findings: TBD after testing
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AIBridge {
  constructor() {
    this.pythonPath = config.ai.pythonPath;
    this.scriptDir = __dirname;
    this.timeout = 30000;  // 30 second timeout
  }

  /**
   * Execute Python OCR script on image file
   * R&D: Measures OCR accuracy and processing time
   */
  async extractTextFromImage(imagePath) {
    const startTime = Date.now();

    try {
      const result = await this.runPythonScript(
        'ocrService.py',
        ['extract_image', imagePath]
      );

      // R&D Metric: Log processing time
      const elapsed = Date.now() - startTime;
      console.log(`[R&D] OCR Image: ${elapsed}ms, confidence: ${result.confidence?.toFixed(2)}`);

      return result;
    } catch (error) {
      console.error('[AI Bridge] OCR image extraction failed:', error.message);
      return {
        error: error.message,
        text: '',
        confidence: 0
      };
    }
  }

  /**
   * Execute Python OCR script on PDF file
   * R&D: Measures multi-page OCR performance
   */
  async extractTextFromPDF(pdfPath) {
    const startTime = Date.now();

    try {
      const result = await this.runPythonScript(
        'ocrService.py',
        ['extract_pdf', pdfPath]
      );

      // R&D Metric: Log processing time
      const elapsed = Date.now() - startTime;
      console.log(`[R&D] OCR PDF: ${elapsed}ms, ${result.pages} pages, confidence: ${result.confidence?.toFixed(2)}`);

      return result;
    } catch (error) {
      console.error('[AI Bridge] OCR PDF extraction failed:', error.message);
      return {
        error: error.message,
        text: '',
        confidence: 0,
        pages: 0
      };
    }
  }

  /**
   * Execute Python NER script on text
   * R&D: Measures entity extraction F1 scores
   */
  async extractEntities(text) {
    if (!text || text.trim().length === 0) {
      return {
        vendors: [],
        amounts: [],
        dates: [],
        all_entities: [],
        confidence: 0
      };
    }

    const startTime = Date.now();

    try {
      const result = await this.runPythonScript(
        'nerExtractor.py',
        [],
        text  // Pass text via stdin
      );

      // R&D Metric: Log extraction results
      const elapsed = Date.now() - startTime;
      console.log(`[R&D] NER Extraction: ${elapsed}ms, vendors: ${result.vendors?.length || 0}, amounts: ${result.amounts?.length || 0}, dates: ${result.dates?.length || 0}`);

      return result;
    } catch (error) {
      console.error('[AI Bridge] NER extraction failed:', error.message);
      return {
        vendors: [],
        amounts: [],
        dates: [],
        all_entities: [],
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Core Python script execution with timeout and error handling
   *
   * @param {string} scriptName - Python file name (e.g., 'ocrService.py')
   * @param {string[]} args - Command line arguments
   * @param {string|null} stdinData - Data to send via stdin (for text input)
   * @returns {Promise<object>} - Parsed JSON result from Python
   */
  runPythonScript(scriptName, args = [], stdinData = null) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.scriptDir, scriptName);
      const python = spawn(this.pythonPath, [scriptPath, ...args]);

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Set timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        python.kill('SIGTERM');
        reject(new Error(`Python script timed out after ${this.timeout}ms`));
      }, this.timeout);

      // Collect stdout
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      python.on('close', (code) => {
        clearTimeout(timeoutId);

        if (timedOut) return;  // Already rejected

        if (code !== 0) {
          reject(new Error(`Python script failed (exit code ${code}): ${stderr || 'No error message'}`));
          return;
        }

        try {
          // Parse JSON output from Python
          const result = JSON.parse(stdout.trim());

          // Check for error in result
          if (result.error) {
            console.warn(`[AI Bridge] Python returned error: ${result.error}`);
          }

          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Python output as JSON: ${stdout.substring(0, 200)}`));
        }
      });

      // Handle errors
      python.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

      // Send stdin data if provided
      if (stdinData) {
        python.stdin.write(stdinData);
        python.stdin.end();
      }
    });
  }

  /**
   * Health check: Verify Python environment is working
   */
  async healthCheck() {
    try {
      // Simple test: Extract entities from test text
      const result = await this.extractEntities('Test payment of $19.99 on 2025-01-15');

      return {
        status: 'healthy',
        pythonPath: this.pythonPath,
        nerWorking: result.amounts && result.amounts.length > 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        pythonPath: this.pythonPath,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * R&D Documentation Export
 * For AusIndustry R&D tax claim compliance
 */
export const RD_METADATA = {
  component: 'AI Bridge (Node ↔ Python IPC)',
  hypothesis: 'Spawn-based inter-process communication adds <500ms latency overhead vs in-process execution',
  methodology: 'Spawn Python child processes, JSON serialization for data exchange, timeout handling (30s), error recovery with fallbacks',
  successMetric: 'Average latency <= 500ms, 99% success rate on 100+ operations',
  findings: 'TBD after load testing',
  category: 'Software Development',
  technicalUncertainty: 'Optimal IPC strategy for Node.js ↔ Python communication in production environment with varying load',
  estimatedHours: 2.5
};

export default AIBridge;
