// cspell:ignore dexie IMEI qrcode react-barcode bcid Barcodes Uncategorized
import React, { useState, useEffect, useRef } from 'react';
import { db, Product, ProductBatch, Supplier, Category as LocalCategory } from '../../db/db';
import { useInventoryLogic } from '../../hooks/useInventoryLogic';
import { PRESETS, BusinessType } from '../../config/inventoryConfig';
import { productService, Category } from '../../services/productService';
import api from '../../api/axiosConfig';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import {
  Search, Plus, Edit, Trash2, X, Save,
  Tag, DollarSign, Box, Layers, AlertTriangle, CheckCircle, Ban, RefreshCw, FolderTree, ChevronDown, Settings, Calendar,
  Scan, QrCode, Printer, CheckSquare, Square, PackagePlus,
  Activity, AlertOctagon, LayoutGrid, Archive, List, Download, Upload, FileSpreadsheet, Building2
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';

interface DamageLog {
  id: number;
  name: string;
  qty: number;
  reason: string;
  created_at: string;
}

interface ExtendedProduct extends Product {
  latestDamageReason?: string;
}

const InventoryScreen: React.FC = () => {
  const currency = useCurrency();
  const { config, checkExpiries } = useInventoryLogic();

  useEffect(() => {
    checkExpiries();
  }, [config.features.expiryTracking, checkExpiries]);

  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [categories, setCategories] = useState<Category[] | LocalCategory[]>([]);
  const [damageLogs, setDamageLogs] = useState<DamageLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);

  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Helper to get base barcode (removes -b1, -B2, -1, etc.)
  const getCleanBarcode = (value: string | undefined): string => {
    if (!value) return '00000000';
    return String(value).split('-')[0].trim();
  };

  // ✅ Helper to calculate dynamic sizes based on user input
  const getDynamicPrintSizes = (baseWidth: number) => {
    return {
        bWidth: Math.max(1, baseWidth / 120),  // Scales barcode line thickness
        bHeight: Math.max(30, baseWidth / 4),  // Scales barcode line height
        qrSize: Math.max(50, baseWidth * 0.6), // Scales QR code box
        fSize: Math.max(10, baseWidth / 18)    // Scales font text
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);

      try {
        let cats: any[] = [];
        if (navigator.onLine) {
            cats = await productService.getCategories();
        }
        if (!cats || cats.length === 0) {
            cats = await db.categories.toArray();
        }
        setCategories(cats || []);
      } catch (e) {
        console.warn("Categories API failed, loading local", e);
        const localCats = await db.categories.toArray();
        setCategories(localCats || []);
      }

      // ✅ FIX: Fetch live suppliers from API, fallback to local DB
      try {
        let sups: any[] = [];
        if (navigator.onLine) {
            const res = await api.get('/suppliers');
            sups = res.data;
        } else {
            sups = await db.suppliers.toArray();
        }
        setSuppliersList(sups || []);
      } catch (e) {
        console.warn("Suppliers fetch failed", e);
      }

      let prodData: any[] = [];
      try {
         if (navigator.onLine) {
             const rawData = await productService.getAll();

             prodData = rawData.map((item: any) => {
                 const cleanItem = { ...item };
                 if (cleanItem.supplierId === null) delete cleanItem.supplierId;
                 return cleanItem;
             });

             if (Array.isArray(prodData) && prodData.length > 0) {
                 const localCount = await db.products.count();
                 if (localCount === 0) {
                     await db.products.bulkPut(prodData);
                 }
             }
         } else {
             prodData = await db.products.toArray();
         }
      } catch (err) {
         console.error("API Fetch failed, using local DB", err);
         prodData = await db.products.toArray();
      }

      setProducts(prevProducts => {
        if (!Array.isArray(prodData)) return [];
        return prodData.map((newItem: Product) => {
          const existing = prevProducts.find(p => p.id === newItem.id);
          return existing && existing.latestDamageReason
            ? { ...newItem, latestDamageReason: existing.latestDamageReason }
            : newItem;
        });
      });

    } catch (error) {
      console.error("Failed to load inventory data completely", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadDamageLogs = async () => {
    try {
      const res = await api.get('/products/damage/logs');
      setDamageLogs(res.data);
    } catch (error) {
      console.error("Failed to load logs", error);
    }
  };

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'inventory' | 'supplier' | 'settings'>('basic');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState<BusinessType>('General_Retail');
  const [featureOverrides, setFeatureOverrides] = useState<any>({});

  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  const [showDamageModal, setShowDamageModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [damageQty, setDamageQty] = useState(1);
  const [damageNote, setDamageNote] = useState('');

  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [barcodeCategoryFilter, setBarcodeCategoryFilter] = useState('');
  const [selectedBarcodeIds, setSelectedBarcodeIds] = useState<number[]>([]);
  const [viewingCode, setViewingCode] = useState<{ id: number, type: 'barcode' | 'qr', value: string, name: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [printCardSize, setPrintCardSize] = useState<number>(220);
  const [printType, setPrintType] = useState<'barcode' | 'qr'>('barcode');
  const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);

  const [printQueue, setPrintQueue] = useState<Product[] | null>(null);

  const [activeStatModal, setActiveStatModal] = useState<'products' | 'categories' | 'stock' | 'expired' | 'damaged' | null>(null);

  useEffect(() => {
    if (activeStatModal === 'damaged') {
      loadDamageLogs();
    }
  }, [activeStatModal]);

  const [formData, setFormData] = useState<Product>({
    name: '', sku: '', barcode: '', category: '', brand: '', type: 'Stock', variantGroup: '', variantName: '',
    stockIssueDate: '', stockExpiryDate: '', batchNumber: '', serialNumber: '',
    costPrice: 0, price: 0, discount: 0, wholesalePrice: 0, minSellingPrice: 0,
    isTaxIncluded: false, allowDiscount: true, unit: config.defaultUnit || 'pcs', fractionalAllowed: false,
    stock: 0, reorderLevel: 5, maxStockLevel: 100, isActive: true, allowNegativeStock: false,
    totalQty: 0, damagedQty: 0, expiredQty: 0, batches: [],
    supplierId: undefined, supplierNote: '',
    createdAt: '', updatedAt: ''
  });

  const [newBatch, setNewBatch] = useState<ProductBatch>({ id: '', batchNumber: '', quantity: 0, issueDate: '', expiryDate: '' });
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  const totalProducts = products.length;
  const totalCategories = categories.length;
  const totalDamagedItems = products.reduce((acc, p) => acc + (p.damagedQty || 0), 0);
  const totalStockOnHand = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const expiredBatchesList = products.flatMap(p => (p.batches || []).filter(b => b.expiryDate && new Date(b.expiryDate) < new Date()).map(b => ({ productName: p.name, ...b })));
  const totalExpiredItems = expiredBatchesList.reduce((acc, b) => acc + b.quantity, 0);

  const filteredProducts = products.filter(p => {
    const query = search.toLowerCase();
    const n = p.name ? String(p.name).toLowerCase() : '';
    const s = p.sku ? String(p.sku).toLowerCase() : '';
    const b = p.barcode ? String(p.barcode).toLowerCase() : '';
    return n.includes(query) || s.includes(query) || b.includes(query);
  });

  const barcodeFilteredProducts = products.filter(p => {
    const query = barcodeSearch.toLowerCase();
    const n = p.name ? String(p.name).toLowerCase() : '';
    const b = p.barcode ? String(p.barcode).toLowerCase() : '';
    const matchesSearch = n.includes(query) || b.includes(query);
    const matchesCategory = barcodeCategoryFilter ? (p.category || '').includes(barcodeCategoryFilter) : true;
    return matchesSearch && matchesCategory && p.barcode;
  });

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Name*": "Example Product",
        "Category": "General",
        "VariantGroup": "Example Product",
        "VariantName": "Batch 1",
        "Price*": 15.99,
        "Discount(%)": 0,
        "CostPrice": 8.00,
        "Stock": 50,
        "Unit": "pcs",
        "SKU": "EX-001",
        "Barcode": "123456789-1",
        "BatchNumber": "B-001",
        "ExpiryDate": "12/31/2026"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    const instructionsData = [
      ["INSTRUCTIONS FOR BULK IMPORT"],
      ["1. Columns marked with * are REQUIRED."],
      ["2. Do not change the column headers (Row 1)."],
      ["3. Category: Separate multiple categories with a comma."],
      ["4. VariantGroup & VariantName: Use these to label your batches."],
      ["5. SCENARIO C: Use unique SKUs, identical VariantGroups, and add a dash/number to Barcodes (e.g. 999999-1)."]
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    XLSX.writeFile(wb, "OmniPOS_Inventory_Template.xlsx");
    setShowExcelMenu(false);
  };

  const handleExportInventory = () => {
    const exportData = products.map(p => ({
      ID: p.id,
      Name: p.name,
      Category: p.category || 'Uncategorized',
      SKU: p.sku || '',
      Barcode: p.barcode || '',
      Price: p.price,
      "Discount(%)": p.discount || 0,
      CostPrice: p.costPrice || 0,
      Stock: p.stock,
      DamagedQty: p.damagedQty || 0,
      Unit: p.unit,
      IsActive: p.isActive ? 'Yes' : 'No'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Current Inventory");
    XLSX.writeFile(wb, `OmniPOS_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExcelMenu(false);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });

        if (rawJson.length === 0) {
          alert("The uploaded Excel file is empty.");
          setIsImporting(false);
          return;
        }

        let successCount = 0;
        let failCount = 0;

        const findVal = (row: any, ...possibleKeys: string[]) => {
          if (!row || typeof row !== 'object') return '';
          try {
            const rowKeys = Object.keys(row);
            for (const pk of possibleKeys) {
              if (!pk) continue;
              const pkClean = String(pk).toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const actualKey of rowKeys) {
                if (!actualKey) continue;
                const actualClean = String(actualKey).toLowerCase().replace(/[^a-z0-9]/g, '');
                if (pkClean === actualClean) return row[actualKey];
              }
            }
          } catch (error) {}
          return '';
        };

        for (const row of rawJson) {
          try {
            const name = findVal(row, 'Name*', 'Name', 'Product Name', 'Item');
            const rawPrice = findVal(row, 'Price*', 'Price', 'Selling Price');
            const price = parseFloat(rawPrice as string);

            if (!name || isNaN(price)) {
              failCount++;
              continue;
            }

            const costPrice = parseFloat(findVal(row, 'CostPrice', 'Cost Price', 'Cost') as string) || 0;
            const rawDiscount = findVal(row, 'Discount', 'Discount(%)', 'Disc');
            const discountVal = parseFloat(rawDiscount as string) || 0;
            const stockVal = parseFloat(findVal(row, 'Stock', 'Quantity', 'Qty') as string) || 0;
            const category = findVal(row, 'Category', 'Department', 'Group') || 'Uncategorized';
            const sku = findVal(row, 'SKU', 'Item Code') || '';
            const barcode = String(findVal(row, 'Barcode', 'UPC', 'EAN') || '').trim();
            const unit = findVal(row, 'Unit', 'UOM', 'Measure') || config.defaultUnit || 'pcs';
            const variantGroup = String(findVal(row, 'VariantGroup', 'Variant Group') || '').trim();
            const variantName = String(findVal(row, 'VariantName', 'Variant Name') || '').trim();
            const batchNum = findVal(row, 'BatchNumber', 'Batch') || `B-${Date.now().toString().slice(-4)}`;
            const expiryRaw = findVal(row, 'ExpiryDate', 'Expiry', 'Exp Date');

            let expiryDate = '';
            if (expiryRaw) {
              const parsedDate = new Date(String(expiryRaw));
              if (!isNaN(parsedDate.getTime())) {
                expiryDate = parsedDate.toISOString();
              }
            }

            const batches = [];
            if (stockVal > 0) {
              batches.push({
                id: String(Date.now() + Math.floor(Math.random() * 10000)),
                batchNumber: String(batchNum).trim(),
                quantity: stockVal,
                issueDate: new Date().toISOString(),
                expiryDate: expiryDate
              });
            }

            const payload = {
              name: String(name).trim(),
              price: price,
              discount: discountVal,
              costPrice: costPrice,
              wholesalePrice: 0,
              minSellingPrice: 0,
              stock: stockVal,
              category: String(category).trim(),
              brand: '',
              sku: String(sku).trim(),
              barcode: barcode,
              unit: String(unit).trim(),
              fractionalAllowed: false,
              type: 'Stock',
              variantGroup: variantGroup,
              variantName: variantName,
              serialNumber: '',
              stockIssueDate: '',
              stockExpiryDate: expiryDate,
              batchNumber: String(batchNum).trim(),
              isActive: true,
              damagedQty: 0,
              expiredQty: 0,
              totalQty: stockVal,
              reorderLevel: 5,
              maxStockLevel: 100,
              allowDiscount: true,
              isTaxIncluded: false,
              allowNegativeStock: false,
              batches: batches,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await productService.create(payload as any);
            successCount++;

          } catch (err) {
            failCount++;
            console.error("Failed to import row", row, err);
          }
        }

        alert(`Import Complete!\n✅ Successfully added: ${successCount}\n❌ Failed/Skipped: ${failCount}`);
        setShowExcelMenu(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await loadData();
      } catch (err) {
        console.error("Excel Read Error", err);
        alert("Failed to read the Excel file.");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAutoGenerateIdentifiers = () => {
    const randomSku = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const randomBarcode = Math.floor(10000000 + Math.random() * 90000000).toString();
    setFormData(prev => ({ ...prev, sku: `ITEM-${randomSku}`, barcode: randomBarcode }));
  };

  const getStockStatus = (item: Product) => {
    if (item.type !== 'Stock') return { label: 'N/A', color: 'bg-transparent text-gray-500 border-gray-400' };
    const hasExpiredBatch = item.batches?.some(b => b.expiryDate && new Date(b.expiryDate) < new Date());
    if (hasExpiredBatch) return { label: 'Has Expired Stock', color: 'bg-transparent text-orange-600 border-orange-200' };
    if (item.stock <= 0) return { label: 'Out of Stock', color: 'bg-transparent text-red-600 border-red-200' };
    if (item.stock <= (item.reorderLevel || 5)) return { label: 'Low Stock', color: 'bg-transparent text-yellow-600 border-yellow-400' };
    return { label: 'In Stock', color: 'bg-transparent text-green-600 border-green-400' };
  };

  const handleOpenConfig = async () => {
    const currentSettings = await db.businessSettings.get(1);
    const currentOverrides = await db.inventoryOverrides.get(1);
    if (currentSettings) setSelectedPresetKey(currentSettings.businessType);
    if (currentOverrides?.overrideJson?.features) setFeatureOverrides(currentOverrides.overrideJson.features);
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    await db.transaction('rw', db.businessSettings, db.inventoryOverrides, async () => {
      await db.businessSettings.put({ id: 1, businessType: selectedPresetKey, storeName: 'My Store', createdAt: new Date().toISOString() });
      await db.inventoryOverrides.put({ id: 1, overrideJson: { features: featureOverrides as any } });
    });
    window.location.reload();
  };

  const toggleFeatureOverride = (key: string) => {
    setFeatureOverrides((prev: any) => ({
      ...prev,
      [key]: prev[key] === undefined ? !(PRESETS[selectedPresetKey].features as any)[key] : !prev[key]
    }));
  };

  const handleDelete = async (rawId: number | string) => {
    const id = parseInt(String(rawId).split(':')[0], 10);
    if (window.confirm("Delete this product?")) {
      try { await productService.delete(id); loadData(); } catch (error) { console.error(error); }
    }
  };

  // ✅ FIX: Enhanced Save logic with strict type parsing for the backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return alert("Name and Price are required.");

    const finalStock = config.features.expiryTracking
        ? (formData.batches || []).reduce((acc, b) => acc + b.quantity, 0)
        : parseFloat(formData.stock.toString());

    // Create a strict payload for the backend API
    const finalPayload: any = { ...formData };

    // Explicitly parse supplierId. If falsy/empty string, remove it entirely to prevent DB constraint errors.
    finalPayload.supplierId = formData.supplierId ? parseInt(String(formData.supplierId)) : undefined;
    if (isNaN(finalPayload.supplierId)) finalPayload.supplierId = undefined;

    // Force numbers for calculations
    finalPayload.price = parseFloat(formData.price.toString() || '0');
    finalPayload.costPrice = parseFloat(formData.costPrice.toString() || '0');
    finalPayload.discount = parseFloat(formData.discount?.toString() || '0');
    finalPayload.stock = finalStock;
    finalPayload.updatedAt = new Date().toISOString();

    try {
      if (editingId) await productService.update(editingId, finalPayload);
      else await productService.create(finalPayload);

      setShowModal(false);
      loadData(); // Re-sync the view
    } catch (e) {
        console.error("Save product failed:", e);
        alert("Failed to save product to the cloud database.");
    }
  };

  const handleConfirmDamage = async () => {
    if (selectedProduct && selectedProduct.id) {
      const noteToSave = damageNote;
      try {
        await api.post(`/products/${selectedProduct.id}/damage`, {
          qty: damageQty,
          reason: noteToSave
        });

        setProducts(prev => prev.map(p =>
          p.id === selectedProduct.id
            ? { ...p, stock: p.stock - damageQty, damagedQty: (p.damagedQty || 0) + damageQty, latestDamageReason: noteToSave }
            : p
        ));

        setShowDamageModal(false);
        setDamageQty(1);
        setDamageNote('');
        setSelectedProduct(null);
      } catch (error) {
        console.error("Failed to report damage", error);
        alert("Server error while reporting damage.");
      }
    }
  };

  const startEditBatch = (batch: ProductBatch) => { setNewBatch({ ...batch }); setEditingBatchId(batch.id); };
  const cancelEditBatch = () => { setNewBatch({ id: '', batchNumber: '', quantity: 0, issueDate: '', expiryDate: '' }); setEditingBatchId(null); };
  const removeBatch = (batchId: string) => {
    if (editingBatchId === batchId) cancelEditBatch();
    const updated = (formData.batches || []).filter(b => b.id !== batchId);
    setFormData(prev => ({ ...prev, batches: updated, stock: updated.reduce((a, b) => a + b.quantity, 0) }));
  };
  const handleSaveBatch = () => {
    if (newBatch.quantity <= 0) return alert("Quantity required");
    let updated = [...(formData.batches || [])];
    if (editingBatchId) updated = updated.map(b => b.id === editingBatchId ? { ...newBatch, id: editingBatchId } : b);
    else updated.push({ ...newBatch, id: Date.now().toString(), batchNumber: newBatch.batchNumber || `B-${Date.now().toString().slice(-4)}` });
    setFormData(prev => ({ ...prev, batches: updated, stock: updated.reduce((a, b) => a + b.quantity, 0) }));
    setNewBatch({ id: '', batchNumber: '', quantity: 0, issueDate: '', expiryDate: '' }); setEditingBatchId(null);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
        if (editingCatId) {
            alert("Category renaming is currently disabled to protect existing product links.");
        } else {
            try {
               await productService.addCategory(newCatName.trim());
            } catch(e) {
               console.warn("API Add Failed, saving to Dexie DB directly.");
               await db.categories.add({ name: newCatName.trim() });
            }
        }
        setNewCatName('');
        setEditingCatId(null);
        loadData();
    } catch (err: any) {
        alert(err.response?.data?.error || "Failed to add category.");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm("Delete category?")) {
        try {
            try {
                await productService.deleteCategory(id);
            } catch(e) {
                console.warn("API Delete Failed, deleting from Dexie DB directly.");
                await db.categories.delete(id);
            }
            loadData();
        } catch (err) {
            alert("Failed to delete category.");
        }
    }
  };

  const toggleCategorySelection = (catName: string) => {
    const current = formData.category ? formData.category.split(',').map(s => s.trim()).filter(Boolean) : [];
    const updated = current.includes(catName) ? current.filter(c => c !== catName) : [...current, catName];
    setFormData({ ...formData, category: updated.join(', ') });
  };

  const toggleBarcodeSelection = (id: number) => { setSelectedBarcodeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };

  const selectAllBarcodes = () => {
      if (selectedBarcodeIds.length === barcodeFilteredProducts.length) {
          setSelectedBarcodeIds([]);
      } else {
          setSelectedBarcodeIds(barcodeFilteredProducts.map(p => p.id!));
      }
  };

  const executePrintQueue = (itemsToPrint: Product[]) => {
      setPrintQueue(itemsToPrint);
      setTimeout(() => {
          window.print();
          setPrintQueue(null);
          setShowSinglePrintModal(false);
      }, 500);
  };

  const handleBatchPrint = () => {
    const items = products.filter(p => selectedBarcodeIds.includes(p.id!));
    if (items.length === 0) return alert("Please select items to print first.");
    executePrintQueue(items);
  };

  const executeSinglePrint = () => {
    if (!viewingCode) return;
    const product = products.find(p => p.id === viewingCode.id);
    if (product) executePrintQueue([product]);
  };

  const openCreateModal = () => { setEditingId(null); setActiveTab('basic'); setFormData({ name: '', sku: '', barcode: '', category: '', brand: '', type: 'Stock', variantGroup: '', variantName: '', stockIssueDate: '', stockExpiryDate: '', batchNumber: '', serialNumber: '', costPrice: 0, price: 0, discount: 0, wholesalePrice: 0, minSellingPrice: 0, isTaxIncluded: false, allowDiscount: true, unit: config.defaultUnit || 'pcs', fractionalAllowed: false, stock: 0, reorderLevel: 5, maxStockLevel: 100, isActive: true, allowNegativeStock: false, totalQty: 0, damagedQty: 0, expiredQty: 0, batches: [], supplierId: undefined, supplierNote: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); setShowModal(true); };

  const openEditModal = (p: Product) => { setEditingId(p.id!); setActiveTab('basic'); setFormData({ ...p, batches: p.batches || [] }); setShowModal(true); };

  const isBarcodeFeatureEnabled = (featureOverrides as any).barcodeGeneration ?? false;

  if (loading && products.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 animate-pulse">Syncing Inventory...</div>;

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6 overflow-y-auto relative">

      {isImporting && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
           <RefreshCw className="text-blue-600 animate-spin mb-4" size={40} />
           <h2 className="text-xl font-bold text-gray-800">Processing Excel Import...</h2>
           <p className="text-gray-500 mt-2">Please wait. Securing bulk products to the cloud.</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Box className="text-blue-600" /> Inventory Management <span className="text-xs font-normal bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">{config.name}</span></h1>
          <p className="text-gray-500 text-sm mt-1">Manage stock, pricing, and details.</p>
        </div>
        <div className="flex gap-2 relative">
          <button onClick={handleOpenConfig} className="bg-white border px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"><Settings size={18} /> Configure Shop</button>

          <div className="relative">
            <button onClick={() => setShowExcelMenu(!showExcelMenu)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
              <FileSpreadsheet size={18} /> Bulk Tools <ChevronDown size={14} />
            </button>

            {showExcelMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <button onClick={handleDownloadTemplate} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 border-b">
                  <Download size={16} /> 1. Download Blank Template
                </button>
                <div className="relative">
                   <button className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 border-b">
                     <Upload size={16} /> 2. Upload Completed File
                   </button>
                   <input type="file" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleImportExcel} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <button onClick={handleExportInventory} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Archive size={16} /> 3. Export Current Inventory
                </button>
              </div>
            )}
            {showExcelMenu && <div className="fixed inset-0 z-40" onClick={() => setShowExcelMenu(false)}></div>}
          </div>

          <button onClick={openCreateModal} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"><Plus size={20} /> Add Product</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div onClick={() => setActiveStatModal('products')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all hover:border-blue-300">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Products</div>
          <div className="text-2xl font-bold text-blue-600 flex items-center gap-2"><Archive size={24}/> {totalProducts}</div>
        </div>
        <div onClick={() => setActiveStatModal('categories')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all hover:border-purple-300">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Categories</div>
          <div className="text-2xl font-bold text-purple-600 flex items-center gap-2"><LayoutGrid size={24}/> {totalCategories}</div>
        </div>
        <div onClick={() => setActiveStatModal('stock')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all hover:border-green-300">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Stock Level</div>
          <div className="text-2xl font-bold text-green-600 flex items-center gap-2"><Activity size={24}/> {totalStockOnHand}</div>
        </div>
        <div onClick={() => setActiveStatModal('expired')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all hover:border-orange-300">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Expired</div>
          <div className="text-2xl font-bold text-orange-600 flex items-center gap-2"><Calendar size={24}/> {totalExpiredItems}</div>
        </div>
        <div onClick={() => setActiveStatModal('damaged')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all hover:border-red-300">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Damaged</div>
          <div className="text-2xl font-bold text-red-600 flex items-center gap-2"><AlertOctagon size={24}/> {totalDamagedItems}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search by name, SKU, or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none" />
        </div>
      </div>

      {/* ✅ MASSIVE REDESIGNED PRODUCT LIST TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mb-8 min-h-[400px]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
            <List className="text-blue-600" size={24} />
            <h2 className="text-xl font-black text-gray-800">Product List</h2>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase font-black border-b border-gray-200 tracking-wider">
              <tr>
                <th className="px-6 py-5">Product Info</th>
                <th className="px-6 py-5">Categories</th>
                {config.fields.brand.visible && <th className="px-6 py-5">Brand</th>}
                <th className="px-6 py-5 text-right">Price</th>
                <th className="px-6 py-5 text-center">Stock</th>
                {config.features.expiryTracking && <th className="px-6 py-5 text-center text-orange-600">Expiry</th>}
                {config.features.damageTracking && <th className="px-6 py-5 text-center text-red-600">Damaged</th>}
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p) => {
                const status = getStockStatus(p);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-all group">
                    <td className="px-6 py-5">
                      <div className="font-black text-gray-900 text-lg">{p.name}</div>
                      <div className="text-xs text-gray-400 font-bold mt-1 tracking-wide">SKU: {p.sku || '-'}</div>
                    </td>
                    <td className="px-6 py-5"><div className="flex flex-wrap gap-1.5">{p.category ? p.category.split(',').map((cat, idx) => <span key={idx} className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-100">{cat.trim()}</span>) : <span className="text-xs font-bold text-gray-400">Uncategorized</span>}</div></td>
                    {config.fields.brand.visible && <td className="px-6 py-5 text-sm font-bold text-gray-600">{p.brand || '-'}</td>}
                    <td className="px-6 py-5 text-right font-black text-gray-900 text-lg">{currency}{p.price.toFixed(2)}</td>
                    <td className="px-6 py-5 text-center font-black text-blue-600 text-lg">{p.stock} <span className="text-sm text-blue-400">{p.unit}</span></td>
                    {config.features.expiryTracking && <td className="px-6 py-5 text-center text-sm font-bold">{p.stockExpiryDate ? <div className="flex items-center justify-center gap-1.5 text-orange-600"><Calendar size={16} /> <span>{new Date(p.stockExpiryDate).toLocaleDateString()}</span></div> : <span className="text-gray-400">-</span>}</td>}
                    {config.features.damageTracking && <td className="px-6 py-5 text-center font-black text-red-500 text-lg">{p.damagedQty || 0}</td>}
                    <td className="px-6 py-5 text-center"><span className={`px-3 py-1.5 rounded-lg text-xs font-black border ${status.color}`}>{status.label}</span></td>
                    <td className="px-6 py-5 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {config.features.damageTracking && <button onClick={() => { setSelectedProduct(p); setShowDamageModal(true); }} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><AlertTriangle size={18} /></button>}
                      <button onClick={() => openEditModal(p)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(p.id!)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                    </div></td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                 <tr><td colSpan={9} className="p-12 text-center text-gray-400 font-bold text-lg">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FolderTree size={20} className="text-purple-600" /> Category Management
            </h2>
            <div className="flex gap-2">
              {/* Added bg-transparent and dynamic text color so you can see what you type in dark mode */}
              <input
                type="text"
                placeholder="New Category"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-transparent text-[var(--text-color,#1f2937)]"
              />
              <button onClick={handleAddCategory} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold">
                {editingCatId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {categories.map(cat => (
              <div key={cat.id} className="group flex justify-between items-center border border-gray-100 hover:border-purple-300 p-3 rounded-lg cursor-pointer transition-colors">

                {/* 👇 FIX: Changed text-gray-700 to dynamic theme color and made it font-bold */}
                <span className="font-bold text-[var(--text-color,#1f2937)] text-sm">
                  {cat.name}
                </span>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  {/* Made the trash icon slightly bigger so it's easier to click */}
                  <button onClick={() => handleDeleteCategory(cat.id!)} className="text-red-500 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {(isBarcodeFeatureEnabled || config.features.serialTracking) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full">

            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Scan size={24} className="text-blue-600" /> Product Identifiers</h2>

              <div className="flex gap-3 items-center">
                  <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl shadow-sm">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Width:</span>
                      <input
                          type="number"
                          value={printCardSize}
                          onChange={(e) => setPrintCardSize(Number(e.target.value))}
                          className="w-16 text-sm bg-white border border-gray-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                      />
                      <span className="text-xs font-bold text-gray-500">px</span>
                  </div>

                  <select
                      value={printType}
                      onChange={(e) => setPrintType(e.target.value as 'barcode' | 'qr')}
                      className="text-sm bg-white border border-gray-200 px-4 py-2.5 rounded-xl outline-none font-bold text-gray-800 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                      <option value="barcode">Barcode</option>
                      <option value="qr">QR Code</option>
                  </select>

                  <button
                      onClick={selectAllBarcodes}
                      className="text-sm font-bold bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl shadow-sm transition-colors"
                  >
                      {selectedBarcodeIds.length === barcodeFilteredProducts.length ? 'Deselect All' : 'Select All'}
                  </button>

                  <button
                      onClick={handleBatchPrint}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95"
                  >
                      <Printer size={18} /> Print ({selectedBarcodeIds.length})
                  </button>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <input type="text" placeholder="Barcode Filter..." value={barcodeSearch} onChange={(e) => setBarcodeSearch(e.target.value)} className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              <select value={barcodeCategoryFilter} onChange={(e) => setBarcodeCategoryFilter(e.target.value)} className="text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"><option value="">All Categories</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden h-[300px] mt-4">
              <div className="w-1/2 border-r border-gray-100 pr-4 overflow-y-auto">
                {barcodeFilteredProducts.map(p => (
                    <div key={p.id} onClick={() => setViewingCode({ id: p.id!, type: viewingCode?.id === p.id && viewingCode?.type === 'qr' ? 'qr' : 'barcode', value: p.barcode, name: p.name })} className={`flex justify-between items-center p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors ${viewingCode?.id === p.id ? 'bg-blue-50 border-blue-100' : ''}`}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <button onClick={(e) => { e.stopPropagation(); toggleBarcodeSelection(p.id!); }}>{selectedBarcodeIds.includes(p.id!) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-gray-300" />}</button>
                        <div className="truncate text-sm font-bold text-gray-700">{p.name}</div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); setViewingCode({ id: p.id!, type: 'barcode', value: p.barcode, name: p.name }); }} className="p-1.5 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors"><Scan size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setViewingCode({ id: p.id!, type: 'qr', value: p.barcode, name: p.name }); }} className="p-1.5 hover:bg-purple-100 hover:text-purple-600 rounded-lg transition-colors"><QrCode size={16} /></button>
                      </div>
                    </div>
                ))}
              </div>
              <div className="w-1/2 flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                {viewingCode ? (
                  <div className="text-center w-full flex flex-col items-center justify-center">
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-4 flex flex-col items-center justify-center min-w-[250px]">

                      <div className="mb-2">
                          {viewingCode.type === 'barcode'
                            ? <Barcode value={getCleanBarcode(viewingCode.value)} width={2} height={60} fontSize={14} displayValue={true} />
                            : <QRCodeSVG value={getCleanBarcode(viewingCode.value)} size={120} level={"H"} includeMargin={false} />
                          }
                      </div>

                      <div className="mt-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{viewingCode.name}</div>
                    </div>
                    <button onClick={() => setShowSinglePrintModal(true)} className="w-full max-w-[250px] py-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm">
                        <Printer size={18} /> Print Single Label
                    </button>
                  </div>
                ) : (<div className="text-center text-gray-400 text-sm font-bold flex flex-col items-center gap-2"><Scan size={40} className="opacity-50" /> Select product to preview</div>)}
              </div>
            </div>
          </div>
        )}
      </div>

      {showSinglePrintModal && viewingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Printer className="text-blue-600" /> Confirm Size & Print</h2>
              <button onClick={() => setShowSinglePrintModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20}/></button>
            </div>

            <div className="p-8 flex flex-col items-center justify-center bg-gray-100/50">
                <div className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Preview (Scaled to {printCardSize}px)</div>

                <div
                    className="bg-white shadow-lg border border-gray-200 text-center flex flex-col items-center justify-center transition-all"
                    style={{ width: `${printCardSize}px`, padding: '15px', borderRadius: '8px' }}
                >
                    {(() => {
                        const dynamicParams = getDynamicPrintSizes(printCardSize);
                        return (
                            <>
                                <div style={{ fontSize: `${dynamicParams.fSize}px`, fontWeight: 'bold', marginBottom: '10px', color: '#111', wordWrap: 'break-word', width: '100%' }}>
                                    {viewingCode.name}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '10px' }}>
                                    {viewingCode.type === 'barcode'
                                        ? <Barcode value={getCleanBarcode(viewingCode.value)} width={dynamicParams.bWidth} height={dynamicParams.bHeight} fontSize={dynamicParams.fSize} displayValue={true} margin={0} />
                                        : <QRCodeSVG value={getCleanBarcode(viewingCode.value)} size={dynamicParams.qrSize} level={"H"} includeMargin={false} />
                                    }
                                </div>

                                <div style={{ fontSize: `${dynamicParams.fSize + 4}px`, fontWeight: 'black', color: '#000' }}>
                                    {currency}{products.find(p=>p.id===viewingCode.id)?.price.toFixed(2)}
                                </div>
                            </>
                        )
                    })()}
                </div>
            </div>

            <div className="px-6 py-4 bg-white border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowSinglePrintModal(false)} className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">Cancel</button>
              <button onClick={executeSinglePrint} className="flex-1 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95">
                <Printer size={20}/> Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {printQueue && (
        <div id="barcode-print-container">
            <style>{`
                @media screen {
                    #barcode-print-container { display: none; }
                }
                @media print {
                    html, body, #root, .flex, .overflow-hidden {
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                        background: white !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #barcode-print-container, #barcode-print-container * {
                        visibility: visible;
                    }
                    #barcode-print-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        display: flex !important;
                        flex-wrap: wrap !important;
                        justify-content: flex-start !important;
                        align-content: flex-start !important;
                        gap: 10px !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                    }
                }
            `}</style>

            {printQueue.map((item, idx) => {
                const dp = getDynamicPrintSizes(printCardSize);

                return (
                    <div key={idx} style={{
                        width: `${printCardSize}px`,
                        padding: '10px 5px',
                        textAlign: 'center',
                        breakInside: 'avoid',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontSize: `${dp.fSize}px`, fontWeight: 'bold', marginBottom: '8px', color: 'black', width: '100%', wordWrap: 'break-word', lineHeight: '1.2' }}>
                            {item.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
                            {printType === 'barcode' ? (
                                <Barcode value={getCleanBarcode(item.barcode)} width={dp.bWidth} height={dp.bHeight} fontSize={dp.fSize} displayValue={true} background="#ffffff" lineColor="#000000" margin={0} />
                            ) : (
                                <QRCodeSVG value={getCleanBarcode(item.barcode)} size={dp.qrSize} level={"H"} includeMargin={false} />
                            )}
                        </div>
                        <div style={{ fontSize: `${dp.fSize + 4}px`, fontWeight: 'bold', color: 'black', lineHeight: '1' }}>
                            {currency}{item.price.toFixed(2)}
                        </div>
                    </div>
                )
            })}
        </div>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Settings className="text-blue-600" /> Shop Configuration</h2><button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Business Type (Preset)</label>
                <select value={selectedPresetKey} onChange={(e) => setSelectedPresetKey(e.target.value as BusinessType)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  {['Computer_Shop', 'Grocery_Store', 'Pharmacy', 'Clothing_Store', 'Restaurant', 'Beauty_Salon', 'Hardware_Store', 'General_Retail'].map((key) => (<option key={key} value={key}>{key.replace('_', ' ')}</option>))}
                </select>
              </div>
              <div className="border-t border-gray-100 my-4"></div>
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Feature Overrides</h3>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><span className="text-sm font-medium text-gray-700">Batch Management & Expiry Tracking</span><input type="checkbox" checked={featureOverrides.expiryTracking ?? PRESETS[selectedPresetKey].features.expiryTracking} onChange={() => toggleFeatureOverride('expiryTracking')} className="w-5 h-5 text-blue-600 rounded" /></label>
                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><span className="text-sm font-medium text-gray-700">Damage Control System</span><input type="checkbox" checked={featureOverrides.damageTracking ?? PRESETS[selectedPresetKey].features.damageTracking} onChange={() => toggleFeatureOverride('damageTracking')} className="w-5 h-5 text-blue-600 rounded" /></label>
                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><span className="text-sm font-medium text-gray-700">Serial Number / IMEI Tracking</span><input type="checkbox" checked={featureOverrides.serialTracking ?? PRESETS[selectedPresetKey].features.serialTracking} onChange={() => toggleFeatureOverride('serialTracking')} className="w-5 h-5 text-blue-600 rounded" /></label>
                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><span className="text-sm font-medium text-gray-700">Barcode & QR Features</span><input type="checkbox" checked={featureOverrides.barcodeGeneration ?? false} onChange={() => toggleFeatureOverride('barcodeGeneration')} className="w-5 h-5 text-blue-600 rounded" /></label>
                </div>
              </div>
              <button onClick={handleSaveConfig} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md mt-4">Save & Apply Changes</button>
            </div>
          </div>
        </div>
      )}

      {showDamageModal && selectedProduct && config.features.damageTracking && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
                 <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle /> Report Damage</h2>
                 <p className="text-gray-600 text-sm mb-4">Isolating damaged stock for <strong>{selectedProduct.name}</strong>.</p>
                 <div className="space-y-4">
                   <div><label className="text-xs font-bold text-gray-500 uppercase">Quantity</label><input type="number" value={damageQty} onChange={e => setDamageQty(parseInt(e.target.value))} className="w-full border border-gray-300 p-2 rounded mt-1 outline-none focus:ring-2 focus:ring-red-500" /></div>
                   <div><label className="text-xs font-bold text-gray-500 uppercase">Reason / Note</label><textarea value={damageNote} onChange={e => setDamageNote(e.target.value)} className="w-full border border-gray-300 p-2 rounded mt-1 outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. Broken during shipping" /></div>
                   <div className="flex gap-2 pt-2">
                       <button onClick={handleConfirmDamage} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors">Confirm</button>
                       <button onClick={() => setShowDamageModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 rounded-lg transition-colors">Cancel</button>
                   </div>
                 </div>
             </div>
         </div>
      )}

      {activeStatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 capitalize flex items-center gap-2">
                {activeStatModal === 'products' && <><Archive className="text-blue-600"/> Total Products</>}
                {activeStatModal === 'categories' && <><LayoutGrid className="text-purple-600"/> Categories List</>}
                {activeStatModal === 'stock' && <><Activity className="text-green-600"/> Current Stock Levels</>}
                {activeStatModal === 'expired' && <><Calendar className="text-orange-600"/> Expired Items Report</>}
                {activeStatModal === 'damaged' && <><AlertOctagon className="text-red-600"/> Damaged Items Report</>}
              </h2>
              <button onClick={() => setActiveStatModal(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase sticky top-0 shadow-sm">
                    <tr>
                      {activeStatModal === 'products' && <><th className="p-4">Name</th><th className="p-4">Category</th><th className="p-4 text-right">Price</th><th className="p-4 text-center">Status</th></>}
                      {activeStatModal === 'categories' && <><th className="p-4">Category Name</th><th className="p-4 text-right">Items Count</th></>}
                      {activeStatModal === 'stock' && <><th className="p-4">Product Name</th><th className="p-4 text-right">Available Qty</th></>}
                      {activeStatModal === 'expired' && <><th className="p-4">Product Name</th><th className="p-4">Batch Number</th><th className="p-4 text-center">Expiry Date</th><th className="p-4 text-right">Expired Qty</th></>}
                      {activeStatModal === 'damaged' && <><th className="p-4">Product Name</th><th className="p-4">Date/Time</th><th className="p-4">Reason / Note</th><th className="p-4 text-right">Damaged Qty</th></>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {activeStatModal === 'products' && products.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{p.name}</td>
                        <td className="p-4 text-gray-500">{p.category || '-'}</td>
                        <td className="p-4 text-right font-mono">{currency}{p.price}</td>
                        <td className="p-4 text-center">{p.isActive ? <span className="text-green-600 text-xs font-bold px-2 py-1 bg-green-50 rounded">Active</span> : <span className="text-gray-400 text-xs">Inactive</span>}</td>
                      </tr>
                    ))}

                    {activeStatModal === 'categories' && categories.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="p-4 font-bold text-gray-700">{c.name}</td>
                        <td className="p-4 text-right text-gray-500">{products.filter(p => p.category?.includes(c.name)).length} items</td>
                      </tr>
                    ))}

                    {activeStatModal === 'stock' && products.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{p.name}</td>
                        <td className={`p-4 text-right font-bold ${p.stock <= (p.reorderLevel || 0) ? 'text-red-600' : 'text-green-600'}`}>{p.stock} {p.unit}</td>
                      </tr>
                    ))}

                    {activeStatModal === 'expired' && expiredBatchesList.length > 0 ? expiredBatchesList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-orange-50">
                        <td className="p-4 font-medium">{item.productName}</td>
                        <td className="p-4 font-mono text-gray-500">{item.batchNumber}</td>
                        <td className="p-4 text-center text-red-600 font-bold">{new Date(item.expiryDate!).toLocaleDateString()}</td>
                        <td className="p-4 text-right font-bold">{item.quantity}</td>
                      </tr>
                    )) : activeStatModal === 'expired' && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No expired items found.</td></tr>}

                    {activeStatModal === 'damaged' && damageLogs.length > 0 ? damageLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-red-50">
                          <td className="p-4 font-medium">{log.name}</td>
                          <td className="p-4 text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-4 text-gray-600 italic">{log.reason || "No reason provided"}</td>
                          <td className="p-4 text-right font-bold text-red-600">{log.qty}</td>
                        </tr>
                    )) : activeStatModal === 'damaged' && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No damage logs found.</td></tr>}

                  </tbody>
               </table>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-right">
              <button onClick={() => setActiveStatModal(null)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">{editingId ? 'Edit Product' : 'New Product'}</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20} /></button></div>
            <div className="flex border-b border-gray-200 px-6 bg-white">
                {[{id: 'basic', label: 'Basic Info', icon: Tag}, {id: 'pricing', label: 'Pricing & Tax', icon: Box}, {id: 'inventory', label: 'Inventory & Stock', icon: Layers}, {id: 'supplier', label: 'Supplier Info', icon: Building2}, {id: 'settings', label: 'Rules & Settings', icon: Settings}].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon size={16} /> {tab.label}</button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <form onSubmit={handleSave} className="space-y-8">
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Product Name *</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>

                      {config.fields.sku.visible && <div><label className="block text-xs font-bold text-gray-500 mb-1">SKU</label><div className="flex gap-2"><input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full p-3 border rounded-lg outline-none font-mono text-sm" placeholder="AUTO-001" /><button type="button" onClick={handleAutoGenerateIdentifiers} className="px-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-600 transition-colors"><RefreshCw size={18}/></button></div></div>}

                      {config.fields.barcode.visible && (<div><label className="block text-xs font-bold text-gray-500 mb-1">Barcode/QR</label><div className="flex gap-2"><input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full p-3 border rounded-lg outline-none font-mono text-sm" placeholder="Scan or enter code..." /></div></div>)}
                      {config.features.serialTracking && config.fields.serialNumber.visible && <div className="col-span-2"><label className="block text-xs font-bold text-purple-600 uppercase mb-1">Serial Number / IMEI</label><input type="text" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="w-full p-3 border border-purple-200 bg-purple-50 text-purple-900 rounded-lg outline-none font-mono text-sm" /></div>}

                      <div className="col-span-2 relative">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Categories</label>
                        <div className="w-full p-3 border rounded-lg bg-white flex justify-between cursor-pointer" onClick={() => setShowCatDropdown(!showCatDropdown)}>
                            <span className="text-sm">{formData.category || "Select Categories..."}</span>
                            <ChevronDown size={16} />
                        </div>
                        {showCatDropdown && (
                            <div className="absolute z-20 mt-1 bg-white border rounded-xl shadow-xl p-2 max-h-48 overflow-y-auto w-full">
                                {categories.map(cat => (
                                    <div key={cat.id} onClick={() => toggleCategorySelection(cat.name)} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                        <input type="checkbox" checked={formData.category?.includes(cat.name)} readOnly className="cursor-pointer" />
                                        <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                                    </div>
                                ))}
                                {categories.length === 0 && <div className="p-2 text-xs text-gray-400">No categories found. Add one below.</div>}
                            </div>
                        )}
                        {showCatDropdown && <div className="fixed inset-0 z-10" onClick={() => setShowCatDropdown(false)}></div>}
                      </div>

                      {config.fields.brand.visible && <div><label className="block text-xs font-bold text-gray-500 mb-1">Brand</label><input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full p-3 border rounded-lg" /></div>}
                      <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Product Type</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full p-3 border rounded-lg bg-white outline-none"><option value="Stock">Stock Item</option><option value="Non-Stock">Non-Stock Item</option><option value="Service">Service</option></select></div>
                  </div>
                )}
                {activeTab === 'pricing' && (
                  <div className="grid grid-cols-2 gap-6">
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">Selling Price *</label><input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>

                      <div><label className="block text-xs font-bold text-orange-500 mb-1">Auto-Discount (%)</label><input type="number" value={formData.discount || 0} onChange={e => setFormData({...formData, discount: parseFloat(e.target.value)})} className="w-full p-3 border border-orange-200 bg-orange-50 rounded-lg text-orange-800 font-bold outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. 10" /></div>

                      <div><label className="block text-xs font-bold text-gray-500 mb-1">Cost Price</label><input type="number" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">Wholesale Price</label><input type="number" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">Min. Selling Price</label><input type="number" value={formData.minSellingPrice} onChange={e => setFormData({...formData, minSellingPrice: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                      <div className="col-span-2 p-4 border border-gray-200 rounded-xl bg-transparent"><h3 className="font-bold text-gray-700 text-sm mb-3">Tax & Discounts</h3><div className="flex items-center gap-6"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isTaxIncluded} onChange={e => setFormData({...formData, isTaxIncluded: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" /><span className="text-sm text-gray-700">Tax Included</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.allowDiscount} onChange={e => setFormData({...formData, allowDiscount: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" /><span className="text-sm text-gray-700">Allow Discounts</span></label></div></div>
                  </div>
                )}
                {activeTab === 'inventory' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Total Stock</label><input type="number" value={formData.stock} readOnly={config.features.expiryTracking} onChange={e => setFormData({...formData, stock: parseFloat(e.target.value)})} className={`w-full p-3 border rounded-lg font-bold text-lg ${config.features.expiryTracking ? 'bg-gray-100 cursor-not-allowed' : 'text-blue-600'}`} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Unit</label><input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-3 border rounded-lg" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Reorder Level</label><input type="number" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Max Stock Level</label><input type="number" value={formData.maxStockLevel} onChange={e => setFormData({...formData, maxStockLevel: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                    </div>
                    {config.features.expiryTracking && (<div className="border border-orange-200 rounded-xl p-4 bg-orange-50/50"><h3 className="text-sm font-bold text-orange-700 flex items-center gap-2 mb-3"><PackagePlus size={16}/> Batch Management (Expiry Tracking)</h3><div className="grid grid-cols-4 gap-2 mb-4 items-end"><div><label className="text-[10px] uppercase font-bold text-gray-500">Batch #</label><input type="text" value={newBatch.batchNumber} onChange={e => setNewBatch({...newBatch, batchNumber: e.target.value})} className="w-full p-2 border rounded text-sm bg-white" placeholder="Auto" /></div><div><label className="text-[10px] uppercase font-bold text-gray-500">Quantity</label><input type="number" value={newBatch.quantity} onChange={e => setNewBatch({...newBatch, quantity: parseFloat(e.target.value)})} className="w-full p-2 border rounded text-sm bg-white" /></div><div><label className="text-[10px] uppercase font-bold text-gray-500">Expiry</label><input type="datetime-local" value={newBatch.expiryDate} onChange={e => setNewBatch({...newBatch, expiryDate: e.target.value})} className="w-full p-2 border rounded text-sm bg-white" /></div>{editingBatchId ? (<div className="flex gap-1"><button type="button" onClick={handleSaveBatch} className="bg-green-600 text-white p-2 rounded text-xs font-bold flex-1">Update</button><button type="button" onClick={cancelEditBatch} className="bg-gray-400 text-white p-2 rounded text-xs font-bold hover:bg-gray-500"><X size={14}/></button></div>) : (<button type="button" onClick={handleSaveBatch} className="bg-orange-600 text-white p-2 rounded text-sm font-bold h-[38px]">Add Batch</button>)}</div><div className="bg-white border border-gray-200 rounded-lg overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="p-2">Batch</th><th className="p-2">Qty</th><th className="p-2">Expiry</th><th className="p-2 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{formData.batches?.map(b => (<tr key={b.id} className={editingBatchId === b.id ? 'bg-orange-50' : ''}><td className="p-2 font-mono text-gray-600">{b.batchNumber}</td><td className="p-2 font-bold">{b.quantity}</td><td className={`p-2 ${new Date(b.expiryDate!) < new Date() ? 'text-red-600 font-bold' : 'text-gray-600'}`}>{b.expiryDate ? new Date(b.expiryDate).toLocaleString() : '-'} {new Date(b.expiryDate!) < new Date() && '(Exp)'}</td><td className="p-2 text-right"><button type="button" onClick={() => startEditBatch(b)} className="text-blue-500 mr-2"><Edit size={14}/></button><button type="button" onClick={() => removeBatch(b.id)} className="text-red-500"><Trash2 size={14}/></button></td></tr>)) }{(!formData.batches || formData.batches.length === 0) && <tr><td colSpan={4} className="p-4 text-center text-gray-400 text-xs">No batches added. Stock is 0.</td></tr>}</tbody></table></div></div>)}
                  </div>
                )}

                {activeTab === 'supplier' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Building2 size={18} className="text-blue-600"/> Supplier Link</h4>

                        <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Select Origin Supplier</label>
                              <select
                                value={formData.supplierId || ''}
                                onChange={e => setFormData({...formData, supplierId: e.target.value ? parseInt(e.target.value) : undefined})}
                                className="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer"
                              >
                                <option value="">-- No Supplier Linked --</option>
                                {suppliersList.map(s => (
                                  <option key={s.id} value={s.id}>{s.name} {s.companyName ? `(${s.companyName})` : ''}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Internal Supplier Note / Receiving Info</label>
                              <textarea
                                value={formData.supplierNote || ''}
                                onChange={e => setFormData({...formData, supplierNote: e.target.value})}
                                className="w-full p-3 border border-gray-200 rounded-xl h-32 bg-white text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none"
                                placeholder="Add private notes about delivery condition, minimum order quantities (MOQ), or return policies for this specific item..."
                              />
                            </div>
                        </div>
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between"><div className="flex items-center gap-3">{formData.isActive ? <CheckCircle className="text-green-600"/> : <Ban className="text-red-600"/>}<div><h4 className="font-bold text-gray-700">{formData.isActive ? 'Product is Active' : 'Product is Inactive'}</h4><p className="text-xs text-gray-500">Inactive products hidden.</p></div></div><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 text-blue-600" /></div>
                    <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between"><div><h4 className="font-bold text-gray-700">Allow Negative Stock</h4><p className="text-xs text-gray-500">Sell even if stock is 0.</p></div><input type="checkbox" checked={formData.allowNegativeStock} onChange={e => setFormData({...formData, allowNegativeStock: e.target.checked})} className="w-5 h-5 text-blue-600" /></div>
                  </div>
                )}
              </form>
            </div>
            <div className="px-8 py-5 bg-white border-t border-gray-200 flex justify-end gap-3"><button onClick={() => setShowModal(false)} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Cancel</button><button onClick={handleSave} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg"><Save size={20}/> Save Product</button></div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryScreen;