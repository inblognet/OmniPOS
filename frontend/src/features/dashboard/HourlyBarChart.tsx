import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

export const HourlyBarChart = ({ data }: { data: any[] }) => {
  // Format data: "14:00" -> "2 PM"
  const chartData = data.map(item => ({
    ...item,
    label: item.hour
      ? new Date(`2000-01-01T${item.hour}`).toLocaleTimeString([], { hour: 'numeric' })
      : '',
    amount: parseFloat(item.amount as any)
  }));

  if (!data || data.length === 0) {
    return <div className="h-[280px] flex items-center justify-center text-gray-400">No traffic data</div>;
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{fontSize: 10, fill: '#94a3b8'}}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{fontSize: 10, fill: '#94a3b8'}}
          />
          <Tooltip
            cursor={{fill: '#f8fafc'}}
            formatter={(val: any) => [`${Number(val).toFixed(2)}`, 'Revenue']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar
            dataKey="amount"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            barSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};