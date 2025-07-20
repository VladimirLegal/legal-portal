const express = require('express');
const cors = require('cors');
const path = require('path');
const documentRoutes = require('./routes/documentRoutes'); // Убедитесь, что путь правильный

const app = express();

// Разрешаем CORS
app.use(cors());

// Для обработки JSON в запросах
app.use(express.json());

// Логгирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Подключаем роуты - ЭТА СТРОКА ДОЛЖНА БЫТЬ!
app.use('/api/documents', documentRoutes);

// Обработка статических файлов
const tempDir = path.join(__dirname, 'temp');
app.use('/temp', express.static(tempDir));

// Тестовый роут
app.get('/test-server', (req, res) => {
  res.send('Сервер работает!');
});

app.listen(5000, () => {
  console.log('Сервер запущен на порту 5000');
  console.log('Доступно по адресу: http://localhost:5000');
  
  // Проверка существования папки temp
  const fs = require('fs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('Создана папка temp:', tempDir);
  }
});