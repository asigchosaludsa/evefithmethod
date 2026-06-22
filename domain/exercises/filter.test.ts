// domain/exercises/filter.test.ts
import { describe, expect, it } from 'vitest';
import { filterExercises, type FilterableExercise } from './filter';

const EX: FilterableExercise[] = [
  { id: '1', name: 'Hip Thrust', muscle_group: 'Glúteos', equipment: 'Barra', difficulty: 'intermedio', movement_pattern: 'dominante_cadera' },
  { id: '2', name: 'Press de banca', muscle_group: 'Pecho', equipment: 'Barra', difficulty: 'intermedio', movement_pattern: 'empuje' },
  { id: '3', name: 'Curl con mancuernas', muscle_group: 'Bíceps', equipment: 'Mancuernas', difficulty: 'principiante', movement_pattern: 'traccion' },
  { id: '4', name: 'Sentadilla goblet', muscle_group: 'Cuádriceps', equipment: 'Mancuernas', difficulty: 'principiante', movement_pattern: 'dominante_rodilla' },
];

describe('filterExercises', () => {
  it('devuelve todo sin filtros', () => {
    expect(filterExercises(EX, {})).toHaveLength(4);
  });
  it('busca por nombre ignorando acentos y mayúsculas', () => {
    const r = filterExercises(EX, { query: 'biceps' });
    expect(r.map((e) => e.id)).toEqual(['3']);
  });
  it('filtra por grupo muscular (varios valores = OR)', () => {
    const r = filterExercises(EX, { muscleGroups: ['Glúteos', 'Pecho'] });
    expect(r.map((e) => e.id).sort()).toEqual(['1', '2']);
  });
  it('filtra por equipamiento', () => {
    const r = filterExercises(EX, { equipment: ['Mancuernas'] });
    expect(r.map((e) => e.id).sort()).toEqual(['3', '4']);
  });
  it('filtra por dificultad', () => {
    const r = filterExercises(EX, { difficulty: ['principiante'] });
    expect(r.map((e) => e.id).sort()).toEqual(['3', '4']);
  });
  it('filtra por patrón de movimiento', () => {
    const r = filterExercises(EX, { movementPattern: ['empuje'] });
    expect(r.map((e) => e.id)).toEqual(['2']);
  });
  it('combina filtros (AND entre dimensiones)', () => {
    const r = filterExercises(EX, { equipment: ['Mancuernas'], difficulty: ['principiante'], query: 'sentadilla' });
    expect(r.map((e) => e.id)).toEqual(['4']);
  });
  it('lista vacía si nada coincide', () => {
    expect(filterExercises(EX, { muscleGroups: ['Gemelos'] })).toEqual([]);
  });
});
