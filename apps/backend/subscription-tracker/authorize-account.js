#!/usr/bin/env node
/**
 * Gmail Account Authorization CLI
 *
 * Authorizes individual Gmail accounts for multi-account scanning.
 *
 * Usage:
 *   node authorize-account.js nicholas@act.place
 *   node authorize-account.js hi@act.place
 *   node authorize-account.js accounts@act.place
 *
 * This opens a browser for OAuth consent, then saves the token for future use.
 */

import { GmailTokenManager } from './services/gmail/gmailTokenManager.js';
import readline from 'readline';
import open from 'open';

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m'; // No Color

function printHeader() {
  console.log('');
  console.log(`${BOLD}Gmail Account Authorization${NC}`);
  console.log('═'.repeat(60));
  console.log('');
}

function printSuccess(message) {
  console.log(`${GREEN}✓${NC} ${message}`);
}

function printError(message) {
  console.log(`${RED}✗${NC} ${message}`);
}

function printWarning(message) {
  console.log(`${YELLOW}⚠${NC} ${message}`);
}

function printInfo(message) {
  console.log(`${BLUE}ℹ${NC} ${message}`);
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function authorizeAccount(accountEmail) {
  printHeader();

  console.log(`${BOLD}Account:${NC} ${accountEmail}`);
  console.log('');

  const tokenManager = new GmailTokenManager();

  // Check if token already exists
  if (tokenManager.hasToken(accountEmail)) {
    printWarning(`Token already exists for ${accountEmail}`);
    console.log('');

    const overwrite = await promptUser(
      'Do you want to re-authorize this account? (y/N): '
    );

    if (overwrite.toLowerCase() !== 'y') {
      console.log('');
      printInfo('Authorization cancelled. Existing token will be kept.');
      process.exit(0);
    }

    console.log('');
  }

  // Step 1: Generate authorization URL
  printInfo('Step 1: Generate authorization URL...');

  const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
  const authUrl = tokenManager.generateAuthUrl(accountEmail, scopes);

  printSuccess('Authorization URL generated');
  console.log('');

  // Step 2: Open browser
  console.log(`${BOLD}Step 2: Authorize in browser${NC}`);
  console.log('');
  console.log('A browser window will open. Please:');
  console.log(`  1. Sign in with ${YELLOW}${accountEmail}${NC}`);
  console.log('  2. Click "Allow" to grant read-only Gmail access');
  console.log('  3. Copy the authorization code from the browser');
  console.log('');

  const openBrowser = await promptUser('Open browser now? (Y/n): ');

  if (openBrowser.toLowerCase() !== 'n') {
    try {
      await open(authUrl);
      printSuccess('Browser opened');
    } catch (error) {
      printWarning(`Could not open browser automatically: ${error.message}`);
      console.log('');
      console.log('Please open this URL manually:');
      console.log(`${BLUE}${authUrl}${NC}`);
    }
  } else {
    console.log('');
    console.log('Please open this URL in your browser:');
    console.log(`${BLUE}${authUrl}${NC}`);
  }

  console.log('');

  // Step 3: Get authorization code from user
  console.log(`${BOLD}Step 3: Enter authorization code${NC}`);
  console.log('');

  const code = await promptUser('Paste the authorization code here: ');

  if (!code || code.trim().length === 0) {
    console.log('');
    printError('No authorization code provided. Exiting.');
    process.exit(1);
  }

  console.log('');

  // Step 4: Exchange code for tokens
  printInfo('Step 4: Exchange code for access tokens...');

  try {
    const tokens = await tokenManager.getTokenFromCode(accountEmail, code.trim());

    printSuccess('Tokens received and saved');
    console.log('');

    // Step 5: Validate token
    printInfo('Step 5: Validating token...');

    try {
      const gmail = await tokenManager.getGmailClient(accountEmail);
      const profile = await gmail.users.getProfile({ userId: 'me' });

      printSuccess(`Token validated for ${profile.data.emailAddress}`);
      console.log('');

      // Success summary
      console.log('═'.repeat(60));
      console.log('');
      console.log(`${GREEN}${BOLD}✓ SUCCESS!${NC} ${accountEmail} is now authorized!`);
      console.log('');
      console.log(`Token saved to: ${tokenManager.getTokenPath(accountEmail)}`);
      console.log('');
      console.log('You can now use this account for multi-account scanning.');
      console.log('');

      // Check how many accounts are authorized
      const authorizedAccounts = tokenManager.listAccounts();
      console.log(`${BOLD}Authorized Accounts (${authorizedAccounts.length}):${NC}`);
      authorizedAccounts.forEach(acc => {
        console.log(`  • ${acc.email}`);
      });
      console.log('');

    } catch (validationError) {
      printError(`Token validation failed: ${validationError.message}`);
      console.log('');
      printWarning('Token was saved but may not be valid. Please check:');
      console.log('  1. You signed in with the correct account');
      console.log('  2. You granted the requested permissions');
      console.log('  3. Gmail API is enabled in Google Cloud Console');
      console.log('');
      process.exit(1);
    }

  } catch (error) {
    console.log('');
    printError(`Failed to exchange code for token: ${error.message}`);
    console.log('');
    console.log('Common issues:');
    console.log('  • Authorization code was invalid or expired (they expire quickly!)');
    console.log('  • Network connectivity issues');
    console.log('  • OAuth credentials file is missing or invalid');
    console.log('');
    console.log('Please try again with a fresh authorization code.');
    console.log('');
    process.exit(1);
  }
}

async function listAuthorizedAccounts() {
  printHeader();

  const tokenManager = new GmailTokenManager();
  const accounts = tokenManager.listAccounts();

  if (accounts.length === 0) {
    printWarning('No authorized accounts found.');
    console.log('');
    console.log('Run this script with an email address to authorize an account:');
    console.log(`  ${BLUE}node authorize-account.js your.email@example.com${NC}`);
    console.log('');
    return;
  }

  console.log(`${BOLD}Authorized Accounts (${accounts.length}):${NC}`);
  console.log('');

  for (const account of accounts) {
    console.log(`  ${GREEN}✓${NC} ${account.email}`);
  }

  console.log('');

  // Offer to validate all tokens
  const validate = await promptUser('Validate all tokens? (y/N): ');

  if (validate.toLowerCase() === 'y') {
    console.log('');
    printInfo('Validating all tokens...');
    console.log('');

    const results = await tokenManager.validateAllTokens();

    console.log('');
    console.log(`${BOLD}Validation Results:${NC}`);
    console.log('');

    results.forEach(result => {
      if (result.valid) {
        printSuccess(`${result.email} - Valid`);
      } else {
        printError(`${result.email} - Invalid: ${result.error}`);
      }
    });

    console.log('');
  }
}

async function revokeAccount(accountEmail) {
  printHeader();

  const tokenManager = new GmailTokenManager();

  if (!tokenManager.hasToken(accountEmail)) {
    printError(`No token found for ${accountEmail}`);
    console.log('');
    process.exit(1);
  }

  console.log(`${BOLD}Revoke Authorization${NC}`);
  console.log('');
  console.log(`Account: ${RED}${accountEmail}${NC}`);
  console.log('');

  const confirm = await promptUser(
    `Are you sure you want to delete the token for ${accountEmail}? (y/N): `
  );

  if (confirm.toLowerCase() !== 'y') {
    console.log('');
    printInfo('Revocation cancelled.');
    console.log('');
    process.exit(0);
  }

  console.log('');

  const deleted = tokenManager.deleteToken(accountEmail);

  if (deleted) {
    printSuccess(`Token deleted for ${accountEmail}`);
    console.log('');
    printInfo('Note: This only deletes the local token file.');
    printInfo('To fully revoke access, go to: https://myaccount.google.com/permissions');
    console.log('');
  } else {
    printError('Failed to delete token');
    console.log('');
  }
}

// Main CLI
async function main() {
  const args = process.argv.slice(2);

  // Check for special commands
  if (args.length === 0 || args[0] === '--list' || args[0] === '-l') {
    await listAuthorizedAccounts();
    return;
  }

  if (args[0] === '--help' || args[0] === '-h') {
    printHeader();
    console.log('Usage:');
    console.log('');
    console.log('  Authorize an account:');
    console.log(`    ${BLUE}node authorize-account.js your.email@example.com${NC}`);
    console.log('');
    console.log('  List authorized accounts:');
    console.log(`    ${BLUE}node authorize-account.js --list${NC}`);
    console.log('');
    console.log('  Revoke an account:');
    console.log(`    ${BLUE}node authorize-account.js --revoke your.email@example.com${NC}`);
    console.log('');
    console.log('Examples:');
    console.log(`    ${BLUE}node authorize-account.js nicholas@act.place${NC}`);
    console.log(`    ${BLUE}node authorize-account.js hi@act.place${NC}`);
    console.log(`    ${BLUE}node authorize-account.js accounts@act.place${NC}`);
    console.log('');
    return;
  }

  if (args[0] === '--revoke' || args[0] === '-r') {
    if (args.length < 2) {
      printError('Please specify an email address to revoke');
      console.log('');
      console.log(`Usage: ${BLUE}node authorize-account.js --revoke your.email@example.com${NC}`);
      console.log('');
      process.exit(1);
    }

    await revokeAccount(args[1]);
    return;
  }

  // Otherwise, treat first arg as email address to authorize
  const accountEmail = args[0];

  // Basic email validation
  if (!accountEmail.includes('@')) {
    printError(`Invalid email address: ${accountEmail}`);
    console.log('');
    process.exit(1);
  }

  await authorizeAccount(accountEmail);
}

// Run CLI
main().catch(error => {
  console.error('');
  printError(`Unexpected error: ${error.message}`);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  console.error('');
  process.exit(1);
});
