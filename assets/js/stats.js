// stats.js — личная статистика, хранится локально в браузере (localStorage),
// привязана к id пользователя из identity.js. Никуда не отправляется.
const Stats = (() => {
  function key(){
    const u = Identity.get();
    return 'hq_stats_' + (u ? u.id : 'guest');
  }

  function empty(){
    return {
      totalQuizzes: 0,   // сколько квизов завершено
      totalAnswered: 0,  // всего отвечено вопросов
      totalCorrect: 0,   // из них верно
      best: null,        // лучший результат: {pct, score, total, topic, date}
      topics: {},        // по темам: { [title]: {bestPct, attempts} }
      history: []        // последние прохождения (ограничено)
    };
  }

  function get(){
    try {
      const raw = localStorage.getItem(key());
      if (raw) return Object.assign(empty(), JSON.parse(raw));
    } catch(e){}
    return empty();
  }

  function save(s){
    try { localStorage.setItem(key(), JSON.stringify(s)); } catch(e){}
  }

  // res: {topic, score, total, pct}
  function record(res){
    const s = get();
    s.totalQuizzes++;
    s.totalAnswered += res.total;
    s.totalCorrect += res.score;

    if (!s.best || res.pct > s.best.pct || (res.pct === s.best.pct && res.total > s.best.total)){
      s.best = { pct: res.pct, score: res.score, total: res.total, topic: res.topic, date: Date.now() };
    }

    const t = s.topics[res.topic] || { bestPct: 0, attempts: 0 };
    t.attempts++;
    if (res.pct > t.bestPct) t.bestPct = res.pct;
    s.topics[res.topic] = t;

    s.history.unshift({ topic: res.topic, score: res.score, total: res.total, pct: res.pct, date: Date.now() });
    s.history = s.history.slice(0, 30);

    save(s);
    return s;
  }

  function avgPct(){
    const s = get();
    if (!s.totalAnswered) return 0;
    return Math.round(s.totalCorrect / s.totalAnswered * 100);
  }

  function reset(){
    try { localStorage.removeItem(key()); } catch(e){}
  }

  return { get, record, avgPct, reset };
})();
