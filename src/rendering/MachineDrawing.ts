import { PALETTE } from './Palette';
import { LAYOUT } from '../systems/InputSystem';
import { LayoutSystem } from '../systems/LayoutSystem';
import type { MachineState } from '../data/MachineConfig';
import type { MachineSystem } from '../systems/MachineSystem';

export interface MachineDrawParams {
  graphics: Phaser.GameObjects.Graphics;
  layoutSystem: LayoutSystem;
  machines: MachineState[];
  machineSystem: MachineSystem;  // for isActive() and isPlayerInteracting()
}

// --- Machine body dimensions in base-resolution pixels ---

/** Machine 1 (top) and Machine 3 (bottom): wide horizontal body. */
const HORIZ_BODY_W = 100;
const HORIZ_BODY_H = 60;

/** Machine 2 (right): tall vertical body. */
const VERT_BODY_W = 60;
const VERT_BODY_H = 100;

/** Control panel dimensions. */
const PANEL_W = 30;
const PANEL_H = 16;

/** Activity indicator radius. */
const INDICATOR_RADIUS = 5;

/** Chimney dimensions for Machine 1. */
const CHIMNEY_W = 10;
const CHIMNEY_H = 16;
const CHIMNEY_GAP = 20;

/** Gauge circle radius for Machine 2. */
const GAUGE_RADIUS = 8;

/** Vent line dimensions for Machine 3. */
const VENT_LINE_COUNT = 3;
const VENT_LINE_THICKNESS = 2;

/** Interaction highlight border thickness. */
const HIGHLIGHT_THICKNESS = 1;

/** Per-machine body color lookup by machine index. */
const BODY_COLORS = [
  PALETTE.MACHINE1_BODY,
  PALETTE.MACHINE2_BODY,
  PALETTE.MACHINE3_BODY,
];

/**
 * Draws all three machines with distinct bodies, control panels, activity
 * indicators, and interaction highlights.
 *
 * Each machine body is larger than the old 60×40 station — it covers the belt
 * section beneath the machine's zone and extends outward from the belt.
 */
export function drawMachines(params: MachineDrawParams): void {
  const { graphics: g, layoutSystem: ls, machines, machineSystem } = params;

  for (let i = 0; i < machines.length; i++) {
    const machine = machines[i];
    const id = machine.definition.id;
    const pos = machine.definition.playerPosition;
    const bodyColor = BODY_COLORS[i] ?? PALETTE.MACHINE1_BODY;
    const active = machineSystem.isActive(id);
    const interacting = machineSystem.isPlayerInteracting(id);

    // Compute body rect in base-resolution coords
    let bx: number, by: number, bw: number, bh: number;

    switch (pos) {
      case 'up': {
        // Machine 1 — top: centered on CENTER_X, above the top belt edge
        bw = HORIZ_BODY_W;
        bh = HORIZ_BODY_H;
        bx = LAYOUT.CENTER_X - bw / 2;
        by = LAYOUT.BELT_Y - bh;
        break;
      }
      case 'right': {
        // Machine 2 — right: centered on CENTER_Y, to the right of the right belt edge
        bw = VERT_BODY_W;
        bh = VERT_BODY_H;
        bx = LAYOUT.BELT_X + LAYOUT.BELT_W;
        by = LAYOUT.CENTER_Y - bh / 2;
        break;
      }
      case 'down': {
        // Machine 3 — bottom: centered on CENTER_X, below the bottom belt edge
        bw = HORIZ_BODY_W;
        bh = HORIZ_BODY_H;
        bx = LAYOUT.CENTER_X - bw / 2;
        by = LAYOUT.BELT_Y + LAYOUT.BELT_H;
        break;
      }
      default:
        continue; // skip unknown positions (e.g. 'left', 'center')
    }

    // --- Machine body ---
    g.fillStyle(bodyColor, 1);
    g.fillRect(
      ls.scaleX(bx),
      ls.scaleY(by),
      ls.scaleValue(bw),
      ls.scaleValue(bh),
    );

    // --- Distinctive features per machine ---
    drawDistinctiveFeature(g, ls, pos, bx, by, bw, bh, bodyColor);

    // --- Control panel (on the face facing center) ---
    const { px, py } = getPanelPosition(pos, bx, by, bw, bh);
    const panelColor = interacting ? PALETTE.MACHINE_PANEL_LIT : PALETTE.MACHINE_PANEL;

    g.fillStyle(panelColor, 1);
    g.fillRect(
      ls.scaleX(px),
      ls.scaleY(py),
      ls.scaleValue(PANEL_W),
      ls.scaleValue(PANEL_H),
    );

    // Interaction highlight: 1px bright border around the control panel
    if (interacting) {
      const scaledThickness = Math.max(ls.scaleValue(HIGHLIGHT_THICKNESS), 1);
      g.lineStyle(scaledThickness, PALETTE.TEXT_ACCENT, 1);
      g.strokeRect(
        ls.scaleX(px),
        ls.scaleY(py),
        ls.scaleValue(PANEL_W),
        ls.scaleValue(PANEL_H),
      );
    }

    // --- Activity indicator (top-right corner of body) ---
    const indicatorColor = active ? PALETTE.MACHINE_INDICATOR_ON : PALETTE.MACHINE_INDICATOR_OFF;
    const indX = bx + bw - INDICATOR_RADIUS - 2;
    const indY = by + INDICATOR_RADIUS + 2;

    g.fillStyle(indicatorColor, 1);
    g.fillCircle(
      ls.scaleX(indX),
      ls.scaleY(indY),
      ls.scaleValue(INDICATOR_RADIUS),
    );
  }
}

