from pathlib import Path
import re

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    if new in text and old not in text:
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 occurrence, found {count}')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# index.html — semantic brand, mobile safe area, deferred scripts, product copy
# ---------------------------------------------------------------------------
path = 'index.html'
text = read(path)
text = replace_once(
    text,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">',
    'viewport-fit'
)
text = replace_once(
    text,
    '<div class="header-brand" onclick="navegarPara(\'tela_home\')">',
    '<a class="header-brand" href="#tela_home" onclick="navegarPara(\'tela_home\'); return false;" aria-label="Ir para o início do KineSys">',
    'semantic header brand open'
)
text = replace_once(
    text,
    '                <p>Plataforma de Triagem Biomecânica</p>\n            </div>',
    '                <p>Gestão clínica e apoio à decisão</p>\n            </a>',
    'semantic header brand close and product copy'
)

# Preserve dependency order while allowing browser parallel download.
script_before = len(re.findall(r'<script\s+(?![^>]*\bdefer\b)[^>]*\bsrc=', text, flags=re.I))
text = re.sub(r'<script\s+(?![^>]*\bdefer\b)([^>]*\bsrc=)', r'<script defer \1', text, flags=re.I)
script_after = len(re.findall(r'<script\s+(?![^>]*\bdefer\b)[^>]*\bsrc=', text, flags=re.I))
if script_before < 20 or script_after != 0:
    raise RuntimeError(f'defer patch invariant failed: before={script_before}, after={script_after}')
write(path, text)


# ---------------------------------------------------------------------------
# design_tokens.css — AA-safe secondary text roles
# ---------------------------------------------------------------------------
path = 'design_tokens.css'
text = read(path)
text = replace_once(text, '  --kds-muted: #667A7F;', '  --kds-muted: #607479;', 'AA muted')
text = replace_once(text, '  --kds-text-subtle: #718086;', '  --kds-text-subtle: #607479;', 'AA text subtle')
text = replace_once(text, '  --kds-muted-refined: #687C81;', '  --kds-muted-refined: #607479;', 'AA muted refined')
if '--kds-placeholder:' not in text:
    text = text.replace('  --kds-faint: #87979A;\n', '  --kds-faint: #87979A;\n  --kds-placeholder: #607479;\n', 1)
write(path, text)


# ---------------------------------------------------------------------------
# design_components.css — keyboard-accessible pill controls + placeholder token
# ---------------------------------------------------------------------------
path = 'design_components.css'
text = read(path)
text = replace_once(text, '  color:#8B989B;\n  opacity:1;', '  color:var(--kds-placeholder);\n  opacity:1;', 'placeholder contrast')
marker = 'KineSys accessibility hardening — focusable choice controls'
if marker not in text:
    text += '''\n\n/* ==========================================================================\n   KineSys accessibility hardening — focusable choice controls\n   Mantém o input nativo no fluxo de teclado e usa o span apenas como superfície.\n   ========================================================================== */\n.checkbox-pill, .agenda-dia-pill{position:relative}\n.checkbox-pill input[type="checkbox"],\n.checkbox-pill input[type="radio"],\n.agenda-dia-pill input[type="checkbox"],\n.agenda-dia-pill input[type="radio"]{\n  position:absolute!important;\n  inline-size:1px!important;\n  block-size:1px!important;\n  margin:0!important;\n  padding:0!important;\n  opacity:0!important;\n  overflow:hidden!important;\n  clip-path:inset(50%)!important;\n  white-space:nowrap!important;\n}\n.checkbox-pill input:focus-visible + span,\n.agenda-dia-pill input:focus-visible + span{\n  outline:3px solid rgba(42,167,157,.24);\n  outline-offset:2px;\n}\n'''
write(path, text)


