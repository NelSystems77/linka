# Linka by NelSystems — Análisis de Infraestructura para Implementación en Intranet

**Documento técnico para evaluación del Departamento de Sistemas**  
Fecha: Mayo 2026 · Versión 0.1.0 · Preparado por: NelSystems

---

## 1. Descripción General del Sistema

Linka es una aplicación de mensajería interna corporativa con **cifrado extremo a extremo (E2EE)** diseñada como Progressive Web App (PWA). No requiere instalación de software adicional en los equipos del usuario: se accede desde cualquier navegador moderno y puede instalarse como aplicación nativa desde el mismo browser.

### 1.1 Propósito

| Característica | Descripción |
|---|---|
| **Tipo** | PWA — funciona como app web y como app instalada |
| **Acceso** | Navegador (Chrome, Edge, Firefox, Safari) o icono en escritorio/móvil |
| **Usuarios** | Personal interno con cuentas creadas por el administrador |
| **Mensajería** | Chats directos 1:1 y salas de grupo con E2EE |
| **Archivos** | Transferencia de archivos cifrados (hasta 50 MB) |
| **Administración** | Panel super-admin con gestión de usuarios, roles y auditoría |

### 1.2 Modelo de Roles

| Rol | Descripción | Vencimiento |
|---|---|---|
| `super_admin` | Gestión completa del sistema | Sin vencimiento |
| `admin` | Gestión de usuarios | Con vencimiento renovable |
| `user` | Mensajería y archivos | Con vencimiento renovable |

Los ciclos de acceso son de 3, 6, 9 o 12 meses. El sistema bloquea automáticamente cuentas vencidas.

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de componentes

```
┌─────────────────────────────────────────────────────────┐
│                    RED DE LA ORGANIZACIÓN                 │
│                                                           │
│   ┌──────────────┐        ┌──────────────────────────┐   │
│   │   Usuarios   │◄──────►│  Linka PWA (navegador)   │   │
│   │  (browsers)  │  HTTPS │  React 18 + Vite         │   │
│   └──────────────┘        │  Service Worker (caché)   │   │
│                            └──────────┬───────────────┘   │
│                                       │                   │
└───────────────────────────────────────┼───────────────────┘
                                        │ INTERNET REQUERIDO
                          ┌─────────────▼──────────────────┐
                          │     BACKEND NelSystems          │
                          │  NestJS (Node.js) — WebSocket   │
                          │  Solo: presencia y typing       │
                          └─────────────┬──────────────────┘
                                        │
                          ┌─────────────▼──────────────────┐
                          │         FIREBASE (Google)       │
                          │  ┌──────────┐  ┌────────────┐  │
                          │  │   Auth   │  │  Firestore │  │
                          │  └──────────┘  └────────────┘  │
                          │  ┌──────────┐  ┌────────────┐  │
                          │  │ Storage  │  │  Functions │  │
                          │  └──────────┘  └────────────┘  │
                          └────────────────────────────────┘
```

### 2.2 Stack tecnológico

#### Frontend (cliente — corre en el navegador del usuario)

| Componente | Tecnología | Versión |
|---|---|---|
| Framework UI | React | 18.3 |
| Build tool | Vite | 5.x |
| Lenguaje | TypeScript | 5.4 |
| Estilos | TailwindCSS | 3.4 |
| Estado | Zustand | 4.5 |
| PWA / Service Worker | vite-plugin-pwa + Workbox | 0.20 |
| Tiempo real | Firebase SDK + Socket.io client | 10.x / 4.7 |
| Criptografía | Web Crypto API (nativa del browser) | — |
| Almacenamiento local | IndexedDB (claves privadas) | — |

#### Backend (servidor NelSystems)

| Componente | Tecnología | Versión |
|---|---|---|
| Framework | NestJS | 10.x |
| Runtime | Node.js | 18+ |
| Autenticación | Firebase Admin + JWT/Passport | — |
| WebSocket | Socket.io (via @nestjs/websockets) | 4.7 |
| **Función exclusiva** | Indicadores de presencia y typing | — |

