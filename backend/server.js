const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- Mongoose connection hardening ---------------------------------------
// ROOT CAUSE of the "1st request works, 2nd request loads forever" bug:
// mongoose's default is `bufferCommands: true` with NO cap on how long it
// will wait for the connection to come back before running a query. Atlas
// (especially the free/shared M0 tier) silently closes idle sockets after a
// few minutes of inactivity. The 1st request happens right after the app
// starts, while the socket is fresh, so it works. By the time you send the
// 2nd request, the socket has been dropped in the background — mongoose
// notices, tries to reconnect, and queues (buffers) your query while it
// does. With no timeout set, that queue never times out, so Express never
// calls res.json()/res.status() and the request just hangs -> the frontend
// spinner spins forever (axios had no timeout either, so it never errors
// out on its own).
// Fix: cap how long mongoose will buffer/wait, and how long the driver will
// wait to (re)select a server, so a broken connection surfaces as a fast,
// visible error instead of an infinite hang.
mongoose.set('bufferCommands', true);
mongoose.set('bufferTimeoutMS', 10000); // fail loudly after 10s instead of hanging forever

// --- Middleware -----------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Belt-and-suspenders: if any request (for any reason) still takes longer
// than 20s, respond with a clean error instead of leaving the connection
// (and the frontend's loading spinner) open indefinitely.
app.use((req, res, next) => {
  res.setTimeout(20000, () => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timed out — server/DB connection issue. Please retry.' });
    }
  });
  next();
});

// Routes
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/topics', require('./routes/topics'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/progress', require('./routes/progress'));

// Health check — also reports live DB connection state, so you can tell at
// a glance whether a hang is a Mongo issue vs. something else.
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    dbState: states[mongoose.connection.readyState] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Something went wrong!' });
  }
});

// MongoDB Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 10000, // fail fast if Atlas is unreachable, instead of hanging
  socketTimeoutMS: 20000,          // kill sockets stuck mid-operation
  connectTimeoutMS: 10000,         // fail fast if the initial data connection can't be made
  heartbeatFrequencyMS: 10000,     // notice a dropped connection quickly
  maxPoolSize: 10,
  minPoolSize: 0,                  // don't keep idle connections sitting around waiting to go stale
  maxIdleTimeMS: 8000,             // ROOT CAUSE FIX: logs show every hang happens right after a
                                    // ~10-13s gap of no requests. That means the user's router/NAT
                                    // is silently killing idle MongoDB sockets after ~10s (common on
                                    // some home/mobile networks), but mongoose's pool doesn't know
                                    // that and tries to reuse the (dead) socket -> the query goes
                                    // nowhere and hangs forever. Closing pooled connections after 8s
                                    // idle means the *next* query after any pause always opens a
                                    // fresh socket instead of reusing one the network may have
                                    // already silently dropped.
  family: 4                        // force IPv4 — some ISPs/networks silently blackhole IPv6
                                    // traffic to Atlas after the initial handshake, which looks
                                    // exactly like "connects fine, then every real query hangs forever"
})
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// Log (don't crash on) connection drops/reconnects so a stuck-forever
// request is visible in the server logs instead of being a silent mystery.
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected — mongoose will attempt to reconnect automatically.');
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected.');
});
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});
