const EventEmitter = require('events');
const config = require('../config');

class QueueService extends EventEmitter {
  constructor() {
    super();
    this.jobs = [];
    this.deadLetterQueue = [];
    this.isProcessing = false;
    this.retryLimit = config.queue.retryAttempts;

    // Listen for new jobs
    this.on('job:enqueued', () => {
      this.processNext();
    });
  }

  enqueue(type, payload, correlationId) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      payload,
      correlationId,
      attempts: 0,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    this.jobs.push(job);
    this.emit('job:enqueued', job);
    return job.id;
  }

  async processNext() {
    if (this.isProcessing || this.jobs.length === 0) return;

    this.isProcessing = true;
    const job = this.jobs.shift();
    job.status = 'processing';
    job.attempts += 1;

    try {
      await this.executeJob(job);
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      this.emit('job:completed', job);
    } catch (err) {
      if (job.attempts < this.retryLimit) {
        job.status = 'retrying';
        // Exponential backoff simulation
        setTimeout(() => {
          this.jobs.push(job);
          this.emit('job:enqueued', job);
        }, 1000 * Math.pow(2, job.attempts));
      } else {
        job.status = 'failed';
        job.error = err.message;
        this.deadLetterQueue.push(job);
        this.emit('job:dlq', job);
      }
    } finally {
      this.isProcessing = false;
      if (this.jobs.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  async executeJob(job) {
    // Simulated execution of asynchronous tasks (e.g. Email dispatch, CRM Webhook, Analytics)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ delivered: true, timestamp: Date.now() });
      }, 50);
    });
  }

  getMetrics() {
    return {
      pending: this.jobs.length,
      dlqCount: this.deadLetterQueue.length,
      active: this.isProcessing ? 1 : 0,
    };
  }
}

const queueService = new QueueService();

module.exports = queueService;
