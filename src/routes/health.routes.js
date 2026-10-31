const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

router.get('/health', (req, res) => healthController.getHealth(req, res));
router.get('/health/ready', (req, res) => healthController.getReadiness(req, res));

module.exports = router;
