import { PALETTE } from './Palette';
import { LAYOUT } from '../systems/InputSystem';
import { LayoutSystem } from '../systems/LayoutSystem';

export interface StartDrawParams {
  graphics: Phaser.GameObjects.Graphics;
  layoutSystem: LayoutSystem;
}

/** Belt band height in base-resolution pixels. */
const BELT_BAND_HEIGHT = 20;

/** Segment width along the belt in base-resolution pixels. */
const SEGMENT_WIDTH = 24;

/** Gap between segments in base-resolution pixels. */
const SEGMENT_GAP = 4;

/** Machine silhouette dimensions in base-resolution pixels. */
const MACHINE_W = 40;
const MACHINE_H = 30;

/**
 * Draws a static factory-themed background for the StartScene.
 *
 * Renders a decorative horizontal conveyor belt silhouette across the middle
 * of the screen with 2-3 small machine silhouettes along it, hinting at the
 * factory theme. Purely decorative — no animation.
 */
export function drawStartBackground(params: StartDrawParams): void {
  const { graphics: g, layoutSystem: ls } = params;

  g.clear();

  // --- Decorative conveyor belt band across the middle ---
  const beltY = LAYOUT.SCENE_H / 2 + 40; // slightly below center to leave room for title
  const beltLeft = 60;
  const beltRight = LAYOUT.SCENE_W - 60;
  const beltWidth = beltRight - beltLeft;

  // Base belt band
  g.fillStyle(PALETTE.BELT_BASE, 0.5);
  g.fillRect(
    ls.scaleX(beltLeft),
    ls.scaleY(beltY - BELT_BAND_HEIGHT / 2),
    ls.scaleValue(beltWidth),
    ls.scaleValue(BELT_BAND_HEIGHT),
  );

  // Segment markings along the belt
  const segmentStep = SEGMENT_WIDTH + SEGMENT_GAP;
  for (let x = beltLeft; x < beltRight; x += segmentStep) {
    const segW = Math.min(SEGMENT_WIDTH, beltRight - x);
    g.fillStyle(PALETTE.BELT_SEGMENT, 0.5);
    g.fillRect(
      ls.scaleX(x),
      ls.scaleY(beltY - BELT_BAND_HEIGHT / 2 + 3),
      ls.scaleValue(segW),
      ls.scaleValue(BELT_BAND_HEIGHT - 6),
    );
  }

  // Thin edge rails
  const railThickness = Math.max(ls.scaleValue(2), 1);
  g.lineStyle(railThickness, PALETTE.BELT_EDGE, 0.4);
  g.lineBetween(
    ls.scaleX(beltLeft),
    ls.scaleY(beltY - BELT_BAND_HEIGHT / 2),
    ls.scaleX(beltRight),
    ls.scaleY(beltY - BELT_BAND_HEIGHT / 2),
  );
  g.lineBetween(
    ls.scaleX(beltLeft),
    ls.scaleY(beltY + BELT_BAND_HEIGHT / 2),
    ls.scaleX(beltRight),
    ls.scaleY(beltY + BELT_BAND_HEIGHT / 2),
  );

  // --- Machine silhouettes along the belt ---
  // Machine 1 (blue) — left portion of belt, sits above
  drawMachineSilhouette(
    g, ls,
    180, beltY - BELT_BAND_HEIGHT / 2 - MACHINE_H - 2,
    MACHINE_W, MACHINE_H,
    PALETTE.MACHINE1_BODY,
  );

  // Machine 2 (green) — center of belt, sits above
  drawMachineSilhouette(
    g, ls,
    380, beltY - BELT_BAND_HEIGHT / 2 - MACHINE_H - 2,
    MACHINE_W + 8, MACHINE_H,
    PALETTE.MACHINE2_BODY,
  );

  // Machine 3 (red) — right portion of belt, sits below
  drawMachineSilhouette(
    g, ls,
    560, beltY + BELT_BAND_HEIGHT / 2 + 2,
    MACHINE_W, MACHINE_H,
    PALETTE.MACHINE3_BODY,
  );
}

/**
 * Draws a simple machine silhouette — a filled rectangle with a small
 * panel detail, using low opacity to keep it subtle.
 */
function drawMachineSilhouette(
  g: Phaser.GameObjects.Graphics,
  ls: LayoutSystem,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  // Machine body
  g.fillStyle(color, 0.35);
  g.fillRect(
    ls.scaleX(x),
    ls.scaleY(y),
    ls.scaleValue(w),
    ls.scaleValue(h),
  );

  // Small panel detail on the machine face
  const panelW = w * 0.5;
  const panelH = h * 0.3;
  const panelX = x + (w - panelW) / 2;
  const panelY = y + (h - panelH) / 2;
  g.fillStyle(PALETTE.MACHINE_PANEL, 0.3);
  g.fillRect(
    ls.scaleX(panelX),
    ls.scaleY(panelY),
    ls.scaleValue(panelW),
    ls.scaleValue(panelH),
  );
}
