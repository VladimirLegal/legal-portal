// server/index.js
const express = require('express');
const app = express();
const PORT = 5000;

app.use(express.json());

// Тестовый маршрут
app.get('/api/test', (req, res) => {
  res.json({ message: "Сервер работает!" });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});