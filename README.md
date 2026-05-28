# coffee-sleep

Mantiene la pantalla de tu computadora siempre encendida mientras el script está corriendo. Sin dependencias, sin instalación de paquetes.

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

Para detenerlo, presioná **Ctrl+C**. La pantalla volverá al comportamiento normal automáticamente.

## Cómo funciona

| Sistema | Mecanismo |
|---------|-----------|
| Windows | Llama a `SetThreadExecutionState` vía PowerShell con los flags `ES_CONTINUOUS`, `ES_DISPLAY_REQUIRED` y `ES_SYSTEM_REQUIRED` |
| macOS | Lanza `caffeinate -d -i -s` (display + idle + system sleep) |

En ambos casos, la pantalla se mantiene encendida mientras el proceso hijo está vivo. Al hacer Ctrl+C, el proceso se cierra y el sistema operativo restaura la configuración original — no hace falta ningún reset manual.
