/**
 * Words of the desktop shell (menus, context menu, error boxes). The web app
 * tells which language it shows (bridge.setLocale) and the shell follows it.
 */
const es = {
  file: 'Archivo',
  quit: 'Salir',
  edit: 'Editar',
  undo: 'Deshacer',
  redo: 'Rehacer',
  cut: 'Cortar',
  copy: 'Copiar',
  paste: 'Pegar',
  selectAll: 'Seleccionar todo',
  view: 'Ver',
  reload: 'Recargar',
  devTools: 'Herramientas de desarrollo',
  resetZoom: 'Tamaño real',
  zoomIn: 'Acercar',
  zoomOut: 'Alejar',
  fullScreen: 'Pantalla completa',
  window: 'Ventana',
  minimize: 'Minimizar',
  close: 'Cerrar ventana',
  help: 'Ayuda',
  openLog: 'Abrir registro de errores',
  openData: 'Abrir carpeta de datos',
  website: 'DuckBord en la web',
  about: 'Acerca de DuckBord',
  aboutDetail: 'Versión {version}\nTus tableros se guardan en este equipo:\n{data}',
  hide: 'Ocultar DuckBord',
  hideOthers: 'Ocultar otros',
  showAll: 'Mostrar todo',
  addToDictionary: 'Añadir al diccionario',
  noSuggestions: 'Sin sugerencias',
  openLink: 'Abrir enlace en el navegador',
  copyLink: 'Copiar enlace',
  dbError: 'DuckBord no puede abrir sus datos',
  dbErrorDetail: 'Los detalles están en el registro de errores:\n{log}',
};

export type Texts = typeof es;

const en: Texts = {
  file: 'File',
  quit: 'Quit',
  edit: 'Edit',
  undo: 'Undo',
  redo: 'Redo',
  cut: 'Cut',
  copy: 'Copy',
  paste: 'Paste',
  selectAll: 'Select all',
  view: 'View',
  reload: 'Reload',
  devTools: 'Developer tools',
  resetZoom: 'Actual size',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fullScreen: 'Full screen',
  window: 'Window',
  minimize: 'Minimize',
  close: 'Close window',
  help: 'Help',
  openLog: 'Open error log',
  openData: 'Open data folder',
  website: 'DuckBord on the web',
  about: 'About DuckBord',
  aboutDetail: 'Version {version}\nYour boards are saved on this computer:\n{data}',
  hide: 'Hide DuckBord',
  hideOthers: 'Hide others',
  showAll: 'Show all',
  addToDictionary: 'Add to dictionary',
  noSuggestions: 'No suggestions',
  openLink: 'Open link in the browser',
  copyLink: 'Copy link',
  dbError: 'DuckBord cannot open its data',
  dbErrorDetail: 'The details are in the error log:\n{log}',
};

const ko: Texts = {
  file: '파일',
  quit: '종료',
  edit: '편집',
  undo: '실행 취소',
  redo: '다시 실행',
  cut: '잘라내기',
  copy: '복사',
  paste: '붙여넣기',
  selectAll: '모두 선택',
  view: '보기',
  reload: '새로 고침',
  devTools: '개발자 도구',
  resetZoom: '실제 크기',
  zoomIn: '확대',
  zoomOut: '축소',
  fullScreen: '전체 화면',
  window: '창',
  minimize: '최소화',
  close: '창 닫기',
  help: '도움말',
  openLog: '오류 기록 열기',
  openData: '데이터 폴더 열기',
  website: '웹에서 DuckBord 보기',
  about: 'DuckBord 정보',
  aboutDetail: '버전 {version}\n보드는 이 컴퓨터에 저장됩니다:\n{data}',
  hide: 'DuckBord 숨기기',
  hideOthers: '다른 앱 숨기기',
  showAll: '모두 보기',
  addToDictionary: '사전에 추가',
  noSuggestions: '추천 단어 없음',
  openLink: '브라우저에서 링크 열기',
  copyLink: '링크 복사',
  dbError: 'DuckBord가 데이터를 열 수 없습니다',
  dbErrorDetail: '자세한 내용은 오류 기록에 있습니다:\n{log}',
};

export const TEXTS = { es, en, ko } as const;
export type Lang = keyof typeof TEXTS;

/** The shell's language for a locale tag (es-MX, ko-KR…): English otherwise. */
export const langOf = (tag: string): Lang => {
  const base = tag.toLowerCase().slice(0, 2);
  return base === 'es' || base === 'ko' ? base : 'en';
};

/** Fills {name} placeholders. */
export const fill = (s: string, vars: Record<string, string>) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);

/** Spellchecker dictionaries for each language, the first one available wins. */
export const SPELL_LANGUAGES: Record<Lang, string[]> = {
  es: ['es-ES', 'es', 'es-419', 'es-MX'],
  en: ['en-US', 'en-GB'],
  ko: ['ko'],
};
