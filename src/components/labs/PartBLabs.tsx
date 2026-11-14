import type { LangMode } from '../../types/physiology.ts';
import { partBLabs } from '../../data/labsData.ts';
import { LabRunner } from './LabRunner.tsx';

export function PartBLabs({ lang }: { lang: LangMode }) {
  return (
    <div className="space-y-4">
      {partBLabs.map((lab) => (
        <LabRunner key={lab.id} lab={lab} lang={lang} />
      ))}
    </div>
  );
}
