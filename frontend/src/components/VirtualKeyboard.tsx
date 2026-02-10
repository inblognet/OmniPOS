import React from 'react';
import { Delete, Check, Space } from 'lucide-react';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  layout?: 'full' | 'numeric' | 'minimal';
  className?: string;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onKeyPress,
  onBackspace,
  onEnter,
  layout = 'full',
  className = ''
}) => {

  const fullRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const minimalRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', '-']
  ];

  const rows = layout === 'full' ? fullRows : minimalRows;

  // Prevent default onMouseDown to stop focus loss from input fields
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className={`bg-white p-3 rounded-2xl shadow-xl border border-gray-200 select-none w-full ${className}`}
      onMouseDown={handleMouseDown}
    >
      <div className="flex flex-col gap-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2 w-full">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => onKeyPress(key)}
                className={`
                  flex-1
                  bg-gray-50 text-gray-800 font-bold rounded-lg shadow-sm border border-gray-200
                  active:scale-95 active:bg-gray-100 transition-all
                  hover:bg-white hover:border-gray-300
                  flex items-center justify-center
                  ${layout === 'full' ? 'h-12 text-base' : 'h-14 text-xl'}
                `}
              >
                {key}
              </button>
            ))}
          </div>
        ))}

        {/* Function Row */}
        <div className="flex justify-center gap-2 mt-1 w-full">
          <button
            onClick={onBackspace}
            className={`bg-red-50 text-red-600 border border-red-100 rounded-lg font-bold flex items-center justify-center shadow-sm active:scale-95 hover:bg-red-100 transition-all ${layout === 'full' ? 'w-20 h-12' : 'flex-1 h-14'}`}
          >
            <Delete size={layout === 'full' ? 20 : 24} />
          </button>

          {layout === 'full' && (
            <button
              onClick={() => onKeyPress(" ")}
              className="bg-gray-50 text-gray-600 border border-gray-200 flex-1 h-12 rounded-lg font-bold shadow-sm active:scale-95 flex items-center justify-center hover:bg-white transition-all"
            >
              <Space size={20} /> <span className="ml-2 text-xs uppercase tracking-wider">Space</span>
            </button>
          )}

          <button
            onClick={onEnter}
            className={`bg-gray-900 text-white border border-gray-800 rounded-lg font-bold flex items-center justify-center shadow-sm active:scale-95 hover:bg-black transition-all ${layout === 'full' ? 'w-20 h-12' : 'flex-1 h-14'}`}
          >
            <Check size={layout === 'full' ? 20 : 24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VirtualKeyboard;