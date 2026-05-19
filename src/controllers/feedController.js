const Feed = require('../models/Feed');
const { getRedisClient } = require('../config/redis');
const { getIO } = require('../socket');

const CACHE_KEY = 'coaching:feeds';
const CACHE_TTL = parseInt(process.env.REDIS_CACHE_TTL) || 60; // seconds

// Helper: safely get/set Redis cache
const safeRedisGet = async (key) => {
  try {
    const client = getRedisClient();
    return await client.get(key);
  } catch {
    return null;
  }
};

const safeRedisSet = async (key, value, ttl) => {
  try {
    const client = getRedisClient();
    await client.set(key, value, 'EX', ttl);
  } catch {
    // Redis unavailable - skip caching
  }
};

const safeRedisDel = async (key) => {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch {
    // Redis unavailable - skip
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /feed  — return all published feeds (Redis cached)
// ─────────────────────────────────────────────────────────────────────────────
const getFeeds = async (req, res) => {
  try {
    // 1. Try Redis cache first
    const cached = await safeRedisGet(CACHE_KEY);
    if (cached) {
      console.log('⚡ Cache HIT – serving feeds from Redis');
      return res.json({
        success: true,
        source: 'cache',
        data: JSON.parse(cached),
      });
    }

    // 2. Fetch from MongoDB
    console.log('🗃️  Cache MISS – fetching feeds from MongoDB');
    const feeds = await Feed.find({ isPublished: true }).sort({ createdAt: -1 });

    // 3. Store in Redis
    await safeRedisSet(CACHE_KEY, JSON.stringify(feeds), CACHE_TTL);

    return res.json({ success: true, source: 'database', data: feeds });
  } catch (error) {
    console.error('getFeeds error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feeds' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /feed  — create a new feed & emit real-time event
// ─────────────────────────────────────────────────────────────────────────────
const createFeed = async (req, res) => {
  try {
    const { title, content, category, author, tags, imageUrl } = req.body;

    if (!title || !content || !author) {
      return res.status(400).json({
        success: false,
        message: 'title, content, and author are required',
      });
    }

    // Save to MongoDB
    const newFeed = await Feed.create({
      title,
      content,
      category: category || 'general',
      author,
      tags: tags || [],
      imageUrl: imageUrl || null,
    });

    // Invalidate Redis cache so next GET fetches fresh data
    await safeRedisDel(CACHE_KEY);
    console.log('🗑️  Redis cache invalidated');

    // Emit real-time Socket.IO event to all connected clients
    const io = getIO();
    if (io) {
      io.emit('new_feed', newFeed);
      console.log('📡 Emitted new_feed event via Socket.IO');
    }

    return res.status(201).json({ success: true, data: newFeed });
  } catch (error) {
    console.error('createFeed error:', error);
    res.status(500).json({ success: false, message: 'Failed to create feed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /feed/:id  — delete a feed by ID
// ─────────────────────────────────────────────────────────────────────────────
const deleteFeed = async (req, res) => {
  try {
    const feed = await Feed.findByIdAndDelete(req.params.id);
    if (!feed) {
      return res.status(404).json({ success: false, message: 'Feed not found' });
    }

    // Invalidate cache
    await safeRedisDel(CACHE_KEY);

    // Notify clients in real time
    const io = getIO();
    if (io) {
      io.emit('delete_feed', { id: req.params.id });
    }

    return res.json({ success: true, message: 'Feed deleted' });
  } catch (error) {
    console.error('deleteFeed error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete feed' });
  }
};

module.exports = { getFeeds, createFeed, deleteFeed };
