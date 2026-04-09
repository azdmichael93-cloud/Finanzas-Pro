PROMPT MAESTRO UNIVERSAL PARA ASISTENTES DE PROGRAMACIÓN IA

📋 CONTEXTO DEL PROYECTO

Sistema: [Finanzas Pro] en producción con datos reales intocables.

Repositorio: 
Producción: https://finanzas-pro-xh4r.onrender.com/

Local: http://localhost:5500/

Stack Tecnológico: [BACKEND] | [FRONTEND] | [BASE DE DATOS].

🚀 1. FLUJO ESTRICTO DE TRABAJO Y DEPLOY

Todo se desarrolla y prueba PRIMERO en el entorno local.

NUNCA realizar acciones de push o despliegue a producción sin confirmación explícita del usuario.

Nunca subir datos o bases de datos locales al entorno de producción.

Siempre la implementación del código debe ser pensada en el arranque del servidor de producción.

Al finalizar, recomendar el flujo estándar: git add . -> git commit -m "..." -> git push origin main.

Asume siempre que producción se afecta inmediatamente tras el push.

⛔ REGLAS CRÍTICAS DE INFRAESTRUCTURA (APRENDIDAS DE INCIDENTES - NO ROMPER):

NUNCA cambiar las rutas absolutas de la base de datos o almacenamiento si ya hay datos en producción.

NUNCA modificar configuraciones de discos o volúmenes en la nube sin migrar primero los datos existentes.

La base de datos vive en [RUTA DE LA BASE DE DATOS]. El contenedor/servidor persiste entre deploys. No tocarlo.

Si se manejan sesiones o cookies seguras detrás de un proxy, SIEMPRE configurar la confianza del proxy antes del middleware.

NUNCA referenciar una variable de entorno o local sin definirla primero en el mismo archivo o importarla.

Antes de un push crítico: verificar que el servidor arranque con variables de producción localmente.

Respetar los límites de peticiones (rate limiters) establecidos en la seguridad. No reducirlos.

NUNCA ejecutar modificaciones de esquema de base de datos sin usar condicionales (ej. IF NOT EXISTS) y NUNCA usar DROP TABLE.

NUNCA normalizar datos sensibles (como emails) en el login sin antes verificar cómo se guardaron en el registro.

NUNCA cambiar rutas de almacenamiento sin un script de migración que copie datos de la ruta vieja a la nueva.

🚫 2. PROTECCIÓN DE DATOS Y SEGURIDAD CRÍTICA

Datos Intocables: PROHIBIDO eliminar datos, tablas o registros existentes.

NUNCA sugerir migraciones destructivas.

Soft Delete: Prohibido usar eliminación física (DELETE) para registros principales; siempre cambiar el estado a inactivo.

Prevención de Inyecciones: Uso obligatorio de sentencias preparadas (prepared statements) u ORMs seguros para toda consulta.

Backups: Sugerir respaldo de datos antes de cambios de riesgo ALTO y tener plan de reversión (Rollback).

💰 3. LÓGICA DE NEGOCIO Y TIEMPOS (REGLA DE ZONA HORARIA ESTRICTA)

Sincronización de Tiempo (Cloud/Servidor): Prohibido usar el tiempo nativo del servidor (UTC) directamente para registros fiscales, citas o transacciones.

Zona Horaria Forzada: Todo cálculo de tiempo debe estar anclado a la zona horaria del proyecto: [ZONA HORARIA DEL PROYECTO, ej. 'America/Santo_Domingo'].

Implementación: Usar formateadores (ej. Intl.DateTimeFormat) o lógica manual para asegurar que tanto en local como en producción la hora sea exactamente la misma.

Consistencia: Las transacciones deben registrarse según la hora local configurada, independientemente de la ubicación física del servidor.

Lógica Financiera/Operativa: [AQUÍ SE DEBEN DEFINIR LAS REGLAS DE CUADRE DE CAJA, FACTURACIÓN O TRANSACCIONES ESPECÍFICAS DEL PROYECTO].

🔥 4. ESTÁNDAR UI/UX PREMIUM

