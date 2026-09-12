# KineSys — Architecture & Handoff Guide

## Purpose

This document describes the production repository layout after the structural cleanup and handoff organization work. It is intended to let a senior engineer enter the project without reverse-engineering a flat root directory.

The reorganization is path-only. Existing public names, functions, IDs, object keys, Supabase tables/RPCs, clinical contracts and persistence behavior were preserved. Clinical logic was not redesigned as part of this work.

## Production entrypoints

The repository root intentionally contains only five files:

- `index.html` — main KineSys application entrypoint.
- `recuperar-acesso.html` — password/access recovery entrypoint.
- `default.php` — hosting/provider default PHP entrypoint retained intentionally.
- `DESIGN.md` — Impeccable design context; intentionally kept at root.
- `PRODUCT.md` — Impeccable product context; intentionally kept at root.

No production `.js` or `.css` file should be placed directly in the repository root.

## Runtime source tree

```text
src/
├── admin/      # access/team/admin modules
├── agenda/     # scheduling runtime and lifecycle modules
├── auth/       # login/access UI helpers
├── clinical/   # clinical engine, HMA reasoning, regional loaders, evaluation runtime
├── core/       # central application/core infrastructure and shared modules
├── finance/    # finance, credits, pending items, billing/workspace modules
├── home/       # home/dashboard runtime
├── patient/    # patient registration, records, deletion, normalization, export
├── reports/    # report UI helpers
└── ui/         # screen loader, menu, input/UI helpers
```

### Critical runtime files

- Core application: `src/core/script-1.18.0.js`
- Lazy screen loader: `src/ui/screen_loader-1.25.0.js`
- Agenda: `src/agenda/agenda-1.20.0.js`
- Authentication: `src/auth/login_access-1.18.0.js`
- Team management: `src/admin/team_management_core-1.0.0.js`
- Patient normalization: `src/patient/patient_data_normalization_core-1.0.0.js`
- Patient form helpers: `src/patient/patient_form_helpers_core-1.0.0.js`
- Patient export bootstrap: `src/patient/prontuario_export.js`
- Patient export implementation: `src/patient/prontuario_export_impl.js`
- Finance workspace: `src/finance/financeiro_workspace-1.20.1.js`

## Clinical engine

Clinical runtime is isolated under `src/clinical/` while the clinical knowledge/data bank remains under `database/`.

Important reasoning files:

- `src/clinical/clinical_reasoning_hma-3.0.0.js`
- `src/clinical/clinical_reasoning_shoulder-3.1.0.js`
- `src/clinical/clinical_reasoning_elbow-3.1.0.js`
- `src/clinical/clinical_reasoning_wrist-3.1.0.js`
- `src/clinical/clinical_reasoning_cervical-3.1.0.js`
- `src/clinical/clinical_engine-1.17.0.js`
- `src/clinical/clinical_region_loader-1.0.0.js`
- `src/clinical/cirurgias-1.18.0.js`

Clinical regression gates must be treated as blocking for clinical changes. Do not alter consolidated clinical behavior merely to satisfy a stale path assertion; update a stale contract only when the current runtime architecture proves the contract is outdated.

## Styles

All production stylesheets live under `styles/`.

The two files moved during the first folder-organization batch remain:

- `styles/design_polish.css`
- `styles/design_experience.css`

The remaining active root styles were later moved into the same directory. Relative asset paths must be resolved from the stylesheet location. For example, `styles/design_base.css` references the letterhead image as `../assets/timbrado-fisiofix.png`.

## Screens and lazy loading

- `screens/` contains screen fragments/templates loaded by the application.
- `src/ui/screen_loader-1.25.0.js` is the canonical lazy screen/resource loader.
- Lazy paths in the loader point to the organized `src/` and `styles/` locations.
- Do not duplicate lazy-loaded runtime files back into the repository root for compatibility. Update the canonical loader/path contract instead.

## Data and backend-related directories

- `database/` — client-side clinical/domain data and regional clinical banks.
- `supabase/` — Supabase project/function resources.
- `SUPABASE_SQL/` — SQL migrations/scripts retained as explicit database artifacts.

Supabase schema, tables, RPCs and persistence contracts are outside the scope of folder-only refactoring. Changes to them require independent analysis and migration discipline.

## Static assets

- `assets/` — images and other static resources.
- CSS asset references are relative to the stylesheet location.

## Tests and CI

- `tests/` contains contracts, regressions, adversarial and chaos suites.
- `.github/workflows/` contains CI orchestration.
- `tests/handoff_layout.contract.js` protects the organized root and critical paths.
- The Windows self-hosted runner is used for the migrated blocking gates while hosted Actions quota is constrained.

Key gates include the KineSys Quality Gate, clinical regression, screen-loader contracts, team management, patient contracts, Fisio Home, Phase 5 cleanup/closeout contracts and the handoff layout contract.

## Deployment

Production domain: `app.fisiofixfisioterapia.com`.

Hostinger Git deployment is connected to:

- Repository: `olvjesse-beep/Kinesys`
- Branch: `main`
- Deployment root: `public_html`
- Automatic deployment: enabled

Production should mirror `main`. A moved file should resolve at its new path and the old root path should return 404. Do not maintain duplicate production copies solely to preserve obsolete paths.

## Maintenance rules

1. Work from the current GitHub source, not from reconstructed or local-only copies.
2. Preserve existing public names/contracts unless a deliberate migration is approved.
3. Keep runtime JS under the appropriate `src/<domain>/` directory.
4. Keep production CSS under `styles/`.
5. Keep root limited to the five documented entry/context files.
6. Do not move clinical, Supabase or persistence behavior as part of unrelated refactors.
7. Update literal/lazy paths and their contracts in the same PR as any future file move.
8. Run relevant regression/contracts before merge.
9. Prefer small functional PRs after this handoff reorganization; do not combine future architectural cleanup with feature behavior changes.
10. Use squash merge only after the required checks execute successfully.

## Historical cleanup

Phase 5A and Phase 5B removed superseded/unreferenced legacy copies before this organization. The current layout is therefore intended to represent active source, not an archive. Historical versions remain available through Git history rather than duplicate files in production.
