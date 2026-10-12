import { databaseHTML, escapeHTML } from './model';
export function blockItems(t) {
  return [
    ['text', 'Обычный текст', 'Текст'], ['h1', t.h1, 'Заголовки'], ['h2', t.h2, 'Заголовки'], ['h3', t.h3, 'Заголовки'],
    ['bullet', t.dots, 'Списки'], ['number', t.numbers, 'Списки'], ['todo', t.todo, 'Списки'], ['toggle', t.spoiler, 'Списки'],
    ['toggleH1', t.spH1, 'Списки'], ['toggleH2', t.spH2, 'Списки'], ['quote', t.quote, 'Текст'], ['callout', 'Выноска', 'Текст'], ['code', t.codeBlock, 'Текст'], ['divider', t.divider, 'Текст'],
    ['table', t.table, 'Структура'], ['columns2', 'Две колонки', 'Структура'], ['columns3', 'Три колонки', 'Структура'], ['columns4', 'Четыре колонки', 'Структура'], ['columns5', 'Пять колонок', 'Структура'], ['tabs', t.tabs, 'Структура'], ['toc', 'Оглавление', 'Структура'], ['pageLink', 'Ссылка на страницу', 'Структура'],
    ['image', t.image, 'Медиа'], ['file', t.attachFile, 'Медиа'], ['sketch', t.drawSketch, 'Медиа'], ['bookmark', t.bookmark, 'Медиа'],
    ['database', 'База: таблица', 'Базы данных'], ['board', t.board, 'Базы данных'], ['gallery', t.gallery, 'Базы данных'],
  ].map(([id, label, group])=>({id,label,group}));
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