> **Importante:** El backend NestJS NO procesa ni almacena mensajes. Los mensajes van directamente de cliente a Firestore sin pasar por el servidor de NelSystems.

#### Base de datos y servicios en la nube (Firebase / Google Cloud)

| Servicio | Uso | Datos almacenados |
|---|---|---|
| **Firebase Auth** | Autenticación de usuarios | Credenciales (email/hash) |
| **Firestore** | Base de datos NoSQL en tiempo real | Mensajes cifrados, metadatos |
| **Firebase Storage** | Almacenamiento de archivos | Blobs cifrados (AES-256-GCM) |
| **Cloud Functions** | Automatización TTL y auditoría | Sin datos propios |
| **Firebase Hosting** | Hosting del frontend PWA | Assets estáticos |

---

## 3. Seguridad — Cifrado Extremo a Extremo (E2EE)

### 3.1 Modelo de seguridad

Este es el punto de mayor relevancia para el área de sistemas. Linka implementa **E2EE verdadero**:

- **El servidor nunca ve el contenido de los mensajes.** Firestore almacena únicamente blobs cifrados en Base64.
- **Las claves privadas nunca salen del dispositivo del usuario.** Se generan localmente usando la Web Crypto API y se guardan en el IndexedDB del browser.
- **La intercepción a nivel de red o de servidor es técnicamente inútil** — solo se puede leer el texto si se tiene acceso físico al dispositivo y al browser del usuario.

### 3.2 Algoritmos utilizados

| Capa | Algoritmo | Longitud de clave | Estándar |
|---|---|---|---|
| Intercambio de clave | RSA-OAEP | 4096 bits | PKCS#8 / SPKI |
| Cifrado de mensajes | AES-GCM | 256 bits | NIST SP 800-38D |
| Hash (RSA interno) | SHA-256 | — | FIPS 180-4 |
| API criptográfica | Web Crypto API | — | W3C / FIPS validada |

### 3.3 Flujo de cifrado de un mensaje

```
EMISOR (browser A)                        RECEPTOR (browser B)
─────────────────────────────────────────────────────────────
1. Genera clave AES-256-GCM efímera
2. Cifra el mensaje con AES + IV aleatorio
3. Cifra la clave AES con la clave pública RSA del receptor
4. Cifra la clave AES con su propia clave pública RSA (para leer sus propios mensajes)
5. Envía { ciphertext, IV, encryptedKey_A, encryptedKey_B } a Firestore
                        │
              [Firestore almacena solo blobs — no puede leer]
                        │
6.                                 Recibe el blob de Firestore
7.                                 Descifra encryptedKey_B con su clave privada RSA
8.                                 Descifra el mensaje con la clave AES recuperada
```

### 3.4 Reglas de seguridad en Firestore

Las reglas de base de datos garantizan que:

- Un usuario solo puede leer mensajes de conversaciones donde es participante
- Los mensajes son **inmutables** una vez escritos (no se pueden modificar ni borrar por usuarios)
- Solo el super_admin puede crear o eliminar cuentas
- Cada usuario puede actualizar únicamente sus propios campos no sensibles (estado, avatar, clave pública)

---

## 4. Estado Actual del Sistema

### 4.1 Funcionalidades implementadas y operativas

