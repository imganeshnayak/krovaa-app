require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'krovaa-backend',
    status: 'running',
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
