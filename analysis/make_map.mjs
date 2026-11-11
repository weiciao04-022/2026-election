import fs from 'fs';
import { feature } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { geoMercator, geoPath } from 'd3-geo';
const t = JSON.parse(fs.readFileSync('node_modules/taiwan-atlas/counties-10t.json','utf8'));
const ts = presimplify(t);
const t2 = simplify(ts, quantile(ts, 0.25));
const fc = feature(t2, t2.objects.counties);
const ID = {'臺北市':'TPE','新北市':'NWT','桃園市':'TAO','臺中市':'TXG','臺南市':'TNN','高雄市':'KHH','基隆市':'KEE','新竹市':'HSZ','新竹縣':'HSQ','苗栗縣':'MIA','南投縣':'NAN','彰化縣':'CHA','雲林縣':'YUN','嘉義市':'CYI','嘉義縣':'CYQ','屏東縣':'PIF','宜蘭縣':'ILA','臺東縣':'TTT','花蓮縣':'HUA','澎湖縣':'PEN','金門縣':'KIN','連江縣':'LNN'};
const W=470,H=800;
const main = {type:'FeatureCollection',features:fc.features.filter(f=>!['金門縣','連江縣'].includes(f.properties.COUNTYNAME))};
const pMain = geoMercator().fitExtent([[118,12],[462,788]], main);
const boxes = {LNN:[[14,40],[104,140]], KIN:[[14,190],[104,270]]};
const out=[];
for (const f of fc.features) {
  const name=f.properties.COUNTYNAME.replace(/^台/,'臺'), id=ID[name];
  if(!id) throw new Error(name);
  let proj=pMain, inset=null;
  if (boxes[id]) { proj=geoMercator().fitExtent(boxes[id], f); inset=boxes[id]; }
  const path=geoPath(proj).digits(1);
  const [cx,cy]=path.centroid(f);
  out.push({id,name,d:path(f),cx:+cx.toFixed(1),cy:+cy.toFixed(1),inset});
}
const js='window.TW_MAP = '+JSON.stringify({w:W,h:H,counties:out})+';\n';
fs.writeFileSync('map.js',js);
console.log(out.length, (js.length/1024).toFixed(0)+'KB', out.map(o=>o.id+':'+o.cx+','+o.cy).join(' '));
