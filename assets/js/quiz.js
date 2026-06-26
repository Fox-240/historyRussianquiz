// quiz.js — основная логика квиза + профиль, статистика и лидерборд.
// Зависит от: questions.js (TOPICS), identity.js, stats.js, leaderboard.js.
let activeQuestions = [];
let activeTitle = "";
let idx = 0;
let score = 0;
let answered = false;
let wrongLog = [];

const menuEl = document.getElementById('menu');
const quizEl = document.getElementById('quiz');
const resultEl = document.getElementById('result');
const statsEl = document.getElementById('stats');
const leaderboardEl = document.getElementById('leaderboard');

/* ---------------- Профиль (идентификация по куки) ---------------- */
function renderProfile(){
  const u = Identity.get();
  const el = document.getElementById('profile');
  if (!el) return;
  if (!u){ el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.querySelector('.avatar').textContent = Identity.initials(u.name);
  el.querySelector('.nm').textContent = u.name;
}

function openNamePrompt(canCancel){
  const overlay = document.getElementById('nameModal');
  const input = document.getElementById('nameInput');
  const u = Identity.get();
  input.value = u ? u.name : '';
  document.getElementById('nameCancel').style.display = canCancel ? '' : 'none';
  overlay.classList.add('show');
  setTimeout(() => input.focus(), 50);
}
function closeNamePrompt(){ document.getElementById('nameModal').classList.remove('show'); }
function saveName(){
  const val = document.getElementById('nameInput').value;
  if (!val.trim()){ toast('Введите имя'); return; }
  Identity.save(val);
  closeNamePrompt();
  refreshAll();
  toast('Сохранено: ' + val.trim());
}
function refreshAll(){ renderProfile(); buildMenu(); }

/* ---------------- Меню ---------------- */
function buildMenu(){
  let html = `
    <div class="nav-row">
      <button class="nav-btn" onclick="showStats()">📊 Моя статистика</button>
      <button class="nav-btn" onclick="showLeaderboard()">🏆 Рейтинг</button>
    </div>`;
  const semLabels = {1:'Семестр 1', 2:'Семестр 2', 3:'Дополнительно (§67–100): Советский период'};
  [1,2,3].forEach(sem=>{
    html += `<div class="sem-title">${semLabels[sem]}</div>`;
    let n=0;
    TOPICS.filter(t=>t.sem===sem).forEach(t=>{
      n++;
      html += `<button class="topic-btn" onclick="startTopic('${t.id}')">
        <span class="topic-num">${n}</span>
        <span>${t.title}</span>
        <span class="meta">${t.questions.length} вопр.</span>
      </button>`;
    });
  });
  html += `<button class="all-btn" onclick="startAll()">🎲 Пройти всё подряд (${totalQuestions()} вопросов)</button>`;
  menuEl.innerHTML = html;
}
function totalQuestions(){return TOPICS.reduce((s,t)=>s+t.questions.length,0)}

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}

function startTopic(id){
  const t = TOPICS.find(x=>x.id===id);
  activeTitle = t.title;
  activeQuestions = prepare(t.questions);
  launch();
}
function startAll(){
  activeTitle = "Все темы (все разделы)";
  let all=[];
  TOPICS.forEach(t=>{ t.questions.forEach(q=>all.push({...q,_topic:t.title})) });
  activeQuestions = prepare(shuffle(all));
  launch();
}

// перемешиваем варианты ответов внутри каждого вопроса
function prepare(qs){
  return qs.map(q=>{
    const optsWithIdx = q.options.map((o,i)=>({o,correct:i===q.correct}));
    const sh = shuffle(optsWithIdx);
    return {
      ...q,
      options: sh.map(x=>x.o),
      correct: sh.findIndex(x=>x.correct)
    };
  });
}

function hideAll(){
  menuEl.classList.add('hidden');
  quizEl.classList.add('hidden');
  resultEl.classList.add('hidden');
  if (statsEl) statsEl.classList.add('hidden');
  if (leaderboardEl) leaderboardEl.classList.add('hidden');
}

function launch(){
  idx=0;score=0;wrongLog=[];
  hideAll();
  quizEl.classList.remove('hidden');
  renderQuestion();
}

function renderQuestion(){
  answered=false;
  const q = activeQuestions[idx];
  document.getElementById('quizTopic').textContent = q._topic ? q._topic : activeTitle;
  document.getElementById('questionText').textContent = q.q;
  document.getElementById('progressText').textContent = `Вопрос ${idx+1} из ${activeQuestions.length}`;
  document.getElementById('scoreText').textContent = `Очки: ${score}`;
  document.getElementById('progressFill').style.width = (idx/activeQuestions.length*100)+'%';

  const letters=['А','Б','В','Г','Д'];
  const optsEl = document.getElementById('options');
  optsEl.innerHTML='';
  q.options.forEach((opt,i)=>{
    const b=document.createElement('button');
    b.className='opt';
    b.innerHTML=`<span class="letter">${letters[i]}</span><span>${opt}</span>`;
    b.onclick=()=>selectAnswer(i);
    optsEl.appendChild(b);
  });

  document.getElementById('explain').className='explain';
  document.getElementById('nextBtn').classList.remove('show');
}

