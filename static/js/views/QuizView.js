const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export class QuizView {
  constructor() {
    this.root = document.querySelector('#screen');
    this.notice = document.querySelector('#notification');
    this.dialog = document.querySelector('#exit-dialog');
    this.timers = [];
    this.frames = [];
    this.busy = false;
    this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    try {
      const savedMotion = localStorage.getItem('linux-quest-motion');
      this.hasMotionChoice = savedMotion === 'full' || savedMotion === 'reduce';
      this.motionEnabled = this.hasMotionChoice ? savedMotion === 'full' : !this.motionPreference.matches;
    } catch {
      this.hasMotionChoice = false;
      this.motionEnabled = !this.motionPreference.matches;
    }
    this.applyMotion();
    this.motionPreference.addEventListener('change', () => {
      if (!this.hasMotionChoice) this.motionEnabled = !this.motionPreference.matches;
      this.applyMotion();
      this.stopAnimations();
    });
    document.addEventListener('keydown', event => this.keyboard(event));
    document.querySelector('#keep-playing').addEventListener('click', () => this.dialog.close());
    document.querySelector('#confirm-exit').addEventListener('click', () => { this.dialog.close(); this.exitCallback?.(); });
    window.addEventListener('beforeunload', event => {
      if (this.activeGame) { event.preventDefault(); event.returnValue = ''; }
    });
  }

  bind(callbacks) { this.callbacks = callbacks; }
  get reduced() { return !this.motionEnabled; }
  applyMotion() {
    document.documentElement.classList.toggle('reduced-motion', this.reduced);
    document.documentElement.classList.toggle('motion-on', !this.reduced);
    document.documentElement.dataset.motion = this.reduced ? 'off' : 'on';
  }
  stopAnimations() {
    this.timers.forEach(clearTimeout); this.timers = [];
    this.frames.forEach(cancelAnimationFrame); this.frames = [];
    this.finishAnimations?.(); this.finishAnimations = null;
  }
  later(callback, delay) { this.timers.push(setTimeout(callback, delay)); }

  render(html, location) {
    this.stopAnimations();
    this.activeGame = false;
    this.clearError();
    this.root.innerHTML = html;
    const locationNode = document.querySelector('#location');
    locationNode.textContent = location;
    locationNode.classList.remove('terminal-command-enter');
    if (!this.reduced) {
      void locationNode.offsetWidth;
      locationNode.classList.add('terminal-command-enter');
    }
    this.root.focus({ preventScroll: true });
    this.root.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', () => this.callbacks[button.dataset.action]?.(button.dataset.id));
    });
  }

  welcome() {
    this.render(`<section class="welcome"><div class="eyebrow">SISTEMAS OPERACIONAIS / MODO DESAFIO</div>
      <h1 class="sr-only">Linux Quest — Terminal Quiz</h1>
      <pre class="ascii" aria-hidden="true"> _     ___ _   _ _   ___  __
| |   |_ _| \ | | | | \\/ /
| |    | ||  \\| | | | |>  &lt;
| |___ | || |\\  | |_| / /\\ \\
|_____|___|_| \\_|\\___/_/  \\_\\
  Q U E S T <span class="ascii-cursor">_</span></pre>
      <div class="hero-subtitle">TERMINAL QUIZ<span class="label">EDIÇÃO TI23</span></div>
      <p class="hero-copy">Seu próximo comando é um desafio.<br>Explore o Linux, teste seus conhecimentos<br class="desktop-break"> e transforme cada resposta em aprendizado.</p>
      <div class="boot" aria-label="Inicialização"><div><span>[ OK ]</span> BIOS Linux Quest 1.0 detectada</div><div><span>[ OK ]</span> Carregando módulos de aprendizado...</div><div><span>[ OK ]</span> Preparando 32 desafios...</div><div><span>[ OK ]</span> Terminal pronto. A missão é sua.</div><div class="boot-meter" aria-hidden="true"><i></i></div></div>
      <div class="actions"><button class="primary" id="welcome-start" data-action="menu">[ INICIAR QUIZ ] <span>→</span></button><button id="skip-boot" class="text-button">Pular abertura ↵</button></div>
      <div class="hero-stats"><span><b>04</b> módulos</span><span><b>32</b> perguntas</span><span><b>∞</b> tentativas</span></div>
      <p class="credit">DESENVOLVIDO PARA APRENDER <span>por Kevin Rhoden · TI23</span></p></section>`, './iniciar');
    const boot = this.root.querySelector('.boot');
    const skip = this.root.querySelector('#skip-boot');
    const complete = () => { boot.classList.add('complete'); skip.hidden = true; };
    this.finishAnimations = complete;
    skip.addEventListener('click', () => { this.stopAnimations(); this.root.querySelector('#welcome-start').focus(); });
    if (this.reduced) complete();
    else {
      this.root.querySelectorAll('.boot > div:not(.boot-meter)').forEach((line, index) => this.later(() => line.classList.add('loaded'), 250 + index * 480));
      this.later(complete, 2300);
    }
  }

  menu() {
    this.render(`<section class="menu"><div class="eyebrow">CENTRAL DE COMANDO</div><h1>Pronto para a próxima missão<span class="green">?</span></h1><p>Um terminal. Quatro caminhos. Muito para descobrir.</p><div class="menu-list">
      <button class="menu-item" data-action="lessons"><span class="menu-symbol">&gt;_</span><span><strong>Entrar no quiz</strong><small>Escolha um módulo e comece a jogar</small></span><span>→</span></button>
      <button class="menu-item" data-action="help"><span class="menu-symbol">?</span><span><strong>Como jogar</strong><small>Conheça as regras e os atalhos</small></span><span>→</span></button>
      <button class="menu-item motion-toggle" id="motion" aria-pressed="${!this.reduced}"><span class="menu-symbol">≈</span><span><strong>Animações do terminal</strong><small id="motion-state">${this.reduced ? 'Efeitos pausados' : 'Scanlines, brilho e movimento ativos'}${this.motionPreference.matches && !this.hasMotionChoice ? ' · padrão do sistema' : ''}</small></span><span id="motion-indicator" class="${this.reduced ? 'is-off' : 'is-on'}">${this.reduced ? '[ OFF ]' : '[ ON ]'}</span></button>
      </div><p class="note">// Sem cronômetro. Aprenda no seu ritmo.</p></section>`, './menu');
    this.root.querySelector('#motion').addEventListener('click', () => {
      this.motionEnabled = !this.motionEnabled;
      this.hasMotionChoice = true;
      try { localStorage.setItem('linux-quest-motion', this.motionEnabled ? 'full' : 'reduce'); } catch { /* Preferência funciona mesmo sem armazenamento. */ }
      this.applyMotion(); this.stopAnimations(); this.menu(); this.root.querySelector('#motion').focus();
    });
  }

  help() {
    this.render(`<section><div class="eyebrow">MANUAL DO JOGADOR</div><h1>Aprenda. Responda. Evolua.</h1><ol class="instructions"><li>Escolha um dos quatro módulos. Cada partida tem oito perguntas.</li><li>Selecione uma alternativa. Cada acerto vale um ponto, sem penalidade extra por erro.</li><li>Leia a correção e a explicação técnica. Depois avance.</li><li>Confira seu resultado e jogue novamente quantas vezes quiser.</li></ol><div class="hint"><kbd>1</kbd> a <kbd>4</kbd> para responder · <kbd>Enter</kbd> para avançar após a correção.<br><kbd>Tab</kbd> para navegar · <kbd>Enter</kbd> ou <kbd>Espaço</kbd> para ativar botões.</div><p>Os comandos são exemplos de estudo e nunca são executados. Não há limite de tempo. Recarregar a página recupera a partida enquanto o servidor estiver aberto.</p><button data-action="menu">[ VOLTAR ]</button></section>`, './ajuda');
  }

  lessons(lessons) {
    this.render(`<section><div class="section-heading"><div><div class="eyebrow">ESCOLHA SEU CAMINHO</div><h1>Selecione uma missão<span class="green">.</span></h1></div><span class="label">04 MÓDULOS</span></div><p>Cada comando abre uma nova possibilidade. Por onde começamos?</p><div class="lesson-grid">${lessons.map((lesson, index) => `<article class="lesson-card"><div class="card-top"><span class="module-symbol">${escape(lesson.symbol)}</span><span class="module-index">MÓDULO 0${index + 1}</span></div><h2>${escape(lesson.title)}</h2><p>${escape(lesson.description)}</p><div class="card-bottom"><span>${lesson.total} perguntas <span class="green">·</span> sem pressa</span><button data-action="start" data-id="${escape(lesson.id)}" aria-label="Jogar ${escape(lesson.title)}">[ JOGAR ] →</button></div></article>`).join('')}</div><button class="text-button back" data-action="menu">← [ VOLTAR AO MENU ]</button></section>`, './missoes');
  }

  game(game) {
    if (game.completed) { this.result(game); return; }
    const q = game.question, f = game.feedback;
    this.render(`<section class="game"><div class="game-top"><span class="eyebrow">MISSÃO EM ANDAMENTO</span><button class="text-button" data-action="exit">[ SAIR ]</button></div><h1 class="game-title">${escape(game.title)}</h1><div class="game-meta"><span>PERGUNTA <b>${String(game.number).padStart(2,'0')}</b> / ${String(game.total).padStart(2,'0')}</span><span>ACERTOS <b class="green">${String(game.score).padStart(2,'0')}</b></span></div><progress value="${game.answered}" max="${game.total}" aria-label="Perguntas respondidas"></progress><div class="question-header"><span class="question-marker">?</span><h2>${escape(q.prompt)}</h2></div>${q.command ? `<pre class="command"><code>${escape(q.command)}</code></pre>` : ''}<div class="alternatives" role="group" aria-label="Alternativas">${q.alternatives.map((a,i) => {
      const correct = f?.correct_id === a.id, selected = f?.selected_id === a.id;
      return `<button class="alternative ${correct ? 'correct' : selected ? 'incorrect' : ''}" data-action="answer" data-id="${a.id}" ${f ? 'disabled data-locked="true"' : ''}><span class="key">${i+1}</span><span class="answer-text">${escape(a.text)}</span>${f && (correct || selected) ? `<span class="answer-tag">${correct ? '✓ CORRETA' : '× SUA RESPOSTA'}</span>` : '<span class="alternative-arrow" aria-hidden="true">↵</span>'}</button>`;
    }).join('')}</div>${f ? `<div class="feedback ${f.correct ? 'success' : 'failure'}" role="status" tabindex="-1"><strong>${f.correct ? '✓ Resposta correta!' : '× Não foi desta vez.'}</strong><p>${escape(f.explanation)}</p><small>Fonte: ${escape(f.source.file)} · p. ${f.source.page}</small></div>` : '<p class="keyboard-hint">Escolha uma alternativa ou use as teclas <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></p>'}<div class="question-bottom"><span>${f ? 'Conhecimento adquirido. Pode seguir.' : 'Uma resposta. Um novo aprendizado.'}</span><button class="primary" data-action="next" ${f ? '' : 'disabled data-locked="true"'}>[ ${game.number === game.total ? 'VER RESULTADO' : 'PRÓXIMA PERGUNTA'} ] →</button></div></section>`, `./quiz --modulo ${game.lesson_id}`);
    this.activeGame = true;
    if (f) this.root.querySelector('.feedback').focus({ preventScroll: true });
  }

  result(game) {
    const r = game.result;
    this.render(`<section class="result"><div class="result-icon" aria-hidden="true">[ ✓ ]</div><div class="eyebrow">PROCESSO FINALIZADO COM SUCESSO</div><h1>Missão concluída<span class="green">.</span></h1><p>${escape(game.title)}</p><div class="percentage"><span data-count="${r.percentage}">${r.percentage}</span><span>%</span></div><div class="eyebrow">DE APROVEITAMENTO</div><div class="result-stats"><div><strong data-count="${r.total}">${r.total}</strong><span>PERGUNTAS</span></div><div><strong class="green" data-count="${r.correct}">${r.correct}</strong><span>ACERTOS</span></div><div><strong class="red" data-count="${r.errors}">${r.errors}</strong><span>ERROS</span></div></div><p class="result-message">${escape(r.message)}</p><div class="actions"><button class="primary" data-action="replay">[ JOGAR NOVAMENTE ]</button><button data-action="lessons">[ OUTRA MISSÃO ]</button></div><button class="text-button back" data-action="menu">← Voltar ao menu</button></section>`, './resultado');
    if (!this.reduced) {
      const nodes = [...this.root.querySelectorAll('[data-count]')];
      const end = () => nodes.forEach(node => { node.textContent = node.dataset.count; });
      this.finishAnimations = end;
      const start = performance.now();
      const step = now => {
        const progress = Math.min((now-start)/650,1);
        nodes.forEach(node => { node.textContent = Math.round(Number(node.dataset.count)*progress); });
        if (progress < 1) this.frames.push(requestAnimationFrame(step));
      };
      this.frames.push(requestAnimationFrame(step));
    }
  }

  setBusy(busy) {
    this.busy = busy;
    this.root.setAttribute('aria-busy', String(busy));
    this.root.querySelectorAll('button').forEach(button => { button.disabled = busy || button.dataset.locked === 'true'; });
  }
  clearError() { this.notice.hidden = true; this.notice.replaceChildren(); }
  error(message, retry) {
    this.notice.hidden = false;
    const text = document.createElement('p'); text.textContent = message;
    const button = document.createElement('button'); button.textContent = '[ TENTAR NOVAMENTE ]';
    button.addEventListener('click', retry);
    this.notice.replaceChildren(text, button);
    button.focus();
  }
  confirmExit(callback) { this.exitCallback = callback; this.dialog.showModal(); document.querySelector('#keep-playing').focus(); }
  keyboard(event) {
    if (this.busy || this.dialog.open || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (this.activeGame && /^[1-4]$/.test(event.key)) {
      const button = this.root.querySelectorAll('.alternative')[Number(event.key)-1];
      if (button && !button.disabled) { event.preventDefault(); button.click(); }
    } else if (event.key === 'Enter' && !['BUTTON','A'].includes(document.activeElement.tagName)) {
      const button = this.root.querySelector('[data-action="next"]:not(:disabled)');
      if (button) { event.preventDefault(); button.click(); }
    }
  }
}
