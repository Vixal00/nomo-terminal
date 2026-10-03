"use client";

import { useEffect } from "react";
import { CheckCircle, X, XCircle } from "@phosphor-icons/react";
import "./trade-toast.css";

export type TradeResult = { id: number; status: "success" | "error"; title: string; message: string };

export function TradeToast({ result, onDismiss }: { result: TradeResult | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [result, onDismiss]);

  return <div className="ntr-toast-region" role="status" aria-live="polite" aria-atomic="true">
    {result && <div key={result.id} className={`ntr-toast ntr-toast--${result.status}`}>
      {result.status === "success" ? <CheckCircle size={20}/> : <XCircle size={20}/>}<div><strong>{result.title}</strong><p>{result.message}</p></div><button type="button" aria-label="Dismiss trade notification" onClick={onDismiss}><X size={14}/></button>
    </div>}
  </div>;
}
