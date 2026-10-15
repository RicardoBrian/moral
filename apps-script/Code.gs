/**
 * 시간 여행 도덕 수업 — Google Apps Script 서버
 *
 * 이 스크립트는 Cloudflare(사이트의 /api)를 통해서만 호출됩니다.
 * 관리자 비밀번호는 Cloudflare 비밀키(ADMIN_PASSWORD)에만 있고, 여기에는 없습니다.
 * Cloudflare 와 이 스크립트는 연결 키(GAS_KEY)를 나눠 갖고, 키가 맞는 요청만 처리합니다.
 *
 * 설치 방법 (자세한 내용은 README)
 *  1. script.google.com 에서 새 프로젝트를 만들고 이 파일 내용을 Code.gs 에 붙여 넣습니다.
 *  2. 함수 목록에서 setup 을 골라 실행합니다. (처음 한 번, 권한 허용)
 *     → 실행 로그에 연결 키(GAS_KEY)가 표시됩니다.
 *  3. 배포 → 새 배포 → 웹 앱 / 실행 사용자: 나 / 액세스 권한: 모든 사용자
 *  4. Cloudflare Pages 설정에 GAS_URL(웹 앱 URL), GAS_KEY(연결 키), ADMIN_PASSWORD(관리자 비밀번호)를 넣습니다.
 */

var ROOT_FOLDER_NAME = '시간여행 도덕수업 결과';
var SYSTEM_FOLDER_NAME = '_시스템 데이터 (수정 금지)';
var TIME_ZONE = 'Asia/Seoul';
var LANGS = ['ko', 'en', 'zh', 'ru'];
var TRANSLATE_CODE = { ko: 'ko', en: 'en', zh: 'zh-CN', ru: 'ru' };
var MAX_TEXT = 1000;

var SHEETS = {
  sessions: ['code', 'setId', 'label', 'bgm', 'active', 'createdAt'],
  submissions: ['submittedAt', 'submissionId', 'code', 'setId', 'studentId', 'grade', 'classNo', 'number', 'name', 'nickname', 'lang', 'total', 'honorary', 'json', 'pdfUrl', 'fileName'],
  progress: ['at', 'code', 'studentId', 'name', 'nickname', 'step'],
};

// =====================================================================
// 설치
// =====================================================================

function setup() {
  var props = PropertiesService.getScriptProperties();
  var root = getOrCreateFolder_(DriveApp.getRootFolder(), ROOT_FOLDER_NAME, props.getProperty('ROOT_ID'));
  var sys = getOrCreateFolder_(root, SYSTEM_FOLDER_NAME, props.getProperty('SYS_ID'));
  var sets = getOrCreateFolder_(sys, '문제집', props.getProperty('SETS_ID'));
  props.setProperty('ROOT_ID', root.getId());
  props.setProperty('SYS_ID', sys.getId());
  props.setProperty('SETS_ID', sets.getId());

  var dbId = props.getProperty('DB_ID');
  var db = null;
  if (dbId) {
    try { db = SpreadsheetApp.openById(dbId); } catch (e) { db = null; }
  }
  if (!db) {
    db = SpreadsheetApp.create('시스템 데이터베이스');
    DriveApp.getFileById(db.getId()).moveTo(sys);
    props.setProperty('DB_ID', db.getId());
  }
  Object.keys(SHEETS).forEach(function (name) { ensureSheet_(db, name); });
  var first = db.getSheetByName('Sheet1') || db.getSheetByName('시트1');
  if (first && db.getSheets().length > 1) db.deleteSheet(first);

  var key = props.getProperty('GAS_KEY');
  if (!key) {
    key = randomString_(40);
    props.setProperty('GAS_KEY', key);
  }
  Logger.log('설정이 끝났어요.');
  Logger.log('결과 폴더: ' + root.getUrl());
  Logger.log('Cloudflare 에 넣을 연결 키(GAS_KEY): ' + key);
  Logger.log('이제 [배포 → 새 배포 → 웹 앱]으로 배포해 주세요. (실행 사용자: 나 / 액세스 권한: 모든 사용자)');
}

/** 자동 번역 권한을 미리 허용해 두는 테스트용 함수 (선택) */
function testTranslate() {
  Logger.log(LanguageApp.translate('안녕하세요', 'ko', 'en'));
}

// =====================================================================
// 웹 요청
// =====================================================================

