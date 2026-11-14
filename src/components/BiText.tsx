import type { Bi, LangMode } from '../types/physiology.ts';

interface BiTextProps {
  bi: Bi;
  lang: LangMode;
  className?: string;
  enClassName?: string;
}

export function BiText({ bi, lang, className = '', enClassName = 'latin text-muted' }: BiTextProps) {
  if (lang === 'ar') return <span className={className}>{bi.ar}</span>;
  if (lang === 'en') return <span className={`${className} latin`}>{bi.en}</span>;
  return (
    <span className={className}>
      {bi.ar} <span className={enClassName}>{bi.en}</span>
    </span>
  );
}
