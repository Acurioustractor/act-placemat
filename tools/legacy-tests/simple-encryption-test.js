#!/usr/bin/env node

/**
 * Simple AES-256-GCM Encryption Test
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  encryptSensitiveData,
  decryptSensitiveData,
  DATA_CLASSIFICATION,
} from './apps/backend/src/services/encryptionService.js';

async function simpleEncryptionTest() {
  console.log('🔐 Simple AES-256-GCM Encryption Test');

  try {
    const testData = 'This is confidential test data';

    console.log('📤 Encrypting data...');
    const encryptResult = encryptSensitiveData(testData, {
      classification: DATA_CLASSIFICATION.CONFIDENTIAL,
    });

    console.log('✅ Encryption successful');
    console.log('   Algorithm:', encryptResult.metadata.algorithm);
    console.log('   Encrypted length:', encryptResult.encrypted.length);

    console.log('📥 Decrypting data...');
    const decryptResult = decryptSensitiveData(encryptResult.encrypted);

    if (decryptResult.decrypted === testData) {
      console.log('✅ Test PASSED: Original data recovered');
      console.log('   Original:', testData);
      console.log('   Decrypted:', decryptResult.decrypted);
    } else {
      console.log('❌ Test FAILED: Data mismatch');
      console.log('   Original:', testData);
      console.log('   Decrypted:', decryptResult.decrypted);
    }

    console.log('🎉 Simple encryption test complete');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleEncryptionTest();
