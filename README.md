# Heridas y Ostomías · Campus Virtual UCEVA

Progressive Web App (PWA) del módulo **Heridas y Ostomías** — asignatura *Cuidado de
Enfermería del Adulto en Situaciones de Alta Complejidad*, Programa de Enfermería,
Unidad Central del Valle del Cauca (UCEVA).

Incluye **dos módulos**:

- 🎓 **Módulo Estudiante**: inicio, presentación, objetivo, programación (cronograma
  interactivo), recursos, clases, biblioteca científica, casos clínicos, actividades,
  evaluaciones, calendario, perfil, favoritos, contacto docente.
- 🛡️ **Módulo Docente** (protegido con contraseña): permite **crear, editar y eliminar**
  anuncios, sesiones del cronograma, recursos, casos clínicos, actividades y
  evaluaciones — incluyendo **subir archivos PDF/imagen o pegar enlaces** de
  YouTube, Google Drive, Meet o cualquier artículo web.

---

## 📖 Bibliografía precargada

En **Biblioteca científica** quedaron precargados, como referencias que los
estudiantes pueden consultar, los dos documentos de consenso que compartiste:

1. *IWII Wound Infection in Clinical Practice consensus document: 2022 update*
   (Swanson T, Ousey K, Haesler E, et al. — International Wound Infection Institute).
2. *Leg ulceration in venous and arteriovenous insufficiency: assessment and
   management with compression therapy…* (Nair HK, Mosti G, Atkin L, et al. —
   World Union of Wound Healing Societies, *Journal of Wound Care* 2024).

Cada tarjeta muestra título, autores, resumen y enlace directo a la **fuente
oficial de descarga gratuita** (Wounds International / Journal of Wound Care),
en lugar de alojar una copia del PDF dentro del proyecto — así se respetan los
derechos de autor de ambas publicaciones y siempre se enlaza a la versión más
actualizada. Puedes agregar más artículos de la misma forma desde
**Panel Docente → Recursos** (categoría "Artículos científicos"), indicando
autores, DOI/enlace y, opcionalmente, un "tema" para que aparezcan filtrables
en la Biblioteca (Infección, Insuficiencia venosa, Biofilm, Apósitos, etc.).

---

## 🚀 Cómo ejecutarlo

No requiere instalación de dependencias (HTML + CSS + JS puro, sin frameworks pesados).

### Opción A — Abrir directamente
Descomprime la carpeta y abre `index.html` con doble clic. La app funciona,
aunque abierta así (`file://`) el navegador no puede leer `data/content.json`
por seguridad, así que verás siempre el contenido de ejemplo de fábrica en
vez del publicado, y tampoco se activan el *Service Worker* ni el manifiesto
PWA. Para probar todo tal cual lo verán los estudiantes, usa la Opción B o C.

### Opción B — Servidor local (recomendado)
```bash
cd heridas-ostomias
python3 -m http.server 8080
# abre http://localhost:8080 en tu navegador
```
o con Node:
```bash
npx serve .
```

### Opción C — Publicar en GitHub Pages
1. Sube esta carpeta a un repositorio de GitHub.
2. Ve a *Settings → Pages* y selecciona la rama `main` y carpeta raíz `/`.
3. En unos minutos tendrás la URL pública (ej. `https://usuario.github.io/heridas-ostomias/`).
4. Desde el celular, abre esa URL en Chrome y toca **"Instalar aplicación"** cuando
   aparezca el banner (o menú ⋮ → *Agregar a pantalla de inicio*).

---

## 🔑 Acceso

Al abrir la app aparece un selector de rol:

| Rol | Cómo entrar |
|---|---|
| **Estudiante** | Botón "Estudiante" — acceso libre, sin contraseña |
| **Docente** | Botón "Docente" → contraseña por defecto: **`uceva2025`** |

La contraseña docente se puede cambiar en **Panel Docente → Configuración**.
Para volver a elegir rol, ve a **Mi perfil → Cerrar sesión / cambiar de usuario**.

> ⚠️ Esta es una autenticación **del lado del cliente**, pensada para un entorno
> académico de un solo docente. Si necesitas seguridad real multiusuario (varios
> docentes, roles por estudiante, etc.), el siguiente paso natural es migrar el
> almacenamiento a Firebase Auth + Firestore o Supabase (ver sección siguiente).

---

## 🗂️ Estructura del proyecto

```
heridas-ostomias/
├── index.html              # SPA — todas las vistas (estudiante + docente)
├── manifest.json           # Manifiesto PWA (nombre, iconos, shortcuts, colores)
├── service-worker.js       # Caché offline (app shell + recursos)
├── data/
│   └── content.json        # 📌 Contenido PUBLICADO que ven todos los estudiantes
│                            #    (se reemplaza al usar "Publicar" en Panel Docente)
├── css/
│   ├── style.css           # Sistema de diseño institucional UCEVA
│   └── responsive.css      # Breakpoints móvil / tablet + accesibilidad
├── js/
│   ├── data.js             # Capa de datos: colecciones JSON + publicación
│   ├── app.js               # Router (SPA), vistas del estudiante, PWA
│   └── teacher.js          # Autenticación y panel CRUD del docente
└── assets/icons/           # Iconos PWA (SVG, editable/reemplazable por PNG)
```

## 🧠 Cómo se guarda la información — MUY IMPORTANTE

