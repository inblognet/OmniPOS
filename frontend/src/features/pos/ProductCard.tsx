import React from 'react';
import { Product } from '../../db/db';
import { Plus, Pencil } from 'lucide-react'; // Added Pencil icon
import { useCurrency } from '../../hooks/useCurrency';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onEdit: () => void; // <--- New Prop
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onEdit }) => {
  const currency = useCurrency();
  const isOutOfStock = product.stock <= 0;

  return (
    <div
      onClick={onClick}
      className={`
        relative flex flex-col items-start p-4 rounded-xl border transition-all text-left h-36 group cursor-pointer
        ${isOutOfStock
          ? 'bg-gray-100 border-gray-200 opacity-60'
          : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-md active:scale-[0.98]'
        }
      `}
    >
      {/* Edit Button (Top Right) */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent adding to cart
          onEdit();
        }}
        className="absolute top-2 right-2 p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
        title="Quick Edit Product"
      >
        <Pencil size={14} />
      </button>

      <div className="flex-1 w-full mt-1">
        <h3 className="font-semibold text-gray-800 line-clamp-2 leading-tight text-sm">
          {product.name}
        </h3>
        <span className="text-xs text-gray-500 mt-1 block">
          Stock: {product.stock}
        </span>
      </div>

      <div className="w-full flex justify-between items-end mt-2">
        <span className="text-lg font-bold text-blue-600">
          {currency}{product.price.toFixed(2)}
        </span>
        {!isOutOfStock && (
          <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
            <Plus size={16} />
          </div>
        )}
      </div>
    </div>
  );
};
export default ProductCard;