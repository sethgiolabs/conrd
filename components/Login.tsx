import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login } = useInventory();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/'); // Redirigir al dashboard
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Credenciales incorrectas.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Intente más tarde.');
      } else {
        setError('Error al iniciar sesión. Verifique sus datos.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[450px] overflow-hidden">
        
        {/* Header Section - Black Background */}
        <div className="bg-black pt-12 pb-10 px-8 text-center">
             <img 
              src="https://res.cloudinary.com/dequhwtfu/image/upload/v1765154240/conradv2.png" 
              alt="Conrad Logo" 
              className="h-8 mx-auto mb-6 object-contain" 
              style={{filter: 'brightness(0) invert(1)'}} 
            />
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Bienvenido de nuevo
            </h2>
            <p className="text-gray-400 text-sm">
              Ingresa a tu cuenta para gestionar el inventario.
            </p>
        </div>

        {/* Form Section - White Background */}
        <div className="p-8 pb-10">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <i className="fa-regular fa-user"></i>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-gray-300 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-gray-900 focus:border-transparent sm:text-sm transition-shadow bg-white"
                  placeholder="admin@conrad.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-gray-300 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-gray-900 focus:border-transparent sm:text-sm transition-shadow bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all mt-6 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};