Toda la información editable (sesiones, recursos, anuncios, casos clínicos,
actividades y evaluaciones) se guarda como **colecciones JSON**, con la misma
forma que tendría un archivo `db.json`. Como esta es una app estática (sin
servidor propio), esa información vive **primero solo en el navegador donde
la docente la edita** — un estudiante en su propio celular no la ve
automáticamente.

### 📤 Por eso hay que "Publicar" los cambios
Desde **Panel Docente → Configuración** hay un botón **"Descargar content.json
para publicar"**. El flujo es:

1. La docente edita normalmente (anuncios, sesiones, recursos, actividades…).
2. Cuando quiere que los estudiantes vean los cambios, entra a
   **Panel Docente → Configuración** y hace clic en **"Descargar content.json
   para publicar"** — esto descarga un archivo `content.json`.
3. Sube ese archivo a la carpeta **`data/`** de su repositorio en GitHub
   (reemplazando el que ya existe ahí), con el mismo método de arrastrar y
   soltar que usó para subir el proyecto la primera vez.
4. En 1–2 minutos, **todos los estudiantes, en cualquier dispositivo**, verán
   el contenido actualizado la próxima vez que abran o recarguen la app — la
   app revisa automáticamente `data/content.json` cada vez que se abre.

El proyecto ya incluye un `data/content.json` inicial (con el mismo contenido
de ejemplo precargado), así que funciona igual desde el primer despliegue,
incluso antes de que la docente publique su primer cambio. Dentro del Panel
Docente aparece un aviso recordando publicar mientras haya cambios sin subir.

> 💡 Mientras la docente no publique, sus ediciones siguen intactas en su
> propio navegador aunque recargue la página o cierre y abra de nuevo — solo
> se sobrescriben si ella misma importa un `content.json` más nuevo (por
> ejemplo al cambiar de computador, usando "Restaurar / cambiar de
> computador" en la misma pantalla de Configuración).

### Adjuntar archivos
Desde el Panel Docente, cada recurso/sesión/actividad permite **pegar un enlace**
(YouTube, Google Drive, Meet, artículo web, PDF externo) **o subir un archivo**
(PDF/imagen, hasta ~4.5 MB, límite práctico del navegador). Para archivos más
pesados se recomienda subirlos a Google Drive y pegar el enlace — el visor los
reconoce automáticamente y los incrusta en una vista previa.

> ⚠️ Los archivos adjuntos (no los enlaces) sí quedan incluidos dentro del
> propio `content.json` al publicar, así que también llegan a todos los
> estudiantes — solo ten en cuenta que muchos archivos grandes pueden hacer
> ese archivo pesado. Para materiales grandes, siempre es mejor usar un
> enlace de Google Drive.

---

## 📲 Funcionalidad PWA implementada

- `manifest.json` con nombre, ícono, `theme_color` institucional y accesos directos.
- `service-worker.js` con caché del *app shell* (offline para menú, cronograma y
  últimos recursos vistos) y estrategia *network-first* para contenido externo.
- Pantalla de carga (*splash screen*) con animación.
- Banner de instalación (`beforeinstallprompt`) y banner de "Nueva versión disponible".
- Diseño responsive: barra lateral en escritorio, barra inferior fija en móvil.
- Modo alto contraste (botón en el encabezado) y tipografía escalable vía CSS.

---

## ✏️ Qué puede hacer el docente ahora mismo

Desde **Panel Docente** (pestañas superiores):

1. **Anuncios** — publicar novedades que aparecen en el Inicio de los estudiantes.
2. **Cronograma / Sesiones** — crear/editar cada sesión: tema, fecha, objetivos,
   contenido, actividad, evaluación, enlace de la clase y material de apoyo
   (archivo o enlace).
3. **Recursos** — agregar videos, guías, protocolos, libros, artículos,
   presentaciones, infografías o podcasts, cada uno con archivo o enlace.
4. **Casos clínicos** — historia clínica, valoración, SOAPIE, NANDA/NOC/NIC y
   preguntas de reflexión.
5. **Actividades** — título, sesión relacionada, fecha límite, estado y guía.
6. **Evaluaciones** — tipo (mapa conceptual, simulación, análisis de caso,
   exposición, plan de cuidados), fecha, estado y puntaje.
7. **Configuración** — cambiar la contraseña docente o restablecer el contenido
   del módulo a los valores iniciales.

Todo cambio se refleja **al instante** en el Módulo Estudiante (cronograma,
recursos, calendario, actividades, etc.), sin necesidad de tocar código.

---

## 🔭 Próximos pasos sugeridos

- **Firebase/Supabase**: reemplazar el archivo `data/content.json` por una
  base de datos en la nube, para que publicar sea automático (sin descargar y
  subir un archivo) y permitir varios docentes editando a la vez en tiempo real.
- **Notificaciones push**: el manifiesto y el service worker ya están preparados
  para añadir `Push API` cuando se disponga de un backend.
- **Asistente IA**: el botón flotante "Asistente IA" está reservado (muestra
  "Próximamente"); se puede conectar a la API de un modelo de lenguaje cuando el
  docente lo defina.
- **Gamificación avanzada**: actualmente se calculan puntos e insignias de forma
  simple a partir del progreso; puede ampliarse con niveles y ranking entre
  estudiantes si se centraliza el progreso en una base de datos compartida.

---

© Unidad Central del Valle del Cauca (UCEVA) — Programa de Enfermería.
Plataforma educativa del módulo Heridas y Ostomías.
