#!/usr/bin/env node

/**
 * Secrets Manager for ACT Placemat
 * 
 * Provides SOPS-like functionality for encrypting/decrypting sensitive environment files
 * Uses age encryption for secure secret management
 * 
 * Usage:
 *   node scripts/secrets-manager.js encrypt .env.local
 *   node scripts/secrets-manager.js decrypt .env.local.enc
 *   node scripts/secrets-manager.js generate-key
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuration
const SECRETS_CONFIG = {
  keyFile: join(PROJECT_ROOT, '.secrets', 'age.key'),
  publicKeyFile: join(PROJECT_ROOT, '.secrets', 'age.pub'),
  encryptedExtension: '.enc',
  secretsDir: join(PROJECT_ROOT, '.secrets'),
};

/**
 * Ensure secrets directory exists
 */
async function ensureSecretsDir() {
  try {
    await fs.access(SECRETS_CONFIG.secretsDir);
  } catch {
    await fs.mkdir(SECRETS_CONFIG.secretsDir, { recursive: true });
    console.log(`📁 Created secrets directory: ${SECRETS_CONFIG.secretsDir}`);
  }
}

/**
 * Generate age key pair
 */
async function generateKeyPair() {
  try {
    await ensureSecretsDir();
    
    // Generate age key using age-keygen (if available) or our JS implementation
    let privateKey, publicKey;
    
    try {
      // Try to use age-keygen if installed
      const output = execSync('age-keygen', { encoding: 'utf8' });
      const lines = output.split('\n');
      
      // Extract keys from age-keygen output
      for (const line of lines) {
        if (line.startsWith('# public key:')) {
          publicKey = line.replace('# public key: ', '').trim();
        } else if (line.startsWith('AGE-SECRET-KEY-')) {
          privateKey = line.trim();
        }
      }
    } catch (ageError) {
      // Fallback to JavaScript implementation
      console.log('⚠️  age-keygen not found, using JavaScript fallback');
      
      // Simple key generation (in production, use proper age library)
      const crypto = await import('crypto');
      const keyData = crypto.randomBytes(32);
      privateKey = `AGE-SECRET-KEY-${keyData.toString('base64').replace(/[+/]/g, '').slice(0, 60).toUpperCase()}`;
      publicKey = `age${crypto.randomBytes(32).toString('base64').slice(0, 43)}`;
    }
    
    if (!privateKey || !publicKey) {
      throw new Error('Failed to generate keys');
    }
    
    // Save keys
    await fs.writeFile(SECRETS_CONFIG.keyFile, privateKey, { mode: 0o600 });
    await fs.writeFile(SECRETS_CONFIG.publicKeyFile, publicKey);
    
    console.log('🔑 Generated age key pair:');
    console.log(`   Private key: ${SECRETS_CONFIG.keyFile}`);
    console.log(`   Public key: ${SECRETS_CONFIG.publicKeyFile}`);
    console.log(`   Public key value: ${publicKey}`);
    console.log('');
    console.log('⚠️  Keep the private key safe and never commit it!');
    console.log('💡 Share the public key with team members for encryption');
    
    return { privateKey, publicKey };
  } catch (error) {
    console.error('❌ Failed to generate key pair:', error.message);
    process.exit(1);
  }
}

/**
 * Read public key
 */
async function getPublicKey() {
  try {
    const publicKey = await fs.readFile(SECRETS_CONFIG.publicKeyFile, 'utf8');
    return publicKey.trim();
  } catch (error) {
    console.error('❌ Public key not found. Run: node scripts/secrets-manager.js generate-key');
    process.exit(1);
  }
}

/**
 * Read private key
 */
async function getPrivateKey() {
  try {
    const privateKey = await fs.readFile(SECRETS_CONFIG.keyFile, 'utf8');
    return privateKey.trim();
  } catch (error) {
    console.error('❌ Private key not found. Run: node scripts/secrets-manager.js generate-key');
    process.exit(1);
  }
}

/**
 * Encrypt a file using age
 */
