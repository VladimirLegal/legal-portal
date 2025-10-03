const fs = require('fs');
const path = require('path');

const crypto = require('crypto');

const leaseTemplatePath = path.join(__dirname, '../templates/lease.html');

// читаем файл всегда свежим
function readLeaseTemplateFile() {
  return fs.readFileSync(leaseTemplatePath, 'utf8');
}

// актуальная информация по файлу шаблона (для логов/заголовков)
function getLeaseTemplateInfo() {
  const resolved = path.resolve(leaseTemplatePath);
  const stat = fs.statSync(resolved);
  const raw = fs.readFileSync(resolved, 'utf8');
  const md5 = crypto.createHash('md5').update(raw, 'utf8').digest('hex');
  return { path: resolved, mtime: stat.mtime.toISOString(), md5 };
}

// публичная функция: отдать свежий шаблон и залогировать инфо
function getFreshLeaseTemplate() {
  try {
    const html = readLeaseTemplateFile();
    const info = getLeaseTemplateInfo();
    console.log('🧩 lease.html path:', info.path);
    console.log('🕒 lease.html mtime:', info.mtime);
    console.log('🔑 lease.html md5 :', info.md5.slice(0, 12));
    return html;
  } catch (e) {
    console.error('[getFreshLeaseTemplate] read error:', e);
    return '';
  }
}

// для совместимости, если где-то ещё импортируется
const rawLeaseTemplate = ''; // НЕ используем статическую версию


/* ====================== Date and Sum Formatting ====================== */
function parseAnyDate(input) {
  if (!input) return null;
  const s = String(input).trim();
  // Try DD.MM.YYYY
  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) {
    const [ , dd, mm, yyyy ] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d) ? null : d;
  }
  // Try YYYY-MM-DD
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [ , yyyy, mm, dd ] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d) ? null : d;
  }
  // Fallback: pass to Date constructor
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function formatDateLong(input) {
  const d = parseAnyDate(input);
  if (!d) return '';
  const months = [
    'января','февраля','марта','апреля','мая','июня',
    'июля','августа','сентября','октября','ноября','декабря'
  ];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
}

function formatDateShort(input) {
  const d = parseAnyDate(input);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

// Convert a number to a spaced string (e.g., 100000 -> "100 000")
function formatSpaced(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  return Number(num).toLocaleString('ru-RU').replace(/\u00A0/g, ' ');
}
function pluralRu(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2]; // 11–19 → many
  if (b > 1 && b < 5)  return forms[1]; // 2,3,4 → few
  if (b === 1)         return forms[0]; // 1 → one
  return forms[2];                       // остальные → many
}

// Convert integer part of amount to Russian words (rubles only, no kopeks handling beyond "00 копеек")
function amountToWordsRu(n) {
  n = Math.floor(Number(n) || 0);
  const units = [
    ['рубль','рубля','рублей'],
    ['тысяча','тысячи','тысяч'],
    ['миллион','миллиона','миллионов'],
    ['миллиард','миллиарда','миллиардов']
  ];
  const onesMasculine = ['','один','два','три','четыре','пять','шесть','семь','восемь','девять'];
  const onesFeminine = ['','одна','две','три','четыре','пять','шесть','семь','восемь','девять'];
  const tens = ['','десять','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто'];
  const teens = ['десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать',
                 'шестнадцать','семнадцать','восемнадцать','девятнадцать'];
  const hundreds = ['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот'];

  function tripletToWords(triplet, feminine) {
    let str = '';
    const h = Math.floor(triplet / 100);
    const t = Math.floor((triplet % 100) / 10);
    const o = triplet % 10;
    if (h) str += (str ? ' ' : '') + hundreds[h];
    if (t > 1) {
      str += (str ? ' ' : '') + tens[t];
      if (o) str += ' ' + (feminine ? onesFeminine[o] : onesMasculine[o]);
    } else if (t === 1) {
      str += (str ? ' ' : '') + teens[o];
    } else if (o) {
      str += (str ? ' ' : '') + (feminine ? onesFeminine[o] : onesMasculine[o]);
    }
    return str;
  }
  function pluralForm(n, forms) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }

  if (n === 0) return 'Ноль рублей 00 копеек';

  const parts = [];
  let unitIndex = 0;
  while (n > 0 && unitIndex < units.length) {
    const triplet = n % 1000;
    if (triplet !== 0) {
      const feminine = (unitIndex === 1); // thousands are feminine in Russian
      const words = tripletToWords(triplet, feminine);
      const unitWord = pluralForm(triplet, units[unitIndex]);
      parts.unshift((words ? (words + ' ') : '') + unitWord);
    }
    n = Math.floor(n / 1000);
    unitIndex++;
  }
  const capitalized = parts.join(' ').replace(/^./, c => c.toUpperCase());
  return `${capitalized} 00 копеек`;
}

