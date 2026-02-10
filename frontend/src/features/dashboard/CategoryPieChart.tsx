import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Order, Product } from '../../db/db';
import { useCurrency } from '../../hooks/useCurrency';

interface Props {
  orders: Order[];
  products: Product[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const CategoryPieChart: React.FC<Props> = ({ orders, products }) => {
  const currency = useCurrency();

  const data = useMemo(() => {
    // 1. Create a map of ProductID -> Category Name
    const productCategoryMap = new Map<number, string>();
    products.forEach(p => productCategoryMap.set(p.id!, p.category));

    // 2. Aggregate Sales by Category
    const categoryTotals: Record<string, number> = {};

    orders.forEach(order => {
      if (order.status === 'refunded') return; // Skip refunded

      order.items.forEach(item => {
        // Find category or default to 'Other'
        const cat = productCategoryMap.get(item.productId) || 'Other';
        const itemTotal = item.price * item.quantity;

        categoryTotals[cat] = (categoryTotals[cat] || 0) + itemTotal;
      });
    });

    // 3. Convert to Array for Recharts
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort biggest to smallest
  }, [orders, products]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <p>No category data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Sales by Category</h3>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {/* ✅ Fixed: Changed 'entry' to '_' since it was unused */}
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
               // ✅ Fixed: Type definition now accepts 'undefined'
               formatter={(value: number | string | Array<number | string> | undefined) =>
                 `${currency}${Number(value || 0).toFixed(2)}`
               }
               contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};