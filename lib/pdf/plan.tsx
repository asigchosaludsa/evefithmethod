import 'server-only';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';

/** Health disclaimer shown in the footer (matches the CLAUDE.md exact text). */
const DISCLAIMER =
  'EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo medico, ' +
  'diagnostico ni tratamiento profesional. Consulta con un profesional de salud antes de iniciar cambios ' +
  'importantes en alimentacion o entrenamiento.';

const SCARLET = '#FF3B47';
const INK = '#16181D';
const MUTED = '#5A6068';
const HAIRLINE = '#E4E6EA';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    color: INK,
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.4,
  },
  wordmark: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  wordmarkAccent: {
    color: SCARLET,
  },
  rule: {
    marginTop: 10,
    marginBottom: 18,
    height: 3,
    backgroundColor: SCARLET,
    width: 56,
  },
  studentName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
  },
  kicker: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 24,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: INK,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: SCARLET,
    borderBottomStyle: 'solid',
  },
  planTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  macro: {
    width: '25%',
    marginBottom: 6,
  },
  macroLabel: {
    color: MUTED,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
  },
  notesLabel: {
    color: MUTED,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 2,
  },
  notes: {
    fontSize: 10,
    color: INK,
  },
  day: {
    marginBottom: 14,
  },
  dayTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    marginBottom: 6,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
    borderBottomStyle: 'solid',
  },
  exerciseName: {
    fontSize: 10,
    flex: 1,
    paddingRight: 8,
  },
  exerciseMeta: {
    fontSize: 10,
    color: MUTED,
    textAlign: 'right',
  },
  empty: {
    fontSize: 10,
    color: MUTED,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 44,
    right: 44,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    borderTopStyle: 'solid',
    fontSize: 8,
    color: MUTED,
    lineHeight: 1.3,
  },
});

export interface PlanPdfInput {
  studentName: string;
  nutrition: {
    title?: string;
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    notes?: string | null;
  } | null;
  workout: {
    title?: string;
    days: {
      title: string;
      exercises: {
        name: string;
        sets?: number | null;
        reps?: string | null;
        suggestedWeight?: number | null;
      }[];
    }[];
  } | null;
}

function macroText(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) return '--';
  return `${value} ${unit}`;
}

function exerciseMeta(ex: {
  sets?: number | null;
  reps?: string | null;
  suggestedWeight?: number | null;
}): string {
  const parts: string[] = [];
  if (ex.sets !== null && ex.sets !== undefined && (ex.reps ?? '').trim() !== '') {
    parts.push(`${ex.sets} x ${ex.reps}`);
  } else if (ex.sets !== null && ex.sets !== undefined) {
    parts.push(`${ex.sets} series`);
  } else if ((ex.reps ?? '').trim() !== '') {
    parts.push(`${ex.reps} reps`);
  }
  if (ex.suggestedWeight !== null && ex.suggestedWeight !== undefined) {
    parts.push(`${ex.suggestedWeight} kg`);
  }
  return parts.length > 0 ? parts.join('  ·  ') : '--';
}

function PlanDocument({ input }: { input: PlanPdfInput }) {
  const { studentName, nutrition, workout } = input;
  return (
    <Document title={`Plan EveFit - ${studentName}`} author="EveFit Method">
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.wordmark}>
            EVEFIT<Text style={styles.wordmarkAccent}> / METHOD</Text>
          </Text>
          <View style={styles.rule} />
          <Text style={styles.studentName}>{studentName}</Text>
          <Text style={styles.kicker}>Tu plan</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutricion</Text>
          {nutrition ? (
            <View>
              {nutrition.title ? <Text style={styles.planTitle}>{nutrition.title}</Text> : null}
              <View style={styles.macroRow}>
                <View style={styles.macro}>
                  <Text style={styles.macroLabel}>Calorias</Text>
                  <Text style={styles.macroValue}>{macroText(nutrition.calories, 'kcal')}</Text>
                </View>
                <View style={styles.macro}>
                  <Text style={styles.macroLabel}>Proteina</Text>
                  <Text style={styles.macroValue}>{macroText(nutrition.protein, 'g')}</Text>
                </View>
                <View style={styles.macro}>
                  <Text style={styles.macroLabel}>Carbos</Text>
                  <Text style={styles.macroValue}>{macroText(nutrition.carbs, 'g')}</Text>
                </View>
                <View style={styles.macro}>
                  <Text style={styles.macroLabel}>Grasas</Text>
                  <Text style={styles.macroValue}>{macroText(nutrition.fat, 'g')}</Text>
                </View>
              </View>
              {nutrition.notes ? (
                <View>
                  <Text style={styles.notesLabel}>Notas</Text>
                  <Text style={styles.notes}>{nutrition.notes}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.empty}>Sin plan de nutricion asignado todavia.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrenamiento</Text>
          {workout && workout.days.length > 0 ? (
            <View>
              {workout.title ? <Text style={styles.planTitle}>{workout.title}</Text> : null}
              {workout.days.map((d, di) => (
                <View key={di} style={styles.day} wrap={false}>
                  <Text style={styles.dayTitle}>{d.title}</Text>
                  {d.exercises.length > 0 ? (
                    d.exercises.map((ex, ei) => (
                      <View key={ei} style={styles.exerciseRow}>
                        <Text style={styles.exerciseName}>{ex.name}</Text>
                        <Text style={styles.exerciseMeta}>{exerciseMeta(ex)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.empty}>Sin ejercicios.</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>Sin plan de entrenamiento asignado todavia.</Text>
          )}
        </View>

        <Text style={styles.footer} fixed>
          {DISCLAIMER}
        </Text>
      </Page>
    </Document>
  );
}

/** Build a printable A4 plan PDF for a student and return it as a Buffer. */
export async function buildPlanPdf(input: PlanPdfInput): Promise<Buffer> {
  return renderToBuffer(<PlanDocument input={input} />);
}