function pluralize(n, forms) {
  n = Math.abs(Number(n)) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

function formatAmountRu(amount) {
  if (amount == null || amount === '') return '';
  // парсим число: убираем пробелы и разрешаем запятую как разделитель
  const s = String(amount).replace(/\s/g, '').replace(',', '.');
  const num = Number(s);
  if (isNaN(num)) return String(amount);

  const rub = Math.trunc(num);
  const kop = Math.round((num - rub) * 100);
  const kop2 = String(isNaN(kop) ? 0 : kop).padStart(2, '0');

  const spacedRub = formatSpaced(rub);

  // amountToWordsRu(rub) даёт фразу вроде «Сорок тысяч рублей 00 копеек»
  // или «Сорок тысяч 00 копеек», если триплет рублей = 0.
  const wordsFull = amountToWordsRu(rub);
  // Оставляем только «Сорок тысяч» — срезаем «руб… 00 копеек» ИЛИ просто «00 копеек»
  const wordsOnly = String(wordsFull).replace(/\s*(?:руб(?:ль|ля|лей))?\s*00\s+копе(йка|йки|ек)$/i, '');

  const rubWord = pluralize(rub, ['рубль', 'рубля', 'рублей']);
  const kopWord = pluralize(kop2, ['копейка', 'копейки', 'копеек']);

  return `${spacedRub} (${wordsOnly}) ${rubWord} ${kop2} ${kopWord}`;
}



function asBool(val) {
  if (val === true || val === false) return val;
  if (val == null) return false;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    // Пустая строка, "false", "0", "no", "нет", "null", "undefined" -> false
    if (s === '' || s === 'false' || s === '0' || s === 'no' || s === 'нет' || s === 'null' || s === 'undefined') return false;
    return true;
  }
  return !!val;
}
// Разворачиваем data-repeat рекурсивно, с учётом контекста (ctx)
// ВАЖНО: сначала раскрываем вложенные repeat, потом подставляем плейсхолдеры текущего уровня,
// чтобы не затирать плейсхолдеры дочерних блоков пустыми значениями.
function expandRepeats(html, ctx, getBy) {
  if (!html) return html;
  const repeatRe = /<([a-z0-9-]+)([^>]*?)data-repeat="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/gsi;

  let out = String(html);
  let prev;
  do {
    prev = out;

    out = out.replace(repeatRe, (_m, tag, before, arrPath, after, innerTemplate) => {
      const raw = getBy(ctx, arrPath);
      // 1) Если в ЭТОМ контексте массива нет — не трогаем этот repeat (развернётся позже).
      if (!Array.isArray(raw)) {
        return _m;
      }

      const arr = raw;
      // 2) Если массив пуст — убираем блок
      if (arr.length === 0) return '';

      return arr.map((item) => {
        let chunk = innerTemplate;

        // 1) СНАЧАЛА раскрываем вложенные repeat относительно текущего item
        chunk = expandRepeats(chunk, item, getBy);

        // 2) Локальные условия (data-if) для текущего item
        chunk = applyDataIfAll(chunk, item, getBy);

        // 3) ТЕПЕРЬ подставляем плейсхолдеры текущего item
        // ph-chip — текст с форматами дат/сумм
        chunk = chunk.replace(
          /<span([^>]*?)class="([^"]*?\bph-chip\b[^"]*?)"([^>]*?)data-ph="([^"]+)"([^>]*)>(.*?)<\/span>/gsi,
          (_m2, b1, cls, b2, key, b3) => {
            let v = getBy(item, key);
            if (key.endsWith('AmountFormatted')) {
              const baseKey = key.replace(/Formatted$/, '');
              const baseVal = getBy(item, baseKey);
              v = baseVal != null ? formatAmountRu(baseVal) : '';
            } else if (/(\.|^)amount$/i.test(key)) {
              // Поддержка путей вида "something.amount" (в любом регистре)
              v = formatAmountRu(v);
            } else if (key.endsWith('Amount')) {
              v = formatAmountRu(v);
            } else if (key.endsWith('Date')) {
              // если ключ заканчивается на Date — форматируем длинной датой
              v = formatDateLong(v || getBy(item, key));
            }

            return `<span${b1}${b2}${b3}>${v ?? ''}</span>`;
          }
        );

        // ph-raw — «как есть» (но те же форматы для дат/сумм)
        chunk = chunk.replace(
          /<span([^>]*?)class="([^"]*?\bph-raw\b[^"]*?)"([^>]*?)data-ph="([^"]+)"([^>]*)>(.*?)<\/span>/gsi,
          (_m3, b1, cls, b2, key, b3) => {
            let v = getBy(item, key);

            if (key.endsWith('AmountFormatted')) {
              const baseKey = key.replace(/Formatted$/, '');
              const baseVal = getBy(item, baseKey);
              v = baseVal != null ? formatAmountRu(baseVal) : '';
            } else if (/(\.|^)amount$/i.test(key)) {
              v = formatAmountRu(v);
            } else if (key.endsWith('Amount')) {
              v = formatAmountRu(v);
            } else if (key.endsWith('Date')) {
              v = formatDateLong(v || getBy(item, key));
            }

            return `<span${b1}${b2}${b3}>${v ?? ''}</span>`;
          }
        );

        // 4) Замораживаем обработанный блок: убираем data-if, чтобы родители не "переоценивали" его
        chunk = chunk.replace(/\sdata-if="[^"]*"/g, '');

        // Корневой тег repeat превращаем в div для валидности HTML
        const outTag = (String(tag).toLowerCase() === 'repeat') ? 'div' : tag;
        return `<${outTag}${before}${after}>${chunk}</${outTag}>`;
      }).join('');
    });

  } while (out !== prev);

  return out;
}



