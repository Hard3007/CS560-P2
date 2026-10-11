import { MongoClient } from 'mongodb';
import { config } from '../config.js';

let client;
let database;

export async function connectDatabase() {
  if (!config.mongoUri) {
    if (config.requireDatabase) {
      throw new Error('MONGODB_URI is required in production.');
    }
    return;
  }

  client = new MongoClient(config.mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 5000,
    maxPoolSize: 5,
  });
  try {
    await client.connect();
    database = client.db(config.mongoDb);
    await database.command({ ping: 1 }, { timeoutMS: 5000 });
  } catch {
    await closeDatabase();
    // Driver errors may contain connection credentials; keep logs generic.
    throw new Error(
      'MongoDB connection failed. Check the Railway service and variables.',
    );
  }
}

export async function checkDatabase() {
  if (!database) return 'not_configured';
  await database.command({ ping: 1 }, { timeoutMS: 5000 });
  return 'connected';
}

export function getDatabase() {
  if (!database) throw new Error('MongoDB is not connected.');
  return database;
}

export async function closeDatabase() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
}
