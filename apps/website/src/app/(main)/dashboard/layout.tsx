import { AppSidebar } from "@/components/app-sidebar";
import { Background } from "@/components/co-lab/dashboard/background";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-svh overflow-y-hidden overscroll-y-none">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "19rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset className="bg-transparent">{children}</SidebarInset>
      </SidebarProvider>
      <Background />
    </div>
  );
}
