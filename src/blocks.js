import { databaseHTML, escapeHTML } from './model';
export function blockItems(t) {
  return [
    ['text', 'Обычный текст', 'Текст', 'Начать новый абзац.'],
    ['h1', t.h1, 'Текст', 'Крупный заголовок раздела.'], ['h2', t.h2, 'Текст', 'Средний заголовок подраздела.'], ['h3', t.h3, 'Текст', 'Небольшой заголовок.'],
    ['bullet', 'Список с точками', 'Списки', 'Пункты без нумерации.'], ['number', 'Нумерованный список', 'Списки', 'Пункты с последовательными номерами.'], ['todo', 'Список задач', 'Списки', 'Задачи с галочками выполнения.'], ['toggle', 'Раскрывающийся блок', 'Списки', 'Текст, который можно свернуть и раскрыть.'],
    ['toggleH1', t.spH1, 'Списки', 'Крупный заголовок со скрываемым содержимым.'], ['toggleH2', t.spH2, 'Списки', 'Средний заголовок со скрываемым содержимым.'],
    ['quote', t.quote, 'Выделение', 'Цитата с полосой слева.'], ['callout', 'Выделенная заметка', 'Выделение', 'Текст в рамке с эмодзи.'], ['code', t.codeBlock, 'Выделение', 'Фрагмент кода моноширинным шрифтом.'], ['divider', t.divider, 'Выделение', 'Горизонтальная линия между разделами.'],
    ['table', 'Простая таблица', 'Структура', 'Строки и столбцы с текстом в ячейках.'], ['columns2', 'Две колонки', 'Структура', 'Два фрагмента текста рядом.'], ['columns3', 'Три колонки', 'Структура', 'Три фрагмента текста рядом.'], ['columns4', 'Четыре колонки', 'Структура', 'Четыре фрагмента текста рядом.'], ['columns5', 'Пять колонок', 'Структура', 'Пять фрагментов текста рядом.'], ['tabs', 'Вкладки', 'Структура', 'Переключение между разделами одного блока.'], ['toc', 'Оглавление', 'Структура', 'Ссылки на заголовки этой страницы.'], ['pageLink', 'Ссылка на страницу', 'Структура', 'Переход к другой записи в дневнике.'],
    ['image', t.image, 'Файлы и ссылки', 'Добавить изображение с компьютера.'], ['file', t.attachFile, 'Файлы и ссылки', 'Прикрепить файл к записи.'], ['sketch', t.drawSketch, 'Файлы и ссылки', 'Нарисовать и вставить рисунок в страницу.'], ['bookmark', t.bookmark, 'Файлы и ссылки', 'Добавить ссылку на сайт с названием.'],
    ['database', 'Карточки в таблице', 'Карточки', 'Задачи со статусами, датами и своими полями.'], ['board', 'Доска задач', 'Карточки', 'Карточки в колонках по статусу.'], ['gallery', 'Галерея карточек', 'Карточки', 'Карточки в виде сетки.'],
  ].map(([id, label, group, description])=>({id,label,group,description,preview:id,keywords: id === 'board' ? 'канбан board' : id === 'todo' ? 'to-do todo чекбокс' : id === 'database' ? 'база database' : ''}));
}
export function blockHTML(id, t) {
  const placeholder = text => `<p class="has-placeholder" data-placeholder="${escapeHTML(text)}"><br></p>`;
  const simple = { text: '<p><br></p>', h1: '<h1><br></h1>', h2: '<h2><br></h2>', h3: '<h3><br></h3>', bullet: '<ul><li><br></li></ul>', number: '<ol><li><br></li></ol>', todo: '<p><input type="checkbox" class="task-checkbox"> Задача</p>', quote: '<blockquote><br></blockquote>', code: '<pre><br></pre>', divider: '<hr><p><br></p>', callout: '<div class="diary-callout">💡 <span>Заметка</span></div>', toggle: `<details class="diary-spoiler"><summary>Заголовок</summary>${placeholder(t.hiddenText)}</details><p><br></p>` };
  if(simple[id])return simple[id];
  if(id.startsWith('toggleH'))return `<details class="diary-toggle-heading"><summary><${id.slice(6).toLowerCase()}>Заголовок</${id.slice(6).toLowerCase()}></summary>${placeholder(t.hiddenText)}</details><p><br></p>`;
  if(id === 'table')return `<table class="diary-table"><tbody>${Array.from({length:2},()=>`<tr><td>${placeholder(t.cellPh)}</td><td>${placeholder(t.cellPh)}</td></tr>`).join('')}</tbody></table><p><br></p>`;
  if(id.startsWith('columns')){const n=Number(id.slice(7));return `<div class="diary-columns" style="grid-template-columns:repeat(${n},1fr)">${Array.from({length:n},(_,i)=>`<div class="diary-col">${placeholder(`${t.colPh} ${i+1}`)}</div>`).join('')}</div><p><br></p>`;}
  if(id==='tabs')return `<div class="diary-tabs-container" contenteditable="false"><div class="diary-tabs-header"><span class="diary-tab active" contenteditable="true">Tab 1</span><span class="diary-tab" contenteditable="true">Tab 2</span><button class="diary-add-tab" contenteditable="false">+</button></div><div class="diary-tabs-body"><div class="diary-tab-content-pane" contenteditable="true">${placeholder(t.tabContent)}</div><div class="diary-tab-content-pane" style="display:none" contenteditable="true">${placeholder(t.tabContent)}</div></div></div><p><br></p>`;
  if(['database','board','gallery'].includes(id))return databaseHTML(id==='database'?'table':id);
  return '';
}