/**
 * Returns the base-resolution position of the control panel rectangle.
 * The panel is drawn on the face of the machine that faces the center walkable area.
 */
function getPanelPosition(
  pos: string,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): { px: number; py: number } {
  switch (pos) {
    case 'up':
      // Panel on the bottom face (facing center), centered horizontally
      return {
        px: bx + (bw - PANEL_W) / 2,
        py: by + bh - PANEL_H - 4,
      };
    case 'right':
      // Panel on the left face (facing center), centered vertically
      // For vertical body, panel is rotated: use PANEL_H as width, PANEL_W as height
      return {
        px: bx + 4,
        py: by + (bh - PANEL_W) / 2,
      };
    case 'down':
      // Panel on the top face (facing center), centered horizontally
      return {
        px: bx + (bw - PANEL_W) / 2,
        py: by + 4,
      };
    default:
      return { px: bx, py: by };
  }
}

/**
 * Draws the distinctive decorative feature for each machine type.
 */
function drawDistinctiveFeature(
  g: Phaser.GameObjects.Graphics,
  ls: LayoutSystem,
  pos: string,
  bx: number,
  by: number,
  bw: number,
  _bh: number,
  bodyColor: number,
): void {
  // Use a slightly darker shade of the body color for decorative elements
  const darkShade = darkenColor(bodyColor, 0.25);

  switch (pos) {
    case 'up': {
      // Machine 1: Two small chimney rectangles on top
      const chimneyY = by - CHIMNEY_H;
      const centerX = bx + bw / 2;

      g.fillStyle(darkShade, 1);
      // Left chimney
      g.fillRect(
        ls.scaleX(centerX - CHIMNEY_GAP / 2 - CHIMNEY_W),
        ls.scaleY(chimneyY),
        ls.scaleValue(CHIMNEY_W),
        ls.scaleValue(CHIMNEY_H),
      );
      // Right chimney
      g.fillRect(
        ls.scaleX(centerX + CHIMNEY_GAP / 2),
        ls.scaleY(chimneyY),
        ls.scaleValue(CHIMNEY_W),
        ls.scaleValue(CHIMNEY_H),
      );
      break;
    }
    case 'right': {
      // Machine 2: A small gauge circle on the right side
      const gaugeX = bx + bw - GAUGE_RADIUS - 6;
      const gaugeY = by + _bh / 2;

      // Gauge outline
      g.fillStyle(darkShade, 1);
      g.fillCircle(
        ls.scaleX(gaugeX),
        ls.scaleY(gaugeY),
        ls.scaleValue(GAUGE_RADIUS),
      );
      // Gauge inner (lighter)
      g.fillStyle(bodyColor, 1);
      g.fillCircle(
        ls.scaleX(gaugeX),
        ls.scaleY(gaugeY),
        ls.scaleValue(GAUGE_RADIUS - 3),
      );
      break;
    }
    case 'down': {
      // Machine 3: Horizontal vent lines on the bottom face
      const ventStartY = by + _bh - 8 - (VENT_LINE_COUNT * (VENT_LINE_THICKNESS + 4));
      const ventX = bx + 16;
      const ventW = bw - 32;
      const scaledThickness = Math.max(ls.scaleValue(VENT_LINE_THICKNESS), 1);

      g.lineStyle(scaledThickness, darkShade, 1);
      for (let v = 0; v < VENT_LINE_COUNT; v++) {
        const ly = ventStartY + v * (VENT_LINE_THICKNESS + 4);
        g.lineBetween(
          ls.scaleX(ventX),
          ls.scaleY(ly),
          ls.scaleX(ventX + ventW),
          ls.scaleY(ly),
        );
      }
      break;
    }
  }
}

/**
 * Darkens a hex color by the given factor (0–1).
 * factor=0.25 means 25% darker.
 */
function darkenColor(color: number, factor: number): number {
  const r = Math.max(0, Math.floor(((color >> 16) & 0xff) * (1 - factor)));
  const gr = Math.max(0, Math.floor(((color >> 8) & 0xff) * (1 - factor)));
  const b = Math.max(0, Math.floor((color & 0xff) * (1 - factor)));
  return (r << 16) | (gr << 8) | b;
}