function doGet() {
  return json_({ ok: true, result: { service: 'moral-timeline', ready: isReady_() } });
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = String(body.action || '');
    if (!isReady_()) throw apiError_('SETUP_REQUIRED');
    checkKey_(body.key);
    var result;
    if (PUBLIC_ACTIONS.hasOwnProperty(action)) {
      result = PUBLIC_ACTIONS[action](body);
    } else if (ADMIN_ACTIONS.hasOwnProperty(action)) {
      // 관리자 비밀번호는 Cloudflare 가 확인하고, 확인된 요청에만 admin 표시를 붙여 보냅니다.
      if (body.admin !== true) throw apiError_('UNAUTHORIZED');
      result = ADMIN_ACTIONS[action](body);
    } else {
      throw apiError_('UNKNOWN_ACTION');
    }
    return json_({ ok: true, result: result });
  } catch (err) {
    var code = (err && err.apiCode) || 'SERVER_ERROR';
    if (code === 'SERVER_ERROR') console.error(err && err.stack ? err.stack : err);
    return json_({ ok: false, error: code, message: String((err && err.message) || err) });
  }
}

var PUBLIC_ACTIONS = {
  getSession: function (b) {
    var code = normalizeCode_(b.code);
    var sess = findSession_(code);
    if (!sess) throw apiError_('NOT_FOUND');
    if (!sess.active) throw apiError_('CLOSED');
    var set = readSet_(sess.setId);
    if (!set) throw apiError_('SET_MISSING');
    return { session: sess, set: set };
  },

  checkin: function (b) {
    var code = normalizeCode_(b.code);
    if (!code || !/^\d{5}$/.test(String(b.studentId || ''))) throw apiError_('INVALID');
    sheet_('progress').appendRow(cells_([
      new Date().toISOString(), code, String(b.studentId), clip_(b.name, 30), clip_(b.nickname, 30), clip_(b.step, 20),
    ]));
    return { ok: true };
  },

  submit: function (b) {
    return submit_(b.payload);
  },
};

var ADMIN_ACTIONS = {
  listSets: function () {
    var out = [];
    var it = setsFolder_().getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (f.isTrashed() || !/\.json$/.test(f.getName())) continue;
      var summary = null;
      try { summary = JSON.parse(f.getDescription() || 'null'); } catch (e) { summary = null; }
      if (!summary) {
        var s = parseJson_(f.getBlob().getDataAsString());
        if (!s) continue;
        summary = setSummary_(s);
      }
      out.push(summary);
    }
    out.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); });
    return out;
  },

  getSet: function (b) {
    var s = readSet_(b.id);
    if (!s) throw apiError_('NOT_FOUND');
    return s;
  },

  saveSet: function (b) {
    var set = b.set;
    if (!set || typeof set !== 'object' || !validId_(set.id) || !Array.isArray(set.stages)) throw apiError_('INVALID');
    set.updatedAt = new Date().toISOString();
    var content = JSON.stringify(set);
    var name = set.id + '.json';
    var folder = setsFolder_();
    var files = folder.getFilesByName(name);
    var file = files.hasNext() ? files.next() : null;
    if (file) file.setContent(content);
    else file = folder.createFile(name, content, 'application/json');
    file.setDescription(JSON.stringify(setSummary_(set)));
    CacheService.getScriptCache().remove('set:' + set.id);
    return set;
  },

  deleteSet: function (b) {
    if (!validId_(b.id)) throw apiError_('INVALID');
    var inUse = listSessions_().some(function (s) { return s.setId === b.id && s.active; });
    if (inUse) throw apiError_('SET_IN_USE');
    var files = setsFolder_().getFilesByName(b.id + '.json');
    while (files.hasNext()) files.next().setTrashed(true);
    CacheService.getScriptCache().remove('set:' + b.id);
    return { ok: true };
  },

  translateSet: function (b) {
    return translateSet_(b.set, b.onlyMissing !== false);
  },

  listSessions: function () {
    return listSessions_().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  },

  createSession: function (b) {
    if (!validId_(b.setId) || !readSet_(b.setId)) throw apiError_('NOT_FOUND');
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var existing = {};
      listSessions_().forEach(function (s) { existing[s.code] = true; });
      var code;
      do { code = randomString_(5); } while (existing[code]);
      var sess = { code: code, setId: b.setId, label: clip_(b.label, 30), bgm: b.bgm !== false, active: true, createdAt: new Date().toISOString() };
      sheet_('sessions').appendRow(cells_([sess.code, sess.setId, sess.label, String(sess.bgm), String(sess.active), sess.createdAt]));
      return sess;
    } finally {
      lock.releaseLock();
    }
  },

  updateSession: function (b) {
    var code = normalizeCode_(b.code);
    var sh = sheet_('sessions');
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) !== code) continue;
      var p = b.patch || {};
      if (p.hasOwnProperty('label')) sh.getRange(i + 1, 3).setValue(cells_([clip_(p.label, 30)])[0]);
      if (p.hasOwnProperty('bgm')) sh.getRange(i + 1, 4).setValue(cells_([String(!!p.bgm)])[0]);
      if (p.hasOwnProperty('active')) sh.getRange(i + 1, 5).setValue(cells_([String(!!p.active)])[0]);
      return findSession_(code);
    }
    throw apiError_('NOT_FOUND');
  },

  deleteSession: function (b) {
    var code = normalizeCode_(b.code);
    var sh = sheet_('sessions');
    var rows = sh.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][0]) === code) sh.deleteRow(i + 1);
    }
    return { ok: true };
  },

  dashboard: function (b) {
    var code = normalizeCode_(b.code);
    var sess = findSession_(code);
    if (!sess) throw apiError_('NOT_FOUND');
    var subs = readSubmissions_(function (r) { return r.code === code; });
    var progress = readRows_('progress').filter(function (r) { return r.code === code; });
    return { session: sess, submissions: subs, progress: progress };
  },

  /** 모든 수업의 제출물 (삭제한 수업 포함). 최신 제출이 먼저 옵니다. */
  listSubmissions: function () {
    return readSubmissions_(function () { return true; })
      .sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
  },
};

