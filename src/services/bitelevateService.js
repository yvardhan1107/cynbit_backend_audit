const crypto = require('crypto');
const queueService = require('./queueService');

class BitElevateService {
  constructor() {
    this.applications = new Map();
  }

  async submitApplication(data, correlationId) {
    const id = `be_app_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    const applicationRecord = {
      id,
      ...data,
      reviewStatus: 'submitted',
      assignedEvaluator: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.applications.set(id, applicationRecord);

    // Queue automated verification & mentor notification
    const jobId = queueService.enqueue(
      'bitelevate:application_received',
      { applicationId: id, track: data.track, email: data.email },
      correlationId
    );

    return {
      applicationId: applicationRecord.id,
      track: applicationRecord.track,
      reviewStatus: applicationRecord.reviewStatus,
      jobId,
      message: 'BitElevate application submitted successfully.',
      createdAt: applicationRecord.createdAt,
    };
  }

  async getApplications(track = null, limit = 50) {
    let list = Array.from(this.applications.values());
    if (track) {
      list = list.filter((app) => app.track === track);
    }
    return list.slice(0, limit);
  }

  async getApplicationById(id) {
    return this.applications.get(id) || null;
  }
}

const bitElevateService = new BitElevateService();

module.exports = bitElevateService;
