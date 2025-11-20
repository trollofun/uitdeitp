#!/usr/bin/env node

/**
 * Test Report Generator
 *
 * Parses Jest JSON output and generates comprehensive test report
 */

const fs = require('fs');
const path = require('path');

const resultsDir = process.argv[2];

if (!resultsDir) {
  console.error('Usage: node generate-report.js <results-dir>');
  process.exit(1);
}

const testFiles = [
  { name: 'Date Calculations', file: 'unit-date.json', category: 'Unit Tests' },
  { name: 'Notification Intervals', file: 'unit-intervals.json', category: 'Unit Tests' },
  { name: 'Cron Endpoint', file: 'integration-cron.json', category: 'Integration Tests' },
  { name: 'Reminder Processor', file: 'integration-processor.json', category: 'Integration Tests' },
  { name: 'NotifyHub', file: 'integration-notifyhub.json', category: 'Integration Tests' },
  { name: 'Duplicate Reminders', file: 'edge-duplicates.json', category: 'Edge Cases' },
  { name: 'Expired Reminders', file: 'edge-expired.json', category: 'Edge Cases' },
  { name: 'Missing Data', file: 'edge-missing.json', category: 'Edge Cases' },
];

const results = [];
let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;
let totalSkipped = 0;

console.log('Parsing test results...\n');

