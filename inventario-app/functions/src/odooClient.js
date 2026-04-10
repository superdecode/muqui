const xmlrpc = require('xmlrpc');

class OdooClient {
  constructor(url, db, username, password) {
    this.url = url;
    this.db = db;
    this.username = username;
    this.password = password;
    this.uid = null;

    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';

    const createClient = isHttps ? xmlrpc.createSecureClient : xmlrpc.createClient;
    this.client = createClient({
      host: urlObj.hostname,
      port: isHttps ? 443 : 80,
      path: '/xmlrpc/2/common',
      rejectUnauthorized: false,
    });

    this.objectClient = (isHttps ? xmlrpc.createSecureClient : xmlrpc.createClient)({
      host: urlObj.hostname,
      port: isHttps ? 443 : 80,
      path: '/xmlrpc/2/object',
      rejectUnauthorized: false,
    });
  }

  _call(client, method, params) {
    return new Promise((resolve, reject) => {
      client.methodCall(method, params, (error, value) => {
        if (error) reject(new Error(String(error)));
        else resolve(value);
      });
    });
  }

  async authenticate() {
    this.uid = await this._call(this.client, 'authenticate', [
      this.db, this.username, this.password, {},
    ]);
    if (!this.uid) throw new Error('Odoo auth failed: invalid credentials');
    return this.uid;
  }

  async callKW(model, method, args = [], kwargs = {}) {
    if (!this.uid) await this.authenticate();
    return this._call(this.objectClient, 'execute_kw', [
      this.db, this.uid, this.password, model, method, args, kwargs,
    ]);
  }

  // Enriquece un product_id con SKU de variante y SKU del template padre
  async enrichProductSKUs(productIds) {
    const products = await this.callKW('product.product', 'read', [productIds], {
      fields: ['id', 'default_code', 'product_tmpl_id'],
    });

    const templateIds = [...new Set(products.map(p => p.product_tmpl_id[0]))];
    const templates = await this.callKW('product.template', 'read', [templateIds], {
      fields: ['id', 'default_code'],
    });

    const templateMap = Object.fromEntries(templates.map(t => [t.id, t.default_code]));

    return Object.fromEntries(products.map(p => [
      p.id,
      {
        productSKU: p.default_code || null,
        productTemplateSKU: templateMap[p.product_tmpl_id[0]] || null,
      },
    ]));
  }

  // Obtiene líneas de una sale.order con SKU de variante + template
  async getOrderLines(orderId) {
    const saleOrder = await this.callKW('sale.order', 'read', [[orderId]], {
      fields: ['order_line'],
    });

    if (!saleOrder || saleOrder.length === 0) {
      throw new Error(`Sale order ${orderId} not found`);
    }

    const lineIds = saleOrder[0].order_line;
    if (!lineIds || lineIds.length === 0) return [];

    const lines = await this.callKW('sale.order.line', 'read', [lineIds], {
      fields: ['product_id', 'product_uom_qty', 'price_unit'],
    });

    const productIds = lines.map(l => l.product_id[0]);
    const skuMap = await this.enrichProductSKUs(productIds);

    return lines.map(line => ({
      productId: line.product_id[0],
      productName: line.product_id[1],
      productSKU: skuMap[line.product_id[0]]?.productSKU || null,
      productTemplateSKU: skuMap[line.product_id[0]]?.productTemplateSKU || null,
      quantity: line.product_uom_qty,
      priceUnit: line.price_unit,
    }));
  }

  // Obtiene líneas de un pos.order con SKU de variante + template
  async getPOSOrderLines(posOrderId) {
    const posOrder = await this.callKW('pos.order', 'read', [[posOrderId]], {
      fields: ['lines'],
    });

    if (!posOrder || posOrder.length === 0) {
      throw new Error(`POS order ${posOrderId} not found`);
    }

    const lineIds = posOrder[0].lines;
    if (!lineIds || lineIds.length === 0) return [];

    const lines = await this.callKW('pos.order.line', 'read', [lineIds], {
      fields: ['product_id', 'qty', 'price_unit'],
    });

    const productIds = lines.map(l => l.product_id[0]);
    const skuMap = await this.enrichProductSKUs(productIds);

    return lines.map(line => ({
      productId: line.product_id[0],
      productName: line.product_id[1],
      productSKU: skuMap[line.product_id[0]]?.productSKU || null,
      productTemplateSKU: skuMap[line.product_id[0]]?.productTemplateSKU || null,
      quantity: line.qty,
      priceUnit: line.price_unit,
    }));
  }
}

module.exports = OdooClient;
