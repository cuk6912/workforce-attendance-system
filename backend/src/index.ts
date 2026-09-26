import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// Start the engine and connect to the database
const app = express();
const prisma = new PrismaClient();
const PORT = 5000;

// Tell the engine to accept JSON data and allow cross-origin requests
app.use(cors());
app.use(express.json());

// Create a simple test route
app.get('/', (req, res) => {
  res.send('Workforce Attendance System Backend is LIVE and RUNNING!');
});

// Turn on the server
app.listen(PORT, () => {
  console.log(`✅ Engine started successfully!`);
  console.log(`✅ Listening for connections on http://localhost:${PORT}`);
});