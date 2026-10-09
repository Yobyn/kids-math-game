import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BonusComponent, END_PULSE, HIT_PULSE } from './bonus.component';
import { FieldPulseService } from '../services/field-pulse.service';
import { BALL_RADIUS } from './pong';

describe('BonusComponent, the bonus game after a round', () => {
  let fixture: ComponentFixture<BonusComponent>;
  let component: BonusComponent;
  let pulses: FieldPulseService;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('language', 'nl');
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [BonusComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(BonusComponent);
    component = fixture.componentInstance;
    pulses = TestBed.inject(FieldPulseService);
    spyOn(pulses, 'pulse').and.callThrough();
    spyOn(pulses, 'tap').and.callThrough();
    spyOn(TestBed.inject(Router), 'navigate');
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
    localStorage.clear();
  });

  /** Started by hand, with the ball put where the test wants it and no animation running. */
  function playWithBall(x: number, y: number, vx: number, vy: number) {
    component.started = true;
    component.game = { ...component.game, ball: { ...component.game.ball, x, y, vx, vy } };
  }

  it('says how to play and waits for Start, with no ball moving yet', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Bonusspel');
    expect(text).toContain('plankje');
    expect(fixture.nativeElement.querySelector('.bonus-button').textContent).toContain('Start');
    const before = component.game.ball.y;
    component.advance(0.1);
    expect(component.game.ball.y).toBe(before);
  });

  it('answers a paddle hit with the particle field: it swells, and sparks fly from where the ball struck', () => {
    const paddle = component.game.paddle;
    playWithBall(paddle.x, paddle.y - BALL_RADIUS - 2, 0, 300);
    component.advance(0.03);

    expect(component.hits).toBe(1);
    expect(pulses.pulse).toHaveBeenCalledWith(HIT_PULSE);
    const box = fixture.nativeElement.querySelector('canvas').getBoundingClientRect();
    const [x, y] = (pulses.tap as jasmine.Spy).calls.mostRecent().args;
    expect(x).toBeCloseTo(box.left + paddle.x, 0);
    expect(y).toBeCloseTo(box.top + paddle.y, 0);
  });

  it('shows the points big as they come', () => {
    const paddle = component.game.paddle;
    playWithBall(paddle.x, paddle.y - BALL_RADIUS - 2, 0, 300);
    component.advance(0.03);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bonus-points').textContent.trim()).toBe('1');
  });

  it('ends on a miss with "well played" and the points, and a bigger swell of the field', () => {
    component.started = true;
    component.game = { ...component.game, hits: 4 };
    playWithBall(10, component.game.height - 5, 0, 400);
    component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
    component.advance(0.05);
    fixture.detectChanges();

    expect(component.ended).toBeTrue();
    expect(pulses.pulse).toHaveBeenCalledWith(END_PULSE);
    const card = fixture.nativeElement.querySelector('[role="status"]');
    expect(card.textContent).toContain('Goed gespeeld!');
    expect(card.querySelector('.bonus-won-number').textContent.trim()).toBe('4');
    expect(END_PULSE).toBeGreaterThan(HIT_PULSE);
  });

  it('puts the paddle under the finger anywhere on the board', () => {
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const box = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + 60, clientY: box.top + 50, bubbles: true }));
    expect(component.game.paddle.x).toBe(Math.max(60, component.game.paddle.width / 2));
  });

  it('moves the paddle with the arrow keys on a computer', () => {
    component.started = true;
    const from = component.game.paddle.x;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    component.advance(0.1);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
    const moved = component.game.paddle.x;
    component.advance(0.1);

    expect(moved).toBeGreaterThan(from);
    expect(component.game.paddle.x).toBe(moved);
  });

  it('draws the ball and paddle on a see-through board, so the particle field shows through', () => {
    component.draw();
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const ratio = canvas.width / component.game.width;
    const pixel = (x: number, y: number) => context.getImageData(Math.round(x * ratio), Math.round(y * ratio), 1, 1).data;
    // a corner far from ball and paddle: nothing drawn, fully clear
    expect(pixel(3, 3)[3]).toBe(0);
    // the ball and the paddle are there
    expect(pixel(component.game.ball.x, component.game.ball.y)[3]).toBeGreaterThan(200);
    const paddle = component.game.paddle;
    expect(pixel(paddle.x, paddle.y + paddle.height / 2)[3]).toBeGreaterThan(200);
  });

  it('goes on when the game is done', () => {
    component.done();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalled();
  });
});