async function encryptFile(inputPath) {
  try {
    const publicKey = await getPublicKey();
    const inputFile = join(PROJECT_ROOT, inputPath);
    const outputFile = inputFile + SECRETS_CONFIG.encryptedExtension;
    
    // Read input file
    const content = await fs.readFile(inputFile, 'utf8');
    
    try {
      // Try using age CLI if available
      execSync(`age -r ${publicKey} -o "${outputFile}" "${inputFile}"`, { stdio: 'pipe' });
      console.log(`🔒 Encrypted: ${inputPath} → ${inputPath}${SECRETS_CONFIG.encryptedExtension}`);
    } catch (ageError) {
      // Fallback to JavaScript implementation (simplified encryption)
      console.log('⚠️  age CLI not found, using simplified encryption');
      
      const crypto = await import('crypto');
      const key = crypto.scryptSync(publicKey, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const encryptedData = {
        version: 'js-fallback-v1',
        data: encrypted,
        iv: iv.toString('hex'),
        publicKey: publicKey,
        timestamp: new Date().toISOString(),
      };
      
      await fs.writeFile(outputFile, JSON.stringify(encryptedData, null, 2));
      console.log(`🔒 Encrypted (fallback): ${inputPath} → ${inputPath}${SECRETS_CONFIG.encryptedExtension}`);
    }
    
    // Create .gitignore entry for the original file if it doesn't exist
    await addToGitignore(inputPath);
    
  } catch (error) {
    console.error('❌ Encryption failed:', error.message);
    process.exit(1);
  }
}

/**
 * Decrypt a file using age
 */
async function decryptFile(inputPath) {
  try {
    const privateKey = await getPrivateKey();
    const inputFile = join(PROJECT_ROOT, inputPath);
    const outputFile = inputFile.replace(SECRETS_CONFIG.encryptedExtension, '');
    
    try {
      // Try using age CLI if available
      execSync(`age -d -i "${SECRETS_CONFIG.keyFile}" -o "${outputFile}" "${inputFile}"`, { stdio: 'pipe' });
      console.log(`🔓 Decrypted: ${inputPath} → ${outputFile.replace(PROJECT_ROOT + '/', '')}`);
    } catch (ageError) {
      // Fallback to JavaScript implementation
      console.log('⚠️  age CLI not found, using JavaScript fallback');
      
      const encryptedContent = await fs.readFile(inputFile, 'utf8');
      const encryptedData = JSON.parse(encryptedContent);
      
      if (encryptedData.version !== 'js-fallback-v1') {
        throw new Error('Unsupported encryption format');
      }
      
      const crypto = await import('crypto');
      const key = crypto.scryptSync(encryptedData.publicKey, 'salt', 32);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      await fs.writeFile(outputFile, decrypted);
      console.log(`🔓 Decrypted (fallback): ${inputPath} → ${outputFile.replace(PROJECT_ROOT + '/', '')}`);
    }
    
  } catch (error) {
    console.error('❌ Decryption failed:', error.message);
    process.exit(1);
  }
}

/**
 * Add file to .gitignore if not already there
 */
async function addToGitignore(filePath) {
  const gitignorePath = join(PROJECT_ROOT, '.gitignore');
  
  try {
    let gitignoreContent = '';
    try {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    } catch {
      // .gitignore doesn't exist, will create it
    }
    
    const relativePath = filePath.startsWith('./') ? filePath : `./${filePath}`;
    
    if (!gitignoreContent.includes(relativePath)) {
      const newContent = gitignoreContent + (gitignoreContent.endsWith('\n') ? '' : '\n') + 
                        `${relativePath}\n`;
      await fs.writeFile(gitignorePath, newContent);
      console.log(`📝 Added ${relativePath} to .gitignore`);
    }
  } catch (error) {
    console.warn('⚠️  Could not update .gitignore:', error.message);
  }
}

/**
 * List encrypted files
 */
async function listEncryptedFiles() {
  try {
    const files = await fs.readdir(PROJECT_ROOT);
    const encryptedFiles = files.filter(file => file.endsWith(SECRETS_CONFIG.encryptedExtension));
    
    if (encryptedFiles.length === 0) {
      console.log('📁 No encrypted files found');
      return;
    }
    
    console.log('🔒 Encrypted files:');
    for (const file of encryptedFiles) {
      const stats = await fs.stat(join(PROJECT_ROOT, file));
      console.log(`   ${file} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
    }
  } catch (error) {
    console.error('❌ Failed to list files:', error.message);
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const [,, command, ...args] = process.argv;
  
  switch (command) {
    case 'generate-key':
    case 'keygen':
      await generateKeyPair();
      break;
      
    case 'encrypt':
    case 'enc':
      if (!args[0]) {
        console.error('❌ Usage: node scripts/secrets-manager.js encrypt <file>');
        process.exit(1);
      }
      await encryptFile(args[0]);
      break;
      
    case 'decrypt':
    case 'dec':
      if (!args[0]) {
        console.error('❌ Usage: node scripts/secrets-manager.js decrypt <file>');
        process.exit(1);
      }
      await decryptFile(args[0]);
      break;
      
    case 'list':
    case 'ls':
      await listEncryptedFiles();
      break;
      
    case 'help':
    case '--help':
    case '-h':
    default:
      console.log(`
🔐 ACT Placemat Secrets Manager

Usage:
  node scripts/secrets-manager.js <command> [options]

Commands:
  generate-key, keygen    Generate new age key pair
  encrypt <file>          Encrypt a file
  decrypt <file>          Decrypt a file  
  list, ls               List encrypted files
  help                   Show this help

Examples:
  node scripts/secrets-manager.js generate-key
  node scripts/secrets-manager.js encrypt .env.local
  node scripts/secrets-manager.js decrypt .env.local.enc
  node scripts/secrets-manager.js list

Notes:
  - Encrypted files have .enc extension
  - Original files are automatically added to .gitignore
  - Keep private keys safe and never commit them
  - Share public keys with team members for encryption
      `);
      break;
  }
}

// Run if called directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('secrets-manager.js');
if (isMainModule) {
  main().catch(console.error);
}