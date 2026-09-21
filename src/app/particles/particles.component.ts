import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import {
  createField, edgeFade, FieldParticle, particleColour, stepParticle
} from './particle-field';

/** Dense enough to read as a cloud, light enough for an old school tablet. */
const PARTICLE_COUNT = 900;
const REDUCED_MOTION_COUNT = 260;

/**
 * The game's backdrop: a slowly turning ring of particles, blue through
 * magenta. Drawn on a canvas because a thousand DOM nodes would not survive
 * contact with a tablet.
 *
 * Purely decorative — it never takes pointer events and is hidden from
 * screen readers. Under prefers-reduced-motion it draws a single still frame
 * rather than nothing: the look survives, the movement does not.
 */
@Component({
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css']
})
export class ParticlesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  particles: FieldParticle[] = [];
  animating = false;

  private context: CanvasRenderingContext2D | null = null;
  private frame = 0;
  private lastFrameAt = 0;
  private resizeListener = () => this.resize();

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    const canvas = this.canvasRef?.nativeElement;
    this.context = canvas ? canvas.getContext('2d') : null;
    if (!this.context) {
      return;
    }

    const still = this.prefersReducedMotion();
    this.particles = createField(still ? REDUCED_MOTION_COUNT : PARTICLE_COUNT);
    this.resize();
    window.addEventListener('resize', this.resizeListener);

    if (still) {
      this.draw();
      return;
    }

    this.animating = true;
    // Outside Angular: sixty change-detection passes a second would be absurd
    // for a decoration that never touches application state.
    this.zone.runOutsideAngular(() => {
      this.lastFrameAt = performance.now();
      this.frame = requestAnimationFrame(timestamp => this.tick(timestamp));
    });
  }

  ngOnDestroy() {
    this.animating = false;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resizeListener);
  }

  /** Steps the field and redraws. Exposed so tests can drive it by hand. */
  advance(seconds: number) {
    this.particles = this.particles.map(particle => stepParticle(particle, seconds));
  }

  draw() {
    const canvas = this.canvasRef?.nativeElement;
    const context = this.context;
    if (!canvas || !context) {
      return;
    }

    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);

    const centreX = width / 2;
    const centreY = height / 2;
    // Sized off the diagonal so the ring frames the content rather than
    // sitting behind it — on a phone its sides fall outside the screen, which
    // reads as a glow down the edges.
    const ringRadius = Math.hypot(width, height) * 0.34;

    this.particles.forEach(particle => {
      const distance = particle.radius * ringRadius;
      const x = centreX + Math.cos(particle.angle) * distance;
      const y = centreY + Math.sin(particle.angle) * distance;

      context.globalAlpha = edgeFade(particle.radius);
      context.fillStyle = particleColour(particle);
      context.beginPath();
      context.arc(x, y, particle.size, 0, Math.PI * 2);
      context.fill();
    });

    context.globalAlpha = 1;
  }

  private tick(timestamp: number) {
    if (!this.animating) {
      return;
    }
    // Clamped so a backgrounded tab does not resume with one enormous step
    const seconds = Math.min((timestamp - this.lastFrameAt) / 1000, 0.1);
    this.lastFrameAt = timestamp;

    this.advance(seconds);
    this.draw();
    this.frame = requestAnimationFrame(next => this.tick(next));
  }

  private resize() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    // Cap the pixel ratio: a 3x retina tablet does not need nine times the fill
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    this.draw();
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
