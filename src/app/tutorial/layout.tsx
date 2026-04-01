import { PlatformHeader } from "@/components/platform-header";

export default function TutorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <PlatformHeader />
      <main>{children}</main>
    </div>
  );
}
