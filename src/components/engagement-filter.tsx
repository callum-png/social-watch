"use client";

interface EngagementFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const tabs = [
  { value: "all", label: "All" },
  { value: "viral", label: "\ud83d\udd25 Viral" },
  { value: "flops", label: "\ud83d\udca9 Flops" },
];

export function EngagementFilter({ value, onChange }: EngagementFilterProps) {
  return (
    <div className="flex gap-0.5 bg-black/50 p-0.5 rounded-md w-fit border border-[#2a2d32]">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-2.5 py-0.5 rounded text-xs font-medium transition-all ${
            value === tab.value
              ? "bg-[#1d9bf0] text-white"
              : "text-[#5c6370] hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
