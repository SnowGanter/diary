import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
export default function CommandMenu({ menu, items, onAction, onClose, children }) {
  const [query,setQuery]=useState(''); const [index,setIndex]=useState(0);
  const listRef = useRef(null);
  useEffect(() => { listRef.current?.querySelector('.selected')?.scrollIntoView({ block: 'nearest' }); }, [index, query]);
  const filtered=items.filter(item=>(item.label+' '+item.group).toLowerCase().includes(query.toLowerCase()));
  return <><div className="menu-dismiss" onMouseDown={onClose}/><div className="command-menu" role="dialog" aria-label={menu.mode==='insert'?'Добавить блок':'Действия блока'} style={{left:Math.max(8,Math.min(menu.x,window.innerWidth-320)),top:Math.max(8,Math.min(menu.y,window.innerHeight-520))}} onMouseDown={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();onClose();}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setIndex(i=>Math.max(0,Math.min(filtered.length-1,i+(e.key==='ArrowDown'?1:-1))));}if(e.key==='Enter'&&filtered[index]){e.preventDefault();onAction(filtered[index].id);}}}>
    {children}<div className="menu-search"><Search size={15}/><input autoFocus placeholder="Найти действие…" value={query} onChange={e=>{setQuery(e.target.value);setIndex(0);}}/><button aria-label="Закрыть меню" onClick={onClose}><X size={16}/></button></div>
    <div className="command-list" ref={listRef}>{filtered.map((item,i)=><button key={item.id} className={i===index?'selected':''} onMouseEnter={()=>setIndex(i)} onClick={()=>onAction(item.id)}><span>{item.label}</span><small>{item.group}</small></button>)}{!filtered.length&&<p>Ничего не найдено</p>}</div>
  </div></>;
}
