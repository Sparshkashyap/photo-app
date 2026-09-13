// Photo routes

const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/photos', authenticateToken, photoController.getPhotos);
router.post('/photos', authenticateToken, photoController.uploadPhoto);
router.delete('/photos/:id', authenticateToken, photoController.deletePhoto);

module.exports = router;