# ---------------------------------------------------------------------------
# design_screens.css — tokenized AA text + intentional reduced-motion behavior
# ---------------------------------------------------------------------------
path = 'design_screens.css'
text = read(path)
text = text.replace('color:#748A8E!important', 'color:var(--kds-text-subtle)!important')
text = text.replace('color:#708286!important', 'color:var(--kds-text-subtle)!important')
old_motion = '@media (prefers-reduced-motion:reduce){\n  *, *::before, *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}\n}'
new_motion = '''@media (prefers-reduced-motion:reduce){\n  html:focus-within{scroll-behavior:auto!important}\n  .radar-launcher.novo-alerta{animation:none!important}\n  body.ks-design-ready #ks_sidebar,\n  .ks-nav-backdrop,\n  .modal-overlay,\n  .ks-dialog-overlay,\n  .ks-eval-dialog-backdrop{transition:none!important}\n}'''
text = replace_once(text, old_motion, new_motion, 'reduced motion')
write(path, text)


# ---------------------------------------------------------------------------
# design_navigation.css — semantic brand anchor keeps existing visual behavior
# ---------------------------------------------------------------------------
path = 'design_navigation.css'
text = read(path)
needle = '#ks_sidebar .header-brand{\n  display:grid;'
replacement = '#ks_sidebar .header-brand{\n  display:grid;\n  text-decoration:none;'
text = replace_once(text, needle, replacement, 'brand anchor styling')
write(path, text)


# ---------------------------------------------------------------------------
# design_responsive.css — coarse-pointer targets without inflating desktop density
# ---------------------------------------------------------------------------
path = 'design_responsive.css'
text = read(path)
marker = 'KineSys touch adaptation — coarse pointer'
if marker not in text:
    text += '''\n\n/* ==========================================================================\n   KineSys touch adaptation — coarse pointer\n   A área clicável chega a 44px em dispositivos de toque sem aumentar a densidade desktop.\n   ========================================================================== */\n@media (pointer:coarse){\n  body.ks-design-ready .btn-primary,\n  body.ks-design-ready .btn-secondary,\n  body.ks-design-ready .btn-nav,\n  body.ks-design-ready .btn-danger,\n  body.ks-design-ready .btn-compact,\n  body.ks-design-ready .btn-link-compacto{min-height:44px}\n\n  body.ks-design-ready .ks-patient-clear,\n  body.ks-design-ready .ks-eval-dialog-close,\n  body.ks-design-ready .radar-painel-fechar,\n  body.ks-design-ready .agenda-semana-nav > button{\n    min-width:44px;\n    min-height:44px;\n  }\n\n  body.ks-design-ready .checkbox-pill span,\n  body.ks-design-ready .agenda-dia-pill{\n    min-height:44px;\n    display:inline-flex;\n    align-items:center;\n  }\n}\n'''
write(path, text)


# ---------------------------------------------------------------------------
# avaliacao_experiencia-1.22.0.css — reuse KDS color/type roles and breakpoint contract
# ---------------------------------------------------------------------------
path = 'avaliacao_experiencia-1.22.0.css'
text = read(path)
text = replace_once(text, '    --eval-ink: #153f46;', '    --eval-ink: var(--kds-text);', 'eval ink token')
text = replace_once(text, '    --eval-muted: #60777b;', '    --eval-muted: var(--kds-muted);', 'eval muted token')
text = replace_once(text, '    --eval-line: #dbe7e4;', '    --eval-line: var(--kds-line);', 'eval line token')
text = replace_once(text, '    --eval-soft: #f5f9f8;', '    --eval-soft: var(--kds-surface-soft);', 'eval soft token')
text = replace_once(text, '    --eval-accent: #159f91;', '    --eval-accent: var(--kds-accent);', 'eval accent token')
font_map = {
    'font-size: 11px;': 'font-size: var(--kds-font-metadata);',
    'font-size: 12px;': 'font-size: var(--kds-font-metadata);',
    'font-size: 13px;': 'font-size: var(--kds-font-label);',
    'font-size: 14px;': 'font-size: var(--kds-font-ui);',
    'font-size: 18px;': 'font-size: var(--kds-font-heading-sm);',
    'font-size: 20px;': 'font-size: var(--kds-font-heading-md);',
    'font-size: 22px;': 'font-size: var(--kds-font-heading-lg);',
}
for old, new in font_map.items():
    text = text.replace(old, new)
