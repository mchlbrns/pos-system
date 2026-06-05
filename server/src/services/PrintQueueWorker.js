/**
 * @module services/PrintQueueWorker
 * @description Polls and processes database printer queue.
 */

'use strict';

const PrinterJob = require('../models/PrinterJob');
const path = require('path');
const fs = require('fs');

let printerManager = null;
try {
  const pmPath = path.resolve(__dirname, '../../../printer-drivers/src/PrinterManager');
  printerManager = require(pmPath);
} catch (e) {
  // Mock printer only
}

class PrintQueueWorker {
  constructor() {
    this.intervalId = null;
    this.isProcessing = false;
  }

  start() {
    if (this.intervalId) return;
    console.log('Print queue worker started...');
    this.intervalId = setInterval(() => this.processQueue(), 5000);
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
      const job = PrinterJob.claimNextJob();
      if (job) {
        console.log(`Processing printer job ${job.id} for business ${job.business_id}`);
        
        try {
          if (printerManager) {
            await printerManager.processJob(job);
            PrinterJob.updateStatus(job.id, 'completed');
            console.log(`Printer job ${job.id} completed successfully.`);
          } else {
            const logDir = path.resolve(__dirname, '../../data');
            if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
            
            const logFile = path.join(logDir, 'virtual_printer.txt');
            const logData = `
===================================================
PRINTER JOB ID: ${job.id}
BUSINESS ID: ${job.business_id}
TIMESTAMP: ${new Date().toISOString()}
PAYLOAD:
${JSON.stringify(job.payload, null, 2)}
===================================================
`;
            fs.appendFileSync(logFile, logData);
            PrinterJob.updateStatus(job.id, 'completed');
            console.log(`Mock printed job ${job.id} to server/data/virtual_printer.txt`);
          }
        } catch (err) {
          console.error(`Failed to print job ${job.id}:`, err);
          PrinterJob.updateStatus(job.id, 'failed', err.message);
        }
      }
    } catch (error) {
      console.error('Error in PrintQueueWorker:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

module.exports = new PrintQueueWorker();
