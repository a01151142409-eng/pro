import type { LangMode } from '../../types/physiology.ts';
import { partALabs } from '../../data/labsData.ts';
import { LabRunner } from './LabRunner.tsx';

export function PartALabs({ lang }: { lang: LangMode }) {
  return (
    <div className="space-y-4">
      {partALabs.map((lab) => (
        <LabRunner key={lab.id} lab={lab} lang={lang} />
      ))}
    </div>
  );
}
