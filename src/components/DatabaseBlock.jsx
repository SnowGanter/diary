import { useState } from 'react';
import { Plus, X, Settings2, FileText } from 'lucide-react';
import { newId } from '../model';

export default function DatabaseBlock({ data, onChange, locked = false }) {
  const [opened, setOpened] = useState(null);
  const [settings, setSettings] = useState(false);
  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState('text');
  const rows = data.rows.filter(row => !data.filter || row.values?.status === data.filter).sort((a,b) => data.sort === 'title' ? a.title.localeCompare(b.title) : data.sort === 'date' ? (a.values?.date || '').localeCompare(b.values?.date || '') : a.createdAt - b.createdAt);
  const status = data.properties.find(p => p.id === 'status');
  const changeRow = (id, next) => onChange({ ...data, rows: data.rows.map(row => row.id === id ? { ...row, ...next } : row) });
  const add = (value = status?.options?.[0] || '') => {
    const row = { id: newId(), title: 'Новая карточка', body: '', values: { status: value }, createdAt: Date.now() };
    onChange({ ...data, rows: [...data.rows, row] }); setOpened(row.id);
  };
  const renderProperty = (row, property) => {
    const value = row.values?.[property.id] || '';
    const update = value => changeRow(row.id, { values: { ...row.values, [property.id]: value } });
    return property.type === 'select' ? <select disabled={locked} aria-label={property.name} value={value} onChange={e => update(e.target.value)}><option value="">—</option>{property.options.map(option => <option key={option}>{option}</option>)}</select>
      : property.type === 'checkbox' ? <input aria-label={property.name} type="checkbox" disabled={locked} checked={Boolean(value)} onChange={e => update(e.target.checked)} />
        : <input aria-label={property.name} disabled={locked} type={property.type === 'date' ? 'date' : property.type === 'number' ? 'number' : 'text'} value={value} onChange={e => update(e.target.value)} />;
  };
  const card = row => <div className="database-card" key={row.id} draggable={!locked} onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('application/x-diary-card', row.id); }}>
    <button className="database-card-title" onClick={() => setOpened(row.id)}><FileText size={14}/>{row.title || 'Без названия'}</button>
    {data.properties.map(p => <label key={p.id}><span>{p.name}</span>{renderProperty(row,p)}</label>)}
  </div>;
  const current = data.rows.find(row => row.id === opened);
  return <div className="database" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
    <div className="database-heading"><input aria-label="Название базы" disabled={locked} value={data.title} onChange={e => onChange({ ...data, title: e.target.value })}/><button aria-label="Свойства базы" onClick={() => setSettings(!settings)}><Settings2 size={16}/></button></div>
    <div className="database-controls"><div className="view-switch">{[['table','Таблица'],['board','Доска'],['gallery','Галерея'],['list','Список']].map(([view,title]) => <button key={view} className={data.view === view ? 'selected' : ''} onClick={() => onChange({ ...data, view })}>{title}</button>)}</div><select aria-label="Фильтр по статусу" value={data.filter} onChange={e => onChange({ ...data, filter: e.target.value })}><option value="">Все статусы</option>{status?.options.map(option => <option key={option}>{option}</option>)}</select><select aria-label="Сортировка карточек" value={data.sort} onChange={e => onChange({ ...data, sort: e.target.value })}><option value="created">По созданию</option><option value="title">По названию</option><option value="date">По дате</option></select></div>
    {settings && <div className="database-settings"><div>{data.properties.map(p => <span key={p.id}>{p.name} <small>{p.type}</small></span>)}</div><input placeholder="Название нового свойства" value={propertyName} onChange={e => setPropertyName(e.target.value)}/><select value={propertyType} onChange={e => setPropertyType(e.target.value)}><option value="text">Текст</option><option value="number">Число</option><option value="date">Дата</option><option value="checkbox">Галочка</option></select><button disabled={locked || !propertyName.trim()} onClick={() => { onChange({ ...data, properties: [...data.properties, { id: newId(), name: propertyName.trim(), type: propertyType }] }); setPropertyName(''); }}>Добавить свойство</button></div>}
    {data.view === 'table' ? <div className="database-table-scroll"><table><thead><tr><th>Название</th>{data.properties.map(p => <th key={p.id}>{p.name}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><button onClick={() => setOpened(row.id)}>{row.title || 'Без названия'}</button></td>{data.properties.map(p => <td key={p.id}>{renderProperty(row,p)}</td>)}</tr>)}</tbody></table></div>
      : data.view === 'board' ? <div className="database-board">{(status?.options || ['Карточки']).map(option => <section key={option} onDragOver={e => { if (e.dataTransfer.types.includes('application/x-diary-card')) { e.preventDefault(); e.stopPropagation(); } }} onDrop={e => { e.preventDefault(); e.stopPropagation(); if (locked) return; const id = e.dataTransfer.getData('application/x-diary-card'); const row = data.rows.find(r=>r.id===id); if(row) changeRow(id,{values:{...row.values,status:option}}); }}><h4>{option}<small>{rows.filter(row=>row.values?.status === option).length}</small></h4>{rows.filter(row=>row.values?.status===option).map(card)}<button disabled={locked} onClick={()=>add(option)}><Plus size={14}/>Карточка</button></section>)}</div>
        : <div className={data.view === 'gallery' ? 'database-gallery' : 'database-list'}>{rows.map(card)}</div>}
    {!rows.length && <p className="database-empty">Добавьте первую карточку или измените фильтр.</p>}
    <button className="database-add" disabled={locked} onClick={()=>add()}><Plus size={15}/>Новая карточка</button>
    {current && createCardDialog(current)}
  </div>;
  function createCardDialog(row) {
    return <div className="modal-shade" onClick={()=>setOpened(null)}><div className="card-dialog" role="dialog" aria-label="Карточка базы" onClick={e=>e.stopPropagation()}><button className="dialog-close" aria-label="Закрыть карточку" onClick={()=>setOpened(null)}><X size={20}/></button><input className="card-title-input" aria-label="Название карточки" disabled={locked} value={row.title} onChange={e=>changeRow(row.id,{title:e.target.value})}/>{data.properties.map(p=><label className="card-property" key={p.id}><span>{p.name}</span>{renderProperty(row,p)}</label>)}<textarea disabled={locked} aria-label="Содержимое карточки" placeholder="Описание, заметки и подробности…" value={row.body} onChange={e=>changeRow(row.id,{body:e.target.value})}/><button disabled={locked} className="danger-text" onClick={()=>{onChange({...data,rows:data.rows.filter(r=>r.id!==row.id)});setOpened(null);}}>Удалить карточку</button></div></div>;
  }
}
