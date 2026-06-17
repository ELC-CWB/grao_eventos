"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ChartDataPoint {
  name: string;
  revenue: number;
  expense: number;
}

interface EventChartProps {
  data: ChartDataPoint[];
}

type ChartFilter = "revenue" | "expense";

const COLORS = [
  "#f37022", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#ef4444",
];

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { percent: number } }[];
}) => {
  if (active && payload && payload.length) {
    const { name, value, payload: p } = payload[0];
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
        <p className="font-bold text-foreground">{name}</p>
        <p className="font-semibold" style={{ color: "#f37022" }}>{formatCurrency(value)}</p>
        <p className="text-muted-foreground text-xs">{(p.percent * 100).toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export function EventChart({ data }: EventChartProps) {
  const [filter, setFilter] = useState<ChartFilter>("revenue");

  const chartData = data
    .map((d, i) => ({
      name: d.name,
      value: filter === "revenue" ? d.revenue : d.expense,
      color: COLORS[i % COLORS.length],
    }))
    .filter((d) => d.value > 0);

  if (data.length === 0) return null;

  const total = chartData.reduce((s, d) => s + d.value, 0);
  const totalColor = filter === "revenue" ? "#10b981" : "#ef4444";

  return (
    <div className="space-y-3">
      {/* Filter buttons */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setFilter("revenue")}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all"
          style={filter === "revenue"
            ? { background: "#10b981", borderColor: "#10b981", color: "white" }
            : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          Receita
        </button>
        <button
          type="button"
          onClick={() => setFilter("expense")}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all"
          style={filter === "expense"
            ? { background: "#ef4444", borderColor: "#ef4444", color: "white" }
            : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          Despesa
        </button>
      </div>

      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          Sem {filter === "revenue" ? "receitas" : "despesas"} registradas
        </div>
      ) : (
        <div className="space-y-4">
          {/* Donut chart — centralizado, responsivo */}
          <div className="mx-auto" style={{ maxWidth: 260, height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda — abaixo do gráfico */}
          <div className="space-y-2">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                  <span className="text-sm font-semibold truncate">{entry.name}</span>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {total > 0 ? `${((entry.value / total) * 100).toFixed(1)}%` : ""}
                  </span>
                  <span className="text-sm font-black" style={{ color: entry.color }}>{formatCurrency(entry.value)}</span>
                </div>
              </div>
            ))}
            {/* Total */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t">
              <span className="text-sm font-bold text-muted-foreground">Total</span>
              <span className="text-sm font-black" style={{ color: totalColor }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
