#!/usr/bin/env node

const { spawn, execFile } = require('child_process');

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

// Teams has its own idle timer (~5 min) independent from the OS screensaver.
// Every 4 min we simulate a harmless keystroke to reset it.
//   Windows : ScrollLock toggle via WScript.Shell — no extra permissions needed.
//   macOS   : F15 keypress via osascript — requires Accessibility permission.
const JIGGLE_INTERVAL_MS = 4 * 60 * 1000;

const WIN_JIGGLE_CMD = [
  '-NonInteractive', '-NoProfile', '-Command',
  `$wsh = New-Object -ComObject WScript.Shell; $wsh.SendKeys('{SCROLLLOCK}'); Start-Sleep -Milliseconds 150; $wsh.SendKeys('{SCROLLLOCK}')`,
];

let jiggleWarned = false;

function jiggle() {
  if (process.platform === 'win32') {
    execFile('powershell.exe', WIN_JIGGLE_CMD, () => {});
  } else if (process.platform === 'darwin') {
    execFile('osascript', ['-e', 'tell application "System Events" to key code 113'], (err) => {
      if (err && !jiggleWarned) {
        jiggleWarned = true;
        console.warn('\nAviso: no se pudo simular teclado. Teams puede mostrarte como Ausente.');
        console.warn('Para activarlo: Ajustes del sistema > Privacidad > Accesibilidad > agrega Terminal.\n');
      }
    });
  }
}

function spawnProcess() {
  switch (process.platform) {
    case 'win32':
      return {
        proc: spawn('powershell.exe', ['-NonInteractive', '-NoProfile', '-Command', PS_SCRIPT]),
        readySignal: 'ready',
        notFoundMsg: 'No se encontro powershell.exe. Este script requiere Windows con PowerShell.',
      };
    case 'darwin':
      return {
        proc: spawn('caffeinate', ['-d', '-i', '-s']),
        readySignal: null,
        notFoundMsg: 'No se encontro caffeinate. Deberia estar instalado en macOS por defecto.',
      };
    default:
      console.error(`Sistema operativo no soportado: ${process.platform}`);
      process.exit(1);
  }
}

console.log('coffee-sleep — pantalla encendida + Teams en verde');
console.log('Presiona Ctrl+C para salir.\n');

const { proc, readySignal, notFoundMsg } = spawnProcess();

if (readySignal) {
  proc.stdout.on('data', (data) => {
    if (data.toString().includes(readySignal)) {
      console.log('Activo. Pantalla encendida y Teams en verde cada 4 minutos.');
    }
  });
} else {
  console.log('Activo. Pantalla encendida y Teams en verde cada 4 minutos.');
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

setInterval(jiggle, JIGGLE_INTERVAL_MS);

function cleanup() {
  console.log('\nCerrando... La pantalla puede apagarse normalmente.');
  proc.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
