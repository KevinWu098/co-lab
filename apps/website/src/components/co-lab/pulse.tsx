export function Pulse() {
  return (
    <div className="relative flex size-5 items-center justify-center p-1">
      <div className="bg-primary absolute size-2.5 animate-ping rounded-full opacity-75" />
      <div className="bg-primary size-2.5 rounded-full" />
    </div>
  );
}
