import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './styles.css';
import { CHAPTERS, NODES, STEPS, type ChapterId, type NodeId, type Step } from './data';
import { renderChat, renderPanel } from './panels';
import { createWorkflow, type WorkflowView } from './workflow';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

const PHASE_INTRO: Record<Step['chapter'], { title: string; sub: string; name: string }> = {
  setup: { name: 'Environment', title: 'Set up <em>the environment.</em>', sub: 'Two accounts, one API key. About five minutes before you place a single node.' },
  'phase-1': { name: 'Give it a brain', title: 'Build the <em>core agent.</em>', sub: 'Three nodes: Chat Trigger, AI Agent and Gemini Chat Model, plus a system message. At the end you have a working chatbot.' },
  'phase-2': { name: 'Give it memory', title: 'Add <em>memory.</em>', sub: 'One sub-node, zero configuration. Then test that context carries across turns.' },
  'phase-3': { name: 'Connect its data', title: 'Connect <em>a data tool.</em>', sub: 'Make a Google Sheet, expose it as a tool, and see how tool calling actually works.' },
  'phase-4': { name: 'Enable email automation', title: 'Add an action, <em>gated by approval.</em>', sub: 'A Gmail tool with model-defined fields, then test the draft → revise → approve → send loop.' },
};

// ── Chapter navigation ──────────────────────────────────────
const chapterNav = $('#chapters');
chapterNav.innerHTML = CHAPTERS.map(
  (c) => `<li><a href="#${c.id}" data-nav="${c.id}" class="${c.num ? '' : 'no-num'}"><span class="n">${c.num}</span><span class="l">${c.label}</span></a></li>`,
).join('');

function setChapter(id: ChapterId | null) {
  chapterNav.querySelectorAll<HTMLAnchorElement>('a').forEach((a) => {
    const on = a.dataset.nav === id;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'step');
    else a.removeAttribute('aria-current');
  });
}

// ── Narrative column ────────────────────────────────────────
const narrative = $('#narrative');
narrative.innerHTML = STEPS.map((s, i) => {
  const first = i === 0 || STEPS[i - 1].chapter !== s.chapter;
  const p = PHASE_INTRO[s.chapter];
  const head = first
    ? `<header class="phase-head chapter-anchor" id="${s.chapter}" data-chapter="${s.chapter}">
         <span class="phase-num">${CHAPTERS.find((c) => c.id === s.chapter)!.num}</span>
         <h2>${p.title}</h2><p>${p.sub}</p></header>`
    : '';
  return `${head}
  <article class="step" data-step="${i}" id="step-${s.id}">
    <p class="kicker"><span class="mode mode-${s.mode}">${s.mode === 'build' ? 'Build' : 'Test'}</span>${s.kicker}</p>
    <h3>${s.title}</h3>
    <p>${s.body}</p>
    ${s.actions ? `<ol class="actions">${s.actions.map((a) => `<li>${a.replace(/<ui>/g, '<span class="ui">').replace(/<\/ui>/g, '</span>')}</li>`).join('')}</ol>` : ''}
    ${s.note ? `<p class="note">${s.note}</p>` : ''}
  </article>`;
}).join('');

// ── Hero loop ───────────────────────────────────────────────
const phone = window.matchMedia('(max-width: 900px)');
let hero: WorkflowView;
function mountHero() {
  hero?.stop();
  hero = createWorkflow($('#hero-wf'), { title: 'Chat Trigger connected to AI Agent, which uses Google Gemini as its chat model', compact: phone.matches });
  if (!phone.matches) hero.svg.setAttribute('viewBox', '10 80 520 304');
  else hero.svg.setAttribute('viewBox', '0 0 360 244');
  hero.setVisible(['chat', 'agent', 'gemini']);
  hero.setActive(['chat', 'agent', 'gemini']);
  hero.setStatus('Ready');
}
mountHero();

