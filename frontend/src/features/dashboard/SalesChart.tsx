import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { Order } from '../../db/db';
import { useCurrency } from '../../hooks/useCurrency';

interface SalesChartProps {
  orders: Order[];
}

export const SalesChart: React.FC<SalesChartProps> = ({ orders }) => {
  const currency = useCurrency();

  // --- Logic: Process Data for Last 7 Days ---
  const data = useMemo(() => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i)); // Go back 6 days up to today
      return d.toISOString().split('T')[0]; // Format: "YYYY-MM-DD"
    });

    return last7Days.map((dateStr) => {
      // 1. Find orders for this specific date
      const daysOrders = orders.filter(o => {
        const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
        return orderDate === dateStr && o.status !== 'refunded'; // Exclude fully refunded
      });

      // 2. Sum up Net Revenue (Total - Partial Refunds)
      const dailyTotal = daysOrders.reduce((sum, order) => {
        const net = order.total - (order.refundedAmount || 0);
        return sum + net;
      }, 0);

      // 3. Return format for Recharts
      return {
        date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }), // e.g., "Mon 23"
        revenue: dailyTotal
      };
    });
  }, [orders]);

  if (orders.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <p>No sales data to display yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Trends (Last 7 Days)</h3>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              // ✅ FIXED: Explicitly allow 'undefined' in the type definition
              formatter={(value: number | string | Array<number | string> | undefined) => [
                `${currency}${Number(value || 0).toFixed(2)}`,
                'Revenue'
              ]}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};