import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Order } from '../../db/db';

interface Props {
  orders: Order[];
}

export const HourlyBarChart: React.FC<Props> = ({ orders }) => {
  const data = useMemo(() => {
    // 1. Initialize 24-hour slots
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i-12} PM` : `${i} AM`,
      count: 0
    }));

    // 2. Bucket orders into hours
    orders.forEach(order => {
      if (order.status === 'refunded') return;
      const date = new Date(order.timestamp);
      const hour = date.getHours();
      hours[hour].count += 1;
    });

    // 3. Filter to only show hours with activity (plus padding) to keep chart clean
    // OR just return specific business hours (e.g., 8 AM - 10 PM)
    return hours.filter(h => h.count >= 0); // Currently showing all 24h
  }, [orders]);

  // Check if empty
  const totalOrders = data.reduce((acc, curr) => acc + curr.count, 0);
  if (totalOrders === 0) {
    return (
       <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <p>No hourly data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Busy Hours (Traffic)</h3>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              interval={2} // Show every 2nd label to avoid clutter
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar
              dataKey="count"
              name="Orders"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};