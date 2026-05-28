#!/usr/bin/env node

const { spawn } = require('child_process');

// Windows: spawns PowerShell that calls SetThreadExecutionState(ES_CONTINUOUS |
// ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED). State is held while the process lives.
// The C# method handles the uint literal directly, avoiding PowerShell's
// hex-to-Int32 parsing which turns 0x80000003 into a negative number before cast.
const PS_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class PowerMgmt {
    [DllImport("kernel32.dll")]
    public static extern uint SetThreadExecutionState(uint esFlags);
    public static void PreventSleep() {
        SetThreadExecutionState(0x80000003u);
    }
}
"@
[PowerMgmt]::PreventSleep()
Write-Host "ready"
while (\$true) { Start-Sleep -Seconds 30 }
`;

function spawnProcess() {
  switch (process.platform) {
    case 'win32':
      return {
        proc: spawn('powershell.exe', ['-NonInteractive', '-NoProfile', '-Command', PS_SCRIPT]),
        readySignal: 'ready',
        notFoundMsg: 'No se encontro powershell.exe. Este script requiere Windows con PowerShell.',
      };
    case 'darwin':
      // -d: prevent display sleep, -i: prevent idle sleep, -s: prevent system sleep
      return {
        proc: spawn('caffeinate', ['-d', '-i', '-s']),
        readySignal: null, // caffeinate no imprime nada, se activa al arrancar
        notFoundMsg: 'No se encontro caffeinate. Deberia estar instalado en macOS por defecto.',
      };
    default:
      console.error(`Sistema operativo no soportado: ${process.platform}`);
      process.exit(1);
  }
}

console.log('coffee-sleep — pantalla siempre encendida');
console.log('Presiona Ctrl+C para salir.\n');

const { proc, readySignal, notFoundMsg } = spawnProcess();

if (readySignal) {
  proc.stdout.on('data', (data) => {
    if (data.toString().includes(readySignal)) {
      console.log('Activo. La pantalla no se apagara mientras este script este corriendo.');
    }
  });
} else {
  // caffeinate no da señal — mostramos el mensaje al arrancar
  console.log('Activo. La pantalla no se apagara mientras este script este corriendo.');
}

proc.stderr.on('data', (data) => {
  console.error('Error:', data.toString().trim());
});

proc.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error(notFoundMsg);
  } else {
    console.error('Error al iniciar el proceso:', err.message);
  }
  process.exit(1);
});

proc.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`El proceso salio con codigo ${code}`);
    process.exit(1);
  }
});

function cleanup() {
  console.log('\nCerrando... La pantalla puede apagarse normalmente.');
  proc.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