function applyDataIfAll(html, ctx, getBy) {
  if (!html) return html;
  const ifRe = /<([a-z0-9-]+)([^>]*?)data-if="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/gsi;
  let out = String(html);
  let prev;
  do {
    prev = out;
    out = out.replace(ifRe, (_m, tag, before, expr, after, inner) => {
      let e = String(expr || '').trim();
      let negate = false;
      if (e.toLowerCase().startsWith('not:')) {
        negate = true;
        e = e.slice(4).trim();
      }
      const eq = e.match(/^([a-z0-9_.]+)\s*==\s*'([^']*)'$/i);
      let keep;
      if (eq) {
        const leftVal = getBy(ctx, eq[1]);
        keep = String(leftVal) === eq[2];
      } else {
        const val = getBy(ctx, e);
        keep = asBool(val);
      }
      if (negate) keep = !keep;
      return keep ? `<${tag}${before}${after}>${inner}</${tag}>` : '';
    });
  } while (out !== prev);
  return out;
}

/* ====================== Rendering Template with Data ====================== */
/**
 * Render the final HTML by substituting placeholders in the template HTML with data.
 * Supports:
 *  - <span data-ph="..."></span> placeholders (with class "ph-chip" or "ph-raw")
 *  - Conditional blocks via data-if (with optional "not:" prefix or == 'value' condition)
 *  - Repeating blocks via data-repeat for arrays
 * After substitution, all data-* attributes and placeholder classes are removed.
 */
