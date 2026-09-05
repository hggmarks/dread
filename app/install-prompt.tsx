"use client";

import React, { useEffect, useState } from "react";

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, []);

  if (!installEvent) {
    return null;
  }

  return (
    <button
      className="install-action"
      onClick={() => {
        void installEvent.prompt();
        setInstallEvent(null);
      }}
      type="button"
    >
      Install app
    </button>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};