function readSubmissions_(filter) {
  var out = [];
  readRows_('submissions').forEach(function (r) {
    if (!filter(r)) return;
    var rec = parseJson_(r.json);
    if (!rec) return;
    rec.submittedAt = r.submittedAt;
    rec.pdfUrl = r.pdfUrl;
    rec.fileName = r.fileName;
    out.push(rec);
  });
  return out;
}

// =====================================================================
// 결과 제출
// =====================================================================

function submit_(p) {
  if (!p || typeof p !== 'object') throw apiError_('INVALID');
  if (!/^\d{5}$/.test(String(p.studentId || '')) || !p.submissionId || !Array.isArray(p.answers) || !Array.isArray(p.reflections)) throw apiError_('INVALID');
  var submissionId = clip_(p.submissionId, 80);

  // 같은 제출을 두 번 받으면 (네트워크 재시도 등) 처음 만든 결과를 그대로 돌려줍니다.
  var dup = findSubmission_(submissionId);
  if (dup) return { ok: true, duplicate: true, fileName: dup.fileName, pdfUrl: dup.pdfUrl };

  var code = normalizeCode_(p.code);
  var sess = findSession_(code);
  var setTitle = clip_(p.setTitle, 60) || '문제집';
  var label = clip_((sess && sess.label) || p.sessionLabel, 30) || code;
  var grade = Number(p.grade) || Number(String(p.studentId)[0]);
  var classNo = Number(p.classNo) || Number(String(p.studentId).slice(1, 3));
  var name = clip_(p.name, 20);

  // 학생이 다른 언어로 쓴 글은 한국어 번역을 함께 저장합니다.
  var answers = p.answers.slice(0, 40).map(function (a) {
    var reason = clip_(a.reason, MAX_TEXT);
    return {
      stageIndex: Number(a.stageIndex) || 0,
      dilemmaIndex: Number(a.dilemmaIndex) || 0,
      dilemmaId: clip_(a.dilemmaId, 80),
      dilemmaTitle: clip_(a.dilemmaTitle, 200),
      choiceId: clip_(a.choiceId, 80),
      choiceNo: Number(a.choiceNo) || 0,
      choiceText: clip_(a.choiceText, 400),
      reason: reason,
      reasonKo: toKorean_(reason),
    };
  });
  var reflections = p.reflections.slice(0, 10).map(function (r) {
    var text = clip_(r.text, MAX_TEXT);
    return {
      stageIndex: Number(r.stageIndex) || 0,
      stageId: clip_(r.stageId, 80),
      stageTitle: clip_(r.stageTitle, 200),
      text: text,
      textKo: toKorean_(text),
    };
  });
  var axes = (Array.isArray(p.axes) ? p.axes : []).slice(0, 4).map(function (a) {
    return { id: clip_(a.id, 40), name: clip_(a.name, 40), score: Number(a.score) || 0 };
  });
  var scores = {};
  axes.forEach(function (a) { scores[a.id] = a.score; });
  var rec = {
    submissionId: submissionId,
    code: code,
    sessionLabel: label,
    setId: clip_(p.setId, 80),
    setTitle: setTitle,
    studentId: String(p.studentId),
    grade: grade,
    classNo: classNo,
    number: Number(p.number) || Number(String(p.studentId).slice(3, 5)),
    name: name,
    nickname: clip_(p.nickname, 20),
    lang: LANGS.indexOf(p.lang) >= 0 ? p.lang : 'ko',
    axes: axes,
    scores: scores,
    total: Number(p.total) || 0,
    honorary: !!p.honorary,
    passScore: Number(p.passScore) || 70,
    answers: answers,
    reflections: reflections,
    startedAt: clip_(p.startedAt, 40),
    finishedAt: clip_(p.finishedAt, 40),
  };

  var now = new Date();
  var dateText = Utilities.formatDate(now, TIME_ZONE, 'yyyy-MM-dd');
  var baseName = safeName_([rec.studentId, name, setTitle, label, dateText].join('_'));
  var pdfBlob = Utilities.newBlob(certificateHtml_(rec, now), 'text/html', baseName + '.html').getAs('application/pdf');

  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    dup = findSubmission_(submissionId);
    if (dup) return { ok: true, duplicate: true, fileName: dup.fileName, pdfUrl: dup.pdfUrl };

    var root = rootFolder_();
    var setFolder = getOrCreateFolder_(root, safeName_(setTitle + '_' + label));
    var classFolder = getOrCreateFolder_(setFolder, grade + '학년 ' + classNo + '반');

    var fileName = baseName + '.pdf';
    var n = 2;
    while (classFolder.getFilesByName(fileName).hasNext()) {
      fileName = baseName + '_' + n + '.pdf';
      n++;
    }
    var file = classFolder.createFile(pdfBlob.setName(fileName));
    var pdfUrl = file.getUrl();

    appendSummaryRow_(classFolder, safeName_(setTitle + '_' + label + '_' + grade + '학년 ' + classNo + '반_요약'), rec, now, pdfUrl);

    var json = JSON.stringify(rec);
    if (json.length > 49000) {
      // 스프레드시트 한 칸에는 5만 자까지만 들어가므로, 넘치면 원문을 줄여서 저장합니다. (PDF 와 요약 시트에는 전체가 남아 있음)
      rec.answers.forEach(function (a) { a.reason = clip_(a.reason, 300); a.reasonKo = clip_(a.reasonKo, 300); });
      rec.reflections.forEach(function (r) { r.text = clip_(r.text, 600); r.textKo = clip_(r.textKo, 600); });
      json = JSON.stringify(rec);
    }
    sheet_('submissions').appendRow(cells_([
      now.toISOString(), submissionId, code, rec.setId, rec.studentId, String(grade), String(classNo), String(rec.number),
      name, rec.nickname, rec.lang, String(rec.total), String(rec.honorary), json, pdfUrl, fileName,
    ]));
    return { ok: true, fileName: fileName, pdfUrl: pdfUrl };
  } finally {
    lock.releaseLock();
  }
}

