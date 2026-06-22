import { redirect } from 'next/navigation';

// El registro público está cerrado: EveFit Method es por invitación.
// Conservamos la ruta para que los enlaces antiguos no den 404 y enviamos
// a la solicitud de cupo.
export default function RegisterPage() {
  redirect('/solicitud');
}
