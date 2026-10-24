// Single source of truth for the story. Every scroll step is a full, declarative
// snapshot of the scene, so forward scroll, reverse scroll and anchor jumps all
// resolve to the same state.

export type NodeId = 'chat' | 'agent' | 'gemini' | 'memory' | 'sheets' | 'gmail';
export type ChapterId = 'intro' | 'setup' | 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'final';

export interface WfNode {
  id: NodeId;
  label: string;
  short: string;
  meta: string;
  kind: 'main' | 'sub';
  icon: 'message-square' | 'bot' | 'sparkles' | 'database' | 'sheet' | 'mail';
  tint: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hop {
  from: NodeId;
  to: NodeId;
  label?: string;
}

export interface Msg {
  id: string;
  role: 'user' | 'agent' | 'event';
  text: string;
}

export interface Email {
  status: 'DRAFT' | 'REVISED' | 'APPROVED' | 'SENT';
  to: string[];
  subject: string;
  body: string;
  time: string;
  duration: string;
  venue: string;
}

export type Panel = 'setup' | 'key' | 'trigger' | 'prompt' | 'model' | 'memory' | 'memory-config' | 'sheet' | 'sheets-config' | 'email';

export interface Step {
  id: string;
  chapter: Exclude<ChapterId, 'intro' | 'final'>;
  kicker: string;
  title: string;
  body: string;
  /** Click path in the n8n editor, in order. UI labels go in <ui>…</ui>. */
  actions?: string[];
  /** Test steps are simulated runs; build steps are configuration. */
  mode: 'build' | 'test';
  note?: string;
  nodes: NodeId[];
  active?: NodeId[];
  flow?: Hop[];
  agentStatus?: string;
  chat: Msg[];
  session?: string;
  panel: Panel;
  memory?: string[];
  sheetRows?: 'idle' | 'reading' | 'returned';
  email?: Email;
}

export const CHAPTERS: { id: ChapterId; num: string; label: string }[] = [
  { id: 'intro', num: '', label: 'Intro' },
  { id: 'setup', num: '00', label: 'Setup' },
  { id: 'phase-1', num: '01', label: 'Brain' },
  { id: 'phase-2', num: '02', label: 'Memory' },
  { id: 'phase-3', num: '03', label: 'Data' },
  { id: 'phase-4', num: '04', label: 'Email' },
  { id: 'final', num: '05', label: 'Workflow' },
];

export const NODES: WfNode[] = [
  { id: 'chat', short: 'Chat', label: 'Chat Trigger', meta: 'On chat message', kind: 'main', icon: 'message-square', tint: '#9aa3ad', x: 24, y: 116, w: 168, h: 76 },
  { id: 'agent', short: 'AI Agent', label: 'AI Agent', meta: 'Tools Agent', kind: 'main', icon: 'bot', tint: '#6ee7b7', x: 270, y: 96, w: 240, h: 116 },
  { id: 'gemini', short: 'Gemini', label: 'Google Gemini', meta: 'Chat Model', kind: 'sub', icon: 'sparkles', tint: '#8ab4f8', x: 30, y: 300, w: 156, h: 70 },
  { id: 'memory', short: 'Memory', label: 'Simple Memory', meta: 'Memory', kind: 'sub', icon: 'database', tint: '#f5c46b', x: 196, y: 300, w: 156, h: 70 },
  { id: 'sheets', short: 'Sheets', label: 'get_board_members', meta: 'Tool · Google Sheets', kind: 'sub', icon: 'sheet', tint: '#5fd38d', x: 362, y: 300, w: 184, h: 70 },
  { id: 'gmail', short: 'Gmail', label: 'send_board_email', meta: 'Tool · Gmail', kind: 'sub', icon: 'mail', tint: '#f28b82', x: 556, y: 300, w: 184, h: 70 },
];

export const BOARD_MEMBERS = [
  { name: 'Alex', email: 'alex@example.com' },
  { name: 'Sam', email: 'sam@example.com' },
  { name: 'Jordan', email: 'jordan@example.com' },
];

export const SYSTEM_PROMPT = `You are a friendly board assistant for the Matrix AI/ML community.

Answer clearly and briefly. If you don't know something, say so instead of guessing.

All times are in IST (Asia/Kolkata).`;

export const GMAIL_TOOL_DESCRIPTION =
  'Send an email. Only call this AFTER the user has explicitly approved the draft in chat. Never call this automatically.';

const TO = BOARD_MEMBERS.map((m) => m.email);
const SUBJECT = 'Board meeting tomorrow at 5:00 PM IST';

const DRAFT: Email = {
  status: 'DRAFT',
  to: TO,
  subject: SUBJECT,
  body: 'Hi all,\n\nThis is a reminder that we have a board meeting tomorrow at 5:00 PM IST.\n\nPlease plan to attend.\n\nBest regards,\nExecutive Agent',
  time: 'Tomorrow · 5:00 PM IST',
  duration: 'Not set',
  venue: 'Not set',
};

const REVISED: Email = {
  ...DRAFT,
  status: 'REVISED',
  body: 'Hi all,\n\nWe have a board meeting tomorrow from 5:00 PM IST for 30 minutes, in room AI201.\n\nPlease plan to attend.\n\nBest regards,\nExecutive Agent',
  duration: '30 min',
  venue: 'AI201',
};

// Shared conversation fragments, reused by id so the chat panel can diff them.
const P1_HI: Msg[] = [
  { id: 'p1-u1', role: 'user', text: 'Hi!' },
  { id: 'p1-a1', role: 'agent', text: 'Hey! How can I help you today?' },
];
const P2_INTRO: Msg[] = [
  { id: 'p2-u1', role: 'user', text: "Hi, I'm Alex." },
  { id: 'p2-a1', role: 'agent', text: 'Nice to meet you, Alex! How can I help?' },
];
const P3_ASK: Msg = { id: 'p3-u1', role: 'user', text: 'List the board members.' };
const P4_ASK: Msg = { id: 'p4-u1', role: 'user', text: 'Inform the board we have a board meeting tomorrow at 5 PM.' };
const P4_DRAFT: Msg = { id: 'p4-a1', role: 'agent', text: 'Here is a draft to Alex, Sam and Jordan for tomorrow at 5:00 PM IST. Want me to send it, or change anything first?' };
const P4_EDIT: Msg = { id: 'p4-u2', role: 'user', text: 'Change the duration to 30 minutes, 5 PM onwards, and the venue is AI201.' };
const P4_REV: Msg = { id: 'p4-a2', role: 'agent', text: 'Updated: 5:00 PM IST for 30 minutes, in AI201. Shall I send it?' };
const P4_OK: Msg = { id: 'p4-u3', role: 'user', text: 'Now send the mail.' };

const ALL: NodeId[] = ['chat', 'agent', 'gemini', 'memory', 'sheets', 'gmail'];
const P1: NodeId[] = ['chat', 'agent', 'gemini'];
const P2: NodeId[] = [...P1, 'memory'];
const P3: NodeId[] = [...P2, 'sheets'];
const ROUND_TRIP: Hop[] = [{ from: 'chat', to: 'agent' }, { from: 'agent', to: 'gemini' }, { from: 'gemini', to: 'agent' }, { from: 'agent', to: 'chat' }];

export const STEPS: Step[] = [
  // ── Setup ───────────────────────────────────────────────
  {
    id: 's-n8n', chapter: 'setup', mode: 'build', kicker: 'Setup · 1 of 2',
    title: 'Create an n8n workspace and a blank workflow.',
    body: 'Everything in this guide runs in <b>n8n Cloud</b> on the free trial. No local install needed.',
    actions: [
      'Go to <ui>app.n8n.cloud/login</ui> and choose <ui>Start a free trial</ui>',
      'Verify your email with the code n8n sends you',
      'Set your name, a password and an instance name (any name works)',
      'Answer the short onboarding survey and submit',
      'Click <ui>Start automating</ui>, then <ui>+</ui> → <ui>New workflow</ui> in the top-left panel',
    ],
    nodes: [], chat: [], panel: 'setup',
  },
  {
    id: 's-gemini', chapter: 'setup', mode: 'build', kicker: 'Setup · 2 of 2',
    title: 'Generate a Gemini API key.',
    body: 'The agent’s language model is Google Gemini. n8n needs a key to call it on your behalf.',
    actions: [
      'Open <ui>aistudio.google.com/api-keys</ui> and finish onboarding if you’re new',
      'Click <ui>Create API key</ui> (top right)',
      'Name it <ui>Default Gemini API Key</ui> and choose the default Gemini project',
      'Click <ui>Generate API key</ui> and copy it somewhere safe for now',
    ],
    note: 'Treat the key like a password. It goes into an n8n credential, never into a prompt, a screenshot or a repo.',
    nodes: [], chat: [], panel: 'key',
  },
  // ── Phase 1 ─────────────────────────────────────────────
  {
    id: 'p1-trigger', chapter: 'phase-1', mode: 'build', kicker: 'Phase 01 · Build 1',
    title: 'Add a Chat Trigger.',
    body: 'This is the entry point. Each chat message starts a workflow run, and the text arrives as <code>chatInput</code>.',
    actions: [
      'Click <ui>+ Add first step</ui>',
      'Search <ui>chat trigger</ui> and pick <ui>Chat</ui>',
      'Under Triggers choose <ui>On new chat event</ui>',
      'Close the panel. Defaults are fine.',
    ],
    nodes: ['chat'], active: ['chat'], chat: [], panel: 'trigger', session: 'session 1',
  },
  {
    id: 'p1-agent', chapter: 'phase-1', mode: 'build', kicker: 'Phase 01 · Build 2',
    title: 'Add the AI Agent and give it a system message.',
    body: 'The agent is the orchestrator. Point its prompt at the chat text, then add a system message that sets role, tone and timezone.',
    actions: [
      'Click the <ui>+</ui> to the right of the Chat Trigger and add <ui>AI Agent</ui>',
      'Set <ui>Source for Prompt</ui> to <ui>Define below</ui>',
      'Set <ui>Prompt</ui> to the expression <code>{{ $json.chatInput }}</code>',
      '<ui>Add Option</ui> → <ui>System Message</ui>, then paste the text shown in the panel',
      'Close the panel',
    ],
    note: 'A system message steers behaviour. It isn’t a security boundary.',
    nodes: ['chat', 'agent'], active: ['agent'], chat: [], panel: 'prompt', session: 'session 1',
  },
  {
    id: 'p1-model', chapter: 'phase-1', mode: 'build', kicker: 'Phase 01 · Build 3',
    title: 'Attach the Gemini chat model.',
    body: 'An agent can’t run without a model. Plug Gemini into the agent’s <b>Chat Model</b> slot and create the credential with your key.',
    actions: [
      'On the AI Agent, click <ui>Chat Model +</ui> and choose <ui>Google Gemini Chat Model</ui>',
      '<ui>Credential</ui> → <ui>Create new credential</ui>, paste your API key and <ui>Save</ui>',
      'Set <ui>Model</ui> to <ui>gemini 3.1 flash lite</ui>',
      '<ui>Add Option</ui> → <ui>Sampling Temperature</ui> → <ui>0.2</ui>',
    ],
    nodes: P1, active: ['gemini'], chat: [], panel: 'model', session: 'session 1',
  },
  {
    id: 'p1-run', chapter: 'phase-1', mode: 'test', kicker: 'Phase 01 · Test',
    title: 'Open the chat and say hi.',
    body: 'Click the <b>Open chat</b> button by the Chat Trigger. One message makes one run: trigger → agent → Gemini → reply.',
    actions: ['Click <ui>Open chat</ui> next to the trigger', 'Send <ui>Hi</ui>', 'Watch each node light up as the run executes'],
    nodes: P1, active: P1, flow: ROUND_TRIP, agentStatus: 'Generating response',
    chat: P1_HI, panel: 'model', session: 'session 1',
  },
  {
    id: 'p1-forget', chapter: 'phase-1', mode: 'test', kicker: 'Phase 01 · What’s missing',
    title: 'It works, but every message starts from zero.',
    body: 'With no memory attached, each run sees only the current <code>chatInput</code>. Earlier turns are never sent to the model. That’s why Phase 2 exists.',
    nodes: P1, active: ['agent'], flow: ROUND_TRIP,
    chat: [
      ...P1_HI,
      { id: 'p1-u2', role: 'user', text: "I'm Alex." },
      { id: 'p1-a2', role: 'agent', text: 'Hi Alex! What can I do for you?' },
      { id: 'p1-u3', role: 'user', text: "What's my name?" },
      { id: 'p1-a3', role: 'agent', text: "I don't know your name. Could you tell me?" },
    ],
    panel: 'model', session: 'session 1',
  },
  // ── Phase 2 ─────────────────────────────────────────────
  {
    id: 'p2-attach', chapter: 'phase-2', mode: 'build', kicker: 'Phase 02 · Build',
    title: 'Plug Simple Memory into the agent.',
    body: 'One sub-node. Simple Memory stores recent turns per chat session and feeds them back into each new run.',
    actions: ['On the AI Agent, click <ui>Memory +</ui>', 'Search and choose <ui>Simple Memory</ui>', 'Close it. The defaults read the session ID from the Chat Trigger.'],
    note: 'Memory lasts for the session only. Clear the chat session and the context is gone.',
    nodes: P2, active: ['memory'],
    chat: [], panel: 'memory-config', session: 'session 2',
  },
  {
    id: 'p2-intro', chapter: 'phase-2', mode: 'test', kicker: 'Phase 02 · Test 1',
    title: 'Clear the session, then introduce yourself.',
    body: 'Each turn gets written into the memory window as it happens.',
    actions: ['In the chat, clear the session', 'Send <ui>Hi, I am Alex</ui>'],
    nodes: P2, active: ['agent', 'memory'],
    flow: [{ from: 'chat', to: 'agent' }, { from: 'agent', to: 'gemini' }, { from: 'gemini', to: 'agent' }, { from: 'agent', to: 'memory', label: 'write' }, { from: 'agent', to: 'chat' }],
    chat: [{ id: 'p2-e0', role: 'event', text: 'Session cleared' }, ...P2_INTRO], panel: 'memory',
    memory: ["user: Hi, I'm Alex.", 'ai: Nice to meet you, Alex! How can I help?'], session: 'session 2',
  },
  {
    id: 'p2-recall', chapter: 'phase-2', mode: 'test', kicker: 'Phase 02 · Test 2',
    title: 'Ask “what is my name?”',
    body: 'Now the agent loads the stored turns along with the new message, so Gemini can answer from what you said earlier.',
    actions: ['Send <ui>What is my name?</ui>'],
    nodes: P2, active: ['memory', 'agent', 'gemini'],
    flow: [{ from: 'chat', to: 'agent' }, { from: 'memory', to: 'agent', label: 'load context' }, { from: 'agent', to: 'gemini' }, { from: 'gemini', to: 'agent' }, { from: 'agent', to: 'chat' }],
    agentStatus: 'Context: 2 messages',
    chat: [
      { id: 'p2-e0', role: 'event', text: 'Session cleared' }, ...P2_INTRO,
      { id: 'p2-u2', role: 'user', text: "What's my name?" },
      { id: 'p2-a2', role: 'agent', text: 'You told me your name is Alex.' },
    ],
    panel: 'memory',
    memory: ["user: Hi, I'm Alex.", 'ai: Nice to meet you, Alex! How can I help?', "user: What's my name?", 'ai: You told me your name is Alex.'],
    session: 'session 2',
  },
  // ── Phase 3 ─────────────────────────────────────────────
  {
    id: 'p3-sheet', chapter: 'phase-3', mode: 'build', kicker: 'Phase 03 · Build 1',
    title: 'Create the data source in Google Sheets.',
    body: 'The agent reads board members from a plain spreadsheet. Two columns are enough.',
    actions: ['In a new tab, open Google Sheets and sign in', 'Create a sheet named <ui>Members List</ui>', 'Add the headers <ui>Name</ui> and <ui>Email</ui>', 'Add a few rows, e.g. your own name and email plus one more'],
    nodes: P2, active: [], chat: [], panel: 'sheet', sheetRows: 'idle', session: 'session 3',
  },
  {
    id: 'p3-attach', chapter: 'phase-3', mode: 'build', kicker: 'Phase 03 · Build 2',
    title: 'Add the get_board_members tool.',
    body: 'A Google Sheets node in the agent’s <b>Tool</b> slot. The node name and description are what the model reads when it chooses a tool, so name it deliberately.',
    actions: [
      'On the AI Agent, click <ui>Tool +</ui> and choose <ui>Google Sheets</ui>',
      'Rename the node (top left) to <code>get_board_members</code>',
      '<ui>Sign in with Google</ui> and tick <ui>Select all</ui> for permissions',
      '<ui>Tool Description</ui> → <ui>Set Manually</ui> → <ui>list the board members</ui>',
      '<ui>Document</ui> → <ui>Members List</ui>, <ui>Sheet</ui> → <ui>Sheet1</ui>, and leave the rest as default',
    ],
    nodes: P3, active: ['sheets'], chat: [], panel: 'sheets-config', session: 'session 3',
  },
  {
    id: 'p3-decide', chapter: 'phase-3', mode: 'test', kicker: 'Phase 03 · Test · Under the hood 1',
    title: 'The model chooses the tool…',
    body: 'Send <b>List the board members</b>. Gemini sees the message and the tool descriptions, and replies with a tool call for <code>get_board_members</code>. That’s only a decision. Nothing has run yet.',
    actions: ['Send <ui>List the board members</ui>'],
    nodes: P3, active: ['agent', 'gemini'],
    flow: [{ from: 'chat', to: 'agent' }, { from: 'agent', to: 'gemini' }, { from: 'gemini', to: 'agent', label: 'tool call: get_board_members' }],
    agentStatus: 'Selecting tool…',
    chat: [P3_ASK], panel: 'sheet', sheetRows: 'idle', session: 'session 3',
  },
  {
    id: 'p3-exec', chapter: 'phase-3', mode: 'test', kicker: 'Phase 03 · Test · Under the hood 2',
    title: '…and n8n executes it.',
    body: 'The <b>tool node</b> runs the read with the OAuth credential stored in n8n. The model never holds that credential. It only sees the rows the tool returns.',
    nodes: P3, active: ['sheets'],
    flow: [{ from: 'agent', to: 'sheets', label: 'invoke' }, { from: 'sheets', to: 'agent', label: '3 rows' }],
    agentStatus: 'Calling get_board_members',
    chat: [P3_ASK, { id: 'p3-e1', role: 'event', text: 'Tool · get_board_members → 3 rows' }],
    panel: 'sheet', sheetRows: 'reading', session: 'session 3',
  },
  {
    id: 'p3-answer', chapter: 'phase-3', mode: 'test', kicker: 'Phase 03 · Test · Under the hood 3',
    title: 'The rows go back to the model.',
    body: 'The tool output goes back to Gemini as context, and Gemini writes the final answer. Open the run in <b>Executions</b> to inspect each step.',
    nodes: P3, active: ['agent', 'gemini'],
    flow: [{ from: 'agent', to: 'gemini' }, { from: 'gemini', to: 'agent' }, { from: 'agent', to: 'chat' }],
    chat: [P3_ASK, { id: 'p3-e1', role: 'event', text: 'Tool · get_board_members → 3 rows' },
      { id: 'p3-a1', role: 'agent', text: 'The board members are:\n• Alex · alex@example.com\n• Sam · sam@example.com\n• Jordan · jordan@example.com' }],
    panel: 'sheet', sheetRows: 'returned', session: 'session 3',
  },
  // ── Phase 4 ─────────────────────────────────────────────
  {
    id: 'p4-attach', chapter: 'phase-4', mode: 'build', kicker: 'Phase 04 · Build',
    title: 'Add the send_board_email tool.',
    body: 'A Gmail node in a second <b>Tool</b> slot. The model fills To, Subject and Message, and the description tells it when it may send.',
    actions: [
      'On the AI Agent, click <ui>Tool +</ui> and choose the <ui>Gmail</ui> tool',
      'Rename the node to <code>send_board_email</code> and sign in with Google',
      '<ui>Tool Description</ui> → <ui>Set Manually</ui>, then paste the description shown in the panel',
      'For <ui>To</ui>, <ui>Subject</ui> and <ui>Message</ui>, click the ✦ button so each is <ui>Defined automatically by the model</ui>',
      '<ui>Add Option</ui> → <ui>Sender Name</ui> → <ui>Executive Agent</ui>',
      '<ui>Add Option</ui> → <ui>Append n8n Attribution</ui> → turn it off',
    ],
    nodes: ALL, active: ['gmail'], chat: [], panel: 'email', session: 'session 4',
  },
  {
    id: 'p4-draft', chapter: 'phase-4', mode: 'test', kicker: 'Phase 04 · Test 1 · Draft',
    title: 'Ask for the email. You get a draft.',
    body: 'The agent looks up recipients with <code>get_board_members</code> and drafts in chat. Gmail isn’t called.',
    actions: ['Send <ui>inform the board we have a board meeting tomorrow at 5pm</ui>'],
    nodes: ALL, active: ['agent', 'sheets'],
    flow: [{ from: 'chat', to: 'agent' }, { from: 'agent', to: 'gemini' }, { from: 'agent', to: 'sheets', label: 'recipients' }, { from: 'sheets', to: 'agent' }, { from: 'agent', to: 'chat' }],
    agentStatus: 'Drafting · awaiting approval',
    chat: [P4_ASK, P4_DRAFT], panel: 'email', email: DRAFT, session: 'session 4',
  },
  {
    id: 'p4-revise', chapter: 'phase-4', mode: 'test', kicker: 'Phase 04 · Test 2 · Revise',
    title: 'Don’t send yet. Revise it.',
    body: 'Memory keeps the draft in context, so the follow-up edits the same email.',
    actions: ['Send <ui>change the duration to 30min, 5pm onwards and then venue is AI201</ui>'],
    nodes: ALL, active: ['memory', 'agent'],
    flow: [{ from: 'chat', to: 'agent' }, { from: 'memory', to: 'agent', label: 'previous draft' }, { from: 'agent', to: 'gemini' }, { from: 'gemini', to: 'agent' }, { from: 'agent', to: 'chat' }],
    agentStatus: 'Revising · awaiting approval',
    chat: [P4_ASK, P4_DRAFT, P4_EDIT, P4_REV], panel: 'email', email: REVISED, session: 'session 4',
  },
  {
    id: 'p4-approve', chapter: 'phase-4', mode: 'test', kicker: 'Phase 04 · Test 3 · Approve',
    title: 'Approve explicitly. Then Gmail runs.',
    body: 'An explicit “send” is what the tool description waits for. Only then does the agent call <code>send_board_email</code>, filling To, Subject and Message from the approved draft.',
    actions: ['Send <ui>now send the mail</ui>'],
    note: 'Here, approval is an instruction in the tool description, not a hard lock. For a guaranteed sign-off, add a deterministic approval step to the workflow.',
    nodes: ALL, active: ['agent', 'gmail'],
    flow: [{ from: 'chat', to: 'agent', label: 'approved' }, { from: 'agent', to: 'gemini' }, { from: 'gemini', to: 'agent', label: 'tool call: send_board_email' }, { from: 'agent', to: 'gmail', label: 'invoke' }],
    agentStatus: 'Calling send_board_email',
    chat: [P4_ASK, P4_DRAFT, P4_EDIT, P4_REV, P4_OK], panel: 'email', email: { ...REVISED, status: 'APPROVED' }, session: 'session 4',
  },
  {
    id: 'p4-sent', chapter: 'phase-4', mode: 'test', kicker: 'Phase 04 · Test 4 · Sent',
    title: 'Sent. Check the inbox.',
    body: 'Gmail returns success and the agent confirms in chat. The recipients from your sheet get the email, sent as “Executive Agent”.',
    note: 'This page is a simulation. It makes no Gmail API calls and sends no email.',
    nodes: ALL, active: ['gmail'],
    flow: [{ from: 'gmail', to: 'agent', label: 'sent' }, { from: 'agent', to: 'chat' }],
    chat: [P4_ASK, P4_DRAFT, P4_EDIT, P4_REV, P4_OK,
      { id: 'p4-e1', role: 'event', text: 'Tool · send_board_email → sent' },
      { id: 'p4-a3', role: 'agent', text: 'Done. The meeting email has been sent to Alex, Sam and Jordan.' }],
    panel: 'email', email: { ...REVISED, status: 'SENT' }, session: 'session 4',
  },
];
