import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';
import {
  Avatar,
  EYE_SHAPES,
  FACE_SHAPES,
  HAIR_COLOURS,
  HAIR_STYLES,
  HAIR_TEXTURES,
  MOUTH_SHAPES,
  NO_ITEM,
  SKIN_TONES,
  EYE_COLOURS,
  defaultAvatar
} from './avatar-model';
import { HAT_LINE, SPRITE } from './avatar-parts';
import { AvatarStillService } from './avatar-still.service';

/**
 * The component chooses WHICH parts to draw, in which colours, framing and
 * level of detail. How each part is drawn — and that every hair style fits
 * every face — is checked against the real sprite and its geometry in
 * scripts/avatar-art.test.js, for all 36 combinations.
 */
describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let component: AvatarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [AvatarComponent] }).compileComponents();
    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
  });

  function draw(avatar: Partial<Avatar> = {}, size = 120, framing: 'portrait' | 'full' = 'portrait') {
    component.avatar = { ...defaultAvatar(), ...avatar };
    component.size = size;
    component.framing = framing;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('svg') as SVGSVGElement;
  }

  const partOf = (svg: SVGSVGElement, cls: string) => {
    const use = svg.querySelector(`use.${cls}, .${cls} use`);
    return use ? (use.getAttribute('href') || '').replace(`${SPRITE}#`, '') : null;
  };
  const cssVar = (svg: SVGSVGElement, name: string) =>
    (new RegExp(`${name}:([^;]+)`).exec(svg.getAttribute('style') || '') || [])[1];

  it('draws every part from the one sprite the service worker caches', () => {
    const svg = draw();
    const hrefs = Array.from(svg.querySelectorAll('use')).map(u => u.getAttribute('href') || '');
    expect(hrefs.length).toBeGreaterThan(5);
    hrefs.forEach(h => expect(h.startsWith(`${SPRITE}#`)).toBe(true, h));
  });

  it('paints the face, ears and neck in the chosen skin tone, through one variable', () => {
    const svg = draw({ skin: SKIN_TONES[5] });
    expect(cssVar(svg, '--skin')).toBe(SKIN_TONES[5]);
    // Its shade is DERIVED, so it follows whatever tone is chosen
    expect(cssVar(svg, '--skin-shade')).not.toBe(SKIN_TONES[5]);
  });

  it('keeps hair colour and eye colour on their own variables', () => {
    const svg = draw({ hairColour: HAIR_COLOURS[4], eyeColour: EYE_COLOURS[2] });
    expect(cssVar(svg, '--hair')).toBe(HAIR_COLOURS[4]);
    expect(cssVar(svg, '--eye')).toBe(EYE_COLOURS[2]);
  });

  it('draws the hair style the child picked, fitted to the face they picked', () => {
    FACE_SHAPES.forEach(faceShape => {
      HAIR_STYLES.forEach(hairStyle => {
        const svg = draw({ faceShape, hairStyle });
        expect(partOf(svg, 'hair')).toBe(`hair-${hairStyle}-${faceShape}`);
        expect(partOf(svg, 'face')).toBe(`face-${faceShape}`);
        expect(partOf(svg, 'ears')).toBe(`ears-${faceShape}`);
      });
    });
  });

  it('draws what hangs behind the head only for the styles that have it', () => {
    expect(partOf(draw({ hairStyle: 'long' }), 'back')).toBe('hair-back-long-round');
    expect(partOf(draw({ hairStyle: 'short' }), 'back')).toBeNull();
    expect(partOf(draw({ hairStyle: 'buzz' }), 'back')).toBeNull();
  });

  it('draws the eyes and mouth the child picked', () => {
    EYE_SHAPES.forEach(eyeShape => expect(partOf(draw({ eyeShape }), 'eyes')).toBe(`eyes-${eyeShape}`));
    MOUTH_SHAPES.forEach(mouthShape => expect(partOf(draw({ mouthShape }), 'mouth')).toBe(`mouth-${mouthShape}`));
  });

  it('falls back to a real face for a shape it does not know', () => {
    const svg = draw({ faceShape: 'triangle' as any });
    expect(partOf(svg, 'face')).toBe('face-round');
    expect(partOf(svg, 'hair')).toBe('hair-short-round');
  });

  it('draws at whatever size it is asked for, from one set of artwork', () => {
    const svg = draw({}, 44);
    expect(svg.getAttribute('width')).toBe('44');
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('is announced as a picture rather than read out as shapes', () => {
    const svg = draw();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBeTruthy();
  });
});

