"use client";

import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Star } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/capacity/ui/card";
import { cn } from "@/lib/capacity-utils";

interface Snapshot {
  id: number;
  date: string;
  team_sentiment_score: number;
}

interface SentimentCardProps {
  month: string;
}

export function SentimentCard({ month }: SentimentCardProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSnapshots = useCallback(() => {
    setLoading(true);
    fetch(`/api/capacity/snapshots?month=${month}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        setSnapshots(json.snapshots ?? json ?? []);
        setLoading(false);
      })
      .catch(() => {
        setSnapshots([]);
        setLoading(false);
      });
  }, [month]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const averageScore = snapshots.length
    ? (
        snapshots.reduce((sum, s) => sum + s.team_sentiment_score, 0) /
        snapshots.length
      ).toFixed(1)
    : "\u2014";

  const sparklineData = snapshots.slice(-30).map((s) => ({
    value: s.team_sentiment_score,
  }));

  const handleStarClick = async (rating: number) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/capacity/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_sentiment_score: rating,
          date: new Date().toISOString().split("T")[0],
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      fetchSnapshots();
    } catch {
      // Silently handle — user sees no change if it fails
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Team Sentiment</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-10 w-24 animate-pulse rounded bg-gray-800" />
            <div className="h-12 w-full animate-pulse rounded bg-gray-800" />
            <div className="h-6 w-32 animate-pulse rounded bg-gray-800" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-100">
                {averageScore}
              </span>
              <span className="text-lg text-gray-500">/ 5</span>
            </div>

            {sparklineData.length > 1 && (
              <div className="my-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-3">
              <p className="mb-1.5 text-xs text-gray-500">
                Rate today&apos;s mood
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    disabled={submitting}
                    className="rounded p-0.5 transition-colors hover:bg-gray-800 disabled:opacity-50"
                    aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 transition-colors",
                        hoveredStar !== null && star <= hoveredStar
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-600"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
