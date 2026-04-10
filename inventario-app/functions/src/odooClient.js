const xmlrpc = require('xmlrpc');
const https = require('https');

class OdooClient {
  constructor(url, db, username, password) {
    this.url = url;
    this.db = db;
    this.username = username;
    this.password = password;
    this.uid = null;

    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';

    this.client = xmlrpc.createSecureClient({
      host: urlObj.hostname,
      port: isHttps ? 443 : 80,
      path: '/xmlrpc/2',
      isSecure: isHttps,
      rejectUnauthorized: false
    });
  }

  async authenticate() {
    return new Promise((resolve, reject) => {
      this.client.methodCall(
        'common',
        ['authenticate', this.db, this.username, this.password, {}],
        (error, value) => {
          if (error) {
            reject(new Error(`Odoo auth failed: ${error}`));
          } else {
            this.uid = value;
            resolve(value);
          }
        }
      );
    });
  }

  async callKW(model, method, args = [], kwargs = {}) {
    if (!this.uid) await this.authenticate();

    return new Promise((resolve, reject) => {
      this.client.methodCall(
        'object',
        ['execute_kw', this.db, this.uid, this.password, model, method, args, kwargs],
        (error, value) => {
          if (error) {
            reject(new Error(`Odoo call failed on ${model}.${method}: ${error}`));
          } else {
            resolve(value);
          }
        }
      );
    });
  }

  async getOrderLines(orderId) {
    const saleOrder = await this.callKW('sale.order', 'read', [[orderId]], { fields: ['order_line'] });
    if (!saleOrder || saleOrder.length === 0) {
      throw new Error(`Sale order ${orderId} not found`);
    }

    const lineIds = saleOrder[0].order_line;
    const lines = await this.callKW('sale.order.line', 'read', [lineIds], {
      fields: ['product_id', 'product_uom_qty', 'product_uom'],
    });

    return lines.map(line => ({
      productId: line.product_id[0],
      productName: line.product_id[1],
      quantity: line.product_uom_qty,
      uom: line.product_uom[1],
    }));
  }

  async getBOM(productId) {
    const boms = await this.callKW('mrp.bom', 'search_read', [
      [['product_id', '=', productId], ['active', '=', true]],
    ], {
      fields: ['bom_line_ids'],
      limit: 1,
    });

    if (!boms || boms.length === 0) {
      return [];
    }

    const bomLineIds = boms[0].bom_line_ids;
    const bomLines = await this.callKW('mrp.bom.line', 'read', [bomLineIds], {
      fields: ['product_id', 'product_qty'],
    });

    return bomLines.map(line => ({
      componentId: line.product_id[0],
      componentName: line.product_id[1],
      quantity: line.product_qty,
    }));
  }

  async getProductSKU(productId) {
    const products = await this.callKW('product.product', 'read', [[productId]], { fields: ['default_code', 'name'] });
    if (!products || products.length === 0) {
      return { sku: null, name: 'Unknown' };
    }
    return {
      sku: products[0].default_code,
      name: products[0].name,
    };
  }
}

module.exports = OdooClient;
