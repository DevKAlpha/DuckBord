# DuckBord para escritorio

DuckBord también se instala como programa en Windows, macOS y Linux (historia 27). Es la misma app de la web, en su propia ventana. Los tableros se guardan en una base de datos SQLite del equipo, así que el navegador no los puede borrar.

## Descargar e instalar

Los instaladores están en **GitHub Releases** del repositorio (`DevKAlpha/DuckBord`, sección _Releases_).

| Sistema                       | Archivo                                           | Notas                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows 10/11 (64 bits)       | `DuckBord-<versión>-Windows-Setup.exe`            | Pide permisos de administrador. Se instala en `C:\Program Files (x86)\DuckBord` (la carpeta se puede cambiar en el asistente). Crea accesos en el escritorio y en el menú Inicio. |
| macOS (Intel o Apple Silicon) | `DuckBord-<versión>-macOS-x64.dmg` o `-arm64.dmg` | Arrastrar DuckBord a Aplicaciones.                                                                                                                                                |
| Linux (64 bits)               | `DuckBord-<versión>-Linux-….AppImage` o `….deb`   | AppImage: dar permiso de ejecución y abrir. Debian/Ubuntu: `sudo apt install ./DuckBord-…deb`.                                                                                    |

**Aviso de sistema la primera vez.** Los instaladores todavía no llevan firma de un certificado de pago:

- Windows muestra "Windows protegió su PC": _Más información_ > _Ejecutar de todas formas_.
- macOS dice que no puede comprobar el desarrollador: _Ajustes del Sistema_ > _Privacidad y seguridad_ > _Abrir igualmente_.

Para quitar esos avisos hace falta un certificado de firma de código (Windows) y una cuenta de Apple Developer (macOS). Se cargan como secretos de GitHub Actions (`CSC_LINK`, `CSC_KEY_PASSWORD`), y en `apps/desktop/electron-builder.ts` se quita la firma ad-hoc de macOS (`identity: '-'`).

## Dónde quedan los datos

El programa se instala en una carpeta de solo lectura. Los datos van a la carpeta del usuario, y se conservan al desinstalar o actualizar:

| Sistema | Carpeta                                  |
| ------- | ---------------------------------------- |
| Windows | `%APPDATA%\DuckBord`                     |
| macOS   | `~/Library/Application Support/DuckBord` |
| Linux   | `~/.config/DuckBord`                     |

- `duckbord.db`: tableros, pizarras y tableros de equipo (SQLite).
- `logs/duckbord.log`: registro de errores. Se abre desde **Ayuda > Abrir registro de errores**. Guarda los errores de la app, de la base de datos y de la página, con su detalle. Cuando pasa de 1 MB se rota y se guardan solo los 3 anteriores.

Para pasar tableros desde la web: en la web, _Exportar_; en la app, _Importar JSON_. Cada uno guarda sus propios datos.

## Qué cambia respecto a la web

- Los tableros no dependen del almacenamiento del navegador.
- El corrector ortográfico del sistema funciona en el idioma de la app (con inglés de apoyo para palabras técnicas), y el clic derecho muestra las sugerencias.
- Los enlaces se abren en el navegador.
- Las cuentas de Google y Microsoft (Conexiones) todavía no se conectan desde la app: su inicio de sesión vuelve a la web. Se pueden usar desde la versión web.

## Publicar una versión

1. En `apps/desktop/package.json`, cambiar las dos versiones:
   - `displayVersion`: la versión pública (por ejemplo `0.2A`). Es la que llevan los instaladores, la Release y _Acerca de DuckBord_.
   - `version`: la misma en números (`0.2.0`). npm y el instalador de Windows solo aceptan números.
2. Crear y subir la etiqueta con la versión pública: `git tag v0.2A && git push origin v0.2A`.
3. GitHub Actions (`.github/workflows/desktop.yml`) construye los instaladores en Windows, macOS y Linux y crea la Release con ellos.

Cada push que toca `apps/desktop` también construye los tres instaladores como comprobación (quedan 14 días en la pestaña _Actions_).

## Desarrollo

```
npm run start -w @devbord/desktop   # compila la web para escritorio y abre la app
npm run dist -w @devbord/desktop    # instalador del sistema actual en apps/desktop/release
```
