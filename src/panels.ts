import { BOARD_MEMBERS, GMAIL_TOOL_DESCRIPTION, SYSTEM_PROMPT, type Email, type Msg, type Step } from './data';
import { icon } from './workflow';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Diffs messages by id so going forward appends and going back removes, with no full re-render. */
export function renderChat(log: HTMLElement, msgs: Msg[], replyDelay: number, animate: boolean) {
  const want = new Set(msgs.map((m) => m.id));
  log.querySelectorAll<HTMLElement>('[data-msg]').forEach((el) => {
    if (!want.has(el.dataset.msg!)) el.remove();
  });
  let userIdx = 0;
  msgs.forEach((m, i) => {
    let el = log.querySelector<HTMLElement>(`[data-msg="${m.id}"]`);
    if (el) return;
    el = document.createElement('div');
    el.dataset.msg = m.id;
    el.className = `msg msg-${m.role}`;
    el.innerHTML =
      m.role === 'event'
        ? `<span>${esc(m.text)}</span>`
        : `<span class="who">${m.role === 'user' ? 'You' : 'Agent'}</span><p>${esc(m.text).replace(/\n/g, '<br>')}</p>`;
    if (animate) {
      // User lines appear first; agent replies land after the packet has travelled.
      const d = m.role === 'user' ? 0.1 + userIdx++ * 0.15 : replyDelay;
      el.style.animationDelay = `${d}s`;
      el.classList.add('enter');
    }
    const next = msgs.slice(i + 1).map((n) => log.querySelector(`[data-msg="${n.id}"]`)).find(Boolean);
    log.insertBefore(el, next ?? null);
  });
  log.scrollTo({ top: log.scrollHeight, behavior: animate ? 'smooth' : 'auto' });
}

const STATUSES: Email['status'][] = ['DRAFT', 'REVISED', 'APPROVED', 'SENT'];
const STATUS_LABEL: Record<Email['status'], string> = { DRAFT: 'Draft', REVISED: 'Revised', APPROVED: 'Approval', SENT: 'Sent' };

