/**
 * ACT Placemat - Main Entry Point
 * 
 * This file exports the main classes and utilities for the ACT Placemat application.
 */

const NotionMCP = require('../integrations/notion-mcp');
const PlacematNotionIntegration = require('../integrations/notion-integration');
const { config, validateConfig } = require('../server/config');
const { logger, errorHandler } = require('../../utils/logger');
const { makeNotionRequest, makeRequestWithRetry } = require('../../utils/apiUtils');

// Export all components
module.exports = {
  NotionMCP,
  PlacematNotionIntegration,
  config,
  validateConfig,
  logger,
  errorHandler,
  makeNotionRequest,
  makeRequestWithRetry
};