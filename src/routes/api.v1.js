const express = require('express');
const inquiryController = require('../controllers/inquiryController');
const bitElevateController = require('../controllers/bitelevateController');
const authController = require('../controllers/authController');
const { validateInquiry, validateBitElevateApplication } = require('../middleware/validator');
const { inquiryRateLimiter, authRateLimiter } = require('../middleware/rateLimiter');
const { idempotency } = require('../middleware/idempotency');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Lead and contact inquiries
router.post(
  '/inquiries',
  inquiryRateLimiter,
  idempotency,
  validateInquiry,
  (req, res, next) => inquiryController.submitInquiry(req, res, next)
);

router.get(
  '/inquiries',
  authenticate,
  authorize(['admin']),
  (req, res, next) => inquiryController.getAllInquiries(req, res, next)
);

// BitElevate student and intern applications
router.post(
  '/bitelevate/apply',
  inquiryRateLimiter,
  idempotency,
  validateBitElevateApplication,
  (req, res, next) => bitElevateController.submitApplication(req, res, next)
);

router.get(
  '/bitelevate/applications',
  authenticate,
  authorize(['admin', 'staff']),
  (req, res, next) => bitElevateController.listApplications(req, res, next)
);

// Authentication
router.post(
  '/auth/login',
  authRateLimiter,
  (req, res, next) => authController.login(req, res, next)
);

router.get('/portal/me', authenticate, (req, res) => authController.getProfile(req, res));

// Tenant dashboard (scoped by req.tenantId)
router.get(
  '/portal/dashboard',
  authenticate,
  authorize(['admin', 'client']),
  (req, res) => {
    res.status(200).json({
      success: true,
      tenantId: req.tenantId,
      message: `Tenant dashboard for: ${req.tenantId}`,
      metrics: {
        activeAutomations: 12,
        aiAgentsOperating: 4,
        uptimePercentage: 99.98,
        monthlySavedHours: 320,
      },
      correlationId: req.correlationId,
    });
  }
);

module.exports = router;
