// ============================================================
//  سحب كل جداول قاعدة البيانات من Supabase عبر REST.
//  - من غير أي مكتبات (fetch بس).
//  - بيقرا صفحة صفحة (Supabase بترجّع 1000 صف كحد أقصى للطلب).
//  - محتاج SUPABASE_SERVICE_KEY لأن كل الجداول عليها RLS من غير سياسات.
// ============================================================

const PAGE_SIZE = 1000;
const MAX_ROWS = 200_000;

/** الجداول اللي بتتنسخ — ترتيب ثابت عشان الصفحات تطلع مستقرة. */
export const TABLES = [
  { table: 'students', order: 'created_at.desc,id.desc' },
  { table: 'devices', order: 'created_at.desc,id.desc' },
  { table: 'events', order: 'created_at.desc,id.desc' }
];

/**
 * @returns {Promise<{tables: Record<string, any[]>, counts: Record<string, number>, totals: Record<string, number|null>, durationMs: number}>}
 */
export async function dumpAll({ url, key, log = () => {} }) {
  const base = String(url || '').trim().replace(/\/+$/, '');
  const serviceKey = String(key || '').trim();
  if (!base) throw new Error('SUPABASE_URL مش مضبوط.');
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_KEY مش مضبوط.');

  const started = Date.now();
  const tables = {};
  const counts = {};
  const totals = {};

  for (const { table, order } of TABLES) {
    const rows = [];
    let exactTotal = null;

    for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
      const response = await fetch(
        `${base}/rest/v1/${table}?select=*&order=${encodeURIComponent(order)}`,
        {
          headers: {
            apikey: serviceKey,
            authorization: `Bearer ${serviceKey}`,
            'range-unit': 'items',
            range: `${offset}-${offset + PAGE_SIZE - 1}`,
            prefer: 'count=exact'
          },
          signal: AbortSignal.timeout(60_000)
        }
      );

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`قراءة جدول ${table} فشلت (${response.status}): ${String(text).slice(0, 200)}`);
      }
      let page;
      try {
        page = text ? JSON.parse(text) : [];
      } catch {
        throw new Error(`رد غير متوقع من جدول ${table} (مش JSON).`);
      }
      if (!Array.isArray(page)) throw new Error(`رد غير متوقع من جدول ${table}.`);

      if (exactTotal === null) {
        const range = response.headers.get('content-range') || '';
        const parsed = Number(range.split('/')[1]);
        exactTotal = Number.isFinite(parsed) ? parsed : null;
      }

      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    tables[table] = rows;
    counts[table] = rows.length;
    totals[table] = exactTotal;
    log(`   ${table}: ${rows.length} صف`);
  }

  return { tables, counts, totals, durationMs: Date.now() - started };
}
