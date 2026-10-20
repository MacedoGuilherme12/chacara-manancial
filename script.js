/* =========================================================
   Chácara Manancial — interações
   JavaScript puro, sem dependências.
   ========================================================= */
(() => {
  'use strict';

  const WHATSAPP = '5548991900552';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Datas (fuso local, sem horário) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); })();
  const fmtLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const fmtMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtWeekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
  const fmtShort = (d) => `${fmtWeekday.format(d)}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  /* =========================================================
     MENU
     ========================================================= */
  const header = $('#header');
  const nav = $('#nav');
  const toggle = $('#menuToggle');
  const hero = $('#inicio');

  const updateHeader = () => {
    header.classList.toggle('is-solid', window.scrollY > 40 || !hero);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-toggle__label').textContent = open ? 'Fechar' : 'Menu';
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('is-locked', open);
    if (open) $('a', nav).focus({ preventScroll: true });
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (!nav.classList.contains('is-open')) return;
    if (e.key === 'Escape') { setMenu(false); toggle.focus(); }
    if (e.key === 'Tab') {
      // Mantém o foco dentro do menu aberto
      const items = [toggle, ...$$('a', nav)];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
  window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* =========================================================
     TOPO — slideshow lento com zoom suave
     ========================================================= */
  (() => {
    const slides = $$('.hero__slide');
    const dots = $$('.hero__dots button');
    if (slides.length < 2) return;
    let current = 0;
    let timer = null;

    // As fotos 2 a 4 só carregam depois da página pronta (primeira tela leve)
    const loadRest = () => slides.slice(1).forEach((s) => {
      const img = $('img', s);
      if (img.dataset.srcset) { img.srcset = img.dataset.srcset; img.src = img.dataset.src; delete img.dataset.srcset; }
    });
    if (document.readyState === 'complete') loadRest(); else window.addEventListener('load', loadRest);

    const goTo = (i) => {
      if (i === current) return;
      const img = $('img', slides[i]);
      if (!img.complete || !img.naturalWidth) { loadRest(); return; }
      const prev = slides[current];
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(() => prev.classList.remove('is-leaving'), 2400);
      slides[i].classList.add('is-active');
      dots.forEach((d, j) => d.classList.toggle('is-active', j === i));
      current = i;
    };
    const next = () => goTo((current + 1) % slides.length);
    const start = () => { if (!reduceMotion) { clearInterval(timer); timer = setInterval(next, 7000); } };

    dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); start(); }));
    document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : start()));
    start();
  })();

  /* =========================================================
     REVELAR AO ROLAR + CONTADORES
     ========================================================= */
  const animateCount = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion || target < 5) { el.textContent = target; return; }
    const t0 = performance.now();
    const dur = 1600;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        $$('[data-count]', en.target).forEach(animateCount);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-visible'));
  }

  /* =========================================================
     WHATSAPP FLUTUANTE
     ========================================================= */
  // Some no topo e enquanto calendário, formulário, chamada de visita ou rodapé
  // estão na tela, para não cobrir botões nem repetir o convite.
  const waFloat = $('#waFloat');
  const covering = new Set();
  const updateFloat = () => waFloat.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6 && covering.size === 0);
  if ('IntersectionObserver' in window) {
    const watch = new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? covering.add(en.target) : covering.delete(en.target)));
      updateFloat();
    }, { rootMargin: '0px 0px -15% 0px' });
    ['#calendar', '#quoteForm', '#visita', '.footer'].forEach((s) => { const el = $(s); if (el) watch.observe(el); });
  }
  updateFloat();
  window.addEventListener('scroll', updateFloat, { passive: true });

  /* =========================================================
     GALERIA — filtros + lightbox (teclado e deslizar)
     ========================================================= */
  (() => {
    const grid = $('#galleryGrid');
    if (!grid) return;
    const items = $$('.masonry__item', grid);
    const filters = $$('.filter');

    filters.forEach((btn) => btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      filters.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      items.forEach((it) => {
        const show = f === 'todos' || it.dataset.cat === f;
        it.classList.toggle('is-hidden', !show);
        it.classList.remove('is-entering');
        if (show && !reduceMotion) { void it.offsetWidth; it.classList.add('is-entering'); }
      });
    }));

    const lb = $('#lightbox');
    const lbImg = $('#lbImg');
    const lbCaption = $('#lbCaption');
    const lbCount = $('#lbCount');
    let list = [];
    let index = 0;
    let lastFocus = null;

    const show = (i) => {
      index = (i + list.length) % list.length;
      const btn = list[index];
      const thumb = $('img', btn);
      lbImg.classList.add('is-loading');
      lbImg.onload = () => lbImg.classList.remove('is-loading');
      lbImg.src = btn.dataset.full;
      lbImg.alt = thumb.alt;
      lbCaption.textContent = thumb.alt;
      lbCount.textContent = `${index + 1} / ${list.length}`;
      // Pré-carrega as vizinhas para a navegação ficar instantânea
      [index + 1, index - 1].forEach((j) => { const b = list[(j + list.length) % list.length]; new Image().src = b.dataset.full; });
    };
    const open = (btn) => {
      list = items.filter((it) => !it.classList.contains('is-hidden')).map((it) => $('.masonry__btn', it));
      lastFocus = btn;
      lb.hidden = false;
      document.body.classList.add('is-locked');
      show(list.indexOf(btn));
      $('[data-lb="close"]', lb).focus();
    };
    const close = () => {
      lb.hidden = true;
      document.body.classList.remove('is-locked');
      lbImg.removeAttribute('src');
      if (lastFocus) lastFocus.focus();
    };

    grid.addEventListener('click', (e) => { const btn = e.target.closest('.masonry__btn'); if (btn) open(btn); });
    lb.addEventListener('click', (e) => {
      const action = e.target.closest('[data-lb]')?.dataset.lb;
      if (action === 'close') close();
      else if (action === 'prev') show(index - 1);
      else if (action === 'next') show(index + 1);
      else if (e.target === lb || e.target.classList.contains('lightbox__figure')) close();
    });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'Tab') {
        const f = $$('button', lb);
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });

    // Deslizar no celular
    let x0 = null, y0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchmove', (e) => {
      if (x0 === null) return;
      const dx = e.touches[0].clientX - x0;
      if (Math.abs(dx) > Math.abs(e.touches[0].clientY - y0)) lbImg.style.transform = `translateX(${dx * 0.4}px)`;
    }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      lbImg.style.transform = '';
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
      x0 = y0 = null;
    });
  })();

  /* =========================================================
     CALENDÁRIO DE DATAS
     ========================================================= */

  /*
   * Fonte das datas reservadas.
   * Hoje: lê o arquivo datas.json  →  { "indisponiveis": ["2026-11-21", ...] }
   *
   * Para usar uma Google Agenda pública no futuro, troque apenas o corpo de
   * load() — o resto do calendário continua igual, pois só precisa de um
   * Set com datas no formato "AAAA-MM-DD". Exemplo:
   *
   *   const CALENDAR_ID = 'xxxxx@group.calendar.google.com'; // agenda pública
   *   const API_KEY = 'SUA_CHAVE_DA_GOOGLE_CALENDAR_API';    // restrita ao domínio do site
   *   const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`
   *     + `?key=${API_KEY}&singleEvents=true&maxResults=2500`
   *     + `&timeMin=${new Date().toISOString()}`;
   *   const { items } = await (await fetch(url)).json();
   *   // Eventos de dia inteiro vêm em start.date; eventos com horário, em start.dateTime
   *   return new Set(items.map((ev) => (ev.start.date || ev.start.dateTime).slice(0, 10)));
   */
  const AvailabilitySource = {
    async load() {
      const res = await fetch('datas.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`datas.json: ${res.status}`);
      const data = await res.json();
      return new Set(data.indisponiveis || []);
    },
  };

  const Calendar = (() => {
    const root = $('#calendar');
    if (!root) return null;
    const monthsEl = $('#calMonths');
    const rangeEl = $('#calRange');
    const statusEl = $('#calStatus');
    const prevBtn = $('[data-cal="prev"]', root);
    const nextBtn = $('[data-cal="next"]', root);

    const MONTHS_AHEAD = 18;
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + MONTHS_AHEAD, 0);
    const wide = window.matchMedia('(min-width: 900px)');
    const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const WEEK_FULL = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

    let reserved = new Set();
    let offset = 0;          // índice do primeiro mês visível (0 = mês atual)
    let selected = null;     // "AAAA-MM-DD"
    let focusISO = toISO(today);
    let onSelect = () => {};

    const visible = () => (wide.matches ? 2 : 1);
    const maxOffset = () => MONTHS_AHEAD - visible();
    const monthIndex = (d) => (d.getFullYear() - first.getFullYear()) * 12 + d.getMonth() - first.getMonth();
    const isReserved = (iso) => reserved.has(iso);

    const render = (focus = false) => {
      offset = Math.max(0, Math.min(offset, maxOffset()));
      monthsEl.innerHTML = '';
      const n = visible();
      for (let m = 0; m < n; m++) {
        const mDate = new Date(first.getFullYear(), first.getMonth() + offset + m, 1);
        monthsEl.appendChild(buildMonth(mDate));
      }
      const a = new Date(first.getFullYear(), first.getMonth() + offset, 1);
      const b = new Date(first.getFullYear(), first.getMonth() + offset + n - 1, 1);
      rangeEl.textContent = cap(n === 1 || a.getFullYear() !== b.getFullYear()
        ? [a, b].slice(0, n).map((d) => fmtMonth.format(d)).join(' – ')
        : `${fmtMonthName.format(a)} – ${fmtMonth.format(b)}`);
      prevBtn.disabled = offset <= 0;
      nextBtn.disabled = offset >= maxOffset();

      // Apenas um dia recebe Tab (navegação interna pelas setas)
      const btns = $$('.day:not([aria-disabled="true"]), .day.is-reserved', monthsEl);
      let target = $(`.day[data-date="${focusISO}"]`, monthsEl);
      if (!target || target.classList.contains('is-past')) target = btns[0];
      if (target) { target.tabIndex = 0; focusISO = target.dataset.date; if (focus) target.focus(); }
    };

    const buildMonth = (mDate) => {
      const wrap = document.createElement('div');
      wrap.className = 'month';
      const id = `m-${mDate.getFullYear()}-${mDate.getMonth()}`;
      const title = cap(fmtMonth.format(mDate));
      let html = `<h3 class="month__title" id="${id}">${title}</h3><table aria-labelledby="${id}"><thead><tr>`;
      WEEK.forEach((w, i) => { html += `<th scope="col" abbr="${WEEK_FULL[i]}"${i >= 5 ? ' class="is-weekend"' : ''}>${w}</th>`; });
      html += '</tr></thead><tbody><tr>';
      const startDow = mDate.getDay();
      const days = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0).getDate();
      for (let i = 0; i < startDow; i++) html += '<td></td>';
      for (let d = 1; d <= days; d++) {
        const date = new Date(mDate.getFullYear(), mDate.getMonth(), d);
        const iso = toISO(date);
        const dow = date.getDay();
        const past = date < today;
        const res = !past && isReserved(iso);
        const cls = ['day'];
        if (dow === 5 || dow === 6) cls.push('is-weekend');
        if (past) cls.push('is-past');
        if (res) cls.push('is-reserved');
        if (iso === selected) cls.push('is-selected');
        if (iso === toISO(today)) cls.push('is-today');
        const state = past ? 'indisponível' : res ? 'reservado' : 'consultar disponibilidade';
        const label = past ? '' : res ? 'Reservado' : 'Consultar';
        html += `<td><button type="button" class="${cls.join(' ')}" data-date="${iso}" tabindex="-1"`
          + ` aria-label="${fmtLong.format(date)}, ${state}"`
          + (past ? ' aria-disabled="true"' : '')
          + (res ? ' aria-disabled="true"' : '')
          + (iso === selected ? ' aria-pressed="true"' : '')
          + (iso === toISO(today) ? ' aria-current="date"' : '')
          + `><span class="day__n">${d}</span><span class="day__s">${label}</span></button></td>`;
        if (dow === 6 && d !== days) html += '</tr><tr>';
      }
      const tail = (7 - ((startDow + days) % 7)) % 7;
      for (let i = 0; i < tail; i++) html += '<td></td>';
      html += '</tr></tbody></table>';
      wrap.innerHTML = html;
      return wrap;
    };

    const moveFocus = (date) => {
      if (date < today) date = today;
      if (date > lastDay) date = lastDay;
      focusISO = toISO(date);
      const mi = monthIndex(date);
      if (mi < offset) offset = mi;
      else if (mi > offset + visible() - 1) offset = mi - visible() + 1;
      render(true);
    };

    const choose = (iso) => {
      if (isReserved(iso)) {
        statusEl.textContent = `${fmtShort(fromISO(iso))} já está reservado. Que tal consultar outra data?`;
        return;
      }
      selected = iso;
      focusISO = iso;
      statusEl.textContent = '';
      render();
      onSelect(iso);
    };

    monthsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.day');
      if (!btn || btn.classList.contains('is-past')) return;
      choose(btn.dataset.date);
    });
    monthsEl.addEventListener('keydown', (e) => {
      const btn = e.target.closest('.day');
      if (!btn) return;
      const d = fromISO(btn.dataset.date);
      const keys = {
        ArrowLeft: () => addDays(d, -1),
        ArrowRight: () => addDays(d, 1),
        ArrowUp: () => addDays(d, -7),
        ArrowDown: () => addDays(d, 7),
        Home: () => addDays(d, -d.getDay()),
        End: () => addDays(d, 6 - d.getDay()),
        PageUp: () => new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), 28)),
        PageDown: () => new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28)),
      };
      if (keys[e.key]) { e.preventDefault(); moveFocus(keys[e.key]()); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!btn.classList.contains('is-past')) choose(btn.dataset.date); }
    });
    prevBtn.addEventListener('click', () => { offset -= 1; focusISO = toISO(new Date(first.getFullYear(), first.getMonth() + offset, 1)); render(); });
    nextBtn.addEventListener('click', () => { offset += 1; focusISO = toISO(new Date(first.getFullYear(), first.getMonth() + offset, 1)); render(); });
    wide.addEventListener('change', () => render());

    render();
    AvailabilitySource.load()
      .then((set) => { reserved = set; render(); })
      .catch((err) => console.warn('Não foi possível carregar as datas reservadas.', err));

    return {
      isReserved,
      onSelect: (fn) => { onSelect = fn; },
      // Mantém o calendário em sincronia quando a data é digitada no formulário
      select: (iso) => {
        if (!iso) { selected = null; render(); return; }
        const d = fromISO(iso);
        if (d < today || d > lastDay) { selected = null; render(); return; }
        selected = iso;
        focusISO = iso;
        offset = Math.min(monthIndex(d), maxOffset());
        render();
      },
    };
  })();

  /* =========================================================
     FORMULÁRIO DE ORÇAMENTO → WHATSAPP
     ========================================================= */
  (() => {
    const form = $('#quoteForm');
    if (!form) return;
    const f = {
      nome: $('#f-nome'), tipo: $('#f-tipo'), data: $('#f-data'), flex: $('#f-flex'),
      convidados: $('#f-convidados'), horario: $('#f-horario'), origem: $('#f-origem'), mensagem: $('#f-mensagem'),
    };
    const cerimoniaField = $('#cerimoniaField');
    const summary = $('#formSummary');
    const done = $('#formDone');
    const WEDDINGS = ['Casamento', 'Mini wedding', 'Destination wedding'];
    let submitted = false;

    f.data.min = toISO(today);
    f.data.max = toISO(new Date(today.getFullYear() + 3, today.getMonth(), today.getDate()));

    const isWedding = () => WEDDINGS.includes(f.tipo.value);
    const cerimonia = () => $('input[name="cerimonia"]:checked', form)?.value || '';

    const syncCerimonia = () => { cerimoniaField.hidden = !isWedding(); };
    f.tipo.addEventListener('change', syncCerimonia);
    syncCerimonia();

    // Calendário → formulário
    if (Calendar) {
      Calendar.onSelect((iso) => {
        f.data.value = iso;
        if (submitted) validate();
        const wrap = f.data.closest('.field');
        wrap.classList.remove('is-highlight');
        void wrap.offsetWidth;
        wrap.classList.add('is-highlight');
        $('#orcamento').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        setTimeout(() => (f.nome.value ? f.data : f.nome).focus({ preventScroll: true }), reduceMotion ? 0 : 700);
      });
      f.data.addEventListener('change', () => Calendar.select(f.data.value));
    }

    const rules = [
      ['nome', () => f.nome.value.trim().length >= 2 || 'Conte-nos o seu nome (ou do casal).'],
      ['tipo', () => !!f.tipo.value || 'Escolha o tipo de evento.'],
      ['data', () => {
        const v = f.data.value;
        if (!v) return f.flex.checked || 'Escolha uma data no calendário ou marque “data flexível”.';
        const d = fromISO(v);
        if (Number.isNaN(d.getTime())) return 'Informe uma data válida.';
        if (d < today) return 'Escolha uma data a partir de hoje.';
        if (Calendar && Calendar.isReserved(v) && !f.flex.checked) return 'Esta data já está reservada. Escolha outra ou marque “data flexível”.';
        return true;
      }],
      ['convidados', () => {
        const n = Number(f.convidados.value);
        if (!f.convidados.value) return 'Informe o número aproximado de convidados.';
        if (!Number.isFinite(n) || n < 1) return 'Informe um número válido.';
        if (n > 500) return 'Nossa capacidade é de até 500 convidados.';
        return true;
      }],
      ['cerimonia', () => !isWedding() || !!cerimonia() || 'A cerimônia será realizada aqui?'],
      ['horario', () => !!f.horario.value || 'Escolha o horário previsto.'],
      ['origem', () => !!f.origem.value || 'Conte como conheceu a Chácara Manancial.'],
    ];

    const fieldFor = (key) => (key === 'cerimonia' ? cerimoniaField : f[key].closest('.field'));
    const inputFor = (key) => (key === 'cerimonia' ? $('input[name="cerimonia"]', form) : f[key]);

    const validate = () => {
      const errors = [];
      rules.forEach(([key, test]) => {
        const r = test();
        const ok = r === true;
        const el = $(`#e-${key}`);
        el.textContent = ok ? '' : r;
        fieldFor(key).classList.toggle('is-invalid', !ok);
        const input = inputFor(key);
        if (key === 'cerimonia') {
          $$('input[name="cerimonia"]', form).forEach((i) => { i.setAttribute('aria-invalid', String(!ok)); i.setAttribute('aria-describedby', 'e-cerimonia'); });
        } else {
          input.setAttribute('aria-invalid', String(!ok));
          input.setAttribute('aria-describedby', `e-${key}`);
        }
        if (!ok) errors.push(key);
      });
      return errors;
    };

    form.addEventListener('input', () => { if (submitted) validate(); });
    form.addEventListener('change', () => { if (submitted) validate(); });

    const buildMessage = () => {
      const dataTxt = f.data.value ? fmtShort(fromISO(f.data.value)) : 'a definir';
      const lines = [
        'Olá! Vi o site da Chácara Manancial e gostaria de um orçamento.',
        `Nome: ${f.nome.value.trim()}`,
        `Evento: ${f.tipo.value}`,
        `Data: ${dataTxt} (flexível: ${f.flex.checked ? 'sim' : 'não'})`,
        `Convidados: ${f.convidados.value}`,
      ];
      if (isWedding()) lines.push(`Cerimônia no local: ${cerimonia().toLowerCase()}`);
      lines.push(`Horário: ${f.horario.value}`);
      lines.push(`Conheci por: ${f.origem.value}`);
      const msg = f.mensagem.value.trim();
      if (msg) lines.push(`Mensagem: ${msg}`);
      return lines.join('\n');
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitted = true;
      done.textContent = '';
      const errors = validate();
      if (errors.length) {
        summary.hidden = false;
        summary.innerHTML = `<p>${errors.length === 1 ? 'Falta só um detalhe' : `Faltam ${errors.length} detalhes`} para enviarmos seu pedido.</p>`;
        inputFor(errors[0]).focus();
        return;
      }
      summary.hidden = true;
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(buildMessage())}`;
      const win = window.open(url, '_blank');
      if (!win) window.location.href = url;
      done.innerHTML = `Abrimos o WhatsApp com a sua mensagem. Se não abriu, <a href="${url}" target="_blank" rel="noopener">toque aqui</a>.`;
    });
  })();

  /* ---------- Ano no rodapé ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
