// Google Apps Script 서비스(드라이브, 시트, 캐시 등)를 흉내 내는 테스트용 가짜 환경
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

export function createGas() {
  let seq = 0;
  const nid = (p) => `${p}${++seq}`;
  const files = new Map();
  const folders = new Map();
  const spreadsheets = new Map();
  const logs = [];

  const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };

  // 시트에 값을 넣을 때 실제 구글 시트처럼 형 변환을 흉내 냄
  const coerce = (v) => {
    if (typeof v !== 'string') return v;
    if (v.startsWith("'")) return v.slice(1);
    if (v === 'true' || v === 'TRUE') return true;
    if (v === 'false' || v === 'FALSE') return false;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v);
    if (v.startsWith('=')) return `#FORMULA(${v})`;
    return v;
  };

  class Folder {
    constructor(name, parent) { this.id = nid('fo'); this.name = name; this.parent = parent; this.trashed = false; folders.set(this.id, this); }
    getId() { return this.id; }
    getName() { return this.name; }
    getUrl() { return `https://drive/folders/${this.id}`; }
    isTrashed() { return this.trashed; }
    createFolder(name) { return new Folder(name, this); }
    getFoldersByName(name) { return iter([...folders.values()].filter((f) => f.parent === this && f.name === name)); }
    children() { return [...files.values()].filter((f) => f.parent === this && !f.trashed); }
    getFilesByName(name) { return iter(this.children().filter((f) => f.name === name)); }
    getFiles() { return iter(this.children()); }
    createFile(a, content, mime) {
      if (a instanceof Blob) return new File(a.name, a.data, a.mime, this);
      return new File(a, content, mime, this);
    }
  }
  class File {
    constructor(name, data, mime, parent, id) { this.id = id || nid('fi'); this.name = name; this.data = data; this.mime = mime; this.parent = parent; this.trashed = false; this.desc = ''; files.set(this.id, this); }
    getId() { return this.id; }
    getName() { return this.name; }
    getUrl() { return `https://drive/file/${this.id}`; }
    getBlob() { return new Blob(this.data, this.mime, this.name); }
    setContent(c) { this.data = c; }
    setDescription(d) { this.desc = d; return this; }
    getDescription() { return this.desc; }
    setTrashed(t) { this.trashed = t; }
    isTrashed() { return this.trashed; }
    moveTo(folder) { this.parent = folder; return this; }
  }
  class Blob {
    constructor(data, mime, name) { this.data = data; this.mime = mime; this.name = name; }
    getDataAsString() { return String(this.data); }
    getAs(mime) { return new Blob(`PDF:${this.data}`, mime, this.name); }
    setName(n) { this.name = n; return this; }
    getName() { return this.name; }
  }

  class Range {
    constructor(sheet, r, c, nr = 1, nc = 1) { Object.assign(this, { sheet, r, c, nr, nc }); }
    getValues() {
      const out = [];
      for (let i = 0; i < this.nr; i++) {
        const row = [];
        for (let j = 0; j < this.nc; j++) {
          const v = (this.sheet.data[this.r - 1 + i] || [])[this.c - 1 + j];
          row.push(v === undefined ? '' : v);
        }
        out.push(row);
      }
      return out;
    }
    setValues(vals) {
      vals.forEach((row, i) => row.forEach((v, j) => {
        const ri = this.r - 1 + i;
        while (this.sheet.data.length <= ri) this.sheet.data.push([]);
        this.sheet.data[ri][this.c - 1 + j] = coerce(v);
      }));
      return this;
    }
    setValue(v) { return this.setValues([[v]]); }
    setFontWeight() { return this; }
    setBackground() { return this; }
    setNumberFormat() { return this; }
    getRow() { return this.r; }
    createTextFinder(text) {
      const self = this;
      return {
        matchEntireCell() { return this; },
        findNext() {
          for (let i = 0; i < self.nr; i++) {
            const v = (self.sheet.data[self.r - 1 + i] || [])[self.c - 1];
            if (String(v) === text) return new Range(self.sheet, self.r + i, self.c);
          }
          return null;
        },
      };
    }
  }
  class Sheet {
    constructor(name) { this.name = name; this.data = []; }
    getName() { return this.name; }
    getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
    getDataRange() { return new Range(this, 1, 1, Math.max(1, this.data.length), Math.max(1, this.getLastColumn())); }
    getLastRow() { return this.data.length; }
    getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r.length), 0); }
    getMaxRows() { return 1000; }
    appendRow(arr) { this.data.push(arr.map(coerce)); }
    deleteRow(i) { this.data.splice(i - 1, 1); }
    setFrozenRows() {}
    setFrozenColumns() {}
  }
  class Spreadsheet {
    constructor(name) {
      this.name = name;
      this.sheets = [new Sheet('Sheet1')];
      this.file = new File(name, '', 'application/vnd.google-apps.spreadsheet', root);
      this.id = this.file.id;
      spreadsheets.set(this.id, this);
    }
    getId() { return this.id; }
    getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
    insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; }
    getSheets() { return this.sheets; }
    deleteSheet(s) { this.sheets = this.sheets.filter((x) => x !== s); }
  }

  const root = new Folder('My Drive', null);
  const props = {};
  const cache = new Map();

  const ctx = {
    console: { log() {}, warn() {}, error: (...a) => logs.push(['error', ...a]) },
    Logger: { log: (m) => logs.push(m) },
    DriveApp: {
      getRootFolder: () => root,
      getFolderById: (id) => { const f = folders.get(id); if (!f) throw new Error('no folder'); return f; },
      getFileById: (id) => { const f = files.get(id); if (!f) throw new Error('no file'); return f; },
    },
    SpreadsheetApp: {
      create: (name) => new Spreadsheet(name),
      openById: (id) => { const s = spreadsheets.get(id); if (!s) throw new Error('no ss'); return s; },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    LanguageApp: { translate: (text, from, to) => { ctx.__translations = (ctx.__translations || 0) + 1; return `[${to}] ${text}`; } },
    ContentService: { createTextOutput: (s) => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    Utilities: {
      formatDate: (d, tz, fmt) => fmt.replace('yyyy', d.getFullYear()).replace('MM', String(d.getMonth() + 1).padStart(2, '0')).replace('dd', String(d.getDate()).padStart(2, '0')).replace('HH', '10').replace('mm', '00').replace('M', d.getMonth() + 1).replace('d', d.getDate()),
      newBlob: (data, mime, name) => new Blob(data, mime, name),
      computeDigest: (alg, s) => [...crypto.createHash('md5').update(s).digest()],
      base64EncodeWebSafe: (arr) => Buffer.from(arr.map((b) => b & 255)).toString('base64url'),
      DigestAlgorithm: { MD5: 'md5' },
      Charset: { UTF_8: 'utf8' },
      sleep() {},
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), ctx, { filename: 'Code.gs' });

  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).s);
  return { ctx, post, props, logs, files, folders, spreadsheets, root };
}
