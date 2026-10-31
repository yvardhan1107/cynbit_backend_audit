const inquiryService = require('../services/inquiryService');

class InquiryController {
  async submitInquiry(req, res, next) {
    try {
      const sanitized = req.sanitizedBody;
      const result = await inquiryService.createInquiry(sanitized, req.correlationId);

      return res.status(201).json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAllInquiries(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '20', 10);
      const list = await inquiryService.listInquiries(limit);

      return res.status(200).json({
        success: true,
        count: list.length,
        data: list,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InquiryController();
