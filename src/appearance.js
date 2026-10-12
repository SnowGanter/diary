export function appearanceCSS(activeThemeData, activeFontData, activeFontSizeData, t) {
  const luminance = hex => {
    const channels = hex.replace('#', '').match(/.{2}/g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const accentLight = luminance(activeThemeData.accent);
  const accentText = (accentLight + .05) / .05 > 1.05 / (accentLight + .05) ? '#000' : '#fff';
  return `
    :root {
      --bg-main: ${activeThemeData.bg};
      --bg-sidebar: ${activeThemeData.sidebar};
      --text-main: ${activeThemeData.text};
      --text-muted: ${activeThemeData.textMuted};
      --accent: ${activeThemeData.accent};
      --accent-text: ${accentText};
      color-scheme: ${luminance(activeThemeData.bg) < .18 ? 'dark' : 'light'};
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
    .app-accent-bg, .workspace button.app-accent-bg { background-color: var(--accent); color: var(--accent-text); }
    .app-accent-text { color: var(--accent); }
    .app-hover-bg:hover { background-color: var(--bg-main); }

    .wysiwyg-editor { font-size: var(--font-size-base); }
    .wysiwyg-editor > * { position: relative; }

    .wysiwyg-editor .has-placeholder { position: relative; }
    .wysiwyg-editor .has-placeholder:empty:before,
    .wysiwyg-editor .has-placeholder:has(> br:only-child):before {
      content: attr(data-placeholder);
      color: var(--text-muted); opacity: 1; pointer-events: none; display: inline-block;
      font-weight: normal; position: absolute; white-space: nowrap; overflow: hidden; max-width: 100%;
    }

    .wysiwyg-editor > h1:first-child:empty:before,
    .wysiwyg-editor > h1:first-child:has(> br:only-child):before {
        content: var(--ph-title);
        position: absolute; color: var(--text-muted); opacity: 1; pointer-events: none; font-weight: inherit;
    }

    .wysiwyg-editor > h1:first-child + p:last-child:empty:before,
    .wysiwyg-editor > h1:first-child + p:last-child:has(> br:only-child):before,
    .wysiwyg-editor > p:first-child:last-child:empty:before,
    .wysiwyg-editor > p:first-child:last-child:has(> br:only-child):before {
        content: var(--ph-subtitle);
        position: absolute; color: var(--text-muted); opacity: 1; pointer-events: none; white-space: nowrap; overflow: hidden; max-width: 100%;
    }

    .wysiwyg-editor:empty:before,
    .wysiwyg-editor:has(> br:only-child):before {
        content: var(--ph-empty);
        position: absolute; color: var(--text-muted); opacity: 1; pointer-events: none;
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
}
