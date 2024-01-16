import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private url = 'https://pokeapi.co/api/v2/pokemon?limit=100';

  constructor(private http: HttpClient) { }

  getPokemon() {
    return this.http.get(this.url);
  }
}