function renderFinalHtml(html, data = {}) {
  let out = String(html || '');

  // Локальный геттер путей — нужен и для глобальных плейсхолдеров, и для expandRepeats/applyDataIfAll
  const getByPath = (obj, path) => {
    if (!obj) return '';
    const parts = String(path).split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return '';
      if (Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = cur[p];
      } else {
        return ''; // путь не найден — возвращаем пустую строку
      }
    }
    return (cur === undefined || cur === null) ? '' : cur;
  };

  // === 1) Разворачиваем ВСЕ data-repeat (рекурсивно, в нужном контексте) ===
  out = expandRepeats(out, data, getByPath);

  // === 2) Глобальная подстановка плейсхолдеров (<span class="ph-chip|ph-raw" data-ph="...">) ===
  // ph-chip — текст (с форматированием дат/сумм)
  out = out.replace(
    /<span([^>]*?)class="([^"]*?\bph-chip\b[^"]*?)"([^>]*?)data-ph="([^"]+)"([^>]*)>(.*?)<\/span>/gsi,
    (_m, before, cls, mid, key, after, innerText) => {
      let val = getByPath(data, key);

      if (key.endsWith('Date')) {
        val = formatDateLong(val || getByPath(data, key));
      } else if (key.endsWith('AmountFormatted')) {
        const baseKey = key.replace(/Formatted$/, '');
        const baseVal = getByPath(data, baseKey);
        val = baseVal != null ? formatAmountRu(baseVal) : '';
      } else if (/(\.|^)amount$/i.test(key)) {
        val = formatAmountRu(val);
      } else if (key.endsWith('Amount')) {
        val = formatAmountRu(val);
      }

      return `<span${before}class="${cls}"${mid}data-ph="${key}"${after}>${val ?? ''}</span>`;
    }
  );

  // ph-raw — «как есть» (с теми же форматами для дат/сумм)
  out = out.replace(
    /<span([^>]*?)class="([^"]*?\bph-raw\b[^"]*?)"([^>]*?)data-ph="([^"]+)"([^>]*)>(.*?)<\/span>/gsi,
    (_m, before, cls, mid, key, after, inner) => {
      let val = getByPath(data, key);

      if (key.endsWith('Date')) {
        val = formatDateLong(val || getByPath(data, key));
      } else if (key.endsWith('AmountFormatted')) {
        const baseKey = key.replace(/Formatted$/, '');
        const baseVal = getByPath(data, baseKey);
        val = baseVal != null ? formatAmountRu(baseVal) : '';
      } else if (/(\.|^)amount$/i.test(key)) {
        val = formatAmountRu(val);
      } else if (key.endsWith('Amount')) {
        val = formatAmountRu(val);
      }

      return `<span${before}class="${cls}"${mid}data-ph="${key}"${after}>${val ?? ''}</span>`;
    }
  );

  // === 3) Глобальные условия data-if (многошагово) ===
  out = applyDataIfAll(out, data, getByPath);

  // === 3.5) Safety: убрать любые неразвёрнутые repeat-блоки целиком ===
  out = out.replace(
    /<([a-z0-9-]+)([^>]*?)data-repeat="[^"]*"([^>]*)>([\s\S]*?)<\/\1>/gsi,
    ''
  );

  // === 4) Финальная очистка служебных атрибутов/классов ===
  out = out
    .replace(/\sdata-ph="[^"]*"/g, '')
    .replace(/\sdata-if="[^"]*"/g, '')
    .replace(/\sdata-repeat="[^"]*"/g, '')
    .replace(/\scontenteditable="[^"]*"/g, '')
    .replace(/\bph-chip\b/g, '')
    .replace(/\bph-raw\b/g, '');

  return out;
}


/* ====================== PDF Export via Puppeteer or PDF Library ====================== */
async function exportPdf(finalHtml) {
  if (!finalHtml || typeof finalHtml !== 'string') {
    throw new Error('exportPdf: empty finalHtml');
  }
  // Delegate actual PDF generation to pdfGenerator service
  const { exportHtmlToPdfBuffer } = require('./pdfGenerator');
  const pdfBuffer = await exportHtmlToPdfBuffer(finalHtml);
  if (!pdfBuffer || !pdfBuffer.length) {
    throw new Error('exportPdf: got empty PDF buffer from generator');
  }
  return pdfBuffer;
}

/* ====================== Versioning (Drafts) Stubs ====================== */
const _versionsStore = {};  // in-memory storage of document versions by id

async function saveDraft(docId, html, changeNote) {
  const id = String(docId);
  if (!_versionsStore[id]) _versionsStore[id] = [];
  const versionList = _versionsStore[id];
  const newVersionId = versionList.length + 1;
  const versionEntry = {
    versionId: newVersionId,
    createdAt: new Date().toLocaleString(),
    html: html || '',
    note: changeNote || ''
  };
  versionList.push(versionEntry);
  return versionEntry;
}

