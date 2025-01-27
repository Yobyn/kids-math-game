import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-difficulty-select',
  templateUrl: './difficulty-select.component.html',
  styleUrls: ['./difficulty-select.component.css']
})
export class DifficultySelectComponent implements OnInit {
  difficulties = [
    { 
      level: 'easy',
      name: 'Level 1',
      description: 'Basic operations with smaller numbers',
      icon: '🌟'
    },
    {
      level: 'medium',
      name: 'Level 2',
      description: 'Intermediate operations with medium-sized numbers',
      icon: '🌟🌟'
    },
    {
      level: 'hard',
      name: 'Level 3',
      description: 'Advanced operations with larger numbers',
      icon: '🌟🌟🌟'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Redirect to grade selection if no grade is selected
    if (!localStorage.getItem('grade')) {
      this.router.navigate(['/grade']);
    }
  }

  selectDifficulty(level: string) {
    localStorage.setItem('difficulty', level);
    this.router.navigate(['/questions']);
  }
} 