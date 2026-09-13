const fs = require('fs');

function patch(path, transforms) {
  let text = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  for (const [from, to, label] of transforms) {
    if (!text.includes(from)) throw new Error(`${path}: trecho não encontrado (${label})`);
    text = text.replace(from, to);
  }
  fs.writeFileSync(path, text, 'utf8');
}

patch('index.html', [[
  'src/admin/access_admin-1.0.0.js?v=20260913-online-r3',
  'src/admin/access_admin-1.0.0.js?v=20260913-online-v4',
  'cache bootstrap admin'
]]);

patch('agendamento/index.html', [[
  './agendamento-publico.js?v=20260913-v3',
  './agendamento-publico-v2.js?v=20260913-v3',
  'controller público v2'
]]);

patch('src/admin/configuracoes_agendamento_online_perfil_publico-1.0.0.js', [
  [
`                <div class="ks-online-v2-link-grid">\n                    <label class="ks-online-field ks-online-v2-span-4">\n                        <span>Nome no link</span>`,
`                <div class="ks-online-v2-link-grid">\n                    <label class="ks-online-field ks-online-v2-span-4">\n                        <span>Nome público da clínica</span>\n                        <input id="ks_online_v2_nome_publico" type="text" maxlength="120" autocomplete="organization" placeholder="Ex.: FisioFix Fisioterapia">\n                        <small class="ks-online-v2-help">Este nome aparece para o paciente sem alterar o nome interno da clínica.</small>\n                    </label>\n                    <label class="ks-online-field ks-online-v2-span-4">\n                        <span>Nome no link</span>`,
    'campo nome público'
  ],
  [
    `.select('slug_publico,endereco_publico,telefone_publico,mensagem_confirmacao')`,
    `.select('nome_publico,slug_publico,endereco_publico,telefone_publico,mensagem_confirmacao')`,
    'select config pública'
  ],
  [
`    function preencherIdentidade() {\n        const sugerido = state.config?.slug_publico || slugificar(state.clinica?.nome || '') || state.clinica?.slug || '';\n        if ($('ks_online_v2_slug')) $('ks_online_v2_slug').value = sugerido;`,
`    function preencherIdentidade() {\n        const sugerido = state.config?.slug_publico || slugificar(state.clinica?.nome || '') || state.clinica?.slug || '';\n        if ($('ks_online_v2_nome_publico')) $('ks_online_v2_nome_publico').value = state.config?.nome_publico || '';\n        if ($('ks_online_v2_slug')) $('ks_online_v2_slug').value = sugerido;`,
    'preencher nome público'
  ],
  [
`                .update({\n                    slug_publico: slug,`,
`                .update({\n                    nome_publico: String($('ks_online_v2_nome_publico')?.value || '').trim(),\n                    slug_publico: slug,`,
    'salvar nome público'
  ],
  [
`            state.config = {\n                ...(state.config || {}),\n                slug_publico: slug,`,
`            state.config = {\n                ...(state.config || {}),\n                nome_publico: String($('ks_online_v2_nome_publico')?.value || '').trim(),\n                slug_publico: slug,`,
    'estado nome público'
  ]
]);

patch('supabase/functions/agendamento-publico-perfil/index.ts', [
  [
    'clinica_id,slug_publico,endereco_publico,telefone_publico,mensagem_confirmacao',
    'clinica_id,nome_publico,slug_publico,endereco_publico,telefone_publico,mensagem_confirmacao',
    'select config por slug'
  ],
  [
    'clinica_id,slug_publico,endereco_publico,telefone_publico,mensagem_confirmacao',
    'clinica_id,nome_publico,slug_publico,endereco_publico,telefone_publico,mensagem_confirmacao',
    'select config fallback'
  ],
  [
`    clinica: {\n      nome: texto(clinica.nome, 120),`,
`    clinica: {\n      nome: texto(configPublica?.nome_publico || clinica.nome, 120),`,
    'nome comercial público'
  ]
]);

console.log('temp_patch_online_v2: OK');