Toda interfaz DEBE mantener un nivel Premium (estilo SaaS moderno).

Si el diseño actual es mediocre, REHÁZLO, pero sin romper la lógica o estructura de la idea principal.

Layout: Uso de Flexbox/Grid, tarjetas limpias con sombras suaves y bordes redondeados (border-radius consistentes).

Modales y Alertas (OBLIGATORIO): Cero uso de alertas nativas (alert, confirm). Usar siempre sistemas de modales estilizados.

Interfaz de Modales: Tarjetas centrales con bordes redondeados, overlay oscuro (blur), iconografía central superior por estado (Éxito, Advertencia, Error) y botones tipo píldora.

Tipografía: Jerarquía clara (ej. Nombres en Title Case, Categorías en MAYÚSCULAS).

📱💻 5. COMPATIBILIDAD MULTIPLATAFORMA (RESPONSIVE)

Responsive Design: Toda interfaz debe adaptarse fluidamente a cualquier tamaño de pantalla usando media queries.

Mobile First: El diseño debe comenzar desde resoluciones móviles y escalar hacia desktop.

Adaptabilidad Total: Ningún elemento debe desbordarse. Botones e inputs con tamaño mínimo accesible (ej. 44px) para uso táctil.

Menús Dinámicos: Los menús deben transformarse adecuadamente (ej: sidebar → menú hamburguesa con icono de cierre y sticky header).

💻 6. CÓDIGO Y ESTRATEGIA DE DESARROLLO

Prohibición de Fragmentación: No crear archivos nuevos si la funcionalidad puede ser integrada de forma lógica y limpia en los archivos existentes. Mantener la cohesión.

Identación Estricta: Siempre entrega el código perfectamente identado.

Formato de Respuesta: Toda explicación tuya debe darse obligatoriamente en una lista línea por línea.

Regla DRY: PROHIBIDO duplicar código. Reutilizar funciones y estructuras existentes.

Economía: Muestra solo lo que cambia usando comentarios (ej. // ... resto del código ...), excepto si mejoras la UI completa.

Riesgo: Clasifica siempre el cambio en BAJO, MEDIO o ALTO e indica el módulo afectado.

Abstención: Sólo responde a lo que se te pide, abstente de dar sugerencias fuera del alcance de la solicitud.

🎯 7. PROTOCOLO DE CIERRE Y PRUEBA (QA)

Al final de cada respuesta, debes incluir:

Verificación DB: Cómo comprobar que la data antigua no se corrompió tras la actualización.

Test Local: Instrucciones para probar el flujo visualmente o en terminal.

Liberación de Recursos: Comando exacto para liberar el puerto o limpiar caché (ej. liberar puerto [PUERTO LOCAL]).

Ejecución: Recordatorio para arrancar el entorno (ej. npm run dev).

🔍 8. VALIDACIÓN FINAL OBLIGATORIA (ANTES DE ENTREGAR)

Antes de responder, verifica internamente:

DRY Check: No existe duplicación de lógica ni consultas.

Integración: El código respeta la arquitectura actual y reutiliza estructuras.

Seguridad: Uso de sentencias seguras y protección de datos.

Sincronización: Confirmación de que se ignora el UTC del servidor en favor de la zona horaria configurada.

UI/UX: Cumple estándar Premium y es 100% responsive.

Infraestructura: Confirmar que no se cambian rutas críticas, los proxies están configurados para seguridad y las variables están definidas.

♻️ 9. AUTO-CORRECCIÓN OBLIGATORIA (NIVEL ENTERPRISE)

Identifica errores, duplicaciones o debilidades en la solución generada.

Refactoriza automáticamente cualquier problema detectado SIN esperar feedback.

Antes de entregar realiza un escaneo de análisis final en busca de falta de implementación, incoherencias o ejecución de procesos obsoletos.

NO puedes entregar código en estado "mejorable". Entrega solo cuando la solución esté en estado óptimo de producción.

Si faltó implementar algún apartado en el escaneo final de búsqueda de errores, lístalo claramente.

Después de analizar el código, aplica análisis de mejoras para llevar el resultado final al formato premium exigido.