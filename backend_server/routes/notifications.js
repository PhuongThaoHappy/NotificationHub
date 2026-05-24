/**
 * Notification Routes
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// GET routes
router.get('/', notificationController.getNotifications);
router.get('/stats', notificationController.getNotificationStats);
router.get('/grouped', notificationController.getNotificationsGroupedByDate);
router.get('/:id', notificationController.getNotificationById);

// PUT routes
router.put('/:id/read', notificationController.updateReadStatus);
router.put('/batch/read', notificationController.updateMultipleReadStatus);

// DELETE routes
router.delete('/:id', notificationController.deleteNotification);
router.post('/deduplicate', notificationController.findAndRemoveDuplicates);

module.exports = router;
