const xmlrpc = require('xmlrpc');

const url = 'https://muqui-co.odoo.com';
const db = 'muquico-muqui-main-12715692';
const username = 'muqui.coo@gmail.com';
const password = 'Muqui-bebidas-20';

function getClient(path) {
  const isHttps = url.startsWith('https');
  const host = url.replace('https://', '').replace('http://', '').split(':')[0];
  const port = isHttps ? 443 : 80;
  return isHttps ? xmlrpc.createSecureClient({ host, port, path }) : xmlrpc.createClient({ host, port, path });
}

const common = getClient('/xmlrpc/2/common');
const models = getClient('/xmlrpc/2/object');

console.log('--- Probando filtro available_in_pos ---');

common.methodCall('authenticate', [db, username, password, {}], (error, uid) => {
  if (error || !uid) {
    console.error('Error de autenticación:', error);
    process.exit(1);
  }

  models.methodCall('execute_kw', [
    db, uid, password,
    'product.product', 'search_read',
    [[['sale_ok', '=', true], ['available_in_pos', '=', true]]],
    { fields: ['id', 'display_name', 'default_code', 'available_in_pos'], limit: 10 }
  ], (error, results) => {
    if (error) {
      console.error('Error al obtener productos:', error);
      process.exit(1);
    }

    console.log('✅ Éxito con filtro available_in_pos. Se obtuvieron:', results.length, 'productos');
    results.forEach(p => console.log(`- ${p.display_name} | Valido para POS: ${p.available_in_pos}`));
    process.exit(0);
  });
});
