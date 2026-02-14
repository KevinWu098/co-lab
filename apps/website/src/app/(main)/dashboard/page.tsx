import { DataCard } from "@/components/co-lab/dashboard/data-card";
import { IterationSwitcher } from "@/components/co-lab/dashboard/iteration-switcher";
import { experiments } from "@/components/dashboard/sidebar/data";

export default function Page() {
  const experiment = experiments[0];

  return (
    <div className="flex flex-1 flex-row gap-4 py-4">
      <div className="flex w-full flex-1 flex-col gap-4">
        <IterationSwitcher experiment={experiment} />

        <div className="grid grid-cols-3">
          <DataCard
            title="Temperature"
            values={[36.8, 36.9, 37.0, 37.1, 36.9, 37.0, 37.1, 37.2]}
            unit="°C"
          />
          <DataCard
            title="Pressure"
            values={[1.015, 1.014, 1.014, 1.013, 1.012, 1.013]}
            unit="atm"
          />
          <DataCard title="pH Level" values={[7.2, 7.3, 7.3, 7.4, 7.4]} unit="pH" last />
        </div>

        <div className="bg-background">CAMERA FEED</div>
      </div>

      <div className="bg-background h-full w-xs">CHAT</div>
    </div>
  );
}