/** 반 폴더 안의 요약 스프레드시트에 한 줄을 추가합니다. 필요한 열이 없으면 오른쪽에 새로 만듭니다. */
function appendSummaryRow_(folder, sheetName, rec, now, pdfUrl) {
  var files = folder.getFilesByName(sheetName);
  var ss;
  if (files.hasNext()) {
    ss = SpreadsheetApp.openById(files.next().getId());
  } else {
    ss = SpreadsheetApp.create(sheetName);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
  }
  var sh = ss.getSheets()[0];

  var row = {};
  row['제출 시각'] = Utilities.formatDate(now, TIME_ZONE, 'yyyy.MM.dd HH:mm');
  row['학번'] = "'" + rec.studentId;
  row['이름'] = rec.name;
  row['닉네임'] = rec.nickname;
  row['언어'] = { ko: '한국어', en: '영어', zh: '중국어', ru: '러시아어' }[rec.lang] || rec.lang;
  rec.axes.forEach(function (a) { row[a.name] = a.score; });
  row['종합'] = rec.total;
  row['등급'] = rec.honorary ? '명예' : '예비';
  rec.answers.forEach(function (a) {
    var k = (a.stageIndex + 1) + '-' + (a.dilemmaIndex + 1);
    row[k + ' 선택'] = a.choiceText;
    row[k + ' 이유'] = a.reasonKo || a.reason;
    if (a.reasonKo && a.reasonKo !== a.reason) row[k + ' 이유(원문)'] = a.reason;
  });
  rec.reflections.forEach(function (r) {
    var k = '성찰' + (r.stageIndex + 1);
    row[k] = r.textKo || r.text;
    if (r.textKo && r.textKo !== r.text) row[k + '(원문)'] = r.text;
  });
  row['PDF'] = pdfUrl;

  var lastCol = sh.getLastColumn();
  var headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var added = false;
  Object.keys(row).forEach(function (k) {
    if (headers.indexOf(k) < 0) { headers.push(k); added = true; }
  });
  if (added || !lastCol) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f2f4f6');
    sh.setFrozenRows(1);
    sh.setFrozenColumns(3);
  }
  var values = headers.map(function (h) { return row.hasOwnProperty(h) ? cellText_(row[h]) : ''; });
  sh.getRange(sh.getLastRow() + 1, 1, 1, values.length).setValues([values]);
}

