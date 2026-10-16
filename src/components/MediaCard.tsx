import { Play } from 'lucide-react';

interface CardData {
  id: string;
  title: string;
  subtitle: string;
  cover: string;
  rounded?: boolean;
}

interface MediaCardProps {
  data: CardData;
  onPlay: () => void;
}

export function MediaCard({ data, onPlay }: MediaCardProps) {
  return (
    <div
      onClick={onPlay}
      className="group relative bg-neutral-800/40 hover:bg-neutral-800/70 rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-300 w-full"
    >
      <div className="relative mb-3 aspect-square w-full">
        <img
          src={data.cover}
          alt={data.title}
          className={`w-full h-full object-cover shadow-lg ${data.rounded ? 'rounded-full' : 'rounded-lg'}`}
          loading="lazy"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 hover:bg-emerald-400"
        >
          <Play size={18} className="text-black fill-black ml-0.5" />
        </button>
      </div>

      <div className="min-w-0">
        <p className="text-white text-sm font-semibold truncate">{data.title}</p>
        <p className="text-neutral-400 text-xs mt-1 line-clamp-2">{data.subtitle}</p>
      </div>
    </div>
  );
}
