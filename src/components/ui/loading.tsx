import { Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Loading() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowWarning(true), 8000); // 8 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-lg font-bold text-slate-800">Loading RechargePoint...</p>
          <p className="text-sm text-slate-500">Connecting to secure servers</p>
        </div>

        {showWarning && (
          <div className="mt-8 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-500 w-full px-4">
            <div className="rounded-2xl bg-amber-50 p-5 border border-amber-100 flex flex-col items-center gap-3 text-amber-800 shadow-sm">
              <AlertCircle className="h-6 w-6 text-amber-600" />
              <div className="space-y-1 w-full text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Diagnosis Report</p>
                <div className="text-[10px] space-y-1 font-mono bg-white/60 p-3 rounded-xl border border-amber-100/50">
                  <div className="flex justify-between border-b border-amber-100 pb-1">
                    <span>Supabase URL:</span>
                    <span className="font-bold">{(window as any).__SUPABASE_DEBUG?.hasUrl ? '✅ Found' : '❌ Missing'}</span>
                  </div>
                  <div className="flex justify-between border-b border-amber-100 py-1">
                    <span>Anon Key:</span>
                    <span className="font-bold">{(window as any).__SUPABASE_DEBUG?.hasKey ? '✅ Found' : '❌ Missing'}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>Vite Prefix:</span>
                    <span className="font-bold">{(window as any).__SUPABASE_DEBUG?.vitePrefix}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-center text-slate-600">
                If "Missing" is shown, please add <b>VITE_SUPABASE_URL</b> to Vercel and click <b>Redeploy</b>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
