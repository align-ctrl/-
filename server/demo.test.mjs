import { generateDemo } from './demo.mjs';
import cfg from '../shared/default-config.json' with { type: 'json' };
const items = cfg.categories.flatMap((c) => c.items.map((i) => ({ ...i, categoryId: c.id, lead: c.lead })));
const cases = [
  { t: 'consult', sel: [], comment: '' },
  { t: 'monthly', sel: ['doctor-explain'], comment: '' },
  { t: 'bonding', sel: ['doctor-explain', 'staff-kind', 'facility-clean', 'wait-time', 'exp-system', 'counsel-resolved'], comment: '주차가 조금 불편했어요' },
  { t: 'other', sel: items.map((i) => i.id), comment: '' }
];
for (const c of cases) {
  const treatment = cfg.treatments.find((x) => x.id === c.t);
  const selected = items.filter((i) => c.sel.includes(i.id));
  const r = generateDemo({ hospitalName: cfg.hospital.name, treatment, selected, comment: c.comment }, null, 0.42);
  console.log('---', c.t, c.sel.length, 'items');
  for (const [k, v] of Object.entries(r)) console.log(`[${k}]`, v);
  // 선택하지 않은 항목 문장이 포함되지 않았는지 검사
  for (const i of items) {
    if (c.sel.includes(i.id)) continue;
    const core = i.label.replace(/[.]$/, '').slice(0, 6);
    for (const v of Object.values(r)) if (v.includes(i.label.replace(/어요\.$/, ''))) throw new Error('unselected item leaked: ' + i.label);
  }
  if (c.comment) for (const v of Object.values(r)) if (!v.includes(c.comment)) throw new Error('comment dropped');
}
console.log('\nOK: 선택하지 않은 항목 미포함, 환자 의견 유지 확인');
