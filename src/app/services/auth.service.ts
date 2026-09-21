import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AuthResponse {
  token: string;
  message?: string;
}

const GUEST_KEY = 'guest';

function readGuestFlag(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === 'true';
  } catch {
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  private usernameSubject = new BehaviorSubject<string | null>(localStorage.getItem('username'));
  private guestSubject = new BehaviorSubject<boolean>(readGuestFlag());

  constructor(private http: HttpClient) {}

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { username, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('username', username);
        this.tokenSubject.next(response.token);
        this.usernameSubject.next(username);
        this.endGuest();
      })
    );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('username', username);
        this.tokenSubject.next(response.token);
        this.usernameSubject.next(username);
        this.endGuest();
      })
    );
  }

  resetPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, { email });
  }

  /**
   * Lets a child play without an account. Guidance on guest modes is
   * consistent that the ask for an account belongs at the moment there is
   * something worth keeping, not at the door — so nothing here prompts.
   */
  playAsGuest(): void {
    try {
      localStorage.setItem(GUEST_KEY, 'true');
    } catch {
      // Private browsing still gets to play; the flag simply will not persist
    }
    this.guestSubject.next(true);
  }

  isGuest(): boolean {
    return this.guestSubject.value;
  }

  isGuest$(): Observable<boolean> {
    return this.guestSubject.asObservable();
  }

  /** Called when a guest signs up or signs in — they are not a guest any more. */
  endGuest(): void {
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable
    }
    this.guestSubject.next(false);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    this.endGuest();
    this.tokenSubject.next(null);
    this.usernameSubject.next(null);
  }

  getToken(): Observable<string | null> {
    return this.tokenSubject.asObservable();
  }

  getCurrentUser(): Observable<string | null> {
    return this.usernameSubject.asObservable();
  }

  isLoggedIn(): boolean {
    return !!this.tokenSubject.value;
  }

  /** Either an account or a guest — enough to be playing. */
  canPlay(): boolean {
    return this.isLoggedIn() || this.isGuest();
  }
}