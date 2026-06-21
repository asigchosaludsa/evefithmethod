# Configuración de Storage (Almacenamiento de archivos)

Esta guía explica cómo funciona el almacenamiento de archivos de **EveFit Method** en Supabase Storage: los buckets (contenedores de archivos), cómo se mantienen privadas las fotos de comida y de progreso, qué tipos de archivo se permiten, los tamaños máximos recomendados y, paso a paso, cómo crear todo.

Está escrita para la dueña del proyecto, sin asumir conocimientos técnicos avanzados. Si sigues los pasos en orden, el almacenamiento quedará configurado correctamente.

---

## ¿Qué es Storage y por qué lo usamos?

Supabase Storage es el lugar donde se guardan los **archivos** de la aplicación (imágenes y, en el futuro, videos). La base de datos guarda *datos* (textos, números, fechas); Storage guarda *archivos*.

En EveFit Method se usa para:

- Las **fotos de comida** que registra cada alumna.
- Las **fotos de progreso** físico de cada alumna.
- Los **videos de ejercicios** (uso futuro).
- Los **avatares** (foto de perfil).

Los archivos se organizan en **buckets** (contenedores). Cada bucket tiene su propia configuración de privacidad.

---

## Los 4 buckets y su privacidad

| Bucket | Privacidad | Para qué sirve |
| --- | --- | --- |
| `food-photos` | **Privado** | Fotos de las comidas que registran las alumnas. |
| `progress-photos` | **Privado** | Fotos de progreso físico de las alumnas. |
| `exercise-videos` | **Privado** | Videos de ejercicios (uso futuro). |
| `avatars` | **Lectura pública** | Fotos de perfil (avatares). |

### ¿Qué significa "privado" y "lectura pública"?

- **Privado**: nadie puede ver el archivo solo con tener el enlace. Hay que tener permiso (estar autenticado y ser la dueña del archivo o su coach asignada). Las fotos de comida y de progreso son privadas precisamente porque son contenido personal y sensible.
- **Lectura pública**: cualquiera con el enlace puede ver el archivo. Esto es apropiado solo para los avatares, que de todas formas se muestran dentro de la app y no contienen información sensible.

> Importante: que un bucket sea de "lectura pública" no significa que cualquiera pueda **subir** o **borrar** archivos en él. Las políticas de escritura siguen restringidas; solo la lectura es abierta.

---

## Convención de rutas: `<uuid>/archivo`

Dentro de cada bucket, los archivos se guardan siguiendo una convención de carpetas muy simple:

```
<uuid_del_dueño>/<nombre_del_archivo>
```

- `<uuid_del_dueño>` es el identificador único del usuario dueño del archivo (el mismo `id` de su perfil, que corresponde al usuario en `auth.users`).
- `<nombre_del_archivo>` es el nombre del archivo en sí.

Ejemplos:

```
food-photos/3f9a1c2e-7b44-4d8e-9a01-2b6c5d4e3f10/almuerzo-2026-06-21.jpg
progress-photos/3f9a1c2e-7b44-4d8e-9a01-2b6c5d4e3f10/frente-semana-04.png
avatars/3f9a1c2e-7b44-4d8e-9a01-2b6c5d4e3f10/perfil.webp
```

### ¿Por qué importa esta convención?

Porque las reglas de seguridad (políticas) se apoyan en ella. La carpeta de primer nivel es el UUID de la dueña, así que el sistema puede saber **a quién pertenece** cada archivo simplemente mirando el nombre de su carpeta. De ahí salen las reglas: "cada alumna manda en su propia carpeta".

---

## Las políticas en lenguaje claro

Las **políticas** son las reglas que deciden quién puede leer, subir o borrar cada archivo. En EveFit Method funcionan así:

- **La alumna es dueña de su carpeta.** Cada alumna puede **leer y escribir** (subir, actualizar, borrar) los archivos que estén dentro de su propia carpeta `<su_uuid>/...`. No puede tocar las carpetas de otras alumnas.
- **La coach asignada puede leer.** La coach que está vinculada a una alumna puede **ver (leer)** los archivos de esa alumna. Esto le permite revisar las fotos de comida y de progreso para hacer el seguimiento. La coach lee; no necesita escribir en la carpeta de la alumna.
- **Sin vínculo, sin acceso.** Si una coach no está asignada a una alumna, no puede ver sus archivos privados. El acceso de lectura de la coach depende de que exista la relación coach–alumna.

En resumen: **cada alumna manda en su propia carpeta, y su coach asignada puede mirar.**

> Estas políticas viven en la migración `0006_storage.sql` y se apoyan en el mismo modelo de seguridad (RLS) que protege toda la base de datos.

---

## Cómo se mantienen privadas las fotos de comida y de progreso

