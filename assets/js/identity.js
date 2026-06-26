// identity.js — «авторизация по куки»: имя вводится один раз и запоминается.
// Личность хранится в localStorage и дублируется в cookie (на случай очистки одного из хранилищ).
// Никакого сервера: это просто стабильный id + имя на устройстве пользователя.
const Identity = (() => {
  const KEY = 'hq_user';
  const COOKIE = 'hq_user';
  const COOKIE_DAYS = 3650; // ~10 лет, «запомнили навсегда»

  function setCookie(name, value, days){
    const d = new Date();
    d.setTime(d.getTime() + days*24*60*60*1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  }
  function getCookie(name){
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function genId(){
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // Возвращает {id, name} или null, если пользователь ещё не представился.
  function get(){
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch(e){}
    if (!raw) raw = getCookie(COOKIE);
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      if (obj && obj.id && obj.name) {
        // если данные нашлись только в cookie — восстановим localStorage
        try { localStorage.setItem(KEY, raw); } catch(e){}
        return obj;
      }
    } catch(e){}
    return null;
  }

  // Сохраняет/обновляет имя. id создаётся один раз и больше не меняется.
  function save(name){
    const clean = String(name || '').trim().slice(0, 40) || 'Аноним';
    const existing = get();
    const user = { id: existing ? existing.id : genId(), name: clean };
    const raw = JSON.stringify(user);
    try { localStorage.setItem(KEY, raw); } catch(e){}
    setCookie(COOKIE, raw, COOKIE_DAYS);
    return user;
  }

  function initials(name){
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return { get, save, initials };
})();
