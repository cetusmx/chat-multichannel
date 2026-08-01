import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric or hyphens without spaces or special characters').max(63, 'Slug must be max 63 characters'),
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(100, 'First name must be less than 100 characters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(100, 'Last name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be max 72 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});

export default function CreateTenantModal({ isOpen, onClose, onSuccess, triggerRef }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    }
  });

  const slugValue = watch('slug');

  const handleDismiss = useCallback(() => {
    if (isSubmitting) return;
    reset();
    setShowPassword(false);
    onClose();
    if (triggerRef && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [isSubmitting, reset, onClose, triggerRef]);

  // Click outside and ESC handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Use mousedown instead of click to prevent issues with text selection ending outside
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleDismiss]);

  // Auto focus on open
  useEffect(() => {
    if (isOpen) {
      const firstInput = document.getElementById('tenant-name');
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [isOpen]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const specials = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
    
    const getRandomChar = (str) => {
      const array = new Uint8Array(1);
      let rand;
      do {
        window.crypto.getRandomValues(array);
        rand = array[0];
      } while (rand >= 256 - (256 % str.length));
      return str[rand % str.length];
    };

    let passArr = [
      getRandomChar(uppercase),
      getRandomChar(numbers),
      getRandomChar(specials)
    ];
    
    const all = chars + uppercase + numbers + specials;
    for (let i = 0; i < 9; i++) {
      passArr.push(getRandomChar(all));
    }
    
    // Fisher-Yates shuffle
    for (let i = passArr.length - 1; i > 0; i--) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      const j = array[0] % (i + 1);
      [passArr[i], passArr[j]] = [passArr[j], passArr[i]];
    }
    
    setValue('password', passArr.join(''), { shouldValidate: true });
    setShowPassword(true);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    abortControllerRef.current = new AbortController();

    try {
      await api.post('/api/superadmin/tenants', data, {
        signal: abortControllerRef.current.signal
      });

      // 1. Close Modal explicitly
      reset();
      setShowPassword(false);
      onClose();
      if (triggerRef && triggerRef.current) {
        triggerRef.current.focus();
      }
      // 2. Show success toast
      toast.success('Inquilino creado exitosamente');
      // 4. Trigger refresh
      if (onSuccess) onSuccess();

    } catch (error) {
      if (error.name === 'AbortError') return;

      if (error.status === 409) {
        const errField = error.data?.field || '';
        const errMsgStr = error.data?.message || '';
        
        let field = 'slug';
        let msg = 'El dominio ya existe';

        if (errField === 'email' || errMsgStr.includes('email')) {
          field = 'email';
          msg = 'El email ya está en uso';
        } else if (errField === 'name' || errMsgStr.includes('name')) {
          field = 'name';
          msg = 'El nombre de empresa ya está en uso';
        }
        
        toast.error(msg);
        setError(field, { type: 'manual', message: msg });
      } else if (error.status === 400 && Array.isArray(error.data?.errors)) {
        // map field errors
        error.data.errors.forEach(err => {
          if (err.path && err.path[0]) {
            setError(err.path[0], { type: 'manual', message: err.message });
          }
        });
        toast.error('Por favor revisa los errores en el formulario');
      } else {
        toast.error(error.data?.message || 'Error al crear el inquilino');
      }
    } finally {
      setIsSubmitting(false);
    }

  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-800">Nuevo Inquilino</h2>
          <button 
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="create-tenant-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Empresa */}
              <div className="space-y-2">
                <label htmlFor="tenant-name" className="block text-sm font-medium text-gray-700">Empresa *</label>
                <input
                  id="tenant-name"
                  type="text"
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Ej. Acme Corp"
                  {...register('name')}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              {/* Dominio */}
              <div className="space-y-2">
                <label htmlFor="tenant-slug" className="block text-sm font-medium text-gray-700">Dominio *</label>
                <div className="relative">
                  <input
                    id="tenant-slug"
                    type="text"
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${errors.slug ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="acmecorp"
                    {...register('slug')}
                  />
                  {slugValue && !errors.slug && (
                    <p className="absolute -bottom-6 left-0 text-xs text-gray-500">
                      {slugValue}.yourdomain.com
                    </p>
                  )}
                </div>
                {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
              </div>

              {/* Nombre Admin */}
              <div className="space-y-2 mt-4 md:mt-0">
                <label htmlFor="admin-firstName" className="block text-sm font-medium text-gray-700">Nombre del Admin *</label>
                <input
                  id="admin-firstName"
                  type="text"
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="John"
                  {...register('firstName')}
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>

              {/* Apellido Admin */}
              <div className="space-y-2 mt-4 md:mt-0">
                <label htmlFor="admin-lastName" className="block text-sm font-medium text-gray-700">Apellido del Admin *</label>
                <input
                  id="admin-lastName"
                  type="text"
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Doe"
                  {...register('lastName')}
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>

              {/* Email Admin */}
              <div className="space-y-2 md:col-span-2 mt-4 md:mt-0">
                <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700">Email Admin *</label>
                <input
                  id="admin-email"
                  type="email"
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="john@acmecorp.com"
                  {...register('email')}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              {/* Contraseña */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700">Contraseña *</label>
                  <button 
                    type="button" 
                    onClick={generatePassword}
                    disabled={isSubmitting}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                  >
                    <KeyRound size={12} />
                    Generar segura
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 pr-10 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-tenant-form"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Creando...
              </>
            ) : (
              'Crear Inquilino'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