| Módulo | Estado | Notas |
|---|---|---|
| Autenticación (login/logout) | ✅ Completo | Firebase Auth + persistencia local |
| Generación y sync de claves E2EE | ✅ Completo | Bootstrap automático en login |
| Chat directo 1:1 con E2EE | ✅ Completo | Texto + archivos cifrados |
| Salas de grupo (multiparticipante) | ✅ Completo | E2EE para todos los participantes |
| Transferencia de archivos cifrados | ✅ Completo | Hasta 50 MB, AES-256-GCM |
| Indicadores de presencia (online/offline) | ✅ Completo | Via WebSocket NestJS |
| Panel de administración | ✅ Completo | Crear, bloquear, renovar, eliminar usuarios |
| Sistema de roles y vencimiento | ✅ Completo | 3/6/9/12 meses, auto-bloqueo |
| Auditoría de acciones administrativas | ✅ Completo | Log inmutable en Firestore |
| PWA instalable (escritorio y móvil) | ✅ Completo | Service Worker + caché offline |
| TTL de mensajes (plan Free 24h) | ✅ Completo | Cloud Function cada 60 minutos |
| Solicitudes de chat (confirmación) | ✅ Completo | El receptor debe aceptar antes de chatear |
| Panel super-admin para chat directo | ✅ Completo | Admin puede iniciar chat con cualquier usuario |
| Cambio de contraseña forzado | ✅ Completo | Contraseñas temporales en primer login |
| Responsive / móvil | ✅ Completo | Layout adaptado iOS/Android |

### 4.2 Limitaciones conocidas (v0.1.0)

| Limitación | Impacto | Solución planificada |
|---|---|---|
| Clave E2EE ligada al dispositivo/browser | Mensajes inaccesibles si se limpia el caché o se cambia de browser | Backup de clave cifrada con contraseña maestra |
| Sin notificaciones push | El usuario debe tener la app abierta para ver nuevos mensajes | Push Notifications API (v0.2) |
| Sin soporte multi-dispositivo simultáneo | Al loguearse desde otro browser se regenera la clave | Key sync cross-device (v0.3) |
| Sin búsqueda en historial | Solo scroll vertical | Índice de búsqueda Firestore (v0.2) |
| Sin llamadas de voz/video | Solo texto y archivos | Fuera de alcance por ahora |

---

## 5. Requisitos para Implementación en Intranet

### 5.1 Infraestructura requerida por NelSystems

Para operar, Linka requiere los siguientes servidores/servicios gestionados por NelSystems:

| Componente | Alojamiento | Responsable |
|---|---|---|
| Frontend PWA (archivos estáticos) | Firebase Hosting o servidor interno Nginx/Apache | NelSystems |
| Backend NestJS (WebSocket) | VPS / servidor propio / Docker | NelSystems |
| Base de datos Firestore | Google Cloud Firebase (externo) | Google / NelSystems |
| Firebase Auth | Google Cloud (externo) | Google / NelSystems |
| Firebase Storage | Google Cloud (externo) | Google / NelSystems |
| Cloud Functions (TTL) | Google Cloud (externo) | Google / NelSystems |

> **Nota sobre soberanía de datos:** Los mensajes cifrados y metadatos se almacenan en los servidores de Google (Firebase). El contenido es inaccesible para Google (E2EE), pero los metadatos de conversación (quién habla con quién, timestamps) sí están en la nube. Si la política de la organización exige almacenamiento 100% en servidores propios, se requeriría una migración de backend (reemplazar Firestore por PostgreSQL/MongoDB on-premise), lo cual está fuera del alcance de v0.1.0.

### 5.2 Requisitos del lado del cliente (workstations de empleados)

No se instala ningún software. Los únicos requisitos son:

| Requisito | Detalle |
|---|---|
| **Navegador moderno** | Chrome 90+, Edge 90+, Firefox 88+, Safari 15.4+ |
| **HTTPS en el sitio** | Obligatorio para Service Worker y Web Crypto API |
| **IndexedDB habilitado** | No debe estar bloqueado por políticas del browser |
| **JavaScript habilitado** | La app es 100% JavaScript del lado del cliente |
| **Cookies / localStorage** | Para persistencia de sesión Firebase Auth |

> **Importante:** Si la política de Group Policy (GPO) en Windows bloquea IndexedDB o las APIs de criptografía del browser, la app no podrá generar claves E2EE y los mensajes serán ilegibles. Se debe verificar que estas APIs no estén restringidas por las directivas de Chrome Enterprise o Edge Enterprise.

---

## 6. Permisos de Red Requeridos

### 6.1 Resumen ejecutivo

