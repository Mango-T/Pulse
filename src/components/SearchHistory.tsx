
import { Search, Trash2, X } from 'lucide-react';

interface SearchHistoryProps {
  history: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
}

const VISIBLE_ROWS = 5;

export function SearchHistory({ history, onSelect, onRemove, onClear }: SearchHistoryProps) {
  if (history.length === 0) return null;

  const rowHeight = 40;

  return (
    <section aria-label="Histórico de pesquisa">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-sm font-semibold">Histórico</span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpar todo o histórico"
          className="text-neutral-400 hover:text-white transition-colors p-1 -m-1"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div
        className="overflow-y-auto scrollbar-thin"
        style={{ maxHeight: rowHeight * VISIBLE_ROWS }}
      >
        <ul className="flex flex-col">
          {history.map((term) => (
            <li
              key={term}
              className="flex items-center group rounded-md hover:bg-neutral-800/60 transition-colors"
            >
              <button
                type="button"
                onClick={() => onSelect(term)}
                className="flex items-center gap-3 flex-1 min-w-0 px-2 py-2 text-left"
              >
                <Search size={14} className="text-neutral-500 shrink-0" />
                <span className="text-neutral-300 text-sm truncate">{term}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(term);
                }}
                aria-label={`Remover "${term}" do histórico`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-neutral-500 hover:text-white transition-all p-1.5 mr-1"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
