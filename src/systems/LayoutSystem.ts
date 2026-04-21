import { LAYOUT } from './InputSystem';

const SCENE_W = LAYOUT.SCENE_W;
const SCENE_H = LAYOUT.SCENE_H;

export class LayoutSystem {
  private scaleFactor: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  /** Called on init and on every resize event with the new game size. */
  update(viewportWidth: number, viewportHeight: number): void {
    if (viewportWidth <= 0 || viewportHeight <= 0) {
      this.scaleFactor = 0.01;
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    this.scaleFactor = Math.min(viewportWidth / SCENE_W, viewportHeight / SCENE_H);
    this.offsetX = (viewportWidth - SCENE_W * this.scaleFactor) / 2;
    this.offsetY = (viewportHeight - SCENE_H * this.scaleFactor) / 2;
  }

  /** Returns the current uniform scale factor. */
  getScaleFactor(): number {
    return this.scaleFactor;
  }

  /** Returns the X offset for centering the scaled game area. */
  getOffsetX(): number {
    return this.offsetX;
  }

  /** Returns the Y offset for centering the scaled game area. */
  getOffsetY(): number {
    return this.offsetY;
  }

  /** Converts a base-resolution X coordinate to a screen coordinate. */
  scaleX(baseX: number): number {
    return baseX * this.scaleFactor + this.offsetX;
  }

  /** Converts a base-resolution Y coordinate to a screen coordinate. */
  scaleY(baseY: number): number {
    return baseY * this.scaleFactor + this.offsetY;
  }

  /** Scales a base-resolution length (width, height, etc.) to screen pixels. */
  scaleValue(baseValue: number): number {
    return baseValue * this.scaleFactor;
  }

  /** Scales a font size, enforcing a minimum of 12 CSS pixels. */
  scaleFontSize(baseFontSize: number): number {
    return Math.max(baseFontSize * this.scaleFactor, 12);
  }

  /** Scales a dimension, enforcing a minimum of minCSS CSS pixels. */
  scaleWithMin(baseValue: number, minCSS: number): number {
    return Math.max(baseValue * this.scaleFactor, minCSS);
  }
}
