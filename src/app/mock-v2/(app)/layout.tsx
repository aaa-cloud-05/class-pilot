import { AppShell } from "../_components/shell"

export default function MockAppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
