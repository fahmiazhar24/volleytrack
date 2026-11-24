"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function NetworkStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-md">
      <WifiOff className="h-3.5 w-3.5" />
      Koneksi internet terputus. Perubahan belum dapat disimpan ke server.
    </div>
  );
}