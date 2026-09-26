import {
  AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, SimpleChanges, ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Avatar } from '../avatar/avatar-model';
import { buildAvatar, disposeAvatar } from './build-avatar';
import { WAVE_SECONDS, putOnSomethingNew } from './motion';
import { Rig } from './rig';

/** The usual camera distance, for a character of ordinary height. */
export const BASE_DISTANCE = 32;
/** Where the usual camera looks, part-way up an ordinary character. */
export const BASE_CENTRE = 7.4;

/** What the camera is looking at: the whole figure, or a close-up of the head. */
export type StageFocus = 'body' | 'head';

/** Nothing closer than this on a close-up, so a bare head is not pressed against the glass. */
export const HEAD_DISTANCE_MIN = 8;

/**
 * How far back to stand to see from `bottom` to `top` of the head and what is
 * on it, with room round it. Unlike the whole figure it has no usual distance
 * to keep to: each head is framed on its own.
 */
export function headFraming(bottom: number, top: number, fov: number, aspect: number): { distance: number; centre: number } {
  const half = ((top - bottom) / 2) * 1.35;
  const tan = Math.tan((fov * Math.PI) / 360);
  return { distance: Math.max(HEAD_DISTANCE_MIN, half / (tan * Math.min(1, aspect || 1))), centre: (top + bottom) / 2 };
}

/**
 * How far back to stand, and where to look, to see everything from `bottom`
 * to `top` with a little room round it in a camera of this vertical field of
 * view (degrees) and aspect. Never closer than usual; a tall afro or a
 * wizard's hat backs the camera off and lifts where it looks.
 */
