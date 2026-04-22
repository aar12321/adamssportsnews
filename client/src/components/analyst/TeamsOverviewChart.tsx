import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface TeamsOverviewChartProps {
  data: { name: string; For: number; Against: number }[];
  title: string;
}

/**
 * Isolated so the rest of AnalystApp can be lazy-loaded without dragging
 * recharts (~350kB minified) into the initial chunk. Parent should render
 * this inside a <Suspense> boundary.
 */
export default function TeamsOverviewChart({ data, title }: TeamsOverviewChartProps) {
  return (
    <div className="glass-card p-5">
      <h3 className="font-bold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
          <YAxis tick={{ fontSize: 10, fill: "#888" }} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "hsl(222 25% 12%)", border: "1px solid hsl(217 32% 20%)", borderRadius: "12px" }}
            labelStyle={{ color: "#fff", fontWeight: "bold" }}
          />
          <Legend />
          <Bar dataKey="For" fill="hsl(221 83% 62%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Against" fill="hsl(0 72% 51% / 0.6)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
