import express from 'express';
import { curiousTractorAI } from '../services/curiousTractorResearchAI.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

/**
 * POST /api/curious-tractor/research/full
 * Run complete research program (all 5 phases)
 *
 * Expected duration: 10-15 hours of AI processing
 * Cost: ~$0 (uses local Ollama + Perplexica) + ~$5-10 in Anthropic credits
 */
router.post('/research/full', async (req, res) => {
  try {
    console.log('🚀 Starting full Curious Tractor research program...');

    // Run in background and return immediately
    res.json({
      success: true,
      message: 'Research program started. This will take 10-15 hours.',
      status: 'processing',
      checkStatusAt: '/api/curious-tractor/research/status',
    });

    // Run research in background
    const results = await curiousTractorAI.runFullResearchProgram();

    // Save results to file
    const outputPath = path.join(
      process.cwd(),
      '.taskmaster',
      'docs',
      'curious-tractor-research-results.json'
    );

    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

    // Generate markdown report
    const markdownReport = await generateMarkdownReport(results);
    const reportPath = path.join(
      process.cwd(),
      '.taskmaster',
      'docs',
      'curious-tractor-research-report.md'
    );

    await fs.writeFile(reportPath, markdownReport);

    console.log(`✅ Research complete! Results saved to ${outputPath}`);
  } catch (error) {
    console.error('Research program error:', error);
  }
});

/**
 * POST /api/curious-tractor/research/phase
 * Run a specific research phase
 *
 * Body: { phase: 'entity_structure' | 'rnd_tax' | 'triday' | 'economics' | 'ai_assistant' }
 */
