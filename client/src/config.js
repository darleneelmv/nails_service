// Datos de venta de Brillo (los usa la página principal "/").
// Cambia el WhatsApp por el tuyo para que los estudios interesados te escriban.
export const BRAND = 'Brillo';
export const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '4381113112';
export const DEMO_SLUG = 'starlight-studio';

export const PLANS = [
  { name: 'Básico', tagline: 'Con tu marca; tú subes tus fotos', price: 1800, monthly: 99, features: ['Te la entrego con tu logo, colores y portada', 'Tú subes tus fotos, servicios y precios desde tu panel', 'Panel completo: editas todo cuando quieras', 'Citas en línea 24/7 y sincronización con tu calendario', 'Clientas, historial e ingresos', 'Accesos para tu equipo', 'Tu página con el link del sistema'] },
  { name: 'Pro · Llave en mano', tagline: 'Te la entrego lista, con tu dominio', price: 2500, monthly: 149, highlight: true, features: ['Todo lo del Básico, más:', 'Tu dominio propio a tu nombre, primer año incluido', 'Renovación del dominio incluida en la mensualidad', 'Yo subo todo por ti: fotos, servicios, precios y horario', 'Código QR listo para imprimir', 'Soporte prioritario por WhatsApp'] },
];
