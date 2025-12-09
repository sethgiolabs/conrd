import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Modal } from './components/Modal';
import { Login } from './components/Login';
import { Product, ViewState, Worker, AppUser, UserRole, Movement } from './types';
import { useInventory } from './context/InventoryContext';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

// Protected Route Component
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { currentUser, loading } = useInventory();
  
  if (loading) {
     return <div className="h-screen w-full flex items-center justify-center bg-[#f4f6f9] text-gray-500">
       <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Cargando sistema...
     </div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Main Dashboard Component
const Dashboard = () => {
  const { 
    products, 
    workers, 
    movements, 
    appUsers,
    userData,
    currentUser,
    addItem, 
    updateItem, 
    deleteItem, 
    addWorker, 
    updateWorker, 
    deleteWorker,
    addTransaction,
    addSystemUser,
    updateAppUser,
    deleteAppUser,
    getHistoryByDate,
    clearHistory
  } = useInventory();

  // If user is not Admin, they cannot see 'USERS' view. Default to 'SUMMARY'.
  const [activeView, setActiveView] = useState<ViewState>('SUMMARY');
  
  const [modals, setModals] = useState({
    addProduct: false,
    editProduct: false,
    deleteProduct: false,
    addWorker: false,
    editWorker: false,
    deleteWorker: false,
    registerEntry: false,
    registerExit: false,
    history: false,
    addUser: false,
    editUser: false,
    deleteUser: false,
    manageCategories: false,
    viewMovement: false,
    clearHistoryConfirm: false
  });
  
  const [historyTypeToClear, setHistoryTypeToClear] = useState<'IN' | 'OUT' | null>(null);

  // Ensure non-authorized users are redirected from USERS view
  useEffect(() => {
    // Only Admin and Editor can see Users view
    if (activeView === 'USERS' && userData?.role !== 'Admin' && userData?.role !== 'Editor') {
      setActiveView('SUMMARY');
    }
  }, [activeView, userData]);

  // --- FORM STATES ---
  const [newProduct, setNewProduct] = useState({
    sku: '', nombre: '', descripcion: '', categoria: 'EPP', unidad: 'pza', ubicacion: '', stock_actual: '', stock_minimo: ''
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  const [newWorker, setNewWorker] = useState({ name: '', role: '', status: 'Active' as const, employeeId: '' });
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Empleado' as UserRole, status: 'Active' as const });
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  
  // Movement Details State
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  // Category Management
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [entryData, setEntryData] = useState({ productId: '', quantity: '', date: new Date().toISOString().split('T')[0], worker: '', comments: '' });
  const [exitData, setExitData] = useState({ productId: '', quantity: '', worker: '', date: new Date().toISOString().split('T')[0], reason: '' });
  
  // History Modal Logic
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyDateFilters, setHistoryDateFilters] = useState({ 
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [historyData, setHistoryData] = useState<Movement[]>([]);
  const [lastHistoryDoc, setLastHistoryDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Worker View States
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerRoleFilter, setWorkerRoleFilter] = useState('');
  const [workerPage, setWorkerPage] = useState(1);
  const workersPerPage = 5;

  // Inventory View States
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('');
  const [inventoryPage, setInventoryPage] = useState(1);
  const inventoryItemsPerPage = 6;
  
  // Dashboard Date Filter
  const [dateFilters, setDateFilters] = useState({ start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });

  const units = [{ value: 'pza', label: 'Pieza (pza)' }, { value: 'kg', label: 'Kilogramo (kg)' }, { value: 'm', label: 'Metro (m)' }, { value: 'm2', label: 'Metro Cuadrado (m²)' }, { value: 'm3', label: 'Metro Cúbico (m³)' }, { value: 'lt', label: 'Litro (lt)' }, { value: 'gal', label: 'Galón (gal)' }, { value: 'caja', label: 'Caja' }, { value: 'paq', label: 'Paquete (paq)' }, { value: 'rollo', label: 'Rollo' }, { value: 'par', label: 'Par' }, { value: 'jgo', label: 'Juego' }, { value: 'saco', label: 'Saco' }, { value: 'kit', label: 'Kit' }, { value: 'ton', label: 'Tonelada (ton)' }];
  
  // Default categories list combined with dynamic ones
  const defaultCategories = ['EPP', 'Material', 'Herramienta', 'Insumo'];
  const getCategoriesList = () => {
    const dynamic = Array.from(new Set(products.map(p => p.categoria))).filter(Boolean);
    return Array.from(new Set([...defaultCategories, ...dynamic, ...extraCategories]));
  };

  // --- HANDLERS ---
  const closeAllModals = () => {
    setModals({ 
      addProduct: false, editProduct: false, deleteProduct: false, 
      addWorker: false, editWorker: false, deleteWorker: false,
      registerEntry: false, registerExit: false, 
      history: false, addUser: false, editUser: false, deleteUser: false,
      manageCategories: false, viewMovement: false,
      clearHistoryConfirm: false
    });
    setEntryData({ productId: '', quantity: '', date: new Date().toISOString().split('T')[0], worker: '', comments: '' });
    setExitData({ productId: '', quantity: '', worker: '', date: new Date().toISOString().split('T')[0], reason: '' });
    setNewWorker({ name: '', role: '', status: 'Active', employeeId: '' });
    setNewUser({ name: '', email: '', password: '', role: 'Empleado', status: 'Active' });
    setEditingProduct(null); setProductToDelete(null); setEditingWorker(null); setWorkerToDelete(null); setHistoryProduct(null); setEditingUser(null); setUserToDelete(null);
    setHistoryData([]); setLastHistoryDoc(null); setHistoryError(null); // Reset history
    setSelectedMovement(null); // Reset selected movement
    setHistoryTypeToClear(null);
  };
  
  const openAddProduct = () => setModals({ ...modals, addProduct: true });
  const openManageCategories = () => setModals({ ...modals, manageCategories: true });
  const openAddWorker = () => setModals({ ...modals, addWorker: true });
  const openAddUser = () => setModals({ ...modals, addUser: true });
  const openEntry = () => setModals({ ...modals, registerEntry: true });
  const openExit = () => setModals({ ...modals, registerExit: true });
  
  const handleEditClick = (product: Product) => { setEditingProduct(product); setModals({ ...modals, editProduct: true }); };
  
  const handleViewHistory = async (product: Product) => { 
    setHistoryProduct(product);
    setModals({ ...modals, history: true }); 
    await loadHistory(product.id, true);
  };

  const handleViewMovement = (movement: Movement) => {
    setSelectedMovement(movement);
    setModals({ ...modals, viewMovement: true });
  };

  const loadHistory = async (productId: string, reset: boolean = false) => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const result = await getHistoryByDate(
        productId,
        historyDateFilters.start,
        historyDateFilters.end,
        reset ? null : lastHistoryDoc
      );

      if (reset) {
        setHistoryData(result.data);
      } else {
        setHistoryData(prev => [...prev, ...result.data]);
      }
      
      setLastHistoryDoc(result.lastVisible);
      setHasMoreHistory(result.data.length === 20); 
    } catch (error: any) {
      console.error("Error loading history:", error);
      // Check for Firestore Index Error
      if (error.code === 'failed-precondition' || (error.message && error.message.includes("index"))) {
         setHistoryError("INDEX_REQUIRED");
      } else {
         setHistoryError("Error al cargar el historial. Intente nuevamente.");
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleHistoryDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const newFilters = { ...historyDateFilters, [e.target.name]: e.target.value };
     setHistoryDateFilters(newFilters);
  };

  useEffect(() => {
    if (modals.history && historyProduct) {
      loadHistory(historyProduct.id, true);
    }
  }, [historyDateFilters, historyProduct, modals.history]);

  const handleDeleteClick = (product: Product) => { setProductToDelete(product); setModals({ ...modals, deleteProduct: true }); };
  
  const handleEditWorkerClick = (worker: Worker) => { setEditingWorker(worker); setModals({ ...modals, editWorker: true }); };
  const handleDeleteWorkerClick = (worker: Worker) => { setWorkerToDelete(worker); setModals({ ...modals, deleteWorker: true }); };

  const handleEditUserClick = (user: AppUser) => { setEditingUser(user); setModals({ ...modals, editUser: true }); };
  const handleDeleteUserClick = (user: AppUser) => { setUserToDelete(user); setModals({ ...modals, deleteUser: true }); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => editingProduct && setEditingProduct({ ...editingProduct, [e.target.name]: e.target.value });
  const handleWorkerInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setNewWorker({ ...newWorker, [e.target.name]: e.target.value });
  const handleEditWorkerInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => editingWorker && setEditingWorker({ ...editingWorker, [e.target.name]: e.target.value } as Worker);
  const handleEntryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setEntryData({ ...entryData, [e.target.name]: e.target.value });
  const handleExitChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setExitData({ ...exitData, [e.target.name]: e.target.value });
  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setNewUser({ ...newUser, [e.target.name]: e.target.value });
  const handleEditUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => editingUser && setEditingUser({ ...editingUser, [e.target.name]: e.target.value } as any);

  // CRUD Logic
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addItem({ ...newProduct, stock_actual: Number(newProduct.stock_actual), stock_minimo: Number(newProduct.stock_minimo) });
      alert("Producto guardado exitosamente"); closeAllModals(); setNewProduct({ sku: '', nombre: '', descripcion: '', categoria: 'EPP', unidad: 'pza', ubicacion: '', stock_actual: '', stock_minimo: '' });
    } catch (e) { alert("Error al guardar"); }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try { await updateItem(editingProduct.id, { ...editingProduct, stock_actual: Number(editingProduct.stock_actual), stock_minimo: Number(editingProduct.stock_minimo) }); alert("Actualizado"); closeAllModals(); } catch (e) { alert("Error"); }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try { await deleteItem(productToDelete.id); alert("Eliminado"); closeAllModals(); } catch (e) { alert("Error"); }
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try { 
      await addWorker({
        name: newWorker.name,
        role: newWorker.role,
        status: newWorker.status,
        employeeId: newWorker.employeeId,
        lastActive: new Date().toISOString()
      }); 
      alert("Guardado"); 
      closeAllModals(); 
    } catch (e) { alert("Error"); }
  };

  const handleUpdateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker) return;
    try { await updateWorker(editingWorker.id, editingWorker); alert("Actualizado"); closeAllModals(); } catch (e) { alert("Error"); }
  };

  const handleConfirmDeleteWorker = async () => {
    if (!workerToDelete) return;
    try { await deleteWorker(workerToDelete.id); alert("Trabajador eliminado"); closeAllModals(); } catch (e) { alert("Error al eliminar trabajador"); }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.password || newUser.password.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres");
        return;
    }
    try {
      await addSystemUser(newUser, newUser.password);
      alert("Usuario creado exitosamente");
      closeAllModals();
    } catch (e: any) { 
        console.error(e);
        if (e.code === 'auth/email-already-in-use') {
            alert("El correo ya está registrado");
        } else {
            alert("Error al añadir usuario: " + e.message); 
        }
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try { await updateAppUser(editingUser.id, editingUser); alert("Usuario actualizado"); closeAllModals(); } catch (e) { alert("Error"); }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try { await deleteAppUser(userToDelete.id); alert("Usuario eliminado"); closeAllModals(); } catch (e) { alert("Error"); }
  };

  const handleRegisterEntry = async () => {
    if (!entryData.productId || !entryData.quantity || Number(entryData.quantity) <= 0) return alert("Datos inválidos");
    try {
      const p = products.find(x => x.id === entryData.productId);
      if(!p) return;
      const qty = Number(entryData.quantity);
      const workerName = entryData.worker || currentUser?.email || 'System';
      
      await addTransaction({ type: 'IN', productId: p.id, productName: p.nombre, quantity: qty, date: entryData.date, worker: workerName, reason: entryData.comments });
      await updateItem(p.id, { stock_actual: p.stock_actual + qty });
      alert("Entrada registrada"); closeAllModals();
    } catch(e) { alert("Error"); }
  };

  const handleRegisterExit = async () => {
    if (!exitData.productId || !exitData.quantity || Number(exitData.quantity) <= 0 || !exitData.worker) return alert("Datos inválidos");
    try {
      const p = products.find(x => x.id === exitData.productId);
      if(!p) return;
      const qty = Number(exitData.quantity);
      if (p.stock_actual < qty) return alert("Stock insuficiente");
      
      await addTransaction({ 
        type: 'OUT', 
        productId: p.id, 
        productName: p.nombre, 
        quantity: qty, 
        date: exitData.date, 
        worker: exitData.worker,
        reason: exitData.reason 
      });
      
      await updateItem(p.id, { stock_actual: p.stock_actual - qty });
      alert("Salida registrada"); closeAllModals();
    } catch(e) { alert("Error"); }
  };
  
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if(newCategoryName && !extraCategories.includes(newCategoryName) && !defaultCategories.includes(newCategoryName)) {
        setExtraCategories([...extraCategories, newCategoryName]);
        setNewCategoryName('');
    }
  };

  // Render Helpers
  const downloadCSV = (headers: string[], data: (string | number)[][], filename: string) => {
    const csvContent = [headers.join(','), ...data.map(row => row.map(item => `"${String(item).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url); link.setAttribute('download', filename); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
  };

  const openClearHistoryModal = (type: 'IN' | 'OUT') => {
    setHistoryTypeToClear(type);
    setModals(prev => ({ ...prev, clearHistoryConfirm: true }));
  };

  const handleConfirmClearHistory = async () => {
    if (!historyTypeToClear) return;
    try {
      await clearHistory(historyTypeToClear);
      alert(`Historial de ${historyTypeToClear === 'IN' ? 'entradas' : 'salidas'} eliminado correctamente.`);
      closeAllModals();
    } catch(e) {
      console.error(e);
      alert("Error al eliminar el historial.");
    }
  };

  // Views Logic
  const getFilteredMovements = (type: 'IN' | 'OUT') => movements.filter(m => m.type === type && (!dateFilters.start || m.date >= dateFilters.start) && (!dateFilters.end || m.date <= dateFilters.end));

  // --- STYLES ---
  // High legibility input styles - CHANGED focus ring to black/gray
  const formInputClass = "w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-black focus:border-black block p-2.5 outline-none shadow-sm transition-all placeholder-gray-400";
  const formSelectClass = "w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-black focus:border-black block p-2.5 outline-none appearance-none shadow-sm transition-all";
  
  const entryInputClass = "w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none bg-white placeholder-gray-400";
  const lightSelectClass = "w-full border border-gray-300 rounded-lg p-2.5 text-sm appearance-none focus:ring-2 focus:ring-black focus:border-black outline-none bg-white text-gray-900"; // Kept for User Modal

  // --- RENDER SECTIONS ---
  const renderMasterInventory = () => {
     // ... contents same as previous
     const getItemStatus = (current: number, min: number) => {
       if (current === 0) return { label: 'Out of Stock', color: 'bg-gray-100 text-gray-700 border border-gray-200' };
       if (current <= min) return { label: 'Low Stock', color: 'bg-white text-black border border-black' };
       return { label: 'In Stock', color: 'bg-black text-white' };
     };

     const getProductIcon = (name: string) => {
        // Keeping icons generic/monochrome
        return { icon: 'fa-box', color: 'bg-gray-100 text-black' };
     };

     const categories = getCategoriesList();

     const filteredProducts = products.filter(product => {
       const matchesSearch = product.nombre.toLowerCase().includes(inventorySearch.toLowerCase()) || 
                             product.sku.toLowerCase().includes(inventorySearch.toLowerCase());
       const matchesCategory = inventoryCategoryFilter ? product.categoria === inventoryCategoryFilter : true;
       
       let matchesStatus = true;
       if (inventoryStatusFilter) {
          const status = getItemStatus(product.stock_actual, product.stock_minimo).label;
          if (inventoryStatusFilter === 'In Stock') matchesStatus = status === 'In Stock';
          if (inventoryStatusFilter === 'Low Stock') matchesStatus = status === 'Low Stock';
          if (inventoryStatusFilter === 'Out of Stock') matchesStatus = status === 'Out of Stock';
       }

       return matchesSearch && matchesCategory && matchesStatus;
     });

     const indexOfLastItem = inventoryPage * inventoryItemsPerPage;
     const indexOfFirstItem = indexOfLastItem - inventoryItemsPerPage;
     const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
     const totalPages = Math.ceil(filteredProducts.length / inventoryItemsPerPage);

     return (
       <div className="font-sans text-gray-900">
         <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight self-start">Inventario Maestro</h2>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={openManageCategories}
                className="flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                 <i className="fa-solid fa-tags"></i>
                 Categorías
              </button>
              
              <button 
                onClick={openAddProduct}
                className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                <i className="fa-solid fa-plus"></i> Add New Item
              </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-5 relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
               </div>
               <input 
                 type="text" 
                 placeholder="Search by name or SKU..." 
                 value={inventorySearch}
                 onChange={(e) => { setInventorySearch(e.target.value); setInventoryPage(1); }}
                 className="pl-10 block w-full rounded-lg border-gray-300 border py-2.5 text-gray-900 shadow-sm focus:ring-2 focus:ring-black focus:border-transparent"
               />
            </div>
            
            <div className="md:col-span-3 relative">
               <select 
                 value={inventoryStatusFilter}
                 onChange={(e) => { setInventoryStatusFilter(e.target.value); setInventoryPage(1); }}
                 className="w-full rounded-lg border-gray-300 border py-2.5 px-3 text-gray-900 shadow-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white appearance-none"
               >
                 <option value="">Status (All)</option>
                 <option value="In Stock">In Stock</option>
                 <option value="Low Stock">Low Stock</option>
                 <option value="Out of Stock">Out of Stock</option>
               </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <i className="fa-solid fa-chevron-down text-xs"></i>
               </div>
            </div>

            <div className="md:col-span-4 relative">
               <select 
                 value={inventoryCategoryFilter}
                 onChange={(e) => { setInventoryCategoryFilter(e.target.value); setInventoryPage(1); }}
                 className="w-full rounded-lg border-gray-300 border py-2.5 px-3 text-gray-900 shadow-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white appearance-none"
               >
                 <option value="">Category (All)</option>
                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <i className="fa-solid fa-chevron-down text-xs"></i>
               </div>
            </div>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
               <thead className="bg-white">
                 <tr>
                   <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
                   <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">SKU</th>
                   <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Stock</th>
                   <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                   <th className="px-6 py-5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-100">
                 {currentItems.length > 0 ? (
                    currentItems.map((product) => {
                       const status = getItemStatus(product.stock_actual, product.stock_minimo);
                       const style = getProductIcon(product.nombre);
                       return (
                         <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex items-center">
                               <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${style.color} mr-4`}>
                                 <i className={`fa-solid ${style.icon} text-lg`}></i>
                               </div>
                               <div>
                                 <div className="text-sm font-bold text-gray-900">{product.nombre}</div>
                                 <div className="text-xs text-gray-500">{product.categoria}</div>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-sm font-semibold text-gray-400">{product.sku}</div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-sm font-bold text-gray-900">{product.stock_actual} <span className="text-xs font-normal text-gray-500">{product.unidad}</span></div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                               {status.label}
                             </span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                             <button onClick={() => handleViewHistory(product)} className="text-gray-400 hover:text-black mr-3 transition-colors" title="Ver Historial">
                               <i className="fa-solid fa-clock-rotate-left"></i>
                             </button>
                             <button onClick={() => handleEditClick(product)} className="text-gray-400 hover:text-black mr-3 transition-colors">
                               <i className="fa-solid fa-pen"></i>
                             </button>
                             {userData?.role === 'Admin' && (
                               <button onClick={() => handleDeleteClick(product)} className="text-gray-400 hover:text-red-600 transition-colors">
                                 <i className="fa-solid fa-trash"></i>
                               </button>
                             )}
                           </td>
                         </tr>
                       );
                    })
                 ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                        No products found matching your criteria.
                      </td>
                    </tr>
                 )}
               </tbody>
            </table>
            
            <div className="flex items-center justify-center py-6 border-t border-gray-100">
               <button 
                  onClick={() => setInventoryPage(Math.max(1, inventoryPage - 1))}
                  disabled={inventoryPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors text-xs text-gray-600"
               >
                 <i className="fa-solid fa-chevron-left"></i>
               </button>
               
               <div className="flex space-x-2 mx-4">
                 {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setInventoryPage(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        inventoryPage === page ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                 ))}
               </div>

               <button 
                  onClick={() => setInventoryPage(Math.min(totalPages, inventoryPage + 1))}
                  disabled={inventoryPage === totalPages || totalPages === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors text-xs text-gray-600"
               >
                 <i className="fa-solid fa-chevron-right text-xs"></i>
               </button>
            </div>
         </div>
       </div>
     );
  };

  const renderMovements = (type: 'IN' | 'OUT') => {
    const isEntry = type === 'IN';
    const filtered = getFilteredMovements(type);
    
    // View Configuration
    const title = isEntry ? "Registro de Entradas" : "Registro de Salidas";
    const headerTitle = isEntry ? "Gestión" : "Gestión de Salidas";
    const description = isEntry 
      ? "" 
      : "Crea un nuevo registro de salida de productos del inventario.";
    const buttonText = isEntry ? "+ Nueva Entrada" : "+ Nueva Salida";
    // Monochromatic buttons for movements
    const buttonColor = "bg-black hover:bg-gray-800";
    const exportButtonClass = "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50";
    
    const handleExport = () => {
      const headers = ['Fecha', 'Tipo', 'Producto', 'Cantidad', isEntry ? 'Motivo' : 'Trabajador'];
      const data = filtered.map(m => [
          m.date, 
          isEntry ? 'ENTRADA' : 'SALIDA', 
          m.productName, 
          m.quantity, 
          isEntry ? (m.reason || 'Compra') : m.worker
      ]);
      downloadCSV(headers, data, `reporte_${type.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
      <div className="font-sans text-gray-900 space-y-6">
        {/* Dynamic Header Override for this view */}
        <header className="flex justify-between items-center mb-2">
            <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{headerTitle}</h1>
               <p className="text-sm text-gray-500 mt-1">Bienvenido, {userData?.name || currentUser?.email}</p>
            </div>
        </header>

        {/* Action Card (Top) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          {description && <p className="text-gray-500 text-sm mb-6 max-w-md">{description}</p>}
          <button 
            onClick={isEntry ? openEntry : openExit} 
            className={`${buttonColor} text-white px-6 py-2.5 rounded-md text-sm font-bold shadow-md transition-all flex items-center gap-2`}
          >
            {buttonText}
          </button>
        </div>

        {/* History Table Card (Bottom) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 py-5 border-b border-gray-50 flex flex-col xl:flex-row justify-between items-center gap-4">
             <span className="font-bold text-gray-900 text-lg">Historial Reciente</span>
             
             <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
               <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                 <span>Desde:</span>
                 <input 
                    type="date" 
                    value={dateFilters.start} 
                    onChange={e => setDateFilters({...dateFilters, start: e.target.value})} 
                    className="bg-transparent border-none outline-none text-gray-900 font-medium text-xs w-24" 
                 />
               </div>
               
               <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                 <span>Hasta:</span>
                 <input 
                    type="date" 
                    value={dateFilters.end} 
                    onChange={e => setDateFilters({...dateFilters, end: e.target.value})} 
                    className="bg-transparent border-none outline-none text-gray-900 font-medium text-xs w-24" 
                 />
               </div>

               {isEntry ? (
                   <button 
                     onClick={() => openClearHistoryModal('IN')}
                     className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
                   >
                     <i className="fa-solid fa-trash-can"></i> Limpiar Entradas
                   </button>
               ) : (
                   <button 
                     onClick={() => openClearHistoryModal('OUT')}
                     className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
                   >
                      <i className="fa-regular fa-trash-can"></i> Limpiar Salidas
                   </button>
               )}

               <button 
                 onClick={handleExport} 
                 className={`${exportButtonClass} px-4 py-2 rounded-md text-xs font-bold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap`}
               >
                 <i className="fa-regular fa-file-excel text-gray-700"></i>
                 Exportar
               </button>
             </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-white border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Producto</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {isEntry ? 'Motivo' : 'Trabajador'}
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Cantidad</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {filtered.length > 0 ? (
                        filtered.map(m => (
                            <tr key={m.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleViewMovement(m)}>
                                <td className="px-6 py-4 font-medium text-gray-600">{m.date}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{m.productName}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    {isEntry ? (m.reason || 'Sin motivo') : m.worker}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-gray-900">{m.quantity}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-gray-400 text-sm">
                                No hay registros en este rango de fechas.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderWorkers = () => {
    // ... same as before
    const filteredWorkers = workers.filter(w => {
       const matchesSearch = w.name.toLowerCase().includes(workerSearch.toLowerCase()) || (w.employeeId && w.employeeId.toLowerCase().includes(workerSearch.toLowerCase()));
       const matchesRole = workerRoleFilter ? w.role === workerRoleFilter : true;
       return matchesSearch && matchesRole;
    });
    const indexOfLastWorker = workerPage * workersPerPage;
    const indexOfFirstWorker = indexOfLastWorker - workersPerPage;
    const currentWorkers = filteredWorkers.slice(indexOfFirstWorker, indexOfLastWorker);
    const totalPages = Math.ceil(filteredWorkers.length / workersPerPage);
    const getRoleBadgeStyle = (role: string) => {
      switch(role.toLowerCase()) {
        case 'admin': return 'bg-black text-white';
        case 'capataz': return 'bg-gray-200 text-black';
        case 'operario': return 'bg-gray-100 text-gray-800';
        case 'manager': return 'bg-gray-800 text-white';
        default: return 'bg-gray-100 text-gray-800';
      }
    };
    return (
      <div className="font-sans text-gray-900">
        <div className="mb-8"><h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Worker Management</h2><p className="text-gray-500 text-sm mt-1">View, search, and manage all workers in the system.</p></div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fa-solid fa-magnifying-glass text-gray-400"></i></div>
              <input type="text" placeholder="Search by name or ID..." value={workerSearch} onChange={(e) => { setWorkerSearch(e.target.value); setWorkerPage(1); }} className="pl-10 block w-full rounded-md border-0 py-2.5 bg-[#fcfaf8] text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"/>
            </div>
             <div className="relative">
              <select value={workerRoleFilter} onChange={(e) => { setWorkerRoleFilter(e.target.value); setWorkerPage(1); }} className="appearance-none rounded-md bg-white px-3 py-2.5 pr-8 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-black outline-none">
                <option value="">Todos los Roles</option><option value="Operario">Operario</option><option value="Capataz">Capataz</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400"><i className="fa-solid fa-filter"></i></div>
            </div>
          </div>
          <button onClick={openAddWorker} className="w-full sm:w-auto inline-flex items-center justify-center gap-x-1.5 rounded-md bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 transition-colors"><i className="fa-solid fa-plus"></i>Add New Worker</button>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr><th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">User Name</th><th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">User ID</th><th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Role</th><th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Last Activity</th><th scope="col" className="relative px-6 py-4 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Actions</th></tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">{currentWorkers.length > 0 ? ( currentWorkers.map((worker) => ( <tr key={worker.id} className="hover:bg-gray-50 transition-colors"><td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{worker.name}</div></td><td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500 font-mono">{worker.employeeId || worker.id.substring(0,8).toUpperCase()}</div></td><td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10 ${getRoleBadgeStyle(worker.role)}`}>{worker.role}</span></td><td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{worker.lastActive || '2 hours ago'}</div></td><td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleEditWorkerClick(worker)} className="text-gray-900 hover:text-black mr-4"><i className="fa-solid fa-pen"></i></button><button onClick={() => handleDeleteWorkerClick(worker)} className="text-gray-900 hover:text-red-600"><i className="fa-solid fa-trash"></i></button></td></tr> )) ) : ( <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No workers found.</td></tr> )}</tbody>
          </table>
          <div className="flex items-center justify-center bg-white px-4 py-5 border-t border-gray-200 sm:px-6">
             <div className="flex gap-2"><button onClick={() => setWorkerPage(prev => Math.max(prev - 1, 1))} disabled={workerPage === 1} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"><i className="fa-solid fa-chevron-left text-xs"></i></button>{Array.from({length: totalPages}, (_, i) => i + 1).map(page => ( <button key={page} onClick={() => setWorkerPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${ workerPage === page ? 'bg-black text-white shadow-md' : 'text-gray-700 hover:bg-gray-100' }`}>{page}</button> ))} <button onClick={() => setWorkerPage(prev => Math.min(prev + 1, totalPages))} disabled={workerPage === totalPages || totalPages === 0} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"><i className="fa-solid fa-chevron-right text-xs"></i></button></div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => {
    // ... same as before
    const getRoleBadge = (role: string) => { if (role === 'Admin') { return <span className="px-3 py-1 rounded-full text-xs font-bold bg-black text-white">Admin</span>; } return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">{role}</span>; };
    return (
      <div className="font-sans text-gray-900">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4"><div><h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2><p className="text-gray-500 text-sm mt-1">Administra los accesos y roles del sistema.</p></div><button onClick={openAddUser} className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm"><i className="fa-solid fa-plus"></i> Añadir Usuario</button></div>
        <div className="space-y-4">{appUsers.map((user) => ( <div key={user.id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between shadow-sm hover:shadow-md transition-shadow gap-4 sm:gap-0"><div className="flex items-center gap-4 w-full sm:w-auto"><div className="w-12 h-12 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-lg uppercase flex-shrink-0">{user.name.substring(0,2)}</div><div className="flex flex-col"><h3 className="font-bold text-gray-900">{user.name}</h3><p className="text-sm text-gray-500">{user.email}</p></div></div><div className="flex items-center gap-6 sm:gap-12 w-full sm:w-auto justify-between sm:justify-center">{getRoleBadge(user.role)}<span className={`text-sm font-bold ${user.status === 'Active' ? 'text-green-600' : 'text-red-500'}`}>{user.status === 'Active' ? 'Activo' : 'Inactivo'}</span></div><div className="flex items-center gap-3 w-full sm:w-auto justify-end">{userData?.role === 'Admin' && ( <button onClick={() => handleEditUserClick(user)} className="text-gray-400 hover:text-black transition-colors text-lg" title="Editar Usuario"><i className="fa-solid fa-pen"></i></button> )}{userData?.role === 'Admin' && currentUser?.uid !== user.id && ( <button onClick={() => handleDeleteUserClick(user)} className="text-gray-400 hover:text-gray-600 transition-colors text-lg ml-2" title="Eliminar Usuario"><i className="fa-solid fa-trash-can"></i></button> )}</div></div> ))}</div>
      </div>
    );
  };

  const renderSummary = () => {
     // 1. Stock Neto Actual
     const totalStock: number = products.reduce((acc, p) => acc + (Number(p.stock_actual) || 0), 0);
     const lowStockItems = products.filter(p => p.stock_actual <= p.stock_minimo);

     // 2. Totales Acumulados (Último trimestre - 90 días)
     const ninetyDaysAgo = new Date();
     ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
     const quarterlyMovements = movements.filter(m => new Date(m.date).getTime() >= ninetyDaysAgo.getTime());
     
     const quarterlyIn = quarterlyMovements
        .filter(m => m.type === 'IN')
        .reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
     
     const quarterlyOut = quarterlyMovements
        .filter(m => m.type === 'OUT')
        .reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
        
     const quarterlyNet = quarterlyIn - quarterlyOut;

     // 3. Gráfico de Balance Neto (Últimos 30 días)
     const last30Days = Array.from({length: 30}, (_, i) => {
         const d = new Date();
         d.setDate(d.getDate() - (29 - i));
         return d.toISOString().split('T')[0];
     });

     // Prepare data for chart
     const dailyBalances = last30Days.map(date => {
         const dayMoves = movements.filter(m => m.date === date);
         const ins = dayMoves.filter(m => m.type === 'IN').reduce((a, b) => a + b.quantity, 0);
         const outs = dayMoves.filter(m => m.type === 'OUT').reduce((a, b) => a + b.quantity, 0);
         return { date, net: ins - outs };
     });

     // Calculate chart scaling
     const maxAbsNet = Math.max(1, ...dailyBalances.map(d => Math.abs(d.net)));
     const barWidth = (100 / 30) * 0.7; // Bar width relative to SVG width (100)
     const gap = (100 / 30) * 0.3;

     return (
       <div className="space-y-8 font-sans">
         <div className="flex justify-between items-center">
            <div>
               <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard General</h2>
               <p className="text-gray-500 mt-1">Resumen de operaciones y estado del inventario.</p>
            </div>
            <button className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm">
               <i className="fa-solid fa-file-arrow-down mr-2"></i> Reporte
            </button>
         </div>

         {/* TOP CARDS: Stock Neto & Quarterly Totals */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Stock Neto Actual */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-36">
               <div>
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Stock Neto Actual</span>
                  <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{totalStock.toLocaleString()} <span className="text-sm font-normal text-gray-400">unds</span></h3>
               </div>
               <div className="flex items-center text-xs font-semibold text-gray-400">
                  <i className="fa-solid fa-box mr-1"></i> Total en almacén
               </div>
            </div>

            {/* Card 2: Balance Trimestral */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-36">
               <div>
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Balance (90 días)</span>
                  <h3 className={`text-3xl font-extrabold mt-2 ${quarterlyNet >= 0 ? 'text-black' : 'text-gray-500'}`}>
                    {quarterlyNet > 0 ? '+' : ''}{quarterlyNet.toLocaleString()}
                  </h3>
               </div>
               <div className="text-xs text-gray-400">
                  Neto: Entradas - Salidas
               </div>
            </div>

            {/* Card 3: Entradas Trimestre */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-36">
               <div>
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Entradas (90 días)</span>
                  <h3 className="text-3xl font-extrabold text-black mt-2">
                    <i className="fa-solid fa-arrow-down text-xl mr-1 opacity-50"></i>
                    {quarterlyIn.toLocaleString()}
                  </h3>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div className="bg-black h-1.5 rounded-full" style={{width: '100%'}}></div>
               </div>
            </div>

            {/* Card 4: Salidas Trimestre */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-36">
               <div>
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Salidas (90 días)</span>
                  <h3 className="text-3xl font-extrabold text-gray-600 mt-2">
                    <i className="fa-solid fa-arrow-up text-xl mr-1 opacity-50"></i>
                    {quarterlyOut.toLocaleString()}
                  </h3>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div className="bg-gray-500 h-1.5 rounded-full" style={{width: '100%'}}></div>
               </div>
            </div>
         </div>

         {/* MIDDLE SECTION: Net Balance Chart */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
               <div className="mb-6 flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Balance Neto Diario</h3>
                    <p className="text-sm text-gray-500">Comportamiento de flujo (Entradas vs Salidas) últimos 30 días.</p>
                  </div>
                  <div className="flex gap-4 text-xs font-semibold">
                     <span className="flex items-center"><div className="w-2 h-2 bg-black rounded-full mr-2"></div>Superávit (Entrada &gt; Salida)</span>
                     <span className="flex items-center"><div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>Déficit (Salida &gt; Entrada)</span>
                  </div>
               </div>
               
               {/* Custom SVG Bar Chart */}
               <div className="w-full h-64 relative">
                  {/* Zero Line */}
                  <div className="absolute top-1/2 left-0 right-0 border-t border-gray-300 border-dashed z-0"></div>
                  
                  <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full z-10 relative">
                     {dailyBalances.map((day, i) => {
                        const height = (Math.abs(day.net) / maxAbsNet) * 25; // Scale to half height (25)
                        const x = i * (100 / 30);
                        const y = day.net >= 0 ? 25 - height : 25;
                        const color = day.net >= 0 ? '#000000' : '#9ca3af'; // Black or Gray-400
                        
                        return (
                           <g key={day.date} className="group">
                              <rect 
                                x={x + gap/2} 
                                y={y} 
                                width={barWidth} 
                                height={Math.max(height, 0.5)} // Minimum visibility
                                fill={color} 
                                rx="0.5"
                                className="transition-all duration-300 hover:opacity-80"
                              />
                              {/* Tooltip Effect */}
                              <title>{`${day.date}: ${day.net > 0 ? '+' : ''}${day.net}`}</title>
                           </g>
                        );
                     })}
                  </svg>
               </div>
               <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-1">
                  <span>{last30Days[0]}</span>
                  <span>{last30Days[14]}</span>
                  <span>{last30Days[29]}</span>
               </div>
            </div>

            {/* Low Stock Side List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
               <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-bold text-gray-900 text-lg">Alertas de Stock</h3>
                  <p className="text-xs text-gray-500">{lowStockItems.length} productos requieren atención</p>
               </div>
               <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm text-left">
                     <thead className="text-xs text-gray-500 bg-gray-50">
                        <tr>
                           <th className="px-4 py-3 font-medium">Producto</th>
                           <th className="px-4 py-3 font-medium text-right">Stock</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {lowStockItems.length > 0 ? (
                           lowStockItems.slice(0, 8).map(item => (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                 <td className="px-4 py-3">
                                    <div className="font-semibold text-gray-900 truncate max-w-[120px]" title={item.nombre}>{item.nombre}</div>
                                    <div className="text-xs text-gray-400">{item.sku}</div>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.stock_actual === 0 ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}>
                                       {item.stock_actual} / {item.stock_minimo}
                                    </span>
                                 </td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan={2} className="px-6 py-8 text-center text-gray-400">
                                 Todo el inventario OK.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
               {lowStockItems.length > 8 && (
                  <div className="p-2 text-center border-t text-xs text-black cursor-pointer hover:bg-gray-50 font-bold">
                     Ver todos ({lowStockItems.length})
                  </div>
               )}
            </div>
         </div>
       </div>
     );
  };

  return (
    <div className="flex h-screen bg-[#f4f6f9]">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {activeView !== 'WORKERS' && activeView !== 'USERS' && (
          <header className="mb-8 flex justify-between items-center">
            <div>
               <h1 className="text-2xl font-bold text-gray-900">{activeView === 'MASTER' ? '' : activeView === 'SUMMARY' ? '' : 'Gestión'}</h1>
               {activeView !== 'MASTER' && activeView !== 'SUMMARY' && <p className="text-sm text-gray-500">Bienvenido, {userData?.name || currentUser?.email}</p>}
            </div>
            {activeView === 'MASTER' && ( <div className="hidden"></div> )}
          </header>
          )}

          <div className="fade-in">
            {activeView === 'MASTER' && renderMasterInventory()}
            {activeView === 'MOVEMENTS_IN' && renderMovements('IN')}
            {activeView === 'MOVEMENTS_OUT' && renderMovements('OUT')}
            {activeView === 'WORKERS' && renderWorkers()}
            {activeView === 'SUMMARY' && renderSummary()}
            {activeView === 'USERS' && renderUsers()}
          </div>
        </div>
      </main>
      
      {/* ... Add/Edit Modals ... */}
      <Modal isOpen={modals.addProduct} onClose={closeAllModals} title="Nuevo Producto">
        {/* ... Same content ... */}
        <form onSubmit={handleSaveProduct} className="space-y-5">
           <div className="grid grid-cols-2 gap-5">
             <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">SKU</label><input className={formInputClass} placeholder="SKU-001" value={newProduct.sku} name="sku" onChange={handleInputChange} required /></div>
             <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoría</label><div className="relative"><select className={formSelectClass} value={newProduct.categoria} name="categoria" onChange={handleInputChange}>{getCategoriesList().map(c => <option key={c} value={c}>{c}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div>
           </div>
           <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre</label><input className={formInputClass} placeholder="Ej: Casco de Seguridad" value={newProduct.nombre} name="nombre" onChange={handleInputChange} required /></div>
           <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción</label><textarea className={`${formInputClass} resize-none h-24`} placeholder="Detalles del producto..." value={newProduct.descripcion} name="descripcion" onChange={handleInputChange} /></div>
           <div className="grid grid-cols-2 gap-5">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Unidad</label><div className="relative"><select className={formSelectClass} value={newProduct.unidad} name="unidad" onChange={handleInputChange}>{units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Ubicación</label><input className={formInputClass} placeholder="A-01" value={newProduct.ubicacion} name="ubicacion" onChange={handleInputChange} /></div>
           </div>
           <div className="grid grid-cols-2 gap-5">
             <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock Inicial</label><input type="number" className={formInputClass} value={newProduct.stock_actual} name="stock_actual" onChange={handleInputChange} required /></div>
             <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock Mínimo</label><input type="number" className={formInputClass} value={newProduct.stock_minimo} name="stock_minimo" onChange={handleInputChange} required /></div>
           </div>
           <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6"><button type="button" onClick={closeAllModals} className="px-4 py-2 text-gray-600 hover:text-black text-sm font-medium transition-colors">Cancelar</button><button className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"><i className="fa-regular fa-floppy-disk"></i> Guardar</button></div>
        </form>
      </Modal>

      <Modal isOpen={modals.editProduct} onClose={closeAllModals} title="Editar Producto">
        {editingProduct && (
        <form onSubmit={handleUpdateProduct} className="space-y-5">
           <div className="grid grid-cols-2 gap-5">
             <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">SKU</label><input className={formInputClass} value={editingProduct.sku} name="sku" onChange={handleEditInputChange} required /></div>
             <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoría</label><div className="relative"><select className={formSelectClass} value={editingProduct.categoria} name="categoria" onChange={handleEditInputChange}>{getCategoriesList().map(c => <option key={c} value={c}>{c}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div>
           </div>
           <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre</label><input className={formInputClass} value={editingProduct.nombre} name="nombre" onChange={handleEditInputChange} required /></div>
           <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción</label><textarea className={`${formInputClass} resize-none h-24`} value={editingProduct.descripcion} name="descripcion" onChange={handleEditInputChange} /></div>
           <div className="grid grid-cols-2 gap-5">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Unidad</label><div className="relative"><select className={formSelectClass} value={editingProduct.unidad} name="unidad" onChange={handleEditInputChange}>{units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Ubicación</label><input className={formInputClass} value={editingProduct.ubicacion} name="ubicacion" onChange={handleEditInputChange} /></div>
           </div>
           <div className="grid grid-cols-2 gap-5">
             <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock Actual</label><input type="number" className={formInputClass} value={editingProduct.stock_actual} name="stock_actual" onChange={handleEditInputChange} required /></div>
             <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock Mínimo</label><input type="number" className={formInputClass} value={editingProduct.stock_minimo} name="stock_minimo" onChange={handleEditInputChange} required /></div>
           </div>
           <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6"><button type="button" onClick={closeAllModals} className="px-4 py-2 text-gray-600 hover:text-black text-sm font-medium transition-colors">Cancelar</button><button className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"><i className="fa-regular fa-floppy-disk"></i> Actualizar</button></div>
        </form>
        )}
      </Modal>

      <Modal isOpen={modals.manageCategories} onClose={closeAllModals} title="Gestionar Categorías">
         {/* ... Same content ... */}
         <div className="space-y-6">
           <form onSubmit={handleAddCategory} className="flex gap-2"><input type="text" placeholder="Nueva categoría..." className={formInputClass} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /><button type="submit" disabled={!newCategoryName} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"><i className="fa-solid fa-plus"></i></button></form>
           <div><h4 className="text-sm font-semibold text-gray-700 mb-2">Categorías Disponibles</h4><div className="flex flex-wrap gap-2">{getCategoriesList().map((cat, idx) => ( <span key={idx} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm border border-gray-200">{cat}</span> ))}</div></div>
           <div className="flex justify-end pt-4 border-t"><button onClick={closeAllModals} className="text-gray-600 hover:text-black text-sm">Cerrar</button></div>
         </div>
      </Modal>
      
      {/* ... Other modals ... */}
      <Modal isOpen={modals.deleteProduct} onClose={closeAllModals} title="Eliminar"><div className="text-center p-4"><p>¿Seguro?</p><div className="flex justify-center gap-2 mt-4"><button onClick={handleConfirmDelete} className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">Sí, Eliminar</button></div></div></Modal>
      <Modal isOpen={modals.deleteWorker} onClose={closeAllModals} title="Eliminar Trabajador"><div className="text-center p-4"><p>¿Está seguro de que desea eliminar a <strong>{workerToDelete?.name}</strong>? Esta acción no se puede deshacer.</p><div className="flex justify-center gap-2 mt-4"><button onClick={closeAllModals} className="px-4 py-2 text-gray-600 hover:text-black text-sm font-medium">Cancelar</button><button onClick={handleConfirmDeleteWorker} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800">Eliminar</button></div></div></Modal>
      <Modal isOpen={modals.registerEntry} onClose={closeAllModals} title={<div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white border border-gray-800"><i className="fa-solid fa-exclamation text-sm"></i></div><span>Registrar Entrada</span></div>} footer={<><button onClick={closeAllModals} className="px-4 py-2.5 text-gray-600 hover:text-black text-sm font-medium transition-colors">Cancelar</button><button onClick={handleRegisterEntry} className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"><i className="fa-regular fa-floppy-disk"></i> Guardar</button></>}>
        <div className="space-y-4">
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha</label><input type="date" className={entryInputClass} value={entryData.date} name="date" onChange={handleEntryChange} /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Producto</label><div className="relative"><select className={entryInputClass} value={entryData.productId} name="productId" onChange={handleEntryChange}><option value="">Seleccionar producto...</option>{products.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Cantidad</label><input type="number" className={entryInputClass} value={entryData.quantity} name="quantity" placeholder="0" onChange={handleEntryChange} /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Trabajador (Responsable)</label><input type="text" list="workers-list" className={entryInputClass} value={entryData.worker} name="worker" placeholder="Nombre del responsable" onChange={handleEntryChange} /><datalist id="workers-list">{workers.map(w => <option key={w.id} value={w.name} />)}</datalist></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Motivo</label><input type="text" className={entryInputClass} value={entryData.comments} name="comments" placeholder="Ej. Compra, Devolución" onChange={handleEntryChange} /></div>
        </div>
      </Modal>
      <Modal isOpen={modals.registerExit} onClose={closeAllModals} title={<span className="font-bold text-gray-900">Registrar Salida</span>} footer={<><button onClick={closeAllModals} className="px-4 py-2.5 text-gray-600 hover:text-black text-sm font-medium transition-colors">Cancelar</button><button onClick={handleRegisterExit} className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"><i className="fa-regular fa-floppy-disk"></i> Guardar</button></>}>
        <div className="space-y-4">
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha</label><input type="date" className={entryInputClass} value={exitData.date} name="date" onChange={handleExitChange} /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Producto</label><div className="relative"><select className={entryInputClass} value={exitData.productId} name="productId" onChange={handleExitChange}><option value="">Seleccionar producto...</option>{products.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Cantidad</label><input type="number" className={entryInputClass} value={exitData.quantity} name="quantity" placeholder="0" onChange={handleExitChange} /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Trabajador (Receptor)</label><div className="relative"><select className={entryInputClass} value={exitData.worker} name="worker" onChange={handleExitChange}><option value="">Seleccionar trabajador...</option>{workers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Motivo</label><div className="relative"><select className={entryInputClass} value={exitData.reason} name="reason" onChange={handleExitChange}><option value="">Seleccionar...</option><option value="Entrega Inicial">Entrega Inicial</option><option value="Recambio por Desgaste">Recambio por Desgaste</option><option value="Préstamo">Préstamo</option><option value="Pérdida/Daño">Pérdida/Daño</option><option value="Otro">Otro</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div>
        </div>
      </Modal>
      <Modal isOpen={modals.addUser} onClose={closeAllModals} title="Nuevo Usuario"><form onSubmit={handleSaveUser} className="space-y-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Nombre</label><input type="text" className={lightSelectClass} value={newUser.name} name="name" onChange={handleNewUserChange} required/></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Email</label><input type="email" className={lightSelectClass} value={newUser.email} name="email" onChange={handleNewUserChange} required/></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label><input type="password" className={lightSelectClass} value={newUser.password} name="password" onChange={handleNewUserChange} placeholder="Mínimo 6 caracteres" required/></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Rol</label><div className="relative"><select className={lightSelectClass} value={newUser.role} name="role" onChange={handleNewUserChange}><option value="Admin">Admin</option><option value="Editor">Editor</option><option value="Empleado">Empleado</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div><button className="bg-black text-white px-4 py-2 rounded w-full font-bold hover:bg-gray-800 transition-colors">Guardar Usuario</button></form></Modal>
      <Modal isOpen={modals.editUser} onClose={closeAllModals} title="Editar Usuario">{editingUser && (<form onSubmit={handleUpdateUser} className="space-y-4"><div className="bg-gray-50 p-3 rounded-md mb-4 border border-gray-100"><p className="text-sm font-medium text-gray-900">{editingUser.name}</p><p className="text-xs text-gray-500">{editingUser.email}</p></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Rol del Sistema</label><div className="relative"><select className={lightSelectClass} value={editingUser.role} name="role" onChange={handleEditUserInputChange}><option value="Admin">Admin</option><option value="Editor">Editor</option><option value="Empleado">Empleado</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Estado</label><div className="relative"><select className={lightSelectClass} value={editingUser.status} name="status" onChange={handleEditUserInputChange}><option value="Active">Activo</option><option value="Inactive">Inactivo</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div><button className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded w-full font-bold transition-colors">Actualizar Usuario</button></form>)}</Modal>
      <Modal isOpen={modals.deleteUser} onClose={closeAllModals} title="Eliminar Usuario"><div className="text-center p-4"><p>¿Seguro?</p><div className="flex justify-center gap-2 mt-4"><button onClick={handleConfirmDeleteUser} className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">Sí, Eliminar</button></div></div></Modal>
      <Modal isOpen={modals.addWorker} onClose={closeAllModals} title="Nuevo Trabajador"><form onSubmit={handleSaveWorker} className="space-y-6"><div><label className="block text-xs font-bold text-gray-900 uppercase mb-2">Nombre</label><input className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white" placeholder="Ingrese el nombre" name="name" value={newWorker.name} onChange={handleWorkerInputChange}/></div><div><label className="block text-xs font-bold text-gray-900 uppercase mb-2">DNI</label><input className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white" placeholder="Ingrese el DNI" name="employeeId" value={newWorker.employeeId || ''} onChange={handleWorkerInputChange}/></div><div><label className="block text-xs font-bold text-gray-900 uppercase mb-2">Cargo</label><div className="relative"><select className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white appearance-none" name="role" value={newWorker.role} onChange={handleWorkerInputChange}><option value="">Seleccione el cargo</option><option value="Operario">Operario</option><option value="Capataz">Capataz</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div><div><label className="block text-xs font-bold text-gray-900 uppercase mb-2">Estado</label><div className="flex gap-4"><label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${newWorker.status === 'Active' ? 'border-black bg-gray-50' : 'border-gray-200'}`}><div className={`w-5 h-5 rounded-full border flex items-center justify-center ${newWorker.status === 'Active' ? 'border-black' : 'border-gray-300'}`}>{newWorker.status === 'Active' && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}</div><span className="text-sm font-medium text-gray-900">Activo</span><input type="radio" name="status" value="Active" checked={newWorker.status === 'Active'} onChange={handleWorkerInputChange} className="hidden" /></label><label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${newWorker.status === 'Inactive' ? 'border-black bg-gray-50' : 'border-gray-200'}`}><div className={`w-5 h-5 rounded-full border flex items-center justify-center ${newWorker.status === 'Inactive' ? 'border-black' : 'border-gray-300'}`}>{newWorker.status === 'Inactive' && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}</div><span className="text-sm font-medium text-gray-900">Inactivo</span><input type="radio" name="status" value="Inactive" checked={newWorker.status === 'Inactive'} onChange={handleWorkerInputChange} className="hidden" /></label></div></div><button className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors">Guardar</button></form></Modal>
      <Modal isOpen={modals.editWorker} onClose={closeAllModals} title="Editar Trabajador">{editingWorker && (<form onSubmit={handleUpdateWorker} className="space-y-6"><div><label className="block text-xs font-bold text-gray-900 uppercase mb-2">Nombre</label><input className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white" placeholder="Ingrese el nombre" name="name" value={editingWorker.name} onChange={handleEditWorkerInputChange}/></div><div><label className="block text-xs font-bold text-gray-900 uppercase mb-2">DNI</label><input className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white" placeholder="Ingrese el DNI" name="employeeId" value={editingWorker.employeeId || ''} onChange={handleEditWorkerInputChange}/></div><div><label className="block text-xs font-bold text-gray-900 uppercase mb-2">Cargo</label><div className="relative"><select className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white appearance-none" name="role" value={editingWorker.role} onChange={handleEditWorkerInputChange}><option value="">Seleccione el cargo</option><option value="Operario">Operario</option><option value="Capataz">Capataz</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><i className="fa-solid fa-chevron-down text-xs"></i></div></div></div><div><label className="block text-xs font-bold text-gray-900 uppercase mb-2">Estado</label><div className="flex gap-4"><label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${editingWorker.status === 'Active' ? 'border-black bg-gray-50' : 'border-gray-200'}`}><div className={`w-5 h-5 rounded-full border flex items-center justify-center ${editingWorker.status === 'Active' ? 'border-black' : 'border-gray-300'}`}>{editingWorker.status === 'Active' && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}</div><span className="text-sm font-medium text-gray-900">Activo</span><input type="radio" name="status" value="Active" checked={editingWorker.status === 'Active'} onChange={handleEditWorkerInputChange} className="hidden" /></label><label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${editingWorker.status === 'Inactive' ? 'border-black bg-gray-50' : 'border-gray-200'}`}><div className={`w-5 h-5 rounded-full border flex items-center justify-center ${editingWorker.status === 'Inactive' ? 'border-black' : 'border-gray-300'}`}>{editingWorker.status === 'Inactive' && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}</div><span className="text-sm font-medium text-gray-900">Inactivo</span><input type="radio" name="status" value="Inactive" checked={editingWorker.status === 'Inactive'} onChange={handleEditWorkerInputChange} className="hidden" /></label></div></div><button className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors">Guardar Cambios</button></form>)}</Modal>
      
      <Modal isOpen={modals.history} onClose={closeAllModals} title={`Historial de Movimientos: ${historyProduct?.nombre || ''}`}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 bg-gray-50 p-4 rounded-lg">
             <div className="w-full"><label className="block text-xs font-semibold text-gray-500 mb-1">Desde</label><input type="date" name="start" value={historyDateFilters.start} onChange={handleHistoryDateChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" /></div>
             <div className="w-full"><label className="block text-xs font-semibold text-gray-500 mb-1">Hasta</label><input type="date" name="end" value={historyDateFilters.end} onChange={handleHistoryDateChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" /></div>
          </div>

          {/* ERROR DISPLAY FOR MISSING INDEX */}
          {historyError === 'INDEX_REQUIRED' ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm">
              <p className="font-bold flex items-center gap-2 mb-2">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Configuración Requerida
              </p>
              <p className="mb-3">
                Para ver el historial filtrado, Firebase requiere crear un índice compuesto.
              </p>
              <a 
                href="https://console.firebase.google.com/v1/r/project/inventario-epps-550f0/firestore/indexes?create_composite=Clpwcm9qZWN0cy9pbnZlbnRhcmlvLWVwcHMtNTUwZjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3RyYW5zYWN0aW9ucy9pbmRleGVzL18QARoNCglwcm9kdWN0SWQQARoICgRkYXRlEAIaDAoIX19uYW1lX18QAg"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md font-bold inline-block transition-colors shadow-sm"
              >
                <i className="fa-solid fa-wrench mr-2"></i>
                Crear Índice Automáticamente
              </a>
            </div>
          ) : historyError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              {historyError}
            </div>
          )}

          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Cant</th><th className="px-4 py-3 text-right">Responsable</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{loadingHistory && historyData.length === 0 ? ( <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400"><i className="fa-solid fa-circle-notch fa-spin"></i> Cargando...</td></tr> ) : historyData.length === 0 ? ( <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No hay movimientos registrados en este rango</td></tr> ) : ( historyData.map(m => ( <tr key={m.id} className="hover:bg-gray-50"><td className="px-4 py-3">{m.date}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${m.type === 'IN' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'}`}>{m.type === 'IN' ? 'ENTRADA' : 'SALIDA'}</span></td><td className="px-4 py-3 text-right font-medium">{m.quantity}</td><td className="px-4 py-3 text-right text-xs text-gray-500">{m.worker}</td></tr> )) )}</tbody>
            </table>
            {hasMoreHistory && !loadingHistory && ( <div className="bg-gray-50 p-2 text-center border-t"><button onClick={() => historyProduct && loadHistory(historyProduct.id, false)} className="text-xs text-black hover:underline font-medium">Cargar más</button></div> )}
            {loadingHistory && historyData.length > 0 && ( <div className="bg-gray-50 p-2 text-center border-t text-xs text-gray-500">Cargando más...</div> )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={modals.viewMovement} onClose={closeAllModals} title="Detalle del Movimiento">
        {selectedMovement && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-500 uppercase">Fecha</label><p className="text-gray-900 font-medium">{selectedMovement.date}</p></div><div><label className="text-xs font-bold text-gray-500 uppercase">Tipo</label><div><span className={`px-2 py-1 rounded text-xs font-bold ${selectedMovement.type === 'IN' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'}`}>{selectedMovement.type === 'IN' ? 'ENTRADA' : 'SALIDA'}</span></div></div></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Producto</label><p className="text-lg font-bold text-gray-900">{selectedMovement.productName}</p></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-500 uppercase">Cantidad</label><p className="text-xl font-bold text-gray-900">{selectedMovement.quantity}</p></div><div><label className="text-xs font-bold text-gray-500 uppercase">{selectedMovement.type === 'IN' ? 'Registrado por' : 'Responsable'}</label><p className="text-gray-900 font-medium">{selectedMovement.worker}</p></div></div>
            {selectedMovement.reason && ( <div><label className="text-xs font-bold text-gray-500 uppercase">Motivo / Comentarios</label><div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-gray-700 text-sm mt-1">{selectedMovement.reason}</div></div> )}
            <div className="pt-4 border-t border-gray-100 mt-2"><label className="text-xs font-mono text-gray-400">ID de Transacción: {selectedMovement.id}</label></div>
          </div>
        )}
      </Modal>
      
      {/* Confirmation Modal for Clearing History */}
      <Modal 
        isOpen={modals.clearHistoryConfirm} 
        onClose={closeAllModals} 
        title={`Eliminar Historial de ${historyTypeToClear === 'IN' ? 'Entradas' : 'Salidas'}`}
      >
        <div className="text-center p-4">
          <div className="mb-4 text-black bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
             <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
          </div>
          <p className="text-gray-800 font-medium mb-2">
            ¿Está seguro de que desea eliminar <strong>TODO</strong> el historial de {historyTypeToClear === 'IN' ? 'entradas' : 'salidas'}?
          </p>
          <p className="text-sm text-gray-500">
            Esta acción eliminará permanentemente todos los registros de la base de datos. No se puede deshacer.
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <button onClick={closeAllModals} className="px-4 py-2 text-gray-600 hover:text-black text-sm font-medium border rounded-md hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleConfirmClearHistory} className="bg-black text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm">
              Sí, Eliminar Todo
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;