import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar user={session.user} />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: "28px 28px 40px",
          paddingTop: "calc(28px + env(safe-area-inset-top, 0px))",
        }}
        className="print:p-0"
      >
        {/* Mobile top pad for hamburger */}
        <div style={{ height: 0 }} className="block md:hidden" />
        {children}
      </main>
    </div>
  );
}
