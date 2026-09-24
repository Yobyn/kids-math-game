import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  BurstPool, burstAlpha, rippleRadius, sparkColour, sparkDistance, SPARKS_PER_BURST,
  TAP_REFUSED, TAP_TARGETS, tapHueMix
} from './tap-burst';
import { FieldPulseService } from '../services/field-pulse.service';

/**
 * The field answering a touch: a small scatter of its particles where a
 * child tapped a button, gone in 300ms.
 *
 * A layer of its own, ABOVE the game, because the backdrop is behind every
 * surface — a burst drawn there would be hidden under the very key that was
 * pressed. It never takes pointer events and is hidden from screen readers,
 * so it can sit on top without being in the way of anything.
 *
 * It costs nothing at rest: the animation loop runs only while a burst is
 * alive and stops with the last one. Under prefers-reduced-motion it does
 * not listen at all — no burst, not a smaller one.
 */
@Component({
  selector: 'app-tap-sparks',
  template: '<canvas #canvas class="tap-canvas" aria-hidden="true"></canvas>',
  styleUrls: ['./tap-sparks.component.css']
})
export class TapSparksComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly pool = new BurstPool();
  /** True once the layer is listening; false under reduced motion. */
  listening = false;
  /** True only while a burst is on screen. */
  running = false;

  private context: CanvasRenderingContext2D | null = null;
  private frame = 0;
  private lastFrameAt = 0;
  private ratio = 1;
  private tapSubscription?: Subscription;
  private onPointerDown = (event: PointerEvent) => this.report(event.target, event.clientX, event.clientY);
  // A keyboard or switch press arrives as a click with no pointer behind it
  // (detail 0); it gets the same answer, from the middle of the control.
  private onClick = (event: MouseEvent) => {
    if (event.detail === 0) {
      this.report(event.target, NaN, NaN);
    }
  };

  constructor(private zone: NgZone, private pulseService: FieldPulseService) {}

  ngAfterViewInit() {
    const canvas = this.canvasRef?.nativeElement;
    this.context = canvas ? canvas.getContext('2d') : null;
    if (!this.context || this.prefersReducedMotion()) {
      return;
    }

    this.listening = true;
    this.tapSubscription = this.pulseService.taps$.subscribe(point => this.start(point.x, point.y));
    // Outside Angular: a tap on a key must not buy a change-detection pass
    // for a decoration that never touches application state
    this.zone.runOutsideAngular(() => {
      document.addEventListener('pointerdown', this.onPointerDown, { capture: true, passive: true });
      document.addEventListener('click', this.onClick, { capture: true, passive: true });
    });
  }

  ngOnDestroy() {
    this.listening = false;
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.tapSubscription?.unsubscribe();
    document.removeEventListener('pointerdown', this.onPointerDown, { capture: true });
    document.removeEventListener('click', this.onClick, { capture: true });
  }

  /**
   * Passes a touch to the field if it landed on something that answers.
   * Coordinates that are not numbers mean "the middle of the control".
   */
  report(target: EventTarget | null, x: number, y: number) {
    const control = target instanceof Element ? target.closest(TAP_TARGETS) : null;
    if (!control || control.matches(TAP_REFUSED)) {
      return;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const box = control.getBoundingClientRect();
      x = box.left + box.width / 2;
      y = box.top + box.height / 2;
    }
    this.pulseService.tap(x, y);
  }

  /** Starts a burst at (x, y) and, if it is not already running, the loop. */
  start(x: number, y: number) {
    if (!this.listening) {
      return;
    }
    this.pool.burst(x, y, tapHueMix(x, y, window.innerWidth, window.innerHeight));
    if (this.running) {
      return;
    }
    this.running = true;
    this.fit();
    this.zone.runOutsideAngular(() => {
      this.lastFrameAt = performance.now();
      this.draw();
      this.frame = requestAnimationFrame(timestamp => this.tick(timestamp));
    });
  }

  draw() {
    const canvas = this.canvasRef?.nativeElement;
    const context = this.context;
    if (!canvas || !context) {
      return;
    }
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    context.clearRect(0, 0, canvas.width / this.ratio, canvas.height / this.ratio);

    for (const burst of this.pool.bursts) {
      if (!burst.live) {
        continue;
      }
      const alpha = burstAlpha(burst.age);

      // The ring marks the point of contact
      context.strokeStyle = sparkColour(burst, alpha * 0.7);
      context.lineWidth = 2;
      context.beginPath();
      context.arc(burst.x, burst.y, rippleRadius(burst.age), 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = sparkColour(burst, alpha);
      for (let i = 0; i < SPARKS_PER_BURST; i++) {
        const distance = sparkDistance(burst.speeds[i], burst.age);
        context.beginPath();
        context.arc(
          burst.x + Math.cos(burst.angles[i]) * distance,
          burst.y + Math.sin(burst.angles[i]) * distance,
          burst.sizes[i], 0, Math.PI * 2
        );
        context.fill();
      }
    }
  }

  /** One frame. Exposed so tests can drive the loop by hand. */
  tick(timestamp: number) {
    if (!this.running) {
      return;
    }
    // Clamped so a backgrounded tab finishes its bursts rather than freezing them
    const seconds = Math.min(Math.max((timestamp - this.lastFrameAt) / 1000, 0), 0.1);
    this.lastFrameAt = timestamp;

    const alive = this.pool.step(seconds);
    this.draw();
    if (alive === 0) {
      // The last burst is spent: stop, and leave nothing running at rest
      this.running = false;
      return;
    }
    this.frame = requestAnimationFrame(next => this.tick(next));
  }

  /** Sized when a burst starts rather than on every resize: it is idle otherwise. */
  private fit() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    this.ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(window.innerWidth * this.ratio);
    const height = Math.floor(window.innerHeight * this.ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
