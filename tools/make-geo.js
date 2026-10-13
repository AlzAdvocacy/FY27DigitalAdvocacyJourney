// Rebuild src/geo.json: simplified Albers USA state polygons + label points keyed by postal code.
// Only needed if the map itself changes. One-time setup in any folder:
//   npm install us-atlas@3.0.1 topojson-client@3.1.0
// then: node tools/make-geo.js <that folder> > src/geo.json
const path=require('path');
const D=path.join(process.argv[2]||'.','node_modules');
const topo=require(path.join(D,'us-atlas/states-albers-10m.json'));
const tc=require(path.join(D,'topojson-client'));
const FIPS={'01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY'};
const fc=tc.feature(topo,topo.objects.states);
function area(r){let a=0;for(let i=0,j=r.length-1;i<r.length;j=i++)a+=(r[j][0]*r[i][1]-r[i][0]*r[j][1]);return a/2;}
function dp(pts,eps){ if(pts.length<4) return pts; const keep=new Uint8Array(pts.length); keep[0]=keep[pts.length-1]=1; const st=[[0,pts.length-1]];
  while(st.length){ const [a,b]=st.pop(); let mx=0,mi=-1; const [x1,y1]=pts[a],[x2,y2]=pts[b]; const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1e-9;
    for(let i=a+1;i<b;i++){ const d=Math.abs(dy*pts[i][0]-dx*pts[i][1]+x2*y1-y2*x1)/L; if(d>mx){mx=d;mi=i;} }
    if(mx>eps){ keep[mi]=1; st.push([a,mi],[mi,b]); } }
  return pts.filter((_,i)=>keep[i]); }
function simplifyRing(r,eps){ // ring is closed (first==last); split in two halves so DP keeps shape
  const open=r.slice(0,-1); if(open.length<8) return open; const h=Math.floor(open.length/2);
  const A=dp(open.slice(0,h+1),eps), B=dp(open.slice(h).concat([open[0]]),eps);
  return A.slice(0,-1).concat(B.slice(0,-1)); }
function pip(x,y,r){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}
function segDist(px,py,r){let m=1e9;for(let i=0,j=r.length-1;i<r.length;j=i++){const [ax,ay]=r[j],[bx,by]=r[i];const dx=bx-ax,dy=by-ay;const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));m=Math.min(m,Math.hypot(px-ax-t*dx,py-ay-t*dy));}return m;}
function polylabel(r){ // coarse grid search for the most interior point
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const [x,y] of r){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  let best=[(x0+x1)/2,(y0+y1)/2],bd=-1; const N=60;
  for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){const x=x0+(x1-x0)*i/N,y=y0+(y1-y0)*j/N; if(!pip(x,y,r))continue; const d=segDist(x,y,r); if(d>bd){bd=d;best=[x,y];}}
  return {p:best,d:bd}; }
const out={}; const EPS=0.45;
for(const f of fc.features){ const ab=FIPS[f.id]; if(!ab) throw new Error('fips '+f.id);
  const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  const keep=[]; let totalA=0, big=null, bigA=0;
  const tiny = ['DC','RI','DE'].includes(ab);
  for(const poly of polys){ const outer=poly[0]; const A=Math.abs(area(outer)); if(A>bigA){bigA=A;big=outer;} }
  for(const poly of polys){ const A=Math.abs(area(poly[0])); if(A<Math.max(1.2,bigA*0.004) && poly[0]!==big) continue;
    const rings=poly.map(r=>simplifyRing(r, tiny?0.12:EPS)).filter(r=>r.length>=3);
    // orientation: outer CCW in y-down? normalize: outer positive area
    if(area(rings[0])<0) rings[0].reverse(); for(let k=1;k<rings.length;k++) if(area(rings[k])>0) rings[k].reverse();
    totalA+=A; keep.push(rings.map(r=>r.map(([x,y])=>[Math.round(x*10)/10,Math.round(y*10)/10]))); }
  const lab=polylabel(big);
  out[ab]={p:keep, l:lab.p.map(v=>Math.round(v*10)/10), ld:Math.round(lab.d*10)/10, a:Math.round(totalA)}; }
const nv=Object.values(out).reduce((s,o)=>s+o.p.reduce((t,p)=>t+p.reduce((u,r)=>u+r.length,0),0),0);
console.error('states',Object.keys(out).length,'verts',nv);
process.stdout.write(JSON.stringify(out));