function emailPanel(e: Email | undefined): string {
  const st = e?.status;
  const idx = st ? STATUSES.indexOf(st) : -1;
  const field = (k: string, label: string, v: string) =>
    `<div class="mf" data-field="${k}" data-val="${esc(v)}"><span>${label}</span><b>${esc(v)}</b></div>`;
  return `
  <header class="win-bar"><span class="win-ico" style="--tint:#f28b82">${icon('mail', 14)}</span><span>Gmail · send_board_email</span>
    <span class="pill ${st === 'SENT' ? 'ok' : st === 'APPROVED' ? 'go' : ''}">${st ? STATUS_LABEL[st] : 'Idle'}</span></header>
  <ol class="stepper" aria-label="Email state">
    ${STATUSES.map((s, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}">${STATUS_LABEL[s]}</li>`).join('')}
  </ol>
  ${e ? `
  <div class="mail">
    ${field('to', 'To', e.to.join(', '))}
    ${field('subject', 'Subject', e.subject)}
    <div class="mrow">
      ${field('time', 'Meeting', e.time)}${field('duration', 'Duration', e.duration)}${field('venue', 'Venue', e.venue)}
    </div>
    <div class="mbody" data-field="body" data-val="${esc(e.body)}">${esc(e.body).replace(/\n/g, '<br>')}</div>
    <footer class="mfoot">
      <span class="from">From: Executive Agent</span>
      <span class="send ${st === 'SENT' ? 'sent' : st === 'APPROVED' ? 'sending' : 'locked'}">
        ${st === 'SENT' ? 'Sent ✓' : st === 'APPROVED' ? 'Sending…' : 'Waiting for approval'}</span>
    </footer>
  </div>` : `
  <div class="cfg">
    <div class="cfg-row"><span>Tool description</span><code class="wrap">${esc(GMAIL_TOOL_DESCRIPTION)}</code></div>
    <div class="cfg-row"><span>To · Subject · Message</span><code>✦ Defined automatically by the model</code></div>
    <div class="cfg-row"><span>Sender name</span><code>Executive Agent</code></div>
    <div class="cfg-row"><span>Append n8n attribution</span><code>off</code></div>
  </div>`}`;
}

function sheetPanel(state: Step['sheetRows']): string {
  return `
  <header class="win-bar"><span class="win-ico" style="--tint:#5fd38d">${icon('sheet', 14)}</span><span>Members List · Sheet1</span>
    <span class="pill ${state === 'reading' ? 'go' : state === 'returned' ? 'ok' : ''}">${state === 'reading' ? 'Reading' : state === 'returned' ? 'Returned 3 rows' : 'Connected'}</span></header>
  <div class="sheet ${state ?? ''}" role="table" aria-label="Members List (fictional)">
    <div class="sr head" role="row"><span role="columnheader"></span><span role="columnheader">A · Name</span><span role="columnheader">B · Email</span></div>
    <div class="sr hdr" role="row"><span>1</span><span role="cell">Name</span><span role="cell">Email</span></div>
    ${BOARD_MEMBERS.map((m, i) => `<div class="sr data" role="row" style="--i:${i}"><span>${i + 2}</span><span role="cell">${m.name}</span><span role="cell">${m.email}</span></div>`).join('')}
    ${[5, 6].map((n) => `<div class="sr" role="row"><span>${n}</span><span></span><span></span></div>`).join('')}
  </div>
  <p class="win-note">Fictional demo records.</p>`;
}

function promptPanel(): string {
  return `
  <header class="win-bar"><span class="win-ico" style="--tint:#6ee7b7">${icon('bot', 14)}</span><span>AI Agent · Parameters</span><span class="pill">Tools Agent</span></header>
  <div class="cfg">
    <div class="cfg-row"><span>Source for prompt</span><code>Define below</code></div>
    <div class="cfg-row"><span>Prompt (user message)</span><code class="expr">{{ $json.chatInput }}</code></div>
  </div>
  <div class="code"><div class="code-h">System message</div><pre>${esc(SYSTEM_PROMPT)}</pre></div>`;
}

function modelPanel(): string {
  return `
  <header class="win-bar"><span class="win-ico" style="--tint:#8ab4f8">${icon('sparkles', 14)}</span><span>Google Gemini Chat Model</span><span class="pill ok">Credential set</span></header>
  <div class="cfg">
    <div class="cfg-row"><span>Credential</span><code>Gemini API · ••••••••</code></div>
    <div class="cfg-row"><span>Model</span><code>gemini 3.1 flash lite</code></div>
    <div class="cfg-row"><span>Sampling temperature</span><code class="temp"><i style="--v:.2"></i>0.2</code></div>
  </div>
  <p class="win-note">Temperature 0.2 keeps answers focused and repeatable, which matters when the model is choosing tools. The key stays in the credential.</p>`;
}

function memoryPanel(rows: string[] = []): string {
  return `
  <header class="win-bar"><span class="win-ico" style="--tint:#f5c46b">${icon('database', 14)}</span><span>Simple Memory · this session</span><span class="pill">${rows.length} messages</span></header>
  <ol class="mem">
    ${rows.length ? rows.map((r, i) => `<li style="--i:${i}"><span class="k">${r.startsWith('user') ? 'user' : 'ai'}</span>${esc(r.replace(/^(user|ai): /, ''))}</li>`).join('') : '<li class="empty">Empty. Nothing has been said in this session yet.</li>'}
  </ol>
  <p class="win-note">Recent messages are kept per session ID and fed back to the agent each turn. Clearing the session clears this.</p>`;
}

function setupPanel(): string {
  const item = (done: boolean, t: string, d: string) =>
    `<li class="${done ? 'done' : ''}"><i aria-hidden="true"></i><div><b>${t}</b><span>${d}</span></div></li>`;
  return `
  <header class="win-bar"><span class="win-ico" style="--tint:#ece8e1">${icon('bot', 14)}</span><span>Before you build</span><span class="pill">Prerequisites</span></header>
  <ul class="checklist">
    ${item(true, 'n8n Cloud account', 'Free trial at app.n8n.cloud')}
    ${item(false, 'Gemini API key', 'From Google AI Studio')}
    ${item(false, 'Google account', 'For Sheets and Gmail sign-in (OAuth)')}
  </ul>
  <div class="empty-canvas"><span>+</span>Add first step</div>`;
}

function keyPanel(): string {
  return `
  <header class="win-bar"><span class="win-ico" style="--tint:#8ab4f8">${icon('sparkles', 14)}</span><span>Google AI Studio · API keys</span><span class="pill go">Create API key</span></header>
  <div class="cfg">
    <div class="cfg-row"><span>Name</span><code>Default Gemini API Key</code></div>
    <div class="cfg-row"><span>Project</span><code>Default Gemini Project</code></div>
    <div class="cfg-row"><span>Key</span><code>•••••••••••••••••••• · Copy</code></div>
  </div>
  <p class="win-note">Next you’ll paste this into an n8n <b>Google Gemini (PaLM) API</b> credential. n8n stores it encrypted, and workflows only reference the credential.</p>`;
}

function triggerPanel(): string {
  return `
  <header class="win-bar"><span class="win-ico" style="--tint:#9aa3ad">${icon('message-square', 14)}</span><span>Chat Trigger · On new chat event</span><span class="pill">Trigger</span></header>
  <div class="cfg">
    <div class="cfg-row"><span>Parameters</span><code>Defaults (hosted chat in the editor)</code></div>
  </div>
  <div class="code"><div class="code-h">Output · one item per message</div><pre>{
  "sessionId": "…",
  "action": "sendMessage",
  "chatInput": "Hi"
}</pre></div>
  <p class="win-note">Downstream nodes read the text via <code>$json.chatInput</code>. Memory keys off <code>sessionId</code>.</p>`;
}

function memoryConfigPanel(): string {
  return `
  <header class="win-bar"><span class="win-ico" style="--tint:#f5c46b">${icon('database', 14)}</span><span>Simple Memory · Parameters</span><span class="pill">Defaults</span></header>
  <div class="cfg">
    <div class="cfg-row"><span>Session ID</span><code>Connected Chat Trigger Node</code></div>
    <div class="cfg-row"><span>Session key</span><code class="expr">{{ $json.sessionId }}</code></div>
    <div class="cfg-row"><span>Context Window Length</span><code>default · recent turns kept</code></div>
  </div>
  <p class="win-note">Memory lives in the n8n instance, keyed by session. A new chat session starts empty.</p>`;
}

function sheetsConfigPanel(): string {
  return `
  <header class="win-bar"><span class="win-ico" style="--tint:#5fd38d">${icon('sheet', 14)}</span><span>get_board_members · Google Sheets Tool</span><span class="pill ok">Signed in</span></header>
  <div class="cfg">
    <div class="cfg-row"><span>Node name (what the model sees)</span><code class="expr">get_board_members</code></div>
    <div class="cfg-row"><span>Tool Description · Set Manually</span><code>list the board members</code></div>
    <div class="cfg-row"><span>Credential</span><code>Google Sheets account (OAuth2)</code></div>
    <div class="cfg-row"><span>Document · Sheet</span><code>Members List · Sheet1</code></div>
    <div class="cfg-row"><span>Everything else</span><code>Defaults</code></div>
  </div>`;
}

export function renderPanel(host: HTMLElement, step: Step) {
  const html =
    step.panel === 'setup' ? setupPanel()
    : step.panel === 'key' ? keyPanel()
    : step.panel === 'trigger' ? triggerPanel()
    : step.panel === 'memory-config' ? memoryConfigPanel()
    : step.panel === 'sheets-config' ? sheetsConfigPanel()
    : step.panel === 'prompt' ? promptPanel()
    : step.panel === 'model' ? modelPanel()
    : step.panel === 'memory' ? memoryPanel(step.memory)
    : step.panel === 'sheet' ? sheetPanel(step.sheetRows)
    : emailPanel(step.email);
  if (host.dataset.html === html) return;
  // Remember previous field values so edits in a revision can be highlighted.
  const prev = new Map<string, string>();
  host.querySelectorAll<HTMLElement>('[data-field]').forEach((f) => prev.set(f.dataset.field!, f.dataset.val!));
  const samePanel = host.dataset.panel === step.panel;
  host.dataset.html = html;
  host.dataset.panel = step.panel;
  host.innerHTML = html;
  if (!samePanel) {
    host.classList.remove('swap');
    void host.offsetWidth;
    host.classList.add('swap');
  }
  host.querySelectorAll<HTMLElement>('[data-field]').forEach((f) => {
    const p = prev.get(f.dataset.field!);
    if (p !== undefined && p !== f.dataset.val) f.classList.add('changed');
  });
}
