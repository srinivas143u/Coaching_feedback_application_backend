# 📡 CoachFeed Backend — API & Real-time Server Documentation

This is the backend server for the **CoachFeed** application, built using **Node.js, Express, MongoDB, Redis, and Socket.IO**.

---

## 🛠️ Tech Stack & Architecture

- **Runtime:** Node.js (CommonJS)
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose ODM)
- **Caching:** Redis (via `ioredis` with automatic graceful offline fallback)
- **Real-Time Communications:** Socket.IO

---

## 🚀 Getting Started

### 1. Requirements
Ensure you have the following installed and running locally:
- **Node.js** (v18+)
- **MongoDB** (running on port `27017`)
- **Redis Server** (running on port `6379`, optional but recommended)

### 2. Environment Setup
Create a `.env` file in the root of the `coaching_feed_backend` directory (one is already prepared for you):
```ini
PORT=5000
MONGO_URI=mongodb://localhost:27017/coaching_feed
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_CACHE_TTL=60
CLIENT_URL=http://localhost:3000
```

### 3. Installation & Run
```bash
# Install dependencies
npm install

# Start the dev server with hot-reload (nodemon)
npm run dev

# Start in production mode
npm start
```
The server will boot up at **`http://localhost:5000`**.

---

## 📡 API Endpoints

All routes are prefixed with `/api`.

### 1. `GET /api/feed`
Fetches all published coaching feeds. 

* **Caching Behavior:** Checks Redis cache (`coaching:feeds`) first.
  - **Cache HIT:** Returns cached data immediately (tagged with `"source": "cache"`).
  - **Cache MISS:** Queries MongoDB, updates Redis cache with a 60s TTL, and returns the data (tagged with `"source": "database"`).
* **Response:** `200 OK`
```json
{
  "success": true,
  "source": "cache",
  "data": [
    {
      "_id": "6649f8e4c76b92f75a7c2e3d",
      "title": "5 Recovery Rules",
      "content": "Make sure to sleep 8 hours every night...",
      "category": "recovery",
      "author": "Coach Dan",
      "tags": ["sleep", "recovery"],
      "imageUrl": null,
      "likes": 0,
      "isPublished": true,
      "createdAt": "2026-05-19T03:40:00.000Z",
      "updatedAt": "2026-05-19T03:40:00.000Z"
    }
  ]
}
```

### 2. `POST /api/feed`
Publishes a new coaching feed. Automatically invalidates the Redis cache and broadcasts the new item to all connected Socket.IO clients.

* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Post-Workout Nutrition",
  "content": "Consume 30g of fast-digesting protein within 45 minutes of training.",
  "category": "nutrition",
  "author": "Coach Sarah",
  "tags": ["protein", "postworkout"],
  "imageUrl": null
}
```
* **Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "6649f8e4c76b92f75a7c2e4a",
    "title": "Post-Workout Nutrition",
    "content": "Consume 30g of fast-digesting protein within 45 minutes of training.",
    ...
  }
}
```

### 3. `DELETE /api/feed/:id`
Deletes a specific coaching feed, invalidates the cache, and notifies all connected clients in real time.
* **Response:** `200 OK`
```json
{
  "success": true,
  "message": "Feed deleted"
}
```

### 4. `GET /health`
System health check endpoint.
* **Response:** `200 OK`
```json
{
  "status": "OK",
  "message": "Coaching Feed API is running",
  "timestamp": "2026-05-19T03:45:00.000Z"
}
```

---

## ⚡ Socket.IO Real-time Events

The Socket.IO server operates on the main HTTP port (`http://localhost:5000`).

### Outbound Events (Server -> Client)
1. **`new_feed`**: Sent when a new feed is created. Carries the complete feed object.
2. **`delete_feed`**: Sent when a feed is deleted. Carries the feed ID: `{ id: "..." }`.

### Inbound Events (Client -> Server)
- **`ack_new_feed`**: Emitted by clients after successfully processing a new feed event to confirm receipt and prevent duplicate event execution: `{ feedId: "..." }`.
