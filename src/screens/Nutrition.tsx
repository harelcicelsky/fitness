import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { db } from "../db/schema";
import { compressImage } from "../lib/imageUtils";
import { analyzeMeal, computeTotals, getStoredConfig, setStoredConfig, clearStoredConfig } from "../lib/mealAnalysis";
import { MacroRing } from "../components/MacroRing";
import { formatDate } from "../lib/format";
import type { AnalysisResult, AiProvider } from "../lib/mealAnalysis";
import type { DetectedFood, Meal, MealType } from "../types";

// ============================================================================
// Main Nutrition Screen
// ============================================================================

export function Nutrition() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    imageData: string;
    analysis: AnalysisResult;
  } | null>(null);
  const [detailMealId, setDetailMealId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(() => !!getStoredConfig());

  // Pending image to process after key setup
  const pendingImage = useRef<File | Blob | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const todayMeals = useLiveQuery(
    () => db.meals.where("date").equals(todayStr).reverse().sortBy("createdAt"),
    [todayStr],
  );

  const todayTotals = useLiveQuery(async () => {
    const meals = await db.meals.where("date").equals(todayStr).toArray();
    if (meals.length === 0) return null;
    const allFoods = meals.flatMap((m) => m.foods);
    return computeTotals(allFoods);
  }, [todayStr]);

  // Daily targets (rough defaults — could be made configurable)
  const targets = { calories: 2200, protein: 160, carbs: 250, fat: 70 };

  const processImage = useCallback(async (file: File | Blob) => {
    setScanning(true);
    setScanError(null);
    try {
      const imageData = await compressImage(file);
      const analysis = await analyzeMeal(imageData);
      setResult({ imageData, analysis });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg === "NO_API_KEY") {
        pendingImage.current = file;
        setShowSetup(true);
      } else if (msg === "INVALID_API_KEY") {
        setScanError("Invalid API key. Tap the key icon to update it.");
      } else if (msg === "NO_FOODS_DETECTED") {
        setScanError("Couldn't detect any food in this image. Try a clearer photo.");
      } else {
        // Show the real error so we can debug
        setScanError(`Analysis failed: ${msg}`);
      }
    } finally {
      setScanning(false);
    }
  }, []);

  const handleImageReady = useCallback((file: File | Blob) => {
    processImage(file);
  }, [processImage]);

  const handleKeySetupDone = useCallback(() => {
    setShowSetup(false);
    setHasKey(!!getStoredConfig());
    // If we have a pending image, process it now
    if (pendingImage.current) {
      const img = pendingImage.current;
      pendingImage.current = null;
      processImage(img);
    }
  }, [processImage]);

  if (detailMealId) {
    return <MealDetail mealId={detailMealId} onClose={() => setDetailMealId(null)} />;
  }

  if (result) {
    return (
      <MealResultScreen
        imageData={result.imageData}
        analysis={result.analysis}
        onSave={() => { setResult(null); }}
        onScanAgain={() => setResult(null)}
      />
    );
  }

  return (
    <>
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(5,5,5,0.5) 0%, rgba(5,5,5,0.7) 40%, rgba(5,5,5,0.95) 80%, rgba(5,5,5,1) 100%)," +
            "radial-gradient(ellipse at 30% 10%, rgba(16,185,129,0.08) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-xl space-y-5 px-4 pb-28 pt-4">
        {/* ── Header ── */}
        <div className="relative">
          <div className="pointer-events-none absolute -right-16 -top-12 h-40 w-56 rounded-full bg-emerald-500/10 blur-[80px]" />
          <div className="relative flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Nutrition</h2>
              <p className="text-[11px] text-neutral-500">
                Scan meals to track your daily intake
              </p>
            </div>
            {/* API key settings button */}
            <button
              onClick={() => setShowSetup(true)}
              className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/5"
              title="AI Settings"
            >
              <KeyIcon className={`h-4 w-4 ${hasKey ? "text-emerald-400" : "text-neutral-600"}`} />
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {scanError && (
          <div className="flex items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 ring-1 ring-red-500/20">
            <span className="text-sm">⚠️</span>
            <p className="flex-1 text-xs text-red-300">{scanError}</p>
            <button
              onClick={() => setScanError(null)}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Daily Summary Card ── */}
        <div className="card relative overflow-hidden">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400">
                  Today's Intake
                </div>
                <div className="mt-0.5 text-2xl font-bold tabular-nums text-white">
                  {todayTotals?.calories ?? 0}
                  <span className="ml-1 text-sm font-medium text-neutral-500">
                    / {targets.calories} kcal
                  </span>
                </div>
              </div>
              {todayTotals && (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full ring-2 ring-emerald-500/30"
                  style={{
                    background: `conic-gradient(#34d399 ${Math.min((todayTotals.calories / targets.calories) * 360, 360)}deg, rgba(255,255,255,0.05) 0deg)`,
                  }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-emerald-400">
                    {Math.round((todayTotals.calories / targets.calories) * 100)}%
                  </div>
                </div>
              )}
            </div>

            {/* Macro rings row */}
            <div className="grid grid-cols-4 gap-2">
              <MacroRing
                value={todayTotals?.protein ?? 0}
                max={targets.protein}
                label="Protein"
                color="#34d399"
                size={72}
              />
              <MacroRing
                value={todayTotals?.carbs ?? 0}
                max={targets.carbs}
                label="Carbs"
                color="#60a5fa"
                size={72}
              />
              <MacroRing
                value={todayTotals?.fat ?? 0}
                max={targets.fat}
                label="Fat"
                color="#f59e0b"
                size={72}
              />
              <MacroRing
                value={todayTotals?.fiber ?? 0}
                max={30}
                label="Fiber"
                color="#a78bfa"
                size={72}
              />
            </div>
          </div>
        </div>

        {/* ── Scan Meal CTA ── */}
        <ScanButton onImageReady={handleImageReady} scanning={scanning} />

        {/* ── Today's Meals ── */}
        {(todayMeals ?? []).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-600">
                Today's Meals
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />
            </div>

            {(todayMeals ?? []).map((meal) => (
              <MealCard key={meal.id} meal={meal} onClick={() => setDetailMealId(meal.id)} />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {(todayMeals ?? []).length === 0 && !scanning && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <CameraIcon className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-neutral-300">No meals logged today</p>
            <p className="mt-1 max-w-xs text-xs text-neutral-500">
              Snap a photo of your meal and get instant nutritional breakdown powered by AI
            </p>
          </div>
        )}
      </div>

      {/* Scanning overlay */}
      {scanning && <ScanningOverlay />}

      {/* API key setup modal */}
      {showSetup && (
        <ApiKeySetup
          onDone={handleKeySetupDone}
          onClose={() => setShowSetup(false)}
        />
      )}
    </>
  );
}

// ============================================================================
// Scan Button — camera + gallery picker
// ============================================================================

function ScanButton({
  onImageReady,
  scanning,
}: {
  onImageReady: (file: File | Blob) => void;
  scanning: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageReady(file);
      setShowPicker(false);
    }
    // Reset so same file can be picked again
    e.target.value = "";
  };

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        disabled={scanning}
        className="group relative w-full overflow-hidden rounded-2xl py-5 transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.08) 50%, rgba(20,20,20,0.8) 100%)",
          border: "1px solid rgba(52,211,153,0.2)",
          boxShadow: "0 8px 32px -8px rgba(52,211,153,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl transition-all duration-500 group-hover:bg-emerald-400/20" />
        <div className="relative flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30">
            <CameraIcon className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white">Scan Meal</div>
            <div className="text-[11px] text-neutral-400">
              Take a photo or upload from gallery
            </div>
          </div>
          <ChevronIcon className="ml-auto h-5 w-5 text-neutral-600" />
        </div>
      </button>

      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {/* Source picker modal */}
      {showPicker &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPicker(false)}
          >
            <div
              className="w-full max-w-xl animate-[slideUp_0.3s_ease-out] space-y-2 rounded-t-3xl p-5 pb-8"
              style={{
                background: "linear-gradient(180deg, #1e1e1e 0%, #141414 100%)",
                paddingBottom: "calc(2rem + var(--safe-bottom, 0px))",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-700" />
              <h3 className="text-center text-base font-semibold text-white">
                Add Meal Photo
              </h3>
              <p className="mb-2 text-center text-xs text-neutral-500">
                Choose how to capture your meal
              </p>

              <button
                onClick={() => cameraRef.current?.click()}
                className="flex w-full items-center gap-4 rounded-2xl bg-neutral-900 p-4 ring-1 ring-neutral-800 transition hover:bg-neutral-800 active:scale-[0.98]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
                  <CameraIcon className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">Take Photo</div>
                  <div className="text-[11px] text-neutral-500">
                    Use your camera to capture the meal
                  </div>
                </div>
              </button>

              <button
                onClick={() => galleryRef.current?.click()}
                className="flex w-full items-center gap-4 rounded-2xl bg-neutral-900 p-4 ring-1 ring-neutral-800 transition hover:bg-neutral-800 active:scale-[0.98]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 ring-1 ring-sky-500/25">
                  <GalleryIcon className="h-5 w-5 text-sky-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">Upload Photo</div>
                  <div className="text-[11px] text-neutral-500">
                    Choose an image from your gallery
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowPicker(false)}
                className="mt-2 w-full rounded-xl py-3 text-sm font-medium text-neutral-400 transition hover:text-neutral-200"
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ============================================================================
// Scanning Overlay — premium loading animation
// ============================================================================

function ScanningOverlay() {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950/90 backdrop-blur-lg">
      {/* Pulsing rings */}
      <div className="relative mb-8">
        <div
          className="absolute -inset-8 rounded-full border border-emerald-500/20"
          style={{ animation: "scan-pulse 2s ease-in-out infinite" }}
        />
        <div
          className="absolute -inset-16 rounded-full border border-emerald-500/10"
          style={{ animation: "scan-pulse 2s ease-in-out 0.4s infinite" }}
        />
        <div
          className="absolute -inset-24 rounded-full border border-emerald-500/5"
          style={{ animation: "scan-pulse 2s ease-in-out 0.8s infinite" }}
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30">
          <ScanIcon className="h-10 w-10 text-emerald-400" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-white">Analyzing your meal</h3>
      <p className="mt-2 text-sm text-neutral-400">
        Detecting foods and estimating nutrition...
      </p>

      {/* Animated dots */}
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-emerald-400"
            style={{
              animation: "scan-dot 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Inject keyframes */}
      <style>{`
        @keyframes scan-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes scan-dot {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}

// ============================================================================
// Meal Result Screen — nutrition breakdown after scan
// ============================================================================

function MealResultScreen({
  imageData,
  analysis,
  onSave,
  onScanAgain,
}: {
  imageData: string;
  analysis: AnalysisResult;
  onSave: () => void;
  onScanAgain: () => void;
}) {
  const [foods, setFoods] = useState<DetectedFood[]>(analysis.foods);
  const [mealType, setMealType] = useState<MealType>(guesseMealType());
  const [saving, setSaving] = useState(false);
  const [showEnter, setShowEnter] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setShowEnter(true));
  }, []);

  const totals = computeTotals(foods);

  const handleRemoveFood = (index: number) => {
    setFoods((f) => f.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    const meal: Meal = {
      id: uuid(),
      date: new Date().toISOString().slice(0, 10),
      mealType,
      imageData,
      foods,
      totals,
      notes: "",
      createdAt: Date.now(),
    };
    await db.meals.add(meal);
    setSaving(false);
    onSave();
  };

  return (
    <div className="relative z-10 mx-auto max-w-xl px-4 pb-32 pt-2">
      {/* Image preview with gradient overlay */}
      <div
        className={`relative mb-5 overflow-hidden rounded-2xl transition-all duration-700 ${
          showEnter ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <img
          src={imageData}
          alt="Meal"
          className="aspect-[4/3] w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 40%, rgba(10,10,10,0.95) 100%)",
          }}
        />
        {/* Health score badge */}
        <div className="absolute bottom-3 left-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950/80 px-3 py-1.5 backdrop-blur ring-1 ring-white/10">
            <HealthScoreIcon score={totals.healthScore} />
            <span className="text-xs font-bold text-white">
              {totals.healthScore}/10
            </span>
            <span className="text-[10px] text-neutral-400">Health Score</span>
          </div>
        </div>
        {/* Back button */}
        <button
          onClick={onScanAgain}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950/60 backdrop-blur ring-1 ring-white/10 transition hover:bg-neutral-950/80"
        >
          <BackIcon className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Calorie headline */}
      <div
        className={`mb-5 text-center transition-all delay-100 duration-700 ${
          showEnter ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="text-4xl font-bold tabular-nums text-white">
          {totals.calories}
        </div>
        <div className="text-sm text-neutral-400">calories estimated</div>
      </div>

      {/* Macro rings */}
      <div
        className={`card mb-5 transition-all delay-200 duration-700 ${
          showEnter ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400">
          Macro Breakdown
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MacroRing value={totals.protein} max={60} label="Protein" color="#34d399" size={72} />
          <MacroRing value={totals.carbs} max={80} label="Carbs" color="#60a5fa" size={72} />
          <MacroRing value={totals.fat} max={30} label="Fat" color="#f59e0b" size={72} />
          <MacroRing value={totals.fiber} max={10} label="Fiber" color="#a78bfa" size={72} />
        </div>
      </div>

      {/* Detected foods list */}
      <div
        className={`space-y-2 transition-all delay-300 duration-700 ${
          showEnter ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
            Detected Foods
          </span>
          <span className="text-[10px] text-neutral-600">
            {foods.length} item{foods.length !== 1 ? "s" : ""}
          </span>
        </div>

        {foods.map((food, i) => (
          <div
            key={i}
            className="card flex items-center gap-3"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-white">
                  {food.name}
                </span>
                <span className="flex-none rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                  {Math.round(food.confidence * 100)}%
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-500">{food.portion}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-neutral-400">
                <span>{food.calories} kcal</span>
                <span className="text-emerald-400/80">{food.protein}g P</span>
                <span className="text-sky-400/80">{food.carbs}g C</span>
                <span className="text-amber-400/80">{food.fat}g F</span>
              </div>
            </div>
            <button
              onClick={() => handleRemoveFood(i)}
              className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-800 hover:text-red-400"
              aria-label="Remove food"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Detailed nutrients */}
      <div
        className={`card mt-5 transition-all delay-[400ms] duration-700 ${
          showEnter ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400">
          Detailed Nutrients
        </div>
        <div className="space-y-2.5">
          <NutrientRow label="Calories" value={`${totals.calories}`} unit="kcal" color="text-white" />
          <NutrientRow label="Protein" value={`${totals.protein}`} unit="g" color="text-emerald-400" />
          <NutrientRow label="Carbohydrates" value={`${totals.carbs}`} unit="g" color="text-sky-400" />
          <NutrientRow label="Fat" value={`${totals.fat}`} unit="g" color="text-amber-400" />
          <NutrientRow label="Fiber" value={`${totals.fiber}`} unit="g" color="text-violet-400" />
          <NutrientRow label="Sugar" value={`${totals.sugar}`} unit="g" color="text-rose-400" />
          <NutrientRow label="Sodium" value={`${totals.sodium}`} unit="mg" color="text-orange-400" />
        </div>
      </div>

      {/* Meal type selector */}
      <div
        className={`mt-5 transition-all delay-500 duration-700 ${
          showEnter ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
          Meal Type
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((t) => (
            <button
              key={t}
              onClick={() => setMealType(t)}
              className={`rounded-xl py-2.5 text-xs font-semibold capitalize ring-1 transition ${
                mealType === t
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
                  : "bg-neutral-900 text-neutral-400 ring-neutral-800 hover:bg-neutral-800"
              }`}
            >
              {MEAL_TYPE_EMOJI[t]} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons — sticky bottom, offset above NavBar */}
      <div
        className="fixed left-0 right-0 z-30"
        style={{
          bottom: "calc(64px + var(--safe-bottom, 0px))",
          paddingBottom: "0.5rem",
          background:
            "linear-gradient(to top, rgba(5,5,5,1) 40%, rgba(5,5,5,0.9) 70%, rgba(5,5,5,0) 100%)",
        }}
      >
        <div className="mx-auto flex max-w-xl gap-3 px-4 pt-4">
          <button
            onClick={onScanAgain}
            className="btn-ghost flex-1"
          >
            Scan Again
          </button>
          <button
            onClick={handleSave}
            disabled={saving || foods.length === 0}
            className="btn-primary flex-[2]"
          >
            {saving ? "Saving..." : "Save Meal"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Meal Card — compact card for the daily list
// ============================================================================

function MealCard({ meal, onClick }: { meal: Meal; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card flex w-full items-center gap-3 text-left transition-all hover:border-white/10 hover:brightness-110 active:scale-[0.98]"
    >
      <img
        src={meal.imageData}
        alt="Meal"
        className="h-16 w-16 flex-none rounded-xl object-cover ring-1 ring-white/10"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold capitalize text-white">
            {MEAL_TYPE_EMOJI[meal.mealType]} {meal.mealType}
          </span>
          <span className="text-[10px] text-neutral-600">
            {new Date(meal.createdAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-neutral-500">
          {meal.foods.map((f) => f.name).join(", ")}
        </div>
        <div className="mt-1 flex gap-3 text-[11px]">
          <span className="font-semibold text-white">{meal.totals.calories} kcal</span>
          <span className="text-emerald-400/80">{meal.totals.protein}g P</span>
          <span className="text-sky-400/80">{meal.totals.carbs}g C</span>
          <span className="text-amber-400/80">{meal.totals.fat}g F</span>
        </div>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 flex-none text-neutral-600">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

// ============================================================================
// Meal Detail — full view of a saved meal
// ============================================================================

function MealDetail({ mealId, onClose }: { mealId: string; onClose: () => void }) {
  const meal = useLiveQuery(() => db.meals.get(mealId), [mealId]);

  if (!meal) {
    return <div className="p-6 text-center text-neutral-500">Loading...</div>;
  }

  const handleDelete = async () => {
    if (!confirm("Delete this meal?")) return;
    await db.meals.delete(mealId);
    onClose();
  };

  return (
    <div className="relative z-10 mx-auto max-w-xl px-4 pb-28 pt-2">
      {/* Image */}
      <div className="relative mb-5 overflow-hidden rounded-2xl">
        <img src={meal.imageData} alt="Meal" className="aspect-[4/3] w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 40%, rgba(10,10,10,0.95) 100%)" }}
        />
        <button
          onClick={onClose}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950/60 backdrop-blur ring-1 ring-white/10"
        >
          <BackIcon className="h-4 w-4 text-white" />
        </button>
        <div className="absolute bottom-3 left-3">
          <span className="text-lg font-bold capitalize text-white">
            {MEAL_TYPE_EMOJI[meal.mealType]} {meal.mealType}
          </span>
          <div className="text-xs text-neutral-400">
            {formatDate(meal.date)} at{" "}
            {new Date(meal.createdAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* Calorie headline */}
      <div className="mb-5 text-center">
        <div className="text-4xl font-bold tabular-nums text-white">{meal.totals.calories}</div>
        <div className="text-sm text-neutral-400">calories</div>
      </div>

      {/* Macros */}
      <div className="card mb-5">
        <div className="grid grid-cols-4 gap-2">
          <MacroRing value={meal.totals.protein} max={60} label="Protein" color="#34d399" size={72} />
          <MacroRing value={meal.totals.carbs} max={80} label="Carbs" color="#60a5fa" size={72} />
          <MacroRing value={meal.totals.fat} max={30} label="Fat" color="#f59e0b" size={72} />
          <MacroRing value={meal.totals.fiber} max={10} label="Fiber" color="#a78bfa" size={72} />
        </div>
      </div>

      {/* Foods */}
      <div className="space-y-2">
        {meal.foods.map((food, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{food.name}</span>
              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                {Math.round(food.confidence * 100)}%
              </span>
            </div>
            <div className="text-[11px] text-neutral-500">{food.portion}</div>
            <div className="mt-1.5 flex gap-3 text-[11px] text-neutral-400">
              <span>{food.calories} kcal</span>
              <span className="text-emerald-400/80">{food.protein}g P</span>
              <span className="text-sky-400/80">{food.carbs}g C</span>
              <span className="text-amber-400/80">{food.fat}g F</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed nutrients */}
      <div className="card mt-5">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400">
          Full Nutrients
        </div>
        <div className="space-y-2.5">
          <NutrientRow label="Calories" value={`${meal.totals.calories}`} unit="kcal" color="text-white" />
          <NutrientRow label="Protein" value={`${meal.totals.protein}`} unit="g" color="text-emerald-400" />
          <NutrientRow label="Carbohydrates" value={`${meal.totals.carbs}`} unit="g" color="text-sky-400" />
          <NutrientRow label="Fat" value={`${meal.totals.fat}`} unit="g" color="text-amber-400" />
          <NutrientRow label="Fiber" value={`${meal.totals.fiber}`} unit="g" color="text-violet-400" />
          <NutrientRow label="Sugar" value={`${meal.totals.sugar}`} unit="g" color="text-rose-400" />
          <NutrientRow label="Sodium" value={`${meal.totals.sodium}`} unit="mg" color="text-orange-400" />
          <NutrientRow label="Health Score" value={`${meal.totals.healthScore}`} unit="/10" color="text-emerald-400" />
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="mt-5 w-full rounded-xl py-3 text-sm font-medium text-red-400/60 ring-1 ring-red-500/10 transition hover:bg-red-500/5 hover:text-red-400"
      >
        Delete Meal
      </button>
    </div>
  );
}

// ============================================================================
// Nutrient Row
// ============================================================================

function NutrientRow({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>
        {value}
        <span className="ml-0.5 text-[10px] font-normal text-neutral-600">{unit}</span>
      </span>
    </div>
  );
}

// ============================================================================
// Health Score icon
// ============================================================================

function HealthScoreIcon({ score }: { score: number }) {
  const color =
    score >= 7 ? "#34d399" : score >= 4 ? "#f59e0b" : "#ef4444";
  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black"
      style={{
        background: `${color}20`,
        color,
        boxShadow: `0 0 8px ${color}30`,
      }}
    >
      {score >= 7 ? "A" : score >= 4 ? "B" : "C"}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

const MEAL_TYPE_EMOJI: Record<MealType, string> = {
  breakfast: "☀️",
  lunch: "🍝",
  dinner: "🌙",
  snack: "🍪",
};

function guesseMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

// ============================================================================
// API Key Setup Modal
// ============================================================================

function ApiKeySetup({
  onDone,
  onClose,
}: {
  onDone: () => void;
  onClose: () => void;
}) {
  const existing = getStoredConfig();
  const [provider, setProvider] = useState<AiProvider>(existing?.provider ?? "gemini");
  const [key, setKey] = useState(existing?.apiKey ?? "");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Please enter an API key.");
      return;
    }
    setTesting(true);
    setError(null);

    // Quick validation — just save it, the actual test happens on first scan
    setStoredConfig({ provider, apiKey: trimmed });
    setTesting(false);
    onDone();
  };

  const handleDisconnect = () => {
    clearStoredConfig();
    setKey("");
    onDone();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl space-y-4 rounded-t-3xl p-5"
        style={{
          background: "linear-gradient(180deg, #1e1e1e 0%, #141414 100%)",
          paddingBottom: "calc(2rem + var(--safe-bottom, 0px))",
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-neutral-700" />

        <div className="text-center">
          <h3 className="text-base font-semibold text-white">AI Meal Analysis</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Connect an AI provider to analyze your meal photos
          </p>
        </div>

        {/* Provider selection */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setProvider("gemini")}
            className={`rounded-xl p-3 text-left ring-1 transition ${
              provider === "gemini"
                ? "bg-emerald-500/10 ring-emerald-500"
                : "bg-neutral-900 ring-neutral-800 hover:bg-neutral-800"
            }`}
          >
            <div className="text-sm font-semibold text-white">Google Gemini</div>
            <div className="mt-0.5 text-[10px] text-emerald-400 font-semibold">FREE</div>
          </button>
          <button
            onClick={() => setProvider("openai")}
            className={`rounded-xl p-3 text-left ring-1 transition ${
              provider === "openai"
                ? "bg-emerald-500/10 ring-emerald-500"
                : "bg-neutral-900 ring-neutral-800 hover:bg-neutral-800"
            }`}
          >
            <div className="text-sm font-semibold text-white">OpenAI</div>
            <div className="mt-0.5 text-[10px] text-neutral-500">Paid API</div>
          </button>
        </div>

        {/* Instructions */}
        <div className="rounded-xl bg-neutral-900/60 p-3 ring-1 ring-neutral-800">
          {provider === "gemini" ? (
            <div className="space-y-1.5 text-xs text-neutral-400">
              <p className="font-medium text-neutral-300">How to get a free key:</p>
              <p>1. Go to <span className="font-mono text-emerald-400">aistudio.google.com/apikey</span></p>
              <p>2. Sign in with your Google account</p>
              <p>3. Click <span className="text-neutral-300">"Create API Key"</span></p>
              <p>4. Copy and paste it below</p>
            </div>
          ) : (
            <div className="space-y-1.5 text-xs text-neutral-400">
              <p className="font-medium text-neutral-300">How to get a key:</p>
              <p>1. Go to <span className="font-mono text-sky-400">platform.openai.com/api-keys</span></p>
              <p>2. Create a new secret key</p>
              <p>3. Copy and paste it below</p>
            </div>
          )}
        </div>

        {/* API key input */}
        <input
          type="password"
          value={key}
          onChange={(e) => { setKey(e.target.value); setError(null); }}
          placeholder={provider === "gemini" ? "AIza..." : "sk-..."}
          className="input text-sm"
          autoComplete="off"
        />

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {existing && (
            <button onClick={handleDisconnect} className="btn-ghost flex-1 text-red-400">
              Disconnect
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={testing || !key.trim()}
            className="btn-primary flex-[2]"
          >
            {testing ? "Testing..." : "Connect"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 text-center text-sm text-neutral-500 transition hover:text-neutral-300"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ============================================================================
// Icons
// ============================================================================

function KeyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function GalleryIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function ScanIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}

function BackIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
