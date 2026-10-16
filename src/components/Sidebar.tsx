import { Chrome as Home, Search, Library, Heart, LogOut } from 'lucide-react';
import type { View } from '@/types';
import type { UserProfile } from '@/types';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  favoriteCount: number;
  user: UserProfile | null;
  onSignOut: () => void;
}

interface NavItem {
  id: View;
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'library', label: 'Minha Biblioteca', icon: Library },
];

export function Sidebar({ currentView, onNavigate, favoriteCount, user, onSignOut }: SidebarProps) {
  return (
    <aside className="flex flex-col gap-2 w-60 shrink-0 p-2 max-md:hidden">
      <div className="flex items-center gap-2.5 px-3 py-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-black">
            <path
              d="M12 2a2 2 0 0 1 2 2v8.5a4 4 0 1 1-2-3.46V4H9.5v18H12V2z"
              fill="currentColor"
            />
          </svg>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Pulse</span>
      </div>

      <nav className="bg-neutral-900/80 rounded-xl p-2 gap-1 flex flex-col">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Icon size={20} className={active ? 'text-emerald-400' : ''} />
              {item.label}
              {item.id === 'library' && favoriteCount > 0 && (
                <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {favoriteCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="bg-neutral-900/80 rounded-xl p-2 flex flex-col flex-1 overflow-hidden">
        <div className="px-3 py-2.5">
          <span className="text-neutral-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
            <Heart size={14} /> Músicas Curtidas
          </span>
        </div>
        <div className="px-3 py-1">
          {favoriteCount > 0 ? (
            <p className="text-neutral-500 text-xs">{favoriteCount} músicas favoritas</p>
          ) : (
            <p className="text-neutral-600 text-xs">Nenhuma música curtida ainda</p>
          )}
        </div>
      </div>

      {/* User profile */}
      {user && (
        <div className="bg-neutral-900/80 rounded-xl p-3 flex items-center gap-3">
          <img
            src={user.avatarUrl}
 alt={user.name}
            className="w-9 h-9 rounded-full object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold truncate">{user.name}</p>
            <p className="text-neutral-500 text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={onSignOut}
            title="Sair"
            className="text-neutral-400 hover:text-white transition-colors shrink-0 p-1.5 rounded-lg hover:bg-neutral-800/60"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
