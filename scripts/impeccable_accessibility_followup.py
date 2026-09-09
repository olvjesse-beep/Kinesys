from pathlib import Path

path = Path('design_system-1.20.1.js')
text = path.read_text(encoding='utf-8')

old = """      const control = group.querySelector('input:not([type=\"hidden\"]),select,textarea');
      if (control && control.id) label.htmlFor = control.id;"""
new = """      const controls = Array.from(group.querySelectorAll('input:not([type=\"hidden\"]),select,textarea'));
      const control = controls.find(node => !node.closest('.checkbox-group,[role=\"group\"],.finance-payment-methods,.toggle-pill'));
      if (control && control.id) label.htmlFor = control.id;"""
if old not in text:
    raise SystemExit('Label association block not found')
text = text.replace(old, new, 1)

old = """    const observer = new MutationObserver(() => {
      bindLabels();
      normalizeLegacyDialogs();
      syncLegacyModalFocus();
    });
    observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','style','hidden']});"""
new = """    const observer = new MutationObserver(mutations => {
      const childChanged = mutations.some(mutation => mutation.type === 'childList');
      const modalStateChanged = mutations.some(mutation =>
        mutation.type === 'attributes' && mutation.target.classList && mutation.target.classList.contains('modal-overlay')
      );
      if (childChanged) {
        bindLabels();
        normalizeLegacyDialogs();
      }
      if (childChanged || modalStateChanged) syncLegacyModalFocus();
    });
    observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','style','hidden']});"""
if old not in text:
    raise SystemExit('Observer block not found')
text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Accessibility follow-up applied.')