function certificateHtml_(rec, now) {
  var e = escapeHtml_;
  var date = Utilities.formatDate(now, TIME_ZONE, 'yyyy년 M월 d일 HH:mm');
  var langName = { ko: '한국어', en: '영어', zh: '중국어', ru: '러시아어' }[rec.lang] || rec.lang;
  var scores = rec.axes.map(function (a) {
    return '<td><div class="k">' + e(a.name) + '</div><div class="v">' + e(a.score) + '</div></td>';
  }).join('') + '<td class="total"><div class="k">종합</div><div class="v">' + e(rec.total) + '</div></td>';

  var answers = rec.answers.map(function (a) {
    var orig = a.reasonKo && a.reasonKo !== a.reason ? '<div class="orig">원문: ' + e(a.reason) + '</div>' : '';
    return '<tr><td class="no">' + (a.stageIndex + 1) + '-' + (a.dilemmaIndex + 1) + '</td><td><b>' + e(a.dilemmaTitle) + '</b><div class="choice">선택: ' + e(a.choiceText) + '</div><div>이유: ' + e(a.reasonKo || a.reason) + '</div>' + orig + '</td></tr>';
  }).join('');

  var refl = rec.reflections.map(function (r) {
    var orig = r.textKo && r.textKo !== r.text ? '<div class="orig">원문: ' + e(r.text) + '</div>' : '';
    return '<tr><td class="no">' + (r.stageIndex + 1) + '</td><td><b>' + e(r.stageTitle) + '</b><div>' + e(r.textKo || r.text) + '</div>' + orig + '</td></tr>';
  }).join('');

  return '<!doctype html><html><head><meta charset="utf-8"><style>'
    + 'body{font-family:"Noto Sans KR",sans-serif;color:#191f28;font-size:11pt;margin:0;padding:24px;}'
    + 'h1{font-size:20pt;margin:0 0 4px;text-align:center;}'
    + '.sub{text-align:center;color:#8b95a1;font-size:9pt;letter-spacing:2px;margin-bottom:18px;}'
    + '.box{border:1px solid #e5e8eb;border-radius:8px;padding:12px 16px;margin-bottom:14px;}'
    + '.info td{padding:3px 12px 3px 0;} .info .k{color:#8b95a1;}'
    + 'table{border-collapse:collapse;width:100%;}'
    + '.scores td{border:1px solid #e5e8eb;text-align:center;padding:8px;} .scores .k{color:#8b95a1;font-size:9pt;} .scores .v{font-size:15pt;font-weight:bold;}'
    + '.scores .total{background:#e8f3ff;}'
    + 'h2{font-size:12pt;margin:18px 0 8px;}'
    + '.list td{border-top:1px solid #e5e8eb;padding:8px 6px;vertical-align:top;} .list .no{width:36px;color:#8b95a1;}'
    + '.choice{color:#3182f6;margin:2px 0;} .orig{color:#8b95a1;font-size:9pt;margin-top:2px;}'
    + '.foot{margin-top:20px;color:#8b95a1;font-size:9pt;text-align:right;}'
    + '</style></head><body>'
    + '<h1>' + (rec.honorary ? '명예 세계시민 증명서' : '예비 세계시민 증명서') + '</h1>'
    + '<div class="sub">CERTIFICATE OF GLOBAL CITIZENSHIP</div>'
    + '<div class="box"><table class="info"><tr><td class="k">이름</td><td><b>' + e(rec.name) + '</b></td><td class="k">학번</td><td>' + e(rec.studentId) + '</td><td class="k">닉네임</td><td>' + e(rec.nickname) + '</td></tr>'
    + '<tr><td class="k">문제집</td><td colspan="3">' + e(rec.setTitle) + ' · ' + e(rec.sessionLabel) + '</td><td class="k">언어</td><td>' + e(langName) + '</td></tr></table></div>'
    + '<table class="scores"><tr>' + scores + '</tr></table>'
    + '<h2>딜레마 선택과 이유</h2><table class="list">' + answers + '</table>'
    + '<h2>성찰과 실천 약속</h2><table class="list">' + refl + '</table>'
    + '<div class="foot">제출 ' + e(date) + ' · 수업 코드 ' + e(rec.code) + '</div>'
    + '</body></html>';
}

