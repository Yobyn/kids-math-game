import { Component, OnInit } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  username: string = '';

  constructor(public authService: AuthService) {}

  ngOnInit() {
    this.authService.getCurrentUser().subscribe(username => {
      this.username = username;
    });
  }

  logout() {
    this.authService.logout();
  }
}
