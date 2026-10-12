import DOMPurify from 'dompurify';

export const newId = () => crypto.randomUUID();
export const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function safeURL(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function cleanHTML(html) {
  const root = document.createElement('div');
  root.innerHTML = DOMPurify.sanitize(html || '', { ADD_ATTR: ['contenteditable', 'download', 'checked'], ADD_DATA_URI_TAGS: ['a'], ALLOWED_URI_REGEXP: /^(?:(?:https?|diary-asset|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i });
  root.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('data:') && !link.hasAttribute('download')) link.removeAttribute('href');
    link.setAttribute('rel', 'noopener noreferrer');
  });
  root.querySelectorAll('[style]').forEach(el => { if (/url\s*\(|expression\s*\(|position\s*:\s*(fixed|absolute)/i.test(el.getAttribute('style'))) el.removeAttribute('style'); });
  root.querySelectorAll('.database-mount').forEach(el => el.replaceChildren());
  return root.innerHTML;
}
export function snapshotHTML(editor) {
  editor.querySelectorAll('input[type="checkbox"]').forEach(el => el.toggleAttribute('checked', el.checked));
  const ids = new Set();
  editor.querySelectorAll(':scope > *, li, .diary-col > *, .diary-tab-content-pane > *').forEach(el => {
    if (!el.dataset.blockId || ids.has(el.dataset.blockId)) el.dataset.blockId = newId();
    ids.add(el.dataset.blockId);
  });
  const clone = editor.cloneNode(true);
  clone.querySelectorAll('.database-mount').forEach(el => el.replaceChildren());
  return clone.innerHTML;
}
export function toEntry(entry) {
  const root = document.createElement('div'); root.innerHTML = cleanHTML(entry.content);
  for (const node of [...root.childNodes]) { if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) { const p = document.createElement('p'); p.textContent = node.textContent; node.replaceWith(p); } }
  snapshotHTML(root);
  const typeOf = el => el.classList.contains('diary-database') ? 'database' : el.classList.contains('resizable-image-wrapper') ? 'image' : el.querySelector('input[type="checkbox"]') ? 'todo' : ({ P: 'text', H1: 'heading1', H2: 'heading2', H3: 'heading3', UL: 'bulleted-list', OL: 'numbered-list', DETAILS: 'toggle', TABLE: 'table', PRE: 'code', BLOCKQUOTE: 'quote', HR: 'divider' }[el.tagName] || 'layout');
  const blocks = [...root.children].map(el => ({ id: el.dataset.blockId, type: typeOf(el), html: el.outerHTML, children: [...el.querySelectorAll('[data-block-id]')].map(child => ({ id: child.dataset.blockId, type: typeOf(child) })) }));
  let databaseText='';root.querySelectorAll('.diary-database').forEach(node=>{try{const data=JSON.parse(decodeURIComponent(node.dataset.database));databaseText+=' '+data.title+' '+data.rows.map(row=>row.title+' '+row.body+' '+Object.values(row.values||{}).join(' ')).join(' ');}catch{/* Keep legacy blocks readable. */}});
  return { ...entry, schemaVersion: 2, content: root.innerHTML, blocks, searchText: (root.textContent+' '+databaseText).replace(/\s+/g, ' ').slice(0, 200000) };
}
export function emptyEntry(parentId = null) { return toEntry({ id: newId(), title: '', content: '<p><br></p>', overlay: null, parentId, createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null, favorite: false, locked: false }); }
export function cloneEntry(entry) {
  const root = document.createElement('div'); root.innerHTML = entry.content;
  root.querySelectorAll('[data-block-id]').forEach(el => el.dataset.blockId = newId());
  return toEntry({ ...entry, id: newId(), title: `${entry.title || 'Без названия'} — копия`, content: root.innerHTML, createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null });
}
export function canMovePage(entries, id, parentId) {
  const visited = new Set([id]); let current = parentId;
  while (current) { if (visited.has(current)) return false; visited.add(current); current = entries.find(e => e.id === current)?.parentId; }
  return true;
}
export function databaseHTML(view = 'table') {
  const data = { id: newId(), view, title: 'База записей', rows: [], properties: [{ id: 'status', name: 'Статус', type: 'select', options: ['К выполнению', 'В процессе', 'Готово'] }, { id: 'date', name: 'Дата', type: 'date' }], filter: '', sort: 'created', group: 'status' };
  return `<div class="diary-database" contenteditable="false" data-block-id="${newId()}" data-database="${encodeURIComponent(JSON.stringify(data))}"><div class="database-mount"></div></div><p><br></p>`;
}
