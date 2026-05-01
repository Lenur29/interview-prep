import type { Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_RESULTS_DIR = path.join(__dirname, '..', 'test-results');
const LOG_FILE = path.join(TEST_RESULTS_DIR, 'test.log');

let isLogging = false;

function log(message: string): void {
  if (!isLogging) {
    return;
  }

  fs.appendFileSync(LOG_FILE, `${message}\n`);
}

class LogReporter implements Reporter {
  onTestBegin(test: TestCase): void {
    isLogging = process.env.PW_LOG === '1' || process.env.PW_PREVIEW === '1';

    if (!isLogging) {
      return;
    }

    if (!fs.existsSync(TEST_RESULTS_DIR)) {
      fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
    }

    fs.writeFileSync(LOG_FILE, '');

    log(`TEST START: ${test.titlePath().join(' > ')}`);
    log(`File: ${test.location.file}`);
    log('---');
  }

  onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
    if (step.category === 'test.step') {
      log(`STEP: ${step.title}`);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    log('---');
    log(`TEST END: ${result.status.toUpperCase()}`);
  }
}

export default LogReporter;
