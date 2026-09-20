import { Component, OnInit } from '@angular/core';

export interface Particle {
  symbol: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: string;
}

const SYMBOLS = ['+', '−', '×', '÷', '=', '★', '7', '3'];
// Fixed drift lanes instead of a per-particle CSS variable: custom-property
// bindings are not reliable across the browsers a school tablet might run.
const DRIFTS = ['drift-left', 'drift-straight', 'drift-right'];
const PARTICLE_COUNT = 14;

/**
 * Slow-drifting math symbols behind the game. Purely decorative: it never
 * takes pointer events, and it renders nothing when the device asks for
 * reduced motion or when the tab is better off saving battery.
 */
@Component({
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css']
})
export class ParticlesComponent implements OnInit {
  particles: Particle[] = [];

  ngOnInit() {
    if (this.prefersReducedMotion()) {
      return;
    }
    this.particles = this.buildParticles();
  }

  private buildParticles(): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        symbol: SYMBOLS[i % SYMBOLS.length],
        left: Math.round(Math.random() * 100),
        size: 14 + Math.round(Math.random() * 22),
        // A slow, uneven drift reads as calm; anything faster distracts from the sums
        duration: 18 + Math.round(Math.random() * 16),
        delay: Math.round(Math.random() * 20),
        drift: DRIFTS[i % DRIFTS.length]
      });
    }
    return particles;
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
