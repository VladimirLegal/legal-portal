// server/services/docxGenerator.js
const HTMLDocx = require('html-docx-js');
const { JSDOM } = require('jsdom');

function splitBrIntoParagraphs(container, document) {
  // Собираем новые <p>, разбивая по <br>
  const nodes = Array.from(container.childNodes);
  if (!nodes.length) return;

  let currentP = document.createElement('p');
  container.replaceChildren(); // очистим

  const pushCurrent = () => {
    if (!currentP) return;
    if (currentP.childNodes.length === 0) {
      // пуста строка -> всё равно абзац
      currentP.appendChild(document.createTextNode(''));
    }
    container.appendChild(currentP);
    currentP = document.createElement('p');
  };

  nodes.forEach(n => {
    if (n.nodeName === 'BR') {
      pushCurrent();
    } else {
      currentP.appendChild(n.cloneNode(true));
    }
  });
  pushCurrent();
}

function normalizeForDocx(html) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html || ''}</body></html>`);
  const doc = dom.window.document;

  // 0) Удалим лишние атрибуты редактора
  doc.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));

  // 1) Превратим одиночные текстовые DIV/SECTION в <p>
  Array.from(doc.querySelectorAll('div,section')).forEach(el => {
    if (el.tagName !== 'DIV' && el.tagName !== 'SECTION') return;

    // если внутри таблицы/списков/заголовков — не трогаем
    if (el.querySelector('table, thead, tbody, tr, td, th, ul, ol, h1, h2, h3, h4, h5, h6')) return;

    // если содержит <br> — сначала разрежем на <p> по <br>
    if (el.querySelector('br')) {
      splitBrIntoParagraphs(el, doc);
      return;
    }

    // если текст/inline — заменим на <p>
    const onlyInline = Array.from(el.childNodes).every(n => {
      if (n.nodeType === 3) return true; // текст
      if (n.nodeType === 1) {
        const tag = n.tagName.toLowerCase();
        return ['span','b','strong','i','em','u','s','sup','sub','a'].includes(tag);
      }
      return false;
    });
    if (onlyInline) {
      const p = doc.createElement('p');
      p.innerHTML = el.innerHTML;
      el.replaceWith(p);
    }
  });

  // 2) В корневом body: если есть <br> на верхнем уровне — разрежем в абзацы
  if (doc.body.querySelector(':scope > br')) {
    splitBrIntoParagraphs(doc.body, doc);
  }

  // 3) Заголовки — центр и жирный (инлайн + align)
  Array.from(doc.querySelectorAll('h1,h2')).forEach(h => {
    const prev = h.getAttribute('style') || '';
    h.setAttribute(
      'style',
      `${prev};text-align:center;font-weight:bold;margin:8pt 0 6pt 0;`.replace(/;;+/g,';')
    );
    h.setAttribute('align', 'center');
  });

  // 4) Абзацы — justify + шрифт/кегль/интерлиньяж/отступ (ИНЛАЙН + align)
  Array.from(doc.querySelectorAll('p')).forEach(p => {
    const prev = p.getAttribute('style') || '';
    p.setAttribute(
      'style',
      `${prev};text-align:justify;font-family:'Times New Roman', Times, serif;font-size:12pt;line-height:1;margin:6pt 0;`.replace(/;;+/g,';')
    );
    p.setAttribute('align', 'justify');
  });

  // 5) Списки — шрифт/кегль
  Array.from(doc.querySelectorAll('ul,ol,li')).forEach(el => {
    const prev = el.getAttribute('style') || '';
    el.setAttribute(
      'style',
      `${prev};font-family:'Times New Roman', Times, serif;font-size:12pt;line-height:1;`.replace(/;;+/g,';')
    );
  });

  // 6) Таблицы — базово
  Array.from(doc.querySelectorAll('table')).forEach(t => {
    const prev = t.getAttribute('style') || '';
    t.setAttribute(
      'style',
      `${prev};border-collapse:collapse;font-family:'Times New Roman', Times, serif;font-size:12pt;`.replace(/;;+/g,';')
    );
  });
  Array.from(doc.querySelectorAll('td,th')).forEach(c => {
    const prev = c.getAttribute('style') || '';
    c.setAttribute(
      'style',
      `${prev};border:1px solid #000;padding:3pt 4pt;`.replace(/;;+/g,';')
    );
  });
  
  // DEBUG: посчитаем параграфы/заголовки после нормализации
  const pCount  = doc.querySelectorAll('p').length;
  const hCount  = doc.querySelectorAll('h1, h2').length;
  console.log(`[DOCX normalize] p:${pCount} h:${hCount}`);

  return doc.body.innerHTML;
}

function wrapHtmlForDocx(html) {
  const bodyMatch = String(html || '').match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = bodyMatch ? bodyMatch[1] : String(html || '');
  const normalized = normalizeForDocx(bodyInner);

  const page = `
    <div style="
      box-sizing:border-box;
      padding:2cm 1.5cm 2cm 3cm; /* поля: верх, право, низ, лево */
      font-family:'Times New Roman', Times, serif;
      font-size:12pt;
      line-height:1;
      color:#000;
      text-align:justify;
    ">
      ${normalized}
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>
<body>${page}</body>
</html>`;
}

async function exportHtmlToDocxBuffer(html) {
  const wrapped = wrapHtmlForDocx(html);
  const blobOrBuffer = HTMLDocx.asBlob(wrapped);

  if (Buffer.isBuffer(blobOrBuffer)) return blobOrBuffer;
  if (blobOrBuffer && typeof blobOrBuffer.arrayBuffer === 'function') {
    const ab = await blobOrBuffer.arrayBuffer();
    return Buffer.from(new Uint8Array(ab));
  }
  if (blobOrBuffer instanceof Uint8Array) return Buffer.from(blobOrBuffer);
  return Buffer.from(String(blobOrBuffer ?? ''), 'binary');
}

module.exports = { exportHtmlToDocxBuffer };