export function framing(bottom: number, top: number, fov: number, aspect: number): { distance: number; centre: number } {
  const half = ((top - bottom) / 2) * 1.12;
  const tan = Math.tan((fov * Math.PI) / 360);
  const fit = half / (tan * Math.min(1, aspect || 1));
  if (fit <= BASE_DISTANCE) {
    return { distance: BASE_DISTANCE, centre: BASE_CENTRE };
  }
  return { distance: fit, centre: (top + bottom) / 2 };
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Slow at both ends, for a turn that starts and settles gently. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * The character in 3D, on the dressing-up screen: drag to turn it round and
 * see it from every side. Only here — it is loaded with this lazy screen, so
 * three.js never touches the game's first load.
 *
 * It draws only when something changes (a drag, the turn easing out, a new
 * choice), not sixty times a second, so a tablet left on this screen is not
 * spending its battery on a still picture. Where WebGL is not available the
 * 2D character is shown instead.
 */
@Component({
  selector: 'app-avatar-stage',
  template: `
    <canvas #canvas class="stage-canvas" *ngIf="webgl"
            [attr.aria-label]="label" role="img"></canvas>
    <div class="turn" *ngIf="webgl">
      <button type="button" class="turn-button" (click)="turnBy(-TURN_STEP)" [attr.aria-label]="turnLeftLabel">&#x21BA;</button>
      <button type="button" class="turn-button" (click)="turnBy(TURN_STEP)" [attr.aria-label]="turnRightLabel">&#x21BB;</button>
    </div>
    <app-avatar *ngIf="!webgl" [avatar]="avatar" [size]="180" framing="full"></app-avatar>`,
  styles: [`
    :host { display: block; width: 100%; }
    :host > app-avatar { display: block; width: max-content; margin: 0 auto; }
    .stage-canvas {
      display: block; width: 100%; height: 360px; touch-action: none; cursor: grab;
      background: radial-gradient(ellipse 55% 60% at 50% 45%, rgba(56, 128, 255, 0.28), rgba(214, 51, 235, 0.1) 60%, transparent 80%);
    }
    .stage-canvas:active { cursor: grabbing; }
    /* A phone on its side: a shorter stage, so the choices are still in reach */
    :host-context(html[data-fit='short']) .stage-canvas { height: 230px; }
    :host-context(html[data-fit='short']) .turn-button { width: 40px; height: 40px; font-size: 20px; }
    .turn { display: flex; justify-content: center; gap: 24px; margin-top: -8px; }
    .turn-button {
      width: 48px; height: 48px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.08); color: #fff; font-size: 24px; line-height: 1; cursor: pointer;
    }
    .turn-button:hover { background: rgba(255, 255, 255, 0.16); }
    .turn-button:focus-visible { outline: 3px solid #3880ff; outline-offset: 2px; }
  `]
})
export class AvatarStageComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() avatar!: Avatar;
  @Input() label = '';
  @Input() turnLeftLabel = '';
  @Input() turnRightLabel = '';
  /**
   * The head while a child is choosing a face or hair, the whole figure while
   * they are dressing it: at seven heads tall, a face seen head to toe on a
   * phone is too small to see an eye shape change.
   */
  @Input() focus: StageFocus = 'body';
  /** A move of the camera between focuses, eased. */
  private glide?: { fromTarget: THREE.Vector3; toTarget: THREE.Vector3; fromDistance: number; toDistance: number; start: number; ms: number };
  /** One press of a turn button: an eighth of the way round. */
  readonly TURN_STEP = Math.PI / 4;
  /** A turn under way, eased from one angle to another. */
  private spin?: { from: number; to: number; start: number; ms: number };
  private introduced = false;
  private destroyed = false;
  private angle = 0;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  /**
   * Whether the character breathes, blinks and waves. Off in the unit tests
   * of every other screen (src/test.ts), where a stage that never stops
   * drawing would keep Karma's browser busy; the stage's own tests turn it on.
   */
  static alive = true;
  /** The joints of the character on stage, posed every frame while it is alive. */
  rig?: Rig;
  /** When the character arrived, for its breathing and blinking. */
  private born = performance.now();
  /** When a wave started, or null when not waving. */
  private waveStart: number | null = null;
  /** What the character had on at the last rebuild, to see what is new. */
  private worn?: { hat?: string; glasses?: string; top?: string };
  /** When the last idle frame was drawn: breathing needs no more than 30 a second. */
  private drawnAt = 0;

  webgl = AvatarStageComponent.canUseWebGL();
  /** Exposed so tests can see what is on stage. */
  model?: THREE.Group;

  private renderer?: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private controls?: OrbitControls;
  private frame = 0;
  private resize = () => this.fit();

  constructor(private zone: NgZone) {}

  static canUseWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch {
      return false;
    }
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      // Linear output: the palette's hex colours come out as the hex says
      this.light();
      this.camera.position.set(0, BASE_CENTRE + 3, BASE_DISTANCE);
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.target.set(0, BASE_CENTRE, 0);
      this.controls.enablePan = false;
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.12;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 48;
      // Round the character freely, but never under its feet or over its head
      this.controls.minPolarAngle = Math.PI * 0.3;
      this.controls.maxPolarAngle = Math.PI * 0.62;
      this.controls.addEventListener('change', () => this.requestRender());
      this.controls.update();
      window.addEventListener('resize', this.resize);
      this.rebuild();
      this.fit();
    });
  }

  ngOnChanges(changes: SimpleChanges = {}) {
    if (!this.renderer) {
      return;
    }
    const onlyFocus = Object.keys(changes).length > 0 && Object.keys(changes).every(key => key === 'focus');
    this.zone.runOutsideAngular(() => onlyFocus ? this.moveToFocus() : this.rebuild());
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.spin = undefined;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    window.removeEventListener('resize', this.resize);
    this.controls?.dispose();
    if (this.model) {
      disposeAvatar(this.model);
    }
    // Hand the GL context back now rather than whenever the page is
    // collected: a browser keeps only a handful alive at once
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = undefined;
  }

  /** Turns the character to face `angle` radians round from the front, at once. */
  turnTo(angle: number) {
    this.spin = undefined;
    this.place(angle);
    this.renderNow();
  }

  /** Turns the character by `delta` radians, eased, or at once under reduced motion. */
  turnBy(delta: number) {
    if (!this.controls) {
      return;
    }
    const now = this.currentAngle();
    // Presses during a turn add to where it was going, not where it is
    const to = (this.spin ? this.spin.to : now) + delta;
    this.zone.runOutsideAngular(() => this.animateTurn(now, to, 450));
  }

  /** Where the camera is round the character, unwrapped from the last angle placed. */
  private currentAngle(): number {
    const offset = this.controls!.getAzimuthalAngle() - this.angle;
    return this.angle + Math.atan2(Math.sin(offset), Math.cos(offset));
  }

  private animateTurn(from: number, to: number, ms: number) {
    if (reducedMotion()) {
      this.turnTo(to);
      return;
    }
    this.spin = { from, to, start: performance.now(), ms };
    this.requestRender();
  }

  private place(angle: number) {
    this.angle = angle;
    const target = this.controls!.target;
    const offset = this.camera.position.clone().sub(target);
    const across = Math.hypot(offset.x, offset.z);
    this.camera.position.set(target.x + Math.sin(angle) * across, this.camera.position.y, target.z + Math.cos(angle) * across);
    this.controls!.update();
  }

  private light() {
    this.scene.add(new THREE.HemisphereLight('#f0ecff', '#3a2a5a', 0.6));
    // The key light rides with the camera, up and to the left of it, so the
    // side a child has turned towards is always the lit one. Toon bands
    // from more than one light cross into patches, so there is only one.
    const key = new THREE.DirectionalLight('#ffffff', 0.75);
    key.position.set(-3, 4, 0);
    key.target.position.set(0, 0, -10);
    this.camera.add(key, key.target);
    this.scene.add(this.camera);
  }

  private rebuild() {
    if (this.model) {
      this.scene.remove(this.model);
      disposeAvatar(this.model);
    }
    this.model = buildAvatar(this.avatar);
    this.scene.add(this.model);
    this.rig = new Rig(this.model);
    // Something new on: a wave, to show it off
    if (this.living() && putOnSomethingNew(this.worn, this.avatar)) {
      this.waveStart = performance.now();
    }
    this.worn = { hat: this.avatar.hat, glasses: this.avatar.glasses, top: this.avatar.top };
    this.frameModel();
    this.requestRender();
    if (!this.introduced) {
      // Once, on arrival: a full turn, so a child sees straight away that
      // this character goes all the way round
      this.introduced = true;
      this.animateTurn(0, Math.PI * 2, 1800);
    }
  }

  /**
   * Backs the camera off far enough to see the whole character, from the
   * stand to the top of the tallest hair or hat, keeping the angle the child
   * has turned it to. Only ever further than the usual distance, never
   * closer, so an ordinary outfit does not jump about.
   */
  private frameModel() {
    if (!this.model || !this.controls) {
      return;
    }
    this.glide = undefined;
    const { target, distance } = this.view();
    this.place3d(target, distance);
    this.controls.maxDistance = Math.max(48, distance + 2);
    this.controls.update();
  }

  /** Where the camera should look, and from how far, for the current focus. */
  view(): { target: THREE.Vector3; distance: number } {
    const box = new THREE.Box3();
    if (this.focus === 'head') {
      ['head-group', 'hair', 'hat', 'glasses'].forEach(name => {
        const part = this.model!.getObjectByName(name);
        if (part) {
          box.expandByObject(part);
        }
      });
      const { distance, centre } = headFraming(box.min.y, box.max.y, this.camera.fov, this.camera.aspect);
      return { target: new THREE.Vector3(0, centre, 0), distance };
    }
    box.setFromObject(this.model!);
    const { distance, centre } = framing(box.min.y, box.max.y, this.camera.fov, this.camera.aspect);
    return { target: new THREE.Vector3(0, centre, 0), distance };
  }

  /** Puts the camera `distance` from `target`, keeping the angle it is looking from. */
  private place3d(target: THREE.Vector3, distance: number) {
    const direction = this.camera.position.clone().sub(this.controls!.target).normalize();
    this.controls!.target.copy(target);
    this.camera.position.copy(target).addScaledVector(direction, distance);
  }

  /** Eases the camera to the current focus: at once under reduced motion. */
  private moveToFocus() {
    if (!this.model || !this.controls) {
      return;
    }
    const { target, distance } = this.view();
    if (reducedMotion()) {
      this.place3d(target, distance);
      this.controls.update();
      this.renderNow();
      return;
    }
    this.glide = {
      fromTarget: this.controls.target.clone(), toTarget: target,
      fromDistance: this.camera.position.distanceTo(this.controls.target), toDistance: distance,
      start: performance.now(), ms: 500
    };
    this.requestRender();
  }

  private fit() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.renderer) {
      return;
    }
    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 360;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  /** Whether the character moves by itself: never under reduced motion. */
  private living(): boolean {
    return AvatarStageComponent.alive && !reducedMotion();
  }

  /** Poses the character for this moment; false when it is not moving by itself. */
  private animate(now: number): boolean {
    if (!this.rig || !this.living()) {
      return false;
    }
    let waving: number | null = null;
    if (this.waveStart !== null) {
      waving = (now - this.waveStart) / 1000;
      if (waving >= WAVE_SECONDS) {
        this.waveStart = null;
        waving = null;
      }
    }
    this.rig.pose((now - this.born) / 1000, waving);
    return true;
  }

  /** Whether a wave is under way. */
  get waving(): boolean {
    return this.waveStart !== null;
  }

  private requestRender() {
    if (this.frame || this.destroyed) {
      return;
    }
    this.frame = requestAnimationFrame(now => {
      this.frame = 0;
      let turning = false;
      if (this.glide) {
        const g = this.glide;
        const t = Math.min(1, (now - g.start) / g.ms);
        const e = easeInOut(t);
        this.place3d(g.fromTarget.clone().lerp(g.toTarget, e), g.fromDistance + (g.toDistance - g.fromDistance) * e);
        if (t >= 1) {
          this.glide = undefined;
        } else {
          turning = true;
        }
      }
      if (this.spin) {
        const t = Math.min(1, (now - this.spin.start) / this.spin.ms);
        this.place(this.spin.from + (this.spin.to - this.spin.from) * easeInOut(t));
        turning = t < 1;
        if (!turning) {
          this.spin = undefined;
        }
      }
      // Keep drawing while a turn is under way or easing out, and while the
      // character is alive; standing still, it needs only 30 frames a second
      const moving = this.controls ? this.controls.update() : false;
      const alive = this.animate(now);
      if (moving || turning || this.waving || !alive || now - this.drawnAt >= 32) {
        this.drawnAt = now;
        this.renderNow();
      }
      if (moving || turning || alive) {
        this.requestRender();
      }
    });
  }

  private renderNow() {
    this.renderer?.render(this.scene, this.camera);
  }
}
