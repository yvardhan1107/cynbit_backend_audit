const bitElevateService = require('../services/bitelevateService');

class BitElevateController {
  async submitApplication(req, res, next) {
    try {
      const sanitized = req.sanitizedBody;
      const result = await bitElevateService.submitApplication(sanitized, req.correlationId);

      return res.status(201).json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }

  async listApplications(req, res, next) {
    try {
      const { track, limit } = req.query;
      const results = await bitElevateService.getApplications(track, limit ? parseInt(limit, 10) : 50);

      return res.status(200).json({
        success: true,
        count: results.length,
        data: results,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BitElevateController();
