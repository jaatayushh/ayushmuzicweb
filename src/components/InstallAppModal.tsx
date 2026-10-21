import React, { useEffect, useState } from 'react';
import {
  X,
  Smartphone,
  Globe,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AyushLogo } from './AyushLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstalled: () => void;
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled,
}) => {
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pwaPromptAttempted, setPwaPromptAttempted] = useState(false);
  const android = isAndroid();
  const ios = isIOS();
  const alreadyStandalone = isStandalone();

  useEffect(() => {
    if (!isOpen) {
      setInstalled(false);
      setBusy(false);
      setPwaPromptAttempted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePwaInstallClick = async () => {
    if (deferredPrompt) {
      setBusy(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstalled(true);
          onInstalled();
          onClose();
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
        setPwaPromptAttempted(true);
      } finally {
        setBusy(false);
      }
    } else {
      setPwaPromptAttempted(true);
    }
  };

  return (
    <div
      style={{ zIndex: 99999 }}
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#131316] border border-zinc-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-6 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800/80 sticky top-0 bg-[#131316] z-10">
          <div className="flex items-center gap-3">
            <AyushLogo size={36} />
            <div>
              <h2 className="text-white font-extrabold text-base sm:text-lg">Install AyushMuzic</h2>
              <p className="text-zinc-400 text-xs">Fast, standalone music app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] overflow-y-auto space-y-4">
          {alreadyStandalone || installed ? (
            <div className="flex flex-col items-center text-center gap-3 py-6 bg-zinc-900/60 rounded-2xl border border-zinc-800 p-6">
              <CheckCircle2 className="w-12 h-12 text-[#ec4899]" />
              <p className="text-white font-bold text-lg">App Already Installed!</p>
              <p className="text-zinc-400 text-xs max-w-xs">
                AyushMuzic is running in standalone mode with full hardware acceleration.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 text-xs text-zinc-300 bg-black/40 rounded-2xl p-3.5 border border-white/5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#ec4899] shrink-0" />
                  <span>Instant launch</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#8b5cf6] shrink-0" />
                  <span>Ad-free playback</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ec4899] shrink-0" />
                  <span>High-res audio</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#8b5cf6] shrink-0" />
                  <span>Full screen UI</span>
                </div>
              </div>

              <button
                onClick={handlePwaInstallClick}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white hover:brightness-110 active:scale-98 font-extrabold text-sm py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{busy ? 'Opening Install Prompt…' : 'Install AyushMuzic App'}</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              {/* Step-by-step instructions */}
              {(pwaPromptAttempted || !deferredPrompt) && (
                <div className="p-3.5 bg-black/60 rounded-2xl text-xs text-zinc-300 space-y-2 border border-zinc-800 animate-in fade-in duration-150">
                  {ios ? (
                    <>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-[#ec4899]" />
                        <span>Install on iPhone / iPad (Safari):</span>
                      </p>
                      <p className="text-zinc-400">1. Tap the <b>Share</b> button in Safari's bottom toolbar.</p>
                      <p className="text-zinc-400">2. Scroll down and tap <b>"Add to Home Screen"</b>.</p>
                    </>
                  ) : android ? (
                    <>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-[#8b5cf6]" />
                        <span>Install on Android (Chrome):</span>
                      </p>
                      <p className="text-zinc-400">1. Tap the <b>⋮ (3 dots) menu</b> in Chrome at the top right.</p>
                      <p className="text-zinc-400">2. Tap <b>"Install app"</b> or <b>"Add to Home screen"</b>.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-[#8b5cf6]" />
                        <span>Install on Desktop (Chrome / Edge / Brave):</span>
                      </p>
                      <p className="text-zinc-400">Click the install icon <b>(⊕)</b> in your browser address bar, or menu → <b>"Install AyushMuzic"</b>.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
