// domain/workouts/progression.test.ts
import { describe, it, expect } from 'vitest';
import {
  maxWeightSeries,
  lastWeightForExercise,
  exerciseStatusForDay,
  type LoggedSet,
} from './progression';

const sets: LoggedSet[] = [
  { exercise_id: 'A', weight_kg: 10, completed: true, session_date: '2026-06-01' },
  { exercise_id: 'A', weight_kg: 12, completed: true, session_date: '2026-06-01' },
  { exercise_id: 'A', weight_kg: 15, completed: true, session_date: '2026-06-08' },
  { exercise_id: 'A', weight_kg: 0, completed: false, session_date: '2026-06-08' },
  { exercise_id: 'B', weight_kg: 40, completed: true, session_date: '2026-06-08' },
  { exercise_id: 'A', weight_kg: null, completed: true, session_date: '2026-06-15' },
];

describe('maxWeightSeries', () => {
  it('da el peso máximo por sesión, ordenado por fecha, ignorando pesos nulos', () => {
    expect(maxWeightSeries(sets, 'A')).toEqual([
      { dateISO: '2026-06-01', maxKg: 12 },
      { dateISO: '2026-06-08', maxKg: 15 },
    ]);
  });
  it('devuelve vacío si el ejercicio no tiene registros con peso', () => {
    expect(maxWeightSeries(sets, 'Z')).toEqual([]);
  });
});

describe('lastWeightForExercise', () => {
  it('toma el peso máximo de la sesión más reciente con peso', () => {
    expect(lastWeightForExercise(sets, 'A')).toBe(15);
  });
  it('devuelve null si no hay registros con peso', () => {
    expect(lastWeightForExercise(sets, 'Z')).toBeNull();
  });
});

describe('exerciseStatusForDay', () => {
  it('marca hecho si hay al menos un set completado, no hecho si no', () => {
    const sessionSets: LoggedSet[] = [
      { exercise_id: 'A', weight_kg: 15, completed: true, session_date: '2026-06-08' },
      { exercise_id: 'B', weight_kg: 40, completed: false, session_date: '2026-06-08' },
    ];
    expect(exerciseStatusForDay(['A', 'B', 'C'], sessionSets)).toEqual({
      A: 'done',
      B: 'missed',
      C: 'missed',
    });
  });
});
