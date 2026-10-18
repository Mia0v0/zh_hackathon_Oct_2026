const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const reverseGeocodeCache = new Map();
let lastNominatimRequest = 0;
let nominatimQueue = Promise.resolve();

function requestNominatim(url) {
  const request = nominatimQueue.then(async () => {
    const delay = Math.max(0, 1000 - (Date.now() - lastNominatimRequest));
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    lastNominatimRequest = Date.now();
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OnMyWayCampusDelivery/1.0 (user-triggered location lookup)', 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) throw new Error(`OpenStreetMap returned ${response.status}`);
    return response.json();
  });
  nominatimQueue = request.catch(() => {});
  return request;
}

async function lookupOpenStreetMap(lat, lng) {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseGeocodeCache.has(cacheKey)) return reverseGeocodeCache.get(cacheKey);
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lng);
  url.searchParams.set('zoom', '18');
  const data = await requestNominatim(url);
  const address = data.address || {};
  const name = data.name || address.building || address.amenity || address.university || address.college || address.school || address.hospital || address.library || address.office || address.shop || address.tourism || address.leisure || address.house_name || address.road || data.display_name?.split(',')[0] || null;
  const result = { name, source: 'openstreetmap' };
  reverseGeocodeCache.set(cacheKey, result);
  if (reverseGeocodeCache.size > 500) reverseGeocodeCache.delete(reverseGeocodeCache.keys().next().value);
  return result;
}

http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/api/reverse-geocode') {
    const query = new URL(req.url, 'http://localhost').searchParams;
    const lat = Number(query.get('lat'));
    const lng = Number(query.get('lng'));
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: 'Invalid coordinates.' }));
      return;
    }
    try {
      if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
          const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
          url.searchParams.set('latlng', `${lat},${lng}`);
          url.searchParams.set('key', process.env.GOOGLE_MAPS_API_KEY);
          const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
          if (!response.ok) throw new Error(`Google Maps returned ${response.status}`);
          const data = await response.json();
          const result = (data.results || []).find(item => item.types?.some(type => ['premise', 'establishment', 'point_of_interest'].includes(type))) || data.results?.[0];
          const building = result?.address_components?.find(component => component.types?.some(type => ['premise', 'establishment', 'point_of_interest'].includes(type)));
          if (data.status === 'OK' && result) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ name: building?.long_name || result.formatted_address || null, source: 'google' }));
            return;
          }
        } catch (error) {
          console.error('Google Maps reverse geocoding failed:', error.message);
        }
      }
      const result = await lookupOpenStreetMap(lat, lng);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(result));
    } catch (error) {
      console.error('Reverse geocoding failed:', error.message);
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: 'Nearby building lookup failed.' }));
    }
    return;
  }
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = path.join(root, requested);
  if (!file.startsWith(root)) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(process.env.PORT || 3000, '0.0.0.0', () => console.log(`On My Way (OMW) listening on ${process.env.PORT || 3000}`));
