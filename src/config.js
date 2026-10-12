export const LANGS = [
  { id: 'ru', code: 'RU', name: 'Русский', locale: 'ru-RU' },
  { id: 'en', code: 'EN', name: 'English', locale: 'en-US' },
  { id: 'de', code: 'DE', name: 'Deutsch', locale: 'de-DE' },
  { id: 'es', code: 'ES', name: 'Español', locale: 'es-ES' },
  { id: 'he', code: 'HE', name: 'עברית', locale: 'he-IL', rtl: true }
];

export const DICTIONARY = {
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

export const THEMES = [
  { id: 'slate', color: '#334155', bg: '#020617', sidebar: '#0f172a', text: '#f8fafc', textMuted: '#94a3b8', accent: '#3b82f6', border: '#1e293b' },
  { id: 'total-black', color: '#000000', bg: '#000000', sidebar: '#0a0a0a', text: '#ffffff', textMuted: '#a3a3a3', accent: '#ffffff', border: '#262626' },
  { id: 'light', color: '#e2e8f0', bg: '#ffffff', sidebar: '#f8fafc', text: '#0f172a', textMuted: '#64748b', accent: '#2563eb', border: '#e2e8f0' },
  { id: 'sepia', color: '#d4c4a8', bg: '#fdf6e3', sidebar: '#eee8d5', text: '#475569', textMuted: '#94a3b8', accent: '#d33682', border: '#e5e7eb' },
  { id: 'forest', color: '#166534', bg: '#052e16', sidebar: '#14532d', text: '#ecfdf5', textMuted: '#6ee7b7', accent: '#22c55e', border: '#166534' },
  { id: 'ocean', color: '#155e75', bg: '#083344', sidebar: '#164e63', text: '#ecfeff', textMuted: '#67e8f9', accent: '#06b6d4', border: '#155e75' }
];

export const FONTS = [
  { id: 'sans', name: 'System / Системный', family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'serif', name: 'Classic / Классика', family: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
  { id: 'mono', name: 'Code / Код', family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { id: 'rounded', name: 'Rounded / Округлый', family: '"Nunito", "Segoe UI Rounded", ui-sans-serif, system-ui, sans-serif' }
];

export const FONT_SIZES = [
  { id: 'sm', size: '14px' },
  { id: 'base', size: '16px' },
  { id: 'lg', size: '18px' },
  { id: 'xl', size: '20px' }
];

export const EMOJIS = ['😀', '😂', '🥰', '😎', '🥺', '😭', '😡', '💀', '👽', '💩', '👻', '❤️', '🔥', '✨', '💡', '📌', '✅', '❌', '🎉', '🚀'];
