import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, FileText, Search, Settings, Star, MoreHorizontal, ChevronRight, ChevronDown, FolderOpen, Download, Upload, Undo2, Redo2, Pencil, Type, Eraser, Bold, Italic, Underline, Strikethrough, Code, Link, X, Lock, Check, Menu, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { DICTIONARY, THEMES, FONTS, FONT_SIZES, LANGS, EMOJIS } from './config';
import { appearanceCSS } from './appearance';
import { toEntry, newId, escapeHTML, safeURL, cleanHTML } from './model';
import { storage, desktop, exportPage } from './storage';
import useWorkspace from './useWorkspace';
import Editor from './components/Editor';
import { CanvasOverlay, DrawingModal } from './components/Drawing';
import CommandMenu from './components/CommandMenu';
import { blockItems, blockHTML } from './blocks';
import './workspace.css';

export default function App() {
  const ws = useWorkspace();
  const reportError = ws.fail;
  const saveChanges = ws.flush;
  const { entries, activeEntry: entry } = ws;
  const [lang,setLang]=useState(()=>localStorage.getItem('diaryLang')||'ru');
  const [theme,setTheme]=useState(()=>localStorage.getItem('diaryTheme')||'light');
  const [font,setFont]=useState(()=>localStorage.getItem('diaryFont')||'sans');
  const [fontSize,setFontSize]=useState(()=>localStorage.getItem('diaryFontSize')||'base');
  const [query,setQuery]=useState(''); const [view,setView]=useState('pages'); const [expanded,setExpanded]=useState({});
  const [menu,setMenu]=useState(null); const [pageMenu,setPageMenu]=useState(null); const [modal,setModal]=useState(null);
  const [sidebar,setSidebar]=useState(true); const [notice,setNotice]=useState('');
  const [drawing,setDrawing]=useState(false); const [eraser,setEraser]=useState(false); const [clear,setClear]=useState(0);
  const [color,setColor]=useState(()=>localStorage.getItem('diaryDrawColor')||'#ef4444');
  const [brush,setBrush]=useState(()=>Number(localStorage.getItem('diaryDrawSize'))||3);
  const editorAPIRef=useRef(null); const fileInput=useRef(null); const importInput=useRef(null); const uploadKind=useRef('image'); const pendingRange=useRef(null);
  const t=DICTIONARY[lang]||DICTIONARY.ru; const rtl=lang==='he'; const locale=LANGS.find(l=>l.id===lang)?.locale||'ru-RU';
  const run=async action=>{try{return await action();}catch(error){ws.fail(error);}};
  useEffect(()=>{
    if(!ws.info)return;
    setLang(localStorage.getItem('diaryLang')||'ru'); setTheme(localStorage.getItem('diaryTheme')||'light'); setFont(localStorage.getItem('diaryFont')||'sans'); setFontSize(localStorage.getItem('diaryFontSize')||'base');
  },[ws.info]);
  useEffect(()=>{
    const onError=e=>reportError(new Error(e.detail)); window.addEventListener('diary-error',onError);
    return()=>window.removeEventListener('diary-error',onError);
  },[reportError]);
  useEffect(()=>{
    const handler=e=>{
      if(e.key==='Escape'){setMenu(null);setPageMenu(null);setModal(null);setDrawing(false);}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveChanges().catch(()=>{});}
      if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='d'&&!e.repeat){e.preventDefault();setDrawing(value=>!value);}
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[saveChanges]);
  useEffect(()=>{setDrawing(false);setEraser(false);setMenu(null);setPageMenu(null);},[entry?.id]);
  useEffect(()=>{
    const rememberSelection=()=>{const node=editorAPIRef.current?.node;const selection=window.getSelection();if(node&&selection.rangeCount&&node.contains(selection.getRangeAt(0).commonAncestorContainer))pendingRange.current={range:selection.getRangeAt(0).cloneRange(),pageId:node.dataset.id};};
    document.addEventListener('selectionchange',rememberSelection);return()=>document.removeEventListener('selectionchange',rememberSelection);
  },[]);
  const setting=(key,value,setter)=>{localStorage.setItem(key,value);setter(value);run(()=>storage.saveSettings());};
  const changeContent=html=>ws.update(previous=>toEntry({...previous,content:html}));
  const alive=entries.filter(e=>!e.deletedAt);
  const visible=entries.filter(e=>Boolean(e.deletedAt)===(view==='trash')).filter(e=>(e.title+' '+(e.searchText||'')+' '+(e.tags||[]).join(' ')).toLowerCase().includes(query.toLowerCase()));
  const date=value=>new Date(value).toLocaleDateString(locale,{day:'numeric',month:'short',year:'numeric'});
  const openPage=id=>run(async()=>{await ws.open(id.split('/')[0]);setSidebar(false); const block=id.split('/')[1];if(block)setTimeout(()=>{document.querySelector(`[data-block-id="${CSS.escape(block)}"]`)?.scrollIntoView({block:'center'});},50);});
  const openMenu=(e,node,mode='block')=>{
    e.preventDefault();if(entry?.locked)return;
    const selection=window.getSelection();let range=selection.rangeCount?selection.getRangeAt(0).cloneRange():null;
    let block=e.target?.closest?.('[data-block-id]'); if(!block||!node.contains(block))block=null;
    if(!range||!node.contains(range.commonAncestorContainer)){range=document.createRange();range.selectNodeContents(block||node);range.collapse(false);}
    const rect=range.getBoundingClientRect();
    pendingRange.current={range,node,pageId:entry.id};
    setMenu({mode,x:e.clientX||rect.left||350,y:e.clientY||rect.bottom||100,range,node,block,target:e.target});setPageMenu(null);
  };
  const restoreRange=()=>{
    const current=pendingRange.current; const node=editorAPIRef.current?.node;
    if(!node)return null;node.focus();const selection=window.getSelection();selection.removeAllRanges();
    if(current?.pageId===entry.id&&node.contains(current.range.commonAncestorContainer))selection.addRange(current.range);
    else{const range=document.createRange();range.selectNodeContents(node);range.collapse(false);selection.addRange(range);}
    return node;
  };
  const commit=()=>editorAPIRef.current?.commit();
  const insert=html=>{if(entry.locked)return;restoreRange();document.execCommand('insertHTML',false,html);commit();setMenu(null);};
  const selectedBlocks=()=>{
    const node=menu?.node||editorAPIRef.current?.node; const range=menu?.range||pendingRange.current?.range;
    if(!node)return[];if(range&&!range.collapsed){const found=[...node.children].filter(child=>range.intersectsNode(child));if(found.length)return found;}
    let block=menu?.block||range?.startContainer;while(block&&block.parentNode!==node)block=block.parentNode;return block?[block]:[];
  };
  const format=(command,value=null)=>{if(entry?.locked)return;const selection=window.getSelection();if(!menu&&selection.rangeCount)pendingRange.current={range:selection.getRangeAt(0).cloneRange(),pageId:entry.id};restoreRange();document.execCommand(command,false,value);commit();setMenu(null);};
  const action=id=>run(async()=>{
    if(id==='duplicate'){restoreRange();selectedBlocks().forEach(node=>{const copy=node.cloneNode(true);[copy,...copy.querySelectorAll('[data-block-id]')].forEach(el=>el.dataset.blockId=newId());node.after(copy);});commit();}
    else if(id==='delete'){selectedBlocks().forEach(node=>node.remove());commit();}
    else if(id==='copyLink'){const block=selectedBlocks()[0];if(block){await navigator.clipboard.writeText(`#page/${entry.id}/${block.dataset.blockId}`);setNotice('Ссылка на блок скопирована');}}
    else if(id==='moveBlock'){setModal({type:'moveBlock',nodes:selectedBlocks()});}
    else if(id==='copy'||id==='cut'){
      restoreRange();const selection=window.getSelection();const range=selection.rangeCount?selection.getRangeAt(0):null;const blocks=selectedBlocks();const wholeBlocks=!range||range.collapsed;
      const holder=document.createElement('div');if(wholeBlocks)blocks.forEach(block=>holder.append(block.cloneNode(true)));else holder.append(range.cloneContents());
      const html=cleanHTML(holder.innerHTML);const text=holder.textContent;
      try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);}catch{await navigator.clipboard.writeText(text);}
      if(id==='cut'){if(wholeBlocks)blocks.forEach(block=>block.remove());else document.execCommand('delete');commit();}
    }
    else if(id==='paste'){
      let html=null;try{for(const item of await navigator.clipboard.read())if(item.types.includes('text/html')){html=cleanHTML(await(await item.getType('text/html')).text());break;}}catch{/* Plain text remains available when rich clipboard access is denied. */}
      if(html!==null)insert(html);else{const text=await navigator.clipboard.readText();restoreRange();document.execCommand('insertText',false,text);commit();}
    }
    else if(id.startsWith('as:'))format('formatBlock',id.slice(3));
    else if(id==='indent'||id==='outdent')format(id);
    else if(id==='tabDelete'||id==='tabLeft'||id==='tabRight'){
      const tab=menu?.target?.closest?.('.diary-tab');if(!tab)throw new Error('Откройте меню на названии вкладки.');
      const container=tab.closest('.diary-tabs-container');const tabs=[...container.querySelectorAll('.diary-tab')];const panes=[...container.querySelectorAll('.diary-tab-content-pane')];const index=tabs.indexOf(tab);
      if(id==='tabDelete'){if(tabs.length===1)throw new Error('Оставьте хотя бы одну вкладку.');tab.remove();panes[index].remove();const remaining=[...container.querySelectorAll('.diary-tab')];const contents=[...container.querySelectorAll('.diary-tab-content-pane')];remaining.forEach((el,i)=>el.classList.toggle('active',i===0));contents.forEach((el,i)=>el.style.display=i===0?'block':'none');}
      else {const target=index+(id==='tabLeft'?-1:1);if(target>=0&&target<tabs.length){if(target<index){tabs[target].before(tab);panes[target].before(panes[index]);}else{tabs[target].after(tab);panes[target].after(panes[index]);}}}commit();
    }
    else if(id==='rowAdd'||id==='rowDelete'||id==='colAdd'||id==='colDelete'){
      const cell=menu?.target?.closest?.('td,th');const table=cell?.closest('table')||selectedBlocks()[0]?.querySelector?.('table')||selectedBlocks().find(n=>n.tagName==='TABLE');
      if(!table)throw new Error('Откройте меню внутри ячейки таблицы.');
      if(id==='rowAdd'){const row=table.insertRow((cell?.parentElement.rowIndex??table.rows.length-1)+1);for(let i=0;i<table.rows[0].cells.length;i++)row.insertCell().innerHTML='<br>';}
      if(id==='rowDelete'&&table.rows.length>1)table.deleteRow(cell?.parentElement.rowIndex??table.rows.length-1);
      if(id==='colAdd')for(const row of table.rows)row.insertCell((cell?.cellIndex??row.cells.length-1)+1).innerHTML='<br>';
      if(id==='colDelete'&&table.rows[0].cells.length>1)for(const row of table.rows)row.deleteCell(cell?.cellIndex??row.cells.length-1);
      commit();
    }
    else if(id==='image'||id==='file'){uploadKind.current=id;fileInput.current.accept=id==='image'?'image/*':'';fileInput.current.click();}
    else if(id==='sketch')setModal({type:'sketch'});
    else if(id==='bookmark')setModal({type:'link',url:'https://',title:'',bookmark:true});
    else if(id==='pageLink')setModal({type:'pageLink'});
    else if(id==='toc'){
      const headings=[...editorAPIRef.current.node.querySelectorAll('h1,h2,h3')];
      if(!headings.length)throw new Error('Сначала добавьте заголовки на страницу.');
      insert(`<nav class="diary-toc">${headings.map(h=>`<p><a href="#page/${entry.id}/${h.dataset.blockId}">${escapeHTML(h.textContent||'Заголовок')}</a></p>`).join('')}</nav><p><br></p>`);
    }else insert(blockHTML(id,t));
    setMenu(null);
  });
  const upload=async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>100*1024*1024){ws.fail(new Error('Максимальный размер файла — 100 МБ.'));return;}
    const pageId=entry.id;
    await run(async()=>{
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
      if(editorAPIRef.current?.node.dataset.id!==pageId)throw new Error('Страница изменилась. Выберите файл ещё раз.');
      insert(uploadKind.current==='image'?`<div contenteditable="false" class="resizable-image-wrapper" style="width:400px"><img src="${data}" alt="${escapeHTML(file.name)}"></div><p><br></p>`:`<p><a href="${data}" download="${escapeHTML(file.name)}" class="diary-file" contenteditable="false">📎 ${escapeHTML(file.name)}</a></p>`);
    });
  };
  const pageAction=id=>run(async()=>{
    const page=entries.find(e=>e.id===pageMenu.pageId);setPageMenu(null);
    if(id==='duplicatePage')await ws.duplicate(page.id);
    if(id==='favorite')await ws.patch(page.id,{favorite:!page.favorite});
    if(id==='locked')await ws.patch(page.id,{locked:!page.locked});
    if(id==='deletePage')await ws.trash(page.id);
    if(id==='restorePage')await ws.restore(page.id);
    if(id==='subpage'){await ws.create(page.id);setExpanded(previous=>({...previous,[page.id]:true}));}
    if(id==='movePage')setModal({type:'movePage',id:page.id});
    if(id==='rename'){await ws.open(page.id);setModal({type:'rename',title:page.title});}
    if(id==='exportPage'){await ws.flush();await exportPage(await storage.get(page.id));}
    if(id==='history'){await ws.flush();setModal({type:'history',id:page.id,versions:await storage.history(page.id)});}
  });
  const pageOptions=page=>page.deletedAt?[{id:'restorePage',label:'Восстановить страницу',group:'Корзина'}]:[
    ['rename','Переименовать'],['duplicatePage','Дублировать'],['subpage','Вложенная страница'],['movePage','Переместить'],['favorite',page.favorite?'Убрать из избранного':'В избранное'],['locked',page.locked?'Разблокировать':'Заблокировать'],['history','История версий'],['exportPage','Экспорт страницы'],['deletePage','В корзину']
  ].map(([id,label])=>({id,label,group:'Страница'}));
  const renderPage=(page,depth=0)=>{
    const children=view==='pages'&&!query?visible.filter(child=>child.parentId===page.id):[];
    return <div key={page.id}><div className={`page-row ${entry?.id===page.id?'active':''}`} style={{paddingInlineStart:10+depth*18}} onContextMenu={e=>{e.preventDefault();setPageMenu({x:e.clientX,y:e.clientY,pageId:page.id});}}>
      <button className="tree-toggle" aria-label="Вложенные страницы" onClick={()=>setExpanded(prev=>({...prev,[page.id]:!prev[page.id]}))}>{children.length?(expanded[page.id]?<ChevronDown size={14}/>:<ChevronRight size={14}/>):<FileText size={14}/>}</button>
      <button className="page-title" onClick={()=>view==='trash'?run(()=>ws.restore(page.id)):openPage(page.id)}>{page.favorite&&<Star size={12} fill="currentColor"/>}{page.title||t.untitled}{page.locked&&<Lock size={12}/>}</button>
      <button className="page-more" aria-label={`Меню страницы ${page.title||t.untitled}`} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();setPageMenu({x:rect.right,y:rect.bottom,pageId:page.id});}}><MoreHorizontal size={16}/></button>
    </div>{expanded[page.id]&&children.map(child=>renderPage(child,depth+1))}</div>;
  };
  const dates={};for(const page of visible){const key=new Date(page.createdAt).toLocaleDateString(locale,{month:'long',year:'numeric'});(dates[key]||= []).push(page);}
  const blockActions=[['tabDelete','Удалить вкладку'],['tabLeft','Вкладка влево'],['tabRight','Вкладка вправо'],['duplicate','Дублировать'],['moveBlock','Переместить на страницу'],['copyLink','Скопировать ссылку на блок'],['copy','Копировать'],['cut','Вырезать'],['paste','Вставить'],['delete','Удалить блок'],['as:P','Превратить в текст'],['as:H1','Превратить в заголовок 1'],['as:H2','Превратить в заголовок 2'],['as:BLOCKQUOTE','Превратить в цитату'],['as:PRE','Превратить в код'],['indent','Увеличить отступ'],['outdent','Уменьшить отступ'],['rowAdd','Добавить строку таблицы'],['rowDelete','Удалить строку таблицы'],['colAdd','Добавить столбец таблицы'],['colDelete','Удалить столбец таблицы']].map(([id,label])=>({id,label,group:'Действия'}));
  const formatToolbar=<div className="format-toolbar">{[[Bold,'bold',t.bold],[Italic,'italic',t.italic],[Underline,'underline',t.underline],[Strikethrough,'strikeThrough',t.strike]].map(([Icon,cmd,label])=><button key={cmd} title={label} aria-label={label} onMouseDown={e=>{e.preventDefault();format(cmd);}}><Icon size={16}/></button>)}<button aria-label="Код" onMouseDown={e=>{e.preventDefault();const text=window.getSelection().toString();insert(`<code>${escapeHTML(text||'code')}</code>`);}}><Code size={16}/></button><button aria-label="Добавить ссылку" onMouseDown={e=>{e.preventDefault();const selection=window.getSelection();if(selection.rangeCount)pendingRange.current={range:selection.getRangeAt(0).cloneRange(),pageId:entry.id};setModal({type:'link',url:'https://',title:selection.toString(),bookmark:false});setMenu(null);}}><Link size={16}/></button><input aria-label="Цвет текста" type="color" defaultValue="#334155" onChange={e=>format('foreColor',e.target.value)}/><input aria-label="Цвет фона" type="color" defaultValue="#fde047" onChange={e=>format('hiliteColor',e.target.value)}/>{[[AlignLeft,'justifyLeft','По левому краю'],[AlignCenter,'justifyCenter','По центру'],[AlignRight,'justifyRight','По правому краю']].map(([Icon,cmd,label])=><button key={cmd} aria-label={label} title={label} onMouseDown={e=>{e.preventDefault();format(cmd);}}><Icon size={15}/></button>)}<button onMouseDown={e=>{e.preventDefault();format('removeFormat');}}>Aa</button></div>;
  return <div className="workspace app-bg" dir={rtl?'rtl':'ltr'}>
    <style>{appearanceCSS(THEMES.find(th=>th.id===theme)||THEMES[2],FONTS.find(f=>f.id===font)||FONTS[0],FONT_SIZES.find(f=>f.id===fontSize)||FONT_SIZES[1],t)}</style>
    <button className="mobile-toggle" aria-label="Меню" onClick={()=>setSidebar(!sidebar)}><Menu size={20}/></button>
    <aside className={`workspace-sidebar app-sidebar ${sidebar?'is-open':''}`}>
      <div className="workspace-brand"><FileText size={24}/><strong>{t.diary}</strong><button aria-label="Настройки и хранилище" onClick={()=>setModal({type:'settings'})}><Settings size={19}/></button></div>
      <div className="sidebar-search"><Search size={15}/><input aria-label="Поиск страниц" placeholder="Поиск по дневнику" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Очистить поиск" onClick={()=>setQuery('')}><X size={14}/></button>}</div>
      <button className="new-page app-accent-bg" disabled={ws.status==='loading'} onClick={()=>run(()=>ws.create(null))}><Plus size={17}/>{t.newEntry}</button>
      <div className="sidebar-views">{[['pages','Страницы'],['dates','По датам'],['trash','Корзина']].map(([id,label])=><button key={id} className={view===id?'selected':''} onClick={()=>setView(id)}>{label}</button>)}</div>
      <div className="page-list">
        {view!=='trash'&&!query&&alive.some(page=>page.favorite)&&<div className="favorites"><div className="sidebar-label">Избранное</div>{alive.filter(page=>page.favorite).map(page=><button key={page.id} onClick={()=>openPage(page.id)}><Star size={13}/>{page.title||t.untitled}</button>)}</div>}
        {view==='dates'?Object.entries(dates).map(([key,pages])=><div key={key}><button className="date-group" onClick={()=>setExpanded(prev=>({...prev,[key]:!prev[key]}))}>{expanded[key]?<ChevronDown size={14}/>:<ChevronRight size={14}/>} {key}</button>{expanded[key]&&pages.map(page=>renderPage(page))}</div>):(query||view==='trash'?visible:visible.filter(page=>!page.parentId||!visible.some(parent=>parent.id===page.parentId))).map(page=>renderPage(page))}
        {!visible.length&&<p className="sidebar-empty">{query?'Ничего не найдено':view==='trash'?'Корзина пуста':t.noEntries}</p>}
      </div>
      <div className="sidebar-bottom"><div className="theme-choices">{THEMES.map(th=><button key={th.id} aria-label={`Тема ${th.id}`} title={th.id} className={theme===th.id?'selected':''} style={{background:th.color}} onClick={()=>setting('diaryTheme',th.id,setTheme)}/>)}</div><button onClick={()=>setModal({type:'settings'})}><FolderOpen size={15}/>{desktop?'Хранилище и настройки':'Экспорт и настройки'}</button></div>
    </aside>
    <main className="workspace-main">
      {entry?<><header className="page-header"><div className="page-heading"><div className="breadcrumb">{entry.parentId?<button onClick={()=>openPage(entry.parentId)}>{entries.find(p=>p.id===entry.parentId)?.title||t.untitled}</button>:<span>Мой дневник</span>}</div><input className="page-title-input" aria-label="Название страницы" placeholder={t.untitled} disabled={entry.locked} value={entry.title} onChange={e=>ws.update(previous=>({...previous,title:e.target.value}))}/></div><div className="page-header-actions"><span className={`save-state ${ws.status}`} aria-live="polite">{({loading:'Загрузка…',dirty:'Есть изменения',saving:t.saving,saved:'Сохранено',error:'Ошибка сохранения'})[ws.status]}</span><button aria-label="Сохранить" title="Ctrl+S" onClick={()=>run(ws.flush)}><Check size={18}/></button><button aria-label="Меню страницы" onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();setPageMenu({x:rect.right,y:rect.bottom,pageId:entry.id});}}><MoreHorizontal size={21}/></button></div></header>
      <div className="page-tools">{!entry.locked&&formatToolbar}<div className="history-tools"><button aria-label="Отменить" disabled={entry.locked} onClick={()=>editorAPIRef.current?.undo()}><Undo2 size={17}/></button><button aria-label="Повторить" disabled={entry.locked} onClick={()=>editorAPIRef.current?.redo()}><Redo2 size={17}/></button><button aria-label="Добавить блок" disabled={entry.locked} onClick={e=>openMenu(e,editorAPIRef.current.node,'insert')}><Plus size={18}/></button><button title={drawing?t.textMode:t.drawMode} aria-label={drawing?t.textMode:t.drawMode} disabled={entry.locked} className={drawing?'selected':''} onClick={()=>setDrawing(!drawing)}>{drawing?<Type size={18}/>:<Pencil size={18}/>}</button></div></div>
      {drawing&&!entry.locked&&<div className="drawing-tools"><input aria-label={t.color} type="color" value={color} onChange={e=>setting('diaryDrawColor',e.target.value,setColor)}/><input aria-label={t.brush} type="range" min="1" max="20" value={brush} onChange={e=>setting('diaryDrawSize',Number(e.target.value),setBrush)}/><button className={eraser?'selected':''} onClick={()=>setEraser(!eraser)}><Eraser size={16}/>{t.eraser}</button><button onClick={()=>{ws.update(previous=>({...previous,overlay:null}));setClear(c=>c+1);}}><Trash2 size={16}/>{t.clear}</button><small>Ctrl+Shift+D — режим рисования</small></div>}
      {entry.locked&&<div className="locked-banner"><Lock size={14}/>Страница заблокирована. Разблокируйте её через меню страницы.</div>}
      {ws.error&&<div className="error-banner" role="alert"><span>{ws.error}</span><button onClick={()=>run(ws.flush)}>Повторить сохранение</button></div>}
      <div className="page-scroll"><div className="page-surface"><Editor entryId={entry.id} initialContent={entry.content} onChange={changeContent} onContextMenu={openMenu} isDrawingMode={drawing} isRTL={rtl} t={t} locked={entry.locked} editorAPIRef={editorAPIRef} onOpenPage={openPage}/><CanvasOverlay entryId={entry.id} isDrawingMode={drawing&&!entry.locked} overlayData={entry.overlay} onSave={data=>ws.update(previous=>({...previous,overlay:data}))} color={color} lineWidth={brush} clearTrigger={clear} isEraser={eraser} onExitMode={()=>setDrawing(false)}/></div></div>
      <footer className="page-footer"><span>{t.created} {date(entry.createdAt)}</span><input aria-label="Теги страницы" disabled={entry.locked} placeholder="Теги через запятую" value={(entry.tags||[]).join(', ')} onChange={e=>ws.update(previous=>({...previous,tags:e.target.value.split(',').map(tag=>tag.trim())}))}/><span>{entry.content.replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(Boolean).length} слов</span><span>/ — блоки · ПКМ — действия</span></footer>
      </>:<div className="workspace-empty"><FileText size={54}/><h1>{t.emptyDiary}</h1><p>Создайте страницу, чтобы начать писать.</p><button className="app-accent-bg" onClick={()=>run(()=>ws.create(null))}><Plus size={18}/>{t.createPage}</button>{ws.error&&<p role="alert">{ws.error}</p>}</div>}
    </main>
    <input hidden type="file" ref={fileInput} onChange={upload}/><input hidden type="file" accept=".json" ref={importInput} onChange={e=>{const file=e.target.files[0];e.target.value='';if(file)run(async()=>{await ws.flush();const result=await storage.importFile(file);await ws.refresh();setNotice(`Импортировано страниц: ${result.count}`);});}}/>
    {menu&&<CommandMenu key={`${menu.mode}-${menu.x}-${menu.y}`} menu={menu} items={menu.mode==='insert'?blockItems(t):[...blockActions.filter(item=>item.id.startsWith('tab')?Boolean(menu.target?.closest?.('.diary-tab')):['rowAdd','rowDelete','colAdd','colDelete'].includes(item.id)?Boolean(menu.target?.closest?.('table')||menu.block?.querySelector?.('table')):true),...blockItems(t)]} onAction={action} onClose={()=>setMenu(null)}>{formatToolbar}<div className="menu-emojis">{EMOJIS.map(emoji=><button key={emoji} onClick={()=>insert(emoji)}>{emoji}</button>)}</div></CommandMenu>}
    {pageMenu&&entries.some(p=>p.id===pageMenu.pageId)&&<CommandMenu menu={{...pageMenu,mode:'page'}} items={pageOptions(entries.find(p=>p.id===pageMenu.pageId))} onAction={pageAction} onClose={()=>setPageMenu(null)}/>}
    {modal?.type==='sketch'&&<DrawingModal t={t} onClose={()=>setModal(null)} onSave={data=>{insert(`<div contenteditable="false" class="resizable-image-wrapper" style="width:500px"><img src="${data}" alt="Скетч"></div><p><br></p>`);setModal(null);}}/>}
    {modal&&modal.type!=='sketch'&&<div className="modal-shade" onMouseDown={()=>setModal(null)}><section className="workspace-dialog" role="dialog" aria-label="Настройки дневника" onMouseDown={e=>e.stopPropagation()}><button className="dialog-close" aria-label="Закрыть" onClick={()=>setModal(null)}><X size={20}/></button>
      {modal.type==='settings'?<><h2>Хранилище и настройки</h2><p className="storage-path">{ws.info?.path||'Хранилище не открыто'}</p>{desktop?<><div className="dialog-buttons"><button onClick={()=>run(()=>ws.changeWorkspace(false))}><FolderOpen size={16}/>Открыть хранилище</button><button onClick={()=>run(()=>ws.changeWorkspace(true))}><Plus size={16}/>Создать хранилище</button><button disabled={!ws.info?.path} onClick={()=>run(()=>window.diary.reveal())}>Открыть папку</button></div><p className="dialog-hint">Для переноса закройте дневник и скопируйте всю папку. На другом компьютере выберите «Открыть хранилище».</p></>:<p className="dialog-hint">Браузер хранит записи на этом устройстве. Скачайте архив, чтобы перенести их в другой браузер. Для отдельной папки используйте Windows-приложение.</p>}<div className="dialog-buttons"><button onClick={()=>run(async()=>{await ws.flush();const result=await storage.export();if(result)setNotice('Архив дневника сохранён');})}><Download size={16}/>Экспорт всего дневника</button><button onClick={()=>desktop?run(async()=>{await ws.flush();const result=await window.diary.import();if(result){await ws.refresh();setNotice(`Импортировано страниц: ${result.count}`);}}):importInput.current.click()}><Upload size={16}/>Импорт архива</button></div><hr/><label>Язык<select value={lang} onChange={e=>setting('diaryLang',e.target.value,setLang)}>{LANGS.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>Шрифт<select value={font} onChange={e=>setting('diaryFont',e.target.value,setFont)}>{FONTS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label>Размер текста<select value={fontSize} onChange={e=>setting('diaryFontSize',e.target.value,setFontSize)}>{FONT_SIZES.map(s=><option key={s.id} value={s.id}>{s.size}</option>)}</select></label><p className="dialog-hint">Diary 2.0 · Автосохранение включено. Вложения и резервные копии находятся внутри папки хранилища.</p></>
      :modal.type==='link'?<><h2>{modal.bookmark?t.bookmark:'Ссылка'}</h2><label>Адрес<input autoFocus value={modal.url} onChange={e=>setModal({...modal,url:e.target.value})}/></label><label>Название<input value={modal.title} onChange={e=>setModal({...modal,title:e.target.value})}/></label><button className="app-accent-bg" onClick={()=>{const url=safeURL(modal.url);if(!url){ws.fail(new Error('Введите полный адрес http:// или https://'));return;}insert(`<a href="${escapeHTML(url)}" ${modal.bookmark?'class="diary-bookmark" contenteditable="false"':''}>${escapeHTML(modal.title||url)}</a>`);setModal(null);}}>{t.insert}</button></>
      :modal.type==='rename'?<><h2>Название страницы</h2><input autoFocus value={modal.title} onChange={e=>setModal({...modal,title:e.target.value})}/><button className="app-accent-bg" onClick={()=>{ws.update(previous=>({...previous,title:modal.title}));setModal(null);}}>Сохранить название</button></>
      :modal.type==='history'?<><h2>История страницы</h2><p className="dialog-hint">Выберите версию, чтобы восстановить её. Текущее содержимое останется в истории.</p><div className="move-targets">{modal.versions.map(version=><button key={version.id} onClick={()=>run(async()=>{const old=await storage.revision(modal.id,version.id);await ws.open(modal.id);ws.update(previous=>({...previous,content:old.content,title:old.title,overlay:old.overlay}));await ws.flush();setModal(null);})}>{date(version.updatedAt)} · {new Date(version.updatedAt).toLocaleTimeString(locale)} · {version.title||t.untitled}</button>)}{!modal.versions.length&&<p>Предыдущих версий пока нет.</p>}</div></>
      :<><h2>{modal.type==='pageLink'?'Ссылка на страницу':'Переместить'}</h2><div className="move-targets">{modal.type==='movePage'&&<button onClick={()=>run(async()=>{await ws.move(modal.id,null);setModal(null);})}>На верхний уровень</button>}{alive.filter(p=>p.id!==(modal.id||entry?.id)).map(page=><button key={page.id} onClick={()=>run(async()=>{
        if(modal.type==='pageLink')insert(`<a href="#page/${page.id}" class="diary-page-link">📄 ${escapeHTML(page.title||t.untitled)}</a><p><br></p>`);
        if(modal.type==='movePage')await ws.move(modal.id,page.id);
        if(modal.type==='moveBlock'){await ws.flush();const target=await storage.get(page.id);await storage.save(toEntry({...target,content:target.content+modal.nodes.map(n=>n.outerHTML).join(''),updatedAt:Date.now()}));modal.nodes.forEach(n=>n.remove());commit();await ws.flush();}
        setModal(null);
      })}><FileText size={15}/>{page.title||t.untitled}</button>)}</div></>}
    </section></div>}
    {notice&&<div className="notice" role="status">{notice}<button aria-label="Закрыть уведомление" onClick={()=>setNotice('')}><X size={15}/></button></div>}
  </div>;
}
