# Velorze

VELORZE

quiero crear una plataforma web llamada Velorze, un marketplace inteligente que conecta empresas que buscan inversión con inversores privados y corporativos mediante un sistema de recomendaciones basado en IA.

🧭 OBJETIVO DEL PRODUCTO

Velorze es una plataforma de conexión entre empresas e inversores.

IMPORTANTE:

La plataforma NO gestiona dinero.

No procesa inversiones.

No actúa como intermediario financiero.

No ofrece asesoramiento financiero.

Solo conecta usuarios y facilita comunicación directa.

👥 TIPOS DE USUARIOS

La plataforma tiene 3 roles:

1. Empresa

Publica proyectos de inversión.

2. Inversor

Crea un perfil con sus intereses de inversión.

3. Admin

Gestiona usuarios, proyectos y moderación.

🏢 FUNCIONALIDAD PARA EMPRESAS

Las empresas pueden:

Registrarse y crear perfil

Publicar proyectos de inversión

Editar y eliminar proyectos

Ver inversores potencialmente compatibles

Recibir solicitudes de interés

Datos del proyecto:

Título del proyecto

Descripción detallada

Sector (fintech, real estate, tecnología, etc.)

Tipo de inversión (equity, préstamo, joint venture, etc.)

Capital requerido

Rango de inversión mínimo y máximo

País / región

Etapa del negocio (idea, crecimiento, expansión)

Fecha de publicación

💰 FUNCIONALIDAD PARA INVERSORES

Los inversores pueden:

Crear perfil personal o corporativo

Definir intereses de inversión

Explorar proyectos recomendados

Guardar favoritos

Contactar empresas

Perfil inversor incluye:

Sectores de interés

Rango de inversión

Países de interés

Tipo de inversión preferida

Nivel de riesgo (bajo, medio, alto)

Descripción libre de intereses

🤖 SISTEMA DE MATCHING (CORE DE CVELORZE)

Implementa un sistema de recomendación inteligente que:

Compare perfiles de inversores con proyectos

Genere un “match score” de compatibilidad (0–100%)

Use criterios como:

sector

rango de inversión

país

tipo de inversión

coincidencia semántica de descripciones

Mostrar en la interfaz:

“Proyectos recomendados para ti”

“Match score”

Explicación simple del match (ej: “Coincide en fintech + ticket + país”)

IMPORTANTE:
El sistema es solo informativo y NO es asesoramiento financiero.

🔗 FUNCIONALIDAD DE CONEXIÓN

Cuando hay interés:

Inversores pueden enviar solicitud de contacto

Empresas pueden aceptar o rechazar

Se habilita chat interno básico entre ambos usuarios

📊 PANTALLAS NECESARIAS

Landing page de Velorze

Registro / Login

Dashboard inversor (feed personalizado)

Dashboard empresa (gestión de proyectos)

Crear / editar proyecto

Perfil inversor

Página de detalle de proyecto

Sistema de favoritos

Mensajería interna

Panel admin

🧠 BASE DE DATOS (SUGERIDA)

users

investor_profiles

company_profiles

projects

matches

messages

favorites

⚙️ TECNOLOGÍA

Frontend moderno tipo React

Backend con Supabase

Autenticación de usuarios

Base de datos relacional

Storage para documentos en Supabase

⚠️ RESTRICCIONES IMPORTANTES

No procesar pagos

No ejecutar inversiones dentro de la plataforma

No ofrecer asesoramiento financiero

No garantizar resultados de inversión

Solo conectar usuarios

🎯 OBJETIVO DEL MVP

Crear una primera versión funcional de Velorze que permita:

Publicar proyectos de inversión

Crear perfiles de inversores

Generar recomendaciones automáticas

Permitir contacto entre usuarios

El objetivo es validar si existe interés real en un marketplace de inversión con matching inteligente.

🚀 VISIÓN DEL PRODUCTO

Velorze es una plataforma tipo “LinkedIn de inversión privada”, donde los inversores descubren oportunidades relevantes automáticamente y las empresas encuentran capital potencial de forma más eficiente mediante inteligencia artificial.

Si quieres, el siguiente paso puedo ayudarte a:

diseñar el logo de Velorze

definir colores y branding

o crear la estrategia para conseguir tus primeros usuarios sin gastar dinero

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/48d29e87-c668-469d-b82d-c97f403d9035).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
