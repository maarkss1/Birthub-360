import React, { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  User as UserIcon,
  Database,
  CheckCircle,
  Cloud,
  Shield,
  Loader2,
  X,
  RefreshCw,
  FolderGit2,
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut, type User, testConnection } from '../firebase/config';
import { syncUserProfile, saveProjectToFirestore } from '../firebase/firestoreService';

interface FirebaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  files?: Record<string, string>;
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({
  isOpen,
  onClose,
  files = {},
  onNotify,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        syncUserProfile(user).catch((err) => console.error('Erro sync user profile:', err));
      }
    });

    // Check DB connection
    testConnection().then((ok) => {
      setDbStatus(ok ? 'connected' : 'error');
    });

    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserProfile(result.user);
        onNotify?.(`Conectado com sucesso como ${result.user.displayName || result.user.email}!`, 'success');
      }
    } catch (err: any) {
      console.error('Erro login Google:', err);
      onNotify?.(err.message || 'Falha ao autenticar com o Google.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      onNotify?.('Você saiu da sua conta.', 'info');
    } catch (err: any) {
      console.error('Erro logout:', err);
      onNotify?.(err.message || 'Falha ao encerrar sessão.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupWorkspace = async () => {
    if (!currentUser) return;
    setSavingProject(true);
    try {
      await saveProjectToFirestore(`Workspace Backup - ${new Date().toLocaleTimeString()}`, files);
      onNotify?.('Projeto salvo com sucesso no Firestore!', 'success');
    } catch (err: any) {
      onNotify?.(err.message || 'Erro ao sincronizar projeto.', 'error');
    } finally {
      setSavingProject(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#181824] border border-[#2d2d3d] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d3d] bg-[#12121a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Conta & Firebase Cloud</h3>
              <p className="text-xs text-gray-400">Autenticação Google & Persistência Firestore</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#252535] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Connection status badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#20202e] border border-[#2d2d3d]">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  dbStatus === 'connected'
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : dbStatus === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-xs font-medium text-gray-300">Banco de Dados Firestore</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Pronto
            </span>
          </div>

          {currentUser ? (
            /* User profile card */
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#20202e] border border-[#2d2d3d]">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Avatar'}
                    className="w-14 h-14 rounded-full border-2 border-indigo-500/40"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <UserIcon className="w-7 h-7" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white truncate text-base">
                      {currentUser.displayName || 'Usuário'}
                    </span>
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">UID: {currentUser.uid.slice(0, 14)}...</p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleBackupWorkspace}
                  disabled={savingProject}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {savingProject ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  Salvar Workspace
                </button>

                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2b2b3d] hover:bg-rose-500/20 hover:text-rose-400 text-gray-300 text-xs font-semibold border border-[#3b3b4f] transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  Sair da Conta
                </button>
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-[11px] text-indigo-300 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Suas criações de IA (músicas, imagens, vídeos e conversas) e projetos de código são salvos de forma segura em sua conta individual no Firestore.
                </span>
              </div>
            </div>
          ) : (
            /* Login prompt */
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto flex items-center justify-center text-indigo-400">
                <Cloud className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-lg">Sincronize seu Trabalho</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Conecte-se com sua conta Google para persistir códigos, projetos, músicas Lyria e criações de IA no Firebase Firestore.
                </p>
              </div>

              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm shadow-xl transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-900" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                Continuar com Google
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                <Shield className="w-3.5 h-3.5" />
                <span>Autenticação segura via Firebase Auth (Google Sign-In)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
