import { LegalShell } from '@/components/navigation/LegalShell';

export const metadata = { title: 'Política de privacidad' };

export default function PrivacyPage() {
  return (
    <LegalShell title="Política de privacidad" updated="21 de junio de 2026">
      <p>
        Tu privacidad es prioritaria. Esta política explica qué datos recopilamos y cómo los usamos.
        (Texto base a revisar por asesoría legal antes del lanzamiento comercial.)
      </p>
      <h2>1. Datos que recopilamos</h2>
      <p>
        Datos de cuenta (nombre, email), datos de perfil físico que decidas ingresar (peso, medidas,
        objetivos), registros de comidas y entrenamientos, y fotos de progreso que subas voluntariamente.
      </p>
      <h2>2. Cómo usamos tus datos</h2>
      <p>
        Para prestarte el servicio de coaching: mostrar tu progreso, permitir a tu coach asignada
        acompañarte, y mejorar la plataforma. No vendemos tus datos.
      </p>
      <h2>3. Quién puede ver tus datos</h2>
      <p>
        Solo tú y tu coach asignada pueden ver tus datos privados. Ninguna otra alumna puede verlos. El
        acceso está protegido a nivel de base de datos mediante políticas de seguridad por fila (RLS).
      </p>
      <h2>4. Almacenamiento</h2>
      <p>
        Usamos Supabase (base de datos y almacenamiento de archivos). Las fotos de comida y progreso se
        guardan en buckets privados con acceso restringido.
      </p>
      <h2>5. Tus derechos</h2>
      <p>
        Puedes solicitar acceso, corrección o eliminación de tus datos escribiéndonos. Puedes cerrar tu
        cuenta en cualquier momento.
      </p>
    </LegalShell>
  );
}
