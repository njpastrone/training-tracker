/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWeeklyVolume } from './coach';
import type { Exercise, Workout } from '../types/workout';

const workout = (date: string, ...exercises: Partial<Exercise>[]): Workout => ({
  id: date, date, rawInput: '', muscleGroups: ['chest'], createdAt: 't',
  exercises: exercises.map((e, i) => ({ id: `${date}-${i}`, name: 'x', muscleGroup: 'chest', ...e })),
});

test('a set counts 1 for the primary muscle and ½ for each secondary', () => {
  const week = analyzeWeeklyVolume([
    workout('2026-09-29',
      { exerciseId: 'bench-press', sets: 4 }, // chest; triceps, shoulders
      { exerciseId: 'close-grip-bench-press', sets: 2 }, // triceps; chest, shoulders
      { exerciseId: 'lateral-raise', sets: 3 }, // shoulders only
      { name: 'Landmine Press', muscleGroup: 'shoulders', sets: 2 }), // no catalog id: stored group only
  ], new Date('2026-09-30T12:00:00'));
  assert.equal(week.chest.totalSets, 4 + 1);
  assert.equal(week.triceps.totalSets, 2 + 2);
  assert.equal(week.shoulders.totalSets, 3 + 2 + 2 + 1);
  assert.equal(week.chest.frequency, 1); // frequency stays primary-only (the workout's groups)
  assert.equal(week.triceps.frequency, 0);
});
