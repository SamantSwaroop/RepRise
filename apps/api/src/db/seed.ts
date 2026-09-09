import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { exercises } from './schema.js';

const SEED_EXERCISES: { name: string; muscleGroup: typeof exercises.$inferInsert['muscleGroup']; equipment: typeof exercises.$inferInsert['equipment'] }[] = [
  // Chest
  { name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
  { name: 'Dumbbell Bench Press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { name: 'Incline Barbell Press', muscleGroup: 'chest', equipment: 'barbell' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { name: 'Cable Fly', muscleGroup: 'chest', equipment: 'cable' },
  { name: 'Push-Up', muscleGroup: 'chest', equipment: 'bodyweight' },

  // Back
  { name: 'Deadlift', muscleGroup: 'back', equipment: 'barbell' },
  { name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell' },
  { name: 'Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell' },
  { name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable' },
  { name: 'Pull-Up', muscleGroup: 'back', equipment: 'bodyweight' },
  { name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable' },

  // Shoulders
  { name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell' },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { name: 'Face Pull', muscleGroup: 'shoulders', equipment: 'cable' },

  // Legs
  { name: 'Barbell Squat', muscleGroup: 'legs', equipment: 'barbell' },
  { name: 'Front Squat', muscleGroup: 'legs', equipment: 'barbell' },
  { name: 'Leg Press', muscleGroup: 'legs', equipment: 'machine' },
  { name: 'Romanian Deadlift', muscleGroup: 'legs', equipment: 'barbell' },
  { name: 'Leg Curl', muscleGroup: 'legs', equipment: 'machine' },
  { name: 'Leg Extension', muscleGroup: 'legs', equipment: 'machine' },
  { name: 'Calf Raise', muscleGroup: 'legs', equipment: 'machine' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'legs', equipment: 'dumbbell' },

  // Arms
  { name: 'Barbell Curl', muscleGroup: 'arms', equipment: 'barbell' },
  { name: 'Dumbbell Curl', muscleGroup: 'arms', equipment: 'dumbbell' },
  { name: 'Tricep Pushdown', muscleGroup: 'arms', equipment: 'cable' },
  { name: 'Skull Crusher', muscleGroup: 'arms', equipment: 'barbell' },
  { name: 'Hammer Curl', muscleGroup: 'arms', equipment: 'dumbbell' },

  // Core
  { name: 'Plank', muscleGroup: 'core', equipment: 'bodyweight' },
  { name: 'Hanging Leg Raise', muscleGroup: 'core', equipment: 'bodyweight' },
  { name: 'Cable Crunch', muscleGroup: 'core', equipment: 'cable' },

  // Cardio
  { name: 'Running', muscleGroup: 'cardio', equipment: null },
  { name: 'Rowing Machine', muscleGroup: 'cardio', equipment: 'machine' },
];

async function seed() {
  const client = postgres(process.env.DATABASE_URL!);
  const seedDb = drizzle(client);

  console.log('🌱  Seeding exercises…');

  // Upsert: skip if exercises already exist.
  const existing = await seedDb.select({ id: exercises.id }).from(exercises).limit(1);
  if (existing.length > 0) {
    console.log('ℹ️  Exercises already seeded — skipping.');
    await client.end();
    return;
  }

  await seedDb.insert(exercises).values(
    SEED_EXERCISES.map((e) => ({
      name: e.name,
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      userId: null, // global exercises
    })),
  );

  console.log(`✅  Seeded ${SEED_EXERCISES.length} exercises.`);
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
