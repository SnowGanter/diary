import React, { useState, useEffect, useRef, useMemo } from 'react';
import { marked } from 'marked';
import { 
  Save, Plus, Trash2, FileText, Calendar, Clock, Menu, X, 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, RemoveFormatting,
  Heading1, Heading2, Heading3, Quote, Code, SquareTerminal, Minus,
  List, ListOrdered, CheckSquare, AlignLeft, AlignCenter, AlignRight,
  Image as ImageIcon, EyeOff, ChevronRight, ChevronDown, Type, Pencil, Eraser,
  Info, Table2, Link, Paperclip, Columns, LayoutGrid, Calculator, GripVertical, Layers,
  Globe
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// АДАПТЕР БАЗЫ ДАННЫХ
// ==========================================
const IS_SANDBOX = typeof __firebase_config !== 'undefined';
let db, auth, appId;

if (IS_SANDBOX) {
  const firebaseConfig = JSON.parse(__firebase_config);
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? String(__app_id).replace(/\//g, '_') : 'default-app-id';
}

const localDB = {
  dbName: 'LocalDiaryDB',
  storeName: 'entries',
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async getAll() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async save(entry) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  async delete(id) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

// ==========================================
// НАСТРОЙКИ И ЛОКАЛИЗАЦИЯ (i18n)
// ==========================================
const LANGS = [
  { id: 'ru', code: 'RU', name: 'Русский', locale: 'ru-RU' },
  { id: 'en', code: 'EN', name: 'English', locale: 'en-US' },
  { id: 'de', code: 'DE', name: 'Deutsch', locale: 'de-DE' },
  { id: 'es', code: 'ES', name: 'Español', locale: 'es-ES' },
  { id: 'he', code: 'HE', name: 'עברית', locale: 'he-IL', rtl: true }
];

const DICTIONARY = {
  ru: {
    diary: "Дневник", font: "Шрифт", size: "Размер текста", lang: "Язык", themes: "Темы",
    newEntry: "Новая запись", tools: "Инструменты", draw: "Рисовать", eraser: "Ластик", clear: "Очистить",
    color: "Цвет", brush: "Кисть", noEntries: "Нет записей. Создай первую!",
    created: "Создано:", updated: "Изменено:", emptyDiary: "Дневник пуст", createPage: "Создать страницу",
    save: "Сохранить", saving: "Сохранение...", delete: "Удалить", untitled: "Без названия",
    phTitle: "Заголовок записи...", phSubtitle: "Начните писать... (ПКМ — меню, # — заголовки)", phEmpty: "Начните писать...",
    sketchCanvas: "Холст для скетча", insertText: "Вставить в текст", textMode: "Режим ввода текста", drawMode: "Режим рисования поверх текста",
    menuHint: "ПКМ для вызова меню блоков", drawHint: "Рисуйте поверх текста! ПКМ для выхода",
    bold: "Жирный", italic: "Курсив", underline: "Подчеркнутый", strike: "Зачеркнутый", code: "Код", clearStyle: "Очистить стиль",
    drawOver: "Рисовать поверх текста", hotkey: "Горячая клавиша", emoji: "Эмодзи", basicBlocks: "Базовые блоки",
    tabs: "Вкладки (Tabs)", h1: "Заголовок 1", h2: "Заголовок 2", h3: "Заголовок 3", space: "Пробел", quote: "Цитата",
    codeBlock: "Блок кода", divider: "Разделитель", mediaFiles: "Медиа & Файлы", image: "Картинка", drawSketch: "Нарисовать скетч",
    attachFile: "Вложить файл", bookmark: "Веб-закладка", structure: "Структура", table: "Таблица (Простая)", columns: "Колонки:",
    listsSpoilers: "Списки & Спойлеры", todo: "To-Do лист", dots: "Точки", numbers: "Цифры", spoiler: "Обычный спойлер",
    spH1: "Спойлер-заголовок 1", spH2: "Спойлер-заголовок 2", db: "Базы данных", board: "Board view (Канбан)", gallery: "Gallery view",
    textColor: "Цвет текста", bgColor: "Выделение фона",
    tabContent: "Содержимое вкладки", hiddenText: "Скрытый текст...", colPh: "Колонка",
    todoPh: "К выполнению", inProgressPh: "В процессе", donePh: "Готово", taskPh: "Задача...", descPh: "Описание...", cellPh: "Ячейка",
    cancel: "Отмена", insert: "Вставить",
    prompts: { url: "Введите ссылку (URL):", title: "Введите заголовок ссылки:" }
  },
  en: {
    diary: "Diary", font: "Font", size: "Text Size", lang: "Language", themes: "Themes",
    newEntry: "New Entry", tools: "Tools", draw: "Draw", eraser: "Eraser", clear: "Clear",
    color: "Color", brush: "Brush", noEntries: "No entries. Create the first one!",
    created: "Created:", updated: "Updated:", emptyDiary: "Diary is empty", createPage: "Create Page",
    save: "Save", saving: "Saving...", delete: "Delete", untitled: "Untitled",
    phTitle: "Entry title...", phSubtitle: "Start writing... (RMB — menu, # — headings)", phEmpty: "Start writing...",
    sketchCanvas: "Sketch Canvas", insertText: "Insert into text", textMode: "Text Mode", drawMode: "Draw Over Text",
    menuHint: "RMB to open block menu", drawHint: "Draw over text! RMB to exit",
    bold: "Bold", italic: "Italic", underline: "Underline", strike: "Strikethrough", code: "Code", clearStyle: "Clear Style",
    drawOver: "Draw over text", hotkey: "Hotkey", emoji: "Emoji", basicBlocks: "Basic Blocks",
    tabs: "Tabs", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", space: "Space", quote: "Quote",
    codeBlock: "Code Block", divider: "Divider", mediaFiles: "Media & Files", image: "Image", drawSketch: "Draw Sketch",
    attachFile: "Attach File", bookmark: "Web Bookmark", structure: "Structure", table: "Table (Simple)", columns: "Columns:",
    listsSpoilers: "Lists & Spoilers", todo: "To-Do List", dots: "Bullets", numbers: "Numbers", spoiler: "Regular Spoiler",
    spH1: "Spoiler Heading 1", spH2: "Spoiler Heading 2", db: "Databases", board: "Board view (Kanban)", gallery: "Gallery view",
    textColor: "Text Color", bgColor: "Background Highlight",
    tabContent: "Tab content", hiddenText: "Hidden text...", colPh: "Column",
    todoPh: "To Do", inProgressPh: "In Progress", donePh: "Done", taskPh: "Task...", descPh: "Description...", cellPh: "Cell",
    cancel: "Cancel", insert: "Insert",
    prompts: { url: "Enter URL:", title: "Enter link title:" }
  },
  de: {
    diary: "Tagebuch", font: "Schriftart", size: "Textgröße", lang: "Sprache", themes: "Themen",
    newEntry: "Neuer Eintrag", tools: "Werkzeuge", draw: "Zeichnen", eraser: "Radiergummi", clear: "Löschen",
    color: "Farbe", brush: "Pinsel", noEntries: "Keine Einträge. Erstelle den ersten!",
    created: "Erstellt:", updated: "Geändert:", emptyDiary: "Tagebuch ist leer", createPage: "Seite erstellen",
    save: "Speichern", saving: "Speichern...", delete: "Löschen", untitled: "Ohne Titel",
    phTitle: "Titel des Eintrags...", phSubtitle: "Fangen Sie an zu schreiben... (RMT — Menü, # — Überschriften)", phEmpty: "Fangen Sie an zu schreiben...",
    sketchCanvas: "Skizzenleinwand", insertText: "In Text einfügen", textMode: "Textmodus", drawMode: "Über Text zeichnen",
    menuHint: "RMT für Blockmenü", drawHint: "Zeichnen Sie über den Text! RMT zum Beenden",
    bold: "Fett", italic: "Kursiv", underline: "Unterstrichen", strike: "Durchgestrichen", code: "Code", clearStyle: "Stil löschen",
    drawOver: "Über Text zeichnen", hotkey: "Tastenkürzel", emoji: "Emoji", basicBlocks: "Basisblöcke",
    tabs: "Registerkarten (Tabs)", h1: "Überschrift 1", h2: "Überschrift 2", h3: "Überschrift 3", space: "Leerzeichen", quote: "Zitat",
    codeBlock: "Codeblock", divider: "Trennlinie", mediaFiles: "Medien & Dateien", image: "Bild", drawSketch: "Skizze zeichnen",
    attachFile: "Datei anhängen", bookmark: "Web-Lesezeichen", structure: "Struktur", table: "Tabelle (Einfach)", columns: "Spalten:",
    listsSpoilers: "Listen & Spoiler", todo: "To-Do Liste", dots: "Punkte", numbers: "Zahlen", spoiler: "Einfacher Spoiler",
    spH1: "Spoiler-Überschrift 1", spH2: "Spoiler-Überschrift 2", db: "Datenbanken", board: "Board-Ansicht (Kanban)", gallery: "Galerie-Ansicht",
    textColor: "Textfarbe", bgColor: "Hintergrundfarbe",
    tabContent: "Tab-Inhalt", hiddenText: "Versteckter Text...", colPh: "Spalte",
    todoPh: "Zu erledigen", inProgressPh: "In Bearbeitung", donePh: "Fertig", taskPh: "Aufgabe...", descPh: "Beschreibung...", cellPh: "Zelle",
    cancel: "Abbrechen", insert: "Einfügen",
    prompts: { url: "URL eingeben:", title: "Linktitel eingeben:" }
  },
  es: {
    diary: "Diario", font: "Fuente", size: "Tamaño", lang: "Idioma", themes: "Temas",
    newEntry: "Nueva Entrada", tools: "Herramientas", draw: "Dibujar", eraser: "Borrador", clear: "Limpiar",
    color: "Color", brush: "Pincel", noEntries: "No hay entradas. ¡Crea la primera!",
    created: "Creado:", updated: "Modificado:", emptyDiary: "El diario está vacío", createPage: "Crear Página",
    save: "Guardar", saving: "Guardando...", delete: "Eliminar", untitled: "Sin título",
    phTitle: "Título de la entrada...", phSubtitle: "Empieza a escribir... (Click derecho — menú, # — títulos)", phEmpty: "Empieza a escribir...",
    sketchCanvas: "Lienzo de dibujo", insertText: "Insertar en el texto", textMode: "Modo texto", drawMode: "Dibujar sobre el texto",
    menuHint: "Click derecho para menú de bloques", drawHint: "¡Dibuja sobre el texto! Click derecho para salir",
    bold: "Negrita", italic: "Cursiva", underline: "Subrayado", strike: "Tachado", code: "Código", clearStyle: "Limpiar estilo",
    drawOver: "Dibujar sobre texto", hotkey: "Atajo", emoji: "Emoji", basicBlocks: "Bloques básicos",
    tabs: "Pestañas (Tabs)", h1: "Título 1", h2: "Título 2", h3: "Título 3", space: "Espacio", quote: "Cita",
    codeBlock: "Bloque de código", divider: "Divisor", mediaFiles: "Medios y Archivos", image: "Imagen", drawSketch: "Dibujar boceto",
    attachFile: "Adjuntar archivo", bookmark: "Marcador web", structure: "Estructura", table: "Tabla (Simple)", columns: "Columnas:",
    listsSpoilers: "Listas y Spoilers", todo: "Lista de tareas", dots: "Puntos", numbers: "Números", spoiler: "Spoiler regular",
    spH1: "Título spoiler 1", spH2: "Título spoiler 2", db: "Bases de datos", board: "Vista Tablero (Kanban)", gallery: "Vista Galería",
    textColor: "Color de texto", bgColor: "Resaltado de fondo",
    tabContent: "Contenido de pestaña", hiddenText: "Texto oculto...", colPh: "Columna",
    todoPh: "Por hacer", inProgressPh: "En progreso", donePh: "Hecho", taskPh: "Tarea...", descPh: "Descripción...", cellPh: "Celda",
    cancel: "Cancelar", insert: "Insertar",
    prompts: { url: "Introduce la URL:", title: "Introduce el título del enlace:" }
  },
  he: {
    diary: "יומן", font: "גופן", size: "גודל טקסט", lang: "שפה", themes: "עיצובים",
    newEntry: "רשומה חדשה", tools: "כלים", draw: "צייר", eraser: "מחק", clear: "נקה",
    color: "צבע", brush: "מברשת", noEntries: "אין רשומות. צור את הראשונה!",
    created: "נוצר:", updated: "עודכן:", emptyDiary: "היומן ריק", createPage: "צור דף",
    save: "שמור", saving: "שומר...", delete: "מחק", untitled: "ללא שם",
    phTitle: "כותרת הרשומה...", phSubtitle: "התחל לכתוב... (קליק ימני — תפריט, # — כותרות)", phEmpty: "התחל לכתוב...",
    sketchCanvas: "קנבס ציור", insertText: "הכנס לטקסט", textMode: "מצב טקסט", drawMode: "צייר על הטקסט",
    menuHint: "קליק ימני לתפריט בלוקים", drawHint: "צייר על הטקסט! קליק ימני ליציאה",
    bold: "מודגש", italic: "נטוי", underline: "קו תחתון", strike: "קו חוצה", code: "קוד", clearStyle: "נקה עיצוב",
    drawOver: "צייר על טקסט", hotkey: "מקש קיצור", emoji: "אימוג'י", basicBlocks: "בלוקים בסיסיים",
    tabs: "כרטיסיות (Tabs)", h1: "כותרת 1", h2: "כותרת 2", h3: "כותרת 3", space: "רווח", quote: "ציטוט",
    codeBlock: "בלוק קוד", divider: "מפריד", mediaFiles: "מדיה וקבצים", image: "תמונה", drawSketch: "צייר סקיצה",
    attachFile: "צרף קובץ", bookmark: "סימניית רשת", structure: "מבנה", table: "טבלה (פשוטה)", columns: "עמודות:",
    listsSpoilers: "רשימות וספוילרים", todo: "רשימת מטלות", dots: "נקודות", numbers: "מספרים", spoiler: "ספוילר רגיל",
    spH1: "כותרת ספוילר 1", spH2: "כותרת ספוילר 2", db: "מסדי נתונים", board: "תצוגת לוח (קנבן)", gallery: "תצוגת גלריה",
    textColor: "צבע טקסט", bgColor: "הדגשת רקע",
    tabContent: "תוכן כרטיסייה", hiddenText: "טקסט מוסתר...", colPh: "עמודה",
    todoPh: "לביצוע", inProgressPh: "בתהליך", donePh: "בוצע", taskPh: "משימה...", descPh: "תיאור...", cellPh: "תא",
    cancel: "ביטול", insert: "הכנס",
    prompts: { url: "הזן קישור (URL):", title: "הזן כותרת לקישור:" }
  }
};

const THEMES = [
  { id: 'slate', color: '#334155', bg: '#020617', sidebar: '#0f172a', text: '#f8fafc', textMuted: '#94a3b8', accent: '#3b82f6', border: '#1e293b' },
  { id: 'total-black', color: '#000000', bg: '#000000', sidebar: '#0a0a0a', text: '#ffffff', textMuted: '#737373', accent: '#ffffff', border: '#262626' }, 
  { id: 'light', color: '#e2e8f0', bg: '#ffffff', sidebar: '#f8fafc', text: '#0f172a', textMuted: '#64748b', accent: '#2563eb', border: '#e2e8f0' },
  { id: 'sepia', color: '#d4c4a8', bg: '#fdf6e3', sidebar: '#eee8d5', text: '#475569', textMuted: '#94a3b8', accent: '#d33682', border: '#e5e7eb' },
  { id: 'forest', color: '#166534', bg: '#052e16', sidebar: '#14532d', text: '#ecfdf5', textMuted: '#6ee7b7', accent: '#22c55e', border: '#166534' },
  { id: 'ocean', color: '#155e75', bg: '#083344', sidebar: '#164e63', text: '#ecfeff', textMuted: '#67e8f9', accent: '#06b6d4', border: '#155e75' }
];

const FONTS = [
  { id: 'sans', name: 'System / Системный', family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'serif', name: 'Classic / Классика', family: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
  { id: 'mono', name: 'Code / Код', family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { id: 'rounded', name: 'Rounded / Округлый', family: '"Nunito", "Segoe UI Rounded", ui-sans-serif, system-ui, sans-serif' }
];

const FONT_SIZES = [
  { id: 'sm', size: '14px' },
  { id: 'base', size: '16px' },
  { id: 'lg', size: '18px' },
  { id: 'xl', size: '20px' }
];

const EMOJIS = ['😀', '😂', '🥰', '😎', '🥺', '😭', '😡', '💀', '👽', '💩', '👻', '❤️', '🔥', '✨', '💡', '📌', '✅', '❌', '🎉', '🚀'];

// ==========================================
// КОМПОНЕНТ ОВЕРЛЕЯ ДЛЯ РИСОВАНИЯ (ТЕТРАДЬ)
// ==========================================
const CanvasOverlay = ({ entryId, isDrawingMode, overlayData, onSave, color, lineWidth, clearTrigger, isEraser, onExitMode }) => {
  const canvasRef = useRef(null);
  const masterCanvasRef = useRef(document.createElement('canvas'));
  const [isDrawing, setIsDrawing] = useState(false);
  const ctxSettings = useRef({ color, lineWidth, isEraser });

  useEffect(() => { ctxSettings.current = { color, lineWidth, isEraser }; }, [color, lineWidth, isEraser]);

  useEffect(() => {
    const visibleCanvas = canvasRef.current;
    const container = visibleCanvas.parentElement;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const newWidth = container.offsetWidth;
      const newHeight = container.offsetHeight;

      if (visibleCanvas.width !== newWidth || visibleCanvas.height !== newHeight) {
        visibleCanvas.width = newWidth;
        visibleCanvas.height = newHeight;
        const master = masterCanvasRef.current;
        
        if (newWidth > master.width || newHeight > master.height) {
          const temp = document.createElement('canvas');
          temp.width = master.width;
          temp.height = master.height;
          temp.getContext('2d').drawImage(master, 0, 0);

          master.width = Math.max(master.width, newWidth);
          master.height = Math.max(master.height, newHeight);
          master.getContext('2d').drawImage(temp, 0, 0);
        }

        visibleCanvas.getContext('2d').clearRect(0, 0, newWidth, newHeight);
        visibleCanvas.getContext('2d').drawImage(master, 0, 0);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadImg = () => {
      const visible = canvasRef.current;
      if (!visible) return;
      const visibleCtx = visible.getContext('2d');
      const master = masterCanvasRef.current;
      const masterCtx = master.getContext('2d');

      visibleCtx.clearRect(0, 0, visible.width, visible.height);
      masterCtx.clearRect(0, 0, master.width, master.height);

      if (overlayData) {
        const img = new Image();
        img.onload = () => {
          master.width = Math.max(img.width, visible.width || 1);
          master.height = Math.max(img.height, visible.height || 1);
          masterCtx.clearRect(0, 0, master.width, master.height);
          masterCtx.drawImage(img, 0, 0);
          visibleCtx.clearRect(0, 0, visible.width, visible.height);
          visibleCtx.drawImage(master, 0, 0);
        };
        img.src = overlayData;
      } else {
        master.width = visible.width || 1;
        master.height = visible.height || 1;
      }
    };
    requestAnimationFrame(loadImg);
  }, [entryId, clearTrigger]); 

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const applyStroke = (ctx, x, y, isStart) => {
    if (ctxSettings.current.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = ctxSettings.current.lineWidth * 3; 
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = ctxSettings.current.color;
      ctx.lineWidth = ctxSettings.current.lineWidth;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const startDrawing = (e) => {
    e.preventDefault(); 
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    const visibleCtx = canvasRef.current.getContext('2d');
    const masterCtx = masterCanvasRef.current.getContext('2d');
    applyStroke(visibleCtx, x, y, true);
    applyStroke(masterCtx, x, y, true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const visibleCtx = canvasRef.current.getContext('2d');
    const masterCtx = masterCanvasRef.current.getContext('2d');
    applyStroke(visibleCtx, x, y, false);
    applyStroke(masterCtx, x, y, false);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      onSave(masterCanvasRef.current.toDataURL('image/png'));
    }
  };

  const handleContextMenu = (e) => {
    if (isDrawingMode) { e.preventDefault(); onExitMode(); }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
      onContextMenu={handleContextMenu}
      className={`absolute top-0 left-0 w-full h-full touch-none ${isDrawingMode ? 'z-10 cursor-crosshair' : 'pointer-events-none z-10'}`}
    />
  );
};

// ==========================================
// КОМПОНЕНТ РИСОВАЛКИ (ОТДЕЛЬНЫЙ СКЕТЧ-БЛОК)
// ==========================================
const DrawingModal = ({ onClose, onSave, t }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(() => localStorage.getItem('diaryDrawColor') || '#ef4444');
  const [lineWidth, setLineWidth] = useState(() => Number(localStorage.getItem('diaryDrawSize')) || 3);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => { localStorage.setItem('diaryDrawColor', color); localStorage.setItem('diaryDrawSize', lineWidth); }, [color, lineWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath(); ctx.moveTo(x, y);
    setIsDrawing(true); draw(e);
  };

  const draw = (e) => {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    if (isEraser) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = lineWidth * 3; } 
    else { ctx.strokeStyle = color; ctx.lineWidth = lineWidth; }
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => { const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="ltr">
      <div className="app-sidebar p-5 rounded-2xl shadow-2xl app-border border flex flex-col gap-4 w-full max-w-2xl">
        <div className="flex justify-between items-center">
          <h3 className="font-bold app-text text-lg">{t.sketchCanvas}</h3>
          <button onClick={onClose} className="app-text-muted hover:app-text transition-colors p-1"><X size={20}/></button>
        </div>
        <div className="overflow-hidden rounded-lg border-2 border-gray-300 relative shadow-inner bg-white" style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef} width={800} height={500}
            className="w-full h-auto cursor-crosshair touch-none"
            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
          />
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4 bg-black/5 p-2 rounded-lg border app-border">
            <div className="flex items-center gap-2">
              <span className="text-xs app-text-muted font-semibold uppercase">{t.color}</span>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} disabled={isEraser} className={`w-8 h-8 rounded border-0 p-0 ${isEraser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} title={t.color} />
            </div>
            <div className="w-px h-6 app-border border-l"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs app-text-muted font-semibold uppercase">{t.brush}</span>
              <input type="range" min="1" max="30" value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="w-24 cursor-pointer accent-blue-500" title={t.brush} />
            </div>
            <div className="w-px h-6 app-border border-l"></div>
            <button onClick={() => setIsEraser(!isEraser)} className={`p-1.5 rounded transition-colors ${isEraser ? 'bg-blue-500 text-white' : 'app-text-muted hover:app-text'}`} title={t.eraser}>
              <Eraser size={18} />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={clearCanvas} className="px-4 py-2.5 text-sm font-medium rounded-lg app-hover-bg app-text border app-border transition-colors">{t.clear}</button>
            <button onClick={() => onSave(canvasRef.current.toDataURL('image/png'))} className="px-5 py-2.5 text-sm font-medium rounded-lg app-accent-bg transition-transform hover:scale-105 shadow-lg flex items-center gap-2">{t.insertText}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// КОМПОНЕНТ РЕДАКТОРА (WYSIWYG)
// ==========================================
const WYSIWYGEditor = ({ entryId, initialContent, onChange, onContextMenu, isDrawingMode, isRTL, t }) => {
  const wrapperRef = useRef(null);
  const editorRef = useRef(null);
  const draggedNodesRef = useRef([]);
  const [hoverBlock, setHoverBlock] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  useEffect(() => { document.execCommand('defaultParagraphSeparator', false, 'p'); }, []);

  const getInitialHtml = (text) => {
    if (!text) return '';
    if (/<[a-z][\s\S]*>/i.test(text)) return text; 
    return marked.parse(text); 
  };

  useEffect(() => {
    if (editorRef.current && editorRef.current.dataset.id !== entryId) {
      editorRef.current.innerHTML = getInitialHtml(initialContent);
      editorRef.current.dataset.id = entryId;
    }
  }, [entryId, initialContent]);

  useEffect(() => {
    if (!editorRef.current) return;
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'style' && m.target.classList.contains('resizable-image-wrapper')) shouldUpdate = true;
      });
      if (shouldUpdate) onChange(editorRef.current.innerHTML);
    });
    observer.observe(editorRef.current, { attributes: true, subtree: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [onChange]);

  const handleEditorClick = (e) => {
    const link = e.target.closest('a');
    
    // Перехватываем клики по ВСЕМ ссылкам (веб-закладкам и файлам)
    if (link && link.href) {
      e.preventDefault();
      e.stopPropagation();

      // Создаем временную ссылку ВНЕ редактора.
      // Это заставляет десктопные фреймворки (Electron, Tauri) 
      // перехватить это как внешний клик и открыть браузер по умолчанию.
      const hiddenLink = document.createElement('a');
      hiddenLink.href = link.href;
      
      // Сохраняем поведение скачивания для файлов
      if (link.hasAttribute('download')) {
        hiddenLink.download = link.getAttribute('download');
      } else {
        hiddenLink.target = '_blank';
        hiddenLink.rel = 'noopener noreferrer';
      }
      
      hiddenLink.style.display = 'none';
      document.body.appendChild(hiddenLink);
      hiddenLink.click();
      document.body.removeChild(hiddenLink);
      return;
    }

    const tab = e.target.closest('.diary-tab');
    const addTabBtn = e.target.closest('.diary-add-tab');
    const triStateBtn = e.target.closest('.diary-tristate');

    if (triStateBtn) {
      e.preventDefault();
      let state = parseInt(triStateBtn.dataset.state || '0');
      state = (state + 1) % 3;
      triStateBtn.dataset.state = state.toString();
      if (state === 0) triStateBtn.innerHTML = '⬜';
      else if (state === 1) triStateBtn.innerHTML = '✅';
      else if (state === 2) triStateBtn.innerHTML = '❌';
      onChange(editorRef.current.innerHTML);
      return;
    }

    if (tab && !tab.classList.contains('active')) {
      const container = tab.closest('.diary-tabs-container');
      if(!container) return;
      const allTabs = Array.from(container.querySelectorAll('.diary-tab'));
      const contents = Array.from(container.querySelectorAll('.diary-tab-content-pane'));
      const index = allTabs.indexOf(tab);

      if (index > -1) {
          allTabs.forEach((t, i) => t.classList.toggle('active', i === index));
          contents.forEach((c, i) => c.style.display = (i === index ? 'block' : 'none'));
          onChange(editorRef.current.innerHTML);
      }
    } else if (addTabBtn) {
      const container = addTabBtn.closest('.diary-tabs-container');
      if(!container) return;
      const header = container.querySelector('.diary-tabs-header');
      const body = container.querySelector('.diary-tabs-body');

      const newIndex = header.querySelectorAll('.diary-tab').length + 1;
      const newTab = document.createElement('span');
      newTab.className = 'diary-tab active';
      newTab.contentEditable = 'true';
      newTab.textContent = `Tab ${newIndex}`;

      const newContent = document.createElement('div');
      newContent.className = 'diary-tab-content-pane';
      newContent.contentEditable = 'true';
      newContent.style.display = 'block';
      newContent.innerHTML = `<p class="has-placeholder" data-placeholder="${t.tabContent} ${newIndex}..."><br></p>`;

      header.querySelectorAll('.diary-tab').forEach(t => t.classList.remove('active'));
      body.querySelectorAll('.diary-tab-content-pane').forEach(c => c.style.display = 'none');

      addTabBtn.before(newTab);
      body.appendChild(newContent);
      onChange(editorRef.current.innerHTML);
    }
  };

  const getSelectedBlocks = () => {
    const sel = window.getSelection();
    if (sel.isCollapsed) return hoverBlock ? [hoverBlock.node] : [];
    const range = sel.getRangeAt(0);
    const getTopLevel = (n) => {
      while (n && n.parentNode !== editorRef.current) {
        if (n === editorRef.current) return null;
        n = n.parentNode;
      }
      return n;
    };
    const startBlock = getTopLevel(range.startContainer);
    const endBlock = getTopLevel(range.endContainer);
    if (startBlock && endBlock) {
      const blocks = Array.from(editorRef.current.children);
      const i1 = blocks.indexOf(startBlock);
      const i2 = blocks.indexOf(endBlock);
      if (i1 > -1 && i2 > -1) return blocks.slice(Math.min(i1, i2), Math.max(i1, i2) + 1);
    }
    return hoverBlock ? [hoverBlock.node] : [];
  };

  const handleMouseMove = (e) => {
    if (isDrawingMode) { if (hoverBlock) setHoverBlock(null); return; }
    if (e.target.closest('.diary-block-handle') || e.target.closest('.diary-block-delete')) return;
    const editor = editorRef.current;
    if (!editor) return;
    const editorRect = editor.getBoundingClientRect();
    if (e.clientY < editorRect.top || e.clientY > editorRect.bottom) return;

    let foundBlock = null;
    if (e.target === editor || e.target === wrapperRef.current) {
      const children = Array.from(editor.children);
      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        if (e.clientY >= rect.top - 8 && e.clientY <= rect.bottom + 8) { foundBlock = children[i]; break; }
      }
    } else {
      let node = e.target;
      while (node && node !== editor) {
        if (node.parentNode === editor || (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('diary-col'))) { foundBlock = node; break; }
        node = node.parentNode;
      }
    }

    if (foundBlock && foundBlock.tagName !== 'BR' && !foundBlock.classList.contains('resizable-image-wrapper')) {
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const rect = foundBlock.getBoundingClientRect();
      setHoverBlock({
        top: rect.top - wrapperRect.top,
        left: rect.left - wrapperRect.left,
        right: wrapperRect.right - rect.right,
        node: foundBlock
      });
    } else if (!e.target.closest('.diary-block-handle') && !e.target.closest('.diary-block-delete')) {
      setHoverBlock(null);
    }
  };

  const handleAddBlock = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!hoverBlock) return;
    const newBlock = document.createElement('p');
    newBlock.className = 'has-placeholder';
    newBlock.setAttribute('data-placeholder', t.phSubtitle);
    newBlock.innerHTML = '<br>';
    if (e.ctrlKey || e.metaKey) hoverBlock.node.before(newBlock); else hoverBlock.node.after(newBlock);
    
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(newBlock, 0); range.collapse(true);
    sel.removeAllRanges(); sel.addRange(range);
    onChange(editorRef.current.innerHTML);
    setHoverBlock(null);
  };

  const handleMenuClick = (e) => {
    e.preventDefault(); e.stopPropagation();
    let blocks = getSelectedBlocks();
    const sel = window.getSelection();
    if (hoverBlock && (blocks.length === 0 || !sel.containsNode(hoverBlock.node, true))) {
      const range = document.createRange();
      range.selectNodeContents(hoverBlock.node);
      sel.removeAllRanges(); sel.addRange(range);
    }
    onContextMenu(e, editorRef.current);
  };

  const handleDeleteBlock = (e) => {
    e.preventDefault(); e.stopPropagation();
    const blocksToDelete = getSelectedBlocks();
    if (blocksToDelete.length === 0) return;
    blocksToDelete.forEach(node => {
      if (['TD', 'TH', 'SUMMARY'].includes(node.nodeName)) node.innerHTML = '<br>'; else node.remove();
    });
    onChange(editorRef.current.innerHTML);
    setHoverBlock(null);
    window.getSelection().removeAllRanges();
  };

  const handleDragStart = (e) => {
    if (!hoverBlock) return;
    const sel = window.getSelection();
    if (sel.isCollapsed || !sel.containsNode(hoverBlock.node, true)) {
        const range = document.createRange();
        range.selectNodeContents(hoverBlock.node);
        sel.removeAllRanges(); sel.addRange(range);
    }
    draggedNodesRef.current = getSelectedBlocks();
    if (draggedNodesRef.current.length === 0) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    draggedNodesRef.current.forEach(n => n.style.opacity = '0.4');
  };

  const handleDragEnd = (e) => {
    if (draggedNodesRef.current) draggedNodesRef.current.forEach(n => n.style.opacity = '1');
    draggedNodesRef.current = [];
    setDropTarget(null);
    onChange(editorRef.current.innerHTML);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    let targetNode = null;
    const blocks = Array.from(editorRef.current.children);
    for (const block of blocks) {
      const rect = block.getBoundingClientRect();
      if (e.clientY >= rect.top - 10 && e.clientY <= rect.bottom + 10) { targetNode = block; break; }
    }
    if (targetNode && !draggedNodesRef.current.includes(targetNode)) {
      const rect = targetNode.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';
      setDropTarget({ top: position === 'before' ? rect.top : rect.bottom, node: targetNode, position });
    } else {
      setDropTarget(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dragged = draggedNodesRef.current;
    if (dragged && dragged.length > 0 && dropTarget && !dragged.includes(dropTarget.node)) {
      let referenceNode = dropTarget.node;
      if (dropTarget.position === 'before') dragged.forEach(node => referenceNode.before(node));
      else {
        const nextSibling = referenceNode.nextSibling;
        if (nextSibling) dragged.forEach(node => nextSibling.before(node));
        else dragged.forEach(node => editorRef.current.appendChild(node));
      }
      onChange(editorRef.current.innerHTML);
    }
    if (dragged) dragged.forEach(n => n.style.opacity = '1');
    draggedNodesRef.current = [];
    setDropTarget(null); setHoverBlock(null);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Str = event.target.result;
          const imgHTML = `&nbsp;<div contenteditable="false" class="resizable-image-wrapper" style="width: 300px;"><img src="${base64Str}" alt="Image" /></div>&nbsp;`;
          document.execCommand('insertHTML', false, imgHTML);
          onChange(editorRef.current.innerHTML);
        };
        reader.readAsDataURL(blob);
        return; 
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const node = selection.anchorNode;

      if (e.key === 'Enter') { if (node && node.parentElement?.closest('.diary-tab')) { e.preventDefault(); return; } }

      if (e.key === 'Enter' && !e.shiftKey) {
        const getBlockParent = (n) => {
          while (n && n !== editorRef.current && n.nodeType !== Node.DOCUMENT_NODE) {
            if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'PRE', 'BLOCKQUOTE', 'TD', 'SUMMARY', 'DETAILS'].includes(n.nodeName)) return n;
            n = n.parentNode;
          }
          return null;
        };
        const block = getBlockParent(node);

        if (block) {
          if (block.nodeName === 'TD' || block.nodeName === 'SUMMARY') return; 
          const hasCheckbox = block.querySelector('input.task-checkbox');

          setTimeout(() => {
            const newSel = window.getSelection();
            if (!newSel.rangeCount) return;
            const newBlock = getBlockParent(newSel.anchorNode);
            if (newBlock && newBlock !== block) {
              if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(newBlock.nodeName)) {
                if (newBlock.textContent.trim() === '') document.execCommand('formatBlock', false, 'P');
              }
              else if (hasCheckbox) {
                if (block.textContent.trim() === '') {
                  const cb = block.querySelector('input.task-checkbox');
                  if (cb) cb.remove();
                  document.execCommand('formatBlock', false, 'P');
                } else {
                  if (!newBlock.querySelector('input.task-checkbox')) {
                    const cb = document.createElement('input');
                    cb.type = 'checkbox'; cb.className = 'task-checkbox';
                    const spaceNode = document.createTextNode(' ');
                    newBlock.insertBefore(cb, newBlock.firstChild);
                    newBlock.insertBefore(spaceNode, cb.nextSibling);
                    const sel = window.getSelection();
                    const range = document.createRange();
                    range.setStartAfter(spaceNode); range.collapse(true);
                    sel.removeAllRanges(); sel.addRange(range);
                  }
                }
              }
              else if (['PRE', 'BLOCKQUOTE'].includes(block.nodeName) && newBlock.nodeName === block.nodeName) {
                if (newBlock.textContent.trim() === '') document.execCommand('formatBlock', false, 'P');
              }
              else if (block.nodeName === 'LI' && newBlock.nodeName === 'LI') {
                if (newBlock.textContent.trim() === '') document.execCommand('outdent', false, null);
              }
            }
          }, 0);
        }
      }

      if (node && node.nodeType === 3) {
        const text = node.textContent;
        let format = null;
        let customAction = null;
        
        if (text === '#') format = 'H1';
        else if (text === '##') format = 'H2';
        else if (text === '###') format = 'H3';
        else if (text === '>') format = 'BLOCKQUOTE';
        else if (text === '-' || text === '*') format = 'insertUnorderedList';
        else if (text === '1.') format = 'insertOrderedList';
        else if (text === '[]') customAction = 'checkbox';
        else if (text === '---') customAction = 'divider';
        else if (text === '```') format = 'PRE';

        if (format || customAction) {
          e.preventDefault();
          node.textContent = ''; 
          if (customAction === 'checkbox') document.execCommand('insertHTML', false, `<input type="checkbox" class="task-checkbox" /> `);
          else if (customAction === 'divider') document.execCommand('insertHorizontalRule', false, null);
          else if (format.startsWith('insert')) document.execCommand(format, false, null);
          else document.execCommand('formatBlock', false, format);
        }
      }
    }
  };

  return (
    <div 
      className="relative w-full min-h-full flex flex-col z-0 mx-auto max-w-4xl" 
      ref={wrapperRef}
      onMouseLeave={() => { setHoverBlock(null); setDropTarget(null); }}
      onMouseMove={handleMouseMove}
    >
      {hoverBlock && !isDrawingMode && (
        <div 
          className="diary-block-handle absolute flex items-center justify-end gap-1 text-slate-400 z-50 transition-opacity duration-200"
          style={{ top: hoverBlock.top + 2, ...(isRTL ? { right: Math.max(0, hoverBlock.right - 56) } : { left: Math.max(0, hoverBlock.left - 56) }) }}
          contentEditable={false} dir="ltr"
        >
          <button className="p-1 rounded opacity-60 hover:opacity-100 hover:app-hover-bg transition-all" onClick={handleAddBlock}><Plus size={16} /></button>
          <div className="p-1 rounded opacity-60 hover:opacity-100 hover:app-hover-bg cursor-grab active:cursor-grabbing transition-all" draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd} onMouseDown={handleMenuClick}><GripVertical size={16} /></div>
        </div>
      )}

      {hoverBlock && !isDrawingMode && (
        <div 
          className="diary-block-delete absolute flex items-center justify-center text-slate-400 z-50 transition-opacity duration-200"
          style={{ top: hoverBlock.top + 2, ...(isRTL ? { left: 4 } : { right: 4 }) }}
          contentEditable={false} dir="ltr"
        >
          <button className="p-1.5 rounded opacity-30 hover:opacity-100 hover:bg-red-500/10 text-red-500 transition-all" onMouseDown={handleDeleteBlock}><Trash2 size={16} /></button>
        </div>
      )}

      {dropTarget && !isDrawingMode && (
        <div 
          className="absolute h-[3px] bg-blue-500 rounded z-50 pointer-events-none transition-all duration-75"
          style={{ 
            top: dropTarget.top - wrapperRef.current.getBoundingClientRect().top,
            ...(isRTL ? { right: Math.max(0, (hoverBlock?.right || 80) - 56), left: 32 } : { left: Math.max(0, (hoverBlock?.left || 80) - 56), right: 32 }) 
          }}
        />
      )}

      <div
        ref={editorRef} contentEditable onClick={handleEditorClick} onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onKeyDown={handleKeyDown} onPaste={handlePaste} onContextMenu={(e) => onContextMenu(e, editorRef.current)}
        onDragOver={handleDragOver} onDrop={handleDrop}
        className={`wysiwyg-editor w-full min-h-full flex-1 py-6 outline-none resize-none leading-relaxed ${isRTL ? 'pl-6 pr-14 md:pl-10 md:pr-20' : 'pr-6 pl-14 md:pr-10 md:pl-20'}`}
      />
    </div>
  );
};

// ==========================================
// ОСНОВНОЙ КОМПОНЕНТ
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [currentTheme, setCurrentTheme] = useState('light');
  const [currentFont, setCurrentFont] = useState('sans');
  const [currentFontSize, setCurrentFontSize] = useState('base');
  const [currentLang, setCurrentLang] = useState(() => localStorage.getItem('diaryLang') || 'ru');
  
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, editorRef: null });
  const [sidebarContextMenu, setSidebarContextMenu] = useState({ visible: false, x: 0, y: 0, entryId: null });
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [linkModal, setLinkModal] = useState({ visible: false, url: 'https://', title: '' });
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [isOverlayDrawing, setIsOverlayDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  
  const [overlayColor, setOverlayColor] = useState(() => localStorage.getItem('diaryDrawColor') || '#ef4444');
  const [overlayBrushSize, setOverlayBrushSize] = useState(() => Number(localStorage.getItem('diaryDrawSize')) || 3);
  const [clearTrigger, setClearTrigger] = useState(0);

  const fileInputRef = useRef(null);
  const genericFileRef = useRef(null);
  const [savedRange, setSavedRange] = useState(null);
  
  const [expandedGroups, setExpandedGroups] = useState({});

  const t = DICTIONARY[currentLang] || DICTIONARY['ru'];
  const isRTL = currentLang === 'he';
  const localeStr = LANGS.find(l => l.id === currentLang)?.locale || 'ru-RU';

  useEffect(() => { if (!isOverlayDrawing) setIsEraser(false); }, [isOverlayDrawing]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      if (e.key === 'Alt') { e.preventDefault(); setIsOverlayDrawing(prev => !prev); }
      if (isOverlayDrawing && !isInput && e.key === 'Control') setIsEraser(prev => !prev);
      if (isOverlayDrawing && !isInput && e.key === 'Delete') { setActiveEntry(prev => { if (!prev) return prev; return { ...prev, overlay: null }; }); setClearTrigger(prev => prev + 1); }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOverlayDrawing]);

  useEffect(() => { localStorage.setItem('diaryDrawColor', overlayColor); localStorage.setItem('diaryDrawSize', overlayBrushSize); }, [overlayColor, overlayBrushSize]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('diaryTheme'); if (savedTheme && THEMES.find(t => t.id === savedTheme)) setCurrentTheme(savedTheme);
    const savedFont = localStorage.getItem('diaryFont'); if (savedFont && FONTS.find(f => f.id === savedFont)) setCurrentFont(savedFont);
    const savedFontSize = localStorage.getItem('diaryFontSize'); if (savedFontSize && FONT_SIZES.find(f => f.id === savedFontSize)) setCurrentFontSize(savedFontSize);
  }, []);

  const changeTheme = (themeId) => { setCurrentTheme(themeId); localStorage.setItem('diaryTheme', themeId); };
  const changeFont = (fontId) => { setCurrentFont(fontId); localStorage.setItem('diaryFont', fontId); };
  const changeFontSize = (sizeId) => { setCurrentFontSize(sizeId); localStorage.setItem('diaryFontSize', sizeId); };
  const changeLang = (langId) => { setCurrentLang(langId); localStorage.setItem('diaryLang', langId); };

  useEffect(() => {
    if (IS_SANDBOX) {
      const initAuth = async () => {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
          else await signInAnonymously(auth);
        } catch (error) { console.error("Auth error:", error); }
      };
      initAuth();
      const unsubscribeAuth = onAuthStateChanged(auth, setUser);
      return () => unsubscribeAuth();
    } else {
      localDB.getAll().then(data => {
        const sorted = data.sort((a, b) => b.createdAt - a.createdAt);
        setEntries(sorted);
        if (sorted.length > 0) setActiveEntry(sorted[0]);
      });
    }
  }, []);

  useEffect(() => {
    if (!IS_SANDBOX || !user) return;
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'diary_entries');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEntries = snapshot.docs.map(doc => doc.data());
      const sorted = loadedEntries.sort((a, b) => b.createdAt - a.createdAt);
      setEntries(sorted);
      setActiveEntry(current => {
        if (!current && sorted.length > 0) return sorted[0];
        return current ? (sorted.find(e => e.id === current.id) || current) : current;
      });
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClick = () => { setContextMenu(prev => ({ ...prev, visible: false })); setSidebarContextMenu(prev => ({ ...prev, visible: false })); setActiveDropdown(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleEntryClick = async (entry) => {
    if (activeEntry && activeEntry.id !== entry.id) await saveCurrentEntry();
    setActiveEntry(entry);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const createNewEntry = async () => {
    if (activeEntry) await saveCurrentEntry();
    const newId = crypto.randomUUID();
    const newEntry = { id: newId, title: '', content: '<h1><br></h1><p><br></p>', overlay: null, createdAt: Date.now(), updatedAt: Date.now() };
    if (!IS_SANDBOX) {
      await localDB.save(newEntry);
      setEntries(prev => [newEntry, ...prev].sort((a, b) => b.createdAt - a.createdAt));
    } else if (user) {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'diary_entries', newId), newEntry);
    }
    setActiveEntry(newEntry);
    
    const date = new Date(newEntry.createdAt);
    const year = date.getFullYear().toString();
    const month = date.toLocaleString(localeStr, { month: 'long' });
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    setExpandedGroups(prev => ({ ...prev, [year]: true, [`${year}-${monthCap}`]: true }));

    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const saveCurrentEntry = async () => {
    if (!activeEntry) return;
    setIsSaving(true);
    const updatedEntry = { ...activeEntry, updatedAt: Date.now() };
    try {
      if (!IS_SANDBOX) {
        await localDB.save(updatedEntry);
        setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e).sort((a, b) => b.createdAt - a.createdAt));
        setActiveEntry(updatedEntry);
      } else if (user) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'diary_entries', updatedEntry.id), updatedEntry);
      }
    } finally { setTimeout(() => setIsSaving(false), 500); }
  };

  const saveEntryFromSidebar = async (id) => {
    const entryToSave = entries.find(e => e.id === id);
    if (!entryToSave) return;
    const dataToSave = (activeEntry && activeEntry.id === id) ? { ...activeEntry, updatedAt: Date.now() } : { ...entryToSave, updatedAt: Date.now() };
    try {
      if (!IS_SANDBOX) {
        await localDB.save(dataToSave);
        setEntries(prev => prev.map(e => e.id === dataToSave.id ? dataToSave : e).sort((a, b) => b.createdAt - a.createdAt));
        if (activeEntry?.id === id) setActiveEntry(dataToSave);
      } else if (user) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'diary_entries', dataToSave.id), dataToSave);
      }
    } catch (e) { console.error(e); }
  };

  const deleteEntry = async (id) => {
    if (!id) return;
    try {
      if (!IS_SANDBOX) {
        await localDB.delete(id);
        const updatedEntries = entries.filter(e => e.id !== id);
        setEntries(updatedEntries);
        if (activeEntry?.id === id) setActiveEntry(updatedEntries.length > 0 ? updatedEntries[0] : null);
      } else if (user) {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'diary_entries', id));
        if (activeEntry?.id === id) setActiveEntry(prev => { const updated = entries.filter(e => e.id !== prev?.id); return updated.length > 0 ? updated[0] : null; });
      }
    } catch (error) { console.error("Ошибка при удалении:", error); }
  };

  const handleContextMenu = (e, editorNode) => {
    e.preventDefault();
    const sel = window.getSelection();
    if (sel.rangeCount > 0) setSavedRange(sel.getRangeAt(0));
    const x = Math.min(e.clientX, window.innerWidth - 260);
    const y = Math.min(e.clientY, window.innerHeight - 400);
    setContextMenu({ visible: true, x, y, editorRef: editorNode });
  };

  const triggerImageUpload = (e) => { e.preventDefault(); setContextMenu(prev => ({ ...prev, visible: false })); if (fileInputRef.current) fileInputRef.current.click(); };
  const triggerGenericFileUpload = (e) => { e.preventDefault(); setContextMenu(prev => ({ ...prev, visible: false })); if (genericFileRef.current) genericFileRef.current.click(); };
  const openDrawingModal = (e) => { e.preventDefault(); setContextMenu(prev => ({ ...prev, visible: false })); setIsDrawingModalOpen(true); };

  const handleSaveDrawing = (base64Str) => {
    setIsDrawingModalOpen(false);
    if (contextMenu.editorRef) contextMenu.editorRef.focus();
    const sel = window.getSelection();
    sel.removeAllRanges(); if (savedRange) sel.addRange(savedRange);
    const imgHTML = `&nbsp;<div contenteditable="false" class="resizable-image-wrapper" style="width: 400px;"><img src="${base64Str}" alt="Sketch" /></div>&nbsp;`;
    document.execCommand('insertHTML', false, imgHTML);
    if (contextMenu.editorRef) setActiveEntry(prev => ({ ...prev, content: contextMenu.editorRef.innerHTML }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target.result;
      if (contextMenu.editorRef) contextMenu.editorRef.focus();
      const sel = window.getSelection(); sel.removeAllRanges(); if (savedRange) sel.addRange(savedRange);
      const imgHTML = `&nbsp;<div contenteditable="false" class="resizable-image-wrapper" style="width: 300px;"><img src="${base64Str}" alt="Image" /></div>&nbsp;`;
      document.execCommand('insertHTML', false, imgHTML);
      if (contextMenu.editorRef) setActiveEntry(prev => ({ ...prev, content: contextMenu.editorRef.innerHTML }));
    };
    reader.readAsDataURL(file); e.target.value = ''; 
  };

  const handleGenericFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target.result;
      if (contextMenu.editorRef) contextMenu.editorRef.focus();
      const sel = window.getSelection(); sel.removeAllRanges(); if (savedRange) sel.addRange(savedRange);
      const fileHTML = `&nbsp;<a href="${base64Str}" download="${file.name}" class="diary-file" contenteditable="false">📎 ${file.name}</a>&nbsp;`;
      document.execCommand('insertHTML', false, fileHTML);
      if (contextMenu.editorRef) setActiveEntry(prev => ({ ...prev, content: contextMenu.editorRef.innerHTML }));
    };
    reader.readAsDataURL(file); e.target.value = ''; 
  };

  const applyFormat = (e, command, value = null) => {
    e.preventDefault(); 
    if (contextMenu.editorRef) {
      contextMenu.editorRef.focus();
      const sel = window.getSelection();
      sel.removeAllRanges(); if (savedRange) sel.addRange(savedRange);
    }

    if (command === 'inlineCode') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const text = selection.getRangeAt(0).toString();
        document.execCommand('insertHTML', false, `<code>${text || 'code'}</code>`);
      }
    } else if (command === 'checkbox') {
      document.execCommand('insertHTML', false, `<input type="checkbox" class="task-checkbox" /> `);
    } else if (command === 'spoiler') {
      const spoilerHTML = `&nbsp;<details class="diary-spoiler"><summary class="has-placeholder" data-placeholder="${t.spoiler}"><br></summary><p class="has-placeholder" data-placeholder="${t.hiddenText}"><br></p></details>&nbsp;`;
      document.execCommand('insertHTML', false, spoilerHTML);
    } else if (command === 'toggleH1' || command === 'toggleH2' || command === 'toggleH3') {
      const tag = command.replace('toggle', '');
      const spoilerHTML = `&nbsp;<details class="diary-toggle-heading"><summary><${tag} style="display:inline; outline:none;" class="has-placeholder" data-placeholder="${t.spoiler} ${tag}"><br></${tag}></summary><div style="padding-inline-start:15px;"><p class="has-placeholder" data-placeholder="${t.hiddenText}"><br></p></div></details>&nbsp;`;
      document.execCommand('insertHTML', false, spoilerHTML);
    } else if (command === 'bookmark') {
      setLinkModal({ visible: true, url: 'https://', title: '' });
    } else if (command === 'table') {
      const tableHTML = `&nbsp;<table class="diary-table"><tbody><tr><td><p class="has-placeholder" data-placeholder="${t.cellPh}"><br></p></td><td><p class="has-placeholder" data-placeholder="${t.cellPh}"><br></p></td></tr><tr><td><p class="has-placeholder" data-placeholder="${t.cellPh}"><br></p></td><td><p class="has-placeholder" data-placeholder="${t.cellPh}"><br></p></td></tr></tbody></table>&nbsp;`;
      document.execCommand('insertHTML', false, tableHTML);
    } else if (command === 'columns') {
      const num = value;
      let cols = '';
      for(let i=1; i<=num; i++) cols += `<div class="diary-col"><p class="has-placeholder" data-placeholder="${t.colPh} ${i}"><br></p></div>`;
      const colsHTML = `&nbsp;<div class="diary-columns" style="grid-template-columns: repeat(${num}, 1fr);">${cols}</div>&nbsp;`;
      document.execCommand('insertHTML', false, colsHTML);
    } else if (command === 'tabs') {
      const tabsHTML = `&nbsp;<div class="diary-tabs-container" contenteditable="false"><div class="diary-tabs-header"><span class="diary-tab active" contenteditable="true">Tab 1</span><span class="diary-tab" contenteditable="true">Tab 2</span><span class="diary-tab" contenteditable="true">Tab 3</span><button class="diary-add-tab" contenteditable="false" title="+">+</button></div><div class="diary-tabs-body"><div class="diary-tab-content-pane" style="display:block;" contenteditable="true"><p class="has-placeholder" data-placeholder="${t.tabContent} 1..."><br></p></div><div class="diary-tab-content-pane" style="display:none;" contenteditable="true"><p class="has-placeholder" data-placeholder="${t.tabContent} 2..."><br></p></div><div class="diary-tab-content-pane" style="display:none;" contenteditable="true"><p class="has-placeholder" data-placeholder="${t.tabContent} 3..."><br></p></div></div></div>&nbsp;`;
      document.execCommand('insertHTML', false, tabsHTML);
    } else if (command === 'board') {
      const boardHTML = `&nbsp;<div class="diary-kanban" contenteditable="false"><div class="diary-kanban-col"><strong style="color:var(--text-main); display:block; margin-bottom:8px;" contenteditable="true" class="has-placeholder" data-placeholder="${t.todoPh}"><br></strong><div class="diary-card" contenteditable="true"><p class="has-placeholder" data-placeholder="${t.taskPh}"><br></p></div></div><div class="diary-kanban-col"><strong style="color:var(--text-main); display:block; margin-bottom:8px;" contenteditable="true" class="has-placeholder" data-placeholder="${t.inProgressPh}"><br></strong><div class="diary-card" contenteditable="true"><p class="has-placeholder" data-placeholder="${t.taskPh}"><br></p></div></div><div class="diary-kanban-col"><strong style="color:var(--text-main); display:block; margin-bottom:8px;" contenteditable="true" class="has-placeholder" data-placeholder="${t.donePh}"><br></strong><div class="diary-card flex items-start gap-2" contenteditable="true"><span contenteditable="false" class="diary-tristate select-none cursor-pointer text-[1.1em] leading-none" data-state="0">⬜</span><div style="flex:1;"><p class="has-placeholder m-0" data-placeholder="${t.taskPh}"><br></p></div></div></div></div>&nbsp;`;
      document.execCommand('insertHTML', false, boardHTML);
    } else if (command === 'gallery') {
      const galleryHTML = `&nbsp;<div class="diary-columns" style="grid-template-columns: repeat(3, 1fr);" contenteditable="false"><div class="diary-card" contenteditable="true" style="text-align:center;">🖼️<p class="has-placeholder" data-placeholder="${t.descPh}"><br></p></div><div class="diary-card" contenteditable="true" style="text-align:center;">🖼️<p class="has-placeholder" data-placeholder="${t.descPh}"><br></p></div><div class="diary-card" contenteditable="true" style="text-align:center;">🖼️<p class="has-placeholder" data-placeholder="${t.descPh}"><br></p></div></div>&nbsp;`;
      document.execCommand('insertHTML', false, galleryHTML);
    } else if (command === 'emoji') {
      document.execCommand('insertText', false, value);
    } else {
      document.execCommand(command, false, value);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
    if (contextMenu.editorRef) setActiveEntry(prev => ({ ...prev, content: contextMenu.editorRef.innerHTML }));
  };

  const handleInsertBookmark = () => {
    if (contextMenu.editorRef) contextMenu.editorRef.focus();
    const sel = window.getSelection();
    sel.removeAllRanges(); if (savedRange) sel.addRange(savedRange);

    const url = linkModal.url;
    const title = linkModal.title || url;
    if (url && url !== 'https://') {
      // ИСПОЛЬЗУЕМ <span> вместо <div>, чтобы браузер не ломал верстку внутри абзаца <p>
      const bkmkHTML = `&nbsp;<a href="${url}" target="_blank" class="diary-bookmark" contenteditable="false" dir="ltr"><span style="flex-grow:1; min-width:0; display:block;"><strong style="display:block; margin-bottom:4px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</strong><span style="display:block; font-size:0.8em; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${url}</span></span><span style="padding-inline-start:10px; opacity:0.5; flex-shrink:0;">↗</span></a>&nbsp;`;
      document.execCommand('insertHTML', false, bkmkHTML);
      if (contextMenu.editorRef) setActiveEntry(prev => ({ ...prev, content: contextMenu.editorRef.innerHTML }));
    }
    setLinkModal({ visible: false, url: 'https://', title: '' });
  };

  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const currentMonthOrder = useMemo(() => {
    return Array.from({length: 12}, (_, i) => {
      const d = new Date(2024, i, 1);
      const m = d.toLocaleString(localeStr, { month: 'long' });
      return m.charAt(0).toUpperCase() + m.slice(1);
    });
  }, [localeStr]);

  const groupedEntries = useMemo(() => {
    const groups = {};
    entries.forEach(entry => {
      const date = new Date(entry.createdAt);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString(localeStr, { month: 'long' });
      const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
      if (!groups[year]) groups[year] = {};
      if (!groups[year][monthCap]) groups[year][monthCap] = [];
      groups[year][monthCap].push(entry);
    });
    return groups;
  }, [entries, localeStr]);

  const sortedYears = Object.keys(groupedEntries).sort((a, b) => b - a);
  const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString(localeStr, { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' });

  const activeThemeData = THEMES.find(th => th.id === currentTheme) || THEMES[0];
  const activeFontData = FONTS.find(f => f.id === currentFont) || FONTS[0];
  const activeFontSizeData = FONT_SIZES.find(f => f.id === currentFontSize) || FONT_SIZES[1];

  const dynamicStyles = `
    :root {
      --bg-main: ${activeThemeData.bg};
      --bg-sidebar: ${activeThemeData.sidebar};
      --text-main: ${activeThemeData.text};
      --text-muted: ${activeThemeData.textMuted};
      --accent: ${activeThemeData.accent};
      --border: ${activeThemeData.border};
      --font-main: ${activeFontData.family};
      --font-size-base: ${activeFontSizeData.size};
      
      --ph-title: '${t.phTitle}';
      --ph-subtitle: '${t.phSubtitle}';
      --ph-empty: '${t.phEmpty}';
    }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.3); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.5); }
    * { scrollbar-width: thin; scrollbar-color: rgba(156, 163, 175, 0.3) transparent; }
    
    .app-bg { background-color: var(--bg-main); color: var(--text-main); font-family: var(--font-main); }
    .app-sidebar { background-color: var(--bg-sidebar); border-color: var(--border); }
    .app-border { border-color: var(--border); }
    .app-text { color: var(--text-main); }
    .app-text-muted { color: var(--text-muted); }
    .app-accent-bg { background-color: var(--accent); color: ${activeThemeData.id === 'total-black' ? '#000' : '#fff'}; }
    .app-accent-text { color: var(--accent); }
    .app-hover-bg:hover { background-color: var(--bg-main); }

    .wysiwyg-editor { font-size: var(--font-size-base); }
    .wysiwyg-editor > * { position: relative; }
    
    .wysiwyg-editor .has-placeholder { position: relative; }
    .wysiwyg-editor .has-placeholder:empty:before,
    .wysiwyg-editor .has-placeholder:has(> br:only-child):before {
      content: attr(data-placeholder);
      color: var(--text-muted); opacity: 0.5; pointer-events: none; display: inline-block;
      font-weight: normal; position: absolute; white-space: nowrap; overflow: hidden; max-width: 100%;
    }

    .wysiwyg-editor > h1:first-child:empty:before,
    .wysiwyg-editor > h1:first-child:has(> br:only-child):before {
        content: var(--ph-title);
        position: absolute; color: var(--text-muted); opacity: 0.5; pointer-events: none; font-weight: inherit;
    }
    
    .wysiwyg-editor > h1:first-child + p:last-child:empty:before,
    .wysiwyg-editor > h1:first-child + p:last-child:has(> br:only-child):before,
    .wysiwyg-editor > p:first-child:last-child:empty:before,
    .wysiwyg-editor > p:first-child:last-child:has(> br:only-child):before {
        content: var(--ph-subtitle);
        position: absolute; color: var(--text-muted); opacity: 0.35; pointer-events: none; white-space: nowrap; overflow: hidden; max-width: 100%;
    }
    
    .wysiwyg-editor:empty:before,
    .wysiwyg-editor:has(> br:only-child):before {
        content: var(--ph-empty);
        position: absolute; color: var(--text-muted); opacity: 0.35; pointer-events: none;
    }

    .wysiwyg-editor h1 { font-size: 2.25em; font-weight: bold; margin-bottom: 0.5em; margin-top: 0.7em; color: var(--text-main); line-height: 1.2; }
    .wysiwyg-editor h2 { font-size: 1.875em; font-weight: bold; margin-bottom: 0.4em; margin-top: 0.8em; color: var(--text-main); }
    .wysiwyg-editor h3 { font-size: 1.5em; font-weight: 600; margin-bottom: 0.3em; margin-top: 0.8em; color: var(--text-main); }
    .wysiwyg-editor p { margin-bottom: 0.75em; min-height: 1.5em; }
    .wysiwyg-editor blockquote { border-inline-start: 4px solid var(--accent); padding-inline-start: 1rem; color: var(--text-muted); font-style: italic; margin: 1rem 0; background: var(--bg-sidebar); padding-top: 0.5rem; padding-bottom: 0.5rem; border-start-end-radius: 8px; border-end-end-radius: 8px; }
    .wysiwyg-editor ul { list-style-type: disc; margin-inline-start: 1.5rem; margin-bottom: 1rem; }
    .wysiwyg-editor ol { list-style-type: decimal; margin-inline-start: 1.5rem; margin-bottom: 1rem; }
    .wysiwyg-editor b, .wysiwyg-editor strong { font-weight: bold; }
    
    .wysiwyg-editor code { background: var(--bg-sidebar); padding: 0.2em 0.4em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.9em; color: #ef4444; border: 1px solid var(--border); }
    .wysiwyg-editor pre { background: var(--bg-sidebar); padding: 1rem; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, monospace; overflow-x: auto; border: 1px solid var(--border); margin: 1rem 0; color: var(--text-main); position: relative; z-index: 20; direction: ltr; text-align: left; }
    .wysiwyg-editor hr { border: 0; border-bottom: 1px solid var(--border); margin: 2rem 0; }
    .wysiwyg-editor input[type="checkbox"] { accent-color: var(--accent); width: 1.1em; height: 1.1em; transform: translateY(0.15em); margin-inline-end: 0.5rem; cursor: pointer; position: relative; z-index: 20;}
    
    .wysiwyg-editor .diary-table { width: 100%; border-collapse: collapse; margin: 12px 0; position: relative; z-index: 20;}
    .wysiwyg-editor .diary-table td, .wysiwyg-editor .diary-table th { border: 1px solid var(--border); padding: 8px; min-width: 50px; }
    .wysiwyg-editor .diary-columns { display: grid; gap: 16px; margin: 12px 0; position: relative; z-index: 20;}
    .wysiwyg-editor .diary-col { min-height: 40px; padding: 8px; border: 1px dashed var(--border); border-radius: 8px;}
    .wysiwyg-editor .diary-col:hover { border-color: var(--text-muted); }
    .wysiwyg-editor .diary-bookmark { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin: 12px 0; text-decoration: none; color: inherit; background: var(--bg-sidebar); position: relative; z-index: 20; transition: opacity 0.2s;}
    .wysiwyg-editor .diary-bookmark:hover { opacity: 0.8; }
    .wysiwyg-editor .diary-file { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-sidebar); border: 1px solid var(--border); border-radius: 6px; text-decoration: none; color: var(--accent); margin: 4px 0; font-weight: 500; font-size: 0.9em; position: relative; z-index: 20;}
    .wysiwyg-editor .diary-kanban { display: flex; gap: 16px; overflow-x: auto; margin: 12px 0; padding-bottom: 8px; position: relative; z-index: 20; }
    .wysiwyg-editor .diary-kanban-col { min-width: 200px; flex: 1; background: var(--bg-sidebar); border-radius: 8px; padding: 12px; border: 1px solid var(--border); }
    .wysiwyg-editor .diary-card { background: var(--bg-main); border: 1px solid var(--border); padding: 8px; margin-top: 8px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    
    .wysiwyg-editor .diary-tabs-container { background: var(--bg-main); border: 1px solid var(--border); border-radius: 8px; margin: 12px 0; position: relative; z-index: 20; overflow: hidden; }
    .wysiwyg-editor .diary-tabs-header { display: flex; align-items: center; gap: 4px; background: var(--bg-sidebar); padding: 8px 12px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    .wysiwyg-editor .diary-tab { padding: 4px 12px; font-size: 0.85em; font-weight: 600; color: var(--text-muted); border-radius: 6px; cursor: text; transition: all 0.2s; border: 1px solid transparent; }
    .wysiwyg-editor .diary-tab:focus { outline: none; border-color: var(--border); }
    .wysiwyg-editor .diary-tab.active { background: var(--bg-main); color: var(--text-main); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .wysiwyg-editor .diary-add-tab { padding: 4px 8px; font-size: 1.2em; cursor: pointer; border-radius: 6px; color: var(--text-muted); background: transparent; border: none; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-inline-start: auto; }
    .wysiwyg-editor .diary-add-tab:hover { background: var(--bg-main); color: var(--text-main); }
    .wysiwyg-editor .diary-tabs-body { padding: 16px; }

    .wysiwyg-editor .diary-toggle-heading { background: transparent; margin: 1rem 0; position: relative; z-index: 20; }
    .wysiwyg-editor .diary-toggle-heading summary { cursor: pointer; color: var(--text-main); }
    
    .wysiwyg-editor .diary-spoiler { background: var(--bg-sidebar); border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 1rem; margin: 1rem 0; transition: all 0.2s; position: relative; z-index: 20;}
    .wysiwyg-editor .diary-spoiler summary { font-weight: bold; cursor: pointer; outline: none; color: var(--accent); padding: 0.25rem 0; }
    .wysiwyg-editor .diary-spoiler p { margin-top: 0.5rem; }
    
    .wysiwyg-editor .resizable-image-wrapper { 
      resize: both; overflow: hidden; display: inline-block; max-width: 100%; min-width: 80px; min-height: 80px; 
      margin: 1rem 0; border: 1px dashed transparent; padding-inline-end: 5px; padding-bottom: 5px; position: relative; z-index: 20;
    }
    .wysiwyg-editor .resizable-image-wrapper:hover { border-color: var(--accent); border-radius: 8px; }
    .wysiwyg-editor .resizable-image-wrapper img { width: 100%; height: 100%; object-fit: contain; border-radius: 8px; display: block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); pointer-events: none; }
    
    .notion-menu-scroll { max-height: 450px; overflow-y: auto; overflow-x: hidden; }
  `;

  return (
    <div className="flex h-screen app-bg font-sans overflow-hidden transition-colors duration-300" dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{dynamicStyles}</style>

      {isDrawingModalOpen && (
        <DrawingModal onClose={() => setIsDrawingModalOpen(false)} onSave={handleSaveDrawing} t={t} />
      )}

      {linkModal.visible && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="app-sidebar p-5 rounded-2xl shadow-2xl app-border border flex flex-col gap-4 w-full max-w-sm">
            <h3 className="font-bold app-text text-lg">{t.bookmark}</h3>
            <input 
              type="text" 
              value={linkModal.url} 
              onChange={e => setLinkModal({...linkModal, url: e.target.value})}
              placeholder={t.prompts.url}
              className="w-full bg-black/5 border app-border rounded-lg px-3 py-2.5 app-text outline-none focus:border-blue-500 transition-colors"
              dir="ltr"
            />
            <input 
              type="text" 
              value={linkModal.title} 
              onChange={e => setLinkModal({...linkModal, title: e.target.value})}
              placeholder={t.prompts.title}
              className="w-full bg-black/5 border app-border rounded-lg px-3 py-2.5 app-text outline-none focus:border-blue-500 transition-colors"
              dir="auto"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setLinkModal({...linkModal, visible: false})} className="px-4 py-2 rounded-lg app-hover-bg app-text transition-colors font-medium">{t.cancel}</button>
              <button onClick={handleInsertBookmark} className="px-5 py-2 rounded-lg app-accent-bg transition-transform hover:scale-105 shadow-lg font-medium">{t.insert}</button>
            </div>
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      <input type="file" ref={genericFileRef} onChange={handleGenericFileUpload} className="hidden" />

      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`md:hidden fixed top-4 ${isRTL ? 'right-4' : 'left-4'} z-50 app-sidebar p-2 rounded-lg app-border border shadow-lg app-text`}>
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Левая панель */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')} md:translate-x-0 transition-transform duration-300 ease-in-out fixed md:static z-40 h-full w-72 app-sidebar ${isRTL ? 'border-l' : 'border-r'} app-border flex flex-col flex-shrink-0 shadow-2xl md:shadow-none`}>
        
        <div className="px-4 border-b app-border flex justify-between items-center gap-2 h-16 shrink-0">
          <h1 className="text-xl font-bold app-text flex items-center gap-2 truncate">
            <FileText size={24} className="app-accent-text shrink-0" />
            <span className="truncate">{t.diary}</span>
          </h1>
          <div className="flex items-center gap-1.5 shrink-0 relative">
            
            {/* Язык */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'lang' ? null : 'lang'); setSidebarContextMenu({...sidebarContextMenu, visible: false}); setContextMenu({...contextMenu, visible: false}); }}
                className={`flex items-center justify-center w-7 h-7 rounded border border-gray-600/50 transition-colors ${activeDropdown === 'lang' ? 'app-accent-bg border-transparent' : 'bg-transparent app-text app-hover-bg'}`}
                title={t.lang}
              >
                <span className="font-bold text-[10px]">{LANGS.find(l => l.id === currentLang)?.code || 'RU'}</span>
              </button>
              {activeDropdown === 'lang' && (
                <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-2 w-32 app-sidebar border app-border rounded-lg shadow-xl z-[60] overflow-hidden`} onClick={e => e.stopPropagation()}>
                  {LANGS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { changeLang(l.id); setActiveDropdown(null); }}
                      className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-3 py-2 text-xs transition-colors ${currentLang === l.id ? 'app-accent-bg' : 'app-hover-bg app-text'}`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'font' ? null : 'font'); setSidebarContextMenu({...sidebarContextMenu, visible: false}); setContextMenu({...contextMenu, visible: false}); }}
                className={`flex items-center justify-center w-7 h-7 rounded border border-gray-600/50 transition-colors ${activeDropdown === 'font' ? 'app-accent-bg border-transparent' : 'bg-transparent app-text app-hover-bg'}`}
                title={t.font}
              >
                <span className="font-serif font-bold text-[14px]">T</span>
              </button>
              {activeDropdown === 'font' && (
                <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-2 w-44 app-sidebar border app-border rounded-lg shadow-xl z-[60] overflow-hidden`} onClick={e => e.stopPropagation()}>
                  {FONTS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => { changeFont(f.id); setActiveDropdown(null); }}
                      className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-3 py-2 text-xs transition-colors ${currentFont === f.id ? 'app-accent-bg' : 'app-hover-bg app-text'}`}
                      style={{ fontFamily: f.family }}
                    >
                      {f.name.split(' / ')[currentLang === 'ru' ? 1 : 0] || f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'size' ? null : 'size'); setSidebarContextMenu({...sidebarContextMenu, visible: false}); setContextMenu({...contextMenu, visible: false}); }}
                className={`flex items-center justify-center w-7 h-7 rounded border border-gray-600/50 transition-colors ${activeDropdown === 'size' ? 'app-accent-bg border-transparent' : 'bg-transparent app-text app-hover-bg'}`}
                title={t.size}
              >
                <span className="font-bold text-[11px]">pt</span>
              </button>
              {activeDropdown === 'size' && (
                <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-2 w-32 app-sidebar border app-border rounded-lg shadow-xl z-[60] overflow-hidden`} onClick={e => e.stopPropagation()}>
                  {FONT_SIZES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { changeFontSize(s.id); setActiveDropdown(null); }}
                      className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-3 py-2 text-xs transition-colors ${currentFontSize === s.id ? 'app-accent-bg' : 'app-hover-bg app-text'}`}
                    >
                      {s.size}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b app-border flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-wider app-text-muted shrink-0 ${isRTL ? 'ml-2' : 'mr-2'}`}>{t.themes}</span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => changeTheme(theme.id)}
                className={`w-4 h-4 shrink-0 rounded-full border-2 transition-transform ${currentTheme === theme.id ? 'scale-125 border-gray-400 shadow-sm' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: theme.color, boxShadow: theme.id === 'total-black' ? 'inset 0 0 0 1px #333' : 'none' }}
                title={theme.id}
              />
            ))}
          </div>
        </div>

        <div className="p-4 border-b app-border">
          <button onClick={createNewEntry} className="w-full flex items-center justify-center gap-2 app-accent-bg py-2.5 px-4 rounded-lg font-medium transition-opacity hover:opacity-90 shadow-lg">
            <Plus size={18} /> {t.newEntry}
          </button>
        </div>

        {isOverlayDrawing && (
          <div className="px-4 py-3 border-b app-border flex flex-col gap-2 bg-blue-500/5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider app-text-muted flex items-center gap-1"><Pencil size={12}/> {t.tools}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setIsOverlayDrawing(!isOverlayDrawing)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg gap-1 transition-colors border ${isOverlayDrawing ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : 'app-hover-bg app-text-muted hover:app-text border-transparent'}`}
                title={t.draw}
              >
                <Pencil size={16} />
                <div className="flex flex-col items-center leading-none mt-0.5">
                  <span className="text-[9px] font-medium">{t.draw}</span>
                  {!isOverlayDrawing && <span className="text-[8px] opacity-50 mt-1 font-bold">Alt</span>}
                </div>
              </button>

              <button
                onClick={() => setIsEraser(!isEraser)} disabled={!isOverlayDrawing}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg gap-1 transition-colors border ${isEraser ? 'bg-pink-500/10 text-pink-500 border-pink-500/30' : 'app-hover-bg app-text-muted hover:app-text border-transparent'} ${!isOverlayDrawing ? 'opacity-30 cursor-not-allowed' : ''}`}
                title={t.eraser}
              >
                <Eraser size={16} />
                <div className="flex flex-col items-center leading-none mt-0.5">
                  <span className="text-[9px] font-medium">{t.eraser}</span>
                  {isOverlayDrawing && <span className="text-[8px] opacity-50 mt-1 font-bold">Ctrl</span>}
                </div>
              </button>

              <button
                onClick={() => { setActiveEntry(prev => ({...prev, overlay: null})); setClearTrigger(prev => prev + 1); }}
                disabled={!isOverlayDrawing}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg gap-1 transition-colors border border-transparent app-hover-bg app-text-muted hover:text-red-500 ${!isOverlayDrawing ? 'opacity-30 cursor-not-allowed' : ''}`}
                title={t.clear}
              >
                <Trash2 size={16} />
                <div className="flex flex-col items-center leading-none mt-0.5">
                  <span className="text-[9px] font-medium">{t.clear}</span>
                  {isOverlayDrawing && <span className="text-[8px] opacity-50 mt-1 font-bold">Del</span>}
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3 bg-black/5 rounded-lg p-2 border app-border mt-1 justify-center">
              <input type="color" value={overlayColor} onChange={e => setOverlayColor(e.target.value)} disabled={isEraser || !isOverlayDrawing} className={`w-6 h-6 rounded border-0 p-0 bg-transparent ${isEraser || !isOverlayDrawing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} title={t.color} />
              <div className="w-px h-5 app-border border-l"></div>
              <input type="range" min="1" max="20" value={overlayBrushSize} onChange={e => setOverlayBrushSize(Number(e.target.value))} disabled={!isOverlayDrawing} className={`w-20 accent-blue-500 ${!isOverlayDrawing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} title={t.brush} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center app-text-muted p-6 text-sm">{t.noEntries}</div>
          ) : (
            sortedYears.map(year => (
              <div key={year} className="mb-2">
                <button onClick={() => toggleGroup(year)} className={`flex items-center gap-1 w-full ${isRTL ? 'text-right' : 'text-left'} px-2 py-1.5 font-bold app-text app-hover-bg rounded transition-colors`}>
                  {expandedGroups[year] ? <ChevronDown size={16}/> : (isRTL ? <ChevronRight className="rotate-180" size={16}/> : <ChevronRight size={16}/>)} {year}
                </button>
                
                {expandedGroups[year] && (
                  <div className={`px-4 mx-2 ${isRTL ? 'border-r' : 'border-l'} app-border mt-1 space-y-1`}>
                    {Object.keys(groupedEntries[year]).sort((a, b) => currentMonthOrder.indexOf(b) - currentMonthOrder.indexOf(a)).map(month => (
                      <div key={`${year}-${month}`} className="mb-1">
                         <button onClick={() => toggleGroup(`${year}-${month}`)} className={`flex items-center gap-1 w-full ${isRTL ? 'text-right' : 'text-left'} px-2 py-1 text-sm font-semibold app-text-muted app-hover-bg rounded transition-colors`}>
                            {expandedGroups[`${year}-${month}`] ? <ChevronDown size={14}/> : (isRTL ? <ChevronRight className="rotate-180" size={14}/> : <ChevronRight size={14}/>)} {month}
                         </button>
                         
                         {expandedGroups[`${year}-${month}`] && (
                            <div className="px-4 mt-1 space-y-1">
                               {groupedEntries[year][month].map(entry => (
                                 <button
                                    key={entry.id} onClick={() => handleEntryClick(entry)}
                                    onContextMenu={(e) => { e.preventDefault(); setSidebarContextMenu({ visible: true, x: e.clientX, y: e.clientY, entryId: entry.id }); }}
                                    className={`w-full ${isRTL ? 'text-right border-r-2 border-l-0' : 'text-left border-l-2'} p-2 rounded-lg transition-all duration-200 group flex flex-col gap-1 ${activeEntry?.id === entry.id ? 'app-bg' : 'app-text-muted app-hover-bg border-transparent hover:app-text'}`}
                                    style={{ borderColor: activeEntry?.id === entry.id ? 'var(--accent)' : 'transparent' }}
                                  >
                                    <div className="font-medium truncate app-text text-sm">{entry.title || t.untitled}</div>
                                    <div className="text-[10px] app-text-muted flex items-center gap-1"><Calendar size={10} /> {formatDate(entry.createdAt)}</div>
                                  </button>
                               ))}
                            </div>
                         )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 app-bg relative">
        {activeEntry ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className={`h-16 border-b app-border flex items-center justify-between md:px-6 app-sidebar shrink-0 ${isRTL ? 'md:pr-6 pr-16 pl-4' : 'md:pl-6 pl-16 pr-4'} relative`}>
              <input
                type="text" value={activeEntry.title} onChange={(e) => setActiveEntry({...activeEntry, title: e.target.value})}
                placeholder={t.untitled}
                className={`bg-transparent text-xl font-bold app-text outline-none flex-1 min-w-0 ${isRTL ? 'ml-4' : 'mr-4'}`}
                dir="auto"
              />
              <div className="flex items-center gap-1 sm:gap-2">
                
                <button
                  onClick={() => setIsOverlayDrawing(false)}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${!isOverlayDrawing ? 'bg-blue-500/15 text-blue-500' : 'app-hover-bg app-text-muted hover:app-text'}`}
                  title={t.textMode}
                >
                  <Type size={20} />
                  {isOverlayDrawing && <span className="absolute bottom-[3px] text-[8px] font-bold opacity-50 leading-none pointer-events-none">Alt</span>}
                </button>
                
                <button
                  onClick={() => setIsOverlayDrawing(true)}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${isOverlayDrawing ? 'bg-blue-500/15 text-blue-500' : 'app-hover-bg app-text-muted hover:app-text'}`}
                  title={t.drawMode}
                >
                  <Pencil size={20} />
                  {!isOverlayDrawing && <span className="absolute bottom-[3px] text-[8px] font-bold opacity-50 leading-none pointer-events-none">Alt</span>}
                </button>

                <div className="h-6 w-px app-border border-l mx-1 hidden sm:block"></div>

                <button onClick={saveCurrentEntry} disabled={isSaving} className={`flex items-center gap-2 app-accent-bg px-4 py-2 rounded-md text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-90 shadow-sm ${isRTL ? 'mr-1' : 'ml-1'}`}>
                  <Save size={16} /> <span className="hidden sm:inline">{isSaving ? t.saving : t.save}</span>
                </button>
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto w-full relative ${isOverlayDrawing ? 'select-none' : ''}`}>
              <div className="relative min-h-full flex flex-col w-full">
                
                <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col relative z-0">
                  <WYSIWYGEditor 
                    entryId={activeEntry.id} 
                    initialContent={activeEntry.content} 
                    onChange={(html) => setActiveEntry(prev => ({...prev, content: html}))} 
                    onContextMenu={handleContextMenu}
                    isDrawingMode={isOverlayDrawing}
                    isRTL={isRTL}
                    t={t}
                  />
                </div>

                <CanvasOverlay 
                  entryId={activeEntry.id} isDrawingMode={isOverlayDrawing} overlayData={activeEntry.overlay} 
                  onSave={(dataUrl) => setActiveEntry(prev => ({...prev, overlay: dataUrl}))} 
                  color={overlayColor} lineWidth={overlayBrushSize} clearTrigger={clearTrigger} isEraser={isEraser}
                  onExitMode={() => setIsOverlayDrawing(false)}
                />
              </div>
            </div>

            <div className="h-10 border-t app-border flex items-center px-4 md:px-6 text-xs app-text-muted app-sidebar shrink-0 justify-between" dir="auto">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="flex items-center gap-1" title={t.created}>
                  <Calendar size={12}/> <span className="hidden sm:inline">{t.created}</span> {formatDate(activeEntry.createdAt)} {formatTime(activeEntry.createdAt)}
                </span>
                <span className="hidden sm:inline w-px h-3 app-border border-l"></span>
                <span className="flex items-center gap-1" title={t.updated}>
                  <Clock size={12}/> <span className="hidden sm:inline">{t.updated}</span> {formatDate(activeEntry.updatedAt)} {formatTime(activeEntry.updatedAt)}
                </span>
              </div>
              <span className="hidden md:inline">{isOverlayDrawing ? t.drawHint : t.menuHint}</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center app-text-muted p-8 text-center">
            <FileText size={64} className="mb-6 opacity-20" />
            <h2 className="text-2xl font-semibold mb-2 app-text">{t.emptyDiary}</h2>
            <button onClick={createNewEntry} className="flex items-center gap-2 app-accent-bg py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-90 shadow-lg mt-4"><Plus size={20} /> {t.createPage}</button>
          </div>
        )}

        {sidebarContextMenu.visible && (
          <div 
            className="fixed z-[70] flex flex-col py-1.5 rounded-lg shadow-2xl border app-sidebar app-border text-sm w-40"
            style={{ top: sidebarContextMenu.y, left: sidebarContextMenu.x }}
          >
            <button onMouseDown={(e) => { e.preventDefault(); saveEntryFromSidebar(sidebarContextMenu.entryId); setSidebarContextMenu({...sidebarContextMenu, visible: false}); }} className={`flex items-center gap-3 px-4 py-2 hover:bg-opacity-50 app-hover-bg app-text ${isRTL ? 'text-right' : 'text-left'} w-full`}>
              <Save size={14} /> {t.save}
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); deleteEntry(sidebarContextMenu.entryId); setSidebarContextMenu({...sidebarContextMenu, visible: false}); }} className={`flex items-center gap-3 px-4 py-2 hover:bg-opacity-50 app-hover-bg text-red-500 ${isRTL ? 'text-right' : 'text-left'} w-full`}>
              <Trash2 size={14} /> {t.delete}
            </button>
          </div>
        )}

        {/* ОГРОМНОЕ МЕНЮ БЛОКОВ */}
        {contextMenu.visible && (
          <div 
            className="fixed z-50 flex flex-col py-2 rounded-xl shadow-2xl border app-sidebar app-border text-sm notion-menu-scroll w-[280px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            dir="ltr"
          >
            {/* Текст & Рисование */}
            <div className="flex items-center justify-between px-3 pb-2 border-b app-border">
              <button onMouseDown={(e) => applyFormat(e, 'bold')} className="p-1.5 rounded app-hover-bg app-text hover:text-blue-500 transition-colors" title={t.bold}><Bold size={16} /></button>
              <button onMouseDown={(e) => applyFormat(e, 'italic')} className="p-1.5 rounded app-hover-bg app-text hover:text-blue-500 transition-colors" title={t.italic}><Italic size={16} /></button>
              <button onMouseDown={(e) => applyFormat(e, 'underline')} className="p-1.5 rounded app-hover-bg app-text hover:text-blue-500 transition-colors" title={t.underline}><UnderlineIcon size={16} /></button>
              <button onMouseDown={(e) => applyFormat(e, 'strikeThrough')} className="p-1.5 rounded app-hover-bg app-text hover:text-blue-500 transition-colors" title={t.strike}><Strikethrough size={16} /></button>
              <button onMouseDown={(e) => applyFormat(e, 'inlineCode')} className="p-1.5 rounded app-hover-bg text-red-400 hover:text-red-500 transition-colors" title={t.code}><Code size={16} /></button>
              <div className="w-px h-4 app-border border-l mx-1"></div>
              <button onMouseDown={(e) => applyFormat(e, 'removeFormat')} className="p-1.5 rounded app-hover-bg text-gray-500 hover:text-red-500 transition-colors" title={t.clearStyle}><RemoveFormatting size={16} /></button>
            </div>

            {/* Выравнивание */}
            <div className="flex items-center px-3 py-1 border-b app-border bg-black/5">
              <button onMouseDown={(e) => applyFormat(e, 'justifyLeft')} className="flex-1 flex justify-center p-1.5 rounded app-hover-bg app-text"><AlignLeft size={16} /></button>
              <button onMouseDown={(e) => applyFormat(e, 'justifyCenter')} className="flex-1 flex justify-center p-1.5 rounded app-hover-bg app-text"><AlignCenter size={16} /></button>
              <button onMouseDown={(e) => applyFormat(e, 'justifyRight')} className="flex-1 flex justify-center p-1.5 rounded app-hover-bg app-text"><AlignRight size={16} /></button>
            </div>

            {/* Опция рисования */}
            <div className="p-1 border-b app-border bg-blue-500/5">
              <button onMouseDown={(e) => { e.preventDefault(); setIsOverlayDrawing(true); setContextMenu(prev => ({ ...prev, visible: false })); }} className="flex items-center gap-3 px-3 py-1.5 rounded hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
                <div className="p-1 rounded bg-blue-500/20 text-blue-400 group-hover:text-blue-300 border border-blue-500/20"><Pencil size={14} /></div> 
                <div className="flex flex-col">
                  <span className="leading-tight font-medium">{t.drawOver}</span>
                  <span className="text-[9px] app-text-muted leading-tight mt-0.5">{t.hotkey}: Alt</span>
                </div>
              </button>
            </div>

            {/* ЭМОДЗИ */}
            <div className="px-3 py-1.5 mt-1 text-[10px] app-text-muted uppercase tracking-wider font-bold">{t.emoji}</div>
            <div className="grid grid-cols-5 gap-1 px-3 py-1">
              {EMOJIS.map(emoji => (
                <button key={emoji} onMouseDown={(e) => applyFormat(e, 'emoji', emoji)} className="flex items-center justify-center p-1.5 text-lg rounded app-hover-bg transition-transform hover:scale-125">{emoji}</button>
              ))}
            </div>
            
            {/* БАЗОВЫЕ БЛОКИ */}
            <div className="px-3 py-1.5 mt-2 text-[10px] app-text-muted uppercase tracking-wider font-bold border-t app-border pt-3">{t.basicBlocks}</div>
            <button onMouseDown={(e) => applyFormat(e, 'tabs')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Layers size={14} /></div> {t.tabs}
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'H1')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Heading1 size={14} /></div>
              <div className="flex flex-col"><span className="leading-tight">{t.h1}</span><span className="text-[9px] app-text-muted leading-tight"># {t.space}</span></div>
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'H2')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Heading2 size={14} /></div>
              <div className="flex flex-col"><span className="leading-tight">{t.h2}</span><span className="text-[9px] app-text-muted leading-tight">## {t.space}</span></div>
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'H3')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Heading3 size={14} /></div>
              <div className="flex flex-col"><span className="leading-tight">{t.h3}</span><span className="text-[9px] app-text-muted leading-tight">### {t.space}</span></div>
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'BLOCKQUOTE')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Quote size={14} /></div>
              <div className="flex flex-col"><span className="leading-tight">{t.quote}</span><span className="text-[9px] app-text-muted leading-tight">{'>'} {t.space}</span></div>
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'PRE')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><SquareTerminal size={14} /></div> {t.codeBlock}
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'insertHorizontalRule')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Minus size={14} /></div> {t.divider}
            </button>

            {/* МЕДИА И ФАЙЛЫ */}
            <div className="px-3 py-1.5 mt-2 text-[10px] app-text-muted uppercase tracking-wider font-bold border-t app-border pt-3">{t.mediaFiles}</div>
            <button onMouseDown={triggerImageUpload} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><ImageIcon size={14} /></div> {t.image}
            </button>
            <button onMouseDown={openDrawingModal} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Pencil size={14} /></div> {t.drawSketch}
            </button>
            <button onMouseDown={triggerGenericFileUpload} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Paperclip size={14} /></div> {t.attachFile}
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'bookmark')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Link size={14} /></div> {t.bookmark}
            </button>
            
            {/* СТРУКТУРА: КОЛОНКИ И ТАБЛИЦЫ */}
            <div className="px-3 py-1.5 mt-2 text-[10px] app-text-muted uppercase tracking-wider font-bold border-t app-border pt-3">{t.structure}</div>
            <button onMouseDown={(e) => applyFormat(e, 'table')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Table2 size={14} /></div> {t.table}
            </button>
            <div className="px-4 py-1 flex items-center justify-between">
              <span className="text-xs text-muted">{t.columns}</span>
              <div className="flex gap-1">
                {[2,3,4,5].map(num => (
                  <button key={num} onMouseDown={(e) => applyFormat(e, 'columns', num)} className="px-2 py-1 bg-black/5 hover:bg-black/10 border app-border rounded text-xs transition-colors">{num}</button>
                ))}
              </div>
            </div>

            {/* СПИСКИ И СПОЙЛЕРЫ */}
            <div className="px-3 py-1.5 mt-2 text-[10px] app-text-muted uppercase tracking-wider font-bold border-t app-border pt-3">{t.listsSpoilers}</div>
            <button onMouseDown={(e) => applyFormat(e, 'checkbox')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><CheckSquare size={14} /></div> {t.todo}
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'insertUnorderedList')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><List size={14} /></div> {t.dots}
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'insertOrderedList')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><ListOrdered size={14} /></div> {t.numbers}
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'spoiler')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><EyeOff size={14} /></div> {t.spoiler}
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'toggleH1')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Heading1 size={14} /></div> {t.spH1}
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'toggleH2')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Heading2 size={14} /></div> {t.spH2}
            </button>

            {/* БАЗЫ ДАННЫХ */}
            <div className="px-3 py-1.5 mt-2 text-[10px] app-text-muted uppercase tracking-wider font-bold border-t app-border pt-3">{t.db}</div>
            <button onMouseDown={(e) => applyFormat(e, 'board')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><Columns size={14} /></div> {t.board}
            </button>
            <button onMouseDown={(e) => applyFormat(e, 'gallery')} className="flex items-center gap-3 px-4 py-1.5 hover:bg-opacity-50 app-hover-bg app-text text-left w-full group">
              <div className="p-1 rounded bg-black/10 group-hover:bg-white/10 border app-border"><LayoutGrid size={14} /></div> {t.gallery}
            </button>

            {/* ЦВЕТА */}
            <div className="px-3 py-1.5 mt-2 text-[10px] app-text-muted uppercase tracking-wider font-bold border-t app-border pt-3">{t.textColor}</div>
            <div className="flex gap-1 px-4 py-1">
              {['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'].map(color => (
                <button key={'c'+color} onMouseDown={(e) => applyFormat(e, 'foreColor', color)} className="w-6 h-6 rounded-full hover:scale-110 transition-transform" style={{backgroundColor: color}} title={t.textColor} />
              ))}
            </div>

            <div className="px-3 py-1.5 text-[10px] app-text-muted uppercase tracking-wider font-bold pt-2">{t.bgColor}</div>
            <div className="flex gap-1 px-4 py-1 pb-2">
              {['#fca5a5', '#93c5fd', '#86efac', '#fde047', '#d8b4fe'].map(color => (
                <button key={'bg'+color} onMouseDown={(e) => applyFormat(e, 'hiliteColor', color)} className="w-6 h-6 rounded hover:scale-110 transition-transform opacity-80 hover:opacity-100" style={{backgroundColor: color}} title={t.bgColor} />
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}