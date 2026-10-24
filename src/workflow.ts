import gsap from 'gsap';
import { Bot, Database, Mail, MessageSquare, Sheet, Sparkles, type IconNode } from 'lucide';
import { NODES, type Hop, type NodeId, type WfNode } from './data';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS: Record<WfNode['icon'], IconNode> = {
  'message-square': MessageSquare, bot: Bot, sparkles: Sparkles, database: Database, sheet: Sheet, mail: Mail,
};

/** Lucide icon as an SVG string, usable both inside <svg> and in HTML. */
export function icon(name: WfNode['icon'], size = 18, extra = ''): string {
  const inner = (ICONS[name][2] ?? [])
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');
  return `<svg ${extra} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

type Box = { x: number; y: number; w: number; h: number };
interface Layout {
  compact: boolean;
  viewBox: string;
  box: Record<NodeId, Box>;
  ports: Record<Exclude<NodeId, 'chat' | 'agent'>, number>;
}

// Desktop: n8n-style canvas, sub-nodes hang off the agent's Chat Model / Memory / Tool slots.
const DESKTOP: Layout = {
  compact: false,
  viewBox: '12 84 736 298',
  box: Object.fromEntries(NODES.map((n) => [n.id, { x: n.x, y: n.y, w: n.w, h: n.h }])) as Layout['box'],
  ports: { gemini: 300, memory: 350, sheets: 430, gmail: 480 },
};

// Phones: same topology recomposed vertically so labels stay legible at ~360px.
const SUB_Y = 178;
const MOBILE: Layout = {
  compact: true,
  viewBox: '0 0 360 244',
  box: {
    chat: { x: 100, y: 6, w: 160, h: 48 },
    agent: { x: 24, y: 84, w: 312, h: 66 },
    gemini: { x: 6, y: SUB_Y, w: 80, h: 60 },
    memory: { x: 96, y: SUB_Y, w: 80, h: 60 },
    sheets: { x: 186, y: SUB_Y, w: 80, h: 60 },
    gmail: { x: 276, y: SUB_Y, w: 80, h: 60 },
  },
  ports: { gemini: 46, memory: 136, sheets: 226, gmail: 316 },
};

/** Canonical edge path. Main edge runs chat → agent; sub edges run agent → sub-node. */
function edgePath(L: Layout, id: NodeId): string {
  const a = L.box.agent;
  if (id === 'chat') {
    const c = L.box.chat;
    if (L.compact) return `M 180 ${c.y + c.h} L 180 ${a.y}`;
    const y = a.y + a.h / 2;
    const x1 = c.x + c.w;
    return `M ${x1} ${y} C ${x1 + 40} ${y}, ${a.x - 40} ${y}, ${a.x} ${y}`;
  }
  const n = L.box[id];
  const px = L.ports[id as keyof Layout['ports']];
  const y1 = a.y + a.h;
  const cx = n.x + n.w / 2;
  const bend = (n.y - y1) / 2;
  return `M ${px} ${y1} C ${px} ${y1 + bend}, ${cx} ${n.y - bend}, ${cx} ${n.y}`;
}

const edgeKey = (a: NodeId, b: NodeId) => (a === 'agent' ? b : a);

function nodeMarkup(L: Layout, n: WfNode): string {
  const { x, y, w, h } = L.box[n.id];
  const main = n.kind === 'main';
  const isAgent = n.id === 'agent';
  const r = main ? 14 : L.compact ? 16 : 35;
  const frame = `
    <rect class="halo" x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="${r + 6}" />
    <rect class="body" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" />`;
  const glyph = (ix: number, iy: number, size: number) => `
    <rect class="chip" x="${ix}" y="${iy}" width="32" height="32" rx="${main ? 9 : 16}" />
    <g transform="translate(${ix + 16 - size / 2} ${iy + 16 - size / 2})" class="ico">${icon(n.icon, size)}</g>`;
  const open = `<g class="wf-node ${main ? 'is-main' : 'is-sub'}" data-node="${n.id}" style="--tint:${n.tint}">`;

  if (L.compact && !main) {
    return `${open}${frame}${glyph(x + w / 2 - 16, y + 6, 17)}
      <text class="label" x="${x + w / 2}" y="${y + 52}" text-anchor="middle">${n.short}</text></g>`;
  }
  const ix = x + (L.compact ? 10 : 16);
  const iy = isAgent && !L.compact ? y + 18 : y + (h - 32) / 2;
  const tx = ix + 44;
  const ports = isAgent
    ? Object.entries(L.ports).map(([id, px]) => `
        <g class="port" data-port="${id}"><rect x="${px - 4}" y="${y + h - 4}" width="8" height="8" transform="rotate(45 ${px} ${y + h})" /></g>`).join('') +
      (L.compact ? '' : `<text class="port-label" x="325" y="${y + h - 10}" text-anchor="middle">model · memory</text>
       <text class="port-label" x="455" y="${y + h - 10}" text-anchor="middle">tools</text>`)
    : '';
  const status = isAgent
    ? `<text class="status" x="${L.compact ? x + w - 12 : ix}" y="${L.compact ? iy + 21 : iy + 54}" ${L.compact ? 'text-anchor="end"' : ''} data-status></text>`
    : '';
  const outPort = n.id === 'chat'
    ? `<circle class="out-port" cx="${L.compact ? x + w / 2 : x + w}" cy="${L.compact ? y + h : y + h / 2}" r="5"/>` : '';
  return `${open}${frame}${glyph(ix, iy, isAgent ? 22 : 18)}
    <text class="label" x="${tx}" y="${iy + 14}">${n.label}</text>
    <text class="meta" x="${tx}" y="${iy + 29}">${n.meta}</text>
    ${status}${outPort}${ports}</g>`;
}

