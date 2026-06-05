const fs = require('fs');
const path = require('path');

const logDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const errorLogPath = path.join(logDir, 'error.log');

function formatMessage(level, message, error) {
  const timestamp = new Date().toISOString();
  let trace = '';
  if (error && error.stack) {
    trace = `\nStack: ${error.stack}`;
  }
  return `[${timestamp}] [${level}] ${message}${trace}\n`;
}

const logger = {
  info: (msg) => {
    console.log(`[INFO] ${msg}`);
  },
  warn: (msg) => {
    console.warn(`[WARN] ${msg}`);
  },
  error: (msg, err) => {
    console.error(`[ERROR] ${msg}`, err || '');
    const logMsg = formatMessage('ERROR', msg, err);
    try {
      fs.appendFileSync(errorLogPath, logMsg, 'utf8');
    } catch (e) {
      console.error('Failed to write to error log file:', e);
    }
  }
};

module.exports = logger;
