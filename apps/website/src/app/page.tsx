import { Background } from "@/components/co-lab/dashboard/background";

export default function Home() {
  return (
    <div className="relative flex min-h-screen font-sans">
      <Background />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_20%,rgba(0,0,0,0.75))]" />
      <div className="mt-auto mr-auto pb-10 pl-10 mix-blend-exclusion">
        <h1 className="text-[16rem] leading-none font-bold tracking-tighter text-white">Co:Lab</h1>
        <p className="ml-3 text-5xl leading-none font-semibold text-white">
          AI-Accelerated Scientific Discovery
        </p>
      </div>
    </div>
  );
}
