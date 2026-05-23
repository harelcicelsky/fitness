import { v4 as uuid } from "uuid";
import type { Exercise } from "../types";

type Seed = Omit<Exercise, "id" | "isCustom" | "archived">;

const compound: Seed[] = [
  { name: "Barbell Back Squat",   category: "compound", primaryMuscles: ["quads","glutes"],         equipment: "barbell",   isCardio: false },
  { name: "Front Squat",          category: "compound", primaryMuscles: ["quads","glutes"],         equipment: "barbell",   isCardio: false },
  { name: "Bulgarian Split Squat",category: "compound", primaryMuscles: ["quads","glutes"],         equipment: "dumbbell",  isCardio: false },
  { name: "Conventional Deadlift",category: "compound", primaryMuscles: ["hamstrings","back","glutes"], equipment: "barbell", isCardio: false },
  { name: "Sumo Deadlift",        category: "compound", primaryMuscles: ["glutes","hamstrings"],    equipment: "barbell",   isCardio: false },
  { name: "Romanian Deadlift",    category: "compound", primaryMuscles: ["hamstrings","glutes"],    equipment: "barbell",   isCardio: false },
  { name: "Hip Thrust",           category: "compound", primaryMuscles: ["glutes"],                 equipment: "barbell",   isCardio: false },
  { name: "Bench Press",          category: "compound", primaryMuscles: ["chest","triceps"],        equipment: "barbell",   isCardio: false },
  { name: "Incline Bench Press",  category: "compound", primaryMuscles: ["chest","shoulders"],      equipment: "barbell",   isCardio: false },
  { name: "Dumbbell Bench Press", category: "compound", primaryMuscles: ["chest","triceps"],        equipment: "dumbbell",  isCardio: false },
  { name: "Incline DB Press",     category: "compound", primaryMuscles: ["chest","shoulders"],      equipment: "dumbbell",  isCardio: false },
  { name: "Overhead Press",       category: "compound", primaryMuscles: ["shoulders","triceps"],    equipment: "barbell",   isCardio: false },
  { name: "Seated DB Shoulder Press", category: "compound", primaryMuscles: ["shoulders"],          equipment: "dumbbell",  isCardio: false },
  { name: "Push Press",           category: "compound", primaryMuscles: ["shoulders","triceps"],    equipment: "barbell",   isCardio: false },
  { name: "Pull-Up",              category: "compound", primaryMuscles: ["back","biceps"],          equipment: "bodyweight", isCardio: false },
  { name: "Chin-Up",              category: "compound", primaryMuscles: ["back","biceps"],          equipment: "bodyweight", isCardio: false },
  { name: "Lat Pulldown",         category: "compound", primaryMuscles: ["back"],                   equipment: "machine",   isCardio: false },
  { name: "Barbell Row",          category: "compound", primaryMuscles: ["back"],                   equipment: "barbell",   isCardio: false },
  { name: "Pendlay Row",          category: "compound", primaryMuscles: ["back"],                   equipment: "barbell",   isCardio: false },
  { name: "Seated Cable Row",     category: "compound", primaryMuscles: ["back"],                   equipment: "machine",   isCardio: false },
  { name: "T-Bar Row",            category: "compound", primaryMuscles: ["back"],                   equipment: "machine",   isCardio: false },
  { name: "Dip",                  category: "compound", primaryMuscles: ["chest","triceps"],        equipment: "bodyweight", isCardio: false },
  { name: "Leg Press",            category: "compound", primaryMuscles: ["quads","glutes"],         equipment: "machine",   isCardio: false },
  { name: "Hack Squat",           category: "compound", primaryMuscles: ["quads"],                  equipment: "machine",   isCardio: false },
];

