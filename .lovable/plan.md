
# Plan de construcción — Capora MVP

Marketplace que conecta empresas con inversores mediante un score de compatibilidad. No gestiona dinero ni asesora.

## 1. Infraestructura base

- Activar **Lovable Cloud** (Supabase gestionado): auth, base de datos, storage y server functions.
- Autenticación: **email/contraseña + Google** (broker de Lovable).
- i18n **ES/EN** con `react-i18next`, selector en el header, ES por defecto, persistencia en localStorage.
- Disclaimer legal global ("Capora no presta asesoramiento financiero ni gestiona inversiones") en footer y en zonas sensibles (detalle de proyecto, matching, contacto).

## 2. Modelo de datos (Supabase, con RLS)

- `profiles` — datos comunes (user_id, full_name, avatar, locale, role).
- `user_roles` — tabla separada con enum `app_role` (`empresa`, `inversor`, `admin`) + función `has_role()` security definer (para evitar escalado de privilegios).
- `company_profiles` — nombre legal, web, país, descripción, logo.
- `investor_profiles` — tipo (personal/corporativo), sectores[], rango ticket min/max, países[], tipos de inversión[], nivel de riesgo, descripción.
- `projects` — título, descripción, sector, tipo de inversión, capital requerido, ticket min/max, país, etapa, status (`draft`/`published`/`closed`), created_at.
- `project_documents` — adjuntos en Storage (bucket privado, signed URLs).
- `favorites` — inversor ↔ proyecto.
- `contact_requests` — inversor → proyecto, estado (`pending`/`accepted`/`rejected`).
- `conversations` + `messages` — chat habilitado solo cuando hay `contact_request` aceptado.
- `match_scores` — cache opcional de scores calculados (proyecto, inversor, score, breakdown JSON).

RLS por rol: empresa ve/edita solo sus proyectos; inversor ve proyectos publicados; admin acceso total vía `has_role`.

## 3. Motor de matching (reglas + pesos)

Server function `computeMatchScore(project, investor)` 0–100 ponderando:

- Sector (30%) — coincidencia exacta o solapamiento.
- Rango de ticket (25%) — solape de intervalos.
- País / región (15%).
- Tipo de inversión (15%).
- Nivel de riesgo derivado de etapa (10%).
- Bonus de keywords compartidas en descripción (5%).

Devuelve `{ score, reasons[] }` para mostrar explicación tipo "Coincide en fintech + ticket + España". Se calcula on-demand y se cachea en `match_scores`.

## 4. Pantallas

**Públicas**
- Landing Capora (hero, propuesta de valor, cómo funciona, CTAs por rol, disclaimer).
- Login / Registro (con selección de rol: empresa o inversor).
- Detalle de proyecto público (versión limitada; CTA login para contactar).

**Inversor** (`/_authenticated/inversor`)
- Dashboard: feed "Proyectos recomendados para ti" ordenado por match score, con badge de score y razones.
- Explorar proyectos con filtros (sector, país, ticket, tipo).
- Detalle de proyecto + botón "Solicitar contacto" + favorito.
- Mis favoritos.
- Mis solicitudes y estados.
- Perfil inversor (intereses).
- Bandeja de mensajes.

**Empresa** (`/_authenticated/empresa`)
- Dashboard: lista de proyectos y métricas (vistas, solicitudes, matches top).
- Crear / editar / eliminar proyecto (wizard).
- Vista "Inversores compatibles" por proyecto.
- Solicitudes recibidas (aceptar/rechazar).
- Perfil empresa.
- Bandeja de mensajes.

**Admin** (`/_authenticated/admin`, gated por `has_role('admin')`)
- Usuarios (suspender, cambiar rol).
- Proyectos (moderar, despublicar).
- Métricas globales básicas.

**Mensajería**
- Chat interno básico por conversación, realtime con Supabase Realtime, solo si hay contact_request aceptado.

## 5. Routing (TanStack Start)

- Rutas públicas top-level: `/`, `/auth`, `/proyectos/$id`, `/sobre`, `/legal`.
- Subárbol protegido en `src/routes/_authenticated/` (gate gestionado por la integración Supabase).
- Server functions en `src/lib/*.functions.ts` para todas las lecturas/escrituras sensibles.
- TanStack Query para data fetching, head() por ruta con metadatos ES/EN.

## 6. Diseño

- Estilo fintech profesional adaptado, bilingüe.
- Tokens en `src/styles.css` (oklch): primario azul confianza, acentos cálidos para CTAs, soporte dark mode.
- Componentes shadcn ya disponibles. Cards de proyecto con badge de match score (gradient verde→ámbar→gris).
- Responsive mobile-first.

## 7. Orden de implementación

1. Activar Lovable Cloud + configurar Google OAuth + crear i18n.
2. Migraciones: enums, tablas, RLS, función `has_role`, triggers de creación de profile.
3. Auth flow (registro con elección de rol, layout `_authenticated`, gate admin).
4. CRUD de proyectos (empresa) + storage de documentos.
5. Perfil de inversor + exploración con filtros.
6. Motor de matching + feed recomendado + explicación.
7. Favoritos + solicitudes de contacto (aceptar/rechazar).
8. Chat interno realtime.
9. Panel admin.
10. Landing pulida, legal/disclaimers, SEO por ruta, QA bilingüe.

## Detalles técnicos clave

- **Roles**: tabla `user_roles` separada + `has_role()` security definer + policies que la usan. Nunca rol en `profiles`.
- **Privacidad**: datos de contacto solo se revelan tras `contact_request` aceptado.
- **Server functions** protegidas con `requireSupabaseAuth`; admin endpoints validan `has_role('admin')` antes de cargar `supabaseAdmin` con `await import()`.
- **Storage**: bucket `project-docs` privado, acceso vía signed URLs generadas en server function.
- **Validación**: Zod en cada `inputValidator`, límites de longitud en descripciones y nombres.
- **Realtime chat**: suscripción por `conversation_id` en el cliente.

## Fuera de alcance MVP

Pagos, firma de NDAs, verificación KYC, due diligence automatizada, notificaciones email transaccionales (se pueden añadir luego con Resend).

¿Procedo con esta implementación?
