const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');

router.get('/catalog/search', authenticate, async (req, res, next) => {
  try {
    const searchParams = new URLSearchParams(req.query);
    searchParams.set('limit', '100'); // Traer más registros para que el filtrado de muertos no vacíe la página
    
    // Config values
    const apiUrl = process.env.VITE_API_BASE_URL || 'http://75.119.150.222:3010';
    const apiKey = process.env.VITE_INTERNAL_SECRET || 'sm_ecommerce_x2ve9yFf0aiDxh1HelezpVeyRAcngGwgEg3ZnSZwhGg2SaZrd2gQiysiVo86R3LcUZFFxZDSMADepof1jMLSumIbiqBRcbjyhvA78haaxnLrrbOuU3zqCi0kQXJf1gSc';
    
    const endpoint = `${apiUrl}/api/clavesalternas/filter-v2?${searchParams.toString()}`;
    console.log('[SEALMARKET] Fetching Catalog API:', endpoint);
    
    const fetchRes = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    if (!fetchRes.ok) {
      console.error('[SEALMARKET] API HTTP Error:', fetchRes.status);
      return res.status(fetchRes.status).json({ error: `El catálogo devolvió un error: ${fetchRes.statusText}` });
    }
    
    const data = await fetchRes.json();
    let results = data.data || [];
    
    if (Array.isArray(results) && results.length > 0) {
      // 1. Omitir productos "muertos" (precio 0, sin stock, y sin fecha de última compra)
      results = results.filter(item => {
        const totalExt = Object.values(item.existencias || {}).reduce((a, b) => a + (b || 0), 0);
        const isDead = (!item.PRECIO || item.PRECIO === 0) && totalExt === 0 && !item.FCH_ULTCOM;
        return !isDead;
      });

      // 2. Priorizar productos con existencia si hay múltiples opciones
      if (results.length > 1) {
        const conExistencia = results.filter(item => {
          const totalExt = Object.values(item.existencias || {}).reduce((a, b) => a + (b || 0), 0);
          return totalExt > 0;
        });
        
        if (conExistencia.length > 0) {
          results = conExistencia;
        } else {
          // Si TODOS están agotados, solo mostrar los que tienen fecha de última compra (FCH_ULTCOM != null)
          results = results.filter(item => item.FCH_ULTCOM);
        }
      }
      
      // Limitar los resultados a 50 para el vendedor humano (más laxo que la IA)
      results = results.slice(0, 50);
    }
    
    res.json({ data: results });
  } catch (error) {
    console.error('[SEALMARKET] Excepción:', error.message);
    res.status(500).json({ error: 'Hubo un fallo al leer los parámetros o conectar con el catálogo' });
  }
});

router.get('/clientes/rfc/:rfc', authenticate, async (req, res, next) => {
  try {
    const rfc = req.params.rfc;
    const apiUrl = process.env.VITE_API_BASE_URL || 'http://75.119.150.222:3010';
    const apiKey = process.env.VITE_INTERNAL_SECRET || 'sm_ecommerce_x2ve9yFf0aiDxh1HelezpVeyRAcngGwgEg3ZnSZwhGg2SaZrd2gQiysiVo86R3LcUZFFxZDSMADepof1jMLSumIbiqBRcbjyhvA78haaxnLrrbOuU3zqCi0kQXJf1gSc';
    
    const endpoint = `${apiUrl}/api/clientes/rfc/${rfc}`;
    
    const fetchRes = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    if (!fetchRes.ok) {
      if (fetchRes.status === 404) return res.status(404).json({ error: 'RFC no encontrado' });
      return res.status(fetchRes.status).json({ error: `La API devolvió un error: ${fetchRes.statusText}` });
    }
    
    const data = await fetchRes.json();
    res.json(data);
  } catch (error) {
    console.error('[SEALMARKET] Excepción al buscar RFC:', error.message);
    res.status(500).json({ error: 'Hubo un fallo al obtener los datos del RFC' });
  }
});

router.get('/catalog/familias', authenticate, async (req, res, next) => {
  try {
    const apiUrl = process.env.VITE_API_BASE_URL || 'http://75.119.150.222:3010';
    const apiKey = process.env.VITE_INTERNAL_SECRET || 'sm_ecommerce_x2ve9yFf0aiDxh1HelezpVeyRAcngGwgEg3ZnSZwhGg2SaZrd2gQiysiVo86R3LcUZFFxZDSMADepof1jMLSumIbiqBRcbjyhvA78haaxnLrrbOuU3zqCi0kQXJf1gSc';
    
    const endpoint = `${apiUrl}/familias`;
    console.log('[SEALMARKET] Fetching Familias API:', endpoint);
    
    const fetchRes = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    if (!fetchRes.ok) {
      console.error('[SEALMARKET] API HTTP Error fetching familias:', fetchRes.status);
      return res.status(fetchRes.status).json({ error: `La API de familias devolvió un error: ${fetchRes.statusText}` });
    }
    
    const data = await fetchRes.json();
    res.json(data); // Returns the array of families
  } catch (error) {
    console.error('[SEALMARKET] Excepción al obtener familias:', error.message);
    res.status(500).json({ error: 'Hubo un fallo al obtener las familias' });
  }
});

module.exports = router;