function heroLoop() {
  const user = $('.hc-user');
  const agent = $('.hc-agent');
  const typing = $('.hc-typing');
  const text = $('.hc-text');
  if (reduced.matches) {
    gsap.set([user, agent, text], { opacity: 1, y: 0 });
    gsap.set(typing, { display: 'none' });
    return;
  }
  const hops = [{ from: 'chat', to: 'agent' }, { from: 'agent', to: 'gemini' }, { from: 'gemini', to: 'agent' }, { from: 'agent', to: 'chat' }] as const;
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6 });
  tl.set([user, agent], { opacity: 0, y: 8 })
    .set(typing, { display: 'inline-flex' })
    .set(text, { display: 'none' })
    .call(() => hero.setStatus('Waiting for message'))
    .to(user, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 0.4)
    .call(() => { hero.playFlow([...hops], false); hero.setStatus('Thinking…'); }, [], 0.9)
    .to(agent, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 1.9)
    .call(() => hero.setStatus('Generating response'), [], 1.9)
    .set(typing, { display: 'none' }, 3.7)
    .set(text, { display: 'inline' }, 3.7)
    .call(() => hero.setStatus('Responded · 1 run'), [], 3.7)
    .to([user, agent], { opacity: 0, duration: 0.4 }, 6.6);
}
heroLoop();

// ── Story stage ─────────────────────────────────────────────
let story = createWorkflow($('#story-wf'), { title: 'AI agent workflow', compact: phone.matches });
const chatLog = $('#chat-log');
const panel = $('#panel');
const mobileTabs = { chat: $<HTMLButtonElement>('#tab-chat'), panel: $<HTMLButtonElement>('#tab-panel') };
let current = -1;

const PANEL_NAMES: Record<Step['panel'], string> = { setup: 'Setup', key: 'API key', trigger: 'Trigger', prompt: 'Agent', model: 'Gemini', memory: 'Memory', 'memory-config': 'Memory', sheet: 'Sheet', 'sheets-config': 'Sheets tool', email: 'Gmail' };
const nodeLabel = (id: NodeId) => NODES.find((n) => n.id === id)!.label;

function selectTab(which: 'chat' | 'panel') {
  (['chat', 'panel'] as const).forEach((k) => mobileTabs[k].setAttribute('aria-selected', String(k === which)));
  $('#stage').dataset.tab = which;
}
mobileTabs.chat.addEventListener('click', () => selectTab('chat'));
mobileTabs.panel.addEventListener('click', () => selectTab('panel'));

function applyStep(i: number) {
  if (i === current) return;
  const s = STEPS[i];
  const forward = i > current;
  current = i;
  const motion = !reduced.matches;

  story.setVisible(s.nodes);
  story.setActive(s.active ?? []);
  story.setStatus(s.agentStatus ?? (s.nodes.length > 1 ? 'Ready' : ''));
  story.svg.setAttribute('aria-label', `Workflow with ${s.nodes.map(nodeLabel).join(', ')}`);
  const dur = motion && s.flow ? story.playFlow(s.flow) : (story.stop(), 0);

  renderChat(chatLog, s.chat, Math.max(0.4, dur - 0.3), motion && forward);
  renderPanel(panel, s);
  $('#chat-session').textContent = s.session ?? '';
  $('#cb-session').textContent = !s.nodes.length ? 'Empty workflow' : s.nodes.length === 6 ? 'All 6 nodes' : `${s.nodes.length} node${s.nodes.length > 1 ? 's' : ''}`;
  $('#cb-phase').textContent = s.chapter === 'setup' ? 'Setup' : `Phase ${s.chapter.slice(-1).padStart(2, '0')}`;
  $('#story-wf').classList.toggle('is-empty', !s.nodes.length);
  $('#stage').dataset.mode = s.mode;
  $('#stage').dataset.panel = s.panel;
  $('#cb-name').textContent = PANEL_INTRO_NAME(s);
  mobileTabs.panel.textContent = PANEL_NAMES[s.panel];

  // Mobile shows one view at a time: the node panel when the step is about configuration
  // or tool output, the chat otherwise.
  const panelFocus = s.mode === 'build' || !s.chat.length || s.sheetRows === 'reading' || (s.email && s.email.status !== 'APPROVED');
  selectTab(panelFocus ? 'panel' : 'chat');

  narrative.querySelectorAll('.step').forEach((el) => el.classList.toggle('is-current', Number((el as HTMLElement).dataset.step) === i));
}
const PANEL_INTRO_NAME = (s: Step) => PHASE_INTRO[s.chapter].name;