text = text.replace('@media (max-width: 720px)', '@media (max-width: 700px)')
text = text.replace('background: #f2fbf9;', 'background: var(--kds-accent-soft);')
text = text.replace('background: #fff;', 'background: var(--kds-surface);')
write(path, text)


# ---------------------------------------------------------------------------
# design_system-1.20.1.js — systemic labels, legacy modal semantics/focus, SPA announcement
# ---------------------------------------------------------------------------
path = 'design_system-1.20.1.js'
text = read(path)
marker = 'KineSysAccessibilityHardening_v1221'
if marker not in text:
    text += r'''\n\n/* KineSysAccessibilityHardening_v1221\n * Acessibilidade transversal sem alterar IDs, funções clínicas ou contratos de dados.\n */\n(function KineSysAccessibilityHardening_v1221(){\n  'use strict';\n\n  const focusableSelector = [\n    'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',\n    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'\n  ].join(',');\n  const modalReturnFocus = new WeakMap();\n  let activeLegacyModal = null;\n\n  function bindLabels(root=document){\n    root.querySelectorAll('.input-group label:not([for])').forEach(label => {\n      if (label.querySelector('input,select,textarea')) return;\n      const group = label.closest('.input-group');\n      if (!group) return;\n      const control = group.querySelector('input:not([type="hidden"]),select,textarea');\n      if (control && control.id) label.htmlFor = control.id;\n    });\n  }\n\n  function normalizeLegacyDialogs(root=document){\n    root.querySelectorAll('.modal-overlay').forEach((overlay, index) => {\n      const box = overlay.querySelector(':scope > .modal-box');\n      if (!box) return;\n      box.setAttribute('role','dialog');\n      box.setAttribute('aria-modal','true');\n      const title = box.querySelector('h1,h2,h3');\n      if (title) {\n        if (!title.id) title.id = (overlay.id || 'ks_modal_' + index) + '_titulo';\n        box.setAttribute('aria-labelledby', title.id);\n      }\n      const close = box.querySelector('.modal-fechar');\n      if (close) {\n        close.type = 'button';\n        if (!close.hasAttribute('aria-label')) {\n          close.setAttribute('aria-label', title ? 'Fechar ' + title.textContent.trim() : 'Fechar diálogo');\n        }\n      }\n    });\n  }\n\n  function modalIsVisible(overlay){\n    if (!overlay || overlay.hidden) return false;\n    const style = getComputedStyle(overlay);\n    return style.display !== 'none' && style.visibility !== 'hidden' && overlay.getClientRects().length > 0;\n  }\n\n  function syncLegacyModalFocus(){\n    const visible = Array.from(document.querySelectorAll('.modal-overlay')).filter(modalIsVisible);\n    const current = visible.length ? visible[visible.length - 1] : null;\n    if (current === activeLegacyModal) return;\n\n    if (activeLegacyModal && !current) {\n      const returnTo = modalReturnFocus.get(activeLegacyModal);\n      activeLegacyModal.dataset.ksA11yOpen = '0';\n      activeLegacyModal = null;\n      if (returnTo && returnTo.isConnected && typeof returnTo.focus === 'function') {\n        requestAnimationFrame(() => returnTo.focus({preventScroll:true}));\n      }\n      return;\n    }\n\n    if (current) {\n      activeLegacyModal = current;\n      if (current.dataset.ksA11yOpen !== '1') {\n        modalReturnFocus.set(current, document.activeElement);\n        current.dataset.ksA11yOpen = '1';\n        const box = current.querySelector(':scope > .modal-box');\n        const first = box && box.querySelector(focusableSelector);\n        if (first) requestAnimationFrame(() => first.focus({preventScroll:true}));\n        else if (box) { box.tabIndex = -1; requestAnimationFrame(() => box.focus({preventScroll:true})); }\n      }\n    }\n  }\n\n  function installRouteAnnouncements(){\n    if (!document.getElementById('ks_route_status')) {\n      const live = document.createElement('div');\n      live.id = 'ks_route_status';\n      live.className = 'kds-visually-hidden';\n      live.setAttribute('role','status');\n      live.setAttribute('aria-live','polite');\n      live.setAttribute('aria-atomic','true');\n      document.body.appendChild(live);\n    }\n\n    const original = window.navegarPara;\n    if (typeof original !== 'function' || original.__ksA11yWrapped) return;\n    const wrapped = function(idTela, ...args){\n      const result = original.call(this, idTela, ...args);\n      if (idTela !== 'tela_login') {\n        requestAnimationFrame(() => {\n          const target = document.getElementById(idTela);\n          if (!target || !target.classList.contains('ativa')) return;\n          const heading = target.querySelector('h1,h2');\n          const live = document.getElementById('ks_route_status');\n          const label = heading ? heading.textContent.trim() : 'Tela atualizada';\n          if (live) live.textContent = label;\n          if (heading) {\n            heading.setAttribute('tabindex','-1');\n            heading.focus({preventScroll:true});\n          }\n        });\n      }\n      return result;\n    };\n    wrapped.__ksA11yWrapped = true;\n    wrapped.__original = original;\n    window.navegarPara = wrapped;\n  }\n\n  document.addEventListener('keydown', event => {\n    if (!activeLegacyModal || !modalIsVisible(activeLegacyModal)) return;\n    const box = activeLegacyModal.querySelector(':scope > .modal-box');\n    if (!box) return;\n    if (event.key === 'Escape') {\n      const close = box.querySelector('.modal-fechar');\n      if (close) { event.preventDefault(); close.click(); }\n      return;\n    }\n    if (event.key !== 'Tab') return;\n    const items = Array.from(box.querySelectorAll(focusableSelector)).filter(el => el.getClientRects().length > 0);\n    if (!items.length) { event.preventDefault(); box.focus(); return; }\n    const first = items[0], last = items[items.length - 1];\n    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }\n    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }\n  });\n\n  function init(){\n    bindLabels();\n    normalizeLegacyDialogs();\n    installRouteAnnouncements();\n    syncLegacyModalFocus();\n    const observer = new MutationObserver(() => {\n      bindLabels();\n      normalizeLegacyDialogs();\n      syncLegacyModalFocus();\n    });\n    observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','style','hidden']});\n  }\n\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});\n  else init();\n})();\n'''