La aplicación **requiere acceso a internet** para funcionar. No existe versión completamente offline o air-gapped en v0.1.0. El Service Worker permite usar la app brevemente sin conexión (visualización de caché), pero el envío/recepción de mensajes requiere conectividad.

### 6.2 Dominios y endpoints que deben estar permitidos en el firewall

Los siguientes dominios deben tener salida HTTPS (puerto 443) habilitada desde los equipos de los usuarios y desde el servidor backend:

#### 6.2.1 Firebase / Google Cloud (obligatorios — operación del sistema)

| Dominio / Rango | Puerto | Protocolo | Función |
|---|---|---|---|
| `*.firebaseapp.com` | 443 | HTTPS | Firebase Auth (login/logout) |
| `*.googleapis.com` | 443 | HTTPS | Firestore, Storage, Cloud Functions API |
| `firestore.googleapis.com` | 443 | HTTPS + WebSocket | Base de datos en tiempo real (mensajes) |
| `firebasestorage.googleapis.com` | 443 | HTTPS | Subida/descarga de archivos cifrados |
| `storage.googleapis.com` | 443 | HTTPS | Bucket de archivos (Firebase Storage) |
| `identitytoolkit.googleapis.com` | 443 | HTTPS | Firebase Auth — validación de tokens |
| `securetoken.googleapis.com` | 443 | HTTPS | Firebase Auth — refresh de tokens |
| `*.firebaseio.com` | 443 | HTTPS / WSS | Firebase Realtime DB (si se usa en futuras versiones) |
| `fcm.googleapis.com` | 443 | HTTPS | (Reservado — notificaciones push futuras) |

#### 6.2.2 Backend NelSystems (obligatorio — presencia y typing)

| Dominio / IP | Puerto | Protocolo | Función |
|---|---|---|---|
| `[dominio-backend-nelsystems]` | 443 (producción) / 3000 (desarrollo) | HTTPS + WSS (WebSocket Seguro) | Indicadores de presencia online/offline y "escribiendo..." |

> El dominio exacto del servidor backend es provisto por NelSystems al momento del despliegue.

#### 6.2.3 Hosting del frontend (según configuración de despliegue)

| Opción de hosting | Dominio | Puerto |
|---|---|---|
| **Opción A — Firebase Hosting** (predeterminada) | `[proyecto].web.app` o dominio personalizado | 443 |
| **Opción B — Servidor interno** (Nginx/Apache en red local) | IP/hostname interno de la organización | 443 (recomendado) o 80 |

> Si se elige la **Opción B**, el frontend puede servirse completamente desde la intranet. Solo los servicios Firebase y el backend WebSocket requieren salida a internet.

### 6.3 Protocolos de red utilizados

| Protocolo | Uso | Puertos |
|---|---|---|
| **HTTPS** | Toda comunicación con Firebase y backend | 443 |
| **WSS (WebSocket Secure)** | Conexión al backend NestJS (presencia/typing) | 443 (producción) |
| **HTTP/2** | Firestore usa multiplexado HTTP/2 | 443 |

> **No se utiliza HTTP plano (puerto 80) en producción.** El Service Worker de la PWA solo funciona bajo HTTPS o localhost.

### 6.4 Rangos de IP de Google Firebase

Firebase/Google Cloud opera desde los siguientes rangos de IP (para reglas de firewall por IP en lugar de dominio):

```
Rangos publicados por Google: https://www.gstatic.com/ipranges/goog.json
Rangos de Google Cloud:       https://www.gstatic.com/ipranges/cloud.json
```

Se recomienda usar reglas basadas en **dominio (FQDN)** en el firewall en lugar de IP, ya que las IPs de Google Cloud son dinámicas y rotan con frecuencia.

### 6.5 Checklist de permisos de red

