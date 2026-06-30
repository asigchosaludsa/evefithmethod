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

// ─── Main wizard ──────────────────────────────────────────────────────────────

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

  // ─── Step 0: Datos ───────────────────────────────────────────────────────────

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
                form.sex === s
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted hover:text-foreground'
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
                type="number"
                min={min}
                max={max}
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
          <span className="text-xs italic">(opcional — activa fórmula Katch-McArdle)</span>
        </label>
        <div className="relative w-36">
          <input
            type="number"
            min={5}
            max={50}
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
  const isAggressiveGoal = form.adjustmentPct < -20 || form.adjustmentPct > 14;

  const step2 = (
    <div className="space-y-5">
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
          <span className="text-sm text-foreground font-medium">Ajuste</span>
          <span
            className="text-2xl font-bold tabular-nums transition-colors"
            style={{
              color: form.adjustmentPct < 0 ? '#E24B4A' : form.adjustmentPct === 0 ? '#EF9F27' : '#1D9E75',
            }}
          >
            {form.adjustmentPct > 0 ? `+${form.adjustmentPct}` : form.adjustmentPct}%
          </span>
        </div>
        <input
          type="range"
          min={-25}
          max={15}
          step={1}
          value={form.adjustmentPct}
          onChange={(e) => setForm((f) => ({ ...f, adjustmentPct: Number(e.target.value) }))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted">
          <span>−25% (déficit)</span><span>+15% (superávit)</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
            isAggressiveGoal ? 'bg-[#E24B4A]/10 text-[#E24B4A]' : 'bg-border/20 text-muted'
          )}
        >
          <span>{form.adjustmentPct < 0 ? '↓' : form.adjustmentPct === 0 ? '⚖' : '↑'}</span>
          <span>
            {form.adjustmentPct === 0
              ? 'Mantener peso'
              : `≈ ${Math.abs(estKgPerWeek).toFixed(2)} kg/semana${isAggressiveGoal ? ' — ritmo agresivo' : ''}`}
          </span>
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
      ) : (
        <div />
      )}
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
            <div
              className={cn(
                'h-1 w-4/5 rounded-full transition-colors duration-300',
                i <= step ? 'bg-primary' : 'bg-border'
              )}
            />
            <span
              className={cn(
                'text-xs font-medium transition-colors duration-300',
                i <= step ? 'text-primary' : 'text-muted'
              )}
            >
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
            step0,
            step1,
            step2,
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
  result,
  form,
  setForm,
  assignState,
  assignAction,
  students,
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

  // Derive live macros from current multipliers (recalculates when sliders move)
  const macros =
    result
      ? calculateMacros({
          target_kcal: result.target_kcal,
          weight_kg: Number(form.weight_kg),
          protein_multiplier: form.proteinMult,
          fat_multiplier: form.fatMult,
        })
      : null;

  // Count-up + ring fill animation triggered when result arrives
  useEffect(() => {
    if (!result) return;
    setDisplayKcal(0);
    setRingPct(0);
    let rafId: number;
    let startTs: number | null = null;
    const DURATION = 1200;
    const targetKcal = result.target_kcal;
    const fillTarget = Math.min(1, result.target_kcal / result.tdee);

    function animate(ts: number) {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayKcal(Math.round(eased * targetKcal));
      setRingPct(eased * fillTarget);
      if (progress < 1) rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [result]);

  if (!result || !macros) {
    return <p className="text-muted text-sm text-center py-8">Calculando…</p>;
  }

  const isDeficit = result.adjustment_pct < 0;
  const isSurplus = result.adjustment_pct > 0;
  const goalColor = isDeficit ? '#E24B4A' : isSurplus ? '#1D9E75' : '#EF9F27';
  const goalLabel = isDeficit ? 'Déficit' : isSurplus ? 'Superávit' : 'Mantenimiento';
  const goalIcon = isDeficit ? '↓' : isSurplus ? '↑' : '⚖';

  const R = 60;
  const CIRCUMFERENCE = 2 * Math.PI * R; // ≈ 376.99
  const dashOffset = CIRCUMFERENCE * (1 - ringPct);

  const totalKcal = macros.protein_g * 4 + macros.fat_g * 9 + macros.carbs_g * 4;
  const pPct = totalKcal > 0 ? Math.round((macros.protein_g * 4 / totalKcal) * 100) : 0;
  const fPct = totalKcal > 0 ? Math.round((macros.fat_g * 9 / totalKcal) * 100) : 0;
  const cPct = Math.max(0, 100 - pPct - fPct);

  const student = students.find((s) => s.id === form.studentId);

  return (
    <div className="space-y-5">
      {/* Safety warnings */}
      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-[#EF9F27]/40 bg-[#EF9F27]/10 px-4 py-3 text-sm text-[#EF9F27] space-y-1">
          {result.warnings.includes('bajo_piso') && (
            <p>⚠ Objetivo por debajo del mínimo recomendado. Sube el ajuste.</p>
          )}
          {result.warnings.includes('ritmo_agresivo') && (
            <p>⚠ Ritmo {'>'}1% del peso/semana — riesgo de perder masa magra.</p>
          )}
        </div>
      )}

      {/* Ring + stats */}
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* SVG donut ring */}
        <div className="relative shrink-0">
          <svg viewBox="0 0 160 160" className="w-40 h-40 -rotate-90">
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--color-border, #2a2d35)" strokeWidth="14" />
            <circle
              cx="80" cy="80" r={R}
              fill="none"
              stroke={goalColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground tabular-nums">{displayKcal.toLocaleString()}</span>
            <span className="text-xs text-muted">kcal/día</span>
          </div>
        </div>

        {/* Goal badge + BMR/TDEE cards */}
        <div className="flex-1 w-full space-y-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: `${goalColor}22`, color: goalColor }}
          >
            <span>{goalIcon}</span>
            {goalLabel}
            {result.adjustment_pct !== 0 && (
              <span className="font-normal opacity-75">
                {result.adjustment_pct > 0 ? `+${result.adjustment_pct}` : result.adjustment_pct}%
              </span>
            )}
          </div>
          {result.kg_per_week !== 0 && (
            <p className="text-xs text-muted pl-1">
              ≈ {Math.abs(result.kg_per_week).toFixed(2)} kg/semana
            </p>
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

      {/* Macro bars */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Distribución de macros</p>

        <MacroRow
          label="Proteína"
          grams={macros.protein_g}
          kcal={macros.protein_g * 4}
          pct={pPct}
          color="#E24B4A"
          infoOpen={openInfo === 'protein'}
          onInfo={() => setOpenInfo(openInfo === 'protein' ? null : 'protein')}
          infoContent={
            <div className="space-y-3">
              <p className="text-xs text-muted">
                <strong className="text-foreground">Fórmula:</strong>{' '}
                {form.proteinMult.toFixed(1)} g/kg × {form.weight_kg} kg ={' '}
                <strong className="text-foreground">{macros.protein_g} g</strong>
              </p>
              <p className="text-xs text-muted">
                Rango ISSN: 1.6–2.2 g/kg para entrenamiento de fuerza.
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Multiplicador</span>
                  <span className="font-semibold text-foreground">{form.proteinMult.toFixed(1)} g/kg</span>
                </div>
                <input
                  type="range" min={1.6} max={2.2} step={0.1}
                  value={form.proteinMult}
                  onChange={(e) => setForm((f) => ({ ...f, proteinMult: Number(e.target.value) }))}
                  className="w-full accent-[#E24B4A]"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>1.6 (moderado)</span><span>2.2 (alto)</span>
                </div>
              </div>
            </div>
          }
        />

        <MacroRow
          label="Grasa"
          grams={macros.fat_g}
          kcal={macros.fat_g * 9}
          pct={fPct}
          color="#EF9F27"
          infoOpen={openInfo === 'fat'}
          onInfo={() => setOpenInfo(openInfo === 'fat' ? null : 'fat')}
          infoContent={
            <div className="space-y-3">
              <p className="text-xs text-muted">
                <strong className="text-foreground">Fórmula:</strong>{' '}
                {form.fatMult.toFixed(1)} g/kg × {form.weight_kg} kg ={' '}
                <strong className="text-foreground">{macros.fat_g} g</strong>
              </p>
              <p className="text-xs text-muted">
                Mínimo hormonal: 0.8–1.0 g/kg (Academy Nutr Diet, 2022).
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Multiplicador</span>
                  <span className="font-semibold text-foreground">{form.fatMult.toFixed(2)} g/kg</span>
                </div>
                <input
                  type="range" min={0.8} max={1.0} step={0.05}
                  value={form.fatMult}
                  onChange={(e) => setForm((f) => ({ ...f, fatMult: Number(e.target.value) }))}
                  className="w-full accent-[#EF9F27]"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>0.8 (mínimo)</span><span>1.0 (alto)</span>
                </div>
              </div>
            </div>
          }
        />

        <MacroRow
          label="Carbohidratos"
          grams={macros.carbs_g}
          kcal={macros.carbs_g * 4}
          pct={cPct}
          color="#1D9E75"
          infoOpen={false}
          onInfo={undefined}
          infoContent={
            <p className="text-xs text-muted">
              Residual: ({result.target_kcal} − {macros.protein_g * 4} proteína − {macros.fat_g * 9} grasa) ÷ 4 ={' '}
              <strong className="text-foreground">{macros.carbs_g} g</strong>
            </p>
          }
        />
      </div>

      {/* Assign form (visible only when a student is selected) */}
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
          </button>
        </form>
      )}
    </div>
  );
}

// ─── MacroRow ────────────────────────────────────────────────────────────────

function MacroRow({
  label,
  grams,
  kcal,
  pct,
  color,
  infoOpen,
  onInfo,
  infoContent,
}: {
  label: string;
  grams: number;
  kcal: number;
  pct: number;
  color: string;
  infoOpen: boolean;
  onInfo?: () => void;
  infoContent: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="text-sm text-foreground">{label}</span>
          {onInfo && (
            <button
              type="button"
              onClick={onInfo}
              title="Ver fórmula y ajustar"
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
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      {infoOpen && (
        <div className="rounded-lg border border-border bg-surface p-3 mt-1">
          {infoContent}
        </div>
      )}
    </div>
  );
}
