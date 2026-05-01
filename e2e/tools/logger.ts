import winston from 'winston';
import path from 'path';
import fs from 'fs';

const LOGS_DIR = path.join(import.meta.dirname, '..', 'test-results');
const LOG_FILE = path.join(LOGS_DIR, 'test.log');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const shouldLog = process.env.PW_LOG === '1' || process.env.PW_PREVIEW === '1';

export const logger = winston.createLogger({
  level: 'info',
  silent: !shouldLog,
  format: winston.format.printf(({ message }) => String(message)),
  transports: [
    new winston.transports.File({ filename: LOG_FILE, options: { flags: 'a' } }),
  ],
});
