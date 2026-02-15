import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AppSidebar } from "@/components/app-sidebar";
import { Background } from "@/components/co-lab/dashboard/background";
import { ContentVisibilityProvider } from "@/components/dashboard/content-visibility";
import { ContentWrapper } from "@/components/dashboard/content-wrapper";
import { ExperimentsProvider } from "@/components/dashboard/experiments-provider";
import { SidebarOpacity } from "@/components/dashboard/sidebar-opacity";
import { HardwareProvider } from "@/lib/hardware/hardware-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <NuqsAdapter>
    <ExperimentsProvider>
    <HardwareProvider>
    <ContentVisibilityProvider>
      <div className="flex h-svh flex-col overflow-hidden overscroll-y-none">
        <SidebarProvider
          style={
            {
              "--sidebar-width": "20rem",
            } as React.CSSProperties
          }
        >
          <SidebarOpacity>
            <AppSidebar />
          </SidebarOpacity>
          <SidebarInset className="min-h-0 overflow-hidden bg-transparent">
            <ContentWrapper>{children}</ContentWrapper>
          </SidebarInset>
        </SidebarProvider>
        <Background />
      </div>
    </ContentVisibilityProvider>
    </HardwareProvider>
    </ExperimentsProvider>
    </NuqsAdapter>
  );
}
