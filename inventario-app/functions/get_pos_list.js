const axios = require('axios');
const xmlrpc = require('xmlrpc');
require('dotenv').config();

const url = process.env.ODOO_URL || 'https://muqui-co.odoo.com';
const db = process.env.ODOO_DB || 'muquico-muqui-main-12715692';
const username = process.env.ODOO_USER || 'muqui.coo@gmail.com';
const password = process.env.ODOO_PASSWORD || 'Muqui-bebidas-20';

function getClient(path) {
  const isHttps = url.startsWith('https');
  const host = url.replace('https://', '').replace('http://', '').split(':')[0];
  const port = isHttps ? 443 : 80;
  return isHttps ? xmlrpc.createSecureClient({ host, port, path }) : xmlrpc.createClient({ host, port, path });
}

const common = getClient('/xmlrpc/2/common');
const models = getClient('/xmlrpc/2/object');

console.log('--- Conectando a Odoo para obtener Puntos de Venta ---');

common.methodCall('version', [], (error, version) => {
  if (error) {
    console.error('Error de conexión:', error);
    return;
  }
  
  common.methodCall('authenticate', [db, username, password, {}], (error, uid) => {
    if (error || !uid) {
      console.error('Error de autenticación:', error);
      return;
    }

    // Buscar todos los pos.config (Puntos de Venta)
    models.methodCall('execute_kw', [
      db, uid, password,
      'pos.config', 'search_read',
      [[]], // Sin filtros para traer todos
      { fields: ['id', 'name'] }
    ], (error, results) => {
      if (error) {
        console.error('Error al obtener POS:', error);
        return;
      }

      console.log('\n=== LISTA DE PUNTOS DE VENTA EN ODOO ===');
      console.log('ID | Nombre (Usa este nombre en el Mapeo de la App)');
      console.log('----------------------------------------------------');
      results.forEach(pos => {
        console.log(`${pos.id} | ${pos.name}`);
      });
      console.log('----------------------------------------------------\n');
    });
  });
});
