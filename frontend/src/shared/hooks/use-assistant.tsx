"use client";

import { createContext, useContext } from "react";

export interface AssistantControls {
  /** Opens the GEO AI panel, optionally asking `question` right away. */
  openAssistant: (question?: string) => void;
}

const AssistantContext = createContext<AssistantControls>({ openAssistant: () => {} });

/** Provided by the workspace shell, so any page can open the assistant. */
export const AssistantProvider = AssistantContext.Provider;

export const useAssistant = () => useContext(AssistantContext);
