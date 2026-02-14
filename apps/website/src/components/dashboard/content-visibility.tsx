"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

type ContentVisibilityContext = {
  visible: boolean;
  toggle: () => void;
};

const ContentVisibilityContext = createContext<ContentVisibilityContext | null>(
  null
);

export function useContentVisibility() {
  const ctx = useContext(ContentVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useContentVisibility must be used within ContentVisibilityProvider"
    );
  }
  return ctx;
}

export function ContentVisibilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  const toggle = () => setVisible((v) => !v);

  return (
    <ContentVisibilityContext.Provider value={{ visible, toggle }}>
      {children}
    </ContentVisibilityContext.Provider>
  );
}
