(() => {
  'use strict';
  const MAX_API = 'https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/command-centre-max';
  const RECAP_FEED = 'https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/max-public-feed';
  const tgMax = window.Telegram && window.Telegram.WebApp;
  const maxState = { dashboard:null, loading:false };

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '—';

  async function maxApi(action, payload={}) {
    const response = await fetch(MAX_API, {
      method:'POST',
      cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ action, initData: tgMax ? tgMax.initData : '', ...payload })
    });
    const out = await response.json().catch(() => ({ok:false,error:'invalid_response'}));
    if (!response.ok || !out.ok) {
      const error = new Error(out.error || 'max_request_failed');
      error.code = out.error || 'max_request_failed';
      throw error;
    }
    return out;
  }

  function lessonMarkup(item) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const sources = Array.isArray(item.sources) ? item.sources : [];
    return `<details class="panel max-lesson" data-knowledge-id="${esc(item.id)}">
      <summary>
        <div class="max-lesson-head">
          <div>
            <span class="eyebrow">${esc(item.category)} • ${esc(item.difficulty)}</span>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.summary)}</p>
          </div>
          <span class="max-chip ${item.completed ? 'done':''}">${item.completed ? '✓ DONE':'LEARN'}</span>
        </div>
      </summary>
      <p>${esc(item.body_md)}</p>
      <div>${tags.map(t=>`<span class="max-chip">${esc(t)}</span>`).join('')}</div>
      ${sources.map(s => {
        const url = typeof s === 'string' ? s : s.url;
        const title = typeof s === 'string' ? s : (s.title || s.url);
        return url ? `<a class="max-source" href="${esc(url)}" target="_blank" rel="noopener">${esc(title || url)} ↗</a>` : '';
      }).join('')}
      <button class="button max-complete" type="button" data-knowledge-id="${esc(item.id)}" ${item.completed?'disabled':''}>${item.completed ? 'Lesson Completed ✅' : 'Mark Lesson Complete'}</button>
    </details>`;
  }

  function researchMarkup(items) {
    if (!items || !items.length) return '<div class="empty">No MAX research questions submitted yet.</div>';
    return items.map(item => `<div class="max-research-row">
      <b>${esc(item.question)}</b>
      <small>${esc(item.category)} • ${esc(String(item.status).replaceAll('_',' '))} • ${fmtDate(item.created_at)}</small>
      ${item.answer_summary ? `<p>${esc(item.answer_summary)}</p>` : ''}
    </div>`).join('');
  }

  function renderHomeCard() {
    const root = $('#max-home-card');
    if (!root) return;
    const d = maxState.dashboard;
    const lessons = d?.lessons || [];
    const complete = lessons.filter(x=>x.completed).length;
    const pct = lessons.length ? Math.round(complete / lessons.length * 100) : 0;
    root.innerHTML = `<article class="panel max-home-card">
      <div class="max-mark">MAX</div>
      <div class="max-line">LEARN • RESEARCH • INTERACT • TEACH</div>
      <h2>Command Centre MAX™</h2>
      <p>The CryptoWorldz knowledge engine: ZED guides, AUTO explains the numbers, G.R.A.C.E. turns approved knowledge into communication, and RECAP keeps the story understandable.</p>
      <div class="max-progress"><span style="width:${pct}%"></span></div>
      <small>${complete}/${lessons.length || '—'} approved lessons completed</small>
      <button class="button" type="button" data-open="max">Open MAX™</button>
    </article>`;
  }

  function renderMax() {
    const root = $('#max-root');
    if (!root) return;
    const d = maxState.dashboard;
    if (!d) {
      root.innerHTML = '<div class="panel loading"><div class="orb"></div><p>MAX is opening the knowledge engine…</p></div>';
      return;
    }
    const lessons = d.lessons || [];
    const complete = lessons.filter(x=>x.completed).length;
    const pct = lessons.length ? Math.round(complete / lessons.length * 100) : 0;
    const isAdmin = Boolean(d.access && d.access.authorized);

    root.innerHTML = `
      <article class="panel max-home-card">
        <div class="max-mark">MAX</div>
        <div class="max-line">CRYPTOWORLDZ MASTERMIND°π÷ • SOURCE-FIRST</div>
        <h2>Command Centre MAX™</h2>
        <p>Learn what we know. Research what we do not. Interact with the ecosystem. Teach the next Legend.</p>
        <div class="max-system">
          <div><small>ZED</small><b>Guide • Teach • Onboard</b></div>
          <div><small>AUTO ABILITY</small><b>Economics • Supply • Liquidity</b></div>
          <div><small>G.R.A.C.E. ADMIN</small><b>Approve • Explain • Distribute</b></div>
          <div><small>RECAP</small><b>Research • Summarise • Remember</b></div>
        </div>
        <div class="max-grid">
          <div class="max-module learn"><b>📚 LEARN</b><small>Approved lessons and verified ecosystem knowledge.</small></div>
          <div class="max-module research"><b>🔎 RESEARCH</b><small>Ask MAX what needs investigating. New claims start queued, not assumed true.</small></div>
          <div class="max-module interact"><b>🤝 INTERACT</b><small>ZED, missions, community, WorldzLaunchPad and real-world impact.</small></div>
          <div class="max-module teach"><b>🎓 TEACH</b><small>Use the same approved lesson pack to bring new members up to speed.</small></div>
        </div>
        <div class="max-truth ultimate-note"><b>MAX learns by building a reviewed knowledge registry — not by silently rewriting itself.</b><br>Research becomes knowledge only after it is sourced and approved. Human leadership stays above automation.</div>
      </article>

      <div class="section-title"><h2>📚 MAX Academy</h2><span class="max-chip done">${complete}/${lessons.length} complete</span></div>
      <div class="max-progress"><span style="width:${pct}%"></span></div>
      <div id="max-lessons">${lessons.map(lessonMarkup).join('') || '<div class="empty">No approved MAX lessons yet.</div>'}</div>

      <div class="section-title"><h2>🔎 MAX Research Desk</h2></div>
      <article class="panel">
        <p>Ask about CryptoWorldz, chains, launch technology, token mechanics, wallets, security, food security or anything MAX should investigate. A queued question is <b>not</b> treated as fact.</p>
        <form id="max-research-form">
          <select name="category">
            <option value="crypto">Crypto / Markets</option>
            <option value="launchpad">WorldzLaunchPad</option>
            <option value="omnichain">OmniChain</option>
            <option value="security">Wallet / Security</option>
            <option value="impact">Food / Water / Soil / Impact</option>
            <option value="ecosystem">CryptoWorldz Ecosystem</option>
          </select>
          <textarea name="question" minlength="8" maxlength="1200" required placeholder="What should MAX research?"></textarea>
          <button class="button" type="submit">Queue Research</button>
        </form>
      </article>
      <article class="panel"><h3>Your Research Queue</h3><div id="max-research-list">${researchMarkup(d.research || [])}</div></article>

      <div class="section-title"><h2>🤝 Interact & Teach</h2></div>
      <article class="panel">
        <div class="max-actions">
          <button class="button" type="button" data-open="zed-guide">Ask ZED</button>
          <button class="button secondary" type="button" data-open="missions">Open Missions</button>
          <a class="button secondary" href="https://launchpad.cryptoworldz.xyz/" target="_blank" rel="noopener">WorldzLaunchPad™</a>
          <a class="button secondary" href="https://launchpad.cryptoworldz.xyz/omnichain/" target="_blank" rel="noopener">Worldz OmniChain™</a>
          <a class="button wide" id="max-share" href="https://t.me/share/url?url=${encodeURIComponent('https://cryptoworldz.xyz/')}&text=${encodeURIComponent('Join CryptoWorldz and learn through Command Centre MAX™ — source-first crypto education, WorldzLaunchPad, missions and community.')}" target="_blank" rel="noopener">Bring In a New Legend ↗</a>
        </div>
      </article>

      <article class="panel max-recap">
        <h3>🧾 RECAP This — Approved Knowledge Feed</h3>
        <p>RECAP gets a clean feed containing only MAX knowledge marked <b>approved + public</b>. This gives RecapThisBot a safe source to work alongside once its connector is wired.</p>
        <a class="button secondary" href="${RECAP_FEED}" target="_blank" rel="noopener">Open Approved RECAP Feed</a>
      </article>

      <article class="panel">
        <h3>🌱 Dollars Into Sense — Impact Lab</h3>
        <p>MAX connects finance education to measurable outcomes: food, water, healthy soil, irrigation, seeds, fruit trees, vegetables, tools and local production. The purpose is understanding where resources go and what they actually produce.</p>
        <button class="button secondary" type="button" data-open="impact">Open Real-World Impact</button>
      </article>

      ${isAdmin ? `
      <div class="section-title"><h2>🛡 MAX Admin Publisher</h2></div>
      <article class="panel max-admin">
        <p>Admin-reviewed material can be published into MAX Academy and the RECAP feed. Add sources whenever a factual claim comes from outside the ecosystem.</p>
        <form id="max-publish-form">
          <input name="slug" required placeholder="slug-like-this">
          <input name="title" required maxlength="160" placeholder="Lesson / research title">
          <input name="summary" maxlength="800" placeholder="Short summary">
          <div class="form-row">
            <select name="kind"><option>research</option><option>lesson</option><option>brief</option><option>faq</option><option>impact</option></select>
            <select name="difficulty"><option>beginner</option><option>intermediate</option><option>advanced</option></select>
          </div>
          <input name="category" value="crypto" placeholder="category">
          <textarea name="body_md" maxlength="8000" placeholder="Approved knowledge"></textarea>
          <textarea name="sources_text" placeholder="Source URLs — one per line"></textarea>
          <button class="button" type="submit">Publish Approved Knowledge</button>
        </form>
      </article>` : ''}
    `;
  }

  async function loadDashboard() {
    if (maxState.loading) return;
    maxState.loading=true;
    renderMax();
    try {
      maxState.dashboard=await maxApi('dashboard');
      renderHomeCard();renderMax();
    } catch (error) {
      const root=$('#max-root');
      if(root) root.innerHTML=`<div class="panel security"><h3>MAX Secure Session Required</h3><p>${esc(error.code || error.message)}</p><p>Close and reopen Command Centre from ZED if the Telegram session has expired.</p></div>`;
      renderHomeCard();
    } finally { maxState.loading=false; }
  }

  document.addEventListener('click', async (event) => {
    const complete=event.target.closest('.max-complete');
    if(!complete) return;
    complete.disabled=true;
    try {
      await maxApi('complete_lesson',{knowledge_id:complete.dataset.knowledgeId});
      await loadDashboardFresh();
      if(tgMax?.HapticFeedback) tgMax.HapticFeedback.notificationOccurred('success');
    } catch(error) {
      complete.disabled=false;
      if(tgMax?.showAlert) tgMax.showAlert('MAX could not save that lesson: '+(error.code||error.message));
    }
  });

  document.addEventListener('submit', async (event) => {
    if(event.target.id==='max-research-form'){
      event.preventDefault();
      const fd=new FormData(event.target);
      const button=event.target.querySelector('button[type="submit"]');button.disabled=true;
      try{
        await maxApi('submit_research',{question:fd.get('question'),category:fd.get('category')});
        event.target.reset();
        await loadDashboardFresh();
        if(tgMax?.showAlert) tgMax.showAlert('✅ Research queued. MAX will keep it separate from approved facts until reviewed.');
      }catch(error){
        if(tgMax?.showAlert) tgMax.showAlert('Research was not queued: '+(error.code||error.message));
      }finally{button.disabled=false;}
      return;
    }
    if(event.target.id==='max-publish-form'){
      event.preventDefault();
      const fd=new FormData(event.target);
      const sources=String(fd.get('sources_text')||'').split('\n').map(x=>x.trim()).filter(Boolean).map(url=>({url,title:url}));
      const button=event.target.querySelector('button[type="submit"]');button.disabled=true;
      try{
        await maxApi('admin_publish',{
          slug:fd.get('slug'),title:fd.get('title'),summary:fd.get('summary'),kind:fd.get('kind'),
          difficulty:fd.get('difficulty'),category:fd.get('category'),body_md:fd.get('body_md'),sources
        });
        event.target.reset();
        await loadDashboardFresh();
        if(tgMax?.showAlert) tgMax.showAlert('✅ Approved knowledge published to MAX + RECAP feed.');
      }catch(error){
        if(tgMax?.showAlert) tgMax.showAlert('Publish failed: '+(error.code||error.message));
      }finally{button.disabled=false;}
    }
  });

  async function loadDashboardFresh(){
    maxState.dashboard=null;maxState.loading=false;await loadDashboard();
  }

  function attach(){
    renderHomeCard();
    loadDashboard();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',attach);
  else attach();
})();