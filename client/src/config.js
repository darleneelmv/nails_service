// Datos de venta de Brillo (los usa la página principal "/").
// Cambia el WhatsApp por el tuyo para que los estudios interesados te escriban.
export const BRAND = 'Brillo';
export const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '';
export const DEMO_SLUG = 'starlight-studio';

export const PLANS = [
  { name: 'Esencial', price: 299, period: '/mes', features: ['Página web con tu link', 'Citas en línea 24/7', 'Clientas y servicios ilimitados', 'Galería de trabajos', 'Sincroniza con tu calendario'] },
  { name: 'Estudio', price: 449, period: '/mes', highlight: true, features: ['Todo lo de Esencial', 'Hasta 4 usuarias (equipo)', 'Reportes de ingresos', 'Bloqueo de días y horarios', 'Soporte por WhatsApp'] },
  { name: 'Pago único', price: 3500, period: ' + $149/mes', features: ['Configuración y fotos incluidas', 'Te lo dejo listo con tu marca', 'Mantenimiento y hosting mensual', 'Ideal si no quieres mensualidad alta'] },
];
