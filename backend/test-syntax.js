#!/usr/bin/env node

// Basic test to check if the index.js file has syntax errors
import('./src/index.js').then(() => {
  console.log('✅ Index.js loaded successfully - no syntax errors');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error loading index.js:', error);
  process.exit(1);
});