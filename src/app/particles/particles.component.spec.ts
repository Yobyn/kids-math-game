import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParticlesComponent } from './particles.component';

describe('ParticlesComponent', () => {
  let fixture: ComponentFixture<ParticlesComponent>;
  let component: ParticlesComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ParticlesComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ParticlesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders a particle for every generated entry', () => {
    fixture.detectChanges();
    const rendered = fixture.nativeElement.querySelectorAll('.particle');
    expect(rendered.length).toBe(component.particles.length);
    expect(component.particles.length).toBeGreaterThan(0);
  });

  it('keeps every particle on screen and slow enough not to distract', () => {
    fixture.detectChanges();
    component.particles.forEach(particle => {
      expect(particle.left).toBeGreaterThanOrEqual(0);
      expect(particle.left).toBeLessThanOrEqual(100);
      expect(particle.size).toBeGreaterThanOrEqual(14);
      expect(particle.size).toBeLessThanOrEqual(36);
      expect(particle.duration).toBeGreaterThanOrEqual(18);
      expect(['drift-left', 'drift-straight', 'drift-right']).toContain(particle.drift);
    });
  });

  it('staggers the start times so they do not rise as one block', () => {
    fixture.detectChanges();
    const delays = new Set(component.particles.map(particle => particle.delay));
    expect(delays.size).toBeGreaterThan(1);
  });

  it('renders nothing when the device asks for reduced motion', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);

    const reduced = TestBed.createComponent(ParticlesComponent);
    reduced.detectChanges();

    expect(reduced.componentInstance.particles.length).toBe(0);
    expect(reduced.nativeElement.querySelectorAll('.particle').length).toBe(0);
  });

  it('never swallows taps meant for the game', () => {
    fixture.detectChanges();
    const layer = fixture.nativeElement.querySelector('.particles');
    expect(getComputedStyle(layer).pointerEvents).toBe('none');
  });
});
