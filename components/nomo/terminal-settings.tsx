"use client";

import { ArrowRight } from "@phosphor-icons/react";
import "./terminal-settings.css";

type TerminalSettingsProps = {
  feedPaused: boolean;
  setFeedPaused: (paused: boolean) => void;
  onPresets: () => void;
};

export function TerminalSettings({ feedPaused, setFeedPaused, onPresets }: TerminalSettingsProps) {
  return <div className="ni-terminal-settings">
    <h2 id="ni-dialog-title">Settings</h2>
    <p className="ni-modal-description">Adjust your market workspace.</p>
    <div className="ni-setting-row">
      <div><strong>Market activity</strong><span>Animate market updates.</span></div>
      <button type="button" role="switch" aria-checked={!feedPaused} aria-label="Market activity" className="ni-setting-switch" onClick={() => setFeedPaused(!feedPaused)}><span/></button>
    </div>
    <button type="button" className="ni-setting-row ni-setting-link" onClick={onPresets}>
      <div><strong>Quick buy presets</strong><span>Set custom amounts for P1, P2 and P3.</span></div><ArrowRight size={15}/>
    </button>
    <div className="ni-setting-shortcuts">
      <strong>Keyboard shortcuts</strong>
      <div><span>Search tokens</span><kbd>⌘ / Ctrl K</kbd></div>
      <div><span>Close popup</span><kbd>Esc</kbd></div>
    </div>
  </div>;
}
