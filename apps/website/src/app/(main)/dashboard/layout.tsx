import { AppSidebar } from "@/components/app-sidebar";
import { Background } from "@/components/co-lab/dashboard/background";
import { ContentVisibilityProvider } from "@/components/dashboard/content-visibility";
import { ContentWrapper } from "@/components/dashboard/content-wrapper";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ContentVisibilityProvider>
      <div className="h-svh overflow-y-hidden overscroll-y-none">
        <SidebarProvider
          style={
            {
              "--sidebar-width": "19rem",
            } as React.CSSProperties
          }
        >
          <AppSidebar />
          <SidebarInset className="bg-transparent">
            <ContentWrapper>{children}</ContentWrapper>
          </SidebarInset>
        </SidebarProvider>
        <Background />
      </div>
    </ContentVisibilityProvider>
  );
}
