import { v4 as uuid } from "uuid";
import { db } from "./schema";
import type {
  Block,
  BlockType,
  BodyWeightEntry,
  CardioSession,
  SetEntry,
  Workout,
} from "../types";

const todayIso = () => new Date().toISOString().slice(0, 10);

export async function getActiveWorkout(): Promise<Workout | undefined> {
  const all = await db.workouts.toArray();
  return all.find((w) => w.endedAt === null);
}

export async function startWorkout(opts?: { templateId?: string | null }): Promise<Workout> {
  const w: Workout = {
    id: uuid(),
    date: todayIso(),
    startedAt: Date.now(),
    endedAt: null,
    templateId: opts?.templateId ?? null,
    notes: "",
  };
  await db.workouts.add(w);
  return w;
}

export async function endWorkout(workoutId: string) {
  await db.workouts.update(workoutId, { endedAt: Date.now() });
}

export async function deleteWorkout(workoutId: string) {
  await db.transaction(
    "rw",
    db.workouts,
    db.blocks,
    db.sets,
    db.cardioSessions,
    async () => {
      await db.sets.where("workoutId").equals(workoutId).delete();
      await db.cardioSessions.where("workoutId").equals(workoutId).delete();
      await db.blocks.where("workoutId").equals(workoutId).delete();
      await db.workouts.delete(workoutId);
    },
  );
}

export async function getBlocks(workoutId: string): Promise<Block[]> {
  const blocks = await db.blocks.where("workoutId").equals(workoutId).toArray();
  return blocks.sort((a, b) => a.order - b.order);
}

export async function addBlock(
  workoutId: string,
  type: BlockType,
  exerciseIds: string[],
): Promise<Block> {
  const existing = await db.blocks.where("workoutId").equals(workoutId).count();
  const block: Block = {
    id: uuid(),
    workoutId,
    order: existing,
    type,
    exerciseIds,
    endedAt: null,
  };
  await db.blocks.add(block);
  return block;
}

export async function endBlock(blockId: string) {
  await db.blocks.update(blockId, { endedAt: Date.now() });
}

export async function reopenBlock(blockId: string) {
  await db.blocks.update(blockId, { endedAt: null });
}

export async function deleteBlock(blockId: string) {
  await db.transaction("rw", db.blocks, db.sets, db.cardioSessions, async () => {
    await db.sets.where("blockId").equals(blockId).delete();
    await db.cardioSessions.where("blockId").equals(blockId).delete();
    await db.blocks.delete(blockId);
  });
}

export async function getSets(workoutId: string): Promise<SetEntry[]> {
  return db.sets.where("workoutId").equals(workoutId).toArray();
}

export async function addSet(
  input: Omit<SetEntry, "id" | "completedAt"> & { completedAt?: number },
): Promise<SetEntry> {
  const set: SetEntry = {
    ...input,
    id: uuid(),
    completedAt: input.completedAt ?? Date.now(),
  };
  await db.sets.add(set);
  return set;
}

export async function updateSet(id: string, patch: Partial<SetEntry>) {
  await db.sets.update(id, patch);
}

export async function deleteSet(id: string) {
  // also delete any drop sets that reference this as parent
  await db.transaction("rw", db.sets, async () => {
    await db.sets.where("parentSetId").equals(id).delete();
    await db.sets.delete(id);
  });
}

export async function getCardio(workoutId: string): Promise<CardioSession[]> {
  return db.cardioSessions.where("workoutId").equals(workoutId).toArray();
}

export async function addCardio(
  input: Omit<CardioSession, "id" | "completedAt"> & { completedAt?: number },
): Promise<CardioSession> {
  const session: CardioSession = {
    ...input,
    id: uuid(),
    completedAt: input.completedAt ?? Date.now(),
  };
  await db.cardioSessions.add(session);
  return session;
}

export async function updateCardio(id: string, patch: Partial<CardioSession>) {
  await db.cardioSessions.update(id, patch);
}

export async function deleteCardio(id: string) {
  await db.cardioSessions.delete(id);
}

export async function getLastSetForExercise(
  exerciseId: string,
  beforeWorkoutId?: string,
): Promise<SetEntry | undefined> {
  const sets = await db.sets
    .where("exerciseId")
    .equals(exerciseId)
    .reverse()
    .sortBy("completedAt");
  return sets.find((s) => s.workoutId !== beforeWorkoutId && !s.parentSetId);
}

// ============================================================================
// Body weight log
// ============================================================================

export async function addBodyWeight(weightKg: number): Promise<BodyWeightEntry> {
  const entry: BodyWeightEntry = {
    id: uuid(),
    date: todayIso(),
    weightKg,
    recordedAt: Date.now(),
  };
  await db.bodyWeight.add(entry);
  return entry;
}

export async function deleteBodyWeight(id: string) {
  await db.bodyWeight.delete(id);
}

export async function getLatestBodyWeight(): Promise<BodyWeightEntry | undefined> {
  const all = await db.bodyWeight.toArray();
  return all.sort((a, b) => b.recordedAt - a.recordedAt)[0];
}
