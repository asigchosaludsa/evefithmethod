import { LegalShell } from '@/components/navigation/LegalShell';

export const metadata = { title: 'Aviso de salud y fitness' };

export default function DisclaimerPage() {
  return (
    <LegalShell title="Aviso de salud y fitness" updated="21 de junio de 2026">
      <p>
        <strong>
          EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo
          médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de
          iniciar cambios importantes en alimentación o entrenamiento.
        </strong>
      </p>
      <h2>Uso responsable</h2>
      <p>
        La información, planes, cálculos de calorías y macros, sugerencias de alimentos y rutinas de
        entrenamiento disponibles en la plataforma tienen fines educativos y de acompañamiento. No
        constituyen una prescripción médica ni nutricional individualizada por un profesional de la salud.
      </p>
      <h2>Lo que esta plataforma no hace</h2>
      <p>
        EveFit Method no promete resultados garantizados, no diagnostica condiciones médicas, no indica
        tratamientos médicos y no utiliza lenguaje de cura o tratamiento. Si tienes una condición médica,
        estás embarazada, en periodo de lactancia, o tomas medicación, consulta a tu médico antes de
        empezar.
      </p>
      <h2>Tu responsabilidad</h2>
      <p>
        Al usar la plataforma reconoces que el ejercicio físico y los cambios de alimentación conllevan
        riesgos. Eres responsable de detenerte y buscar atención profesional ante cualquier molestia,
        dolor o síntoma inusual.
      </p>
    </LegalShell>
  );
}