function selectAnswer(i){
  if(answered)return;
  answered=true;
  const q=activeQuestions[idx];
  const buttons=document.querySelectorAll('.opt');
  buttons.forEach((b,bi)=>{
    b.disabled=true;
    if(bi===q.correct)b.classList.add('correct');
    if(bi===i && i!==q.correct)b.classList.add('wrong');
  });

  const ex=document.getElementById('explain');
  const tag=document.getElementById('explainTag');
  const revealTitle=document.getElementById('revealTitle');
  const txt=document.getElementById('explainText');

  if(i===q.correct){
    score++;
    ex.className='explain show ok';
    tag.textContent='✓ Верно!';
    revealTitle.textContent='';
    txt.textContent=q.explain;
  }else{
    ex.className='explain show no';
    tag.textContent='✗ Неверно — раскрываем тему';
    revealTitle.textContent='Правильный ответ: '+q.options[q.correct];
    txt.textContent=q.explain;
    wrongLog.push({q:q.q, answer:q.options[q.correct], explain:q.explain});
  }
  document.getElementById('scoreText').textContent=`Очки: ${score}`;
  document.getElementById('nextBtn').classList.add('show');
  document.getElementById('nextBtn').textContent = (idx===activeQuestions.length-1)?'Показать результат →':'Далее →';
}

function nextQuestion(){
  idx++;
  if(idx>=activeQuestions.length){showResult();return}
  renderQuestion();
}

function showResult(){
  hideAll();
  resultEl.classList.remove('hidden');
  const total=activeQuestions.length;
  const pct=Math.round(score/total*100);
  let grade, emoji;
  if(pct>=90){grade='Отлично! Материал освоен';emoji='🏆'}
  else if(pct>=70){grade='Хорошо, но есть пробелы';emoji='👍'}
  else if(pct>=50){grade='Удовлетворительно — стоит повторить';emoji='📖'}
  else{grade='Нужно изучить тему заново';emoji='💪'}

  // 1) Записываем личную статистику (локально)
  Stats.record({ topic: activeTitle, score, total, pct });

  // 2) Отправляем результат в общий рейтинг (если настроен)
  let rankLine = '';
  const u = Identity.get();
  if (Leaderboard.enabled() && u){
    rankLine = `<div class="rank-badge" id="rankBadge">⏳ Отправляем в рейтинг…</div>`;
  }

  let html=`<div style="font-size:46px">${emoji}</div>
    <div class="score">${score} / ${total}</div>
    <div class="grade">${grade}</div>
    <div class="sub">Правильных ответов: ${pct}%</div>
    ${rankLine}`;

  if(wrongLog.length){
    html+=`<div class="wrong-list"><h3>📌 Что повторить (${wrongLog.length}):</h3>`;
    wrongLog.forEach(w=>{
      html+=`<div class="wrong-item"><b>${w.q}</b>Ответ: ${w.answer}<br>${w.explain}</div>`;
    });
    html+=`</div>`;
  }else{
    html+=`<div class="sub" style="color:var(--green)">Ни одной ошибки — великолепно!</div>`;
  }

  html+=`<div class="btn-row">
    <button class="btn-retry" onclick="retry()">↻ Ещё раз</button>
    <button class="btn-menu" onclick="goMenu()">☰ К темам</button>
  </div>
  <button class="share-btn" onclick="showLeaderboard()">🏆 Открыть рейтинг</button>
  <button class="share-btn" onclick="shareResult(${score},${total})">🔗 Поделиться результатом</button>`;
  resultEl.innerHTML=html;
  window.scrollTo({top:0,behavior:'smooth'});

  if (Leaderboard.enabled() && u){
    submitToLeaderboard({ userId: u.id, name: u.name, topic: activeTitle, score, total, pct });
  }
}

async function submitToLeaderboard(entry){
  await Leaderboard.submit(entry);
  const top = await Leaderboard.top(100);
  const badge = document.getElementById('rankBadge');
  if (!badge) return;
  const u = Identity.get();
  if (top && u){
    const mine = top.find(r => r.name === u.name);
    badge.textContent = mine ? `🏅 Твоё место в рейтинге: ${mine.rank}` : '✅ Результат отправлен в рейтинг';
  } else if (top){
    badge.textContent = '✅ Результат отправлен в рейтинг';
  } else {
    badge.textContent = '⚠ Не удалось связаться с рейтингом';
  }
}

