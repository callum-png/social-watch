import { PlatformHeader } from "@/components/platform-header";

export default function UGCLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <PlatformHeader />
      {children}
    </div>
  );
}
