require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db');
const routes = require('./routes');

// Initialize database schema and seeds
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from client/
app.use(express.static(path.resolve(__dirname, '../client')));

// Mount API routes
app.use('/api', routes);

// Fallback to index.html for SPA-like navigation
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏥 CareConnect AI Hospital System running on http://localhost:${PORT}`);
  console.log(`   Patient Portal:    http://localhost:${PORT}`);
  console.log(`   FrontDesk Admin:   http://localhost:${PORT} (Switch to FrontDesk Admin)`);
  console.log(`   API Endpoint:      http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
