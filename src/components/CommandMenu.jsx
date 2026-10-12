import { Fragment, useEffect, useId, useRef, useState } from 'react';
import BlockPreview from './BlockPreview';
import { Search, X, ArrowLeft, ChevronRight, FileText, Plus, Copy, Scissors, ClipboardPaste, Trash2, FolderInput, Link, Pencil, Star, Lock, History, Download, RotateCcw, Type, Heading1, Heading2, Heading3, List, ListOrdered, SquareCheck, ChevronDown, Quote, Lightbulb, Code, Minus, Table2, Columns3, PanelsTopLeft, ListTree, Image, Paperclip, PenTool, LayoutDashboard, Images, IndentIncrease, IndentDecrease, Smile, ArrowLeftRight } from 'lucide-react';

const icons = { FileText, Plus, Copy, Scissors, ClipboardPaste, Trash2, FolderInput, Link, Pencil, Star, Lock, History, Download, RotateCcw, Type, Heading1, Heading2, Heading3, List, ListOrdered, SquareCheck, ChevronDown, Quote, Lightbulb, Code, Minus, Table2, Columns3, PanelsTopLeft, ListTree, Image, Paperclip, PenTool, LayoutDashboard, Images, IndentIncrease, IndentDecrease, Smile, ArrowLeftRight };
const titles = { insert: 'Добавить блок', block: 'Действия блока', page: 'Действия страницы', convert: 'Изменить тип блока', emoji: 'Вставить эмодзи' };
const hints = { insert: 'Выберите, что добавить в текст страницы.', block: 'Измените выбранный фрагмент страницы.', page: 'Настройки и действия для этой страницы.', convert: 'Содержимое блока останется на месте.', emoji: 'Нажмите на символ, чтобы вставить его в текст.' };

export default function CommandMenu({ menu, items, onAction, onClose, onBack, children }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const descriptionId = useId();
  const filtered = items.filter(item => [item.label, item.group, item.description, item.keywords].join(' ').toLowerCase().includes(query.toLowerCase()));
  const title = titles[menu.mode] || titles.block;
  const visual = menu.mode === 'insert' || menu.mode === 'convert';
  const selected = filtered[index];
  const wide = visual && window.innerWidth >= 760;
  const width = wide ? 590 : 350;
  useEffect(() => { listRef.current?.querySelector('.selected')?.scrollIntoView({ block: 'nearest' }); }, [index, query]);
  const onKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.target.tagName !== 'INPUT') return;
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      setIndex(i => Math.max(0, Math.min(filtered.length - 1, i + (event.key === 'ArrowDown' ? 1 : -1))));
    }
    if (event.key === 'Enter' && filtered[index]) { event.preventDefault(); onAction(filtered[index].id); }
  };
  return <>
    <div className="menu-dismiss" onMouseDown={onClose} />
    <div className={`command-menu ${visual ? 'command-menu-visual' : ''}`} role="dialog" aria-label={title}
      style={{ left: Math.max(8, Math.min(menu.x, window.innerWidth - width - 8)), top: Math.max(8, Math.min(menu.y, window.innerHeight - Math.min(560, window.innerHeight - 16) - 8)) }}
      onMouseDown={event => event.stopPropagation()} onKeyDown={onKeyDown}>
      <div className="command-heading">
        {onBack && <button aria-label="Назад к действиям блока" onClick={onBack}><ArrowLeft size={17} /></button>}
        <strong>{title}</strong><button aria-label="Закрыть меню" onClick={onClose}><X size={17} /></button>
      </div>
      <p className="command-hint">{hints[menu.mode]}</p>
      {menu.mode !== 'emoji' && <div className="menu-search"><Search size={15} /><input aria-label="Поиск в меню" autoFocus placeholder={menu.mode === 'insert' ? 'Поиск блока…' : 'Поиск действия…'} value={query} onChange={event => { setQuery(event.target.value); setIndex(0); }} /></div>}
      {children}
      {menu.mode !== 'emoji' && <div className="command-body"><div className="command-list" ref={listRef}>{filtered.map((item, i) => {
        const Icon = icons[item.icon] || FileText;
        return <Fragment key={item.id}>
          {(i === 0 || item.group !== filtered[i - 1].group) && <div className="command-group">{item.group}</div>}
          <button type="button" aria-label={item.label} aria-describedby={`${descriptionId}-${i}`} className={`${i === index ? 'selected' : ''} ${item.danger ? 'command-danger' : ''}`}
            onMouseEnter={() => setIndex(i)} onFocus={() => setIndex(i)} onClick={() => onAction(item.id)}>
            {visual ? <span className="block-thumbnail-frame"><BlockPreview type={item.preview || item.id} compact /></span> : <Icon className="command-icon" size={18} aria-hidden="true" />}
            <span className="command-copy"><span>{item.label}</span><small id={`${descriptionId}-${i}`}>{item.description}</small></span>
            {item.submenu && <ChevronRight className="command-arrow" size={15} aria-hidden="true" />}
          </button>
        </Fragment>;
      })}{!filtered.length && <p>Ничего не найдено. Попробуйте другое название.</p>}</div>
      {visual && selected && <aside className="command-preview" aria-live="polite"><div className="block-preview-frame"><BlockPreview type={selected.preview || selected.id} label={selected.label} /></div><strong>{selected.label}</strong><p>{selected.description}</p><small>{menu.mode === 'convert' ? 'Нажмите на пункт, чтобы изменить блок.' : 'Нажмите на пункт, чтобы добавить блок.'}</small></aside>}</div>}
    </div>
  </>;
}