router.post('/research/phase', async (req, res) => {
  try {
    const { phase } = req.body;

    let result;
    switch (phase) {
      case 'entity_structure':
        result = await curiousTractorAI.researchEntityStructure();
        break;
      case 'rnd_tax':
        result = await curiousTractorAI.researchRnDTaxCredits();
        break;
      case 'triday':
        result = await curiousTractorAI.researchTridayIntegration();
        break;
      case 'economics':
        result = await curiousTractorAI.researchInnovationEconomics();
        break;
      case 'ai_assistant':
        result = await curiousTractorAI.researchAIAssistantArchitecture();
        break;
      default:
        return res.status(400).json({ error: 'Invalid phase. Choose: entity_structure, rnd_tax, triday, economics, ai_assistant' });
    }

    res.json({
      success: true,
      phase,
      result,
    });
  } catch (error) {
    console.error('Phase research error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/curious-tractor/research/custom
 * Run custom deep research query
 *
 * Body: {
 *   query: string,
 *   tool: 'perplexica' | 'ollama' | 'claude',
 *   depth: 'fast' | 'standard' | 'deep'
 * }
 */
router.post('/research/custom', async (req, res) => {
  try {
    const { query, tool = 'perplexica', depth = 'deep' } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await curiousTractorAI.deepResearch(query, { tool, depth });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Custom research error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/curious-tractor/research/status
 * Check research status and get latest results
 */
router.get('/research/status', async (req, res) => {
  try {
    const resultsPath = path.join(
      process.cwd(),
      '.taskmaster',
      'docs',
      'curious-tractor-research-results.json'
    );

    try {
      const results = await fs.readFile(resultsPath, 'utf-8');
      res.json({
        success: true,
        status: 'completed',
        results: JSON.parse(results),
      });
    } catch (err) {
      res.json({
        success: true,
        status: 'not_started',
        message: 'No research results found. Start research with POST /research/full',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/curious-tractor/research/report
 * Get the markdown research report
 */
router.get('/research/report', async (req, res) => {
  try {
    const reportPath = path.join(
      process.cwd(),
      '.taskmaster',
      'docs',
      'curious-tractor-research-report.md'
    );

    const report = await fs.readFile(reportPath, 'utf-8');
    res.setHeader('Content-Type', 'text/markdown');
    res.send(report);
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Report not found. Run research first with POST /research/full',
    });
  }
});

/**
 * Helper: Generate markdown report from research results
 */
async function generateMarkdownReport(results) {
  const { entityStructure, rndTaxCredits, tridayIntegration, innovationEconomics, aiAssistant, summary } = results.results;

  return `# A Curious Tractor - Comprehensive Research Report

**Generated**: ${new Date().toISOString()}
**Duration**: ${results.duration}
**Research Tools**: Perplexica, Ollama (llama3.1:8b), Claude Sonnet 4.5, SearxNG

---

## Executive Summary

${summary}

---

## Phase 1: Entity Structure Research

### Research Queries Completed:
1. Australian entity structures for community land ownership and social enterprise
2. Best legal structure for Aboriginal community business with land acquisition
3. Hybrid entity models (B Corp, Community Benefit Company, cooperatives)
4. Tax optimization strategies for community-owned technology businesses

### Key Findings:

${entityStructure?.synthesis?.synthesis || 'Processing...'}

### Recommendations:

${JSON.stringify(entityStructure?.recommendations, null, 2)}

---

## Phase 2: R&D Tax Credits & Innovation Grants

### Research Queries Completed:
1. Australian R&D tax incentive 2025-2026 eligibility
2. Software R&D documentation for ATO compliance
3. R&D tax offset calculations for small businesses
4. Queensland innovation grants for Indigenous businesses

### Key Findings:

${rndTaxCredits?.synthesis?.synthesis || 'Processing...'}

### Estimated Benefits:

${JSON.stringify(rndTaxCredits?.estimatedBenefit, null, 2)}

### Compliance Guide:

${JSON.stringify(rndTaxCredits?.complianceGuide, null, 2)}

---

## Phase 3: Triday Integration & AI Bookkeeping

### Research Queries Completed:
1. Triday API documentation and integration examples
2. AI tools for automated receipt categorization
3. Xero vs MYOB vs Triday feature comparison
4. Open source accounting automation tools (GST/BAS)

### Key Findings:

${tridayIntegration?.synthesis?.synthesis || 'Processing...'}

### Technical Specifications:

${JSON.stringify(tridayIntegration?.technicalSpec, null, 2)}

### Cost/Benefit Analysis:

${JSON.stringify(tridayIntegration?.costBenefit, null, 2)}

---

## Phase 4: Innovation Economics & Community Wealth

### Research Queries Completed:
1. Community wealth building through asset ownership
2. Circular economy business models
3. Innovation commons and shared IP structures
4. Economic theory of planned obsolescence vs community longevity
5. Indigenous economic development models (land-based business)

### Key Findings:

${innovationEconomics?.synthesis?.synthesis || 'Processing...'}

### Proposed Economic Model:

${JSON.stringify(innovationEconomics?.economicModel, null, 2)}

### Case Studies:

${JSON.stringify(innovationEconomics?.casStudies, null, 2)}

---

## Phase 5: Always-On AI Assistant Architecture

### Research Queries Completed:
1. Privacy-preserving CRM with AI relationship intelligence
2. Automated contact management with cultural protocols
3. Self-hosted AI architectures using Ollama
4. LinkedIn + Gmail API integration for relationship monitoring
5. Low-cost always-on infrastructure (<$100/month)

### Key Findings:

${aiAssistant?.synthesis?.synthesis || 'Processing...'}

### Technical Architecture:

${JSON.stringify(aiAssistant?.architecture, null, 2)}

### Implementation Roadmap:

${JSON.stringify(aiAssistant?.implementationRoadmap, null, 2)}

---

## Next Steps

### Immediate Actions (0-1 month):
1. Review entity structure recommendations with legal advisor
2. Document current R&D activities for tax claim preparation
3. Set up Triday trial and test API integration
4. Begin AI assistant proof-of-concept build

### Short Term (1-3 months):
1. Register chosen entity structure
2. Implement Triday + AI bookkeeping automation
3. File first R&D tax incentive claim
4. Deploy basic AI network assistant

### Medium Term (3-6 months):
1. Acquire first community land asset
2. Launch innovation economics pilot project
3. Scale AI assistant to full network
4. Apply for state innovation grants

### Long Term (6-12 months):
1. Establish full community governance framework
2. Implement circular economy business models
3. Launch community-owned asset portfolio
4. Build self-sustaining innovation commons

---

## Research Methodology

### Tools Used:
- **Perplexica**: Multi-source web research with citation tracking
- **Ollama (llama3.1:8b)**: Deep local reasoning and analysis
- **Claude Sonnet 4.5**: High-quality synthesis and recommendations
- **SearxNG**: Privacy-preserving search aggregation

### Quality Assurance:
- Minimum 10 sources per research area
- Focus on Australian regulations (2025)
- Indigenous/community business examples prioritized
- Official sources verified for tax/legal information
- Practical implementation examples included

---

*This report was generated by AI-powered deep research tools.*
*All recommendations should be verified with professional advisors.*
`;
}

export default router;
