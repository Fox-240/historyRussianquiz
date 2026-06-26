// leaderboard.js — общий рейтинг через Google Apps Script (см. apps-script/Code.gs и README).
//
// НАСТРОЙКА: вставь сюда URL веб-приложения Apps Script (заканчивается на /exec).
// Пока строка пустая — лидерборд работает в режиме «не настроен» и ничего не ломает.
const LEADERBOARD_API = 'https://script.google.com/macros/s/AKfycbyDHB4XBc-A3_cp2_0bg_ri8Uldub0Ef-yGAkKFFURalAZoifUbi0KP12kE5Zt9XRn-/exec';

const Leaderboard = (() => {
  function enabled(){ return !!LEADERBOARD_API; }

  // Отправка результата. POST с text/plain — это «простой» запрос без CORS-preflight,
  // который Apps Script корректно принимает (тело читается в doPost через e.postData.contents).
  async function submit(entry){
    if (!enabled()) return { ok: false, reason: 'disabled' };
    try {
      const res = await fetch(LEADERBOARD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(entry),
        redirect: 'follow'
      });
      return await res.json().catch(() => ({ ok: true }));
    } catch(e){
      return { ok: false, reason: String(e) };
    }
  }

  // Получение топа. Возвращает массив [{rank,name,topic,score,total,pct}] или null при ошибке.
  async function top(limit = 20){
    if (!enabled()) return null;
    try {
      const url = LEADERBOARD_API + '?action=top&limit=' + encodeURIComponent(limit);
      const res = await fetch(url, { redirect: 'follow' });
      const data = await res.json();
      return Array.isArray(data) ? data : (data.top || []);
    } catch(e){
      return null;
    }
  }

  return { enabled, submit, top };
})();
