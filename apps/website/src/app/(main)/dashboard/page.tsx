import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex flex-1 flex-row gap-4 py-4">
      <div className="flex w-full flex-1 flex-col gap-4">
        <div className="grid grid-cols-3">
          <Card className="bg-background gap-0">
            <CardHeader>
              <CardTitle className="font-sans">Temperature</CardTitle>
            </CardHeader>
            <CardContent>X</CardContent>
          </Card>
        </div>

        <div className="bg-background">CAMERA FEED</div>
      </div>

      <div className="bg-background h-full w-xs">CHAT</div>
    </div>
  );
}
