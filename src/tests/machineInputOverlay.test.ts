import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Direction } from '../data/MachineConfig';
import {
  OVERLAY_BASE_X,
  OVERLAY_BASE_Y,
  OVERLAY_WIDTH,
  OVERLAY_HEIGHT,
  OVERLAY_PADDING,
  STEP_SPACING,
  ARROW_MAP,
  COLOR_PENDING,
  COLOR_COMPLETED,
  COLOR_FAILED,
  COLOR_CANCELLED,
  COLOR_LABEL,
  LABEL_FONT_SIZE,
  STEP_FONT_SIZE,
  RESULT_FONT_SIZE,
  RESULT_DELAY,
} from '../ui/MachineInputOverlay';
import { MachineInputOverlay } from '../ui/MachineInputOverlay';
import { LayoutSystem } from '../systems/LayoutSystem';

// --- Phaser mock helpers ---

interface MockText {
  x: number;
  y: number;
  text: string;
  style: { color: string; fontSize: string };
  depth: number;
  visible: boolean;
  setOrigin: ReturnType<typeof vi.fn>;
  setDepth: ReturnType<typeof vi.fn>;
  setColor: ReturnType<typeof vi.fn>;
  setVisible: ReturnType<typeof vi.fn>;
  setPosition: ReturnType<typeof vi.fn>;
  setFontSize: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

interface MockRect {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  setOrigin: ReturnType<typeof vi.fn>;
  setDepth: ReturnType<typeof vi.fn>;
  setStrokeStyle: ReturnType<typeof vi.fn>;
  setPosition: ReturnType<typeof vi.fn>;
  setSize: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

function createMockText(x: number, y: number, text: string, style: Record<string, string>): MockText {
  const obj: MockText = {
    x, y, text,
    style: { color: style.color || '#ffffff', fontSize: style.fontSize || '12px' },
    depth: 0,
    visible: true,
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn((d: number) => { obj.depth = d; return obj; }),
    setColor: vi.fn((c: string) => { obj.style.color = c; return obj; }),
    setVisible: vi.fn((v: boolean) => { obj.visible = v; return obj; }),
    setPosition: vi.fn((nx: number, ny: number) => { obj.x = nx; obj.y = ny; return obj; }),
    setFontSize: vi.fn((s: number) => { obj.style.fontSize = `${s}px`; return obj; }),
    destroy: vi.fn(),
  };
  return obj;
}

function createMockRect(x: number, y: number, w: number, h: number): MockRect {
  const obj: MockRect = {
    x, y, width: w, height: h,
    depth: 0,
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn((d: number) => { obj.depth = d; return obj; }),
    setStrokeStyle: vi.fn().mockReturnThis(),
    setPosition: vi.fn((nx: number, ny: number) => { obj.x = nx; obj.y = ny; return obj; }),
    setSize: vi.fn((nw: number, nh: number) => { obj.width = nw; obj.height = nh; return obj; }),
    destroy: vi.fn(),
  };
  return obj;
}

function createMockScene() {
  const texts: MockText[] = [];
  const rects: MockRect[] = [];
  let timerCallback: (() => void) | null = null;

  const scene = {
    add: {
      text: vi.fn((x: number, y: number, text: string, style: Record<string, string>) => {
        const t = createMockText(x, y, text, style);
        texts.push(t);
        return t;
      }),
      rectangle: vi.fn((x: number, y: number, w: number, h: number, _color: number, _alpha: number) => {
        const r = createMockRect(x, y, w, h);
        rects.push(r);
        return r;
      }),
    },
    time: {
      delayedCall: vi.fn((_delay: number, cb: () => void) => {
        timerCallback = cb;
        return { destroy: vi.fn() };
      }),
    },
    _getTexts: () => texts,
    _getRects: () => rects,
    _fireTimer: () => { if (timerCallback) timerCallback(); },
    _clearMocks: () => { texts.length = 0; rects.length = 0; timerCallback = null; },
  };
  return scene;
}

// --- Tests ---

describe('MachineInputOverlay — layout tests', () => {
  let scene: ReturnType<typeof createMockScene>;
  let ls: LayoutSystem;
  let overlay: MachineInputOverlay;

  beforeEach(() => {
    scene = createMockScene();
    ls = new LayoutSystem();
    ls.update(800, 600); // 1:1 scale at base resolution
    overlay = new MachineInputOverlay(scene as unknown as Phaser.Scene, ls);
  });

  function makeSequence(length: number): Direction[] {
    const dirs: Direction[] = ['up', 'down', 'left', 'right'];
    return Array.from({ length }, (_, i) => dirs[i % 4]);
  }

  it('3-step sequence: all arrows fit inside the background box', () => {
    const seq = makeSequence(3);
    overlay.show(seq, 'machine1');

    const rects = scene._getRects();
    const texts = scene._getTexts();
    expect(rects.length).toBe(1);

    const bg = rects[0];
    const bgLeft = bg.x - bg.width / 2;
    const bgRight = bg.x + bg.width / 2;

    // Step texts are the last N texts (after the label)
    const stepTexts = texts.slice(1); // first text is the label
    expect(stepTexts.length).toBe(3);

    for (const step of stepTexts) {
      expect(step.x).toBeGreaterThanOrEqual(bgLeft);
      expect(step.x).toBeLessThanOrEqual(bgRight);
    }
  });

  it('10-step sequence: all arrows fit inside the background box', () => {
    const seq = makeSequence(10);
    overlay.show(seq, 'machine1');

    const rects = scene._getRects();
    const texts = scene._getTexts();
    const bg = rects[0];
    const bgLeft = bg.x - bg.width / 2;
    const bgRight = bg.x + bg.width / 2;

    const stepTexts = texts.slice(1);
    expect(stepTexts.length).toBe(10);

    for (const step of stepTexts) {
      expect(step.x).toBeGreaterThanOrEqual(bgLeft);
      expect(step.x).toBeLessThanOrEqual(bgRight);
    }
  });

  it('10-step sequence: background box grows wider than OVERLAY_WIDTH', () => {
    const seq = makeSequence(10);
    overlay.show(seq, 'machine1');

    const bg = scene._getRects()[0];
    const expectedMinWidth = 10 * STEP_SPACING + OVERLAY_PADDING * 2;
    // At 1:1 scale, scaleValue is identity
    expect(bg.width).toBeGreaterThanOrEqual(expectedMinWidth);
    expect(bg.width).toBeGreaterThan(OVERLAY_WIDTH);
  });

  it('10-step sequence: all arrows stay within the 800px base screen width', () => {
    const seq = makeSequence(10);
    overlay.show(seq, 'machine1');

    const texts = scene._getTexts();
    const stepTexts = texts.slice(1);

    for (const step of stepTexts) {
      expect(step.x).toBeGreaterThanOrEqual(0);
      expect(step.x).toBeLessThanOrEqual(800);
    }
  });

  it('short sequence (1 step): background box uses minimum OVERLAY_WIDTH', () => {
    overlay.show(['up'], 'machine1');

    const bg = scene._getRects()[0];
    expect(bg.width).toBeCloseTo(OVERLAY_WIDTH, 0);
  });

  it('10-step sequence: arrows are evenly spaced and horizontally centered', () => {
    const seq = makeSequence(10);
    overlay.show(seq, 'machine2');

    const texts = scene._getTexts();
    const stepTexts = texts.slice(1);

    // Check even spacing
    for (let i = 1; i < stepTexts.length; i++) {
      const gap = stepTexts[i].x - stepTexts[i - 1].x;
      expect(gap).toBeCloseTo(STEP_SPACING, 0);
    }

    // Check centered around OVERLAY_BASE_X (400)
    const firstX = stepTexts[0].x;
    const lastX = stepTexts[stepTexts.length - 1].x;
    const center = (firstX + lastX) / 2;
    expect(center).toBeCloseTo(OVERLAY_BASE_X, 0);
  });

  it('10-step sequence: resize preserves layout correctness', () => {
    const seq = makeSequence(10);
    overlay.show(seq, 'machine1');

    // Resize to a different viewport
    const ls2 = new LayoutSystem();
    ls2.update(1200, 900);
    overlay.resize(ls2);

    const rects = scene._getRects();
    const texts = scene._getTexts();
    const bg = rects[0];
    const bgLeft = bg.x - bg.width / 2;
    const bgRight = bg.x + bg.width / 2;

    const stepTexts = texts.slice(1);
    for (const step of stepTexts) {
      expect(step.x).toBeGreaterThanOrEqual(bgLeft);
      expect(step.x).toBeLessThanOrEqual(bgRight);
    }
  });

  it('label text shows correct machine name', () => {
    overlay.show(makeSequence(5), 'machine3');
    const label = scene._getTexts()[0];
    expect(label.text).toBe('Machine 3');
  });

  it('step indicators use correct arrow symbols', () => {
    const seq: Direction[] = ['up', 'down', 'left', 'right'];
    overlay.show(seq, 'machine1');

    const stepTexts = scene._getTexts().slice(1);
    expect(stepTexts[0].text).toBe('↑');
    expect(stepTexts[1].text).toBe('↓');
    expect(stepTexts[2].text).toBe('←');
    expect(stepTexts[3].text).toBe('→');
  });

  it('all step indicators start in pending color', () => {
    overlay.show(makeSequence(10), 'machine1');
    const stepTexts = scene._getTexts().slice(1);
    for (const step of stepTexts) {
      expect(step.style.color).toBe(COLOR_PENDING);
    }
  });

  it('highlightStep colors steps 0..i green, leaves rest pending', () => {
    overlay.show(makeSequence(5), 'machine1');
    overlay.highlightStep(2);

    const stepTexts = scene._getTexts().slice(1);
    expect(stepTexts[0].style.color).toBe(COLOR_COMPLETED);
    expect(stepTexts[1].style.color).toBe(COLOR_COMPLETED);
    expect(stepTexts[2].style.color).toBe(COLOR_COMPLETED);
    expect(stepTexts[3].style.color).toBe(COLOR_PENDING);
    expect(stepTexts[4].style.color).toBe(COLOR_PENDING);
  });

  it('showResult success turns all steps green', () => {
    overlay.show(makeSequence(4), 'machine1');
    overlay.highlightStep(1);
    overlay.showResult('success');

    const stepTexts = scene._getTexts().slice(1);
    for (const step of stepTexts) {
      expect(step.style.color).toBe(COLOR_COMPLETED);
    }
  });

  it('showResult failed marks first unhighlighted step red', () => {
    overlay.show(makeSequence(5), 'machine1');
    overlay.highlightStep(1); // steps 0,1 green
    overlay.showResult('failed');

    const stepTexts = scene._getTexts().slice(1);
    expect(stepTexts[2].style.color).toBe(COLOR_FAILED);
  });

  it('overlay is at top edge of screen (Y = 28 base)', () => {
    overlay.show(makeSequence(3), 'machine1');
    const bg = scene._getRects()[0];
    // At 1:1 scale, scaleY(28) = 28
    expect(bg.y).toBeCloseTo(OVERLAY_BASE_Y, 0);
    expect(bg.y).toBeLessThan(50); // well within the top edge
  });
});

import {
  COLOR_PREVIEW,
  COLOR_DELIMITER,
  DELIMITER_CHAR,
  PREVIEW_MAX_STEPS,
} from '../ui/MachineInputOverlay';

describe('MachineInputOverlay — transition preview', () => {
  let scene: ReturnType<typeof createMockScene>;
  let ls: LayoutSystem;
  let overlay: MachineInputOverlay;

  beforeEach(() => {
    scene = createMockScene();
    ls = new LayoutSystem();
    ls.update(800, 600);
    overlay = new MachineInputOverlay(scene as unknown as Phaser.Scene, ls);
  });

  function makeSequence(length: number): Direction[] {
    const dirs: Direction[] = ['up', 'down', 'left', 'right'];
    return Array.from({ length }, (_, i) => dirs[i % 4]);
  }

  it('transitionToNext turns all current steps green', () => {
    overlay.show(makeSequence(3), 'machine1');
    overlay.transitionToNext(makeSequence(4), 'machine1');

    const texts = scene._getTexts();
    // texts[0] = label, texts[1..3] = step indicators
    expect(texts[1].style.color).toBe(COLOR_COMPLETED);
    expect(texts[2].style.color).toBe(COLOR_COMPLETED);
    expect(texts[3].style.color).toBe(COLOR_COMPLETED);
  });

  it('transitionToNext shows a delimiter character after the current steps', () => {
    overlay.show(makeSequence(3), 'machine1');
    overlay.transitionToNext(makeSequence(4), 'machine1');

    const texts = scene._getTexts();
    // After label (0) and 3 step texts (1,2,3), the delimiter is at index 4
    const delimiter = texts[4];
    expect(delimiter.text).toBe(DELIMITER_CHAR);
    expect(delimiter.style.color).toBe(COLOR_DELIMITER);
  });

  it('transitionToNext shows up to PREVIEW_MAX_STEPS preview arrows', () => {
    overlay.show(makeSequence(3), 'machine1');
    const nextSeq: Direction[] = ['left', 'right', 'up', 'down', 'left'];
    overlay.transitionToNext(nextSeq, 'machine1');

    const texts = scene._getTexts();
    // label(0) + 3 steps(1,2,3) + delimiter(4) + preview arrows(5,6,7)
    const previewTexts = texts.slice(5);
    expect(previewTexts.length).toBe(PREVIEW_MAX_STEPS);

    // Check they use the correct arrow symbols
    expect(previewTexts[0].text).toBe(ARROW_MAP[nextSeq[0]]);
    expect(previewTexts[1].text).toBe(ARROW_MAP[nextSeq[1]]);
    expect(previewTexts[2].text).toBe(ARROW_MAP[nextSeq[2]]);
  });

  it('preview arrows use the dimmed preview color', () => {
    overlay.show(makeSequence(3), 'machine1');
    overlay.transitionToNext(makeSequence(5), 'machine1');

    const texts = scene._getTexts();
    const previewTexts = texts.slice(5); // after label + steps + delimiter
    for (const p of previewTexts) {
      expect(p.style.color).toBe(COLOR_PREVIEW);
    }
  });

  it('short next sequence shows fewer than PREVIEW_MAX_STEPS preview arrows', () => {
    overlay.show(makeSequence(3), 'machine1');
    overlay.transitionToNext(['up', 'down'], 'machine1');

    const texts = scene._getTexts();
    // label(0) + 3 steps(1,2,3) + delimiter(4) + 2 preview arrows(5,6)
    const previewTexts = texts.slice(5);
    expect(previewTexts.length).toBe(2);
  });

  it('preview arrows are positioned to the right of the delimiter', () => {
    overlay.show(makeSequence(3), 'machine1');
    overlay.transitionToNext(makeSequence(4), 'machine1');

    const texts = scene._getTexts();
    const delimiter = texts[4];
    const previewTexts = texts.slice(5);

    for (const p of previewTexts) {
      expect(p.x).toBeGreaterThan(delimiter.x);
    }
  });

  it('background box grows to fit the preview when content exceeds minimum width', () => {
    // Use a 7-step sequence so the initial box is already near the minimum
    // 7 * 32 + 24*2 = 272 → clamped to 280
    overlay.show(makeSequence(7), 'machine1');
    const bgBefore = scene._getRects()[0].width;

    // Adding delimiter + 3 preview arrows pushes total content past 280
    overlay.transitionToNext(makeSequence(5), 'machine1');
    const bgAfter = scene._getRects()[0].width;

    // 7*32 = 224 (steps) + 0.8*32 = 25.6 (delim) + 3*32 = 96 (preview) + 0.4*32 = 12.8 (trail) = 358.4
    // 358.4 + 48 padding = 406.4 → definitely > 280
    expect(bgAfter).toBeGreaterThan(bgBefore);
  });

  it('firing the timer after transitionToNext swaps to the new sequence', () => {
    overlay.show(makeSequence(3), 'machine1');
    overlay.transitionToNext(['left', 'right', 'up', 'down'], 'machine1');

    // Fire the delayed timer
    scene._fireTimer();

    // After the timer fires, show() is called with the new sequence.
    // The old texts are destroyed and new ones created.
    // We can verify the overlay is still visible
    expect(overlay.isVisible()).toBe(true);
  });

  it('preview is cleaned up when hide() is called', () => {
    overlay.show(makeSequence(3), 'machine1');
    overlay.transitionToNext(makeSequence(4), 'machine1');

    // Count texts before hide
    const textsBefore = scene._getTexts().length;
    expect(textsBefore).toBeGreaterThan(4); // label + steps + delimiter + previews

    overlay.hide();
    expect(overlay.isVisible()).toBe(false);
  });
});
