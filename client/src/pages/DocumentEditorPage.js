import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { Editor } from '@tiptap/react'
import StarterKit from "@tiptap/starter-kit";

// ↓↓↓ ДОБАВИТЬ вот это:
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import { Extension } from '@tiptap/core';


// таблицы — СНАЧАЛА импорт, ПОТОМ расширения на их основе
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
// тулбар (иконки)
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold,
  faItalic,
  faUnderline,
  faListUl,
  faListOl,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify,
  faUndo,
  faRedo,
  faPlay,
  faSave,
  faFilePdf,
  faUndoAlt,
  faFileWord,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';

const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: el => el.getAttribute('class'),
        renderHTML: attrs => attrs.class ? { class: attrs.class } : {}
      },
      style: {
        default: null,
        parseHTML: el => el.getAttribute('style'),
        renderHTML: attrs => attrs.style ? { style: attrs.style } : {}
      },
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: el => el.getAttribute('class'),
        renderHTML: attrs => attrs.class ? { class: attrs.class } : {}
      },
      style: {
        default: null,
        parseHTML: el => el.getAttribute('style'),
        renderHTML: attrs => attrs.style ? { style: attrs.style } : {}
      },
    };
  },
});

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: el => el.getAttribute('class'),
        renderHTML: attrs => attrs.class ? { class: attrs.class } : {}
      },
      style: {
        default: null,
        parseHTML: el => el.getAttribute('style'),
        renderHTML: attrs => attrs.style ? { style: attrs.style } : {}
      },
    };
  },
});

// Разрешаем class / style / data-hint на параграфах и заголовках
const GlobalAttrs = Extension.create({
  name: 'globalAttrsForHints',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          class: {
            default: null,
            parseHTML: el => el.getAttribute('class'),
            renderHTML: attrs => attrs.class ? { class: attrs.class } : {},
          },
          style: {
            default: null,
            parseHTML: el => el.getAttribute('style'),
            renderHTML: attrs => attrs.style ? { style: attrs.style } : {},
          },
          'data-hint': {
            default: null,
            parseHTML: el => el.getAttribute('data-hint'),
            renderHTML: attrs =>
              attrs['data-hint'] ? { 'data-hint': attrs['data-hint'] } : {},
          },
        },
      },
    ];
  },
});


const TEMPLATE_URL = "/api/docs/1/editor?fresh=1";


// Wrap naked {{ placeholders }} with non-editable chips for display
function wrapPlaceholdersWithChips(html) {
  return html.replace(/{{\s*([\w.]+)\s*}}/g, (_m, key) =>
    `<span class="ph-chip" data-ph="${key}" contenteditable="false">{{${key}}}</span>`
  );
}

// Try to load formData from storage (sessionStorage or localStorage)
async function loadFormDataFallback() {
  try {
    const s = window.sessionStorage.getItem("leaseFormData");
    if (s) return JSON.parse(s);
  } catch {}
  try {
    const l = window.localStorage.getItem("leaseFormData");
    if (l) return JSON.parse(l);
  } catch {}
  try {
    // check old key (for backward compatibility)
    const old = window.localStorage.getItem("formData");
    if (old) return JSON.parse(old);
  } catch {}
  return {};
}

