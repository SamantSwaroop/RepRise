import * as SQLite from 'expo-sqlite';

// ─── Database Instance ─────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('reprise.db');
  await runMigrations(_db);
  return _db;
}

// ─── Migrations ────────────────────────────────────────────────────

async function runMigrations(db: SQLite.SQLiteDatabase) {
  // Enable WAL mode for better concurrent performance
  await db.execAsync('PRAGMA journal_mode = WAL;');
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY NOT NULL,
      workout_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY NOT NULL,
      workout_exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'normal',
      weight_kg REAL,
      reps INTEGER,
      rpe REAL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_started ON workouts(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id);
    CREATE INDEX IF NOT EXISTS idx_ws_we ON workout_sets(workout_exercise_id);
  `);
}