export interface WorkflowView {
  svg: SVGSVGElement;
  setVisible(ids: NodeId[]): void;
  setActive(ids: NodeId[]): void;
  setStatus(text: string): void;
  playFlow(hops: Hop[], loop?: boolean): number;
  stop(): void;
}

export function createWorkflow(host: HTMLElement, opts: { title: string; compact?: boolean }): WorkflowView {
  const L = opts.compact ? MOBILE : DESKTOP;
  const edges = (['chat', 'gemini', 'memory', 'sheets', 'gmail'] as const)
    .map((id) => `<path class="wf-edge ${id === 'chat' ? 'is-main' : 'is-sub'}" data-edge="${id}" d="${edgePath(L, id)}" pathLength="1"/>`)
    .join('');
  host.innerHTML = `
  <svg class="wf${L.compact ? ' compact' : ''}" viewBox="${L.viewBox}" role="img" aria-label="${opts.title}" xmlns="${SVG_NS}">
    <defs>
      <pattern id="dots-${host.id}" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1" class="grid-dot"/>
      </pattern>
    </defs>
    <rect x="-500" y="-500" width="2000" height="2000" fill="url(#dots-${host.id})" class="grid"/>
    <g class="edges">${edges}</g>
    <g class="nodes">${NODES.map((n) => nodeMarkup(L, n)).join('')}</g>
    <g class="packets"><circle class="packet" r="5" opacity="0"/><g class="hop-tag" opacity="0"><rect rx="9" height="18"/><text/></g></g>
  </svg>`;
  const svg = host.querySelector('svg')!;
  const packet = svg.querySelector<SVGCircleElement>('.packet')!;
  const tag = svg.querySelector<SVGGElement>('.hop-tag')!;
  const status = svg.querySelector<SVGTextElement>('[data-status]')!;
  let tl: gsap.core.Timeline | null = null;

  const edgeEl = (k: string) => svg.querySelector<SVGPathElement>(`[data-edge="${k}"]`)!;

  function setVisible(ids: NodeId[]) {
    svg.querySelectorAll<SVGGElement>('.wf-node').forEach((g) => g.classList.toggle('on', ids.includes(g.dataset.node as NodeId)));
    svg.querySelectorAll<SVGPathElement>('.wf-edge').forEach((p) => {
      const k = p.dataset.edge as NodeId;
      p.classList.toggle('on', ids.includes('agent') && ids.includes(k));
    });
    svg.querySelectorAll<SVGGElement>('.port').forEach((p) => p.classList.toggle('on', ids.includes(p.dataset.port as NodeId)));
  }

  function setActive(ids: NodeId[]) {
    svg.querySelectorAll<SVGGElement>('.wf-node').forEach((g) => g.classList.toggle('active', ids.includes(g.dataset.node as NodeId)));
  }

  function stop() {
    tl?.kill();
    tl = null;
    gsap.set([packet, tag], { opacity: 0 });
    svg.querySelectorAll('.wf-edge.hot').forEach((e) => e.classList.remove('hot'));
    svg.querySelectorAll('.wf-node.pulse').forEach((e) => e.classList.remove('pulse'));
  }

  /** Animates a packet hop by hop. Returns total duration in seconds (one pass). */
  function playFlow(hops: Hop[], loop = true): number {
    stop();
    if (!hops.length) return 0;
    const HOP = 0.62;
    tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.8 });
    hops.forEach((h, i) => {
      const path = edgeEl(edgeKey(h.from, h.to));
      const len = path.getTotalLength();
      // Canonical paths start at chat (main) or at the agent (sub edges).
      const forward = h.from === 'chat' || h.from === 'agent';
      const s = { t: 0 };
      const at = i * (HOP + 0.12);
      tl!.call(() => {
        path.classList.add('hot');
        svg.querySelector(`[data-node="${h.to}"]`)?.classList.remove('pulse');
        if (h.label) {
          const mid = path.getPointAtLength(len / 2);
          const t = tag.querySelector('text')!;
          t.textContent = h.label;
          const w = h.label.length * 6.4 + 18;
          tag.querySelector('rect')!.setAttribute('width', String(w));
          tag.setAttribute('transform', `translate(${mid.x - w / 2} ${mid.y - 9})`);
          t.setAttribute('x', String(w / 2));
          t.setAttribute('y', '12.5');
          gsap.to(tag, { opacity: 1, duration: 0.2 });
        } else gsap.to(tag, { opacity: 0, duration: 0.15 });
      }, [], at);
      tl!.to(packet, { opacity: 1, duration: 0.12 }, at);
      tl!.to(s, {
        t: 1, duration: HOP, ease: 'power2.inOut',
        onUpdate: () => {
          const p = path.getPointAtLength(len * (forward ? s.t : 1 - s.t));
          packet.setAttribute('cx', String(p.x));
          packet.setAttribute('cy', String(p.y));
        },
      }, at);
      tl!.call(() => {
        path.classList.remove('hot');
        const n = svg.querySelector(`[data-node="${h.to}"]`);
        n?.classList.add('pulse');
        setTimeout(() => n?.classList.remove('pulse'), 500);
      }, [], at + HOP);
    });
    tl.to([packet, tag], { opacity: 0, duration: 0.25 });
    return hops.length * (HOP + 0.12);
  }

  return { svg, setVisible, setActive, setStatus: (t) => (status.textContent = t), playFlow, stop };
}
