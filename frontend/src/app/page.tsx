"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { hydrate, hydrated, token } = useAuth();
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  useEffect(() => {
    if (hydrated) {
      if (token) redirect("/dashboard");
      else redirect("/login");
    }
  }, [hydrated, token]);
  return (
    <div className="min-h-screen flex items-center justify-center text-white/40 font-heading uppercase tracking-widest">
      Loading...
    </div>
  );
}
