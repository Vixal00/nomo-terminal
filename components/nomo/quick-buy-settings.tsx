"use client";

import { useEffect, useRef, useState } from "react";

export const DEFAULT_QUICK_BUY_PRESETS = [25, 100, 250];
const settingsKey = "nomo.quick-buy.settings.USDC";
const legacyAmountKey = "nomo.quick-buy.USDC";
type Settings = { amount: string; presets: number[]; activePreset: number | null };
const validAmount = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
const validPresets = (values: unknown): values is number[] => Array.isArray(values) && values.length === 3 && values.every(value => typeof value === "number" && Number.isFinite(value) && value > 0);

export function useQuickBuySettings() {
  const [settings, setSettings] = useState<Settings>({ amount: "100", presets: [...DEFAULT_QUICK_BUY_PRESETS], activePreset: 1 });
  const lastValidAmount = useRef("100");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(settingsKey) || "null");
      if (saved && validPresets(saved.presets) && typeof saved.amount === "string" && validAmount(saved.amount)) {
        const activePreset = Number.isInteger(saved.activePreset) && saved.activePreset >= 0 && saved.activePreset < 3 && saved.presets[saved.activePreset] === Number(saved.amount) ? saved.activePreset : null;
        lastValidAmount.current = saved.amount;
        setSettings({ amount: saved.amount, presets: saved.presets, activePreset });
        return;
      }
    } catch { /* Invalid or unavailable storage keeps the authored defaults. */ }
    try {
      const amount = localStorage.getItem(legacyAmountKey);
      if (amount && validAmount(amount)) {
        const index = DEFAULT_QUICK_BUY_PRESETS.indexOf(Number(amount));
        lastValidAmount.current = amount;
        setSettings({ amount, presets: [...DEFAULT_QUICK_BUY_PRESETS], activePreset: index < 0 ? null : index });
      }
    } catch { /* Preferences remain usable for this session. */ }
  }, []);

  const commit = (next: Settings) => {
    setSettings(next);
    if (validAmount(next.amount)) lastValidAmount.current = next.amount;
    try {
      localStorage.setItem(settingsKey, JSON.stringify({ ...next, amount: lastValidAmount.current }));
    } catch { /* Saving preferences is optional; the current session still updates. */ }
  };

  return {
    ...settings,
    setAmount: (amount: string) => commit({ ...settings, amount, activePreset: null }),
    selectPreset: (index: number) => {
      if (index < 0 || index >= settings.presets.length || !Number.isInteger(index)) return;
      commit({ ...settings, amount: String(settings.presets[index]), activePreset: index });
    },
    savePresets: (presets: number[]) => {
      if (!validPresets(presets)) return;
      commit({ ...settings, presets, amount: settings.activePreset === null ? settings.amount : String(presets[settings.activePreset]) });
    },
  };
}

export function QuickBuyPresetEditor({ presets, onSave, onCancel }: { presets: number[]; onSave: (values: number[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(() => presets.map(String));
  const errors = draft.map(value => !validAmount(value));
  return <form className="ni-preset-editor" onSubmit={event => { event.preventDefault(); if (!errors.some(Boolean)) onSave(draft.map(Number)); }}>
    <h2 id="ni-dialog-title">Quick buy presets</h2>
    <p className="ni-preset-description">Set an amount for each preset. Select P1, P2 or P3 in the market toolbar to use it.</p>
    <div className="ni-preset-fields">
      {draft.map((value, index) => <div className="ni-preset-field" key={index}>
        <label htmlFor={`ni-preset-${index}`}><strong>P{index + 1}</strong><span>Preset {index + 1}</span></label>
        <div className={`ni-preset-input ${errors[index] ? "has-error" : ""}`}>
          <span aria-hidden="true">$</span>
          <input id={`ni-preset-${index}`} aria-label={`Preset ${index + 1} amount in dollars`} aria-invalid={errors[index]} aria-describedby={errors[index] ? `ni-preset-error-${index}` : undefined} autoFocus={index === 0} type="number" min="0" step="any" inputMode="decimal" value={value} onChange={event => setDraft(current => current.map((entry, at) => at === index ? event.target.value : entry))}/>
        </div>
        {errors[index] && <small id={`ni-preset-error-${index}`} className="ni-preset-error">Enter an amount greater than zero.</small>}
      </div>)}
    </div>
    <button type="button" className="ni-preset-reset" onClick={() => setDraft(DEFAULT_QUICK_BUY_PRESETS.map(String))}>Reset defaults</button>
    <div className="ni-preset-actions"><button type="button" className="ni-secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="ni-primary-button" disabled={errors.some(Boolean)}>Save presets</button></div>
  </form>;
}