const isolation: Seed[] = [
  { name: "Leg Curl",             category: "isolation", primaryMuscles: ["hamstrings"],            equipment: "machine",   isCardio: false },
  { name: "Leg Extension",        category: "isolation", primaryMuscles: ["quads"],                 equipment: "machine",   isCardio: false },
  { name: "Calf Raise",           category: "isolation", primaryMuscles: ["calves"],                equipment: "machine",   isCardio: false },
  { name: "Lateral Raise",        category: "isolation", primaryMuscles: ["shoulders"],             equipment: "dumbbell",  isCardio: false },
  { name: "Rear Delt Fly",        category: "isolation", primaryMuscles: ["shoulders","back"],      equipment: "dumbbell",  isCardio: false },
  { name: "Face Pull",            category: "isolation", primaryMuscles: ["shoulders","back"],      equipment: "cable",     isCardio: false },
  { name: "Cable Fly",            category: "isolation", primaryMuscles: ["chest"],                 equipment: "cable",     isCardio: false },
  { name: "Pec Deck",             category: "isolation", primaryMuscles: ["chest"],                 equipment: "machine",   isCardio: false },
  { name: "Bicep Curl (DB)",      category: "isolation", primaryMuscles: ["biceps"],                equipment: "dumbbell",  isCardio: false },
  { name: "Bicep Curl (Barbell)", category: "isolation", primaryMuscles: ["biceps"],                equipment: "barbell",   isCardio: false },
  { name: "Hammer Curl",          category: "isolation", primaryMuscles: ["biceps","forearms"],     equipment: "dumbbell",  isCardio: false },
  { name: "Preacher Curl",        category: "isolation", primaryMuscles: ["biceps"],                equipment: "machine",   isCardio: false },
  { name: "Tricep Pushdown",      category: "isolation", primaryMuscles: ["triceps"],               equipment: "cable",     isCardio: false },
  { name: "Overhead Tricep Ext.", category: "isolation", primaryMuscles: ["triceps"],               equipment: "dumbbell",  isCardio: false },
  { name: "Skull Crusher",        category: "isolation", primaryMuscles: ["triceps"],               equipment: "barbell",   isCardio: false },
  { name: "Cable Crunch",         category: "isolation", primaryMuscles: ["abs"],                   equipment: "cable",     isCardio: false },
  { name: "Hanging Leg Raise",    category: "isolation", primaryMuscles: ["abs"],                   equipment: "bodyweight", isCardio: false },
  { name: "Plank",                category: "isolation", primaryMuscles: ["abs"],                   equipment: "bodyweight", isCardio: false },
  { name: "Glute Kickback",       category: "isolation", primaryMuscles: ["glutes"],                equipment: "cable",     isCardio: false },
  { name: "Reverse Hyper",        category: "isolation", primaryMuscles: ["glutes","lower back"],   equipment: "machine",   isCardio: false },
];

const cardio: Seed[] = [
  { name: "Treadmill Run",        category: "cardio", primaryMuscles: ["cardio"], equipment: "treadmill", isCardio: true },
  { name: "Outdoor Run",          category: "cardio", primaryMuscles: ["cardio"], equipment: "none",      isCardio: true },
  { name: "Stationary Bike",      category: "cardio", primaryMuscles: ["cardio"], equipment: "bike",      isCardio: true },
  { name: "Outdoor Cycling",      category: "cardio", primaryMuscles: ["cardio"], equipment: "bike",      isCardio: true },
  { name: "Rowing",               category: "cardio", primaryMuscles: ["cardio"], equipment: "rower",     isCardio: true },
  { name: "Elliptical",           category: "cardio", primaryMuscles: ["cardio"], equipment: "elliptical", isCardio: true },
  { name: "Stair Climber",        category: "cardio", primaryMuscles: ["cardio"], equipment: "machine",   isCardio: true },
  { name: "Jump Rope",            category: "cardio", primaryMuscles: ["cardio"], equipment: "rope",      isCardio: true },
  { name: "Walk",                 category: "cardio", primaryMuscles: ["cardio"], equipment: "none",      isCardio: true },
  { name: "Swim",                 category: "cardio", primaryMuscles: ["cardio"], equipment: "pool",      isCardio: true },
];

export function seedExercises(): Exercise[] {
  return [...compound, ...isolation, ...cardio].map((s) => ({
    ...s,
    id: uuid(),
    isCustom: false,
    archived: false,
  }));
}
