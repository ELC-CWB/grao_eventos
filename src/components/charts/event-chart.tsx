"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { BarChart2 } from "lucide-react";

interface ChartDataPoint {
  name: string;
  revenue: number;
  expense: number;
}

interface EventChartProps {
  data: ChartDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-sm">
        <p className="font-bold mb-2 text-foreground">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }} className="font-semibold">
            {entry.name === "revenue" ? "Receita" : "Despesa"}: {formatCurrency(entry.value)}
          </p>
        ))}
        {payload.length === 2 && (
          <p className="text-muted-foreground mt-1 pt-1 border-t border-border">
            Resultado: {formatCurrency(payload[0].value - payload[1].value)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function EventChart({ data }: EventChartProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart2 size={16} style={{ color: "#f37022" }} />
          Receitas e Despesas por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontFamily: "Montserrat", fontWeight: 600, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fontFamily: "Montserrat", fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 12, fontFamily: "Montserrat", fontWeight: 600 }}>
                    {value === "revenue" ? "Receita" : "Despesa"}
                  </span>
                )}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="revenue" />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
