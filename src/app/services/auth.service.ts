import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AuthResponse {
  token: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  private usernameSubject = new BehaviorSubject<string | null>(localStorage.getItem('username'));

  constructor(private http: HttpClient) {}

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', { username, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('username', username);
        this.tokenSubject.next(response.token);
        this.usernameSubject.next(username);
      })
    );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { username, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('username', username);
        this.tokenSubject.next(response.token);
        this.usernameSubject.next(username);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
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
} 