/* Apresentação de datas públicas; sem consultas nem regras de reserva. */
(() => {
  'use strict';
  function date(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return null;
    const d = new Date(`${iso}T12:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === iso ? d : null;
  }
  function days(slots) {
    return (Array.isArray(slots) ? slots : []).filter(d => date(d?.data) && Array.isArray(d.horarios) && d.horarios.length);
  }
  function months(slots) { return [...new Set(days(slots).map(d => d.data.slice(0, 7)))].sort(); }
  function model(slots, month) {
    if (!/^\d{4}-\d{2}$/.test(String(month))) return null;
    const first = date(`${month}-01`);
    if (!first) return null;
    const available = new Map(days(slots).map(d => [d.data, d]));
    const offset = (first.getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const cells = Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => {
      const day = i - offset + 1;
      if (day < 1 || day > count) return null;
      const iso = `${month}-${String(day).padStart(2, '0')}`;
      return { iso, day, count: available.get(iso)?.horarios.length || 0 };
    });
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
    return { month, label: label.charAt(0).toUpperCase() + label.slice(1).replace(' de ', ' '), cells };
  }
  window.KineSysPublicCalendar = Object.freeze({ date, days, months, model });
})();
