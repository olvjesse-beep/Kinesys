# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

KineSys is a commercial product for physiotherapy clinics and physiotherapy professionals. Its primary use context is day-to-day clinical and administrative work, including patient care, scheduling, clinical documentation, operational analysis, and team access.

## Product Purpose

KineSys is a clinical management system for physiotherapy that integrates patient records and assessments, the Clinical Engine, scheduling, clinical progress/evolution, administrative and financial analysis, and access control.

Its purpose is to support clinical reasoning while reducing fragmentation across the care workflow. Product success means making clinical and operational work more coherent, reliable, and efficient without weakening professional judgment or the integrity of clinical records.

## Positioning

KineSys combines clinic management with a physiotherapy-specific Clinical Engine and structured assessment workflow. The product is intended to support the clinician's reasoning process instead of behaving only as a generic appointment, finance, or record-management system.

## Operating Context

- Used during and around physiotherapy consultations.
- Supports patient assessment, clinical findings, evolution/progress records, and scheduling.
- Includes administrative and financial workflows.
- Supports multiple users through access-control and permission rules.
- Uses Supabase-backed persistence and permissions in the existing application architecture.

## Capabilities and Constraints

- Preserve the existing clinical logic unless a change is explicitly requested.
- Preserve compatibility with the existing Supabase data model, permissions, and persistence unless migration is explicitly part of the task.
- Preserve existing names, keys, identifiers, and structural contracts when modifying implementation files; do not rename established structures without an explicit requirement.
- Treat clinical data as sensitive information and design product behavior with privacy and LGPD obligations in mind.
- Changes to UI or design must not silently alter clinical behavior, stored data semantics, permissions, or workflow logic.
- The current repository contains a mature production Design System and existing application code; work should extend or refine the incumbent product rather than treat it as greenfield.

## Brand Commitments

- Product name: KineSys.
- The existing KineSys Design System is a binding reference for future interface work unless the user explicitly requests a redesign or rebrand.
- The product should retain a professional clinical tone and avoid visual or interaction choices that reduce clarity during prolonged clinical use.

## Evidence on Hand

- Existing production application code in this repository.
- Existing KineSys Design System under `DESIGN_SYSTEM/`.
- Production design validation under `DESIGN_SYSTEM/ETAPA_15_PRODUCAO/`, including metrics and final validation.
- Existing modules include scheduling, assessment/clinical experience, administrative analysis, and financial analysis.
- Do not fabricate customers, testimonials, clinical outcomes, benchmarks, pricing, certifications, or regulatory claims that are not present in verified project evidence.

## Product Principles

1. Clinical reasoning support must remain central to the product.
2. Reduce fragmentation between clinical, scheduling, and administrative workflows.
3. Preserve data integrity, permissions, and traceability when evolving the product.
4. Prefer explicit, professional, low-friction workflows suitable for repeated daily clinical use.
5. Commercial expansion must not compromise privacy, LGPD obligations, or clinical reliability.

## Accessibility & Inclusion

The interface should preserve legibility, comfortable control sizes, clear hierarchy, and responsive reflow for prolonged professional use. Existing production Design System accessibility and readability constraints should be preserved unless a deliberate, validated change replaces them.
