// Redirect to enhanced version for backward compatibility
// The original notion-mcp.js functionality is now in notion-mcp-enhanced.js

console.log('Note: notion-mcp.js has been upgraded to notion-mcp-enhanced.js');
console.log('This file maintains backward compatibility by re-exporting the enhanced version');

// Re-export everything from the enhanced version
if (typeof window !== 'undefined') {
    // Browser environment
    if (window.NotionMCPEnhanced) {
        window.NotionMCP = window.NotionMCPEnhanced;
        window.PlacematNotionIntegration = window.PlacematNotionIntegrationEnhanced;
    } else {
        console.error('notion-mcp-enhanced.js must be loaded before this file');
    }
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    const enhanced = require('./notion-mcp-enhanced.js');
    module.exports = enhanced;
}