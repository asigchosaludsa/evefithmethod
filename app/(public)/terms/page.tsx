import { LegalShell } from '@/components/navigation/LegalShell';

export const metadata = { title: 'Términos y condiciones' };

export default function TermsPage() {
  return (
    <LegalShell title="Términos y condiciones" updated="21 de junio de 2026">
      <p>
        Bienvenida a EveFit Method. Al crear una cuenta o usar la plataforma aceptas estos términos. Te
        pedimos leerlos con atención. (Este es un texto base que debe ser revisado por asesoría legal
        antes del lanzamiento comercial.)
      </p>
      <h2>1. Uso de la plataforma</h2>
      <p>
        EveFit Method es una herramienta de coaching fitness y nutricional que conecta a una coach con sus
        alumnas. El acceso de alumnas es por invitación. Te comprometes a usar la plataforma de forma
        lícita y a no compartir tus credenciales.
      </p>
      <h2>2. Cuentas y seguridad</h2>
      <p>
        Eres responsable de mantener la confidencialidad de tu cuenta y de toda actividad realizada con
        ella. Notifícanos ante cualquier uso no autorizado.
      </p>
      <h2>3. Contenido</h2>
      <p>
        Los planes, tips y contenidos son propiedad de su autora (la coach) y se ofrecen para tu uso
        personal. No reemplazan asesoría médica profesional (ver el Aviso de salud).
      </p>
      <h2>4. Limitación de responsabilidad</h2>
      <p>
        La plataforma se ofrece «tal cual». En la medida permitida por la ley, EveFit Method no será
        responsable por daños derivados del uso de la información o las herramientas.
      </p>
      <h2>5. Cambios</h2>
      <p>Podemos actualizar estos términos. Te notificaremos los cambios relevantes.</p>
    </LegalShell>
  );
}
