"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { hydrate, hydrated, user } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    redirect(user ? "/dashboard" : "/login");
  }, [hydrated, user]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white/40 font-heading uppercase tracking-widest">
      Loading...
    </div>
  );
}
