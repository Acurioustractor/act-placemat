# ACT Placemat Documentation Navigation

**Last Updated:** October 26, 2025

## Folder Structure

### /Docs/LinkedIn/
**CRITICAL DATA** - Contains the source LinkedIn CSV files
- `Bens_data/` - ~4,492 LinkedIn connections
- `Nics_data/` - ~10,528 LinkedIn connections
- **TOTAL: ~15,020 connections** that need to be properly imported

### /Docs/Gmail/
- Gmail contacts export data
- Used for contact discovery and matching

### /Docs/Analysis/
Technical analysis and reports
- Contact cross-reference reports
- Relationship intelligence analysis
- Schema analysis scripts

### /Docs/Archive/
Old documentation and completed work
- **Root-Cleanup-20251026/** - Recently archived loose documents
  - Deployment/
  - Contact-System/
  - Features/
  - System/
  - Bugs/
  - SQL/

### /Docs/Features/
Feature documentation and specs

### /Docs/Security/
Security and privacy documentation

### /Docs/specs/
Technical specifications and development workflow

## Key Data Sources

### LinkedIn CSVs (NOT IMPORTED YET!)
- Location: `/Docs/LinkedIn/Bens_data/Connections.csv` & `/Docs/LinkedIn/Nics_data/Connections.csv`
- Records: ~15,020 total
- Status: ❌ **NEVER PROPERLY IMPORTED**
- Import Script: `/scripts/import-linkedin-data.js`

### Gmail Data
- Location: `/Docs/Gmail/contacts.json`
- Used for: Contact discovery via Gmail API

## Current Problem

The 15,020 LinkedIn CSV connections have **NEVER been properly imported** into the database.

Instead:
- 40,530 mystery records exist in `linkedin_imports` table (unknown source)
- 23 Gmail contacts incorrectly stored in `linkedin_contacts` table
- No link between LinkedIn data and projects
- Two disconnected contact systems

## See Also

- [CONTACT_SYSTEM_COMPLETE_ANALYSIS_AND_FIX.md](/Users/benknight/Code/ACT Placemat/CONTACT_SYSTEM_COMPLETE_ANALYSIS_AND_FIX.md) - Complete analysis of the contact system mess
- `/Docs/Archive/Root-Cleanup-20251026/` - All archived documentation from root cleanup
