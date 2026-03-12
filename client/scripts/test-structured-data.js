#!/usr/bin/env node

/**
 * Structured Data Testing Utility
 * 
 * This script extracts and validates JSON-LD structured data from HTML files.
 * Run after build: node scripts/test-structured-data.js
 * 
 * For production testing, use Google's Rich Results Test:
 * https://search.google.com/test/rich-results
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = resolve(__dirname, '../dist');
const PUBLIC_DIR = resolve(__dirname, '../public');

const REQUIRED_SCHEMAS = {
  'index.html': ['WebSite', 'SoftwareApplication', 'Organization'],
  'blog/*.html': ['Article', 'FAQPage', 'BreadcrumbList']
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m'
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function extractJsonLd(html) {
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  const schemas = [];
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      schemas.push(parsed);
    } catch (e) {
      schemas.push({ error: e.message, raw: match[1].substring(0, 100) });
    }
  }
  
  return schemas;
}

function validateSchema(schema, filename) {
  const issues = [];
  
  if (schema.error) {
    issues.push(`JSON Parse Error: ${schema.error}`);
    return issues;
  }
  
  if (!schema['@context']) {
    issues.push('Missing @context');
  }
  
  if (!schema['@type']) {
    issues.push('Missing @type');
  }
  
  switch (schema['@type']) {
    case 'WebSite':
      if (!schema.name) issues.push('WebSite: Missing name');
      if (!schema.url) issues.push('WebSite: Missing url');
      break;
      
    case 'Organization':
      if (!schema.name) issues.push('Organization: Missing name');
      if (!schema.url) issues.push('Organization: Missing url');
      break;
      
    case 'SoftwareApplication':
      if (!schema.name) issues.push('SoftwareApplication: Missing name');
      if (!schema.applicationCategory) issues.push('SoftwareApplication: Missing applicationCategory');
      break;
      
    case 'Article':
      if (!schema.headline) issues.push('Article: Missing headline');
      if (!schema.author) issues.push('Article: Missing author');
      if (!schema.datePublished) issues.push('Article: Missing datePublished');
      break;
      
    case 'FAQPage':
      if (!schema.mainEntity || !Array.isArray(schema.mainEntity)) {
        issues.push('FAQPage: Missing or invalid mainEntity array');
      } else if (schema.mainEntity.length === 0) {
        issues.push('FAQPage: mainEntity array is empty');
      }
      break;
      
    case 'BreadcrumbList':
      if (!schema.itemListElement || !Array.isArray(schema.itemListElement)) {
        issues.push('BreadcrumbList: Missing or invalid itemListElement array');
      }
      break;
  }
  
  return issues;
}

function testFile(filepath, filename) {
  console.log(`\n${colors.blue}Testing:${colors.reset} ${filename}`);
  
  if (!existsSync(filepath)) {
    log(colors.yellow, '⚠', `File not found: ${filepath}`);
    return { passed: 0, failed: 1 };
  }
  
  const html = readFileSync(filepath, 'utf-8');
  const schemas = extractJsonLd(html);
  
  if (schemas.length === 0) {
    log(colors.yellow, '⚠', 'No JSON-LD schemas found');
    return { passed: 0, failed: 1 };
  }
  
  let passed = 0;
  let failed = 0;
  
  schemas.forEach((schema, i) => {
    const type = schema['@type'] || 'Unknown';
    const issues = validateSchema(schema, filename);
    
    if (issues.length === 0) {
      log(colors.green, '✓', `${type} schema is valid`);
      passed++;
    } else {
      log(colors.red, '✗', `${type} schema has issues:`);
      issues.forEach(issue => {
        console.log(`    ${colors.dim}- ${issue}${colors.reset}`);
      });
      failed++;
    }
  });
  
  return { passed, failed, schemas };
}

function main() {
  console.log('\n' + '='.repeat(50));
  console.log('  Structured Data Validation Report');
  console.log('='.repeat(50));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Test index.html (check dist first, then public)
  const indexPath = existsSync(join(DIST_DIR, 'index.html')) 
    ? join(DIST_DIR, 'index.html')
    : join(PUBLIC_DIR, '../index.html');
  
  const indexResult = testFile(indexPath, 'index.html');
  totalPassed += indexResult.passed;
  totalFailed += indexResult.failed;
  
  // Test blog posts
  const blogDir = join(PUBLIC_DIR, 'blog');
  if (existsSync(blogDir)) {
    const blogFiles = readdirSync(blogDir).filter(f => f.endsWith('.html'));
    
    blogFiles.forEach(file => {
      const result = testFile(join(blogDir, file), `blog/${file}`);
      totalPassed += result.passed;
      totalFailed += result.failed;
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('  Summary');
  console.log('='.repeat(50));
  console.log(`\n  ${colors.green}Passed:${colors.reset} ${totalPassed}`);
  console.log(`  ${colors.red}Failed:${colors.reset} ${totalFailed}`);
  
  console.log(`\n${colors.blue}For production testing, use:${colors.reset}`);
  console.log('  - Google Rich Results Test: https://search.google.com/test/rich-results');
  console.log('  - Schema.org Validator: https://validator.schema.org/');
  console.log('  - Bing Markup Validator: https://www.bing.com/webmasters/markup-validator\n');
  
  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
