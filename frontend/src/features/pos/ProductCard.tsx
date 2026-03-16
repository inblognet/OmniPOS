import React from 'react';
import { Product } from '../../db/db';
import { Plus, Pencil } from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onEdit: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onEdit }) => {
  const currency = useCurrency();
  const isOutOfStock = product.stock <= 0;

  // Optional: Highlight low stock items so cashiers can warn customers
  const isLowStock = !isOutOfStock && product.stock <= 5;

  return (
    <div
      onClick={onClick}
      className={`
        relative flex flex-col justify-between p-4 rounded-2xl border transition-all text-left h-full min-h-[130px] group cursor-pointer overflow-hidden
        ${isOutOfStock
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md active:scale-[0.97] shadow-sm'
        }
      `}
    >
      {/* Quick Edit Button (Hidden until hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent accidentally adding to cart when clicking edit
          onEdit();
        }}
        className="absolute top-2 right-2 p-1.5 bg-white border border-gray-100 shadow-sm text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all opacity-0 group-hover:opacity-100 z-10"
        title="Quick Edit Product"
      >
        <Pencil size={14} />
      </button>

      <div className="pr-6"> {/* Padding right prevents long names from hiding under the edit button */}
        <h3 className="font-bold text-gray-800 line-clamp-2 leading-tight text-sm mb-1.5">
          {product.name}
        </h3>

        {/* Sleek Stock Indicator Badge */}
        <div className="flex items-center gap-1">
            {isOutOfStock ? (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">Out of Stock</span>
            ) : isLowStock ? (
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">Only {product.stock} left</span>
            ) : (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">{product.stock} in stock</span>
            )}
        </div>
      </div>

      <div className="w-full flex justify-between items-end mt-3">
        {/* Price Tag */}
        <span className="text-lg font-black text-gray-900 tracking-tight">
          {currency}{Number(product.price).toFixed(2)}
        </span>

        {/* Interactive Add Button */}
        {!isOutOfStock && (
          <div className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Plus size={18} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;