import { Component, OnInit } from '@angular/core';
import { PokemonService } from '../pokemon.service';

@Component({
  selector: 'app-profile-creation',
  templateUrl: './profile-creation.component.html',
  styleUrls: ['./profile-creation.component.css']
})
export class ProfileCreationComponent implements OnInit {
  pokemon: any[] = [];

  constructor(private pokemonService: PokemonService) { }

  ngOnInit(): void {
    this.pokemonService.getPokemon().subscribe((data: any) => {
      console.log(data);
      this.pokemon = data.results;
    });
  }
}