export default function DocumentEditorPage() {
  const navigate = useNavigate();
  const [html, setHtml] = useState("");              // current editor HTML content
  const [formData, setFormData] = useState(null);    // form data object from wizard
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState([]);
  const [selectedFrom, setSelectedFrom] = useState(null);
  const [selectedTo, setSelectedTo] = useState(null);
  const [diffHtml, setDiffHtml] = useState("")
  const [autoRendered, setAutoRendered] = useState(false);

  // Load template and formData on mount
  useEffect(() => {
    (async () => {
      try {
        const tplText = await (await fetch(TEMPLATE_URL)).text();
        const tplWrapped = wrapPlaceholdersWithChips(tplText);
        // If we have saved edited HTML in localStorage, restore it; otherwise use template
        setHtml(tplWrapped);
      } catch (e) {
        console.error("Load template error:", e);
      }
      try {
        const fd = await loadFormDataFallback();
        setFormData(fd);
        if (fd && Object.keys(fd).length === 0) {
          console.warn("Form data not found. The document will have empty placeholders.");
        }
      } catch (e) {
        console.error("Load formData error:", e);
        setFormData({});
      }
      try {
        const versionsList = await (await fetch(`/api/docs/1/versions`)).json();
        setVersions(Array.isArray(versionsList) ? versionsList : []);
      } catch (e) {
        console.error("Failed to load versions list:", e);
      }
    })();
  }, []);
  
  // Initialize Tiptap editor with needed extensions and content
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],   // на что действует
      }),
      CustomTable.configure({ resizable: true }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
      GlobalAttrs,
    ],

    content: html,  // initial content
    onUpdate: ({ editor }) => {
      // Update html state when editor content changes
      setHtml(editor.getHTML());
    }
  });
  // Автоприменение данных при первом входе
  useEffect(() => {
    if (autoRendered) return;                              // уже применяли — выходим
    if (!editor) return;                                   // ждём инициализации редактора
    if (!formData || Object.keys(formData).length === 0) { // нет данных — не жмём
      return;
    }
    (async () => {
      try {
        await restoreFromTemplate(1);                      // подставляем данные в шаблон
      } catch (e) {
        console.warn('[auto-render] restoreFromTemplate failed, fallback to handleRenderServer', e);
        try {
          handleRenderServer();                            // пробуем рендер текущего HTML
        } catch (e2) {
          console.error('[auto-render] handleRenderServer failed', e2);
        }
      } finally {
        setAutoRendered(true);                             // больше не запускать
      }
    })();
  }, [editor, formData, autoRendered]);

  // 🔹 Делегат для вашей кнопки/восстановления
  function setEditorContent(html) {
    if (editor) {
      editor.commands.setContent(html); // вторым параметром отключаем нормализацию, если не нужна
    }
  }
  // ВСТАВИТЬ ПОСЛЕ функции setEditorContent(html)
  // ВСТАВИТЬ СРАЗУ ПОСЛЕ setEditorContent(...)
  function injectRawTablesFromFormData() {
    try {
      const root = document.querySelector('.ProseMirror');
      if (!root || !formData) {
        console.log('[inject] нет root или formData');
        return;
      }

      const invHtml = formData?.terms?.inventoryHtml || '';
      const aptHtml = formData?.terms?.apartmentHtml || '';

      let didInv = false, didApt = false;

      // 1) Пытаемся вставить в слоты (если есть)
      const invSlot = root.querySelector('.app-table-wrap[data-slot="inventoryHtml"]');
      const aptSlot = root.querySelector('.app-table-wrap[data-slot="apartmentHtml"]');

      if (invSlot && invHtml) {
        invSlot.innerHTML = invHtml;
        didInv = true;
      }
      if (aptSlot && aptHtml) {
        aptSlot.innerHTML = aptHtml;
        didApt = true;
      }

      // 2) Фолбэк: если слотов нет — вставляем прямо ПОСЛЕ <h2> с нужным текстом
      if (!didInv && invHtml) {
        const h2s = Array.from(root.querySelectorAll('h2, h2 *')).map(n => n.closest('h2')).filter(Boolean);
        const h2Inv = h2s.find(h =>
          /Приложение\s*№\s*1/i.test(h.textContent || '') &&
          /Опись\s+имущества/i.test(h.textContent || '')
        );
        if (h2Inv) {
          const wrap = document.createElement('div');
          wrap.className = 'app-table-wrap';
          wrap.setAttribute('data-fallback', 'inventoryHtml');
          wrap.setAttribute('contenteditable', 'false');
          wrap.innerHTML = invHtml;
          h2Inv.insertAdjacentElement('afterend', wrap);
          didInv = true;
        }
      }

      if (!didApt && aptHtml) {
        const h2s = Array.from(root.querySelectorAll('h2, h2 *')).map(n => n.closest('h2')).filter(Boolean);
        const h2Apt = h2s.find(h =>
          /Приложение\s*№\s*2/i.test(h.textContent || '') &&
          /Описание\s+квартиры/i.test(h.textContent || '')
        );
        if (h2Apt) {
          const wrap = document.createElement('div');
          wrap.className = 'app-table-wrap';
          wrap.setAttribute('data-fallback', 'apartmentHtml');
          wrap.setAttribute('contenteditable', 'false');
          wrap.innerHTML = aptHtml;
          h2Apt.insertAdjacentElement('afterend', wrap);
          didApt = true;
        }
      }

      console.log('[inject] slots:', { invSlot: !!invSlot, aptSlot: !!aptSlot, didInv, didApt });
    } catch (e) {
      console.warn('injectRawTablesFromFormData failed', e);
    }
  }

  // маленькая обёртка — запустить инъекцию после того, как TipTap дорендерит DOM
  function scheduleInjectTables() {
    setTimeout(() => injectRawTablesFromFormData(), 0);
  }

  // (не обязательно, но удобно для ручной проверки из консоли)
  window.injectRawTablesFromFormData = injectRawTablesFromFormData;


  // (необязательно) Временно пробросим в window для простого вызова извне:
  window.setEditorContent = setEditorContent;

  // If template loaded after editor initialized, update the editor content
  useEffect(() => {
    if (editor && html && editor.getHTML() !== html) {
      editor.commands.setContent(html);
      scheduleInjectTables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, editor]);


  // Save current edits to localStorage on each change (for restore on reload)
  useEffect(() => {
    if (html) {
      window.localStorage.setItem("leaseDocumentHtml", html);
    }
  }, [html]);
  // НОВЫЙ ЭФФЕКТ: при первой загрузке formData подложить таблицы в слоты
  useEffect(() => {
    if (editor && formData) {
      scheduleInjectTables();
    }
  }, [editor, formData]);



  // Навесим классы на две целевые таблицы по их заголовкам
  function markTablesForStyling() {
    const root = document.querySelector('.ProseMirror');
    if (!root) return;

    const tables = Array.from(root.querySelectorAll('table'));
    tables.forEach(tbl => {
      const text = (tbl.textContent || '').replace(/\s+/g, ' ');

      // Опись имущества (есть "Оценочная стоимость" и "Примечание")
      if (/Оценочная стоимость/.test(text) && /Примечание/.test(text)) {
        tbl.classList.add('inventory-table');
        tbl.setAttribute('contenteditable', 'false');
      }

      // Описание квартиры (есть Пол/Стены/Потолок/Двери/Окна)
      if (/Пол/.test(text) && /Стены/.test(text) && /Потолок/.test(text) && /Двери/.test(text) && /Окна/.test(text)) {
        tbl.classList.add('apartment-table');
        tbl.setAttribute('contenteditable', 'false');
      }
    });
  }

  // Server-side render: substitute formData into placeholders
  async function handleRenderServer() {
    if (!editor) return;
    try {
      // 1) берём свежий шаблон, чтобы гарантированно были data-if/data-repeat
      const templateHtml = await fetch(TEMPLATE_URL).then(r => r.text());

      // 2) рендерим на сервере
      const res = await fetch("/api/docs/1/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: templateHtml, data: formData })
      });
      if (!res.ok) throw new Error(await res.text());
      const { ok, html: finalHtml, error } = await res.json();
      if (!ok || !finalHtml) throw new Error(error || "Empty finalHtml");

      // 3) подставляем результат
      console.log('[handleRenderServer] finalHtml len:', finalHtml.length);
      console.log(finalHtml.slice(0,600))
      console.log('has inventory-table:', /<table[^>]+class="[^"]*inventory-table/i.test(finalHtml));
      console.log('has app-table-wrap:', /class="app-table-wrap"/i.test(finalHtml));
      // ВКЛЕИВАЕМ таблицы в HTML ДО setContent
      const inv = formData?.terms?.inventoryHtml || '';
      const apt = formData?.terms?.apartmentHtml || '';
      let htmlWithTables = finalHtml;

      // подменяем слоты (которые есть в шаблоне)
      htmlWithTables = htmlWithTables.replace(
        /<div class="app-table-wrap"[^>]*data-slot="inventoryHtml"[^>]*><\/div>/i,
        `<div class="app-table-wrap" data-slot="inventoryHtml">${inv}</div>`
      );
      htmlWithTables = htmlWithTables.replace(
        /<div class="app-table-wrap"[^>]*data-slot="apartmentHtml"[^>]*><\/div>/i,
        `<div class="app-table-wrap" data-slot="apartmentHtml">${apt}</div>`
      );

      // теперь это и отдаём редактору — TipTap сам распарсит как таблицу
      editor.commands.setContent(htmlWithTables);

      scheduleInjectTables();

      // ВСТАВИТЬ СРАЗУ ПОСЛЕ
      setTimeout(() => {
        injectRawTablesFromFormData();
      }, 0);
    } catch (e) {
      console.error("Render error:", e);
      alert("Не удалось сгенерировать документ (подставить данные). См. консоль.");
    }
  }
  
  // Save the current document version (draft)
  async function handleSaveVersion() {
    if (!editor) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/docs/1/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: editor.getHTML(), changeNote: "Редакция" })
      });
      if (!res.ok) throw new Error("Save failed");
      const savedVersion = await res.json();
      // Reload versions list
      const list = await (await fetch(`/api/docs/1/versions`)).json();
      setVersions(Array.isArray(list) ? list : []);
      alert(`Версия сохранена: ${savedVersion.versionId}`);
    } catch (e) {
      console.error("Save version error:", e);
      alert("Не удалось сохранить версию");
    } finally {
      setSaving(false);
    }
  }

  // Build diff between two selected versions
  async function handleBuildDiff() {
    if (!selectedFrom || !selectedTo) {
      alert("Выберите две версии для сравнения");
      return;
    }
    try {
      const res = await fetch(`/api/docs/1/diff?from=${selectedFrom}&to=${selectedTo}`);
      const { html: diff } = await res.json();
      setDiffHtml(diff || "");
    } catch (e) {
      console.error("Diff error:", e);
      alert("Не удалось построить сравнении версий");
    }
  }

  // Export PDF: send current HTML and formData to server, open PDF in new tab
  async function handlePreviewPdf() {
    if (!editor) return;
    try {
      const payload = { html: editor.getHTML(), data: formData };
      const res = await fetch(`/api/docs/1/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      // Open PDF in a new browser tab for preview
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      // Note: content-disposition attachment will prompt download if opened directly
    } catch (e) {
      console.error("PDF export error:", e);
      alert("Ошибка экспорта PDF. См. консоль.");
    }
  }

  // Export DOCX: send current HTML and formData to server, trigger file download
  async function handleDownloadDocx() {
    if (!editor) return;
    try {
      const payload = { html: editor.getHTML(), data: formData };
      const res = await fetch(`/api/docs/1/export/docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      // Trigger download of the DOCX file
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "lease.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("DOCX export error:", e);
      alert("Ошибка экспорта DOCX. См. консоль.");
    }
  }
  async function restoreFromTemplate(docId = 1) {
    // если onClick передал событие — подменяем на 1
    if (typeof docId === 'object' && docId !== null) docId = 1;

    // 1) свежий шаблон
    const templateHtml = await fetch(`/api/docs/${docId}/editor?fresh=1`).then(r => r.text());

    // 2) рендер на сервере
    const payload = { html: templateHtml, data: formData };
    const rendered = await fetch(`/api/docs/${docId}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    // 3) подставляем именно finalHtml (сервер уже обработал data-if/data-repeat)
    if (rendered && rendered.ok && rendered.html) {
      console.log('[restoreFromTemplate] finalHtml len:', rendered.html.length);
      const inv = formData?.terms?.inventoryHtml || '';
      const apt = formData?.terms?.apartmentHtml || '';
      // 1) пробуем подменить слоты целиком
      let htmlWithTables = rendered.html
        .replace(
          /<div class="app-table-wrap"[^>]*data-slot="inventoryHtml"[^>]*><\/div>/i,
          `<div class="app-table-wrap" data-slot="inventoryHtml">${inv}</div>`
        )
        .replace(
          /<div class="app-table-wrap"[^>]*data-slot="apartmentHtml"[^>]*><\/div>/i,
          `<div class="app-table-wrap" data-slot="apartmentHtml">${apt}</div>`
        );
      // 2) если слотов нет — вставим сразу после H2 соответствующего приложения
      if (!/data-slot="inventoryHtml"/i.test(rendered.html) && inv) {
        htmlWithTables = htmlWithTables.replace(
          /(>Приложение\s*№\s*1[^<]*<\/h2>)/i,
          `$1<div class="app-table-wrap" data-fallback="inventoryHtml">${inv}</div>`
        );
      }
      // 3) Отдаём в редактор уже с таблицами
      setEditorContent(htmlWithTables);
      // подстраховка: навесим классы, если вдруг теряются
      setTimeout(() => {
        try {
          const root = document.querySelector('.ProseMirror');
          root?.querySelectorAll('.app-table-wrap table')?.forEach(tbl => {
            const text = (tbl.textContent || '').replace(/\s+/g, ' ');
            if (/Оценочная стоимость/.test(text) && /Примечание/.test(text)) {
              tbl.classList.add('inventory-table');
            }
            if (/Пол/.test(text) && /Стены/.test(text) && /Потолок/.test(text) && /Двери/.test(text) && /Окна/.test(text)) {
              tbl.classList.add('apartment-table');
            }
          });
        } catch {}
      }, 0);
    } else {
      console.warn('[restoreFromTemplate] render failed, fallback to raw template');
      setEditorContent(templateHtml);
    }
  }

  async function clearSaved(docId) {
    await fetch(`/api/docs/${docId}/clear`, { method: 'POST' });
    // на клиенте дополнительно очистить localStorage/IndexedDB, если используете
    localStorage.removeItem(`doc:${docId}`);
    localStorage.removeItem('editorContent'); // если такой ключ есть
    // и сразу подгрузить чистый шаблон:
    await restoreFromTemplate(docId);
  }

  // UI warning if formData is missing
  const formDataMissing = formData && Object.keys(formData).length === 0;
  
  function handleBackToWizard() {
    // НИЧЕГО не сохраняем отсюда — мастер сам управляет кэшем формы и таблиц
    try {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      window.history.back();
    }
  }


  return (
    <div style={{ padding: 16 }}>
      {formDataMissing && (
        <div style={{ marginBottom: 16, color: "red" }}>
          Внимание: данные формы не найдены. Пожалуйста, вернитесь к мастеру и заполните данные.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Left column: Editor */}
        <div>
          <div className="tt-sticky">
            <div className="tt-row tt-top">
              <div className="tt-left">
                <button onClick={handleBackToWizard} className="tt-back">
                  ← Назад к мастеру
                </button>
                <h2 className="tt-title">Редактор договора</h2>
              </div>
              <div className="tt-right doc-actions">
                <button onClick={handleRenderServer} className="doc-btn generate">
                  <FontAwesomeIcon icon={faPlay} className="fa-icon" />
                  Сгенерировать
                </button>
                <button onClick={handleSaveVersion} disabled={saving} className="doc-btn save">
                  <FontAwesomeIcon icon={faSave} className="fa-icon" />
                  Сохранить
                </button>
                <button onClick={handlePreviewPdf} className="doc-btn pdf">
                  <FontAwesomeIcon icon={faFilePdf} className="fa-icon" />
                  PDF
                </button>
                <button onClick={() => restoreFromTemplate(1)} className="doc-btn restore">
                  <FontAwesomeIcon icon={faUndoAlt} className="fa-icon" />
                  Восстановить
                </button>
                <button onClick={handleDownloadDocx} className="doc-btn docx">
                  <FontAwesomeIcon icon={faFileWord} className="fa-icon" />
                  DOCX
                </button>
                <div className="tt-group">
                <button
                  type="button"
                  className={`tt-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  title="Жирный"
                >
                  <FontAwesomeIcon icon={faBold} className="fa-icon" />
                </button>
                <button
                  type="button"
                  className={`tt-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  title="Курсив"
                >
                  <FontAwesomeIcon icon={faItalic} className="fa-icon" />
                </button>
                <button
                  type="button"
                  className={`tt-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  title="Подчёркнутый"
                >
                  <FontAwesomeIcon icon={faUnderline} className="fa-icon" />
                </button>
              </div>
              <div className="tt-group">
                <button
                  type="button"
                  className={`tt-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  title="Выровнять по левому краю"
                >
                  <FontAwesomeIcon icon={faAlignLeft} className="fa-icon" />
                </button>
                <button
                  type="button"
                  className={`tt-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  title="По центру"
                >
                  <FontAwesomeIcon icon={faAlignCenter} className="fa-icon" />
                </button>
                <button
                  type="button"
                  className={`tt-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  title="По правому краю"
                >
                  <FontAwesomeIcon icon={faAlignRight} className="fa-icon" />
                </button>
                <button
                  type="button"
                  className={`tt-btn ${editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}`}
                  onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                  title="По ширине"
                >
                  <FontAwesomeIcon icon={faAlignJustify} className="fa-icon" />
                </button>
              </div>

              <div className="tt-group">
                <button
                  type="button"
                  className={`tt-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  title="Маркированный список"
                >
                  <FontAwesomeIcon icon={faListUl} className="fa-icon" />
                </button>
                <button
                  type="button"
                  className={`tt-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  title="Нумерованный список"
                >
                  <FontAwesomeIcon icon={faListOl} className="fa-icon" />
                </button>
              </div>
              <div className="tt-group">
                <button
                  type="button"
                  className="tt-btn"
                  onClick={() => editor.chain().focus().undo().run()}
                  title="Отменить"
                >
                  <FontAwesomeIcon icon={faUndo} className="fa-icon" />
                </button>
                <button
                  type="button"
                  className="tt-btn"
                  onClick={() => editor.chain().focus().redo().run()}
                  title="Повторить"
                >
                  <FontAwesomeIcon icon={faRedo} className="fa-icon" />
                </button>
              </div>
              </div>
            </div>

            {editor && (
              <div className="tt-row tt-toolbar-row">
                <div className="tt-toolbar">
                  {/* кнопки форматирования редактора */}
                </div>
              </div>
            )}
          </div>
          {editor && (
            <div className="tt-toolbar">
              
            </div>
          )}

          {/* The rich text editor content area */}
          <div style={{ border: "1px solid #ccc", minHeight: 400, padding: 8 }}>
            <style>{`
              /* Единый липкий контейнер */
              .tt-sticky{
                position: sticky;
                top: 0;               /* если есть фикс-хедер приложения сверху, поставь его высоту, например top: 56px */
                z-index: 50;
                background: #fff;
                border-bottom: 1px solid #e5e7eb;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                padding: 8px 10px;
                margin: 0 -10px 12px; /* чтобы фон/бордер тянулись на всю ширину колонки */
              }

              /* Ряды внутри липкого контейнера */
              .tt-row{
                display: flex;
                align-items: center;
                gap: 10px;
              }
              .tt-top{
                justify-content: space-between;
                flex-wrap: wrap;
              }
              .tt-left{
                display: flex;
                align-items: center;
                gap: 12px;
                min-height: 36px;
              }
              .tt-title{
                margin: 0;
                font-size: 18px;
                font-weight: 600;
              }

              /* Кнопка назад — сделаем её чуть аккуратнее */
              .tt-back{
                height: 32px;
                padding: 0 10px;
                border: 1px solid #e5e7eb;
                background: #fff;
                border-radius: 8px;
                cursor: pointer;
              }
              .tt-back:hover{ background: #f8fafc; }

              /* Ряд тулбара редактора под блоком действий */
              .tt-toolbar-row{
                margin-top: 6px;
              }

              /* Стили самого тулбара (если не вставлял раньше) */
              .tt-toolbar{
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                padding: 6px 0 0;
              }

              /* Немного адаптивности — чтобы на узких экранах действия падали на новую строку */
              @media (max-width: 900px){
                .tt-top{ gap: 8px; }
                .tt-right{ width: 100%; display: flex; flex-wrap: wrap; gap: 8px; }
                .tt-sticky{ padding: 8px; margin: 0 -8px 12px; }
              }

              .ProseMirror {
                min-height: 400px;
                padding: 20mm; /* поля как в A4 */
                font-family: "Times New Roman", serif;
                font-size: 12pt;
                line-height: 1.5;
                background: #fff;
              }

              .ProseMirror p {
                text-align: justify;
                margin: 0 0 8pt 0;
              }

              .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
                text-align: center;
                font-weight: bold;
                margin: 12pt 0 12pt 0;
              }
              /* Таблицы в редакторе — рамки и ширина */
              .ProseMirror .app-table-wrap table,
              .ProseMirror .inventory-table,
              .ProseMirror .apartment-table,
              .ProseMirror table {
                border-collapse: collapse; 
                width: 100%;
              }

              .ProseMirror .app-table-wrap th, .ProseMirror .app-table-wrap td,
              .ProseMirror .inventory-table th, .ProseMirror .inventory-table td,
              .ProseMirror .apartment-table th, .ProseMirror .apartment-table td,
              .ProseMirror table th, .ProseMirror table td {
                border: 1px solid #000; 
                padding: 3pt 4pt;
              }
              /* Панель действий документа */
              .doc-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 12px;
              }

              .doc-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                color: #fff;
                transition: background 0.2s ease;
              }

              .doc-btn .fa-icon {
                font-size: 14px;
              }

              /* Цветовые варианты */
              .doc-btn.generate { background: #007bff; }       /* синий */
              .doc-btn.generate:hover { background: #0069d9; }

              .doc-btn.save { background: #28a745; }          /* зелёный */
              .doc-btn.save:hover { background: #218838; }

              .doc-btn.pdf { background: #17a2b8; }           /* бирюзовый */
              .doc-btn.pdf:hover { background: #138496; }

              .doc-btn.restore { background: #fd7e14; }       /* оранжевый */
              .doc-btn.restore:hover { background: #e96b0c; }

              .doc-btn.docx { background: #6f42c1; }          /* фиолетовый */
              .doc-btn.docx:hover { background: #5a32a3; }

              /* — тулбар — */
              .tt-toolbar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
              .tt-group   { display: inline-flex; gap: 6px; align-items: center; padding-right: 6px; border-right: 1px solid #ddd; }
              .tt-group:last-child { border-right: 0; }

              .tt-btn {
                display: inline-flex; align-items: center; justify-content: center;
                min-width: 34px; height: 32px; padding: 0 8px; border: 1px solid #ccc; border-radius: 6px;
                background: #f7f7f7; cursor: pointer; font-size: 14px;
              }
              .tt-btn:hover { background: #eee; }
              .tt-btn.is-active { background: #dce6ff; border-color: #7aa2ff; }
              .tt-btn .fa-icon { width: 16px; height: 16px; }
              /* маркер разрыва страницы; можно скрыть или тонко подсветить в редакторе */
              .ProseMirror .pagebreak {
                height: 0; 
                margin: 0; 
                padding: 0;
                /* можно включить визуальную пунктирную линию:
                border-top: 1px dashed #bbb;
                margin: 12px 0;
                */
              }
                
            `}</style>
            {/* Hints styling (editor only) */}
            <style>{`
              /* финальная проверка на специфичность: красим только в редакторе */
              .ProseMirror [data-hint], .ProseMirror .editor-hint {
                display: inline-block;
                margin: 6px 0 0 0;
                padding: 4px 8px;
                background: #fff8c5 !important;
                border: 1px solid #f0c36d;
                border-radius: 6px;
                font-size: 0.9em;
                color: #333;
              }
            `}</style>

            <EditorContent editor={editor} />
          </div>
        </div>
        {/* Right column: Versions and diff viewer */}
        <div>
          <h3>Версии</h3>
          <div style={{ marginBottom: 8 }}>
            <select value={selectedFrom || ""} onChange={e => setSelectedFrom(e.target.value)}>
              <option value="">from…</option>
              {versions.map(v => (
                <option key={v.versionId} value={v.versionId}>
                  {v.versionId} — {v.createdAt}
                </option>
              ))}
            </select>
            <select value={selectedTo || ""} onChange={e => setSelectedTo(e.target.value)} style={{ marginLeft: 8 }}>
              <option value="">to…</option>
              {versions.map(v => (
                <option key={v.versionId} value={v.versionId}>
                  {v.versionId} — {v.createdAt}
                </option>
              ))}
            </select>
            <button onClick={handleBuildDiff} style={{ marginLeft: 8 }}>
              Показать изменения
            </button>
          </div>
          {/* Diff output (rendered as HTML) */}
          <div 
            style={{ border: "1px solid #ddd", padding: 8, maxHeight: 400, overflow: "auto" }}
            dangerouslySetInnerHTML={{ __html: diffHtml }}
          />
        </div>
      </div>
    </div>
  );
}
