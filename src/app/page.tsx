import { Dashboard } from "@/components/dashboard";
import { NavBar } from "@/components/NavBar";

export default function Page() {
  return (
    <div className="min-h-dvh bg-background">
      <Dashboard />
      <NavBar />
    </div>
  );
}
