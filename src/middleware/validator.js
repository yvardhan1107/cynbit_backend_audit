// Sanitizer to strip dangerous HTML / script tags
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // Strip angle brackets to prevent direct HTML injection
    .trim();
}

function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
}

function validatePhone(phone) {
  if (!phone) return true; // Optional
  const phoneRegex = /^[+]?[\d\s-]{8,18}$/;
  return phoneRegex.test(phone.trim());
}

// Validator for Enterprise Lead / Contact Inquiries
function validateInquiry(req, res, next) {
  const { name, email, company, serviceInterest, message, phone } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Name is required and must be between 2 and 100 characters.' });
  }

  if (!email || !validateEmail(email)) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (phone && !validatePhone(phone)) {
    errors.push({ field: 'phone', message: 'Invalid phone number format.' });
  }

  if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 3000) {
    errors.push({ field: 'message', message: 'Message must be between 10 and 3000 characters.' });
  }

  const validServices = ['ai-automation', 'autonomous-agents', 'full-stack-engineering', 'cloud-devops', 'custom-solution'];
  if (serviceInterest && !validServices.includes(serviceInterest)) {
    errors.push({
      field: 'serviceInterest',
      message: `Invalid service. Allowed values: ${validServices.join(', ')}`,
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      type: 'https://cynbit.in/errors/validation-failed',
      title: 'Bad Request',
      status: 400,
      detail: 'Validation failed for one or more fields.',
      errors,
      correlationId: req.correlationId,
    });
  }

  // Sanitize cleaned inputs
  req.sanitizedBody = {
    name: sanitizeString(name),
    email: email.trim().toLowerCase(),
    company: sanitizeString(company || ''),
    serviceInterest: serviceInterest || 'custom-solution',
    message: sanitizeString(message),
    phone: phone ? phone.trim() : null,
  };

  next();
}

// Validator for BitElevate Career/Student Applications
function validateBitElevateApplication(req, res, next) {
  const { fullName, email, collegeOrOrg, track, experienceLevel, portfolioUrl, resumeUrl, statementOfPurpose } = req.body || {};
  const errors = [];

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push({ field: 'fullName', message: 'Full name is required.' });
  }

  if (!email || !validateEmail(email)) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  const validTracks = [
    'ai-ml-engineering',
    'backend-developer-intern',
    'full-stack-developer',
    'devops-cloud-engineer',
    'qa-testing',
    'ui-ux-design',
  ];

  if (!track || !validTracks.includes(track)) {
    errors.push({
      field: 'track',
      message: `Track is required. Choose from: ${validTracks.join(', ')}`,
    });
  }

  if (portfolioUrl && !/^https?:\/\/.+/.test(portfolioUrl)) {
    errors.push({ field: 'portfolioUrl', message: 'Portfolio URL must be a valid HTTP(S) URL.' });
  }

  if (resumeUrl && !/^https?:\/\/.+/.test(resumeUrl)) {
    errors.push({ field: 'resumeUrl', message: 'Resume URL must be a valid HTTP(S) URL.' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      type: 'https://cynbit.in/errors/validation-failed',
      title: 'Bad Request',
      status: 400,
      detail: 'Validation failed for BitElevate application.',
      errors,
      correlationId: req.correlationId,
    });
  }

  req.sanitizedBody = {
    fullName: sanitizeString(fullName),
    email: email.trim().toLowerCase(),
    collegeOrOrg: sanitizeString(collegeOrOrg || ''),
    track,
    experienceLevel: sanitizeString(experienceLevel || 'student'),
    portfolioUrl: portfolioUrl ? portfolioUrl.trim() : null,
    resumeUrl: resumeUrl ? resumeUrl.trim() : null,
    statementOfPurpose: sanitizeString(statementOfPurpose || ''),
  };

  next();
}

module.exports = {
  validateInquiry,
  validateBitElevateApplication,
  sanitizeString,
};
