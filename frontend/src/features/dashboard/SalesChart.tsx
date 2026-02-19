import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { useCurrency } from '../../hooks/useCurrency';

interface SalesChartProps {
  data: any[];
  isDaily?: boolean;
}

export const SalesChart: React.FC<SalesChartProps> = ({ data, isDaily }) => {
  const currency = useCurrency();

  // ✅ Safety Check: Ensure data exists
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <p>No sales data available</p>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

          <XAxis
            // ✅ FIX: Use 'date' for daily, 'name' for hourly (matches backend)
            dataKey={isDaily ? "date" : "name"}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickFormatter={(value) => `${currency}${value}`}
          />

          <Tooltip
            formatter={(value: any) => [
              `${currency}${Number(value || 0).toFixed(2)}`,
              'Revenue'
            ]}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
            }}
          />

          <Area
            type="monotone"
            // ✅ FIX: Backend sends 'value', not 'amount'
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};