import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-grade-select',
  templateUrl: './grade-select.component.html',
  styleUrls: ['./grade-select.component.css']
})
export class GradeSelectComponent {
  grades = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    name: `Grade ${i + 1}`,
    description: `Mathematics for Grade ${i + 1} students`,
    icon: '📚'
  }));

  constructor(private router: Router) {}

  selectGrade(grade: number) {
    localStorage.setItem('grade', grade.toString());
    this.router.navigate(['/difficulty']);
  }
} 