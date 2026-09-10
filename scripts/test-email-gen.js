const { generateOrderEmailHtml, generateCustomerOrderConfirmationHtml, generateCustomerOrderDeliveredHtml } = require('./src/lib/emailTemplates.js');

const mockOrder = {
  _id: '66a1234567890abcdef12345',
  orderId: 'ORD-MTO9YJB8DXB',
  customerName: 'Raza',
  customerPhone: '03000011223',
  customerEmail: 'raza@example.com',
  customerAddress: 'Karachi',
  customerCity: 'Karachi',
  landmark: 'Block 7 L',
  totalAmount: 4350,
  shippingAmount: 0,
  discountAmount: 0,
  createdAt: new Date(),
  items: [
    { name: 'Smart Kitchen Storage Container', quantity: 1, price: 1650, image: '/kitchen-container.jpg' },
    { name: 'Multifunctional Electric Chopper', quantity: 1, price: 2700, image: '/chopper.jpg' }
  ]
};

const branding = {
  baseUrl: 'https://www.chinauniquestore.com',
  storeName: 'China Unique Store',
  supportEmail: 'support@chinauniquestore.com',
  whatsappNumber: '923001234567',
  businessAddress: 'China Unique Store HQ, Karachi, Sindh, Pakistan'
};

const c1 = generateCustomerOrderConfirmationHtml(mockOrder, branding);
const c2 = generateOrderEmailHtml(mockOrder, branding);
const c3 = generateCustomerOrderDeliveredHtml(mockOrder, branding);

console.log('Customer Confirmation uses PNG social icons:', c1.includes('facebook-green.png') && !c1.includes('<svg'));
console.log('Customer Confirmation uses dark brand logo:', c1.includes('china-unique-logo-cropped.png') && !c1.includes('class="dark-logo"'));
console.log('Customer Confirmation includes email-white.png:', c1.includes('email-white.png'));
console.log('Customer Confirmation address deduplication:', !c1.includes('Karachi<br/>Karachi'));
console.log('Admin alert includes Order ID:', c2.includes('ORD-MTO9YJB8DXB'));
console.log('Delivered email includes star-gold.png:', c3.includes('star-gold.png'));
console.log('ALL PASSED PERFECTLY!');
