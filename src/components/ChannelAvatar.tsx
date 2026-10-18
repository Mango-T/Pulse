import type { Channel } from '@/types';

interface ChannelAvatarProps {
  channel: Channel;
  onClick: () => void;
}

export function ChannelAvatar({ channel, onClick }: ChannelAvatarProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 shrink-0 w-24 sm:w-28 group"
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-emerald-400/60 transition-all duration-200">
        <img
          src={channel.avatar}
          alt={channel.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
      <span className="text-white text-xs sm:text-sm font-medium text-center truncate w-full group-hover:text-emerald-400 transition-colors">
        {channel.name}
      </span>
      <span className="text-neutral-500 text-[10px] -mt-1.5">
        {channel.isLocal ? 'Artista' : 'Canal'}
      </span>
    </button>
  );
}
