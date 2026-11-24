"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Abaikan jika browser tidak mendukung atau sedang mode private
      });
    }
  }, []);

  return null;
}