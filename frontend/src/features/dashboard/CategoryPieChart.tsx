import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCurrency } from '../../hooks/useCurrency';

// Standardized colors to match the rest of the Dashboard
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface PieChartProps {
  data: { name: string; value: number }[];
}

export const CategoryPieChart: React.FC<PieChartProps> = ({ data }) => {
  const currency = useCurrency();

  // ✅ Safety: Ensure data exists and values are numbers
  const chartData = (data || []).map(item => ({
    ...item,
    value: Number(item.value) || 0
  }));

  // ✅ Empty State: Show message if no data to display
  if (chartData.length === 0 || chartData.every(item => item.value === 0)) {
    return (
      <div className="h-[280px] w-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
        <p className="text-sm font-medium">No category data available</p>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60} // Donut style
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            // ✅ FIX: Allow 'value' to be flexible (any) to satisfy TypeScript
            // ✅ FIX: Used 'currency' variable here so it's no longer unused
            formatter={(value: any) => [`${currency}${Number(value).toFixed(2)}`, 'Sales']}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              padding: '12px'
            }}
            itemStyle={{ color: '#374151', fontWeight: 600 }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};