// cspell:ignore Sinhala
"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useToastStore } from "@/store/useToastStore";
import {
  Save, ArrowLeft, Type, Image as ImageIcon, Braces, Table as TableIcon,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2, Loader2, MousePointer2
} from "lucide-react";

// --- Types ---
type ComponentType = "text" | "image" | "variable" | "table";

interface ComponentStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  textAlign: "left" | "center" | "right";
}

interface CanvasComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; // Text content, Image URL, or Variable Name
  style: ComponentStyle;
  // Table specific
  columns?: string[];
}

const AVAILABLE_FONTS = [
  "Inter, sans-serif",
  "Arial, sans-serif",
  "Times New Roman, serif",
  "Courier New, monospace",
  "'Noto Sans Sinhala', sans-serif", // 🔥 Sinhalese Font Support
  "'Abhaya Libre', serif"            // 🔥 Sinhalese Serif Support
];

const AVAILABLE_VARIABLES = [
  "{{order_id}}", "{{customer_name}}", "{{customer_phone}}",
  "{{order_date}}", "{{total_amount}}", "{{discount_amount}}", "{{final_total}}"
];

export default function LiveInvoiceEditor() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToastStore();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateMeta, setTemplateMeta] = useState({ name: "", type: "INVOICE" });

  // Canvas State
  const [canvasSettings, setCanvasSettings] = useState({ width: 794, height: 1123 }); // A4 default
  const [components, setComponents] = useState<CanvasComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 1. Fetch Template Data
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await api.get(`/web/admin/invoice-templates/${params.id}`);
        if (res.data.success && res.data.template) {
          const t = res.data.template;
          setTemplateMeta({ name: t.name, type: t.type });

          if (t.design_data) {
            setCanvasSettings({
              width: t.design_data.width || (t.type === 'RECEIPT' ? 300 : 794),
              height: t.design_data.height || (t.type === 'RECEIPT' ? 800 : 1123)
            });
            setComponents(t.design_data.components || []);
          }
        }
      } catch (error: unknown) {
        console.error("Failed to load template", error); // 🔥 Used error
        addToast("Failed to load template", "error");
        router.push("/admin/invoices");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchTemplate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // 2. Add Component to Canvas
  const addComponent = (type: ComponentType) => {
    const newComp: CanvasComponent = {
      id: `comp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      x: 50,
      y: 50,
      width: type === 'table' ? canvasSettings.width - 100 : 200,
      height: type === 'image' ? 100 : 50,
      content: type === 'text' ? "Double click to edit text" :
               type === 'variable' ? "{{order_id}}" :
               type === 'image' ? "https://placehold.co/200x100?text=Logo" : "Items Table",
      style: {
        fontSize: 14,
        fontFamily: AVAILABLE_FONTS[0],
        color: "#000000",
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        textAlign: "left"
      },
      columns: type === 'table' ? ['Item', 'Qty', 'Rate', 'Amount'] : undefined
    };
    setComponents([...components, newComp]);
    setSelectedId(newComp.id);
  };

  // 3. Mouse Drag Events for Absolute Positioning
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const comp = components.find(c => c.id === id);
    if (comp && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      // Calculate where inside the component the user clicked
      setDragOffset({ x: mouseX - comp.x, y: mouseY - comp.y });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setComponents(components.map(c => {
      if (c.id === selectedId) {
        return {
          ...c,
          x: Math.max(0, Math.min(mouseX - dragOffset.x, canvasSettings.width - c.width)),
          y: Math.max(0, Math.min(mouseY - dragOffset.y, canvasSettings.height - 20)) // Allow bottom drag
        };
      }
      return c;
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 4. Update Component Properties (Inspector)
  const updateSelected = (updates: Partial<CanvasComponent> | { style: Partial<ComponentStyle> }) => {
    setComponents(components.map(c => {
      if (c.id === selectedId) {
        if ('style' in updates) {
          return { ...c, style: { ...c.style, ...updates.style } };
        }
        return { ...c, ...updates };
      }
      return c;
    }));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setComponents(components.filter(c => c.id !== selectedId));
    setSelectedId(null);
  };

  // 5. Save Layout to Database
  const handleSave = async () => {
    setSaving(true);
    try {
      const designData = { width: canvasSettings.width, height: canvasSettings.height, components };
      const res = await api.put(`/web/admin/invoice-templates/${params.id}/design`, { design_data: designData });
      if (res.data.success) {
        addToast("Layout saved successfully!", "success");
      }
    } catch (error: unknown) {
      console.error("Failed to save layout.", error); // 🔥 Used error
      addToast("Failed to save layout.", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedComp = components.find(c => c.id === selectedId);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">

      {/* TOP NAVIGATION BAR */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/invoices')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-black text-gray-900">{templateMeta.name}</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{templateMeta.type} EDITOR</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Template
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* LEFT TOOLBOX */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-10 shrink-0">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Components</h2>
          </div>
          <div className="p-4 space-y-3">
            <button onClick={() => addComponent('text')} className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 transition-colors">
              <Type size={18} /> Static Text
            </button>
            <button onClick={() => addComponent('variable')} className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 transition-colors">
              <Braces size={18} /> Data Variable
            </button>
            <button onClick={() => addComponent('image')} className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 transition-colors">
              <ImageIcon size={18} /> Image / Logo
            </button>
            <button onClick={() => addComponent('table')} className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 transition-colors">
              <TableIcon size={18} /> Items Table
            </button>
          </div>

          <div className="mt-auto p-4 bg-amber-50 border-t border-amber-100 m-4 rounded-xl">
            <p className="text-xs font-bold text-amber-700 flex items-center gap-2 mb-1"><MousePointer2 size={14}/> How to use</p>
            <p className="text-[10px] text-amber-600 font-medium">Click a component to select it. Drag to move it. Use the right panel to customize its properties.</p>
          </div>
        </div>

        {/* CENTER CANVAS AREA */}
        <div
          className="flex-1 bg-gray-200 overflow-auto relative p-10 flex justify-center items-start custom-scrollbar"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => setSelectedId(null)}
        >
          {/* The Actual Paper Canvas */}
          <div
            ref={canvasRef}
            className="bg-white shadow-2xl relative overflow-hidden ring-1 ring-gray-300"
            style={{
              width: `${canvasSettings.width}px`,
              height: `${canvasSettings.height}px`,
              minHeight: `${canvasSettings.height}px`
            }}
          >
            {components.map((comp) => (
              <div
                key={comp.id}
                onMouseDown={(e) => handleMouseDown(e, comp.id)}
                className={`absolute cursor-move ${selectedId === comp.id ? 'ring-2 ring-blue-500 ring-offset-2 z-10' : 'hover:ring-1 hover:ring-blue-300 z-0'}`}
                style={{
                  left: `${comp.x}px`,
                  top: `${comp.y}px`,
                  width: comp.type === 'table' ? `${comp.width}px` : 'auto',
                  ...comp.style
                }}
              >
                {/* RENDER COMPONENT BASED ON TYPE */}
                {comp.type === 'image' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={comp.content} alt="element" className="w-full h-full object-contain pointer-events-none" style={{ width: comp.width, height: comp.height }} />
                )}

                {comp.type === 'text' && (
                  <div className="whitespace-pre-wrap">{comp.content}</div>
                )}

                {comp.type === 'variable' && (
                  <div className="bg-blue-50/50 px-1 border border-blue-100/50 whitespace-nowrap">{comp.content}</div>
                )}

                {comp.type === 'table' && (
                  <div className="w-full border border-gray-800">
                    <div className="flex bg-gray-100 font-bold border-b border-gray-800">
                      {comp.columns?.map((col, i) => (
                        <div key={i} className={`flex-1 p-2 text-sm border-r border-gray-800 last:border-0 ${col === 'Amount' || col === 'Rate' ? 'text-right' : 'text-left'}`}>
                          {col}
                        </div>
                      ))}
                    </div>
                    <div className="flex">
                      {comp.columns?.map((col, i) => (
                        <div key={i} className={`flex-1 p-2 text-sm text-gray-500 border-r border-gray-800 last:border-0 ${col === 'Amount' || col === 'Rate' ? 'text-right' : 'text-left'}`}>
                          {col === 'Qty' ? '1' : col === 'Amount' || col === 'Rate' ? '$0.00' : 'Sample Item'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT INSPECTOR PANEL */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col z-10 shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Properties</h2>
            {selectedId && (
              <button onClick={deleteSelected} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Delete Component">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {!selectedId || !selectedComp ? (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center">
              <MousePointer2 size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-bold">No item selected</p>
              <p className="text-xs mt-1">Select an item on the canvas to edit its properties.</p>
            </div>
          ) : (
            <div className="p-5 space-y-6">

              {/* Data Content Inspector */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Content Data</label>
                {selectedComp.type === 'variable' ? (
                  <select
                    value={selectedComp.content}
                    onChange={(e) => updateSelected({ content: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {AVAILABLE_VARIABLES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : selectedComp.type === 'image' ? (
                  <input
                    type="text" value={selectedComp.content} onChange={(e) => updateSelected({ content: e.target.value })}
                    placeholder="Image URL" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : selectedComp.type === 'text' ? (
                  <textarea
                    rows={3} value={selectedComp.content} onChange={(e) => updateSelected({ content: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  ></textarea>
                ) : (
                  <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">Table data is injected automatically during PDF generation.</p>
                )}
              </div>

              {/* Exact Positioning Inspector */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">X Position</label>
                  <input type="number" value={Math.round(selectedComp.x)} onChange={(e) => updateSelected({ x: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Y Position</label>
                  <input type="number" value={Math.round(selectedComp.y)} onChange={(e) => updateSelected({ y: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {['image', 'table'].includes(selectedComp.type) && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Width (px)</label>
                      <input type="number" value={selectedComp.width} onChange={(e) => updateSelected({ width: parseInt(e.target.value) || 100 })} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    {selectedComp.type === 'image' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Height (px)</label>
                        <input type="number" value={selectedComp.height} onChange={(e) => updateSelected({ height: parseInt(e.target.value) || 100 })} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Typography Inspector (For text/variables) */}
              {['text', 'variable'].includes(selectedComp.type) && (
                <div className="space-y-4 pt-4 border-t border-gray-100">

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Font Family (Sinhalese Support)</label>
                    <select
                      value={selectedComp.style.fontFamily} onChange={(e) => updateSelected({ style: { fontFamily: e.target.value }})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {AVAILABLE_FONTS.map((font, idx) => <option key={idx} value={font}>{font.split(',')[0].replace(/'/g, '')}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Size (px)</label>
                      <input type="number" value={selectedComp.style.fontSize} onChange={(e) => updateSelected({ style: { fontSize: parseInt(e.target.value) || 14 } })} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Color</label>
                      <input type="color" value={selectedComp.style.color} onChange={(e) => updateSelected({ style: { color: e.target.value } })} className="w-full h-9 rounded-lg cursor-pointer border border-gray-200" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Style & Alignment</label>
                    <div className="flex gap-2">
                      <button onClick={() => updateSelected({ style: { fontWeight: selectedComp.style.fontWeight === 'bold' ? 'normal' : 'bold' } })} className={`p-2 border rounded-lg transition-colors ${selectedComp.style.fontWeight === 'bold' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}><Bold size={16}/></button>
                      <button onClick={() => updateSelected({ style: { fontStyle: selectedComp.style.fontStyle === 'italic' ? 'normal' : 'italic' } })} className={`p-2 border rounded-lg transition-colors ${selectedComp.style.fontStyle === 'italic' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}><Italic size={16}/></button>
                      <button onClick={() => updateSelected({ style: { textDecoration: selectedComp.style.textDecoration === 'underline' ? 'none' : 'underline' } })} className={`p-2 border rounded-lg transition-colors ${selectedComp.style.textDecoration === 'underline' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}><Underline size={16}/></button>
                      <div className="w-px bg-gray-200 mx-1"></div>
                      <button onClick={() => updateSelected({ style: { textAlign: 'left' } })} className={`p-2 border rounded-lg transition-colors ${selectedComp.style.textAlign === 'left' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}><AlignLeft size={16}/></button>
                      <button onClick={() => updateSelected({ style: { textAlign: 'center' } })} className={`p-2 border rounded-lg transition-colors ${selectedComp.style.textAlign === 'center' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}><AlignCenter size={16}/></button>
                      <button onClick={() => updateSelected({ style: { textAlign: 'right' } })} className={`p-2 border rounded-lg transition-colors ${selectedComp.style.textAlign === 'right' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}><AlignRight size={16}/></button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}