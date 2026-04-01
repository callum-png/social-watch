"use client";

import { useEffect } from "react";
import { setPostTrackerPassword } from "@/lib/post-tracker-api";

export function AuthSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const existing = localStorage.getItem("pt_api_password");
    if (!existing) {
      fetch("/api/auth/session")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.ptPassword) {
            setPostTrackerPassword(data.ptPassword);
          }
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