describe('AvatarComponent: detail that reads at the size it is drawn', () => {
  let fixture: ComponentFixture<AvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [AvatarComponent] }).compileComponents();
    fixture = TestBed.createComponent(AvatarComponent);
  });

  function styleAt(size: number) {
    fixture.componentInstance.size = size;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('svg').getAttribute('style') as string;
  }

  it('drops fine detail at the small sizes where it would turn to mud', () => {
    // 32, 40 and 44px are where five of the seven appearances are drawn
    for (const size of [32, 40, 44]) {
      expect(styleAt(size)).toContain('--detail:none');
      expect(styleAt(size)).toContain('--small:inline');
    }
  });

  it('keeps it where there is room for it', () => {
    for (const size of [140, 180]) {
      expect(styleAt(size)).toContain('--detail:inline');
      expect(styleAt(size)).toContain('--small:none');
    }
  });

  it('draws a heavier line when small, so the silhouette stays crisp', () => {
    const lineAt = (size: number) => Number(/--line-w:([\d.]+)/.exec(styleAt(size))![1]);
    expect(lineAt(44)).toBeGreaterThan(lineAt(180));
  });
});

describe('AvatarComponent: what is worn', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let component: AvatarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [AvatarComponent] }).compileComponents();
    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
  });

  function draw(avatar: Partial<Avatar>, framing: 'portrait' | 'full' = 'portrait') {
    component.avatar = { ...defaultAvatar(), ...avatar };
    component.framing = framing;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('svg') as SVGSVGElement;
  }
  const href = (svg: Element, sel: string) => {
    const use = svg.querySelector(sel);
    return use ? (use.getAttribute('href') || '').replace(`${SPRITE}#`, '') : null;
  };

  it('fits a hat to the face it is on', () => {
    FACE_SHAPES.forEach(faceShape => {
      expect(href(draw({ faceShape, hat: 'beanie' }), 'use.hat')).toBe(`hat-beanie-${faceShape}`);
    });
  });

  it('hides the hair above the brim of a hat worn over the head, at that face\'s brim', () => {
    FACE_SHAPES.forEach(faceShape => {
      const svg = draw({ faceShape, hairStyle: 'afro', hat: 'beanie' });
      const clip = svg.querySelector('clipPath')!;
      expect(clip).toBeTruthy();
      expect(Number(clip.querySelector('rect')!.getAttribute('y'))).toBe(HAT_LINE[faceShape]);
      const ref = `url(#${clip.id})`;
      expect(svg.querySelector('g.front')!.getAttribute('clip-path')).toBe(ref);
      expect(svg.querySelector('g.back')!.getAttribute('clip-path')).toBe(ref);
    });
  });

  it('hides nothing for a crown, which is worn in the hair rather than over it', () => {
    const svg = draw({ hairStyle: 'afro', hat: 'crown' });
    expect(svg.querySelector('clipPath')).toBeNull();
    expect(svg.querySelector('g.front')!.getAttribute('clip-path')).toBeNull();
  });

  it('hides nothing when no hat is worn', () => {
    const svg = draw({ hat: NO_ITEM });
    expect(svg.querySelector('use.hat')).toBeNull();
    expect(svg.querySelector('clipPath')).toBeNull();
  });

  it('gives every character on a page its own clip, so two hats never share one', () => {
    const a = TestBed.createComponent(AvatarComponent);
    const b = TestBed.createComponent(AvatarComponent);
    a.componentInstance.avatar = { ...defaultAvatar(), hat: 'cap' };
    b.componentInstance.avatar = { ...defaultAvatar(), hat: 'cap' };
    a.detectChanges();
    b.detectChanges();
    expect(a.nativeElement.querySelector('clipPath').id).not.toBe(b.nativeElement.querySelector('clipPath').id);
  });

  it('fits glasses to the face they are on', () => {
    expect(href(draw({ faceShape: 'heart', glasses: 'goggles' }), 'use.glasses')).toBe('glasses-goggles-heart');
  });

  it('refuses to draw an item that does not exist', () => {
    const svg = draw({ hat: 'jetpack', glasses: 'monocle' });
    expect(svg.querySelector('use.hat')).toBeNull();
    expect(svg.querySelector('use.glasses')).toBeNull();
  });

  it('shows no clothes at all in the portrait framing', () => {
    expect(draw({ top: 'hoodie' }).querySelector('use.body')).toBeNull();
  });

  it('dresses the body in the top being worn, and a plain one when nothing is', () => {
    expect(href(draw({ top: 'hoodie' }, 'full'), 'use.body')).toBe('body-hoodie');
    expect(href(draw({ top: NO_ITEM }, 'full'), 'use.body')).toBe('body-none');
  });

  it('grows taller rather than wider for the extra body', () => {
    component.size = 100;
    const portrait = draw({}, 'portrait');
    const pw = portrait.getAttribute('width');
    const ph = Number(portrait.getAttribute('height'));
    const full = draw({}, 'full');
    expect(full.getAttribute('width')).toBe(pw);
    expect(Number(full.getAttribute('height'))).toBeGreaterThan(ph);
    expect(full.getAttribute('viewBox')).toBe('0 0 100 132');
  });

  it('draws a character with every axis set at once', () => {
    const svg = draw({
      skin: SKIN_TONES[3], faceShape: 'square', hairStyle: 'braids', hairTexture: 'coily',
      hairColour: HAIR_COLOURS[5], eyeShape: 'almond', eyeColour: EYE_COLOURS[3], mouthShape: 'open',
      hat: 'wizard', glasses: 'round-glasses', top: 'striped'
    }, 'full');
    const drawn = Array.from(svg.querySelectorAll('use')).map(u => u.getAttribute('href')!.split('#')[1]);
    expect(drawn).toEqual([
      'hair-back-braids-square', 'body-striped', 'ears-square', 'face-square', 'brows',
      'eyes-almond', 'mouth-open', 'hair-braids-square', 'glasses-round-glasses-square', 'hat-wizard-square'
    ]);
  });
});