applyStep(0);

// One trigger per step: the step whose body crosses the reading line owns the stage.
// toggle callbacks fire for both scroll directions and for anchor jumps.
narrative.querySelectorAll<HTMLElement>('.step').forEach((el) => {
  const i = Number(el.dataset.step);
  ScrollTrigger.create({
    trigger: el,
    start: () => (innerWidth < 900 ? 'top 88%' : 'top 78%'),
    end: () => (innerWidth < 900 ? 'bottom 88%' : 'bottom 78%'),
    invalidateOnRefresh: true,
    onToggle: (self) => self.isActive && applyStep(i),
  });
});

// Chapter highlight follows whichever chapter region spans the viewport centre.
const regions: { id: ChapterId; el: Element; endEl: Element }[] = [];
CHAPTERS.forEach((c, ci) => {
  const el = document.getElementById(c.id)!;
  const next = CHAPTERS[ci + 1] && document.getElementById(CHAPTERS[ci + 1].id);
  regions.push({ id: c.id, el, endEl: next ?? el });
});
regions.forEach((r, i) => {
  ScrollTrigger.create({
    trigger: r.el,
    endTrigger: i < regions.length - 1 ? r.endEl : 'main',
    start: 'top 50%',
    end: i < regions.length - 1 ? 'top 50%' : 'bottom bottom',
    onToggle: (self) => self.isActive && setChapter(r.id),
    onLeaveBack: () => i === 0 && setChapter(null),
  });
});

// Reading progress.
const bar = $('#progress');
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (self) => (bar.style.transform = `scaleX(${self.progress.toFixed(4)})`),
});

// ── Final workflow ──────────────────────────────────────────
const finalTitle = 'Complete workflow: Chat Trigger feeds the AI Agent; Gemini, Simple Memory, get_board_members and send_board_email attach to it';
let final: WorkflowView;
function mountFinal() {
  final?.stop();
  final = createWorkflow($('#final-wf'), { title: finalTitle, compact: phone.matches });
  final.setVisible(NODES.map((n) => n.id));
  final.setStatus(phone.matches ? 'Ready' : '6 nodes · ready');
}
mountFinal();
ScrollTrigger.create({
  trigger: '#final-wf', start: 'top 75%',
  onEnter: () => {
    $('#final-wf').classList.add('drawn');
    if (!reduced.matches)
      final.playFlow([
        { from: 'chat', to: 'agent' }, { from: 'memory', to: 'agent' }, { from: 'agent', to: 'gemini' }, { from: 'gemini', to: 'agent' },
        { from: 'agent', to: 'sheets' }, { from: 'sheets', to: 'agent' }, { from: 'agent', to: 'gmail' }, { from: 'gmail', to: 'agent' }, { from: 'agent', to: 'chat' },
      ]);
  },
  onLeaveBack: () => { $('#final-wf').classList.remove('drawn'); final.stop(); },
});

// Anchor jumps: native scrolling (no hijack), honouring reduced motion.
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a) return;
  const target = document.getElementById(a.hash.slice(1));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', a.hash);
  if (target.tabIndex < 0 && !/^(A|BUTTON)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

// Crossing the phone breakpoint swaps diagram layouts and re-applies the current scene.
phone.addEventListener('change', () => {
  mountHero();
  story.stop();
  story = createWorkflow($('#story-wf'), { title: 'AI agent workflow', compact: phone.matches });
  const keep = current;
  current = -1;
  applyStep(Math.max(0, keep));
  mountFinal();
  if ($('#final-wf').classList.contains('drawn')) final.setVisible(NODES.map((n) => n.id));
  ScrollTrigger.refresh();
});

window.addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
