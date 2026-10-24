import { describe, expect, it } from 'vitest';
import { STEPS, NODES, BOARD_MEMBERS, CHAPTERS } from '../src/data';

describe('story data', () => {
  it('covers the four phases from docs/project.md in order', () => {
    const phases = STEPS.map((s) => s.chapter).filter((c, i, a) => a.indexOf(c) === i);
    expect(phases).toEqual(['setup', 'phase-1', 'phase-2', 'phase-3', 'phase-4']);
    expect(CHAPTERS.map((c) => c.id)).toEqual(['intro', 'setup', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'final']);
  });

  it('only ever adds nodes: the workflow evolves, it is not rebuilt', () => {
    let prev: string[] = [];
    for (const s of STEPS) {
      for (const n of prev) expect(s.nodes, `${s.id} dropped ${n}`).toContain(n);
      prev = s.nodes;
    }
    expect(new Set(prev)).toEqual(new Set(NODES.map((n) => n.id)));
  });

  it('every flow edge references visible nodes', () => {
    for (const s of STEPS)
      for (const hop of s.flow ?? []) {
        expect(s.nodes).toContain(hop.from);
        expect(s.nodes).toContain(hop.to);
      }
  });

  it('never invokes Gmail before explicit approval', () => {
    for (const s of STEPS) {
      const callsGmail = (s.flow ?? []).some((h) => h.to === 'gmail');
      if (callsGmail) expect(s.email?.status, s.id).toMatch(/APPROVED|SENT/);
      if (s.email && ['DRAFT', 'REVISED'].includes(s.email.status)) expect(callsGmail).toBe(false);
    }
    const order = STEPS.filter((s) => s.email).map((s) => s.email!.status);
    expect([...new Set(order)]).toEqual(['DRAFT', 'REVISED', 'APPROVED', 'SENT']);
  });

  it('uses only fictional example.com data, consistent with the sheet', () => {
    for (const m of BOARD_MEMBERS) expect(m.email).toMatch(/@example\.com$/);
    const sent = STEPS.find((s) => s.email?.status === 'SENT')!.email!;
    expect(sent.to).toEqual(BOARD_MEMBERS.map((m) => m.email));
    expect(sent.venue).toBe('AI201');
    expect(sent.duration).toBe('30 min');
    const blob = JSON.stringify(STEPS);
    expect(blob).not.toMatch(/AIza|sk-|api[_-]?key\s*[:=]/i);
    expect(blob.match(/[\w.-]+@[\w.-]+/g)!.every((e) => e.endsWith('example.com'))).toBe(true);
  });

  it('memory recall only happens after memory is attached and the name was given', () => {
    const recall = STEPS.find((s) => s.chat.some((m) => m.text.includes('your name is Alex')))!;
    expect(recall.nodes).toContain('memory');
    expect(recall.chapter).toBe('phase-2');
  });
});

describe('builder guide', () => {
  it('every build step has an ordered click path', () => {
    for (const s of STEPS.filter((s) => s.mode === 'build')) expect(s.actions?.length, s.id).toBeGreaterThan(0);
  });
  it('each phase is built before it is tested', () => {
    for (const ch of ['phase-1', 'phase-2', 'phase-3', 'phase-4']) {
      const modes = STEPS.filter((s) => s.chapter === ch).map((s) => s.mode);
      expect(modes[0], ch).toBe('build');
      expect(modes).toContain('test');
    }
  });
  it('uses the exact tool names and values from docs/project.md', () => {
    const blob = JSON.stringify(STEPS);
    for (const v of ['get_board_members', 'send_board_email', '{{ $json.chatInput }}', 'gemini 3.1 flash lite', '0.2', 'Members List', 'Executive Agent', 'Simple Memory'])
      expect(blob, v).toContain(v);
  });
});
