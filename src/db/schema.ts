import Dexie, { type Table } from "dexie";
import type {
  Exercise,
  Workout,
  Block,
  SetEntry,
  CardioSession,
  BodyWeightEntry,
  Template,
  Settings,
  UserProfile,
} from "../types";
import { seedExercises } from "./seed";

export class WorkoutDB extends Dexie {
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  blocks!: Table<Block, string>;
  sets!: Table<SetEntry, string>;
  cardioSessions!: Table<CardioSession, string>;
  bodyWeight!: Table<BodyWeightEntry, string>;
  templates!: Table<Template, string>;
  settings!: Table<Settings, string>;
  profile!: Table<UserProfile, string>;

  constructor() {
    super("workout-tracker");
    // Note: booleans are not indexed by Dexie. Filter them in memory.
    this.version(1).stores({
      exercises: "id, name, category",
      workouts: "id, date, startedAt",
      blocks: "id, workoutId, order",
      sets: "id, workoutId, blockId, exerciseId, parentSetId, completedAt",
      cardioSessions: "id, workoutId, blockId, exerciseId, completedAt",
      bodyWeight: "id, date, recordedAt",
      templates: "id, name",
      settings: "id",
    });
    // v2: blocks gain `endedAt` (per-exercise "done" marker).
    this.version(2)
      .stores({
        exercises: "id, name, category",
        workouts: "id, date, startedAt",
        blocks: "id, workoutId, order",
        sets: "id, workoutId, blockId, exerciseId, parentSetId, completedAt",
        cardioSessions: "id, workoutId, blockId, exerciseId, completedAt",
        bodyWeight: "id, date, recordedAt",
        templates: "id, name",
        settings: "id",
      })
      .upgrade(async (tx) => {
        await tx
          .table("blocks")
          .toCollection()
          .modify((b: { endedAt?: number | null }) => {
            if (b.endedAt === undefined) b.endedAt = null;
          });
      });

    // v3: add user training profile (single-row table).
    this.version(3).stores({
      exercises: "id, name, category",
      workouts: "id, date, startedAt",
      blocks: "id, workoutId, order",
      sets: "id, workoutId, blockId, exerciseId, parentSetId, completedAt",
      cardioSessions: "id, workoutId, blockId, exerciseId, completedAt",
      bodyWeight: "id, date, recordedAt",
      templates: "id, name",
      settings: "id",
      profile: "id",
    });

    // v4: profile gains avatar customization.
    this.version(4)
      .stores({
        exercises: "id, name, category",
        workouts: "id, date, startedAt",
        blocks: "id, workoutId, order",
        sets: "id, workoutId, blockId, exerciseId, parentSetId, completedAt",
        cardioSessions: "id, workoutId, blockId, exerciseId, completedAt",
        bodyWeight: "id, date, recordedAt",
        templates: "id, name",
        settings: "id",
        profile: "id",
      })
      .upgrade(async (tx) => {
        await tx
          .table("profile")
          .toCollection()
          .modify((p: { avatar?: unknown }) => {
            if (!p.avatar) {
              p.avatar = {
                skinTone: "tone3",
                hairStyle: "short",
                hairColor: "#3a2d20",
                outfitColor: "#1f2937",
                build: "masc",
              };
            }
          });
      });

    // v5: profile gains nutrition phase + body composition targets.
    this.version(5)
      .stores({
        exercises: "id, name, category",
        workouts: "id, date, startedAt",
        blocks: "id, workoutId, order",
        sets: "id, workoutId, blockId, exerciseId, parentSetId, completedAt",
        cardioSessions: "id, workoutId, blockId, exerciseId, completedAt",
        bodyWeight: "id, date, recordedAt",
        templates: "id, name",
        settings: "id",
        profile: "id",
      })
      .upgrade(async (tx) => {
        await tx
          .table("profile")
          .toCollection()
          .modify((p: Record<string, unknown>) => {
            if (p.phase === undefined) p.phase = "maintain";
            if (p.startingWeightKg === undefined) p.startingWeightKg = null;
            if (p.targetWeightKg === undefined) p.targetWeightKg = null;
            if (p.heightCm === undefined) p.heightCm = null;
          });
      });
  }
}

export const db = new WorkoutDB();

let initPromise: Promise<void> | null = null;
export function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = init();
  return initPromise;
}

async function init() {
  const exCount = await db.exercises.count();
  if (exCount === 0) {
    await db.exercises.bulkAdd(seedExercises());
  }
  const settings = await db.settings.get("settings");
  if (!settings) {
    await db.settings.put({
      id: "settings",
      theme: "dark",
      restTimerDefaultSec: 120,
      autoStartRestTimer: false,
      useRpeOrRir: "rpe",
    });
  }
}
