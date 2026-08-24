/**
 * config/database.js
 * ------------------------------------------------------------------
 * MongoDB Atlas connection via Mongoose.
 *
 * A single connection (with Mongoose's built-in connection pool) is
 * created once and reused for the lifetime of the process — routes
 * must never call mongoose.connect() themselves.
 * ------------------------------------------------------------------
 */
const mongoose = require('mongoose');

let connectPromise = null;

function connectDB() {
  if (connectPromise) return connectPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to backend/.env (see .env.example).');
  }

  mongoose.set('strictQuery', true);

  connectPromise = mongoose
    .connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
    })
    .then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    })
    .catch((err) => {
      connectPromise = null;
      console.error('MongoDB connection error:', err.message);
      throw err;
    });

  return connectPromise;
}

function dbState() {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDB, dbState, mongoose };
