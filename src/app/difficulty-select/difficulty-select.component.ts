import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-difficulty-select',
  templateUrl: './difficulty-select.component.html',
  styleUrls: ['./difficulty-select.component.css']
})
export class DifficultySelectComponent {
  selectedGrade: number | null = null;
  
  grades = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    name: `Grade ${i + 1}`,
    description: `Mathematics for Grade ${i + 1} students`,
    icon: '📚'
  }));

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

  selectGrade(grade: number) {
    this.selectedGrade = grade;
    localStorage.setItem('grade', grade.toString());
  }

  selectDifficulty(level: string) {
    if (this.selectedGrade === null) {
      alert('Please select a grade first');
      return;
    }
    localStorage.setItem('difficulty', level);
    localStorage.setItem('grade', this.selectedGrade.toString());
    this.router.navigate(['/questions']);
  }
} 