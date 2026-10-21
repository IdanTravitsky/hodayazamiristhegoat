// CodeMirror 5 SQL editor with Chinook-aware autocomplete. Ctrl/Cmd+Enter runs.
import * as sql from './sqlclient.js';

function hintTables() {
  const s = sql.schema();
  const tables = {};
  if (s) s.tables.forEach(t => { tables[t.name] = t.columns.map(c => c.name); });
  return tables;
}

const MYSQL_WORDS = ['CONCAT', 'CONCAT_WS', 'IFNULL', 'COALESCE', 'YEAR', 'MONTH', 'DAY', 'DATE_FORMAT', 'DATEDIFF', 'TIMESTAMPDIFF',
  'ROUND', 'GROUP_CONCAT', 'SUBSTRING', 'SUBSTRING_INDEX', 'CHAR_LENGTH', 'UPPER', 'LOWER', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'DISTINCT', 'HAVING', 'BETWEEN', 'EXISTS', 'LIMIT', 'OFFSET', 'UNION', 'LEFT JOIN', 'INNER JOIN', 'ORDER BY', 'GROUP BY', 'IS NULL', 'IS NOT NULL'];

export function createEditor(parent, { value = '', onRun, onChange, placeholder = 'Write your query here…  (Ctrl+Enter to run)', minLines = 6, autofocus = false } = {}) {
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const cm = window.CodeMirror(parent, {
    value,
    mode: 'text/x-mysql',
    lineNumbers: true,
    lineWrapping: true,
    indentUnit: 2,
    tabSize: 2,
    matchBrackets: true,
    autoCloseBrackets: true,
    placeholder,
    autofocus,
    viewportMargin: Infinity,
    extraKeys: {
      'Ctrl-Enter': () => onRun && onRun(),
      'Cmd-Enter': () => onRun && onRun(),
      'Ctrl-Space': 'autocomplete',
      Tab: c => (c.state.completionActive ? c.state.completionActive.pick() : c.execCommand('insertSoftTab')),
      'Shift-Tab': 'indentLess',
    },
    hintOptions: { completeSingle: false, tables: hintTables() },
  });
  cm.getWrapperElement().classList.add('sql-editor');
  cm.getWrapperElement().style.setProperty('--min-lines', minLines);
  cm.on('inputRead', (c, change) => {
    if (c.state.completionActive) return;
    const ch = change.text[0];
    if (/^[A-Za-z_.]$/.test(ch)) {
      const cur = c.getCursor();
      const token = c.getTokenAt(cur);
      if (ch === '.' || (token.string && token.string.length >= 2 && token.type !== 'string' && token.type !== 'comment')) {
        c.showHint({ completeSingle: false, tables: hintTables(), defaultTable: null });
      }
    }
  });
  if (onChange) cm.on('changes', () => onChange(cm.getValue()));
  sql.onSchema(() => cm.setOption('hintOptions', { completeSingle: false, tables: hintTables() }));
  cm.runKeyLabel = isMac ? '⌘ Enter' : 'Ctrl Enter';
  // MySQL function names in the hint list too
  const orig = window.CodeMirror.hint.sql;
  if (!window.CodeMirror.hint.sql.__chinook) {
    const wrapped = (c, opts) => {
      const res = orig(c, opts);
      if (!res) return res;
      const cur = c.getCursor(), tok = c.getTokenAt(cur);
      const word = (tok.string || '').toUpperCase();
      if (word.length >= 2 && !tok.string.includes('.')) {
        MYSQL_WORDS.filter(w => w.startsWith(word) && !res.list.some(x => (x.text || x).toUpperCase() === w)).forEach(w => res.list.push(w));
      }
      return res;
    };
    wrapped.__chinook = true;
    window.CodeMirror.hint.sql = wrapped;
  }
  return cm;
}

export function insertAtCursor(cm, text) {
  cm.replaceSelection(text);
  cm.focus();
}
