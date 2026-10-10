# Public edition validation

Checked on 10 October 2026.

- Vite production build passed with `/diary/` as the base path.
- Browser: changed interface language to English, created a synthetic entry, edited its title and content, saved it, changed the theme and reloaded the page. Content and preferences remained available.
- `npm audit --omit=dev` reports zero known findings after the compatible gRPC override.
- The Electron wrapper has Node integration disabled and context isolation and sandboxing enabled.
- No personal entries, browser databases, Firebase credentials, dependencies or installers are included in the repository.

Remaining scope: manual Save, local browser persistence, no cloud sync, no backup/export and no encryption. Development-tool dependencies still have npm audit findings. Windows installer packaging and the optional Firebase sandbox adapter were not exercised in this pass.
