import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared/shared.module';
import { AppComponent } from './app.component';
import { ParticlesComponent } from './particles/particles.component';

@NgModule({
  declarations: [
    AppComponent,
    ParticlesComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    SharedModule,
    HttpClientModule,
  ],
  // No HTTP interceptor: every request that needs a token sets its own, from
  // AuthService as it stands (progress-sync.service.ts). One here used to
  // hold the token from when the app opened and put it back over theirs
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