// =====================================================================
// 번역
// =====================================================================

function hangulRatio_(s) {
  var letters = String(s || '').replace(/[\s\d\p{P}\p{S}]/gu, '');
  if (!letters.length) return 1;
  var hangul = (letters.match(/[가-힣ㄱ-ㆎ]/g) || []).length;
  return hangul / letters.length;
}

/** 한국어가 아닌 글이면 한국어로 번역합니다. 실패하면 원문을 그대로 둡니다. */
function toKorean_(text) {
  if (!text || hangulRatio_(text) >= 0.5) return text;
  return cachedTranslate_(text, '', 'ko') || text;
}

function cachedTranslate_(text, from, to) {
  var cache = CacheService.getScriptCache();
  var key = 'tr:' + to + ':' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, from + '|' + text, Utilities.Charset.UTF_8));
  var hit = cache.get(key);
  if (hit) return hit;
  try {
    var out = LanguageApp.translate(text, from, to);
    if (out && out.length < 90000) cache.put(key, out, 21600);
    return out;
  } catch (e) {
    console.warn('번역 실패: ' + e);
    return '';
  }
}

function translateSet_(set, onlyMissing) {
  if (!set || typeof set !== 'object') throw apiError_('INVALID');
  var started = Date.now();
  var total = 0;
  var done = 0;
  var partial = false;
  var fields = [];
  var add = function (f) { if (f && typeof f === 'object' && f.ko && String(f.ko).trim()) fields.push(f); };
  add(set.title); add(set.description);
  (set.axes || []).forEach(function (a) { add(a.name); });
  if (set.wizard) { add(set.wizard.name); (set.wizard.prologue || []).forEach(add); }
  (set.stages || []).forEach(function (st) {
    [st.title, st.year, st.place, st.description].forEach(add);
    (st.dilemmas || []).forEach(function (d) {
      [d.title, d.context, d.hint, d.wizardLine].forEach(add);
      (d.choices || []).forEach(function (c) { [c.text, c.feedbackTitle, c.feedback].forEach(add); });
    });
    if (st.reflection) [st.reflection.title, st.reflection.guide, st.reflection.placeholder].forEach(add);
  });
  fields.forEach(function (f) {
    ['en', 'zh', 'ru'].forEach(function (l) {
      if (onlyMissing && f[l] && String(f[l]).trim()) return;
      total++;
      // 한 번의 요청이 너무 길어지지 않도록 80초가 지나면 멈추고 지금까지 한 것만 돌려줍니다.
      // (화면에서 남은 칸을 이어서 자동으로 다시 요청합니다)
      if (Date.now() - started > 80 * 1000) { partial = true; return; }
      var out = cachedTranslate_(String(f.ko), 'ko', TRANSLATE_CODE[l]);
      if (out) { f[l] = out; done++; }
    });
  });
  return { set: set, total: total, done: done, partial: partial };
}

// =====================================================================
// 저장소 도우미
// =====================================================================

