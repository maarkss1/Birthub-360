function demonstrateMicro(name) {
  const rule = microRules.find((r) => r[0] === name)?.[1] || '';
  openModal(
    name,
    `<div class="micro-stage" id="micro-stage"></div><p>${rule}</p><button class="btn outline" id="replay-micro">Reproduzir</button>`,
  );
  const stage = $('#micro-stage');
  const play = () => {
    const duration = reduced() ? 1 : 420;
    stage.innerHTML = '<div id="micro-sample" class="motion-object">✦</div>';
    const el = $('#micro-sample');
    const animate = (frames, opts = {}) =>
      el.animate(frames, {
        duration,
        easing: 'ease-out',
        fill: 'forwards',
        ...opts,
        ...(reduced() ? { duration: 1, iterations: 1 } : {}),
      });
    if (name === 'Magnetic') {
      el.setAttribute('tabindex', '0');
      el.onpointermove = (e) => {
        if (reduced() || e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.08}px,${(e.clientY - r.top - r.height / 2) * 0.08}px)`;
      };
      el.onpointerleave = () => (el.style.transform = '');
      return;
    }
    if (name === 'Shimmer') {
      el.className = 'skeleton';
      el.style.cssText = 'width:240px;height:24px';
      return;
    }
    if (name === 'BorderTrace') {
      el.innerHTML =
        '<svg width="90" height="90" viewBox="0 0 90 90"><path d="M1 1H89V89H1Z" fill="none" stroke="#d4af37" stroke-width="2" stroke-dasharray="352" stroke-dashoffset="352"/></svg>';
      el.style.border = 'none';
      $('path', el).animate([{ strokeDashoffset: 352 }, { strokeDashoffset: 0 }], {
        duration: reduced() ? 1 : 650,
        fill: 'forwards',
      });
      return;
    }
    if (name === 'Pulse') {
      animate([{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], { duration: 700 });
      return;
    }
    if (name === 'Glow') {
      animate(
        [
          { boxShadow: '0 0 0 rgba(91,33,182,0)' },
          { boxShadow: '0 0 24px rgba(91,33,182,.22)' },
          { boxShadow: '0 0 0 rgba(91,33,182,0)' },
        ],
        { duration: 1200 },
      );
      return;
    }
    if (name === 'Reveal' || name === 'HoverReveal') {
      stage.innerHTML =
        '<div class="micro-reveal" tabindex="0"><strong>Grupo Porto Real</strong><small>R$ 84.000 · Negociação</small><button class="link" data-entity="0">Abrir entidade ↗</button></div>';
      return;
    }
    if (name === 'Collapse') {
      stage.innerHTML =
        '<details class="signal" style="width:100%"><summary>Expandir evidências</summary><p>8 dias sem reunião. Próximo passo ainda não confirmado.</p></details>';
      return;
    }
    if (name === 'Morph' || name === 'SuccessMorph') {
      stage.innerHTML = '<button class="btn execute" id="micro-morph">Salvar</button>';
      $('#micro-morph').onclick = (e) => morphButton(e.target, 'Salvando', '✓ Salvo');
      return;
    }
    if (name === 'Spring') {
      animate(
        [
          { transform: 'translateX(-65px)' },
          { transform: 'translateX(75px)', offset: 0.55 },
          { transform: 'translateX(57px)', offset: 0.8 },
          { transform: 'translateX(60px)' },
        ],
        { duration: 600 },
      );
      return;
    }
    if (name === 'SharedIndicator') {
      stage.innerHTML =
        '<div class="micro-switch"><button class="active">Contexto A</button><button>Contexto B</button><i></i></div>';
      const nav = $('.micro-switch'),
        indicator = $('i', nav);
      $$('button', nav).forEach(
        (b, i) =>
          (b.onclick = () => {
            $$('button', nav).forEach((x) => x.classList.toggle('active', x === b));
            indicator.style.transform = `translateX(${i * 130}px)`;
          }),
      );
      return;
    }
    if (name === 'CountUp') {
      stage.innerHTML =
        '<div class="stack"><span class="strategic" id="micro-count" style="font-size:32px">1.280</span><button class="link" id="micro-count-update">Atualizar valor →</button></div>';
      let value = 1280;
      $('#micro-count-update').onclick = () => {
        const from = value;
        value += 4;
        const to = value,
          start = performance.now();
        const tick = (t) => {
          const progress = reduced() ? 1 : Math.min(1, (t - start) / 500);
          $('#micro-count').textContent = Math.round(from + (to - from) * progress).toLocaleString(
            'pt-BR',
          );
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };
      return;
    }
    if (name === 'StrokeDraw') {
      el.innerHTML =
        '<svg viewBox="0 0 40 40" width="40"><path d="M8 21L17 29 33 10" fill="none" stroke="#83c6ad" stroke-width="2" stroke-dasharray="40" stroke-dashoffset="40"/></svg>';
      $('path', el).animate([{ strokeDashoffset: 40 }, { strokeDashoffset: 0 }], {
        duration: reduced() ? 1 : 300,
        fill: 'forwards',
      });
      return;
    }
    if (name === 'ProgressFill') {
      stage.innerHTML =
        '<div class="stack"><span id="progress-label">Transferência demonstrativa</span><div style="width:240px;height:4px;background:var(--line)"><div id="micro-progress" style="height:100%;background:var(--gold);transform-origin:left"></div></div></div>';
      $('#micro-progress').animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: reduced() ? 1 : 1500,
        fill: 'forwards',
      });
      return;
    }
    if (name === 'ErrorShake') {
      el.textContent = '!';
      el.style.color = 'var(--danger)';
      animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(3px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 180 },
      );
      return;
    }
    if (name === 'OrbitMotion') {
      el.className = 'orbit-loader';
      el.innerHTML = '<span>✦</span>';
      return;
    }
    if (name === 'Spotlight') {
      stage.innerHTML =
        '<div class="spotlight-sample" tabindex="0">Foco na decisão<br><small>Selecione com Tab</small></div>';
      return;
    }
  };
  $('#replay-micro').onclick = play;
  play();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-micro]');
  if (b) demonstrateMicro(b.dataset.micro);
});
document.addEventListener('keydown', (e) => {
  const nav = e.target.closest('.workspace-switcher');
  if (!nav || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const buttons = $$('button', nav);
  if (!buttons.length) return;
  e.preventDefault();
  let index = buttons.indexOf(e.target);
  index =
    e.key === 'Home'
      ? 0
      : e.key === 'End'
        ? buttons.length - 1
        : (index + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  buttons[index].focus();
  buttons[index].click();
});
function syncSideIndicator() {
  const nav = $('#side-nav'),
    active = $('.active', nav);
  if (!active) return;
  let bar = $('.side-indicator', nav);
  if (!bar) {
    bar = document.createElement('i');
    bar.className = 'side-indicator';
    nav.append(bar);
  }
  bar.style.transform = `translateY(${active.offsetTop}px)`;
  bar.style.height = active.offsetHeight + 'px';
}
const originalRender = render;
render = function () {
  originalRender();
  syncSideIndicator();
};
syncSideIndicator();
