/**
 * Code.gs — бесплатный мини-API для общего рейтинга квиза на Google Apps Script.
 * Данные хранятся в Google Таблице (один лист "leaderboard").
 *
 * Как развернуть — см. README, раздел «Лидерборд».
 * Кратко:
 *   1) Создай Google Таблицу → Расширения → Apps Script.
 *   2) Вставь этот код, сохрани.
 *   3) Развернуть → Новое развёртывание → тип «Веб-приложение».
 *      Выполнять от имени: «Я». Доступ: «Все».
 *   4) Скопируй URL (…/exec) и вставь его в assets/js/leaderboard.js → LEADERBOARD_API.
 */

const SHEET_NAME = 'leaderboard';

function doGet(e){
  const action = (e && e.parameter && e.parameter.action) || 'top';
  if (action === 'top'){
    const limit = Number(e.parameter.limit) || 20;
    return json(getTop(limit));
  }
  return json({ ok: true });
}

function doPost(e){
  try {
    const data = JSON.parse(e.postData.contents);
    addScore(data);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function sheet(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh){
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['ts', 'userId', 'name', 'topic', 'score', 'total', 'pct']);
  }
  return sh;
}

function addScore(d){
  const sh = sheet();
  sh.appendRow([
    new Date(),
    String(d.userId || ''),
    String(d.name || 'Аноним').slice(0, 40),
    String(d.topic || '').slice(0, 80),
    Number(d.score) || 0,
    Number(d.total) || 0,
    Number(d.pct) || 0
  ]);
}

// Лучший результат каждого игрока, отсортированный по % затем по очкам.
function getTop(limit){
  const sh = sheet();
  const rows = sh.getDataRange().getValues();
  rows.shift(); // убираем заголовок

  const best = {};
  rows.forEach(r => {
    const [ts, userId, name, topic, score, total, pct] = r;
    const key = userId || name;
    if (!key) return;
    const cand = { name, topic, score: Number(score), total: Number(total), pct: Number(pct), ts };
    const cur = best[key];
    if (!cur || cand.pct > cur.pct || (cand.pct === cur.pct && cand.score > cur.score)){
      best[key] = cand;
    }
  });

  return Object.values(best)
    .sort((a, b) => b.pct - a.pct || b.score - a.score || new Date(a.ts) - new Date(b.ts))
    .slice(0, limit)
    .map((x, i) => ({
      rank: i + 1,
      name: x.name,
      topic: x.topic,
      score: x.score,
      total: x.total,
      pct: x.pct
    }));
}

function json(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