function isReady_() {
  var p = PropertiesService.getScriptProperties();
  return !!(p.getProperty('DB_ID') && p.getProperty('SETS_ID') && p.getProperty('ROOT_ID') && p.getProperty('GAS_KEY'));
}

/** Cloudflare 를 거치지 않은 요청(연결 키가 없거나 틀림)은 거절합니다. */
function checkKey_(key) {
  var real = PropertiesService.getScriptProperties().getProperty('GAS_KEY');
  if (!key || !real || String(key).length !== real.length) throw apiError_('FORBIDDEN');
  var diff = 0;
  for (var i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ String(key).charCodeAt(i);
  if (diff !== 0) throw apiError_('FORBIDDEN');
}

function rootFolder_() { return DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('ROOT_ID')); }
function setsFolder_() { return DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('SETS_ID')); }

function db_() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DB_ID'));
}

function sheet_(name) {
  return ensureSheet_(db_(), name);
}

function ensureSheet_(db, name) {
  var sh = db.getSheetByName(name);
  if (!sh) {
    sh = db.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readRows_(name) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var header = SHEETS[name];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var o = {};
    header.forEach(function (h, j) { o[h] = values[i][j] === undefined ? '' : String(values[i][j]); });
    out.push(o);
  }
  return out;
}

function listSessions_() {
  return readRows_('sessions').filter(function (r) { return r.code; }).map(function (r) {
    return { code: r.code, setId: r.setId, label: r.label, bgm: r.bgm !== 'false' && r.bgm !== 'FALSE', active: r.active === 'true' || r.active === 'TRUE', createdAt: r.createdAt };
  });
}

function findSession_(code) {
  if (!code) return null;
  var list = listSessions_();
  for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i];
  return null;
}

function findSubmission_(submissionId) {
  var sh = sheet_('submissions');
  var found = sh.getRange(1, 2, Math.max(1, sh.getLastRow()), 1).createTextFinder(submissionId).matchEntireCell(true).findNext();
  if (!found || found.getRow() === 1) return null;
  var row = sh.getRange(found.getRow(), 1, 1, SHEETS.submissions.length).getValues()[0];
  return { pdfUrl: String(row[14]), fileName: String(row[15]) };
}

function readSet_(id) {
  if (!validId_(id)) return null;
  var cache = CacheService.getScriptCache();
  var hit = cache.get('set:' + id);
  if (hit) return parseJson_(hit);
  var files = setsFolder_().getFilesByName(id + '.json');
  if (!files.hasNext()) return null;
  var text = files.next().getBlob().getDataAsString();
  if (text.length < 95000) cache.put('set:' + id, text, 600);
  return parseJson_(text);
}

function setSummary_(s) {
  var dilemmas = 0;
  (s.stages || []).forEach(function (st) { dilemmas += (st.dilemmas || []).length; });
  return { id: s.id, title: s.title, stages: (s.stages || []).length, dilemmas: dilemmas, updatedAt: s.updatedAt || '' };
}

function getOrCreateFolder_(parent, name, id) {
  if (id) {
    try {
      var f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (e) { /* 지워졌으면 새로 만듭니다 */ }
  }
  var it = parent.getFoldersByName(name);
  while (it.hasNext()) {
    var found = it.next();
    if (!found.isTrashed()) return found;
  }
  return parent.createFolder(name);
}

// =====================================================================
// 작은 도우미
// =====================================================================

function apiError_(code) {
  var e = new Error(code);
  e.apiCode = code;
  return e;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function parseJson_(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}

function clip_(v, n) {
  if (v === null || v === undefined) return '';
  var s = String(v).trim();
  return s.length > n ? s.slice(0, n) : s;
}

function normalizeCode_(c) {
  return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

function validId_(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id);
}

/** 스프레드시트에서 =, +, -, @ 로 시작하는 글이 수식으로 실행되지 않게 막습니다. */
function cellText_(v) {
  if (typeof v !== 'string') return v;
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

/** 시스템 시트에 쓸 때: 앞에 ' 를 붙여 학번·날짜·true 같은 값이 숫자/날짜로 바뀌지 않고 글자 그대로 저장되게 합니다. */
function cells_(arr) {
  return arr.map(function (v) { return typeof v === 'string' && v !== '' ? "'" + v : v; });
}

function safeName_(s) {
  return String(s || '').replace(/[\\/:*?"<>|#%\n\r\t]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) || '이름없음';
}

function escapeHtml_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function randomString_(n) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  for (var i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