for (const testFile of testFiles) {
  const filePath = path.join(resultsDir, testFile.file);

  if (!fs.existsSync(filePath)) {
    console.log(`WARNING: ${testFile.file} not found`);
    results.push({
      name: testFile.name,
      category: testFile.category,
      status: 'NOT_RUN',
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    });
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const numTotalTests = data.numTotalTests || 0;
  const numPassedTests = data.numPassedTests || 0;
  const numFailedTests = data.numFailedTests || 0;
  const numPendingTests = data.numPendingTests || 0;

  totalTests += numTotalTests;
  totalPassed += numPassedTests;
  totalFailed += numFailedTests;
  totalSkipped += numPendingTests;

  results.push({
    name: testFile.name,
    category: testFile.category,
    status: numFailedTests > 0 ? 'FAILED' : 'PASSED',
    tests: numTotalTests,
    passed: numPassedTests,
    failed: numFailedTests,
    skipped: numPendingTests,
    testResults: data.testResults || [],
  });
}

// Generate text report
const textReport = generateTextReport(results, totalTests, totalPassed, totalFailed, totalSkipped);
fs.writeFileSync(path.join(resultsDir, 'report.txt'), textReport);

// Generate HTML report
const htmlReport = generateHtmlReport(results, totalTests, totalPassed, totalFailed, totalSkipped);
fs.writeFileSync(path.join(resultsDir, 'report.html'), htmlReport);

console.log(textReport);
console.log(`\nReports saved to ${resultsDir}/`);

function generateTextReport(results, totalTests, totalPassed, totalFailed, totalSkipped) {
  let report = '';

  report += '================================================\n';
  report += 'NOTIFICATION FLOW TEST REPORT\n';
  report += '================================================\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += 'SUMMARY\n';
  report += '-------\n';
  report += `Total Tests: ${totalTests}\n`;
  report += `Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)\n`;
  report += `Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)\n`;
  report += `Skipped: ${totalSkipped}\n`;
  report += `Overall Status: ${totalFailed === 0 ? 'PASS ✓' : 'FAIL ✗'}\n\n`;

  // Group by category
  const categories = [...new Set(results.map(r => r.category))];

  for (const category of categories) {
    report += `\n${category.toUpperCase()}\n`;
    report += '-'.repeat(category.length + 10) + '\n';

    const categoryResults = results.filter(r => r.category === category);

    for (const result of categoryResults) {
      const statusIcon = result.status === 'PASSED' ? '✓' : result.status === 'FAILED' ? '✗' : '○';
      report += `${statusIcon} ${result.name.padEnd(30)} ${result.passed}/${result.tests} passed`;

      if (result.failed > 0) {
        report += ` (${result.failed} failed)`;
      }
      if (result.skipped > 0) {
        report += ` (${result.skipped} skipped)`;
      }

      report += '\n';
    }
  }

  // Detailed failures
  const failedTests = results.filter(r => r.failed > 0);
  if (failedTests.length > 0) {
    report += '\n\nFAILED TESTS\n';
    report += '------------\n';

    for (const result of failedTests) {
      report += `\n${result.name}:\n`;

      if (result.testResults && result.testResults.length > 0) {
        for (const testResult of result.testResults) {
          if (testResult.status === 'failed') {
            report += `  - ${testResult.name}\n`;
            if (testResult.message) {
              report += `    Error: ${testResult.message.substring(0, 200)}...\n`;
            }
          }
        }
      }
    }
  }

  report += '\n\nRECOMMENDATIONS\n';
  report += '---------------\n';

  if (totalFailed === 0) {
    report += '✓ All tests passing!\n';
    report += '✓ Notification flow is working correctly\n';
    report += '✓ Ready for production deployment\n';
  } else {
    report += '✗ Some tests failed - review failures above\n';
    report += '- Fix failed tests before deploying to production\n';
    report += '- Check database schema matches code expectations\n';
    report += '- Verify NotifyHub integration is configured correctly\n';
    report += '- Ensure environment variables are set properly\n';
  }

  report += '\n================================================\n';

  return report;
}

function generateHtmlReport(results, totalTests, totalPassed, totalFailed, totalSkipped) {
  const passRate = ((totalPassed / totalTests) * 100).toFixed(1);
  const overallStatus = totalFailed === 0 ? 'PASS' : 'FAIL';

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Notification Flow Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .timestamp {
      color: #666;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .summary {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 15px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .summary-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 14px;
    }
    .status-pass {
      background: #22c55e;
      color: white;
    }
    .status-fail {
      background: #ef4444;
      color: white;
    }
    .category {
      margin-bottom: 30px;
    }
    .category-title {
      font-size: 20px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e5e5;
    }
    .test-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .test-name {
      font-weight: 500;
    }
    .test-stats {
      display: flex;
      gap: 15px;
      font-size: 14px;
    }
    .stat-passed { color: #22c55e; }
    .stat-failed { color: #ef4444; }
    .stat-skipped { color: #f59e0b; }
    .icon-pass { color: #22c55e; }
    .icon-fail { color: #ef4444; }
    .icon-skip { color: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Notification Flow Test Report</h1>
    <div class="timestamp">Generated: ${new Date().toISOString()}</div>

    <div class="summary">
      <h2>Summary <span class="status-badge status-${overallStatus.toLowerCase()}">${overallStatus}</span></h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value">${totalTests}</div>
          <div class="summary-label">Total Tests</div>
        </div>
        <div class="summary-item">
          <div class="summary-value stat-passed">${totalPassed}</div>
          <div class="summary-label">Passed (${passRate}%)</div>
        </div>
        <div class="summary-item">
          <div class="summary-value stat-failed">${totalFailed}</div>
          <div class="summary-label">Failed</div>
        </div>
        <div class="summary-item">
          <div class="summary-value stat-skipped">${totalSkipped}</div>
          <div class="summary-label">Skipped</div>
        </div>
      </div>
    </div>

    ${generateCategoryHtml(results)}
  </div>
</body>
</html>
  `;
}

function generateCategoryHtml(results) {
  const categories = [...new Set(results.map(r => r.category))];
  let html = '';

  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);

    html += `<div class="category">`;
    html += `<div class="category-title">${category}</div>`;

    for (const result of categoryResults) {
      const icon = result.status === 'PASSED' ? '✓' : result.status === 'FAILED' ? '✗' : '○';
      const iconClass = result.status === 'PASSED' ? 'icon-pass' : result.status === 'FAILED' ? 'icon-fail' : 'icon-skip';

      html += `<div class="test-row">`;
      html += `<div class="test-name"><span class="${iconClass}">${icon}</span> ${result.name}</div>`;
      html += `<div class="test-stats">`;
      html += `<span class="stat-passed">✓ ${result.passed}</span>`;
      if (result.failed > 0) {
        html += `<span class="stat-failed">✗ ${result.failed}</span>`;
      }
      if (result.skipped > 0) {
        html += `<span class="stat-skipped">○ ${result.skipped}</span>`;
      }
      html += `</div>`;
      html += `</div>`;
    }

    html += `</div>`;
  }

  return html;
}
