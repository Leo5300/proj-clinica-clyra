# CLAUDE.md

Guidance for working in `app_clinica`, the most actively developed project in this repo (see
the root `CLAUDE.md` for repo-wide conventions).

## Architecture notes

`app_clinica` is the most actively developed project and the one most likely to receive
further work. Structure:

- `App.js` — sets up a single `@react-navigation/stack` `NavigationContainer` as the app's only
  navigation structure. `Splash` is the initial route; screens are registered here with
  `Stack.Screen`. Screens not yet implemented are commented out directly in `App.js` rather
  than removed (e.g. `Paciente`, `Consulta` screens exist under `src/screens/` but aren't wired
  up yet).
- `src/screens/<Feature>/<Feature>.js` — one folder per feature/screen (`Splash`, `Menu`,
  `Medico`, `Paciente`, `Consulta`). `Medico/CadastroEdicaoMedicoScreen.js` is the
  create/edit form screen, separate from the `Medico/Medico.js` list screen.
- `src/components/` — shared UI pieces (`BotaoMenu.js`, `MedicoForm.js`) reused across screens.
- **State is local, not global**: top-level domain data (`medicos`, `pacientes`, `consultas`)
  lives in `useState` inside `App.js` and is passed down as props to screen components (see the
  `MedicoList` wrapper in `App.js`) — there is no Redux/Context/AsyncStorage persistence layer.
  Data is seeded with hardcoded mock arrays; nothing is fetched from a backend yet.
- Assets (icons, logos) live in `assets/` and are referenced by relative path from screens.

Other projects in `ProjetoClinica` (`app_cardexpan`, `app_form_medico`) are smaller,
self-contained demos of a single UI pattern (expandable list cards, form handling/validation)
and are not wired into `app_clinica` — treat them as reference material, not shared code.
