// Datos de venta de Brillo (los usa la página principal "/").
// Cambia el WhatsApp por el tuyo para que los estudios interesados te escriban.
export const BRAND = 'Brillo';
export const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '';
export const DEMO_SLUG = 'starlight-studio';

export const PLANS = [
  { name: 'Básico', tagline: 'Tú la configuras a tu gusto', price: 1800, monthly: 99, features: ['Página web con link del sistema', 'Panel completo: servicios, precios, horarios y colores', 'Subes tus fotos y trabajos cuando quieras', 'Citas en línea 24/7 y sincronización con tu calendario', 'Clientas, historial e ingresos', 'Accesos para tu equipo'] },
  { name: 'Pro · Llave en mano', tagline: 'Te la entrego lista, con tu dominio', price: 2500, monthly: 149, highlight: true, features: ['Todo lo del Básico', 'Subo tus fotos, servicios, precios y horario', 'Logo, portada y colores de tu marca', 'Tu dominio propio (tuestudio.com.mx), primer año incluido', 'Renovación del dominio incluida en la mensualidad', 'Soporte prioritario por WhatsApp'] },
];
