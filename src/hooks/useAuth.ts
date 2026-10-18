
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          console.error('Session error:', error.message);
        }

        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Session initialization error:', error);
        if (active) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      console.log('CLIQUE DE LOGIN GOOGLE RECEBIDO');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('Google sign-in error:', error.message);
        window.alert(`Não foi possível iniciar o login: ${error.message}`);
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
      } else {
        window.alert('O Supabase não retornou o endereço de login do Google.');
      }
    } catch (error) {
      console.error('Google sign-in exception:', error);
      window.alert('Erro ao iniciar o login. Verifique a conexão e tente novamente.');
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign-out error:', error.message);
      window.alert(`Não foi possível sair: ${error.message}`);
    }
  }, []);

  return { user, loading, signInWithGoogle, signOut };
}