async function listVersions(docId) {
  const id = String(docId);
  return _versionsStore[id] || [];
}

async function getVersion(docId, versionId) {
  const id = String(docId);
  const vId = Number(versionId);
  const list = _versionsStore[id] || [];
  return list.find(v => v.versionId === vId) || null;
}

async function buildDiff(docId, fromId, toId) {
  // Not implemented: return empty diff
  return { html: '' };
}

function clearVersions(docId) {
  const id = String(docId);
  delete _versionsStore[id];
  return true;
}
// --- utils ---
function escapeHtmlUi(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function formatRubShortUi(v) {
  if (v == null || v === '') return '';
  const num = Number(String(v).replace(/\s+/g, '').replace(',', '.'));
  if (!isFinite(num)) return '';
  return num.toLocaleString('ru-RU') + ' руб.';
}

// --- Таблица «Описание квартиры» из массива apartmentDescription ---
function buildApartmentTableHtml(apartmentDescription = []) {
  const rows = (Array.isArray(apartmentDescription) ? apartmentDescription : []).map(r => {
    const name    = escapeHtmlUi(r?.name ?? '');
    const floor   = escapeHtmlUi(r?.floor ?? '');
    const walls   = escapeHtmlUi(r?.walls ?? '');
    const ceiling = escapeHtmlUi(r?.ceiling ?? '');
    const doors   = escapeHtmlUi(r?.doors ?? '');
    const windows = escapeHtmlUi(r?.windows ?? '');
    const state   = escapeHtmlUi(r?.state ?? '');
    return `
      <tr>
        <td>${name}</td>
        <td>${floor}</td>
        <td>${walls}</td>
        <td>${ceiling}</td>
        <td>${doors}</td>
        <td>${windows}</td>
        <td>${state}</td>
      </tr>`;
  }).join('');

  return `
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; width:100%;">
      <thead>
        <tr>
          <th>Помещение</th>
          <th>Пол</th>
          <th>Стены</th>
          <th>Потолок</th>
          <th>Двери</th>
          <th>Окна</th>
          <th>Состояние</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
}

// --- Таблица «Опись имущества» из массива inventory ---
/*
Ожидаем структуру:
inventory: [
  { id, name, base?:true, items: [{ name, state, price, note }] },
  ...
]
*/
function buildInventoryTableHtml(inventory = []) {
  const body = [];

  (Array.isArray(inventory) ? inventory : []).forEach(group => {
    const gName = escapeHtmlUi(group?.name ?? '');
    const items = Array.isArray(group?.items) ? group.items : [];

    if (gName) {
      body.push(`
        <tr>
          <td colspan="5" style="font-weight:bold; background:#f7f7f7;">${gName}</td>
        </tr>
      `);
    }

    if (items.length === 0) {
      // Пустая группа — покажем строку-заглушку (необязательно, можно удалить)
      // body.push(`<tr><td colspan="5" style="color:#888;">нет предметов</td></tr>`);
      return;
    }

    items.forEach(it => {
      const name  = escapeHtmlUi(it?.name ?? '');
      const state = escapeHtmlUi(it?.state ?? '');
      const note  = escapeHtmlUi(it?.note ?? '');
      const price = formatRubShortUi(it?.price ?? ''); // "1 000 руб."
      body.push(`
        <tr>
          <td>${gName ? name : escapeHtmlUi(name)}</td>
          <td>${state}</td>
          <td>${price}</td>
          <td>${note}</td>
        </tr>
      `);
    });
  });

  return `
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; width:100%;">
      <thead>
        <tr>
          <th>Помещение</th>
          <th>Состояние</th>
          <th>Оценочная стоимость</th>
          <th>Примечание</th>
        </tr>
      </thead>
      <tbody>
        ${body.join('')}
      </tbody>
    </table>`;
}

module.exports = {
  rawLeaseTemplate,
  renderFinalHtml,
  exportPdf,
  saveDraft,
  listVersions,
  getVersion,
  buildDiff,
  getFreshLeaseTemplate,
  clearVersions,
  getLeaseTemplateInfo,
  buildApartmentTableHtml,
  buildInventoryTableHtml,
};
