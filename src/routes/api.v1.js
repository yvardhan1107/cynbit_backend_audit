const express = require('express');
const inquiryController = require('../controllers/inquiryController');
const bitElevateController = require('../controllers/bitelevateController');
const authController = require('../controllers/authController');
const { validateInquiry, validateBitElevateApplication } = require('../middleware/validator');
const { inquiryRateLimiter, authRateLimiter } = require('../middleware/rateLimiter');
const { idempotency } = require('../middleware/idempotency');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/v1/inquiries
 * @desc    Submit enterprise contact or lead inquiry
 * @access  Public (Rate-limited, Idempotent, Validated, Sanitized)
 */
router.post(
  '/inquiries',
  inquiryRateLimiter,
  idempotency,
  validateInquiry,
  (req, res, next) => inquiryController.submitInquiry(req, res, next)
);

/**
 * @route   GET /api/v1/inquiries
 * @desc    Retrieve enterprise leads for CRM triage
 * @access  Protected (Requires 'admin' role)
 */
router.get(
  '/inquiries',
  authenticate,
  authorize(['admin']),
  (req, res, next) => inquiryController.getAllInquiries(req, res, next)
);

/**
 * @route   POST /api/v1/bitelevate/apply
 * @desc    Submit student/engineer application for BitElevate platform
 * @access  Public (Rate-limited, Idempotent, Validated, Sanitized)
 */
router.post(
  '/bitelevate/apply',
  inquiryRateLimiter,
  idempotency,
  validateBitElevateApplication,
  (req, res, next) => bitElevateController.submitApplication(req, res, next)
);

/**
 * @route   GET /api/v1/bitelevate/applications
 * @desc    List applicants by track
 * @access  Protected (Requires 'admin' or 'staff' role)
 */
router.get(
  '/bitelevate/applications',
  authenticate,
  authorize(['admin', 'staff']),
  (req, res, next) => bitElevateController.listApplications(req, res, next)
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & issue cryptographically verified JWT token
 * @access  Public (Brute-force protected by authRateLimiter)
 */
router.post(
  '/auth/login',
  authRateLimiter,
  (req, res, next) => authController.login(req, res, next)
);

/**
 * @route   GET /api/v1/portal/me
 * @desc    Get authenticated user profile and tenant scope
 * @access  Protected (Any authenticated role)
 */
router.get(
  '/portal/me',
  authenticate,
  (req, res) => authController.getProfile(req, res)
);

/**
 * @route   GET /api/v1/portal/dashboard
 * @desc    Tenant dashboard metrics (demonstrates tenant isolation)
 * @access  Protected (Requires 'client' or 'admin')
 */
router.get(
  '/portal/dashboard',
  authenticate,
  authorize(['admin', 'client']),
  (req, res) => {
    res.status(200).json({
      success: true,
      tenantId: req.tenantId,
      message: `Tenant dashboard view for tenant: ${req.tenantId}`,
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
