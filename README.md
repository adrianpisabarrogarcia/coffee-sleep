# coffee-sleep

Mantiene la pantalla siempre encendida y el estado de Teams (u otros apps) en verde. Sin dependencias, sin instalación de paquetes.

## Requisitos

- Node.js 14 o superior
- **Windows**: PowerShell (incluido por defecto)
- **macOS**: `caffeinate` (incluido por defecto)

## Uso

```bash
node index.js
```

O con npm:

```bash
npm start
```

Para detenerlo presioná **Ctrl+C**. La pantalla y el estado de Teams vuelven al comportamiento normal.

## Cómo funciona

### Pantalla encendida

| Sistema | Mecanismo |
|---------|-----------|
| Windows | `SetThreadExecutionState` vía PowerShell con flags `ES_CONTINUOUS`, `ES_DISPLAY_REQUIRED` y `ES_SYSTEM_REQUIRED` |
| macOS | `caffeinate -d -i -s` (display + idle + system sleep) |

### Teams en verde

Teams tiene su propio timer de inactividad (~5 minutos), independiente del protector de pantalla del sistema. Cada 4 minutos el script simula una pulsación de teclado inocua para resetearlo:

| Sistema | Mecanismo |
|---------|-----------|
| Windows | Toggle de ScrollLock vía `WScript.Shell` — sin permisos extra |
| macOS | Tecla F15 vía `osascript` — requiere permiso de Accesibilidad |

#### Permiso de Accesibilidad en macOS

Si ves el aviso `"no se pudo simular teclado"`, otorgá el permiso manualmente:

**Ajustes del sistema → Privacidad y Seguridad → Accesibilidad → agrega Terminal** (o la app desde donde corras el script).
