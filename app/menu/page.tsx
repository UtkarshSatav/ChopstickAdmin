"use client";

import { useState, useEffect, useRef } from "react";
import { subscribeToMenu, saveMenu } from "@/lib/menu";
import { FaPlus, FaTrash, FaSave, FaEdit, FaUtensils, FaArrowUp, FaArrowDown, FaCloudUploadAlt, FaImage } from "react-icons/fa";
import AdminNavbar from "@/components/AdminNavbar";
import StoreStatusToggle from "@/components/StoreStatusToggle";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Represents the structure of the Menu JSON
interface MenuItem {
    name: string;
    price?: number | null;
    half?: number | null;
    full?: number | null;
    type?: string;
    image?: string;
}

interface MenuCategory {
    category: string;
    cuisine: string;
    type: string;
    section: string;
    items: MenuItem[];
}

interface RestaurantInfo {
    name: string;
    address: string;
    timings: string;
    notes: string[];
}

interface MenuData {
    restaurant: RestaurantInfo;
    menu: MenuCategory[];
}

export default function AdminMenuPage() {
    const [data, setData] = useState<MenuData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null);
    const [editingItemInfo, setEditingItemInfo] = useState<{ catIdx: number, itemIdx: number } | null>(null);
    const [uploading, setUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal States
    const [categoryModal, setCategoryModal] = useState<MenuCategory | null>(null);
    const [itemModal, setItemModal] = useState<MenuItem | null>(null);

    useEffect(() => {
        const unsub = subscribeToMenu((menu) => {
            if (menu) {
                setData(menu as MenuData);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSavePrimary = async () => {
        if (!data) return;
        setSaving(true);
        try {
            await saveMenu(data);
            alert("Menu saved successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to save menu");
        }
        setSaving(false);
    };

    const openCreateCategory = () => {
        setEditingCategoryIdx(null);
        setCategoryModal({
            category: "",
            cuisine: "Indian",
            type: "Vegetarian",
            section: "Main Course",
            items: []
        });
    };

    const openEditCategory = (idx: number) => {
        if (!data) return;
        setEditingCategoryIdx(idx);
        // Deep copy safely
        setCategoryModal(JSON.parse(JSON.stringify(data.menu[idx])));
    };

    const saveCategoryModal = () => {
        if (!data || !categoryModal) return;
        const newData = { ...data };
        if (editingCategoryIdx !== null) {
            newData.menu[editingCategoryIdx] = categoryModal;
        } else {
            newData.menu.unshift(categoryModal);
        }
        setData(newData);
        setCategoryModal(null);
    };

    const deleteCategory = (idx: number) => {
        if (!data) return;
        if (!confirm("Are you sure you want to delete an entire category?")) return;
        const newData = { ...data };
        newData.menu.splice(idx, 1);
        setData(newData);
    };

    const openCreateItem = (catIdx: number) => {
        setEditingItemInfo({ catIdx, itemIdx: -1 });
        setItemModal({
            name: "",
            price: 0,
            half: null,
            full: null
        });
    };

    const openEditItem = (catIdx: number, itemIdx: number) => {
        if (!data) return;
        setEditingItemInfo({ catIdx, itemIdx });
        setItemModal(JSON.parse(JSON.stringify(data.menu[catIdx].items[itemIdx])));
    };

    const handleImageUpload = async (file: File) => {
        if (!file || !itemModal) return;
        setUploading(true);
        console.log("Starting upload for:", file.name, "to bucket:", storage.app.options.storageBucket);
        try {
            const storageRef = ref(storage, `menu-items/${Date.now()}-${file.name}`);
            const uploadResult = await uploadBytes(storageRef, file);
            console.log("Upload successful:", uploadResult);
            const url = await getDownloadURL(storageRef);
            setItemModal({ ...itemModal, image: url });
        } catch (error: any) {
            console.error("Firebase Storage Upload Error:", error);
            alert(`Image upload failed: ${error?.message || "Unknown error"}. Check console for details.`);
        } finally {
            setUploading(false);
        }
    };

    const saveItemModal = () => {
        if (!data || !itemModal || !editingItemInfo) return;
        const newData = { ...data };
        const cat = newData.menu[editingItemInfo.catIdx];
        if (editingItemInfo.itemIdx >= 0) {
            cat.items[editingItemInfo.itemIdx] = itemModal;
        } else {
            cat.items.push(itemModal);
        }
        setData(newData);
        setItemModal(null);
    };

    const deleteItem = (catIdx: number, itemIdx: number) => {
        if (!data) return;
        if (!confirm("Delete this item?")) return;
        const newData = { ...data };
        newData.menu[catIdx].items.splice(itemIdx, 1);
        setData(newData);
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p>Loading menu editor...</p>
            </main>
        );
    }

    if (!data) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
                <p>No menu data found in database.</p>
                <p className="text-sm text-gray-400">Please make sure the frontend or admin initialized it.</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FaUtensils className="text-red-600 text-xl" />
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Chopstick Admin</h1>
                            <p className="text-xs text-gray-500">Live Menu Editor</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <StoreStatusToggle />
                        <button
                            onClick={handleSavePrimary}
                            disabled={saving}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg flex gap-2 items-center cursor-pointer transition-colors disabled:opacity-50"
                        >
                            <FaSave /> {saving ? "Saving..." : "Save to Live Database"}
                        </button>
                    </div>
                </div>
            </header>

            <AdminNavbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Menu Categories</h2>
                        <p className="text-sm text-gray-500">Add, reorder, or update sections like "Starters", "Chinese" etc.</p>
                    </div>
                    <button
                        onClick={openCreateCategory}
                        className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                    >
                        <FaPlus /> Add Category
                    </button>
                </div>

                <div className="space-y-6">
                    {data.menu.map((category, catIdx) => (
                        <div key={catIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{category.category}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-medium">{category.cuisine}</span>
                                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-medium">{category.type}</span>
                                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-medium">{category.section}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditCategory(catIdx)}
                                        className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600 cursor-pointer"
                                    >
                                        <FaEdit />
                                    </button>
                                    <button
                                        onClick={() => deleteCategory(catIdx)}
                                        className="p-2 bg-white border border-red-200 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>

                            <div className="p-0">
                                {category.items.map((item, itemIdx) => (
                                    <div key={itemIdx} className="px-6 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            {item.image && (
                                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900">{item.name}</p>
                                                <p className="text-sm text-gray-500 font-bold">
                                                    {item.price ? `₹${item.price}` : ""}
                                                    {item.half ? `Half: ₹${item.half} ` : ""}
                                                    {item.full ? `Full: ₹${item.full}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditItem(catIdx, itemIdx)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => deleteItem(catIdx, itemIdx)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="px-6 py-3 bg-gray-50/50">
                                    <button
                                        onClick={() => openCreateItem(catIdx)}
                                        className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                    >
                                        <FaPlus size={10} /> Add Item to {category.category}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals for Category and Item editing */}
            {categoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                        <h2 className="text-xl font-bold mb-4">{editingCategoryIdx !== null ? "Edit Category" : "Add Category"}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Display Name (e.g. "Main Course Non-Veg")</label>
                                <input
                                    type="text"
                                    value={categoryModal.category}
                                    onChange={e => setCategoryModal({ ...categoryModal, category: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Cuisine (e.g. "Indian")</label>
                                    <input
                                        type="text"
                                        value={categoryModal.cuisine}
                                        onChange={e => setCategoryModal({ ...categoryModal, cuisine: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Type (Veg/Non-Vegetarian)</label>
                                    <input
                                        type="text"
                                        value={categoryModal.type}
                                        onChange={e => setCategoryModal({ ...categoryModal, type: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setCategoryModal(null)} className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">Cancel</button>
                            <button onClick={saveCategoryModal} className="px-4 py-2 font-bold text-white bg-gray-900 hover:bg-black rounded-lg cursor-pointer transition-colors">Done</button>
                        </div>
                    </div>
                </div>
            )}

            {itemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden flex flex-col max-h-[90vh]">
                        <h2 className="text-xl font-bold mb-4">
                            {editingItemInfo && editingItemInfo.itemIdx >= 0 ? "Edit Item" : "Add Item"}
                        </h2>
                        <div className="space-y-4 overflow-y-auto no-scrollbar pr-1 flex-1">
                            {/* Image Upload Area */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Item Image</label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const file = e.dataTransfer.files?.[0];
                                        if (file) handleImageUpload(file);
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${itemModal.image ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"}`}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(file);
                                        }}
                                        className="hidden"
                                        accept="image/*"
                                    />

                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent animate-spin rounded-full"></div>
                                            <p className="text-xs text-blue-600 font-bold">Uploading...</p>
                                        </div>
                                    ) : itemModal.image ? (
                                        <div className="relative group">
                                            <img src={itemModal.image} className="w-24 h-24 object-cover rounded-lg shadow-sm" alt="Preview" />
                                            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <FaCloudUploadAlt className="text-white text-xl" />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-3 bg-white rounded-full shadow-sm">
                                                <FaImage className="text-gray-400 text-xl" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-gray-700">Drag & drop or click</p>
                                                <p className="text-[10px] text-gray-400">JPG, PNG or WEBP (Max 5MB)</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Item Name</label>
                                <input
                                    type="text"
                                    value={itemModal.name}
                                    onChange={e => setItemModal({ ...itemModal, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Flat Price (₹)</label>
                                <input
                                    type="number"
                                    value={itemModal.price || ""}
                                    onChange={e => setItemModal({ ...itemModal, price: e.target.value ? Number(e.target.value) : null })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 pb-2">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Half Price (₹)</label>
                                    <input
                                        type="number"
                                        value={itemModal.half || ""}
                                        onChange={e => setItemModal({ ...itemModal, half: e.target.value ? Number(e.target.value) : null })}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Price (₹)</label>
                                    <input
                                        type="number"
                                        value={itemModal.full || ""}
                                        onChange={e => setItemModal({ ...itemModal, full: e.target.value ? Number(e.target.value) : null })}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button onClick={() => setItemModal(null)} className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">Cancel</button>
                            <button onClick={saveItemModal} className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
