import type { KeyboardEvent, MouseEvent } from "react";
import type { Token } from "./data";

const CONTROLS = 'a,button,input,select,textarea,label,[role="button"],[role="link"],[contenteditable="true"]';

/** Make the unused space in a token row clickable without hijacking its controls. */
export function tokenNavigation(token: Token, onSelect: (token: Token) => void) {
  const open = (newTab: boolean) => {
    if (newTab) window.open(`/token/${encodeURIComponent(token.id)}`, "_blank", "noopener,noreferrer");
    else onSelect(token);
  };
  const click = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (event.defaultPrevented || !(target instanceof Element) || !event.currentTarget.contains(target) || target.closest(CONTROLS)) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && event.currentTarget.contains(selection.anchorNode)) return;
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    open(event.button === 1 || event.metaKey || event.ctrlKey);
  };
  return {
    "data-token-navigation": token.id,
    tabIndex: 0,
    onClick: click,
    onAuxClick: click,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" || event.target !== event.currentTarget) return;
      event.preventDefault();
      open(event.metaKey || event.ctrlKey);
    },
  };
}
