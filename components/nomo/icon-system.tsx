"use client";

import { IconContext, type IconProps } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const defaults: IconProps = {
  size: 16,
  weight: "regular",
  color: "currentColor",
  className: "nm-icon",
  "aria-hidden": true,
  focusable: false,
};

export function NomoIconProvider({ children }: { children: ReactNode }) {
  return <IconContext.Provider value={defaults}>{children}</IconContext.Provider>;
}