describe('AvatarComponent: hair texture', () => {
  let fixture: ComponentFixture<AvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [AvatarComponent] }).compileComponents();
    fixture = TestBed.createComponent(AvatarComponent);
  });

  function styleFor(hairTexture: any) {
    fixture.componentInstance.avatar = { ...defaultAvatar(), hairTexture };
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('svg').getAttribute('style') as string;
  }

  it('draws no rim at all on smooth hair', () => {
    expect(styleFor('smooth')).toContain('--tex-w:0');
  });

  it('draws a different rim for each of the others', () => {
    const dashes = HAIR_TEXTURES.filter(t => t !== 'smooth').map(t => {
      const style = styleFor(t);
      expect(Number(/--tex-w:([\d.]+)/.exec(style)![1])).toBeGreaterThan(0);
      return /--tex-dash:([^;]+)/.exec(style)![1];
    });
    expect(new Set(dashes).size).toBe(dashes.length);
  });
});

describe('AvatarComponent: the 3D still', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let component: AvatarComponent;
  let stills: AvatarStillService;
  let answers: { [hat: string]: (url: string | null) => void };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [AvatarComponent] }).compileComponents();
    stills = TestBed.inject(AvatarStillService);
    answers = {};
    spyOn(stills, 'cached').and.returnValue(null);
    spyOn(stills, 'still').and.callFake(avatar => new Promise(resolve => (answers[avatar.hat] = resolve)));
    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
  });

  function show(avatar: Partial<Avatar> = {}) {
    component.avatar = { ...defaultAvatar(), ...avatar };
    component.ngOnChanges();
    fixture.detectChanges();
  }

  const img = () => fixture.nativeElement.querySelector('img.still') as HTMLImageElement | null;
  const svg = () => fixture.nativeElement.querySelector('svg') as SVGSVGElement | null;

  it('shows the 2D drawing until the 3D still is ready, then the still in its place', async () => {
    component.size = 64;
    show({ hat: 'cap' });
    expect(svg()).not.toBeNull();
    expect(img()).toBeNull();
    answers.cap('data:image/png;base64,cap');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(svg()).toBeNull();
    expect(img()!.getAttribute('src')).toBe('data:image/png;base64,cap');
    expect(img()!.getAttribute('width')).toBe('64');
    expect(img()!.getAttribute('height')).toBe('64');
    expect(img()!.alt).toBeTruthy();
  });

  it('is as tall as the 2D drawing in the full framing', () => {
    (stills.cached as jasmine.Spy).and.returnValue('data:image/png;base64,kept');
    component.size = 100;
    component.framing = 'full';
    show();
    expect(img()!.getAttribute('height')).toBe('132');
  });

  it('shows a kept still at once, without asking for a new one', () => {
    (stills.cached as jasmine.Spy).and.returnValue('data:image/png;base64,kept');
    show();
    expect(img()!.getAttribute('src')).toBe('data:image/png;base64,kept');
    expect(stills.still).not.toHaveBeenCalled();
  });

  it('keeps the 2D drawing where no still can be made', async () => {
    show({ hat: 'cap' });
    answers.cap(null);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(img()).toBeNull();
    expect(svg()).not.toBeNull();
  });

  it('does not ask again for the same character handed over as a new object', () => {
    show({ hat: 'cap' });
    show({ hat: 'cap' });
    expect(stills.still).toHaveBeenCalledTimes(1);
    show({ hat: 'beanie' });
    expect(stills.still).toHaveBeenCalledTimes(2);
  });

  it('shows the newest character, not a slow answer for the one before', async () => {
    show({ hat: 'cap' });
    show({ hat: 'beanie' });
    answers.beanie('data:image/png;base64,beanie');
    answers.cap('data:image/png;base64,cap');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(img()!.getAttribute('src')).toBe('data:image/png;base64,beanie');
  });

  it('stays 2D when asked to look flat, as the dressing-up swatches do', () => {
    (stills.cached as jasmine.Spy).and.returnValue('data:image/png;base64,kept');
    component.look = 'flat';
    show();
    expect(img()).toBeNull();
    expect(svg()).not.toBeNull();
    expect(stills.still).not.toHaveBeenCalled();
  });

  it('goes back to 2D when switched to flat, and to 3D when switched back', () => {
    (stills.cached as jasmine.Spy).and.returnValue('data:image/png;base64,kept');
    show();
    expect(img()).not.toBeNull();
    component.look = 'flat';
    show();
    expect(img()).toBeNull();
    component.look = '3d';
    show();
    expect(img()).not.toBeNull();
  });
});
