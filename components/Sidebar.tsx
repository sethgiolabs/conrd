import React, { useState } from 'react';
import { ViewState } from '../types';
import { useInventory } from '../context/InventoryContext';
import { Modal } from './Modal';

interface SidebarProps {
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const { logout, userData, currentUser } = useInventory();
  const [movementsOpen, setMovementsOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isActive = (view: ViewState) => activeView === view;

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <aside className="w-64 h-full bg-black text-gray-400 flex flex-col fixed left-0 top-0 shadow-2xl z-10 font-sans border-r border-gray-900">
        {/* Logo Section */}
        <div className="p-6 flex justify-center items-center border-b border-gray-900">
          <img 
            src="https://res.cloudinary.com/dequhwtfu/image/upload/v1765154240/conradv2.png" 
            alt="Conrad Logo" 
            className="w-[80%] object-contain filter grayscale brightness-200 contrast-125"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-6 px-3">
          <ul className="space-y-2">
            {/* Dashboard */}
             <li>
              <button
                onClick={() => setActiveView('SUMMARY')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive('SUMMARY') 
                    ? 'bg-white text-black font-bold shadow-md' 
                    : 'hover:bg-gray-900 hover:text-white font-medium'
                }`}
              >
                <i className={`fa-solid fa-chart-pie w-6 ${isActive('SUMMARY') ? 'text-black' : 'text-gray-500'}`}></i>
                <span>Dashboard</span>
              </button>
            </li>

            {/* Inventario Maestro */}
            <li>
              <button
                onClick={() => setActiveView('MASTER')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive('MASTER') 
                    ? 'bg-white text-black font-bold shadow-md' 
                    : 'hover:bg-gray-900 hover:text-white font-medium'
                }`}
              >
                <i className={`fa-solid fa-boxes-stacked w-6 ${isActive('MASTER') ? 'text-black' : 'text-gray-500'}`}></i>
                <span>Inventario</span>
              </button>
            </li>

            {/* Registrar Movimientos Group */}
            <li>
              <button
                onClick={() => setMovementsOpen(!movementsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-900 hover:text-white rounded-lg transition-colors duration-200 font-medium"
              >
                <div className="flex items-center">
                  <i className="fa-solid fa-right-left w-6 text-gray-500"></i>
                  <span>Movimientos</span>
                </div>
                <i className={`fa-solid fa-chevron-down transition-transform duration-200 ${movementsOpen ? 'rotate-180' : ''} text-xs`}></i>
              </button>

              {/* Submenu */}
              <ul className={`overflow-hidden transition-all duration-300 ${movementsOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                <li className="mt-1">
                  <button
                    onClick={() => setActiveView('MOVEMENTS_IN')}
                    className={`w-full flex items-center pl-12 pr-4 py-2.5 text-sm rounded-lg transition-colors duration-200 ${
                      isActive('MOVEMENTS_IN') ? 'text-white bg-gray-900 font-semibold' : 'hover:text-white hover:bg-gray-900/50'
                    }`}
                  >
                    <i className="fa-solid fa-arrow-down w-5 text-xs"></i>
                    Entrada
                  </button>
                </li>
                <li className="mt-1">
                  <button
                    onClick={() => setActiveView('MOVEMENTS_OUT')}
                    className={`w-full flex items-center pl-12 pr-4 py-2.5 text-sm rounded-lg transition-colors duration-200 ${
                      isActive('MOVEMENTS_OUT') ? 'text-white bg-gray-900 font-semibold' : 'hover:text-white hover:bg-gray-900/50'
                    }`}
                  >
                    <i className="fa-solid fa-arrow-up w-5 text-xs"></i>
                    Salida
                  </button>
                </li>
              </ul>
            </li>

            {/* Trabajadores */}
            <li>
              <button
                onClick={() => setActiveView('WORKERS')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive('WORKERS') 
                    ? 'bg-white text-black font-bold shadow-md' 
                    : 'hover:bg-gray-900 hover:text-white font-medium'
                }`}
              >
                <i className={`fa-solid fa-users w-6 ${isActive('WORKERS') ? 'text-black' : 'text-gray-500'}`}></i>
                <span>Trabajadores</span>
              </button>
            </li>

            {/* Usuarios - Admin and Editor */}
            {(userData?.role === 'Admin' || userData?.role === 'Editor') && (
              <li>
                <button
                  onClick={() => setActiveView('USERS')}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive('USERS') 
                      ? 'bg-white text-black font-bold shadow-md' 
                      : 'hover:bg-gray-900 hover:text-white font-medium'
                  }`}
                >
                  <i className={`fa-solid fa-user-gear w-6 ${isActive('USERS') ? 'text-black' : 'text-gray-500'}`}></i>
                  <span>Usuarios</span>
                </button>
              </li>
            )}
          </ul>
        </nav>

        {/* Footer User Info - Updated to match image */}
        <div className="border-t border-gray-900 bg-black p-0">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-bold uppercase text-sm shadow-sm">
               {userData?.name ? userData.name.substring(0, 2) : (currentUser?.email ? currentUser.email.substring(0, 2) : 'US')}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm text-white font-bold truncate">{userData?.name || currentUser?.email}</span>
              <span className="text-xs text-gray-500">{userData?.role || 'User'}</span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white hover:bg-gray-900 transition-colors py-4 border-t border-gray-900"
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <Modal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        title="Confirmar Cierre de Sesión"
        footer={
          <>
            <button 
              onClick={() => setShowLogoutConfirm(false)}
              className="px-4 py-2 text-gray-600 hover:text-black text-sm font-medium transition-colors border border-gray-300 rounded-lg hover:border-gray-400"
            >
              Cancelar
            </button>
            <button 
              onClick={handleLogout}
              className="bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cerrar Sesión
            </button>
          </>
        }
      >
        <p className="text-gray-600">¿Está seguro de que desea cerrar sesión?</p>
      </Modal>
    </>
  );
};