write(path, text)


# ---------------------------------------------------------------------------
# Final static invariants for this pass
# ---------------------------------------------------------------------------
index = read('index.html')
if '<style' in index.lower():
    raise RuntimeError('Polish invariant failed: inline <style> block present in index.html')
if 'Plataforma de Triagem Biomecânica' in index:
    raise RuntimeError('Polish invariant failed: stale product descriptor remains')
if len(re.findall(r'<script\s+defer\s+[^>]*\bsrc=', index, flags=re.I)) < 20:
    raise RuntimeError('Optimize invariant failed: expected deferred script chain')

components = read('design_components.css')
if '.checkbox-pill input[type="checkbox"]' not in components or 'focus-visible + span' not in components:
    raise RuntimeError('Harden invariant failed: checkbox keyboard treatment missing')

eval_css = read('avaliacao_experiencia-1.22.0.css')
if re.search(r'font-size:\s*(?:9|10|11|12)px', eval_css):
    raise RuntimeError('Typeset invariant failed: microtypography literal remains in evaluation experience CSS')
if '@media (max-width: 720px)' in eval_css:
    raise RuntimeError('Adapt invariant failed: non-contract 720px breakpoint remains')

print('Impeccable full pass prepared successfully.')
print(f'Parser-blocking script tags converted to defer: {script_before}')
