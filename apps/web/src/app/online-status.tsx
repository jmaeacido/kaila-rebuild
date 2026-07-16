"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OnlineStatus() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const updateNative = (event: Event) => setOffline(!(event as CustomEvent<{ online: boolean }>).detail.online);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("kaila:connectivity", updateNative);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("kaila:connectivity", updateNative);
    };
  }, []);
  if (!offline) return null;
  return <div className="offlineNotice" role="status" aria-live="polite"><WifiOff aria-hidden="true" /><span>You’re offline. Reconnect to refresh or submit changes.</span></div>;
}
