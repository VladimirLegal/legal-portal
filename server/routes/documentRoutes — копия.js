// c:\legal-portal\server\routes\documentRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// PDF сервисы
// В pdfGenerator.js у нас есть generateSimplePDF (у тебя уже был) и exportHtmlToPdfBuffer (мы добавили)
const { generateSimplePDF, exportHtmlToPdfBuffer } = require('../services/pdfGenerator');

// Документ-сервисы (версии, дифф, экспорт)
const { saveDraft, listVersions, getVersion, buildDiff, exportPdf } = require('../services/documentService');

// ----------------------------
// ТЕСТОВЫЙ ЭНДПОИНТ PDF (как у тебя)
// ----------------------------
router.get('/test', async (req, res) => {
  try {
    const pdfBuffer = await generateSimplePDF({
      type: "Тестовый договор",
      propertyType: "Тестовая недвижимость",
      ownerName: "Тестовый собственник"
    });

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Сгенерирован пустой PDF-буфер');
    }

    console.log(`Размер PDF-буфера: ${pdfBuffer.length} байт`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=test.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF test error:', error);
    res.status(500).json({
      error: 'Test failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ----------------------------
// Папка для временных файлов
// ----------------------------
const tempDir = path.join(__dirname, '../../server/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// ----------------------------
// ГЕНЕРАЦИЯ PDF (как у тебя)
// ----------------------------
router.post('/generate', async (req, res) => {
  const { documentType, propertyType, ownerName } = req.body;

  try {
    if (!documentType || !propertyType) {
      throw new Error('Не указан тип документа или недвижимости');
    }

    const pdfBuffer = await generateSimplePDF({
      type: documentType,
      propertyType,
      ownerName
    });

    const filename = `document_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, filename);

    fs.writeFileSync(filePath, pdfBuffer);

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

// ----------------------------
// СОХРАНЕНИЕ ДОКУМЕНТА (как у тебя, заглушка)
// ----------------------------
router.post('/save', (req, res) => {
  const { content, formData } = req.body;
  // TODO: логика сохранения в БД
  res.status(200).json({ success: true, message: 'Документ сохранен' });
});

// ===================================================================
// НОВЫЕ ЭНДПОИНТЫ ДЛЯ ВЕРСИЙ / ДИФФА / ЭКСПОРТА HTML->PDF (CKEditor‑MVP)
// ===================================================================

// Список версий документа
router.get('/docs/:id/versions', async (req, res) => {
  const list = await listVersions(req.params.id);
  res.json(list);
});

// Сохранить новую версию (черновик)
router.post('/docs/:id/drafts', async (req, res) => {
  const { html, changeNote } = req.body || {};
  const v = await saveDraft(req.params.id, html || '', changeNote || '');
  res.json(v);
});

// Построить дифф между двумя версиями
router.get('/docs/:id/diff', async (req, res) => {
  const { from, to } = req.query;
  const html = await buildDiff(req.params.id, from, to);
  res.json({ html });
});

// Экспорт текущего HTML в PDF (HTML приходит в body)
// Экспорт текущего HTML в PDF (устойчиво для Buffer/Uint8Array)
router.post('/docs/:id/export/pdf', async (req, res) => {
  try {
    const { html } = req.body || {};
    const raw = await exportPdf(req.params.id, html || '');

    // Приведём к Buffer на всякий случай
    let buffer;
    if (Buffer.isBuffer(raw)) {
      buffer = raw;
    } else if (raw instanceof Uint8Array) {
      buffer = Buffer.from(raw);
    } else if (raw && raw.arrayBuffer) {
      const ab = await raw.arrayBuffer();
      buffer = Buffer.from(new Uint8Array(ab));
    } else {
      throw new Error('PDF generator returned unsupported type');
    }

    if (buffer.length < 1000) {
      throw new Error(`PDF buffer too small (${buffer.length} bytes)`);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="agreement.pdf"');
    res.send(buffer);
  } catch (e) {
    console.error('PDF export error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});


// Экспорт текущего HTML в DOCX (Word)
router.post('/docs/:id/export/docx', async (req, res) => {
  try {
    const { html } = req.body || {};
    const { JSDOM } = require('jsdom');
    const createDOMPurify = require('dompurify');
    const window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);

    const clean = DOMPurify.sanitize(html || '', {
      ALLOWED_TAGS: false,
      FORBID_TAGS: ['script'],
      ALLOWED_ATTR: ['class','style','data-ph','href','colspan','rowspan','contenteditable']
    });

    const { exportHtmlToDocxBuffer } = require('../services/docxGenerator');
    const buffer = await exportHtmlToDocxBuffer(clean);

    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="agreement.docx"');
    res.send(buffer);
  } catch (e) {
    console.error('DOCX export error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});



module.exports = router;
