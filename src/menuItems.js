export const conversionItems = [
  { id: 'as:P', label: 'Обычный текст', description: 'Убрать оформление заголовка, цитаты или кода.', icon: 'Type', group: 'Вид блока' },
  { id: 'as:H1', label: 'Крупный заголовок', description: 'Название главного раздела страницы.', icon: 'Heading1', group: 'Вид блока' },
  { id: 'as:H2', label: 'Средний заголовок', description: 'Название подраздела.', icon: 'Heading2', group: 'Вид блока' },
  { id: 'as:H3', label: 'Маленький заголовок', description: 'Название небольшого пункта.', icon: 'Heading3', group: 'Вид блока' },
  { id: 'as:BLOCKQUOTE', label: 'Цитата', description: 'Выделить текст полосой слева.', icon: 'Quote', group: 'Вид блока' },
  { id: 'as:PRE', label: 'Блок кода', description: 'Показать текст моноширинным шрифтом.', icon: 'Code', group: 'Вид блока' },
];

export function blockMenuItems(menu) {
  const items = [
    { id: 'addBlock', label: 'Добавить блок…', description: 'Текст, список, картинка, таблица и другие элементы.', icon: 'Plus', group: 'Добавление', submenu: true },
    { id: 'emoji', label: 'Вставить эмодзи…', description: 'Добавить символ в текст.', icon: 'Smile', group: 'Добавление', submenu: true },
  ];
  if (['P', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE'].includes(menu.block?.tagName)) items.push({ id: 'changeType', label: 'Изменить тип блока…', description: 'Сделать этот текст заголовком, цитатой или кодом.', icon: 'Type', group: 'Оформление', submenu: true });
  items.push(
    { id: 'duplicate', label: 'Создать копию блока', description: 'Добавить такой же блок сразу под текущим.', icon: 'Copy', group: 'Копирование и перенос' },
    { id: 'moveBlock', label: 'Перенести на другую страницу…', description: 'Выбрать страницу, куда переместить этот блок.', icon: 'FolderInput', group: 'Копирование и перенос' },
    { id: 'copy', label: 'Копировать', description: 'Скопировать выделенный текст или целый блок.', icon: 'Copy', group: 'Копирование и перенос' },
    { id: 'cut', label: 'Вырезать', description: 'Скопировать и убрать выбранное содержимое.', icon: 'Scissors', group: 'Копирование и перенос' },
    { id: 'paste', label: 'Вставить из буфера', description: 'Вставить ранее скопированный текст или блок.', icon: 'ClipboardPaste', group: 'Копирование и перенос' },
    { id: 'copyLink', label: 'Скопировать ссылку на этот блок', description: 'Для перехода к этому месту внутри дневника.', icon: 'Link', group: 'Копирование и перенос' },
  );
  if (menu.target?.closest?.('.diary-tab')) items.push(
    { id: 'tabLeft', label: 'Сдвинуть вкладку влево', description: 'Изменить порядок вкладок.', icon: 'ArrowLeftRight', group: 'Выбранная вкладка' },
    { id: 'tabRight', label: 'Сдвинуть вкладку вправо', description: 'Изменить порядок вкладок.', icon: 'ArrowLeftRight', group: 'Выбранная вкладка' },
    { id: 'tabDelete', label: 'Удалить эту вкладку', description: 'Убрать вкладку вместе с её содержимым.', icon: 'Trash2', group: 'Выбранная вкладка', danger: true },
  );
  const table = menu.target?.closest?.('.diary-table') || menu.block?.querySelector?.('.diary-table');
  if (table) items.push(
    { id: 'rowAdd', label: 'Добавить строку ниже', description: 'Вставить пустую строку в этой таблице.', icon: 'Plus', group: 'Таблица' },
    { id: 'colAdd', label: 'Добавить столбец справа', description: 'Вставить пустой столбец в этой таблице.', icon: 'Plus', group: 'Таблица' },
    { id: 'rowDelete', label: 'Удалить эту строку', description: 'Убрать строку с выбранной ячейкой.', icon: 'Trash2', group: 'Таблица', danger: true },
    { id: 'colDelete', label: 'Удалить этот столбец', description: 'Убрать столбец с выбранной ячейкой.', icon: 'Trash2', group: 'Таблица', danger: true },
  );
  if (!table && !menu.block?.closest?.('[contenteditable="false"]')) items.push(
    { id: 'indent', label: 'Сдвинуть текст вправо', description: 'Увеличить отступ выбранного текста.', icon: 'IndentIncrease', group: 'Оформление текста' },
    { id: 'outdent', label: 'Сдвинуть текст влево', description: 'Уменьшить отступ выбранного текста.', icon: 'IndentDecrease', group: 'Оформление текста' },
  );
  items.push({ id: 'delete', label: 'Удалить блок', description: 'Убрать блок. Можно вернуть кнопкой «Отменить».', icon: 'Trash2', group: 'Удаление', danger: true });
  return items;
}

export function pageMenuItems(page) {
  if (page.deletedAt) return [{ id: 'restorePage', label: 'Восстановить страницу', description: 'Вернуть страницу и удалённые вместе с ней подстраницы.', icon: 'RotateCcw', group: 'Корзина' }];
  return [
    { id: 'rename', label: 'Изменить название', description: 'Переименовать эту страницу.', icon: 'Pencil', group: 'Страница' },
    { id: 'subpage', label: 'Создать страницу внутри этой', description: 'Добавить вложенную страницу в боковом списке.', icon: 'Plus', group: 'Страница' },
    { id: 'duplicatePage', label: 'Создать копию страницы', description: 'Скопировать страницу целиком с её содержимым.', icon: 'Copy', group: 'Страница' },
    { id: 'movePage', label: 'Переместить страницу…', description: 'Выбрать родительскую страницу или верхний уровень.', icon: 'FolderInput', group: 'Страница' },
    { id: 'favorite', label: page.favorite ? 'Убрать из избранного' : 'Добавить в избранное', description: 'Избранные страницы доступны в начале бокового списка.', icon: 'Star', group: 'Удобство' },
    { id: 'locked', label: page.locked ? 'Разрешить редактирование' : 'Защитить от случайных правок', description: page.locked ? 'Снова разрешить изменение текста и карточек.' : 'Отключить редактирование. Это не защита паролем.', icon: 'Lock', group: 'Удобство' },
    { id: 'history', label: 'Посмотреть прошлые версии…', description: 'Восстановить ранее сохранённое содержимое страницы.', icon: 'History', group: 'Сохранение и восстановление' },
    { id: 'exportPage', label: 'Скачать страницу как HTML', description: 'Сохранить отдельный файл для открытия в браузере.', icon: 'Download', group: 'Сохранение и восстановление' },
    { id: 'deletePage', label: 'Переместить в корзину', description: 'Удалить страницу и подстраницы с возможностью восстановления.', icon: 'Trash2', group: 'Удаление', danger: true },
  ];
}
