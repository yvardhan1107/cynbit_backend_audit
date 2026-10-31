const authService = require('../services/authService');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          type: 'https://cynbit.in/errors/missing-credentials',
          title: 'Bad Request',
          status: 400,
          detail: 'Email and password are both required.',
          correlationId: req.correlationId,
        });
      }

      const result = await authService.login(email, password);

      if (!result) {
        return res.status(401).json({
          type: 'https://cynbit.in/errors/invalid-credentials',
          title: 'Unauthorized',
          status: 401,
          detail: 'Invalid credentials provided.',
          correlationId: req.correlationId,
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req, res) {
    return res.status(200).json({
      success: true,
      user: req.user,
      tenantId: req.tenantId,
      correlationId: req.correlationId,
    });
  }
}

module.exports = new AuthController();
