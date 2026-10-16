import { Loader as Loader2 } from 'lucide-react';

interface AuthViewProps {
  onSignInWithGoogle: () => void;
  loading: boolean;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function AuthView({ onSignInWithGoogle, loading }: AuthViewProps) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-neutral-900 to-black px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-black">
              <path
                d="M12 2a2 2 0 0 1 2 2v8.5a4 4 0 1 1-2-3.46V4H9.5v18H12V2z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Pulse</h1>
          <p className="text-neutral-400 text-sm mt-2 text-center">
            Entre para acessar sua música, playlists e biblioteca
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-neutral-900/80 border border-neutral-800/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-white text-xl font-bold mb-1">Bem-vindo</h2>
          <p className="text-neutral-500 text-sm mb-6">
            Faça login para sincronizar seus favoritos e preferências
          </p>

          <button
            onClick={onSignInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-100 text-neutral-800 font-semibold rounded-xl px-4 py-3.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin text-neutral-600" />
            ) : (
              <GoogleIcon className="w-5 h-5" />
            )}
            Continuar com Google
          </button>

          <div className="mt-6 pt-6 border-t border-neutral-800/60">
            <p className="text-neutral-600 text-xs text-center leading-relaxed">
              Ao continuar, você concorda com os Termos de Serviço e a Política de Privacidade do Pulse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
