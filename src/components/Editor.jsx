import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { marked } from 'marked';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { cleanHTML, snapshotHTML } from '../model';
import DatabaseBlock from './DatabaseBlock';
export default function WYSIWYGEditor({ entryId, initialContent, onChange, onContextMenu, isDrawingMode, isRTL, t, locked, editorAPIRef, onOpenPage }) {
  const wrapperRef = useRef(null);
  const editorRef = useRef(null);
  const draggedNodesRef = useRef([]);
  const [hoverBlock, setHoverBlock] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [databaseHosts, setDatabaseHosts] = useState([]);
  const history = useRef({ id: null, items: [], index: -1, time: 0 });
  const discoverDatabases = useCallback(() => {
    if (editorRef.current) setDatabaseHosts([...editorRef.current.querySelectorAll('.diary-database')]);
  }, []);
  const remember = useCallback((html, typing = false) => {
    const h = history.current;
    if (h.items[h.index] === html) return;
    h.items = h.items.slice(0, h.index + 1);
    if (typing && h.index > 0 && Date.now() - h.time < 600) h.items[h.index] = html;
    else { h.items.push(html); if (h.items.length > 80) h.items.shift(); h.index = h.items.length - 1; }
    h.time = typing ? Date.now() : 0;
  }, []);
  const commit = useCallback((typing = false) => {
    if (!editorRef.current || locked) return;
    const html = snapshotHTML(editorRef.current); remember(html, typing); onChange(html); discoverDatabases();
  }, [locked, remember, onChange, discoverDatabases]);
  const undo = useCallback((direction = -1) => {
    const h = history.current; const index = h.index + direction;
    if (locked || index < 0 || index >= h.items.length) return;
    h.index = index; h.time = 0; editorRef.current.innerHTML = cleanHTML(h.items[index]);
    onChange(h.items[index]); discoverDatabases();
  }, [locked, onChange, discoverDatabases]);
  useEffect(() => {
    if (!editorAPIRef) return;
    editorAPIRef.current = { node: editorRef.current, commit, undo: () => undo(-1), redo: () => undo(1) };
    return () => { editorAPIRef.current = null; };
  }, [editorAPIRef, commit, undo]);

  useEffect(() => { document.execCommand('defaultParagraphSeparator', false, 'p'); }, []);

  const getInitialHtml = (text) => {
    if (!text) return '';
    if (/<[a-z][\s\S]*>/i.test(text)) return cleanHTML(text);
    return cleanHTML(marked.parse(text));
  };

  useEffect(() => {
    const editor = editorRef.current; if (!editor) return;
    const html = getInitialHtml(initialContent);
    if (editor.dataset.id !== entryId) {
      editor.innerHTML = html; editor.dataset.id = entryId;
      history.current = { id: entryId, items: [snapshotHTML(editor)], index: 0, time: 0 };
      requestAnimationFrame(discoverDatabases);
    } else if (snapshotHTML(editor) !== html) {
      editor.innerHTML = html; remember(snapshotHTML(editor)); requestAnimationFrame(discoverDatabases);
    }
    editor.querySelectorAll('input[type="checkbox"]').forEach(el => el.disabled = Boolean(locked));
  }, [entryId, initialContent, locked, discoverDatabases, remember]);

  useEffect(() => {
    if (!editorRef.current) return;
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'style' && m.target.classList.contains('resizable-image-wrapper')) shouldUpdate = true;
      });
      if (shouldUpdate) commit();
    });
    observer.observe(editorRef.current, { attributes: true, subtree: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [commit]);

  const handleEditorClick = (e) => {
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (checkbox) { checkbox.toggleAttribute('checked', checkbox.checked); commit(); return; }
    const link = e.target.closest('a');

    // Перехватываем клики по ВСЕМ ссылкам (веб-закладкам и файлам)
    if (link && link.href) {
      e.preventDefault();
      e.stopPropagation();
      if (link.getAttribute('href')?.startsWith('#page/')) { onOpenPage?.(link.getAttribute('href').slice(6)); return; }
      if (window.diary) {
        const action = link.href.startsWith('diary-asset:') ? window.diary.openAsset(link.href,link.getAttribute('download')) : window.diary.openExternal(link.href);
        action.catch(error => window.dispatchEvent(new CustomEvent('diary-error', { detail: error.message })));
        return;
      }

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
      commit();
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
          commit();
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
      commit();
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
    commit();
    onContextMenu(e, editorRef.current, 'insert');
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
    onContextMenu(e, editorRef.current, 'block');
  };

  const handleDeleteBlock = (e) => {
    e.preventDefault(); e.stopPropagation();
    const blocksToDelete = getSelectedBlocks();
    if (blocksToDelete.length === 0) return;
    blocksToDelete.forEach(node => {
      if (['TD', 'TH', 'SUMMARY'].includes(node.nodeName)) node.innerHTML = '<br>'; else node.remove();
    });
    commit();
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

  const handleDragEnd = () => {
    if (draggedNodesRef.current) draggedNodesRef.current.forEach(n => n.style.opacity = '1');
    draggedNodesRef.current = [];
    setDropTarget(null);
    commit();
  };

  const handleDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/x-diary-card')) return;
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
      setDropTarget({ top: (position === 'before' ? rect.top : rect.bottom) - wrapperRef.current.getBoundingClientRect().top, node: targetNode, position });
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
      commit();
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
          commit();
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
    const pasted = e.clipboardData.getData('text/html');
    if (pasted) { e.preventDefault(); document.execCommand('insertHTML', false, cleanHTML(pasted)); commit(); }
  };

  const handleKeyDown = (e) => {
    if (locked) return;
    if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) { e.preventDefault(); undo(e.key.toLowerCase() === 'y' || e.shiftKey ? 1 : -1); return; }
    if (e.key === '/') {
      const selection=window.getSelection();const prefix=selection.anchorNode?.textContent?.slice(0,selection.anchorOffset)||'';
      if(!prefix||/\s$/.test(prefix)){e.preventDefault();onContextMenu(e,editorRef.current,'insert');return;}
    }
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
            commit();
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
          commit();
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
      {hoverBlock && !isDrawingMode && !locked && (
        <div
          className="diary-block-handle absolute flex items-center justify-end gap-1 text-slate-400 z-50 transition-opacity duration-200"
          style={{ top: hoverBlock.top + 2, ...(isRTL ? { right: Math.max(0, hoverBlock.right - 56) } : { left: Math.max(0, hoverBlock.left - 56) }) }}
          contentEditable={false} dir="ltr"
        >
          <button aria-label="Добавить блок" className="p-1 rounded opacity-60 hover:opacity-100 hover:app-hover-bg transition-all" onClick={handleAddBlock}><Plus size={16} /></button>
          <div role="button" tabIndex={0} aria-label="Действия блока" className="p-1 rounded opacity-60 hover:opacity-100 hover:app-hover-bg cursor-grab active:cursor-grabbing transition-all" draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd} onClick={handleMenuClick} onKeyDown={e => { if (e.key === 'Enter') handleMenuClick(e); }}><GripVertical size={16} /></div>
        </div>
      )}

      {hoverBlock && !isDrawingMode && !locked && (
        <div
          className="diary-block-delete absolute flex items-center justify-center text-slate-400 z-50 transition-opacity duration-200"
          style={{ top: hoverBlock.top + 2, ...(isRTL ? { left: 4 } : { right: 4 }) }}
          contentEditable={false} dir="ltr"
        >
          <button aria-label="Удалить блок" className="p-1.5 rounded opacity-30 hover:opacity-100 hover:bg-red-500/10 text-red-500 transition-all" onMouseDown={handleDeleteBlock}><Trash2 size={16} /></button>
        </div>
      )}

      {dropTarget && !isDrawingMode && (
        <div
          className="absolute h-[3px] bg-blue-500 rounded z-50 pointer-events-none transition-all duration-75"
          style={{
            top: dropTarget.top,
            ...(isRTL ? { right: Math.max(0, (hoverBlock?.right || 80) - 56), left: 32 } : { left: Math.max(0, (hoverBlock?.left || 80) - 56), right: 32 })
          }}
        />
      )}

      <div
        ref={editorRef} contentEditable={!locked} suppressContentEditableWarning role="textbox" aria-label="Содержимое страницы" aria-multiline="true" onClick={handleEditorClick} onInput={() => commit(true)}
        onKeyDown={handleKeyDown} onPaste={handlePaste} onContextMenu={(e) => onContextMenu(e, editorRef.current)}
        onDragOver={handleDragOver} onDrop={handleDrop}
        className={`wysiwyg-editor w-full min-h-full flex-1 py-6 outline-none resize-none leading-relaxed ${isRTL ? 'pl-6 pr-14 md:pl-10 md:pr-20' : 'pr-6 pl-14 md:pr-10 md:pl-20'}`}
      />
      {databaseHosts.map(node => {
        let data; try { data = JSON.parse(decodeURIComponent(node.dataset.database)); } catch { return null; }
        const mount = node.querySelector('.database-mount'); if (!mount) return null;
        return createPortal(<DatabaseBlock data={data} locked={locked} onChange={next => { node.dataset.database = encodeURIComponent(JSON.stringify(next)); commit(); }} />, mount, node.dataset.blockId || data.id);
      })}
    </div>
  );
}
