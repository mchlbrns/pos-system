'use strict';

const fs = require('fs');
const path = require('path');
const PrinterJob = require('../models/PrinterJob');
const logger = require('./logger');

let printerWizard = null;
try {
  printerWizard = require('./printerWizard');
} catch (e) {
  logger.warn('Failed to load printerWizard. Printing will use fallback mode.');
}

const pendingPrintsPath = path.resolve(__dirname, '../data/pending_prints.json');

function getPendingPrints() {
  try {
    if (fs.existsSync(pendingPrintsPath)) {
      const data = fs.readFileSync(pendingPrintsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    logger.error('Failed to read pending_prints.json', e);
  }
  return [];
}

function savePendingPrints(jobs) {
  try {
    const dir = path.dirname(pendingPrintsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(pendingPrintsPath, JSON.stringify(jobs, null, 2), 'utf8');
  } catch (e) {
    logger.error('Failed to write pending_prints.json', e);
  }
}

class PrinterQueue {
  constructor() {
    this.intervalId = null;
    this.isProcessing = false;
  }

  start() {
    if (this.intervalId) return;
    logger.info('Starting printer queue worker (polling every 10 seconds)...');
    this.intervalId = setInterval(() => this.processQueue(), 10000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. First retry any pending prints in pending_prints.json
      let pendingJobs = getPendingPrints();
      if (pendingJobs.length > 0) {
        logger.info(`Retrying ${pendingJobs.length} pending print jobs from disk...`);
        const remainingJobs = [];
        
        for (const job of pendingJobs) {
          const success = await this.printJob(job);
          if (!success) {
            remainingJobs.push(job);
          }
        }
        
        savePendingPrints(remainingJobs);
      }

      // 2. Process next queued job from SQLite
      const job = PrinterJob.claimNextJob();
      if (job) {
        logger.info(`Processing print job ID: ${job.id}`);
        const success = await this.printJob(job);
        
        if (success) {
          PrinterJob.updateStatus(job.id, 'completed');
        } else {
          // Add to pending_prints.json on disk for offline retry
          logger.warn(`Job ${job.id} failed/printer offline. Saving to offline queue.`);
          PrinterJob.updateStatus(job.id, 'failed', 'Printer offline. Saved to pending_prints.json');
          
          const currentPending = getPendingPrints();
          currentPending.push(job);
          savePendingPrints(currentPending);
        }
      }
    } catch (err) {
      logger.error('Error in printer queue processing:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  async printJob(job) {
    try {
      if (printerWizard && typeof printerWizard.printReceipt === 'function') {
        const result = await printerWizard.printReceipt(job);
        return result.success;
      } else {
        // Fallback to virtual printer mock text file
        const logDir = path.resolve(__dirname, '../data');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        
        const logFile = path.join(logDir, 'virtual_printer.txt');
        const logData = `
===================================================
VIRTUAL PRINTER OUTPUT (MOCK)
JOB ID: ${job.id}
TIMESTAMP: ${new Date().toISOString()}
PAYLOAD:
${JSON.stringify(job.payload, null, 2)}
===================================================
`;
        fs.appendFileSync(logFile, logData);
        logger.info(`Mock printed job ${job.id} to backend/data/virtual_printer.txt`);
        return true;
      }
    } catch (err) {
      logger.error(`Failed to execute print job ${job.id}:`, err);
      return false;
    }
  }
}

module.exports = new PrinterQueue();
