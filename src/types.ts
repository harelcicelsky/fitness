export type ExerciseCategory = "compound" | "isolation" | "cardio" | "mobility";
export type BlockType = "single" | "superset" | "circuit";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: string[];
  equipment: string;
  isCardio: boolean;
  isCustom: boolean;
  archived: boolean;
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  startedAt: number;
  endedAt: number | null;
  templateId: string | null;
  notes: string;
}

export interface Block {
  id: string;
  workoutId: string;
  order: number;
  type: BlockType;
  exerciseIds: string[];
  endedAt: number | null;
}

export interface SetEntry {
  id: string;
  workoutId: string;
  blockId: string;
  exerciseId: string;
  order: number;
  weightKg: number;
  reps: number;
  rpe: number | null;
  rir: number | null;
  isWarmup: boolean;
  parentSetId: string | null;
  completedAt: number;
}

export interface CardioSession {
  id: string;
  workoutId: string;
  blockId: string;
  exerciseId: string;
  durationSec: number;
  distanceM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  calories: number | null;
  notes: string;
  completedAt: number;
}

export interface BodyWeightEntry {
  id: string;
  date: string;
  weightKg: number;
  recordedAt: number;
}

export interface TemplateBlock {
  type: BlockType;
  exerciseIds: string[];
  defaultSets?: number;
  defaultReps?: number;
  defaultWeightKg?: number;
}

export interface Template {
  id: string;
  name: string;
  blocks: TemplateBlock[];
}

export interface Settings {
  id: "settings";
  theme: "system" | "light" | "dark";
  restTimerDefaultSec: number;
  autoStartRestTimer: boolean;
  useRpeOrRir: "rpe" | "rir" | "off";
  fridayReminder: boolean;
}

export type SplitType =
  | "full-body"
  | "upper-lower"
  | "ppl"
  | "ppl-x2"
  | "bro-split"
  | "custom";

export type Goal = "strength" | "hypertrophy" | "general" | "conditioning";
export type Experience = "beginner" | "intermediate" | "advanced";

// Nutrition / weight phase — drives the bodyweight-trend coaching.
//   cut       = losing fat, expected weight trend: ↓ ~0.5 kg/wk
//   bulk      = gaining muscle, expected: ↑ ~0.3 kg/wk
//   recomp    = simultaneous fat-loss / muscle-gain, expected: ~flat
//   maintain  = holding current weight
export type WeightPhase = "cut" | "bulk" | "recomp" | "maintain";

export type SkinTone = "tone1" | "tone2" | "tone3" | "tone4" | "tone5";
export type HairStyle =
  | "bald"
  | "buzzed"
  | "short"
  | "long"
  | "ponytail"
  | "bun"
  | "curly"
  | "mohawk";
export type Build = "masc" | "fem";

export interface AvatarLook {
  skinTone: SkinTone;
  hairStyle: HairStyle;
  hairColor: string;     // hex
  outfitColor: string;   // hex (shorts)
  build: Build;
}

export interface UserProfile {
  id: "profile";
  completedAt: number | null;
  name: string;                  // user's first name
  workoutsPerWeek: number;       // 1-7
  splitType: SplitType;
  splitPattern: string;          // e.g. "FULL", "AB", "ABC", "ABCABC", custom letters
  goal: Goal;
  experience: Experience;
  sessionLengthMin: number;      // target minutes per session
  avatar: AvatarLook;
  // — nutrition phase + body composition targets, drive coach recommendations —
  phase: WeightPhase;
  startingWeightKg: number | null;   // optional — captured at onboarding
  targetWeightKg: number | null;     // optional — what they're working toward
  heightCm: number | null;           // optional — used for BMI hints
}

// ============================================================================
// Meal / Nutrition types
// ============================================================================

export interface DetectedFood {
  name: string;
  portion: string;          // e.g. "1 cup", "150g", "1 medium"
  confidence: number;       // 0-1
  calories: number;
  protein: number;          // grams
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;           // mg
}

export interface MealNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  healthScore: number;      // 1-10
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Meal {
  id: string;
  date: string;             // YYYY-MM-DD
  mealType: MealType;
  imageData: string;        // base64 data-url (compressed JPEG)
  foods: DetectedFood[];
  totals: MealNutrition;
  notes: string;
  createdAt: number;
}

export type ScreenName = "today" | "history" | "progress" | "nutrition" | "templates" | "settings";
