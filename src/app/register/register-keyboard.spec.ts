import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RegisterComponent } from './register.component';

describe('RegisterComponent on a phone keyboard', () => {
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, HttpClientTestingModule, RouterTestingModule],
      declarations: [RegisterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('keeps the name exactly as typed, with no capital or correction added', () => {
    // A name chosen here is matched exactly at sign-in. "sam" picked on a
    // phone that quietly made it "Sam" is a name the child does not know
    const username: HTMLInputElement = fixture.nativeElement.querySelector('#username');
    expect(username.getAttribute('autocapitalize')).toBe('none');
    expect(username.getAttribute('autocorrect')).toBe('off');
    expect(username.getAttribute('spellcheck')).toBe('false');
    expect(username.getAttribute('autocomplete')).toBe('username');
  });

  it('marks the password as a new one, so the phone can offer to save it', () => {
    const password: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    expect(password.getAttribute('autocomplete')).toBe('new-password');
  });
});
