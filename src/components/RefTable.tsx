import type { LangMode, ReferenceTable } from '../types/physiology.ts';
import { BiText } from './BiText.tsx';

interface RefTableProps {
  table: ReferenceTable;
  lang: LangMode;
}

export function RefTable({ table, lang }: RefTableProps) {
  return (
    <section className="my-4 overflow-hidden rounded-xl border border-line bg-surface-2">
      <h4 className="border-b border-line bg-primary-soft px-4 py-2 text-sm font-bold">
        <BiText bi={{ ar: table.titleAr, en: table.titleEn }} lang={lang} />
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-surface">
              {table.headers.map((header, i) => (
                <th key={i} scope="col" className="border-b border-line px-3 py-2 text-start font-bold text-primary">
                  <BiText bi={header} lang={lang} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} className={r % 2 === 1 ? 'bg-surface/40' : ''}>
                {row.map((cell, c) => (
                  <td key={c} className={`border-b border-line/60 px-3 py-2 align-top ${c === 0 ? 'font-semibold' : ''}`}>
                    <BiText bi={cell} lang={lang} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
