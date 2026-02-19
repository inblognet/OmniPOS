import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

export const HourlyBarChart = ({ data }: { data: any[] }) => {
  // ✅ Data is already formatted by backend as { name: "02 PM", value: 5 }
  // We just ensure 'value' is a number to be safe.
  const chartData = (data || []).map(item => ({
    ...item,
    name: item.name,
    value: Number(item.value)
  }));

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
        <p className="text-sm font-medium">No activity recorded today</p>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{fontSize: 10, fill: '#94a3b8'}}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{fontSize: 10, fill: '#94a3b8'}}
            allowDecimals={false} // Since it's transaction count, no decimals
          />
          <Tooltip
            cursor={{fill: '#f8fafc'}}
            formatter={(val: any) => [`${val}`, 'Transactions']}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              padding: '12px'
            }}
            itemStyle={{ color: '#6366f1', fontWeight: 600 }}
          />
          <Bar
            dataKey="value"
            fill="#8b5cf6"
            radius={[4, 4, 0, 0]}
            barSize={40}
            animationDuration={1500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};