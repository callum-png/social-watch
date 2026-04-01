import { PlatformHeader } from "@/components/platform-header";

export default function CampaignReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <PlatformHeader />
      <main className="flex-1 overflow-x-hidden relative">
        <div className="relative px-4 py-4 md:px-6 lg:px-8 lg:py-6">{children}</div>
      </main>
    </div>
  );
}
