const express = require('express');
const router = express.Router();
const { generateSimplePDF } = require('../services/pdfGenerator');
const fs = require('fs');
const path = require('path');

router.get('/test', async (req, res) => {
  try {
    const { generateSimplePDF } = require('../services/pdfGenerator');
    const pdfBuffer = await generateSimplePDF({
      type: "Тестовый договор",
      propertyType: "Тестовая недвижимость",
      ownerName: "Тестовый собственник"
    });
    
    // Проверка буфера
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Сгенерирован пустой PDF-буфер');
    }
    
    // Логирование размера буфера
    console.log(`Размер PDF-буфера: ${pdfBuffer.length} байт`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=test.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF test error:', error);
    
    // Форматированный вывод ошибки
    res.status(500).json({ 
      error: 'Test failed', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// Путь к папке temp внутри server
const tempDir = path.join(__dirname, '../../server/temp');

// Создаем папку, если ее нет
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

router.post('/generate', async (req, res) => {
  const { documentType, propertyType, ownerName } = req.body;
  
  try {
    // Проверка обязательных полей
    if (!documentType || !propertyType) {
      throw new Error('Не указан тип документа или недвижимости');
    }

    // Генерация PDF
    const pdfBuffer = await generateSimplePDF({
      type: documentType,
      propertyType,
      ownerName
    });
    
    // Генерируем уникальное имя файла
    const filename = `document_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, filename);

    // Сохраняем файл на сервере
    fs.writeFileSync(filePath, pdfBuffer);
    
    // Отправляем клиенту URL для скачивания
    res.json({ 
      success: true,
      downloadUrl: `/temp/${filename}`
    });
    
  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка генерации документа',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;