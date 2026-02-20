const express = require('express');
const router = express.Router();
const { getUniversityStats } = require('../controllers/universityController');

router.get('/stats', getUniversityStats);

module.exports = router;