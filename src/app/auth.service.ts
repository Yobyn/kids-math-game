import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private tokenKey = 'auth_token';
  private usernameKey = 'username';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  private currentUserSubject = new BehaviorSubject<string>(this.getStoredUsername());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  private getStoredUsername(): string {
    return localStorage.getItem(this.usernameKey) || '';
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  getCurrentUser(): Observable<string> {
    return this.currentUserSubject.asObservable();
  }

  register(username: string, password: string) {
    return this.http.post<{token: string}>(`${this.apiUrl}/register`, { username, password })
      .pipe(
        tap(response => {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.usernameKey, username);
          this.currentUserSubject.next(username);
          this.isAuthenticatedSubject.next(true);
          this.router.navigate(['/difficulty']);
        })
      );
  }

  login(username: string, password: string) {
    return this.http.post<{token: string}>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap(response => {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.usernameKey, username);
          this.currentUserSubject.next(username);
          this.isAuthenticatedSubject.next(true);
          this.router.navigate(['/difficulty']);
        })
      );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.usernameKey);
    localStorage.removeItem('difficulty');
    this.currentUserSubject.next('');
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
}