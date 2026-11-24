"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ScoreScale } from "@/lib/scoring";

interface SkillRadarChartProps {
  categories: { name: string; average_five: number }[];
  scoreScale: ScoreScale;
  accentColor: string;
}

export function SkillRadarChart({
  categories,
  scoreScale,
  accentColor,
}: SkillRadarChartProps) {
  if (categories.length < 3) return null;

  const isHundred = scoreScale === "1-100";
  const maxDomain = isHundred ? 100 : 5;

  const data = categories.map((c) => ({
    subject: c.name,
    value: isHundred ? Math.round(c.average_five * 20) : Number(c.average_five.toFixed(2)),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="#cbd5e1" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, maxDomain]}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
          />
          <Tooltip
            formatter={(val: any) => [
              isHundred ? `${val} / 100` : `${val} / 5.00`,
              "Rata-rata",
            ]}
          />
          <Radar
            name="Skor"
            dataKey="value"
            stroke={accentColor || "#f97316"}
            fill={accentColor || "#f97316"}
            fillOpacity={0.35}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}