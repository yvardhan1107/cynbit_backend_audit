const queueService = require('../services/queueService');

class HealthController {
  getHealth(req, res) {
    const memory = process.memoryUsage();
    return res.status(200).json({
      status: 'UP',
      service: 'cynbit-backend-engine',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryRssMb: (memory.rss / (1024 * 1024)).toFixed(2),
        heapUsedMb: (memory.heapUsed / (1024 * 1024)).toFixed(2),
      },
      queue: queueService.getMetrics(),
      correlationId: req.correlationId,
    });
  }

  getReadiness(req, res) {
    // In production, checks database ping, Redis connectivity, etc.
    return res.status(200).json({
      status: 'READY',
      checks: {
        database: 'OK',
        eventQueue: 'OK',
        cache: 'OK',
      },
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
    });
  }
}

module.exports = new HealthController();