```
Firewall saliente (desde workstations de empleados):
  [ ] *.googleapis.com          → 443 HTTPS
  [ ] *.firebaseapp.com         → 443 HTTPS
  [ ] firebasestorage.googleapis.com → 443 HTTPS
  [ ] storage.googleapis.com    → 443 HTTPS
  [ ] [dominio backend NelSystems] → 443 HTTPS + WSS

Proxy / Inspección SSL (si existe):
  [ ] Verificar que la inspección de TLS no rompa WebSocket (WSS)
  [ ] Verificar que no se bloqueen conexiones de larga duración (keep-alive)
  [ ] Excluir *.googleapis.com de deep inspection si causa problemas con Firebase

Políticas de browser (GPO / Chrome Enterprise / Edge Enterprise):
  [ ] IndexedDB no bloqueado
  [ ] Web Crypto API habilitada
  [ ] Service Workers permitidos
  [ ] localStorage / sessionStorage permitidos
  [ ] WebSocket (WSS) no bloqueado
```

---

## 7. Requisitos del Servidor Backend (NelSystems)

El servidor que corre el backend NestJS (componente de presencia/typing) necesita:

| Requisito | Detalle |
|---|---|
| **Runtime** | Node.js 18 LTS o superior |
| **Sistema operativo** | Linux (Ubuntu 20.04+, Debian 11+) / Windows Server / Docker |
| **RAM mínima** | 512 MB (carga ligera — solo WebSocket, sin almacenamiento) |
| **CPU** | 1 vCPU mínimo |
| **Almacenamiento** | 1 GB (solo para el código y logs) |
| **Puerto expuesto** | 443 (producción con HTTPS/WSS) |
| **Certificado TLS** | Requerido (Let's Encrypt, certificado corporativo, o wildcard) |
| **Acceso saliente** | Necesita conectarse a Firebase Admin SDK (*.googleapis.com:443) |
| **Variables de entorno** | Credenciales Firebase Admin (service account JSON) |

> El backend NestJS **no almacena mensajes ni archivos**. Su función es exclusivamente manejar la presencia de usuarios conectados en tiempo real (online/offline/ocupado) y los indicadores de "escribiendo...". Es un componente ligero y stateless.

---

## 8. Consideraciones para el Departamento de Sistemas

### 8.1 Impacto en la red

| Métrica estimada | Valor aproximado |
|---|---|
| Tráfico por mensaje enviado | < 5 KB (texto cifrado + metadatos) |
| Conexión WebSocket por usuario activo | 1 conexión persistente de ~2 KB/min (heartbeat) |
| Descarga inicial de la PWA | ~800 KB — 1.5 MB (una sola vez, queda en caché) |
| Tráfico por archivo compartido | Hasta 50 MB (cifrado punto a punto) |

El consumo de red es bajo para mensajería de texto. Los archivos compartidos son el principal generador de tráfico.

### 8.2 Compatibilidad con proxies corporativos

Si la organización usa un **proxy HTTP/S transparente o con autenticación**, tener en cuenta:

- Las conexiones WebSocket (WSS) pueden ser bloqueadas por proxies que no las soporten. Se puede configurar Socket.io para usar **long-polling** como fallback, aunque con mayor latencia.
- Si el proxy realiza **inspección SSL/TLS deep packet inspection**, los certificados raíz del proxy deben instalarse en los navegadores. Firebase usa certificate pinning en algunas rutas; si hay problemas, se deben excluir los dominios de Google de la inspección.
- Proxies que imponen **timeout agresivo en conexiones idle** pueden cortar las conexiones WebSocket. Se recomienda un timeout mínimo de 120 segundos para conexiones de larga duración.

### 8.3 Almacenamiento en dispositivos del usuario

| Almacenamiento | Tipo | Tamaño estimado | Contenido |
|---|---|---|---|
| Caché del Service Worker | Cache API browser | 2–5 MB | Assets estáticos de la app |
| Claves criptográficas | IndexedDB | < 50 KB | Par de claves RSA 4096-bit (cifradas por el browser) |
| Sesión de usuario | localStorage | < 5 KB | Token de sesión Firebase |

> Las **claves privadas RSA nunca salen del dispositivo**. Se almacenan en IndexedDB usando el sistema de almacenamiento seguro del browser. Chrome/Edge usan DPAPI en Windows para proteger el almacenamiento de IndexedDB a nivel de sistema operativo.

### 8.4 Consideraciones de privacidad y cumplimiento

| Aspecto | Estado | Notas |
|---|---|---|
| **Contenido de mensajes** | Cifrado E2EE — no accesible por el servidor | ✅ |
| **Metadatos** (quién habla con quién, timestamps) | En Firestore (Google Cloud) | ⚠️ Revisar política de datos |
| **Contraseñas** | Firebase Auth — nunca se ven en texto plano | ✅ |
| **Archivos compartidos** | Cifrados AES-256-GCM en Google Storage | ⚠️ Bytes en la nube (cifrados) |
| **Registro de auditoría** | Inmutable en Firestore | ✅ |
| **Localización de datos** | Firebase us-central1 (por defecto) / posibilidad de región EU | ⚠️ Confirmar con NelSystems |

> Si la organización está sujeta a regulaciones de protección de datos (GDPR, normativas locales), se debe revisar con NelSystems la selección de región de Firebase y la política de retención de datos.

### 8.5 Escenario de implementación recomendado para intranet

```
INTRANET DE LA ORGANIZACIÓN
├── Servidor A (Nginx/Apache) — Hosting del frontend Linka
│     Puerto 443 (HTTPS + certificado corporativo)
│     Sirve los archivos estáticos de la PWA
│     Los clientes acceden desde: https://linka.empresa.internal
│
└── [OPCIONAL] Servidor B (Node.js / Docker)
      Puerto 443 (WSS)
      Backend NestJS de NelSystems (si se desea alojar en red interna)
      Aún así necesita salida a internet para Firebase Admin SDK

INTERNET (salida desde ambos servidores y desde workstations)
└── Firebase (Auth + Firestore + Storage + Functions)
```

---

## 9. Resumen Ejecutivo para la Toma de Decisiones

### Lo que Linka ES:
- Mensajería corporativa interna con E2EE militar (RSA-4096 + AES-256-GCM)
- PWA instalable sin necesidad de instalar software adicional en los equipos
- Gestión centralizada de usuarios con roles, vencimientos y auditoría
- El servidor de NelSystems **nunca lee los mensajes** — tecnológicamente imposible

### Lo que Linka REQUIERE:
- Acceso a internet desde los clientes (workstations) hacia los servicios de Firebase (Google Cloud)
- Un certificado TLS válido para el dominio donde se sirva la app (Service Worker lo exige)
- Que los navegadores corporativos no bloqueen IndexedDB, Web Crypto API ni WebSockets
- Un servidor para el backend NestJS de NelSystems (puede ser VPS externo o interno)

### Lo que Linka NO REQUIERE:
- Instalación de software en equipos de usuarios
- Agentes de seguridad adicionales
- Almacenamiento local significativo (< 10 MB total por usuario)
- Cambios en Active Directory o LDAP (autenticación propia)

### Riesgos a evaluar:
| Riesgo | Nivel | Mitigación |
|---|---|---|
| Datos en Google Cloud (Firebase) | Medio | E2EE — Google no puede leer el contenido |
| Pérdida de clave E2EE si se limpia el caché del browser | Bajo | Historial antiguo inaccesible; chat sigue funcionando |
| Dependencia de internet para funcionar | Medio | PWA con caché permite consulta offline; solo envío requiere red |
| Acceso no autorizado si se roba el dispositivo | Bajo | Sesión protegida por contraseña del browser y del sistema operativo |

---

## 10. Contacto y Soporte

Para consultas técnicas adicionales sobre la implementación, requerimientos específicos de red, configuración de proxy o adaptaciones para políticas internas de seguridad, contactar a:

**NelSystems**  
Email de soporte técnico: nelsystems77@gmail.com  
Versión actual del sistema: **Linka v0.1.0** (Mayo 2026)

---

*Documento generado para uso interno del Departamento de Sistemas. La información técnica refleja el estado del sistema en la versión indicada.*
