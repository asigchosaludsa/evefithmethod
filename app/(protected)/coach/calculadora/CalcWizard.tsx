'use client';

import { useActionState, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  calculateEnergy,
  calculateMacros,
  type EnergyResult,
  type ActivityLevel,
  type Sex,
} from '@/domain/nutrition/energy';
import { assignCalorieTarget } from '@/lib/coach/calorie-calc-actions';
import { initialActionState } from '@/lib/auth/action-state';
import { cn } from '@/lib/utils/cn';
import type { StudentOption } from './page';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Datos', 'Actividad', 'Objetivo', 'Resultado'];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary',   label: 'Sedentaria',   desc: 'Sin ejercicio o trabajo sentada' },
  { value: 'light',       label: 'Ligera',       desc: '1–3 días de ejercicio/semana' },
  { value: 'moderate',    label: 'Moderada',     desc: '3–5 días de ejercicio/semana' },
  { value: 'active',      label: 'Activa',       desc: '6–7 días de ejercicio intenso' },
  { value: 'very_active', label: 'Muy activa',   desc: 'Trabajo físico intenso + entreno diario' },
];

const GOAL_PRESETS = [
  { label: 'Bajar grasa',   value: -15 },
  { label: 'Mantener',      value: 0 },
  { label: 'Ganar músculo', value: 10 },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardForm {
  studentId: string;
  sex: Sex;
  age: string;
  weight_kg: string;
  height_cm: string;
  bodyfat_pct: string;
  activity: ActivityLevel;
  adjustmentPct: number;
  proteinMult: number;
  fatMult: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGoalMessage(adj: number, kgPerWeek: number): string {
  const abs = Math.abs(kgPerWeek).toFixed(2);
  if (adj === 0) return 'Mantenimiento — recomposición corporal lenta';
  if (adj < -20) return `≈ ${abs} kg/sem — déficit agresivo ⚠ riesgo de perder músculo`;
  if (adj < -10) return `≈ ${abs} kg/sem — déficit óptimo para perder grasa`;
  if (adj < 0)   return `≈ ${abs} kg/sem — déficit ligero, pérdida gradual`;
  if (adj > 24)  return `≈ +${abs} kg/sem — superávit alto ⚠ mayor acumulación de grasa`;
  if (adj > 14)  return `≈ +${abs} kg/sem — superávit moderado, buena ganancia`;
  return `≈ +${abs} kg/sem — lean bulk controlado`;
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function CalcWizard({ students }: { students: StudentOption[] }) {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<EnergyResult | null>(null);
  const [form, setForm] = useState<WizardForm>({
    studentId: '',
    sex: 'female',
    age: '',
    weight_kg: '',
    height_cm: '',
    bodyfat_pct: '',
    activity: 'moderate',
    adjustmentPct: -15,
    proteinMult: 2.0,
    fatMult: 0.9,
  });

  const [assignState, assignAction] = useActionState(assignCalorieTarget, initialActionState);

  function handleStudentChange(id: string) {
    const s = students.find((st) => st.id === id);
    if (!s) { setForm((f) => ({ ...f, studentId: id })); return; }
    const ageVal = s.date_of_birth
      ? String(new Date().getFullYear() - new Date(s.date_of_birth).getFullYear())
      : '';
    setForm((f) => ({
      ...f,
      studentId: id,
      age: ageVal,
      weight_kg: s.current_weight_kg != null ? String(s.current_weight_kg) : f.weight_kg,
      height_cm: s.height_cm != null ? String(s.height_cm) : f.height_cm,
    }));
  }

  function goNext() {
    if (step === 2) {
      const r = calculateEnergy({
        sex: form.sex,
        age: Number(form.age),
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
        bodyfat_pct: form.bodyfat_pct ? Number(form.bodyfat_pct) : undefined,
        activity: form.activity,
        adjustment_pct: form.adjustmentPct,
        protein_multiplier: form.proteinMult,
        fat_multiplier: form.fatMult,
      });
      setResult(r);
    }
    setStep((s) => s + 1);
  }

  const canProceed0 = form.age !== '' && form.weight_kg !== '' && form.height_cm !== '';

  // ─── Step 0: Datos ────────────────────────────────────────────────────────────

  const step0 = (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Alumna (opcional)</label>
        <select
          value={form.studentId}
          onChange={(e) => handleStudentChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">— Modo anónimo —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Sexo</label>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['female', 'male'] as Sex[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm((f) => ({ ...f, sex: s }))}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                form.sex === s ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-foreground'
              )}
            >
              {s === 'female' ? 'Mujer' : 'Hombre'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { key: 'age',       label: 'Edad',   unit: 'años', min: 14,  max: 99 },
            { key: 'weight_kg', label: 'Peso',   unit: 'kg',   min: 30,  max: 250 },
            { key: 'height_cm', label: 'Altura', unit: 'cm',   min: 100, max: 220 },
          ] as { key: keyof WizardForm; label: string; unit: string; min: number; max: number }[]
        ).map(({ key, label, unit, min, max }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs text-muted">{label}</label>
            <div className="relative">
              <input
                type="number" min={min} max={max}
                value={form[key] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder="—"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-muted">
          % grasa corporal{' '}
          <span className="text-xs italic">(opcional — activa Katch-McArdle)</span>
        </label>
        <div className="relative w-36">
          <input
            type="number" min={5} max={50}
            value={form.bodyfat_pct}
            onChange={(e) => setForm((f) => ({ ...f, bodyfat_pct: e.target.value }))}
            placeholder="—"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">%</span>
        </div>
      </div>
    </div>
  );

  // ─── Step 1: Actividad ───────────────────────────────────────────────────────

  const step1 = (
    <div className="space-y-2">
      <p className="text-sm text-muted mb-4">Nivel de actividad habitual de la alumna.</p>
      {ACTIVITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setForm((f) => ({ ...f, activity: opt.value }))}
          className={cn(
            'w-full flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
            form.activity === opt.value
              ? 'border-primary bg-primary/10'
              : 'border-border bg-surface hover:border-primary/40'
          )}
        >
          <div
            className={cn(
              'mt-0.5 size-4 shrink-0 rounded-full border-2 transition-colors',
              form.activity === opt.value ? 'border-primary bg-primary' : 'border-muted'
            )}
          />
          <div>
            <p className={cn('text-sm font-semibold', form.activity === opt.value ? 'text-primary' : 'text-foreground')}>
              {opt.label}
            </p>
            <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );

  // ─── Step 2: Objetivo ─────────────────────────────────────────────────────────

  const estKgPerWeek = (() => {
    const w = Number(form.weight_kg) || 65;
    const tdeeEst = Math.round(w * 33);
    const target = Math.round(tdeeEst * (1 + form.adjustmentPct / 100));
    return parseFloat((-((tdeeEst - target) * 7) / 7700).toFixed(2));
  })();

  const adjColor =
    form.adjustmentPct < 0 ? '#E24B4A' : form.adjustmentPct === 0 ? '#EF9F27' : '#1D9E75';

  const step2 = (
    <div className="space-y-5">
      {/* Silhouette preview in step 2 */}
      <div className="flex justify-center">
        <BodySilhouette sex={form.sex} adjustmentPct={form.adjustmentPct} compact />
      </div>

      <div className="flex gap-2">
        {GOAL_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setForm((f) => ({ ...f, adjustmentPct: p.value }))}
            className={cn(
              'flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-colors',
              form.adjustmentPct === p.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface/50 p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-foreground">Ajuste</span>
          <span className="text-2xl font-bold tabular-nums transition-colors" style={{ color: adjColor }}>
            {form.adjustmentPct > 0 ? `+${form.adjustmentPct}` : form.adjustmentPct}%
          </span>
        </div>
        <input
          type="range" min={-25} max={30} step={1}
          value={form.adjustmentPct}
          onChange={(e) => setForm((f) => ({ ...f, adjustmentPct: Number(e.target.value) }))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted">
          <span>−25% (déficit)</span><span>+30% (superávit alto)</span>
        </div>
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors',
            form.adjustmentPct < -20 || form.adjustmentPct > 24
              ? 'bg-[#E24B4A]/10 text-[#E24B4A]'
              : 'bg-border/20 text-muted'
          )}
        >
          <span>{form.adjustmentPct < 0 ? '↓' : form.adjustmentPct === 0 ? '⚖' : '↑'}</span>
          <span>{getGoalMessage(form.adjustmentPct, estKgPerWeek)}</span>
        </div>
      </div>
    </div>
  );

  // ─── Nav bar ─────────────────────────────────────────────────────────────────

  const navBar = (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
      {step > 0 ? (
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" /> Atrás
        </button>
      ) : <div />}
      {step < 3 && (
        <button
          type="button"
          onClick={goNext}
          disabled={step === 0 && !canProceed0}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
            step === 0 && !canProceed0
              ? 'opacity-40 cursor-not-allowed bg-border text-muted'
              : 'bg-primary text-white hover:bg-primary/90'
          )}
        >
          {step === 2 ? 'Calcular' : 'Siguiente'} <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Progress bar */}
      <div className="flex border-b border-border">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-3 gap-1">
            <div className={cn('h-1 w-4/5 rounded-full transition-colors duration-300', i <= step ? 'bg-primary' : 'bg-border')} />
            <span className={cn('text-xs font-medium transition-colors duration-300', i <= step ? 'text-primary' : 'text-muted')}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Sliding panels */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${step * 25}%)`, width: '400%' }}
        >
          {[
            step0, step1, step2,
            <ResultStep
              key="result"
              result={result}
              form={form}
              setForm={setForm}
              assignState={assignState}
              assignAction={assignAction}
              students={students}
            />,
          ].map((panel, i) => (
            <div key={i} className="p-6" style={{ width: '25%' }}>
              {panel}
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6">{navBar}</div>
    </div>
  );
}

// ─── ResultStep ────────────────────────────────────────────────────────────────

function ResultStep({
  result, form, setForm, assignState, assignAction, students,
}: {
  result: EnergyResult | null;
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  assignState: { error?: string; success?: string };
  assignAction: (formData: FormData) => void;
  students: StudentOption[];
}) {
  const [displayKcal, setDisplayKcal] = useState(0);
  const [ringPct, setRingPct] = useState(0);
  const [openInfo, setOpenInfo] = useState<'protein' | 'fat' | null>(null);
  // Ties the override to a specific result object — becomes null automatically when result changes
  const [override, setOverride] = useState<{ result: EnergyResult; kcal: number } | null>(null);

  const manualKcal = override?.result === result ? override.kcal : null;
  const finalKcal = manualKcal ?? result?.target_kcal ?? 0;

  const macros = result
    ? calculateMacros({
        target_kcal: finalKcal,
        weight_kg: Number(form.weight_kg),
        protein_multiplier: form.proteinMult,
        fat_multiplier: form.fatMult,
      })
    : null;

  // Count-up animation when result first arrives
  // The first RAF tick naturally sets values to 0 (eased=0 at progress=0)
  useEffect(() => {
    if (!result) return;
    let rafId: number;
    let startTs: number | null = null;
    const DURATION = 1200;
    const target = result.target_kcal;
    const fillTarget = Math.min(1, result.target_kcal / result.tdee);

    function animate(ts: number) {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayKcal(Math.round(eased * target));
      setRingPct(eased * fillTarget);
      if (progress < 1) rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [result]);

  if (!result || !macros) {
    return <p className="text-muted text-sm text-center py-8">Calculando…</p>;
  }

  // Recompute adjustment when slider overrides the calculated kcal
  const finalAdjPct = manualKcal !== null
    ? Math.round(((finalKcal - result.tdee) / result.tdee) * 100)
    : result.adjustment_pct;
  const finalKgPerWeek = manualKcal !== null
    ? parseFloat((-((result.tdee - finalKcal) * 7) / 7700).toFixed(2))
    : result.kg_per_week;

  const isDeficit = finalAdjPct < 0;
  const isSurplus = finalAdjPct > 0;
  const goalColor = isDeficit ? '#E24B4A' : isSurplus ? '#1D9E75' : '#EF9F27';
  const goalLabel = isDeficit ? 'Déficit' : isSurplus ? 'Superávit' : 'Mantenimiento';
  const goalIcon = isDeficit ? '↓' : isSurplus ? '↑' : '⚖';

  const R = 60;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const dashOffset = CIRCUMFERENCE * (1 - ringPct);

  const totalKcal = macros.protein_g * 4 + macros.fat_g * 9 + macros.carbs_g * 4;
  const pPct = totalKcal > 0 ? Math.round((macros.protein_g * 4 / totalKcal) * 100) : 0;
  const fPct = totalKcal > 0 ? Math.round((macros.fat_g * 9 / totalKcal) * 100) : 0;
  const cPct = Math.max(0, 100 - pPct - fPct);

  const student = students.find((s) => s.id === form.studentId);

  const sliderMin = Math.max(800, result.target_kcal - 500);
  const sliderMax = result.target_kcal + 800;

  function handleSlider(val: number) {
    if (!result) return;
    setOverride(val === result.target_kcal ? null : { result, kcal: val });
    setDisplayKcal(val);
    setRingPct(Math.min(1, val / result.tdee));
  }

  return (
    <div className="space-y-5">

      {/* Safety warnings — contextual explanations */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.includes('bajo_piso') && (
            <WarningBanner
              severity="danger"
              title="Calorías peligrosamente bajas"
              consequence="→ metabolismo lento + pérdida muscular + desajuste hormonal"
              detail={`Con menos de ${form.sex === 'female' ? '1 200' : '1 500'} kcal el cuerpo activa el "modo ahorro": baja el metabolismo basal, degrada músculo para obtener energía y altera hormonas clave como la tiroides, el cortisol y el estrógeno. El peso baja al principio, pero el cuerpo se vuelve cada vez más resistente y al salir de la dieta recupera todo más rápido. Sube el ajuste a −15 % o menos para un déficit sostenible.`}
            />
          )}
          {result.warnings.includes('ritmo_agresivo') && !result.warnings.includes('superavit_agresivo') && (
            <WarningBanner
              severity="warn"
              title={isDeficit ? 'Déficit agresivo — vas a perder músculo' : 'Ritmo de cambio muy rápido'}
              consequence={
                isDeficit
                  ? '→ de cada 5 kg perdidos, ~2 serán músculo (no grasa)'
                  : '→ el exceso de calorías no puede convertirse en músculo tan rápido'
              }
              detail={
                isDeficit
                  ? 'Al perder más del 1 % de tu peso por semana el cuerpo no puede extraer toda la energía de la grasa sola: empieza a degradar músculo (catabolismo). Bajarás de peso pero perderás fuerza y tu metabolismo caerá. Cuando termines el proceso recuperarás el peso mucho más fácil. El rango seguro es −15 % a −20 % de tu TDEE.'
                  : 'El músculo solo puede crecer ~0.5 kg/mes en condiciones ideales. Si las calorías llegan más rápido de lo que el músculo puede procesarlas, el exceso va directo a grasa. Reduce el superávit a +5–10 % para un bulk más limpio.'
              }
            />
          )}
          {result.warnings.includes('superavit_agresivo') && (
            <WarningBanner
              severity="warn"
              title="Superávit alto — más grasa que músculo"
              consequence="→ ganarás ~3 partes de grasa por cada parte de músculo"
              detail="El músculo solo puede sintetizarse a ~0.5 kg/mes en condiciones ideales. Todo lo que el músculo no puede procesar se convierte directamente en tejido graso. Con un superávit mayor al 20 % terminarás el bulk más gordo que musculoso y deberás hacer un corte largo para recuperar la definición. Para ganar músculo eficientemente apunta a +5–10 % de tu TDEE (lean bulk)."
            />
          )}
        </div>
      )}

      {/* Ring + badge + TMB/TDEE */}
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative shrink-0">
          <svg viewBox="0 0 160 160" className="w-40 h-40 -rotate-90">
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--color-border, #2a2d35)" strokeWidth="14" />
            <circle
              cx="80" cy="80" r={R}
              fill="none" stroke={goalColor} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.4s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground tabular-nums">{displayKcal.toLocaleString()}</span>
            <span className="text-xs text-muted">kcal/día</span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: `${goalColor}22`, color: goalColor }}
          >
            <span>{goalIcon}</span>
            {goalLabel}
            {finalAdjPct !== 0 && (
              <span className="font-normal opacity-75">
                {finalAdjPct > 0 ? `+${finalAdjPct}` : finalAdjPct}%
              </span>
            )}
          </div>
          {finalKgPerWeek !== 0 && (
            <p className="text-xs text-muted pl-1">≈ {Math.abs(finalKgPerWeek).toFixed(2)} kg/semana</p>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg border border-border bg-surface/50 px-3 py-2">
              <p className="text-xs text-muted">TMB ({result.formula === 'katch' ? 'Katch' : 'Mifflin'})</p>
              <p className="text-lg font-bold text-foreground">{result.bmr.toLocaleString()}</p>
              <p className="text-xs text-muted">kcal</p>
            </div>
            <div className="rounded-lg border border-border bg-surface/50 px-3 py-2">
              <p className="text-xs text-muted">GET (TDEE)</p>
              <p className="text-lg font-bold text-foreground">{result.tdee.toLocaleString()}</p>
              <p className="text-xs text-muted">kcal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Body silhouette + calorie fine-tune slider */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-surface/40 p-4">
        <BodySilhouette sex={form.sex} adjustmentPct={finalAdjPct} compact={false} />

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium text-foreground">Ajuste fino de calorías</p>
            {manualKcal && (
              <button
                type="button"
                onClick={() => {
                  setOverride(null);
                  setDisplayKcal(result.target_kcal);
                  setRingPct(Math.min(1, result.target_kcal / result.tdee));
                }}
                className="text-[10px] text-muted hover:text-primary transition-colors"
              >
                ↺ restaurar
              </button>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground tabular-nums">{finalKcal.toLocaleString()}</span>
            <span className="text-xs text-muted">kcal</span>
            {manualKcal && (
              <span className="text-xs ml-1" style={{ color: goalColor }}>
                {manualKcal > result.target_kcal ? `+${manualKcal - result.target_kcal}` : `${manualKcal - result.target_kcal}`}
              </span>
            )}
          </div>

          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={25}
            value={finalKcal}
            onChange={(e) => handleSlider(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>{sliderMin.toLocaleString()}</span>
            <span>{sliderMax.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Macro bars */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Macros</p>

        <MacroRow
          label="Proteína" grams={macros.protein_g} kcal={macros.protein_g * 4} pct={pPct} color="#E24B4A"
          infoOpen={openInfo === 'protein'}
          onInfo={() => setOpenInfo(openInfo === 'protein' ? null : 'protein')}
          infoContent={
            <div className="space-y-3">
              <p className="text-xs text-muted">
                <strong className="text-foreground">Fórmula:</strong>{' '}
                {form.proteinMult.toFixed(1)} g/kg × {form.weight_kg} kg = <strong className="text-foreground">{macros.protein_g} g</strong>
              </p>
              <p className="text-xs text-muted">Rango ISSN: 1.6–2.2 g/kg para entrenamiento de fuerza.</p>
              <SliderRow
                label="Multiplicador" value={form.proteinMult} min={1.6} max={2.2} step={0.1}
                color="#E24B4A" minLabel="1.6 (moderado)" maxLabel="2.2 (alto)"
                onChange={(v) => setForm((f) => ({ ...f, proteinMult: v }))}
              />
            </div>
          }
        />

        <MacroRow
          label="Grasa" grams={macros.fat_g} kcal={macros.fat_g * 9} pct={fPct} color="#EF9F27"
          infoOpen={openInfo === 'fat'}
          onInfo={() => setOpenInfo(openInfo === 'fat' ? null : 'fat')}
          infoContent={
            <div className="space-y-3">
              <p className="text-xs text-muted">
                <strong className="text-foreground">Fórmula:</strong>{' '}
                {form.fatMult.toFixed(2)} g/kg × {form.weight_kg} kg = <strong className="text-foreground">{macros.fat_g} g</strong>
              </p>
              <p className="text-xs text-muted">Mínimo hormonal: 0.8–1.0 g/kg (Academy Nutr Diet, 2022).</p>
              <SliderRow
                label="Multiplicador" value={form.fatMult} min={0.8} max={1.0} step={0.05}
                color="#EF9F27" minLabel="0.8 (mínimo)" maxLabel="1.0 (alto)"
                onChange={(v) => setForm((f) => ({ ...f, fatMult: v }))}
              />
            </div>
          }
        />

        <MacroRow
          label="Carbohidratos" grams={macros.carbs_g} kcal={macros.carbs_g * 4} pct={cPct} color="#1D9E75"
          infoOpen={false} onInfo={undefined}
          infoContent={
            <p className="text-xs text-muted">
              Residual: ({finalKcal} − {macros.protein_g * 4} − {macros.fat_g * 9}) ÷ 4 = <strong className="text-foreground">{macros.carbs_g} g</strong>
            </p>
          }
        />
      </div>

      {/* Assign form */}
      {student && (
        <form action={assignAction} className="pt-2 border-t border-border space-y-3">
          <input type="hidden" name="sex" value={form.sex} />
          <input type="hidden" name="age" value={form.age} />
          <input type="hidden" name="weight_kg" value={form.weight_kg} />
          <input type="hidden" name="height_cm" value={form.height_cm} />
          {form.bodyfat_pct && <input type="hidden" name="bodyfat_pct" value={form.bodyfat_pct} />}
          <input type="hidden" name="activity" value={form.activity} />
          <input type="hidden" name="adjustment_pct" value={form.adjustmentPct} />
          <input type="hidden" name="protein_multiplier" value={form.proteinMult} />
          <input type="hidden" name="fat_multiplier" value={form.fatMult} />
          <input type="hidden" name="student_id" value={form.studentId} />
          {manualKcal && <input type="hidden" name="manual_kcal" value={manualKcal} />}

          {assignState.error && (
            <p className="rounded-lg border border-[#E24B4A]/30 bg-[#E24B4A]/10 px-3 py-2 text-sm text-[#E24B4A]">
              {assignState.error}
            </p>
          )}
          {assignState.success && (
            <p className="rounded-lg border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-3 py-2 text-sm text-[#1D9E75]">
              {assignState.success}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Asignar a {student.name}
            {manualKcal ? ` — ${finalKcal.toLocaleString()} kcal` : ''}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── WarningBanner ────────────────────────────────────────────────────────────

function WarningBanner({
  severity,
  title,
  consequence,
  detail,
}: {
  severity: 'warn' | 'danger';
  title: string;
  consequence: string;
  detail: string;
}) {
  const [open, setOpen] = useState(false);
  const borderColor  = severity === 'danger' ? '#E24B4A' : '#EF9F27';
  const labelColor   = severity === 'danger' ? '#E24B4A' : '#EF9F27';
  const bgClass      = severity === 'danger' ? 'bg-[#E24B4A]/10 border-[#E24B4A]/40' : 'bg-[#EF9F27]/10 border-[#EF9F27]/40';
  const tagBg        = severity === 'danger' ? 'bg-[#E24B4A]/20 text-[#E24B4A]' : 'bg-[#EF9F27]/20 text-[#EF9F27]';
  void borderColor;

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm ${bgClass}`}>
      {/* Header — always visible */}
      <div className="flex items-start gap-2">
        <span className="mt-px shrink-0 text-base leading-none" style={{ color: labelColor }}>
          {severity === 'danger' ? '🚨' : '⚠️'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight" style={{ color: labelColor }}>{title}</p>
          {/* Consequence pill — always visible */}
          <p className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${tagBg}`}>
            {consequence}
          </p>
        </div>
      </div>
      {/* Expandable explanation */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 text-xs underline underline-offset-2 transition-opacity opacity-60 hover:opacity-100"
        style={{ color: labelColor }}
      >
        {open ? 'Ocultar explicación ▲' : 'Entender por qué ▼'}
      </button>
      {open && (
        <p className="mt-2 text-xs text-muted leading-relaxed border-t border-current/10 pt-2">
          {detail}
        </p>
      )}
    </div>
  );
}

// ─── MacroRow ─────────────────────────────────────────────────────────────────

function MacroRow({
  label, grams, kcal, pct, color, infoOpen, onInfo, infoContent,
}: {
  label: string; grams: number; kcal: number; pct: number; color: string;
  infoOpen: boolean; onInfo?: () => void; infoContent: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="text-sm text-foreground">{label}</span>
          {onInfo && (
            <button
              type="button" onClick={onInfo} title="Ver fórmula y ajustar"
              className="size-4 rounded-full border border-border text-muted hover:border-primary hover:text-primary text-[9px] leading-none flex items-center justify-center transition-colors"
            >
              i
            </button>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-foreground tabular-nums">{grams}</span>
          <span className="text-xs text-muted">g</span>
          <span className="text-xs text-muted ml-1.5">({kcal} kcal)</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      {infoOpen && (
        <div className="rounded-lg border border-border bg-surface p-3 mt-1">{infoContent}</div>
      )}
    </div>
  );
}

// ─── SliderRow ────────────────────────────────────────────────────────────────

function SliderRow({
  label, value, min, max, step, color, minLabel, maxLabel, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  color: string; minLabel: string; maxLabel: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-foreground">{value.toFixed(value < 1 ? 2 : 1)} g/kg</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full" style={{ accentColor: color }}
      />
      <div className="flex justify-between text-[10px] text-muted">
        <span>{minLabel}</span><span>{maxLabel}</span>
      </div>
    </div>
  );
}

// ─── BodySilhouette ───────────────────────────────────────────────────────────
// Organic bezier-curve silhouettes inspired by standard body-composition charts.
// All shapes are SVG path elements so they look like real human outlines rather
// than stacked geometry. Fill color transitions via CSS; shape updates on each
// slider step (25 kcal ≈ 1-2 % adj change — imperceptibly small per step).

function BodySilhouette({ sex, adjustmentPct, compact }: {
  sex: Sex; adjustmentPct: number; compact: boolean;
}) {
  const adj = Math.max(-25, Math.min(30, adjustmentPct));
  const t   = (adj + 25) / 55; // 0 = very lean (-25%), 1 = heavy (+30%)
  const cx  = 50;
  const li  = (a: number, b: number) => a + (b - a) * t;

  const fill =
    adj < -15 ? '#60A5FA' : adj < 0 ? '#A78BFA' :
    adj === 0  ? '#34D399' : adj < 15 ? '#FBBF24' : '#F87171';

  const stateLabel =
    adj < -20 ? 'Corte extremo' : adj < -10 ? 'Déficit activo' :
    adj < 0   ? 'Déficit ligero' : adj === 0 ? 'Mantenimiento' :
    adj < 15  ? 'Lean bulk' : adj < 25 ? 'Volumen' : 'Volumen alto';

  const fs = { fill, transition: 'fill 0.45s ease' };
  const svgW = compact ? 52 : 68;
  const svgH = compact ? 108 : 148;

  // Fixed Y grid (viewBox 0 0 100 232)
  const hc=18, nb=42, sh=50, ap=70, ch=82, wa=100, hi=118, cr=132, mt=157, kn=176, ca=200, an=215, ft=224;

  if (sex === 'female') {
    const nW  = li(4.5, 6.5);
    const sW  = li(14,  20);     // shoulder half-width
    const aW  = li(10,  14);     // armpit width
    const cW  = li(12,  18);     // chest/bust half-width
    const wW  = li(8,   16);     // waist half-width
    const hW  = li(17,  27);     // hip half-width
    const bC  = li(9,   22);     // belly control point
    const tW  = li(9,   18);     // thigh half-width (total, divided between legs)
    const gp  = 3;
    const kW  = li(5.5, 10);
    const cW2 = li(4.5, 8.5);
    const aN  = li(2.5, 3.5);
    const arW = li(4.5, 7);

    // Full torso outline (neck → shoulders → chest → waist → hips → crotch, mirrored)
    const torso = `
      M ${cx+nW} ${nb}
      C ${cx+nW+4} ${nb+2} ${cx+sW+3} ${sh-7} ${cx+sW} ${sh}
      C ${cx+sW+2} ${sh+10} ${cx+aW+2} ${ap-6} ${cx+aW} ${ap}
      Q ${cx+cW+3} ${ap+10} ${cx+cW} ${ch}
      C ${cx+cW-1} ${ch+13} ${cx+bC} ${wa-4} ${cx+wW} ${wa}
      C ${cx+bC} ${wa+10} ${cx+hW+3} ${hi-7} ${cx+hW} ${hi}
      C ${cx+hW} ${hi+9} ${cx+gp+tW+2} ${cr-5} ${cx+gp+tW} ${cr}
      Q ${cx} ${cr+4} ${cx-gp-tW} ${cr}
      C ${cx-gp-tW-2} ${cr-5} ${cx-hW} ${hi+9} ${cx-hW} ${hi}
      C ${cx-hW-3} ${hi-7} ${cx-bC} ${wa+10} ${cx-wW} ${wa}
      C ${cx-bC} ${wa-4} ${cx-cW+1} ${ch+13} ${cx-cW} ${ch}
      Q ${cx-cW-3} ${ap+10} ${cx-aW} ${ap}
      C ${cx-aW-2} ${ap-6} ${cx-sW-2} ${sh+10} ${cx-sW} ${sh}
      C ${cx-sW-3} ${sh-7} ${cx-nW-4} ${nb+2} ${cx-nW} ${nb} Z`;

    const leg = (lc: number) => {
      const hw = tW / 2;
      return `M ${lc+hw} ${cr} Q ${lc+hw+1} ${mt} ${lc+kW} ${kn} Q ${lc+cW2} ${kn+15} ${lc+cW2} ${ca} Q ${lc+aN} ${ca+12} ${lc+aN} ${an} L ${lc+aN+2} ${ft} L ${lc-aN-1} ${ft} L ${lc-aN} ${an} Q ${lc-cW2} ${ca+12} ${lc-cW2} ${ca} Q ${lc-kW-1} ${kn+15} ${lc-kW} ${kn} Q ${lc-hw-1} ${mt} ${lc-hw} ${cr} Z`;
    };

    const arm = (ix: number, side: 1 | -1) => {
      const ox = ix + side * arW;
      const eY = wa + 5; const hY = eY + 40;
      return `M ${ix} ${sh+5} Q ${ox} ${sh+12} ${ox} ${eY} Q ${ox} ${hY-8} ${ox-side*2} ${hY} L ${ix+side} ${hY} Q ${ix} ${hY-8} ${ix} ${eY} Q ${ix} ${sh+12} ${ix} ${sh+5} Z`;
    };

    return (
      <div className="flex flex-col items-center gap-1">
        <svg viewBox="0 0 100 232" width={svgW} height={svgH}>
          <ellipse cx={cx} cy={hc} rx={10} ry={12} style={fs} />
          <path d={torso} style={fs} />
          <path d={leg(cx+gp+tW/2)} style={fs} />
          <path d={leg(cx-gp-tW/2)} style={fs} />
          <path d={arm(cx+sW+0.5,  1)} style={fs} />
          <path d={arm(cx-sW-0.5, -1)} style={fs} />
        </svg>
        <span className="text-[10px] font-semibold" style={{ color: fill, transition: 'color 0.45s' }}>{stateLabel}</span>
      </div>
    );
  }

  // ── Male ──────────────────────────────────────────────────────────────────────
  const nW  = li(6,   9);
  const sW  = li(18,  27);   // broad shoulders
  const aW  = li(14,  18);
  const cW  = li(16,  24);
  const wW  = li(11,  21);   // less hourglass than female
  const hW  = li(14,  22);   // hips narrower than shoulders
  const bC  = li(13,  27);   // belly protrudes more with surplus
  const tW  = li(10,  19);
  const gp  = 3.5;
  const kW  = li(6,   11);
  const cW2 = li(5.5, 9.5);
  const aN  = li(2.8, 4);
  const arW = li(5.5, 8.5);

  const torso = `
    M ${cx+nW} ${nb}
    C ${cx+nW+5} ${nb+2} ${cx+sW+4} ${sh-7} ${cx+sW} ${sh}
    C ${cx+sW+2} ${sh+10} ${cx+aW+3} ${ap-5} ${cx+aW} ${ap}
    C ${cx+aW+1} ${ap+15} ${cx+bC} ${wa-6} ${cx+wW} ${wa}
    C ${cx+bC} ${wa+10} ${cx+hW+3} ${hi-7} ${cx+hW} ${hi}
    C ${cx+hW} ${hi+8} ${cx+gp+tW+3} ${cr-5} ${cx+gp+tW} ${cr}
    Q ${cx} ${cr+4} ${cx-gp-tW} ${cr}
    C ${cx-gp-tW-3} ${cr-5} ${cx-hW} ${hi+8} ${cx-hW} ${hi}
    C ${cx-hW-3} ${hi-7} ${cx-bC} ${wa+10} ${cx-wW} ${wa}
    C ${cx-bC} ${wa-6} ${cx-aW-1} ${ap+15} ${cx-aW} ${ap}
    C ${cx-aW-3} ${ap-5} ${cx-sW-2} ${sh+10} ${cx-sW} ${sh}
    C ${cx-sW-4} ${sh-7} ${cx-nW-5} ${nb+2} ${cx-nW} ${nb} Z`;

  const leg = (lc: number) => {
    const hw = tW / 2;
    return `M ${lc+hw} ${cr} Q ${lc+hw+1} ${mt} ${lc+kW} ${kn} Q ${lc+cW2+1} ${kn+15} ${lc+cW2} ${ca} Q ${lc+aN+1} ${ca+13} ${lc+aN} ${an} L ${lc+aN+3} ${ft} L ${lc-aN-1} ${ft} L ${lc-aN} ${an} Q ${lc-cW2-1} ${ca+13} ${lc-cW2} ${ca} Q ${lc-kW-1} ${kn+15} ${lc-kW} ${kn} Q ${lc-hw-1} ${mt} ${lc-hw} ${cr} Z`;
  };

  const arm = (ix: number, side: 1 | -1) => {
    const ox = ix + side * arW;
    const eY = wa + 2; const hY = eY + 45;
    return `M ${ix} ${sh+5} Q ${ox} ${sh+12} ${ox} ${eY} Q ${ox} ${hY-10} ${ox-side*2} ${hY} L ${ix+side} ${hY} Q ${ix} ${hY-10} ${ix} ${eY} Q ${ix} ${sh+12} ${ix} ${sh+5} Z`;
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 232" width={svgW} height={svgH}>
        <ellipse cx={cx} cy={hc} rx={11} ry={12} style={fs} />
        <path d={torso} style={fs} />
        <path d={leg(cx+gp+tW/2)} style={fs} />
        <path d={leg(cx-gp-tW/2)} style={fs} />
        <path d={arm(cx+sW+0.5,  1)} style={fs} />
        <path d={arm(cx-sW-0.5, -1)} style={fs} />
      </svg>
      <span className="text-[10px] font-semibold" style={{ color: fill, transition: 'color 0.45s' }}>{stateLabel}</span>
    </div>
  );
}