async function shareResult(s,t){
  const text=`📜 Квиз по истории России: ${s}/${t} правильных! Проверь себя:`;
  const url=location.href.split('#')[0];
  try{
    if(navigator.share){ await navigator.share({title:'Квиз по истории России',text,url}); return; }
    await navigator.clipboard.writeText(text+' '+url);
    toast('Ссылка скопирована в буфер обмена');
  }catch(e){ /* пользователь закрыл диалог — ничего не делаем */ }
}

function toast(msg){
  let el=document.getElementById('toast');
  if(!el){el=document.createElement('div');el.id='toast';document.body.appendChild(el);}
  el.textContent=msg; el.classList.add('show');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),2200);
}

function retry(){
  activeQuestions=prepare(activeQuestions);
  launch();
}
function goMenu(){
  hideAll();
  menuEl.classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------------- Экран статистики ---------------- */
function showStats(){
  hideAll();
  statsEl.classList.remove('hidden');
  const s = Stats.get();
  let html = `<div class="section-head">
      <button class="back" onclick="goMenu()">← Назад</button>
      <h2>📊 Моя статистика</h2>
    </div>`;

  if (!s.totalQuizzes){
    html += `<div class="empty-note">Пока нет данных. Пройди любую тему — и здесь появится статистика.</div>`;
    statsEl.innerHTML = html;
    return;
  }

  html += `<div class="stat-grid">
      <div class="stat-cell"><div class="num">${s.totalQuizzes}</div><div class="lbl">пройдено квизов</div></div>
      <div class="stat-cell"><div class="num">${Stats.avgPct()}%</div><div class="lbl">средний результат</div></div>
      <div class="stat-cell"><div class="num">${s.best ? s.best.pct : 0}%</div><div class="lbl">лучший результат</div></div>
      <div class="stat-cell"><div class="num">${s.totalCorrect}</div><div class="lbl">верных ответов всего</div></div>
    </div>`;

  const topicKeys = Object.keys(s.topics);
  if (topicKeys.length){
    html += `<div class="stat-sub">По темам</div>`;
    topicKeys
      .map(k => ({ name: k, ...s.topics[k] }))
      .sort((a,b)=> b.bestPct - a.bestPct)
      .forEach(t=>{
        html += `<div class="topic-stat">
          <span class="ts-name">${t.name}</span>
          <span class="ts-pct">${t.bestPct}%</span>
        </div>`;
      });
  }

  html += `<button class="danger-link" onclick="resetStats()">Очистить мою статистику</button>`;
  statsEl.innerHTML = html;
}
function resetStats(){
  if (!confirm('Удалить всю личную статистику на этом устройстве?')) return;
  Stats.reset();
  showStats();
  toast('Статистика очищена');
}

/* ---------------- Экран лидерборда ---------------- */
async function showLeaderboard(){
  hideAll();
  leaderboardEl.classList.remove('hidden');
  let head = `<div class="section-head">
      <button class="back" onclick="goMenu()">← Назад</button>
      <h2>🏆 Рейтинг</h2>
    </div>`;

  if (!Leaderboard.enabled()){
    leaderboardEl.innerHTML = head +
      `<div class="lb-status">Общий рейтинг ещё не настроен.<br>
       Как его включить — описано в <b>README</b> (раздел «Лидерборд»).</div>`;
    return;
  }

  leaderboardEl.innerHTML = head + `<div class="lb-status">⏳ Загружаем рейтинг…</div>`;
  const top = await Leaderboard.top(20);
  if (!top){
    leaderboardEl.innerHTML = head + `<div class="lb-status">⚠ Не удалось загрузить рейтинг. Проверь подключение.</div>`;
    return;
  }
  if (!top.length){
    leaderboardEl.innerHTML = head + `<div class="lb-status">Пока пусто — стань первым в рейтинге!</div>`;
    return;
  }

  const me = Identity.get();
  const medal = ['','gold','silver','bronze'];
  let html = head;
  top.forEach(r=>{
    const cls = (me && r.name === me.name) ? ' me' : '';
    const mcls = r.rank <= 3 ? ' ' + medal[r.rank] : '';
    html += `<div class="lb-row${cls}${mcls}">
        <span class="lb-rank">${r.rank}</span>
        <span class="lb-name">${escapeHtml(r.name)} <span class="lb-topic">${escapeHtml(r.topic||'')}</span></span>
        <span class="lb-score">${r.score}/${r.total} · ${r.pct}%</span>
      </div>`;
  });
  leaderboardEl.innerHTML = html;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------------- Старт ---------------- */
function boot(){
  renderProfile();
  buildMenu();
  document.getElementById('qcount').textContent = totalQuestions();
  // первый визит — просим представиться
  if (!Identity.get()) openNamePrompt(false);
}
boot();
