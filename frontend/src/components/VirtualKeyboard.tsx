import React, { useState } from 'react';
import { Delete, CornerDownLeft, ArrowUp, Globe } from 'lucide-react';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  layout?: 'full' | 'numeric' | 'email' | 'phone';
  className?: string;
}

type KeyboardMode = 'default' | 'shifted' | 'capslock' | 'symbols' | 'more_symbols';

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onKeyPress,
  onBackspace,
  onEnter,
  layout = 'full',
  className = ''
}) => {
  const [mode, setMode] = useState<KeyboardMode>('default');

  // --- LAYOUT DICTIONARIES ---
  const layouts = {
    default: [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['{shift}', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '{backspace}'],
      ['{?123}', layout === 'email' ? '@' : ',', '{space}', '.', '{enter}']
    ],
    shifted: [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['{shift}', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '{backspace}'],
      ['{?123}', layout === 'email' ? '@' : ',', '{space}', '.', '{enter}']
    ],
    symbols: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['@', '#', '$', '%', '&', '*', '-', '+', '(', ')'],
      ['{more}', '!', '"', "'", ':', ';', '/', '?', '{backspace}'],
      ['{abc}', layout === 'email' ? '_' : ',', '{space}', '.', '{enter}']
    ],
    more_symbols: [
      ['~', '`', '|', '•', '√', 'π', '÷', '×', '{', '}'],
      ['\t', '£', '¢', '€', 'º', '^', '_', '=', '[', ']'],
      ['{?123}', '™', '®', '©', '¶', '\\', '<', '>', '{backspace}'],
      ['{abc}', layout === 'email' ? '_' : ',', '{space}', '.', '{enter}']
    ],
    numeric: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['.', '0', '{backspace}']
    ],
    phone: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['+', '0', '{backspace}']
    ]
  };

  let activeRows = layouts.default;
  if (layout === 'numeric') activeRows = layouts.numeric;
  else if (layout === 'phone') activeRows = layouts.phone;
  else activeRows = layouts[mode === 'capslock' ? 'shifted' : mode] || layouts.default;

  const isNumpad = layout === 'numeric' || layout === 'phone';

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleKeyClick = (key: string) => {
    if (key === '{shift}') {
      setMode(prev => prev === 'default' ? 'shifted' : prev === 'shifted' ? 'capslock' : 'default');
      return;
    }
    if (key === '{?123}') { setMode('symbols'); return; }
    if (key === '{abc}') { setMode('default'); return; }
    if (key === '{more}') { setMode('more_symbols'); return; }

    if (key === '{backspace}') { onBackspace(); return; }
    if (key === '{enter}') { onEnter(); return; }
    if (key === '{space}') { onKeyPress(' '); return; }

    onKeyPress(key);

    if (mode === 'shifted') {
      setMode('default');
    }
  };

  const renderKey = (key: string, rowIndex: number) => {
    let content: React.ReactNode = key;

    // ✅ SYNCED THEME: Base Key Styling (Pulls from your AppTheme variables)
    let buttonClass = "bg-[var(--background-color,#ffffff)] dark:bg-[var(--background-color,#1e293b)] text-[var(--text-color,#1f2937)] dark:text-[var(--text-color,#f8fafc)] border-[var(--card-color,#e5e7eb)] dark:border-transparent shadow-[0_2px_0_0_rgba(0,0,0,0.05)] hover:opacity-80 transition-opacity";
    let widthClass = "flex-1";

    if (key.startsWith('{') && key.endsWith('}')) {
      // ✅ SYNCED THEME: Action Keys (Shift, 123, etc.)
      buttonClass = "bg-[var(--card-color,#e5e7eb)] dark:bg-[var(--card-color,#334155)] text-[var(--sub-text-color,#4b5563)] dark:text-[var(--sub-text-color,#cbd5e1)] border-transparent shadow-[0_2px_0_0_rgba(0,0,0,0.05)] hover:opacity-80 transition-opacity";

      switch (key) {
        case '{shift}':
          content = <ArrowUp size={20} />;
          widthClass = "flex-[1.5]";
          if (mode === 'shifted' || mode === 'capslock') {
            buttonClass = "bg-[var(--text-color,#1f2937)] dark:bg-[var(--text-color,#f8fafc)] text-[var(--background-color,#ffffff)] dark:text-[var(--background-color,#1e293b)] border-transparent shadow-md";
          }
          break;
        case '{backspace}':
          content = <Delete size={20} />;
          widthClass = isNumpad ? "flex-1" : "flex-[1.5]";
          break;
        case '{enter}':
          content = <CornerDownLeft size={20} />;
          // ✅ SYNCED THEME: Enter Key pulls the System Primary Color (defaults to Green if none)
          buttonClass = "bg-[var(--primary-color,#16a34a)] text-white shadow-md hover:brightness-110 border-transparent";
          widthClass = "flex-[2]";
          break;
        case '{space}':
          content = layout === 'email' ? <span className="text-xs tracking-widest opacity-60">SPACE</span> : " ";
          widthClass = "flex-[5]";
          break;
        case '{?123}':
          content = "?123";
          widthClass = "flex-[1.5]";
          break;
        case '{abc}':
          content = "ABC";
          widthClass = "flex-[1.5]";
          break;
        case '{more}':
          content = "=\\<";
          widthClass = "flex-[1.5]";
          break;
      }
    } else {
        if ((key === '@' || key === '.com' || key === '_') && layout === 'email') {
             buttonClass = "bg-[var(--primary-color,#3b82f6)] text-white border-transparent shadow-sm hover:opacity-90";
        }
    }

    return (
      <button
        key={key}
        onClick={() => handleKeyClick(key)}
        className={`
          ${widthClass} ${buttonClass}
          flex items-center justify-center rounded-xl border
          active:scale-95 active:translate-y-[2px] active:shadow-none transition-all
          ${isNumpad ? 'h-16 text-2xl' : 'h-14 text-xl sm:text-2xl'}
        `}
      >
        {content}
      </button>
    );
  };

  return (
    <div
      // ✅ SYNCED THEME: Keyboard Container Background
      className={`bg-[var(--card-color,#f3f4f6)] dark:bg-[var(--card-color,#0f172a)] p-2 sm:p-3 rounded-2xl shadow-2xl border border-[var(--sidebar-color,#d1d5db)] dark:border-gray-800 select-none w-full ${className}`}
      onMouseDown={handleMouseDown}
    >
      {layout === 'email' && !isNumpad && mode === 'default' && (
         <div className="flex justify-end gap-2 mb-2 px-1">
             <button onClick={() => handleKeyClick('.com')} className="bg-[var(--card-color,#e5e7eb)] dark:bg-[var(--card-color,#334155)] text-[var(--text-color,#1f2937)] dark:text-[var(--text-color,#f8fafc)] text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1 shadow-sm hover:opacity-80 transition-all"><Globe size={14}/> .com</button>
             <button onClick={() => handleKeyClick('@gmail.com')} className="bg-[var(--card-color,#e5e7eb)] dark:bg-[var(--card-color,#334155)] text-[var(--text-color,#1f2937)] dark:text-[var(--text-color,#f8fafc)] text-sm font-bold px-4 py-2 rounded-lg shadow-sm hover:opacity-80 transition-all">@gmail.com</button>
         </div>
      )}

      <div className="flex flex-col gap-2">
        {activeRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={`flex justify-center gap-1.5 sm:gap-2 w-full ${rowIndex === 1 && !isNumpad ? 'px-[5%]' : ''}`}
          >
            {row.map((key) => renderKey(key, rowIndex))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualKeyboard;