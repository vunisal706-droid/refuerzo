# Gestor de Refuerzo · puesta en marcha

Usa el **mismo proyecto de Firebase que el Gestor PT y AL** (`gestorpt-7946b`), en una rama
propia: `refuerzo/`. Los datos de PT no se tocan.

## 1 · Crear el repositorio y subir los archivos
1. En GitHub crea un repositorio nuevo llamado **`refuerzo`** (público).
2. Sube **todo el contenido de esta carpeta** (también la carpeta oculta `.github`, `lib/` e `img/`).
3. Settings → Pages → Branch `main` → Save.
4. La app quedará en: `https://vunisal706-droid.github.io/refuerzo/`

No hay que tocar nada en «Dominios autorizados» de Firebase: ya está `vunisal706-droid.github.io`.

## 2 · Dar de alta a las tres maestras
Consola de Firebase → proyecto **gestorpt** → Authentication → Users → **Add user**,
igual que con el Gestor PT (correo = usuario IdEA + `@capitulaciones.local`, contraseña = el mismo usuario IdEA):

| Maestra | Correo | Contraseña |
|---|---|---|
| María Rodríguez | `mrodrod323@capitulaciones.local` | `mrodrod323` |
| Miriam | `mromrod681@capitulaciones.local` | `mromrod681` |
| Cristina | `cmolmar422@capitulaciones.local` | `cmolmar422` |


## 3 · Añadir las reglas de Refuerzo
Realtime Database → Reglas. **No borres lo que hay**: añade el bloque `"refuerzo"` dentro de
`"rules"`, junto a `"gestorpe"`, `"gestorpe_encarna"`, etc. (cuidado con las comas).

```json
"refuerzo": {
  "maria":    { ".read": "auth != null && auth.token.email == 'mrodrod323@capitulaciones.local'",    ".write": "auth != null && auth.token.email == 'mrodrod323@capitulaciones.local'" },
  "miriam":   { ".read": "auth != null && auth.token.email == 'mromrod681@capitulaciones.local'",   ".write": "auth != null && auth.token.email == 'mromrod681@capitulaciones.local'" },
  "cristina": { ".read": "auth != null && auth.token.email == 'cmolmar422@capitulaciones.local'", ".write": "auth != null && auth.token.email == 'cmolmar422@capitulaciones.local'" },
  "banco": {
    ".read":  "auth != null && (auth.token.email == 'mrodrod323@capitulaciones.local' || auth.token.email == 'mromrod681@capitulaciones.local' || auth.token.email == 'cmolmar422@capitulaciones.local')",
    ".write": "auth != null && (auth.token.email == 'mrodrod323@capitulaciones.local' || auth.token.email == 'mromrod681@capitulaciones.local' || auth.token.email == 'cmolmar422@capitulaciones.local')"
  }
}
```

Cada maestra solo ve su alumnado. El **banco** de criterios y saberes es común a las tres.

## Qué guarda la app
- Alumnado **solo por siglas**. Del programa de Séneca se lee el nombre únicamente para calcular las siglas; no se guarda ni la fecha de nacimiento.
- `refuerzo/<maestra>/cursos/<2026-27>/` → alumnos, quincenas, observaciones de evaluación.
- `refuerzo/banco/` → criterios y saberes aprendidos de los programas de Séneca.
