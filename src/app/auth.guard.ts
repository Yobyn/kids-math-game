import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    // A guest can play; an account is only needed to keep what they earn.
    if (this.authService.canPlay()) {
      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }
} 