Las fotos de comida (`food-photos`) y las fotos de progreso (`progress-photos`) son las más sensibles, y por eso reciben la protección más fuerte:

1. **Buckets privados.** Ninguna de las dos categorías está en un bucket público. No se pueden abrir con solo tener el enlace.
2. **Carpeta por dueña.** Cada foto vive dentro de la carpeta `<uuid_de_la_alumna>/...`, lo que ata el archivo a su dueña.
3. **Solo la dueña escribe.** Únicamente la propia alumna puede subir, reemplazar o borrar sus fotos.
4. **Solo la dueña y su coach leen.** La alumna ve sus propias fotos; su coach asignada también puede verlas para el seguimiento. Nadie más.

El resultado es que las fotos personales de las alumnas quedan protegidas de extremo a extremo, y el contacto con la coach es solo de lectura y solo cuando existe la relación de acompañamiento.

---

## Tipos de archivo permitidos

### Ahora (imágenes)

Para las fotos (comida, progreso y avatares) se permiten estos formatos de imagen:

- `jpg`
- `jpeg`
- `png`
- `webp`

### En el futuro (videos)

Para los videos de ejercicios, cuando se habilite la funcionalidad, los formatos previstos son:

- `mp4`
- `mov`

---

## Tamaños máximos recomendados

Para evitar archivos demasiado pesados y mantener la app ágil, estos son los límites sugeridos:

| Tipo de archivo | Tamaño máximo recomendado |
| --- | --- |
| Fotos (comida, progreso, avatar) | **~5 MB** |
| Videos (ejercicios, uso futuro) | **~50 MB** |

> Estos límites se aplican desde el lado del cliente (la app valida antes de subir) y/o configurándolos en los ajustes del bucket en Supabase. Conviene reforzarlos en ambos lados.

---

## Cómo crear los buckets

Tienes dos caminos para crear los buckets y sus políticas. **Elige uno.**

### Opción A (recomendada): ejecutar `0006_storage.sql`

Esta migración crea los buckets **y** sus políticas de seguridad de una sola vez, de forma consistente.

Las migraciones de SQL viven en `supabase/migrations/` y se aplican **en orden** en el editor SQL de Supabase (o con la CLI de Supabase). El orden completo es:

- [ ] `0001_extensions.sql`
- [ ] `0002_helpers_roles.sql`
- [ ] `0003_core_tables.sql`
- [ ] `0004_rls_policies.sql`
- [ ] `0005_triggers.sql`
- [ ] **`0006_storage.sql`** ← este crea los buckets y las políticas de Storage

Pasos:

1. Abre tu proyecto en el panel de Supabase.
2. Ve al **editor SQL** (SQL Editor).
3. Asegúrate de haber ejecutado antes, en orden, las migraciones `0001` a `0005`.
4. Abre el archivo `supabase/migrations/0006_storage.sql`, copia su contenido y ejecútalo.
5. Verifica en la sección **Storage** del panel que aparezcan los 4 buckets: `food-photos`, `progress-photos`, `exercise-videos` y `avatars`.

> Alternativamente, puedes aplicar las migraciones con la CLI de Supabase, siempre respetando el mismo orden.

### Opción B: crear los buckets desde el panel (dashboard)

Si prefieres hacerlo a mano desde el panel de Supabase:

1. Entra a tu proyecto en Supabase y abre la sección **Storage**.
2. Crea los 4 buckets con esta privacidad:
   - [ ] `food-photos` → **privado**
   - [ ] `progress-photos` → **privado**
   - [ ] `exercise-videos` → **privado**
   - [ ] `avatars` → **lectura pública** (marca el bucket como público)
3. Configura, si lo deseas, los límites de tamaño recomendados (~5 MB para fotos, ~50 MB para videos) en los ajustes de cada bucket.

> Nota: si creas los buckets a mano por el panel, tendrás que asegurarte de que las **políticas de Storage** queden equivalentes a las descritas más arriba (la alumna escribe en su carpeta; la coach asignada lee). La forma más segura de obtener esas políticas correctas es la **Opción A** (ejecutar `0006_storage.sql`), porque define buckets y políticas juntos.

---

## Lista de verificación final

- [ ] Los 4 buckets existen: `food-photos`, `progress-photos`, `exercise-videos`, `avatars`.
- [ ] `food-photos`, `progress-photos` y `exercise-videos` son **privados**.
- [ ] `avatars` es de **lectura pública**.
- [ ] Los archivos siguen la convención `<uuid>/archivo`.
- [ ] Las políticas permiten que la alumna escriba en su carpeta y que su coach asignada lea.
- [ ] Los formatos de imagen permitidos son `jpg`, `jpeg`, `png`, `webp`.
- [ ] Los límites de tamaño (~5 MB fotos, ~50 MB videos) están aplicados en el cliente y/o en los ajustes del bucket.
