import AppShell from "@/components/AppShell";

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
