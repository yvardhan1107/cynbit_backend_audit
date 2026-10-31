const crypto = require('crypto');
const queueService = require('./queueService');

class InquiryService {
  constructor() {
    this.inquiries = new Map();
  }

  async createInquiry(data, correlationId) {
    const id = `inq_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    const record = {
      id,
      ...data,
      status: 'received',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.inquiries.set(id, record);

    // Asynchronously dispatch notification and CRM sync job
    const jobId = queueService.enqueue('inquiry:notify_sales_crm', { inquiryId: id, email: data.email }, correlationId);

    return {
      id: record.id,
      status: record.status,
      jobId,
      message: 'Inquiry successfully registered and queued for processing.',
      createdAt: record.createdAt,
    };
  }

  async listInquiries(limit = 20) {
    return Array.from(this.inquiries.values()).slice(0, limit);
  }

  async getInquiryById(id) {
    return this.inquiries.get(id) || null;
  }
}

const inquiryService = new InquiryService();

module.exports = inquiryService;
