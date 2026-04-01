"use client";

interface TimeFilterTabsProps {
  value: string;
  onChange: (value: string) => void;
}

const tabs = [
  { value: "today", label: "Last 24h" },
  { value: "7days", label: "Last 7 Days" },
  { value: "all", label: "All Time" },
];

export function TimeFilterTabs({ value, onChange }: TimeFilterTabsProps) {
  return (
    <div className="flex gap-0.5 bg-black/50 p-0.5 rounded-lg w-fit border border-[#2a2d32]">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
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
