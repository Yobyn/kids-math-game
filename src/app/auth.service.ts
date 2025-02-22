import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface AuthResponse {
  token: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  private usernameSubject = new BehaviorSubject<string | null>(localStorage.getItem('username'));

  constructor(private http: HttpClient) {}

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { username, password });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('username', username);
          this.tokenSubject.next(response.token);
          this.usernameSubject.next(username);
        })
      );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    this.tokenSubject.next(null);
    this.usernameSubject.next(null);
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  getUsername(): string | null {
    return this.usernameSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): Observable<string | null> {
    return this.usernameSubject.asObservable();
  }
}