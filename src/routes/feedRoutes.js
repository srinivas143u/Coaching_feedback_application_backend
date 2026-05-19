const express = require('express');
const router = express.Router();
const { getFeeds, createFeed, deleteFeed } = require('../controllers/feedController');

// GET /api/feed    — fetch all feeds (Redis cached)
router.get('/feed', getFeeds);

// POST /api/feed   — create a new feed & emit real-time event
router.post('/feed', createFeed);

// DELETE /api/feed/:id  — delete a feed
router.delete('/feed/:id', deleteFeed);

module.exports = router;
