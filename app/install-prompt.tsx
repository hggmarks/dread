"use client";

import React, { useEffect, useState } from "react";

export function InstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = () => setCanInstall(true);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, []);

  if (!canInstall) {
    return null;
  }

  return (
    <button className="install-action" type="button">
      Install app
    </button>
  );
}
