/* FY27 Digital Advocacy Journey, cinematic edition.
   One continuous 3D world: a geographic map of the states floating over a dark mirror,
   with every chapter of the story staged on, above or beside it. All figures are computed
   from the #data block (exported from Quorum); nothing here is hardcoded except copy. */
(function(){
'use strict';

function boot(){
  const D = JSON.parse(document.getElementById('data').textContent);
  const GEO = JSON.parse(document.getElementById('geo').textContent);
  const META = JSON.parse(document.getElementById('meta').textContent);
  const N = D.national;
  const QS = new URLSearchParams(location.search);
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => Number(Math.round(n)).toLocaleString('en-US');
  const pct = (x,d=1) => (x*100).toFixed(d)+'%';
  const sum = a => a.reduce((x,y)=>x+y,0);
  const cum = (arr,t) => { let s=0; for(let i=0;i<4;i++){ if(t>=i+1) s+=arr[i]; else if(t>i) s+=arr[i]*(t-i); } return s; };
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const lerp = (a,b,t) => a+(b-a)*t;
  const ease3 = t => t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  const easeOut = t => 1-Math.pow(1-t,3);
  const asOf = new Date(D.asOf+'T12:00:00');
  const monthFull = ['July','August','September','October','November','December','January','February','March','April','May','June'];
  const monthShort = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
  const $ = id => document.getElementById(id);
  function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  // ---------- story math (same definitions as the original edition) ----------
  let gx0=1e9,gx1=-1e9,gy0=1e9,gy1=-1e9;
  for(const ab in GEO) for(const poly of GEO[ab].p) for(const [x,y] of poly[0]){ gx0=Math.min(gx0,x); gx1=Math.max(gx1,x); gy0=Math.min(gy0,y); gy1=Math.max(gy1,y); }
  const MAPW=34, K=MAPW/(gx1-gx0), GCX=(gx0+gx1)/2, GCY=(gy0+gy1)/2;
  const wx = x => (x-GCX)*K, wz = y => (y-GCY)*K;
  const NUDGE = {DC:[0.32,0.22], DE:[0.06,0.1], RI:[0.12,0.06]}; // keep tiny neighbours' columns from touching
  const states = Object.keys(GEO).filter(ab=>D.states[ab]).map((ab,i)=>{ const g=GEO[ab]; const n=NUDGE[ab]||[0,0];
    return Object.assign({ab, i, geo:g, meta:META[ab]||{nick:'',known:'',cap:''}, lx:wx(g.l[0])+n[0], lz:wz(g.l[1])+n[1]}, D.states[ab]); });
  const byAb = Object.fromEntries(states.map(s=>[s.ab,s]));
  const total27=cum(N.a,4), total26=cum(N.a26,4), ratio=total27/total26;
  const new27=cum(N.n,4), new26=cum(N.n26,4);
  const byAct=states.slice().sort((a,b)=>cum(b.a,4)-cum(a.a,4)); const stSum=states.reduce((x,s)=>x+cum(s.a,4),0); const stSum26=states.reduce((x,s)=>x+cum(s.a26,4),0);
  const grow=states.filter(s=>cum(s.a26,4)>=50).map(s=>({ab:s.ab,g:cum(s.a,4)/cum(s.a26,4)})).sort((a,b)=>b.g-a.g);
  const down=states.filter(s=>cum(s.a26,4)>0 && cum(s.a,4)<cum(s.a26,4));
  const ahead=states.filter(s=>!down.includes(s));
  const byRate=states.filter(s=>s.c>500).sort((a,b)=>b.tk/b.c-a.tk/a.c);
  const zeroText=states.filter(s=>cum(s.t,4)===0);
  const fyDay=Math.round((asOf-new Date('2026-07-01T12:00:00'))/86400000)+1;
  const fyPct=Math.round(fyDay/365*100);
  const paceA=total27/N.f26, paceN=new27/N.f26n;
  const stC=sum(states.map(s=>s.c)), stC26=sum(states.map(s=>s.c26));
  const noStateC=N.c-stC, noStateC26=N.c26-stC26;
  const perActor=(total27-N.sigs)/N.tk;
  const juris = states.length===51 ? 'the 50 states and DC' : states.length+' states';
  const PK=N.a.indexOf(Math.max(...N.a)), PKM=monthFull[PK], best26=Math.max(...N.full12), beatAll=N.a[PK]>best26; // the FY27 peak month so far
  const dayWord = fyDay===100 ? 'hundred' : String(fyDay);

  // ---------- renderer ----------
  const canvas=$('c');
  let renderer;
  try{ renderer=new THREE.WebGLRenderer({canvas, antialias:false, powerPreference:'high-performance', stencil:false}); }
  catch(e){ return fallback(); }
  if(!renderer.getContext()) return fallback();
  const GL2=renderer.capabilities.isWebGL2;
  const HDR = GL2 ? !!renderer.extensions.get('EXT_color_buffer_float') : !!(renderer.extensions.get('OES_texture_half_float') && renderer.extensions.get('EXT_color_buffer_half_float'));
  const RTT = HDR ? THREE.HalfFloatType : THREE.UnsignedByteType;
  let quality = QS.get('q')==='low' ? 0 : (QS.get('q')==='high' ? 2 : 2);
  const dprFor = q => Math.min(window.devicePixelRatio||1, q>=2?1.5:1);
  renderer.setPixelRatio(dprFor(quality));
  renderer.setClearColor(0x000000,1);
  renderer.outputEncoding=THREE.LinearEncoding; renderer.toneMapping=THREE.NoToneMapping;
  const lin = h => new THREE.Color(h).convertSRGBToLinear();

  const scene=new THREE.Scene();
  const FOGC=lin(0x0c0614); scene.fog=new THREE.FogExp2(FOGC, 0.0095);
  const camera=new THREE.PerspectiveCamera(36,1,0.1,900);

  let composer, bloom, finalPass;
  function makeComposer(){
    const w=innerWidth, h=innerHeight, pars={format:THREE.RGBAFormat,type:RTT,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter};
    THREE.__bloomType = RTT;
    composer=new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(w,h,pars));
    // RenderPass draws into readBuffer (renderTarget2); only that one needs MSAA
    if(GL2 && quality>=1){ composer.renderTarget2.dispose(); const ms=new THREE.WebGLMultisampleRenderTarget(w,h,pars); ms.samples=4; composer.renderTarget2=ms; composer.readBuffer=ms; }
    composer.addPass(new THREE.RenderPass(scene,camera));
    bloom=new THREE.UnrealBloomPass(new THREE.Vector2(w,h), 0.6, 0.5, 0.82);
    composer.addPass(bloom);
    finalPass=new THREE.ShaderPass(FinalShader);
    finalPass.renderToScreen=true; finalPass.needsSwap=false; composer.addPass(finalPass);
  }
  const FinalShader={
    uniforms:{tDiffuse:{value:null},uTime:{value:0},uExposure:{value:HDR?1.06:1.35},uGrain:{value:reduceMotion?0.025:0.045},uVig:{value:1},uCA:{value:0.9},uFade:{value:0},uFlash:{value:0},uRes:{value:new THREE.Vector2(1,1)}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:`
      uniform sampler2D tDiffuse; uniform float uTime,uExposure,uGrain,uVig,uCA,uFade,uFlash; uniform vec2 uRes; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
      float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      vec3 srgb(vec3 c){ return mix(c*12.92, 1.055*pow(c,vec3(1.0/2.4))-0.055, step(0.0031308,c)); }
      void main(){
        vec2 d=vUv-0.5; float r2=dot(d,d);
        vec2 off=d*r2*0.012*uCA;
        vec3 c=vec3(texture2D(tDiffuse,vUv+off).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-off).b);
        c*=uExposure;
        c=aces(c);
        c=srgb(c);
        c=c*vec3(1.0,0.985,1.02)+vec3(0.012,0.004,0.022)*(1.0-c);
        float v=smoothstep(0.95,0.25,length(d*vec2(1.0,0.82)));
        c*=mix(1.0,0.35+0.65*v,uVig);
        c+=(hash(vUv*uRes+fract(uTime*7.13)*91.7)-0.5)*uGrain;
        c=mix(c,vec3(1.0,0.95,0.86),uFlash);
        c*=1.0-uFade;
        gl_FragColor=vec4(c,1.0);
      }`
  };
  makeComposer();

  // ---------- shared shader bits ----------
  const U = {uTime:{value:0}, uPx:{value:600}};
  const PILLAR_V=`
    #ifdef USE_INSTANCING
      attribute vec3 aColor; attribute float aGlow; attribute float aH;
    #else
      uniform vec3 uColor; uniform float uGlow; uniform float uH;
    #endif
    varying vec3 vColor; varying float vGlow; varying float vY; varying float vH; varying vec3 vN; varying vec3 vV; varying float vCap;
    void main(){
      #ifdef USE_INSTANCING
        mat4 m=modelMatrix*instanceMatrix; vColor=aColor; vGlow=aGlow; vH=aH;
      #else
        mat4 m=modelMatrix; vColor=uColor; vGlow=uGlow; vH=uH;
      #endif
      vec4 wp=m*vec4(position,1.0);
      vY=position.y; vN=normalize(mat3(m)*normal); vCap=step(0.9,normal.y);
      vV=normalize(cameraPosition-wp.xyz);
      gl_Position=projectionMatrix*viewMatrix*wp;
    }`;
  const PILLAR_F=`
    uniform float uTime; uniform float uAlpha;
    varying vec3 vColor; varying float vGlow; varying float vY; varying float vH; varying vec3 vN; varying vec3 vV; varying float vCap;
    void main(){
      float f=1.0-abs(dot(normalize(vN),normalize(vV)));
      float g=mix(0.42,1.1,vY);
      float band=smoothstep(0.9,1.0,fract(vY*vH*0.6-uTime*0.35))*0.4*(1.0-vCap);
      vec3 c=vColor*(g+pow(f,2.2)*1.5+band);
      c=mix(c,vColor*2.0+0.2,vCap);
      gl_FragColor=vec4(c*vGlow,uAlpha);
    }`;
  const GHOST_F=`
    uniform float uAlpha;
    varying vec3 vColor; varying float vGlow; varying float vY; varying float vH; varying vec3 vN; varying vec3 vV; varying float vCap;
    void main(){
      float f=1.0-abs(dot(normalize(vN),normalize(vV)));
      float a=(0.05+pow(f,3.0)*0.55)*(0.3+0.7*vY)*(1.0-vCap*0.6);
      gl_FragColor=vec4(vColor*a*vGlow*uAlpha,1.0);
    }`;
  const EMIT_F=`
    uniform float uAlpha; varying vec3 vColor; varying float vGlow; varying float vY; varying float vH; varying vec3 vN; varying vec3 vV; varying float vCap;
    void main(){ gl_FragColor=vec4(vColor*vGlow*uAlpha,1.0); }`;
  function pillarMat(frag, opts){ return new THREE.ShaderMaterial(Object.assign({uniforms:Object.assign({uTime:U.uTime, uAlpha:{value:1}, uColor:{value:new THREE.Color(1,1,1)}, uGlow:{value:1}, uH:{value:1}},(opts&&opts.uniforms)||{}), vertexShader:PILLAR_V, fragmentShader:frag}, opts&&opts.mat||{})); }
  const ADD = {transparent:true, blending:THREE.AdditiveBlending, depthWrite:false};

  // ---------- sky, stars, mirror floor, light ----------
  const sky=new THREE.Mesh(new THREE.SphereGeometry(600,48,24), new THREE.ShaderMaterial({side:THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{uTime:U.uTime, uLift:{value:1}},
    vertexShader:'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:`uniform float uTime,uLift; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p,vec3(17.1,113.7,71.3)))*43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){ float y=vD.y;
        vec3 zen=vec3(0.004,0.002,0.008), hor=vec3(0.045,0.016,0.07), low=vec3(0.012,0.006,0.02);
        vec3 c=mix(hor,zen,smoothstep(0.02,0.6,y)); c=mix(c,low,smoothstep(0.0,-0.25,y));
        float neb=n3(vD*3.0+vec3(0.0,uTime*0.004,0.0))*0.6+n3(vD*7.0)*0.4;
        c+=vec3(0.05,0.012,0.07)*pow(neb,3.0)*smoothstep(-0.05,0.5,y)*uLift;
        c+=vec3(0.09,0.04,0.02)*exp(-abs(y)*18.0)*0.35*uLift;
        gl_FragColor=vec4(c,1.0); }`}));
  scene.add(sky);

  const stars=(function(){ const n=2600, r=rng(11), p=new Float32Array(n*3), a=new Float32Array(n);
    for(let i=0;i<n;i++){ const u=r()*2-1, th=r()*Math.PI*2, y=Math.abs(u)*0.92+0.04, rr=Math.sqrt(1-y*y); p[i*3]=Math.cos(th)*rr*520; p[i*3+1]=y*520-30; p[i*3+2]=Math.sin(th)*rr*520; a[i]=r(); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3)); g.setAttribute('aR',new THREE.BufferAttribute(a,1));
    const m=new THREE.ShaderMaterial(Object.assign({uniforms:{uTime:U.uTime,uA:{value:1}}, fog:false,
      vertexShader:'attribute float aR; uniform float uTime,uA; varying float vA; void main(){ vA=uA*(0.25+0.75*aR)*(0.6+0.4*sin(uTime*(0.6+aR*2.0)+aR*80.0)); vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=1.0+aR*aR*2.4; gl_Position=projectionMatrix*mv; }',
      fragmentShader:'varying float vA; void main(){ float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0) discard; gl_FragColor=vec4(vec3(0.85,0.8,1.0)*vA*(1.0-d),1.0); }'},ADD));
    const pts=new THREE.Points(g,m); scene.add(pts); return pts; })();

  const FLOOR_Y=-1.05;
  let mirrorRT=null;
  const floor=(function(){
    const geo=new THREE.CircleGeometry(420,96);
    const mat=new THREE.ShaderMaterial({ uniforms:{tDiffuse:{value:null}, textureMatrix:{value:new THREE.Matrix4()}, uStrength:{value:0.62}, uTex:{value:new THREE.Vector2(1/512,1/512)}, uMirror:{value:1}},
      extensions:{derivatives:true},
      vertexShader:'uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vUv=textureMatrix*vec4(position,1.0); vW=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:`uniform sampler2D tDiffuse; uniform float uStrength,uMirror; uniform vec2 uTex; varying vec4 vUv; varying vec3 vW;
        void main(){ vec2 uv=vUv.xy/vUv.w; vec3 c=vec3(0.0);
          if(uMirror>0.5){ vec2 o=uTex*2.5;
            c=texture2D(tDiffuse,uv).rgb*0.36+(texture2D(tDiffuse,uv+vec2(o.x,0.0)).rgb+texture2D(tDiffuse,uv-vec2(o.x,0.0)).rgb+texture2D(tDiffuse,uv+vec2(0.0,o.y)).rgb+texture2D(tDiffuse,uv-vec2(0.0,o.y)).rgb)*0.16; }
          float d=length(vW.xz);
          float fade=1.0-smoothstep(14.0,85.0,d);
          vec2 q=vW.xz/2.0; vec2 g=abs(fract(q-0.5)-0.5)/fwidth(q); float line=1.0-min(min(g.x,g.y),1.0);
          vec3 base=vec3(0.006,0.003,0.01);
          vec3 col=base+c*uStrength*fade+vec3(0.05,0.022,0.07)*line*0.38*fade*(1.0-smoothstep(4.0,60.0,d)*0.6);
          gl_FragColor=vec4(col,1.0); }`});
    const m=new THREE.Mesh(geo,mat); m.rotation.x=-Math.PI/2; m.position.y=FLOOR_Y; scene.add(m);
    // planar reflection, adapted from three.js Reflector (MIT)
    const plane=new THREE.Plane(), normal=new THREE.Vector3(), rwp=new THREE.Vector3(), cwp=new THREE.Vector3(), rot=new THREE.Matrix4(), look=new THREE.Vector3(), clip=new THREE.Vector4(), view=new THREE.Vector3(), target=new THREE.Vector3(), q=new THREE.Vector4(), vcam=new THREE.PerspectiveCamera();
    m.onBeforeRender=function(r,sc,cam){
      if(!mat.uniforms.uMirror.value || !mirrorRT) return;
      rwp.setFromMatrixPosition(m.matrixWorld); cwp.setFromMatrixPosition(cam.matrixWorld); rot.extractRotation(m.matrixWorld);
      normal.set(0,0,1).applyMatrix4(rot); view.subVectors(rwp,cwp); if(view.dot(normal)>0) return;
      view.reflect(normal).negate().add(rwp); rot.extractRotation(cam.matrixWorld); look.set(0,0,-1).applyMatrix4(rot).add(cwp);
      target.subVectors(rwp,look).reflect(normal).negate().add(rwp);
      vcam.position.copy(view); vcam.up.set(0,1,0).applyMatrix4(rot).reflect(normal); vcam.lookAt(target); vcam.far=cam.far; vcam.updateMatrixWorld(); vcam.projectionMatrix.copy(cam.projectionMatrix); vcam.projectionMatrix.elements[8]*=-1; // the safe-area frame is off-centre; a mirrored camera sees it flipped
      const tm=mat.uniforms.textureMatrix.value; tm.set(0.5,0,0,0.5, 0,0.5,0,0.5, 0,0,0.5,0.5, 0,0,0,1); tm.multiply(vcam.projectionMatrix); tm.multiply(vcam.matrixWorldInverse); tm.multiply(m.matrixWorld);
      plane.setFromNormalAndCoplanarPoint(normal,rwp); plane.applyMatrix4(vcam.matrixWorldInverse); clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
      const pm=vcam.projectionMatrix; q.x=(Math.sign(clip.x)+pm.elements[8])/pm.elements[0]; q.y=(Math.sign(clip.y)+pm.elements[9])/pm.elements[5]; q.z=-1; q.w=(1+pm.elements[10])/pm.elements[14];
      clip.multiplyScalar(2/clip.dot(q)); pm.elements[2]=clip.x; pm.elements[6]=clip.y; pm.elements[10]=clip.z+1; pm.elements[14]=clip.w;
      const spr=[]; if(dio.group.visible) dio.group.traverse(o=>{ if(o.isSprite&&o.visible){ o.visible=false; spr.push(o); } }); const sau=r.shadowMap.autoUpdate; r.shadowMap.autoUpdate=false;
      m.visible=false; dust.visible=false; const cur=r.getRenderTarget(); r.setRenderTarget(mirrorRT); r.state.buffers.depth.setMask(true); r.clear(); r.render(sc,vcam); r.setRenderTarget(cur); m.visible=true; dust.visible=true;
      for(const o of spr) o.visible=true; r.shadowMap.autoUpdate=sau;
    };
    return m; })();
  function sizeMirror(){ if(mirrorRT) mirrorRT.dispose(); const f=quality>=2?0.5:0.35; const w=Math.max(64,Math.round(innerWidth*renderer.getPixelRatio()*f)), h=Math.max(64,Math.round(innerHeight*renderer.getPixelRatio()*f));
    mirrorRT = quality>=1 ? new THREE.WebGLRenderTarget(w,h,{format:THREE.RGBAFormat,type:RTT,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}) : null;
    if(mirrorRT){ mirrorRT.texture.generateMipmaps=false; floor.material.uniforms.tDiffuse.value=mirrorRT.texture; floor.material.uniforms.uTex.value.set(1/w,1/h); }
    floor.material.uniforms.uMirror.value = mirrorRT?1:0; }

  const hemi=new THREE.HemisphereLight(lin(0x9a7ab8), lin(0x080410), 0.75); scene.add(hemi);
  const key=new THREE.DirectionalLight(lin(0xfff1e2),1.25); key.position.set(-14,26,12); scene.add(key);
  const rim=new THREE.DirectionalLight(lin(0x9b6fd0),0.9); rim.position.set(16,9,-20); scene.add(rim);

  // ---------- the map ----------
  const DEPTH=0.3, BEV=0.045, TOP=DEPTH+BEV;
  const mapG=new THREE.Group(); scene.add(mapG);
  const EDGE_U={uReveal:{value:40}, uTime:U.uTime};
  const SLAB=lin(0x3b2452), SLAB_SIDE=lin(0x1a0d26);
  const GOLD=lin(0xffa400), GOLD2=lin(0xffc54d), WHITE=new THREE.Color(1,1,1), SILVER=lin(0xc9c3d3), TEAL=lin(0x3fc2b0), VIOLET=lin(0xa486b3), DARKGOLD=lin(0x7a4a00);
  for(const s of states){
    const shapes=[]; let ex0=1e9,ex1=-1e9,ez0=1e9,ez1=-1e9;
    for(const poly of s.geo.p){
      const toV=r=>r.map(([x,y])=>{ const X=wx(x)-s.lx, Z=wz(y)-s.lz; ex0=Math.min(ex0,X); ex1=Math.max(ex1,X); ez0=Math.min(ez0,Z); ez1=Math.max(ez1,Z); return new THREE.Vector2(X,-Z); });
      const sh=new THREE.Shape(toV(poly[0])); for(let k=1;k<poly.length;k++) sh.holes.push(new THREE.Path(toV(poly[k]))); shapes.push(sh); }
    s.ext=Math.max(ex1-ex0, ez1-ez0); s.cx=(ex0+ex1)/2; s.cz=(ez0+ez1)/2; s.ez1=ez1;
    const tiny=s.geo.a<60;
    const geo=new THREE.ExtrudeGeometry(shapes,{depth:DEPTH, bevelEnabled:!tiny, bevelThickness:BEV, bevelSize:0.035, bevelSegments:2, curveSegments:1});
    geo.rotateX(-Math.PI/2); if(tiny) geo.translate(0,BEV,0);
    const mat=new THREE.MeshStandardMaterial({color:SLAB.clone(), roughness:0.48, metalness:0.35, emissive:new THREE.Color(0,0,0)});
    const mesh=new THREE.Mesh(geo,mat); mesh.position.set(s.lx,0,s.lz); mapG.add(mesh);
    // top outline, drawn as glowing line segments
    const seg=[]; for(const poly of s.geo.p) for(const ring of poly){ for(let k=0;k<ring.length;k++){ const a=ring[k], b=ring[(k+1)%ring.length]; seg.push(wx(a[0])-s.lx,TOP+0.004,wz(a[1])-s.lz, wx(b[0])-s.lx,TOP+0.004,wz(b[1])-s.lz); } }
    const lg=new THREE.BufferGeometry(); lg.setAttribute('position',new THREE.Float32BufferAttribute(seg,3));
    const lm=new THREE.ShaderMaterial(Object.assign({uniforms:{uReveal:EDGE_U.uReveal, uTime:U.uTime, uColor:{value:VIOLET.clone()}, uA:{value:0.55}},
      vertexShader:'varying float vX; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vX=w.x; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader:'uniform float uReveal,uA; uniform vec3 uColor; varying float vX; void main(){ float on=step(vX,uReveal); float head=exp(-abs(vX-uReveal)*1.4)*on; gl_FragColor=vec4(uColor*(uA*on+head*2.5),1.0); }'},ADD));
    const lines=new THREE.LineSegments(lg,lm); mesh.add(lines);
    s.mesh=mesh; s.lines=lines;
    s.M={hl:0,thl:0, dim:0,tdim:0, lift:0,tlift:0, sc:1,tsc:1, glow:0,tglow:0, lane:0,tlane:0, rev:1, edge:new THREE.Color().copy(VIOLET), tedge:VIOLET.clone(), ea:0.55, tea:0.55};
  }

  // ---------- columns: FY27 light pillars, FY26 glass sleeves and rings, light pools ----------
  const NS=states.length, COLR=0.17;
  function instanced(geo, mat, n){ const m=new THREE.InstancedMesh(geo,mat,n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled=false;
    geo.setAttribute('aColor',new THREE.InstancedBufferAttribute(new Float32Array(n*3),3)); geo.setAttribute('aGlow',new THREE.InstancedBufferAttribute(new Float32Array(n),1)); geo.setAttribute('aH',new THREE.InstancedBufferAttribute(new Float32Array(n),1));
    for(const k of ['aColor','aGlow','aH']) geo.attributes[k].setUsage(THREE.DynamicDrawUsage); return m; }
  const cylGeo=()=>{ const g=new THREE.CylinderGeometry(1,1,1,28,1,false); g.translate(0,0.5,0); return g; };
  const colMesh=instanced(cylGeo(), pillarMat(PILLAR_F), NS); scene.add(colMesh);
  const sleeveGeo=new THREE.CylinderGeometry(1,1,1,28,1,true); sleeveGeo.translate(0,0.5,0);
  const sleeveMesh=instanced(sleeveGeo, pillarMat(GHOST_F,{mat:Object.assign({side:THREE.DoubleSide},ADD)}), NS); scene.add(sleeveMesh);
  const ringGeo=new THREE.TorusGeometry(1,0.07,6,40); ringGeo.rotateX(Math.PI/2);
  const ringMesh=instanced(ringGeo, pillarMat(EMIT_F,{mat:ADD}), NS); scene.add(ringMesh);
  const poolGeo=new THREE.PlaneGeometry(1,1); poolGeo.rotateX(-Math.PI/2);
  const poolMesh=instanced(poolGeo, new THREE.ShaderMaterial(Object.assign({uniforms:{uAlpha:{value:1}},
    vertexShader:'attribute vec3 aColor; attribute float aGlow; varying vec3 vC; varying float vG; varying vec2 vUv; void main(){ vC=aColor; vG=aGlow; vUv=uv; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform float uAlpha; varying vec3 vC; varying float vG; varying vec2 vUv; void main(){ float d=length(vUv-0.5)*2.0; float a=exp(-d*d*5.0)*(1.0-smoothstep(0.7,1.0,d)); gl_FragColor=vec4(vC*a*vG*uAlpha,1.0); }'},ADD)), NS);
  scene.add(poolMesh);
  for(const s of states) s.C={h:0.001,th:0.001, g:0.001,tg:0.001, col:WHITE.clone(), tcol:WHITE.clone(), glow:0,tglow:0, flash:0, above:false};
  const RAMP=[0xd7ecea,0xa6e2d9,0x6fd3c4,0x3cc2ae,0x16b19b].map(lin); const LAVENDER=lin(0xb9a6d6);
  const HMAX=9;

  // ---------- crowd: one light per 100 advocates ----------
  const UNIT=100;
  const CLOUD={x:20.6, y:1.6, z:3.2};
  const crowd=(function(){
    const r=rng(42); const P=[], kind=[], act=[], seed=[], delay=[], st=[];
    const fallers=[], actors=[];
    function pip(x,y,ring){ let c=false; for(let i=0,j=ring.length-1;i<ring.length;j=i++){ const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1]; if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) c=!c; } return c; }
    function inside(s,x,y){ for(const poly of s.geo.p){ if(pip(x,y,poly[0])){ let hole=false; for(let k=1;k<poly.length;k++) if(pip(x,y,poly[k])) hole=true; if(!hole) return true; } } return false; }
    for(const s of states){
      let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for(const poly of s.geo.p) for(const [x,y] of poly[0]){ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); }
      const nOld=Math.round(s.c26/UNIT), nNow=Math.round(s.c/UNIT), nFall=Math.min(Math.round(sum(s.n)/UNIT), nNow), nAct=Math.min(Math.round(s.tk/UNIT), nNow);
      const hubs=[]; const nh=1+Math.floor(Math.sqrt(s.geo.a)/22); let guard=0; while(hubs.length<nh && guard++<400){ const x=x0+r()*(x1-x0), y=y0+r()*(y1-y0); if(inside(s,x,y)) hubs.push([x,y]); }
      const spread=Math.max(2.5, Math.sqrt(s.geo.a)*0.16);
      const pick=()=>{ for(let t=0;t<60;t++){ let x,y; if(r()<0.62 && hubs.length){ const h=hubs[Math.floor(r()*hubs.length)]; const a=r()*Math.PI*2, d=Math.pow(r(),1.6)*spread*1.8; x=h[0]+Math.cos(a)*d; y=h[1]+Math.sin(a)*d; } else { x=x0+r()*(x1-x0); y=y0+r()*(y1-y0); } if(inside(s,x,y)) return [x,y]; } return s.geo.l; };
      // kind 0: on the list a year ago and still counted today; 5: a year ago only (net loss);
      // 1: the rest of the year's net growth; 2: arrived since July 1. Year-ago lights = 0+5, today = 0+1+2.
      const nKeep=Math.max(0,Math.min(nOld,nNow-nFall)), nGone=nOld-nKeep, nMid=nNow-nFall-nKeep;
      const plan=[[0,nKeep],[5,nGone],[1,nMid],[2,nFall]]; const first=P.length/3;
      for(const [kd,cnt] of plan) for(let k=0;k<cnt;k++){ const [x,y]=pick(); const i=P.length/3; P.push(wx(x),TOP+0.06,wz(y));
        kind.push(kd); seed.push(r()); delay.push(r()); st.push(s.i); act.push(0);
        if(kd===2) fallers.push(i); }
      // actors: spread across the state's lights today (gold)
      const idxs=[]; for(let i=first;i<P.length/3;i++) if(kind[i]!==5) idxs.push(i);
      for(let k=0;k<nAct && idxs.length;k++){ const j=Math.floor(r()*idxs.length); act[idxs[j]]=1; actors.push(idxs[j]); idxs.splice(j,1); }
    }
    // advocates with no state on file: a cloud off the Atlantic coast
    const cOld=Math.round(noStateC26/UNIT), cNow=Math.round(noStateC/UNIT), cFall=Math.max(0,Math.round((new27-sum(states.map(s=>sum(s.n))))/UNIT));
    { const f=Math.min(cFall,cNow), keep=Math.max(0,Math.min(cOld,cNow-f)), plan=[[3,keep],[5,cOld-keep],[4,cNow-f-keep],[2,f]];
      for(const [kd,cnt] of plan) for(let k=0;k<cnt;k++){ const a=r()*Math.PI*2, d=Math.sqrt(r())*2.4, i=P.length/3; P.push(CLOUD.x+Math.cos(a)*d, CLOUD.y+(r()-0.5)*0.9*(1-d/2.6), CLOUD.z+Math.sin(a)*d*0.8);
        kind.push(kd); seed.push(r()); delay.push(r()); st.push(-1); act.push(0); if(kd===2) fallers.push(i); } }
    const n=P.length/3;
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('aKind',new THREE.Float32BufferAttribute(kind,1)); g.setAttribute('aAct',new THREE.Float32BufferAttribute(act,1)); g.setAttribute('aSeed',new THREE.Float32BufferAttribute(seed,1)); g.setAttribute('aDelay',new THREE.Float32BufferAttribute(delay,1));
    const uni={uOld:{value:0},uNew:{value:0},uFall:{value:0},uAct:{value:0},uTime:U.uTime,uPx:U.uPx,uSize:{value:0.21},uFade:{value:1}};
    const m=new THREE.ShaderMaterial(Object.assign({uniforms:uni,
      vertexShader:`attribute float aKind,aAct,aSeed,aDelay; uniform float uOld,uNew,uFall,uAct,uTime,uPx,uSize,uFade; varying vec3 vC; varying float vA;
        void main(){ float vis; vec3 c;
          bool old=(aKind<0.5)||(aKind>2.5&&aKind<3.5)||(aKind>4.5);
          float g=(uFall-aDelay*0.7)/0.3;
          if(aKind>4.5){ vis=uOld*(1.0-uNew); c=vec3(0.5,0.46,0.62); }
          else if(old){ vis=uOld; c=vec3(0.62,0.56,0.8); }
          else if(aKind<1.5||aKind>3.5){ vis=uNew; c=vec3(1.0,0.97,1.0); }
          else { vis=smoothstep(0.9,1.0,g)*uNew; c=vec3(0.45,1.25,1.05); }
          float flash=(aKind>1.5&&aKind<2.5)?exp(-pow((g-1.08)*5.0,2.0)):0.0;
          float act=aAct*smoothstep(aDelay*0.6,aDelay*0.6+0.4,uAct);
          c=mix(c,vec3(1.0,0.58,0.14)*1.1,act);
          float tw=0.78+0.22*sin(uTime*(1.3+aSeed*2.2)+aSeed*40.0);
          vA=vis*uFade*tw;
          vC=c*(1.0+flash*3.0);
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=uSize*(1.0+act*0.45+flash*2.0)*uPx/-mv.z;
          gl_Position=projectionMatrix*mv; }`,
      fragmentShader:'varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0) discard; float a=pow(1.0-d,2.0); float core=smoothstep(0.4,0.0,d); gl_FragColor=vec4(vC*(a*0.55+core*1.2)*vA,1.0); }'},ADD));
    const pts=new THREE.Points(g,m); pts.frustumCulled=false; scene.add(pts);
    // streaks for arrivals since July 1
    const sp=[],sT=[],sE=[],sD=[],sS=[]; for(const i of fallers){ for(const e of [0,1]){ sp.push(0,0,0); sT.push(P[i*3],P[i*3+1],P[i*3+2]); sE.push(e); sD.push(delay[i]); sS.push(seed[i]); } }
    const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3)); sg.setAttribute('aT',new THREE.Float32BufferAttribute(sT,3)); sg.setAttribute('aE',new THREE.Float32BufferAttribute(sE,1)); sg.setAttribute('aDelay',new THREE.Float32BufferAttribute(sD,1)); sg.setAttribute('aSeed',new THREE.Float32BufferAttribute(sS,1));
    const sm=new THREE.ShaderMaterial(Object.assign({uniforms:{uFall:uni.uFall},
      vertexShader:`attribute vec3 aT; attribute float aE,aDelay,aSeed; uniform float uFall; varying float vA;
        void main(){ float f=clamp((uFall-aDelay*0.7)/0.3,0.0,1.0); float e=f*f;
          vec3 st=aT+vec3((aSeed-0.5)*4.0,15.0+aSeed*7.0,(fract(aSeed*7.31)-0.5)*4.0);
          vec3 head=mix(st,aT,e); vec3 dir=normalize(aT-st);
          vec3 p=head-dir*aE*(0.6+3.2*(1.0-e));
          vA=(1.0-aE)*step(0.0001,f)*(1.0-smoothstep(0.96,1.0,f));
          gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0); }`,
      fragmentShader:'varying float vA; void main(){ gl_FragColor=vec4(vec3(0.6,1.4,1.2)*vA,1.0); }'},ADD));
    const streaks=new THREE.LineSegments(sg,sm); streaks.frustumCulled=false; scene.add(streaks);
    // threads of light rising from everyone who took action
    const tp=[],tB=[],tE=[],tD=[],tS=[]; for(const i of actors){ for(const e of [0,1]){ tp.push(0,0,0); tB.push(P[i*3],P[i*3+1],P[i*3+2]); tE.push(e); tD.push(delay[i]); tS.push(seed[i]); } }
    const tg=new THREE.BufferGeometry(); tg.setAttribute('position',new THREE.Float32BufferAttribute(tp,3)); tg.setAttribute('aB',new THREE.Float32BufferAttribute(tB,3)); tg.setAttribute('aE',new THREE.Float32BufferAttribute(tE,1)); tg.setAttribute('aDelay',new THREE.Float32BufferAttribute(tD,1)); tg.setAttribute('aSeed',new THREE.Float32BufferAttribute(tS,1));
    const tuni={uAct:uni.uAct, uThread:{value:0}};
    const tm=new THREE.ShaderMaterial(Object.assign({uniforms:tuni,
      vertexShader:`attribute vec3 aB; attribute float aE,aDelay,aSeed; uniform float uAct,uThread; varying float vA;
        void main(){ float a=smoothstep(aDelay*0.6,aDelay*0.6+0.4,uAct); float h=(1.4+aSeed*3.2)*a; vec3 p=aB+vec3(0.0,aE*h,0.0); vA=(1.0-aE)*a*uThread; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0); }`,
      fragmentShader:'varying float vA; void main(){ gl_FragColor=vec4(vec3(1.0,0.6,0.18)*0.5*vA,1.0); }'},ADD));
    const threads=new THREE.LineSegments(tg,tm); threads.frustumCulled=false; scene.add(threads);
    return {pts, uni, threads, tuni, streaks, n, fallers:fallers.length, actors:actors.length};
  })();

  // ---------- cold open vortex, core glow, embers, dust ----------
  const glowTex=(function(){ const cv=document.createElement('canvas'); cv.width=cv.height=128; const x=cv.getContext('2d'); const g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.2,'rgba(255,230,190,0.55)'); g.addColorStop(0.5,'rgba(255,170,60,0.12)'); g.addColorStop(1,'rgba(255,140,0,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); return new THREE.CanvasTexture(cv); })();
  const CORE=new THREE.Vector3(0,5,0);
  const vortex=(function(){ const n=reduceMotion?600:2600, r=rng(5), a=new Float32Array(n*3); for(let i=0;i<n*3;i++) a[i]=r();
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3)); g.setAttribute('aR',new THREE.BufferAttribute(a,3));
    const uni={uConv:{value:0},uBurst:{value:0},uA:{value:0},uTime:U.uTime,uPx:U.uPx};
    const m=new THREE.ShaderMaterial(Object.assign({uniforms:uni,
      vertexShader:`attribute vec3 aR; uniform float uConv,uBurst,uA,uTime,uPx; varying float vA; varying vec3 vC;
        void main(){ float cv=smoothstep(0.0,1.0,uConv); float r0=5.0+aR.x*28.0; float r=mix(r0,0.15+aR.x*0.7,cv);
          float ang=aR.y*6.2832+uTime*(0.12+1.5/(r*0.22+0.7));
          float h=(aR.z-0.5)*mix(11.0,0.5,cv);
          vec3 p=vec3(cos(ang)*r,5.0+h,sin(ang)*r*0.85);
          vec3 dir=normalize(vec3(cos(ang),(aR.z-0.5)*0.7,sin(ang)));
          float b=uBurst; p+=dir*(5.0+aR.x*34.0)*b; p.y-=b*b*6.0*(0.4+aR.z);
          vA=uA*(1.0-b)*(0.35+0.65*cv);
          vC=mix(vec3(1.0,0.48,0.1),vec3(1.0,0.86,0.62),aR.z)*(0.7+cv*0.9);
          vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=(0.09+aR.x*0.12)*uPx/-mv.z*(1.0+b*0.6); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:'varying float vA; varying vec3 vC; void main(){ float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0) discard; gl_FragColor=vec4(vC*pow(1.0-d,1.6)*vA,1.0); }'},ADD));
    const p=new THREE.Points(g,m); p.frustumCulled=false; scene.add(p); return {p,uni}; })();
  const core=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:glowTex,color:new THREE.Color(1,0.8,0.5),opacity:0,fog:false},ADD))); core.position.copy(CORE); core.scale.set(6,6,1); scene.add(core);
  const embers=(function(){ const n=reduceMotion?0:520, r=rng(9), p=new Float32Array(n*3), a=new Float32Array(n);
    for(let i=0;i<n;i++){ p[i*3]=(r()*2-1)*19; p[i*3+1]=r()*12; p[i*3+2]=(r()*2-1)*12; a[i]=r(); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3)); g.setAttribute('aR',new THREE.BufferAttribute(a,1));
    const uni={uA:{value:0},uTime:U.uTime,uPx:U.uPx};
    const m=new THREE.ShaderMaterial(Object.assign({uniforms:uni,
      vertexShader:`attribute float aR; uniform float uA,uTime,uPx; varying float vA; varying vec3 vC;
        void main(){ vec3 p=position; float sp=0.25+aR*0.55; p.y=mod(position.y+uTime*sp,12.0)+0.4; p.x+=sin(uTime*0.4+aR*30.0)*0.5; p.z+=cos(uTime*0.33+aR*20.0)*0.5;
          float life=p.y/12.4; vA=uA*smoothstep(0.0,0.1,life)*(1.0-smoothstep(0.55,1.0,life))*(0.6+0.4*sin(uTime*3.0+aR*50.0));
          vC=mix(vec3(1.0,0.5,0.1),vec3(1.0,0.85,0.55),aR)*0.85;
          vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=(0.08+aR*0.1)*uPx/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader:'varying float vA; varying vec3 vC; void main(){ float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0) discard; gl_FragColor=vec4(vC*pow(1.0-d,2.0)*vA,1.0); }'},ADD));
    const pts=new THREE.Points(g,m); pts.frustumCulled=false; scene.add(pts); return {uni}; })();
  const dust=(function(){ const n=reduceMotion?0:90, r=rng(3), p=new Float32Array(n*3), a=new Float32Array(n);
    for(let i=0;i<n;i++){ p[i*3]=(r()*2-1)*34; p[i*3+1]=r()*18-1; p[i*3+2]=(r()*2-1)*28; a[i]=r(); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3)); g.setAttribute('aR',new THREE.BufferAttribute(a,1));
    const m=new THREE.ShaderMaterial(Object.assign({uniforms:{uTime:U.uTime,uPx:U.uPx,uA:{value:1}},
      vertexShader:`attribute float aR; uniform float uTime,uPx,uA; varying float vA;
        void main(){ vec3 p=position+vec3(sin(uTime*0.07+aR*9.0)*1.6,sin(uTime*0.11+aR*5.0)*0.8,cos(uTime*0.05+aR*7.0)*1.6);
          vec4 mv=modelViewMatrix*vec4(p,1.0); float z=-mv.z; vA=uA*(0.022+0.035*aR)*smoothstep(2.0,9.0,z)*(1.0-smoothstep(30.0,70.0,z));
          gl_PointSize=clamp((0.4+aR*0.7)*uPx/z,2.0,70.0); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:'varying float vA; void main(){ float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0) discard; float a=smoothstep(1.0,0.7,d)*(0.55+0.45*smoothstep(0.75,0.95,d)); gl_FragColor=vec4(vec3(0.85,0.75,1.0)*a*vA,1.0); }'},ADD));
    const pts=new THREE.Points(g,m); pts.frustumCulled=false; scene.add(pts); return pts; })();

  // ---------- timeline: FY26 glass panes and FY27 monoliths behind the map ----------
  const TLZ=0, TLX=i=>(i-5.5)*2.35, TLMAX=Math.max(...N.full12,...N.a), TLH=13.5/TLMAX;
  const tlG=new THREE.Group(); scene.add(tlG);
  const boxGeo=new THREE.BoxGeometry(1,1,1); boxGeo.translate(0,0.5,0);
  const boxEdges=new THREE.EdgesGeometry(boxGeo);
  const glassMat=pillarMat(GHOST_F,{mat:Object.assign({side:THREE.DoubleSide},ADD)}); glassMat.uniforms.uColor.value=SILVER.clone(); glassMat.uniforms.uGlow.value=2.2;
  const panes=[], monos=[];
  for(let i=0;i<12;i++){ const g=new THREE.Group(); g.position.set(TLX(i),FLOOR_Y,TLZ-1.6); g.scale.set(1.7,0.001,0.5);
    const m=new THREE.Mesh(boxGeo,glassMat); const e=new THREE.LineSegments(boxEdges,new THREE.LineBasicMaterial(Object.assign({color:lin(0xd8d0e4),opacity:0.38,fog:false},ADD))); g.add(m); g.add(e); tlG.add(g); panes.push({g,h:0,th:0,e}); }
  for(let i=0;i<4;i++){ const mat=pillarMat(PILLAR_F); mat.uniforms.uColor.value=(i===PK?GOLD2:WHITE).clone(); mat.uniforms.uGlow.value=i===PK?1.25:0.9;
    const m=new THREE.Mesh(boxGeo,mat); m.position.set(TLX(i),FLOOR_Y,TLZ+1.1); m.scale.set(1.45,0.001,1.45); tlG.add(m); monos.push({m,h:0,th:0,mat}); }
  const axis=new THREE.Mesh(new THREE.BoxGeometry(TLX(11)-TLX(0)+3.2,0.03,0.03), new THREE.MeshBasicMaterial(Object.assign({color:lin(0xffc54d),opacity:0.8,fog:false},ADD))); axis.position.set(0,FLOOR_Y+0.02,TLZ+2.6); tlG.add(axis);
  const tlFlare=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:glowTex,color:new THREE.Color(1,0.7,0.3),opacity:0,fog:false},ADD))); tlFlare.scale.set(5,5,1); tlG.add(tlFlare);

  // ---------- pace halo: two rings in the sky above the map ----------
  const RING_Y=4.2, R1=9.6, R2=7.2;
  const ringsG=new THREE.Group(); ringsG.position.y=RING_Y; scene.add(ringsG);
  function arcMat(color, glow){ return new THREE.ShaderMaterial(Object.assign({uniforms:{uFrac:{value:0},uColor:{value:color},uGlow:{value:glow},uA:{value:0},uTime:U.uTime},
    vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:`uniform float uFrac,uGlow,uA,uTime; uniform vec3 uColor; varying vec3 vP;
      void main(){ float a=atan(vP.y,vP.x); float u=fract((1.5707963-a)/6.2831853); if(u>uFrac) discard;
        float head=exp(-pow((uFrac-u)*40.0,2.0)); float flow=0.85+0.15*sin(u*120.0-uTime*3.0);
        gl_FragColor=vec4(uColor*uGlow*(flow+head*0.8)*uA,1.0); }`},ADD,{side:THREE.DoubleSide})); }
  function track(R,t){ const m=new THREE.Mesh(new THREE.TorusGeometry(R,t,8,256), new THREE.MeshBasicMaterial(Object.assign({color:lin(0x8c79a3),opacity:0,fog:false},ADD))); m.rotation.x=-Math.PI/2; ringsG.add(m); return m; }
  const trackA=track(R1,0.05), trackN=track(R2,0.045);
  const fillA=new THREE.Mesh(new THREE.TorusGeometry(R1,0.2,16,480), arcMat(WHITE.clone(),0.32)); fillA.rotation.x=-Math.PI/2; ringsG.add(fillA);
  const fillN=new THREE.Mesh(new THREE.TorusGeometry(R2,0.17,16,400), arcMat(TEAL.clone(),0.6)); fillN.rotation.x=-Math.PI/2; ringsG.add(fillN);
  const tick=new THREE.Mesh(new THREE.BoxGeometry(R1-R2+2.0,0.08,0.16), new THREE.MeshBasicMaterial(Object.assign({color:lin(0xffa400).multiplyScalar(1.15),opacity:0,fog:false},ADD)));
  { const a=Math.PI/2-(fyPct/100)*Math.PI*2, rm=(R1+R2)/2; tick.position.set(Math.cos(a)*rm,0,-Math.sin(a)*rm); tick.rotation.y=a; ringsG.add(tick); }
  const ringFlare=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:glowTex,color:new THREE.Color(1,0.75,0.35),opacity:0,fog:false},ADD))); ringFlare.scale.set(3,3,1); ringsG.add(ringFlare);

  // ---------- effects: sweep curtain, spotlights, sky beams ----------
  const curtain=new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.ShaderMaterial(Object.assign({uniforms:{uA:{value:0}}, side:THREE.DoubleSide,
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform float uA; varying vec2 vUv; void main(){ float v=pow(1.0-vUv.y,2.2); float e=1.0-pow(abs(vUv.x-0.5)*2.0,6.0); float base=exp(-vUv.y*60.0)*2.0; gl_FragColor=vec4(vec3(1.0,0.62,0.2)*(v*0.26+base*0.55)*e*uA,1.0); }'},ADD)));
  curtain.rotation.y=Math.PI/2; curtain.scale.set(24,9,1); curtain.position.set(-30,4.5+TOP,0); scene.add(curtain);
  const coneGeo=new THREE.CylinderGeometry(0.3,2.1,17,40,1,true); coneGeo.translate(0,8.5,0);
  const coneMat=()=>new THREE.ShaderMaterial(Object.assign({uniforms:{uA:{value:0}}, side:THREE.DoubleSide,
    vertexShader:'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); vY=position.y/17.0; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader:'uniform float uA; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f=pow(abs(dot(normalize(vN),normalize(vV))),1.8); float v=mix(1.0,0.15,vY); gl_FragColor=vec4(vec3(1.0,0.8,0.5)*f*v*0.13*uA,1.0); }'},ADD));
  const cones=[0,1,2].map(()=>{ const m=new THREE.Mesh(coneGeo,coneMat()); m.visible=false; scene.add(m); return m; });
  const beamGeo=new THREE.CylinderGeometry(0.035,0.035,40,6,1,true); beamGeo.translate(0,20,0);
  const beams=[0,1,2,3].map(()=>{ const m=new THREE.Mesh(beamGeo,new THREE.MeshBasicMaterial(Object.assign({color:lin(0xffb020).multiplyScalar(0.75),opacity:0,fog:false},ADD))); m.visible=false; scene.add(m); return m; });

  // ---------- state close-up: monthly pillars on the lifted state ----------
  // ---------- state dioramas (ported from the original edition), staged on their own at the origin ----------
  const dio=makeStateStage({scene, byAb, fmt, cum, monthShort, reduceMotion}); dio.group.visible=false;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const dHemi=new THREE.HemisphereLight(lin(0xd9ccff), lin(0x1a0826), 0); scene.add(dHemi);
  const dSun=new THREE.DirectionalLight(lin(0xffe2c4),0); dSun.position.set(7,10,6); dSun.castShadow=true; dSun.shadow.mapSize.set(2048,2048); Object.assign(dSun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:60}); dSun.shadow.bias=-0.0008; dSun.shadow.radius=4; scene.add(dSun);
  const dBack=new THREE.DirectionalLight(lin(0x9b74e0),0); dBack.position.set(-9,6,-10); scene.add(dBack);
  dio.rim(lin(0x8d6ad1).multiplyScalar(0.38));
  const dPoint=new THREE.PointLight(0xffffff,0,16,1.5); dPoint.position.set(3,5,3); scene.add(dPoint); // tinted per biome, always present
  // a dark reflective pedestal under the diorama and its numbers, edged in light, with a soft beam from above
  const pedestal=new THREE.Group(); scene.add(pedestal); pedestal.visible=false;
  { const top=new THREE.Mesh(new THREE.CylinderGeometry(6.7,6.95,0.34,128), new THREE.MeshStandardMaterial({color:lin(0x0f0818), roughness:0.55, metalness:0.3}));
    top.position.y=-0.18; top.receiveShadow=true; pedestal.add(top);
    const edge=new THREE.Mesh(new THREE.TorusGeometry(6.71,0.022,8,256), new THREE.MeshBasicMaterial(Object.assign({color:lin(0xb79ad0).multiplyScalar(1.2),fog:false},ADD))); edge.rotation.x=Math.PI/2; edge.position.y=-0.005; pedestal.add(edge);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(6.96,0.014,8,256), new THREE.MeshBasicMaterial(Object.assign({color:lin(0xffc54d).multiplyScalar(0.55),fog:false},ADD))); lip.rotation.x=Math.PI/2; lip.position.y=-0.35; pedestal.add(lip);
    const bg=new THREE.CylinderGeometry(0.9,6.4,16,64,1,true); bg.translate(0,8,0); const beam=new THREE.Mesh(bg,coneMat()); beam.material.uniforms.uA.value=0; pedestal.add(beam); pedestal.userData.beam=beam; }
  const DIO_A0={tx:0.2,ty:2.3,tz:0.5,theta:-1.05,phi:1.4,r:14.5,fov:34}, DIO_A1={tx:0.3,ty:1.75,tz:0.6,theta:-0.32,phi:1.08,r:12,fov:36}, DIO_A2={theta:0.42,phi:1.02,r:11.5}, DIO_N={tx:0.7,ty:1.1,tz:2.5,theta:0.08,phi:1.02,r:15.5,fov:36};

  // ---------- projected HTML labels ----------
  const LBL=[]; const layer=$('labels'); const _v=new THREE.Vector3();
  function mkLabel(cls){ const el=document.createElement('div'); el.className='lbl '+(cls||''); el.style.display='none'; layer.appendChild(el); const L={el, p:new THREE.Vector3(), o:0, to:0, shown:false, ax:-0.5, ay:-1}; LBL.push(L); return L; }
  function setText(L, parts){ L.el.textContent=''; for(const p of [].concat(parts)){ if(typeof p==='string') L.el.appendChild(document.createTextNode(p)); else { const b=document.createElement('b'); b.textContent=p.b; L.el.appendChild(b); } } }
  for(const s of states){ s.L=mkLabel('ab'); s.L.el.textContent=s.ab; }
  const tags=[0,1,2,3,4].map(()=>mkLabel('tag'));
  const moL=monthShort.map(m=>{ const L=mkLabel('mo'); L.el.textContent=m; L.ay=0; return L; });
  const mo27L=[0,1,2,3].map(()=>mkLabel('val'));
  const mo26L=[0,1,2,3,4,5,6,7,8,9,10,11].map(()=>mkLabel('val'));
  const ringL=[mkLabel('ring'),mkLabel('ring'),mkLabel('ring')];
  const cloudL=mkLabel('cloud');
  // ---------- diorama numbers: the same light pillars, glass and rings as the map ----------
  const DIO_P=[0,1,2,3].map(i=>[(i-1.5)*1.3,4.6]).concat([[4.45,1.55]]);
  const dioCol=instanced(cylGeo(), pillarMat(PILLAR_F), 5); scene.add(dioCol);
  const dsGeo=new THREE.CylinderGeometry(1,1,1,28,1,true); dsGeo.translate(0,0.5,0);
  const dioSleeve=instanced(dsGeo, pillarMat(GHOST_F,{mat:Object.assign({side:THREE.DoubleSide},ADD)}), 5); scene.add(dioSleeve);
  const dioRing=instanced(ringGeo.clone(), pillarMat(EMIT_F,{mat:ADD}), 5); scene.add(dioRing);
  const dioPool=instanced(poolGeo.clone(), poolMesh.material, 5); scene.add(dioPool);
  const DD={h:[0,0,0,0,0], th:[0,0,0,0,0], g:[0,0,0,0,0], tg:[0,0,0,0,0], on:false};
  const dioVal=[0,1,2,3,4].map(()=>mkLabel('val')), dioMo=[0,1,2,3,4].map(()=>{ const L=mkLabel('mo'); L.ay=0; return L; }), dioRow=mkLabel('mo'), dioCap=mkLabel('tag');
  dioRow.ay=0; const DIO_LBL=dioVal.concat(dioMo,[dioRow]);
  function setA(m,j,c,g,h){ m.geometry.attributes.aColor.setXYZ(j,c.r,c.g,c.b); m.geometry.attributes.aGlow.setX(j,g); m.geometry.attributes.aH.setX(j,h); }
  function dioSet(s){ const a=s.a, a26=s.a26, n27=sum(s.n), n26=sum(s.n26); const kA=2.9/Math.max(1,...a,...a26), kN=2.9/Math.max(1,n27,n26);
    DD.th=a.map(v=>Math.max(0.05,v*kA)).concat([Math.max(0.05,n27*kN)]); DD.tg=a26.map(v=>v*kA).concat([n26*kN]);
    const ml=['Jul','Aug','Sep','Oct 1 to '+asOf.getDate(),'New advocates'];
    for(let j=0;j<5;j++){ setText(dioVal[j], fmt(j<4?a[j]:n27)); dioVal[j].el.className='lbl val'+(j===PK?' gold':''); dioMo[j].el.textContent=ml[j]; }
    dioRow.el.textContent='FY27 actions by month · glass and ring: same month of FY26'; dioRow.p.set(0,-0.05,6.3);
    const cp=dio.capital(); if(cp) setText(dioCap,['Capital · ',{b:cp.name}]); }
  function dioDataTick(kf, dv){ const vis=dv>0.01; dioCol.visible=dioSleeve.visible=dioRing.visible=dioPool.visible=vis;
    if(!vis) return;
    for(let j=0;j<5;j++){ DD.h[j]+=((DD.on?DD.th[j]:0)-DD.h[j])*kf*0.55; DD.g[j]+=((DD.on?DD.tg[j]:0)-DD.g[j])*kf*0.55;
      const [x,z]=DIO_P[j], c=j===4?TEAL:(j===PK?GOLD2:WHITE), r=j===4?0.3:0.27, h=Math.max(0.001,DD.h[j]), g=Math.max(0.001,DD.g[j]), on=DD.g[j]>0.04?1:0;
      _o.rotation.set(0,0,0); _o.position.set(x,0,z); _o.scale.set(r,h,r); _o.updateMatrix(); dioCol.setMatrixAt(j,_o.matrix); setA(dioCol,j,c,dv*(j===PK?0.6:(j===4?0.58:0.34))*Math.min(1,DD.h[j]*8),h);
      _o.scale.set(r*1.6,g,r*1.6); _o.updateMatrix(); dioSleeve.setMatrixAt(j,_o.matrix); setA(dioSleeve,j,SILVER,dv*1.5*on,g);
      _o.position.y=g; _o.scale.setScalar(r*1.75); _o.updateMatrix(); dioRing.setMatrixAt(j,_o.matrix); setA(dioRing,j,SILVER,dv*0.8*on,1);
      _o.position.y=0.012; _o.scale.set(2.4,1,2.4); _o.updateMatrix(); dioPool.setMatrixAt(j,_o.matrix); setA(dioPool,j,c,dv*Math.min(1,DD.h[j]*0.6)*0.45,1);
      dioVal[j].p.set(x,h+0.32,z); dioMo[j].p.set(x,-0.05,z+0.72); }
    for(const m of [dioCol,dioSleeve,dioRing,dioPool]){ m.instanceMatrix.needsUpdate=true; for(const a of ['aColor','aGlow','aH']) m.geometry.attributes[a].needsUpdate=true; }
    const cp=dio.capital(); if(cp) dioCap.p.set(cp.x,cp.y+0.45,cp.z); }
  let labW=1,labH=1;
  function labelsTick(dt){ const k=1-Math.exp(-dt*7);
    for(const L of LBL){ L.o+=(L.to-L.o)*k; if(L.o<0.01 && L.to===0){ if(L.shown){ L.el.style.display='none'; L.shown=false; } continue; }
      _v.copy(L.p).project(camera); if(_v.z>1||_v.z<-1){ if(L.shown){ L.el.style.display='none'; L.shown=false; } continue; }
      if(!L.shown){ L.el.style.display=''; L.shown=true; }
      const x=(_v.x*0.5+0.5)*labW, y=(-_v.y*0.5+0.5)*labH;
      L.el.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) translate('+(L.ax*100)+'%,'+(L.ay*100)+'%)'; L.el.style.opacity=L.o.toFixed(3); } }
  function hideLabels(set){ for(const L of (set||LBL)) L.to=0; }

  // ---------- world state: everything the scenes ask for, eased each frame ----------
  const V={map:0, edges:0, cols:0, ghost:0, colT:4, old:0, net:0, fall:0, act:0, thread:0, conv:0, burst:0, vortex:0, core:0, embers:0, curtain:-30, curtainA:0, tl:0, rings:0, ringFrac:0, flash:0, fade:0, cone:0, beam:0, stage:0, abLab:0, cloud:0, skyLift:1, dio:0};
  const TW=[];
  function tw(key,to,ms,ez){ for(let i=TW.length-1;i>=0;i--) if(TW[i].k===key) TW.splice(i,1); if(reduceMotion||!ms){ V[key]=to; return; } TW.push({k:key,from:V[key],to,t0:performance.now(),ms,ez:ez||ease3}); }
  function twTick(now){ for(let i=TW.length-1;i>=0;i--){ const t=TW[i]; const p=clamp((now-t.t0)/t.ms,0,1); V[t.k]=t.from+(t.to-t.from)*t.ez(p); if(p>=1) TW.splice(i,1); } }
  let metric='a', colorMode='growth', ghostOnly=false, liftAb=null, SNAP=false, curStage='cold';
  let hl=new Set(), lanes=new Set(), dimOthers=false, litAhead=new Set(), spot=[], beamOn=[];
  const DEF={map:1, edges:1, cols:0, ghost:0, old:0, net:0, act:0, thread:0, vortex:0, core:0, embers:0, curtainA:0, tl:0, rings:0, cone:0, beam:0, stage:0, abLab:0, cloud:0, skyLift:1, dio:0};
  function world(cfg, ms){ cfg=cfg||{}; const d=SNAP?0:(ms==null?1400:ms); // SNAP: applied while the screen is black between stages
    for(const k in DEF){ const to = (k in cfg) ? cfg[k] : DEF[k]; for(let i=TW.length-1;i>=0;i--) if(TW[i].k===k) TW.splice(i,1); if(V[k]!==to) tw(k,to,d); } // cancel fades left over from the previous scene
    if('colT' in cfg) tw('colT',cfg.colT,cfg.colTms||0,t=>t);
    if('fall' in cfg) tw('fall',cfg.fall,cfg.fallMs||0,t=>t);
    if('actP' in cfg) tw('act',cfg.actP,cfg.actMs||0,t=>t);
    metric=cfg.metric||'a'; colorMode=cfg.colorMode||'growth'; ghostOnly=!!cfg.ghostOnly;
    hl=new Set(cfg.hl||[]); lanes=new Set(cfg.lanes||[]); dimOthers=!!cfg.dimOthers; litAhead=new Set(cfg.litAhead||[]);
    spot=cfg.spot||[]; beamOn=cfg.beams||[];
    liftAb=cfg.stageAb||null; }

  function mVal(s,t){ if(metric==='r') return s.c? s.tk/s.c : 0; return cum(s[metric],t); }
  function mVal26(s,t){ if(metric==='r') return null; return cum(s[metric+'26'],t); }
  const scaleCache={}; function mScale(){ if(scaleCache[metric]) return scaleCache[metric]; let mx=0; for(const s of states){ mx=Math.max(mx, metric==='r'? mVal(s,4) : Math.max(cum(s[metric],4), cum(s[metric+'26'],4))); } return scaleCache[metric]=mx? HMAX/mx : 1; }
  function growthColor(s){ if(colorMode==='flat'||metric==='r') return LAVENDER; const c=cum(s[metric],4), p=cum(s[metric+'26'],4); if(!p) return c? RAMP[4] : WHITE; const g=c/p; if(g<1) return SILVER; const t=clamp(Math.log2(g)/3,0,1); return RAMP[Math.min(4,Math.floor(t*4.999))]; }

  const _o=new THREE.Object3D(), _c=new THREE.Color();
  const addS=(c,b,s)=>{ c.r+=b.r*s; c.g+=b.g*s; c.b+=b.b*s; return c; };
  function worldTick(dt, now){
    const k=1-Math.exp(-dt*(reduceMotion?60:3.2)), kf=1-Math.exp(-dt*(reduceMotion?60:6)), kh=1-Math.exp(-dt*(reduceMotion?60:3.6));
    const sc=mScale();
    const anyHl=hl.size>0, stageAb=liftAb;
    // map slabs
    for(const s of states){ const M=s.M;
      const isHl=hl.has(s.ab), isLane=lanes.has(s.ab), isLit=litAhead.has(s.ab), isStage=stageAb===s.ab;
      M.thl = isHl||isStage ? 1 : 0; M.tlane=isLane?1:0;
      M.tdim = (stageAb && !isStage) ? 0.82 : ((dimOthers && anyHl && !isHl) ? 0.6 : 0);
      M.tglow = isLit ? 1 : 0;
      M.tlift = isStage ? 1.6 : 0; M.tsc = isStage ? Math.max(1, 6.4/Math.max(0.2,s.ext)) : 1;
      for(const key of ['hl','lane','dim','glow','lift','sc']) M[key]+=(M['t'+key]-M[key])*(key==='lift'||key==='sc'?k*0.8:kf);
      const rev=clamp((EDGE_U.uReveal.value - s.lx + 1.5)/3,0,1); M.rev=rev;
      const base=V.map*rev*(1-M.dim*0.75);
      s.mesh.material.color.copy(SLAB).multiplyScalar(base); s.mesh.visible=V.map*rev>0.01;
      const pulse=0.75+0.25*Math.sin(now*0.004);
      _c.setRGB(0,0,0); addS(_c,GOLD,M.hl*(isStage?0.08:0.15)); addS(_c,DARKGOLD,M.lane*0.5*pulse); addS(_c,GOLD2,M.glow*0.035);
      s.mesh.material.emissive.copy(_c).multiplyScalar(V.map*rev);
      s.mesh.position.y=M.lift; s.mesh.scale.set(M.sc,1,M.sc);
      const eU=s.lines.material.uniforms; eU.uColor.value.copy(VIOLET).lerp(GOLD2,Math.max(M.hl,M.glow*0.8,M.lane*pulse)); eU.uA.value=V.edges*(0.5+Math.max(M.hl*0.7,M.glow*0.4,M.lane*0.7))*(1-M.dim*0.7);
    }
    // columns
    for(const s of states){ const C=s.C, M=s.M;
      const v=mVal(s,V.colT)*sc, v26=mVal26(s,ghostOnly?4:V.colT);
      C.th = ghostOnly ? 0.001 : Math.max(0.03,v)*V.cols+0.001;
      C.tg = v26==null ? 0.001 : Math.max(0.02,v26*sc)*V.ghost+0.001;
      C.h+=(C.th-C.h)*kh; C.g+=(C.tg-C.g)*kh;
      if(C.h>C.g+0.02 && !C.above && V.cols>0.5 && V.ghost>0.5){ C.flash=1; } C.above=C.h>C.g+0.02; C.flash*=Math.exp(-dt*2.2);
      const isHl=hl.has(s.ab), isLane=lanes.has(s.ab);
      C.tcol.copy(isHl?GOLD2:(isLane?DARKGOLD:growthColor(s)));
      C.col.lerp(C.tcol,kf);
      C.tglow = (isHl?1.0:(isLane?0.9:(colorMode==='flat'||metric==='r'?0.62:1.0))) * (1-M.dim*0.82) * (stageAb?0:1);
      C.glow+=(C.tglow-C.glow)*kf;
      const y=TOP+M.lift;
      _o.position.set(s.lx,y,s.lz); _o.rotation.set(0,0,0);
      _o.scale.set(COLR,C.h,COLR); _o.updateMatrix(); colMesh.setMatrixAt(s.i,_o.matrix);
      colMesh.geometry.attributes.aColor.setXYZ(s.i,C.col.r,C.col.g,C.col.b); colMesh.geometry.attributes.aGlow.setX(s.i,C.glow*Math.min(1,V.cols*1.5)); colMesh.geometry.attributes.aH.setX(s.i,C.h);
      _o.scale.set(COLR*1.55,C.g,COLR*1.55); _o.updateMatrix(); sleeveMesh.setMatrixAt(s.i,_o.matrix);
      sleeveMesh.geometry.attributes.aColor.setXYZ(s.i,SILVER.r,SILVER.g,SILVER.b); sleeveMesh.geometry.attributes.aGlow.setX(s.i,V.ghost*(1-M.dim*0.8)*(stageAb?0:1)*1.6); sleeveMesh.geometry.attributes.aH.setX(s.i,C.g);
      _o.position.y=y+C.g; _o.scale.setScalar(COLR*1.65); _o.updateMatrix(); ringMesh.setMatrixAt(s.i,_o.matrix);
      _c.copy(SILVER).multiplyScalar(0.9).lerp(GOLD2,C.flash).multiplyScalar(1+C.flash*2.5);
      ringMesh.geometry.attributes.aColor.setXYZ(s.i,_c.r,_c.g,_c.b); ringMesh.geometry.attributes.aGlow.setX(s.i,V.ghost*(1-M.dim*0.85)*(stageAb?0:1)*(C.g>0.03?1:0));
      _o.position.y=y+0.012; const pr=0.7+Math.min(1.8,C.h*0.14); _o.scale.set(pr*2,1,pr*2); _o.updateMatrix(); poolMesh.setMatrixAt(s.i,_o.matrix);
      poolMesh.geometry.attributes.aColor.setXYZ(s.i,C.col.r,C.col.g,C.col.b); poolMesh.geometry.attributes.aGlow.setX(s.i,C.glow*V.cols*Math.min(1,C.h*0.5)*0.55);
      // abbreviations ride the top of each column
      const L=s.L; L.p.set(s.lx, y+Math.max(C.h*V.cols,C.g*V.ghost)+0.32, s.lz);
      L.to = V.abLab*(M.dim>0.5?0.25:1)*(stageAb?0:1); L.el.classList.toggle('hi',isHl);
    }
    for(const m of [colMesh,sleeveMesh,ringMesh,poolMesh]){ m.instanceMatrix.needsUpdate=true; for(const a of ['aColor','aGlow','aH']) m.geometry.attributes[a].needsUpdate=true; }
    colMesh.visible=V.cols>0.002; sleeveMesh.visible=ringMesh.visible=V.ghost>0.002; poolMesh.visible=V.cols>0.002;
    // crowd
    const cu=crowd.uni; cu.uOld.value=V.old; cu.uNew.value=V.net; cu.uFall.value=V.fall*1.4; cu.uAct.value=V.act; crowd.tuni.uThread.value=V.thread;
    crowd.pts.visible=V.old>0.002||V.net>0.002; crowd.threads.visible=V.thread>0.002; crowd.streaks.visible=V.fall>0.001&&V.fall<0.999&&V.net>0.01;
    cloudL.p.set(CLOUD.x,CLOUD.y+1.6,CLOUD.z); cloudL.to=V.cloud;
    // vortex and core
    vortex.uni.uConv.value=V.conv; vortex.uni.uBurst.value=V.burst; vortex.uni.uA.value=V.vortex; vortex.p.visible=V.vortex>0.002;
    core.material.opacity=V.core*0.45; core.scale.setScalar(4+V.core*6+V.flash*30); core.visible=V.core>0.002;
    embers.uni.uA.value=V.embers;
    // curtain sweep
    curtain.position.x=V.curtain; curtain.material.uniforms.uA.value=V.curtainA; curtain.visible=V.curtainA>0.002;
    // spotlights and beams
    cones.forEach((c,i)=>{ const s=spot[i]&&byAb[spot[i]]; c.visible=!!s && V.cone>0.002; if(s){ c.position.set(s.lx,TOP,s.lz); c.material.uniforms.uA.value=V.cone*(0.85+0.15*Math.sin(now*0.002+i)); } });
    beams.forEach((b,i)=>{ const s=beamOn[i]&&byAb[beamOn[i]]; b.visible=!!s && V.beam>0.002; if(s){ b.position.set(s.lx,TOP+s.C.h,s.lz); b.material.opacity=V.beam*(0.7+0.3*Math.sin(now*0.003+i*1.7)); } });
    // timeline
    tlG.visible=V.tl>0.002;
    if(tlG.visible){ panes.forEach((p,i)=>{ p.h+=(p.th-p.h)*kf; p.g.scale.y=Math.max(0.001,p.h); p.e.material.opacity=0.38*V.tl; });
      monos.forEach((m,i)=>{ m.h+=(m.th-m.h)*kf; m.m.scale.y=Math.max(0.001,m.h); m.mat.uniforms.uH.value=m.h; m.mat.uniforms.uGlow.value=(i===PK?0.6:0.42)*V.tl; });
      glassMat.uniforms.uGlow.value=2.2*V.tl; axis.material.opacity=0.8*V.tl;
      tlFlare.position.set(TLX(PK),FLOOR_Y+monos[PK].h+0.2,TLZ+1.1); tlFlare.material.opacity=V.tl*Math.min(1,monos[PK].h/8)*0.16; }
    // rings
    ringsG.visible=V.rings>0.002;
    if(ringsG.visible){ trackA.material.opacity=trackN.material.opacity=0.5*V.rings; tick.material.opacity=V.rings;
      fillA.material.uniforms.uFrac.value=paceA*V.ringFrac; fillN.material.uniforms.uFrac.value=paceN*V.ringFrac; fillA.material.uniforms.uA.value=fillN.material.uniforms.uA.value=V.rings;
      const a=Math.PI/2-paceA*V.ringFrac*Math.PI*2; ringFlare.position.set(Math.cos(a)*R1,0,-Math.sin(a)*R1); ringFlare.material.opacity=V.rings*Math.min(1,V.ringFrac*4)*0.1;
      ringsG.rotation.y=reduceMotion?0:Math.sin(now*0.00008)*0.08; }
    // the map rig and the diorama rig hand over so each stage is lit for itself
    const dv=V.dio; hemi.intensity=0.75*(1-dv); key.intensity=1.25*(1-dv); rim.intensity=0.9*(1-dv); dHemi.intensity=0.26*dv; dSun.intensity=0.95*dv; dBack.intensity=0.85*dv; { const b=dio.biome(); dPoint.color.copy(b.color); dPoint.intensity=b.intensity*dv; }
    dio.group.visible=pedestal.visible=dv>0.01; if(dio.group.visible) dio.tick(now, Math.min(1,dv*1.25));
    pedestal.userData.beam.material.uniforms.uA.value=0.55*dv*(0.9+0.1*Math.sin(now*0.0013)); dioDataTick(kf,dv);
    // atmosphere
    sky.material.uniforms.uLift.value=V.skyLift; stars.material.uniforms.uA.value=0.5+0.5*V.skyLift;
    finalPass.uniforms.uFlash.value=V.flash; finalPass.uniforms.uFade.value=V.fade;
  }


  // ---------- camera ----------
  const cam={theta:-0.2, phi:0.62, r:62, tx:0, ty:4, tz:0, fov:36};
  let fly=null, drift=0, dragging=false;
  function flyTo(to, ms, arc){ fly={t0:performance.now(), dur:reduceMotion?0:(ms||2400), from:Object.assign({},cam), to:Object.assign({},cam,to), arc:arc||0}; if(reduceMotion){ Object.assign(cam,fly.to); fly=null; } }
  function setCam(to){ Object.assign(cam,to); fly=null; }
  const SAFE={x:0,y:0,w:1,h:1}, SAFE_T={x:0,y:0,w:1,h:1}; let safeT=0, safeInit=false;
  function measureSafe(now){ if(now-safeT<180) return; safeT=now; const Wd=innerWidth, Ht=innerHeight;
    const small=Wd<=820; if(small){ document.documentElement.style.setProperty('--hT',$('top').getBoundingClientRect().height+'px'); document.documentElement.style.setProperty('--hB',$('bottom').getBoundingClientRect().height+'px'); }
    const tb=document.querySelector('.bar.t').getBoundingClientRect().bottom, bb=document.querySelector('.bar.b').getBoundingClientRect().top;
    const st=$('stat'); const statOn=st.classList.contains('on') && !small && !document.body.classList.contains('cinema'); const right=statOn? st.getBoundingClientRect().left-12 : Wd;
    const hero=$('hero'); const heroB=hero.classList.contains('on')? hero.getBoundingClientRect().bottom+4 : 0;
    const top=Math.max(tb,heroB), bot=Math.max(top+120,bb);
    Object.assign(SAFE_T,{x:0,y:top,w:Math.max(200,right),h:bot-top}); if(!safeInit){ Object.assign(SAFE,SAFE_T); safeInit=true; } }
  const hand={a:0};
  function placeCamera(dt,now){
    const k=1-Math.exp(-dt*3); for(const key of ['x','y','w','h']) SAFE[key]+=(SAFE_T[key]-SAFE[key])*(reduceMotion?1:k);
    if(fly){ const p=fly.dur?clamp((now-fly.t0)/fly.dur,0,1):1; const e=ease3(p); for(const kk of ['theta','phi','r','tx','ty','tz','fov']) cam[kk]=fly.from[kk]+(fly.to[kk]-fly.from[kk])*e; cam.r+=fly.arc*Math.sin(Math.PI*p); if(p>=1) fly=null; }
    else if(drift && !dragging && !reduceMotion) cam.theta+=drift*dt;
    const t=now*0.001; const hs=reduceMotion?0:1;
    const th=cam.theta+hs*(Math.sin(t*0.37)*0.004+Math.sin(t*0.91+2)*0.0018), ph=cam.phi+hs*(Math.sin(t*0.29+1)*0.003+Math.sin(t*0.71)*0.0015);
    const sp=Math.sin(ph), fit=Math.max(1,Math.pow(1.5/(SAFE.w/SAFE.h),0.8)), R=cam.r*fit;
    camera.position.set(cam.tx+R*sp*Math.sin(th), cam.ty+R*Math.cos(ph), cam.tz+R*sp*Math.cos(th));
    camera.up.set(0,1,0); camera.lookAt(cam.tx,cam.ty,cam.tz);
    const Wd=innerWidth, Ht=innerHeight;
    camera.fov=cam.fov; camera.aspect=SAFE.w/SAFE.h; camera.setViewOffset(SAFE.w,SAFE.h,-SAFE.x,-SAFE.y,Wd,Ht); camera.updateProjectionMatrix();
    U.uPx.value=(SAFE.h*renderer.getPixelRatio()*0.5)/Math.tan(cam.fov*Math.PI/360);
  }
  // pointer orbit, for presenters who want to look around while paused
  (function(){ let px=0,py=0,id=null; canvas.addEventListener('pointerdown',e=>{ id=e.pointerId; px=e.clientX; py=e.clientY; dragging=true; fly=null; canvas.classList.add('drag'); canvas.setPointerCapture(id); });
    canvas.addEventListener('pointermove',e=>{ if(!dragging||e.pointerId!==id) return; cam.theta-=(e.clientX-px)*0.005; cam.phi=clamp(cam.phi-(e.clientY-py)*0.004,0.15,1.45); px=e.clientX; py=e.clientY; });
    const up=()=>{ dragging=false; canvas.classList.remove('drag'); }; canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up);
    canvas.addEventListener('wheel',e=>{ e.preventDefault(); fly=null; cam.r=clamp(cam.r*Math.exp(e.deltaY*0.001),8,90); },{passive:false}); })();

  // ---------- HUD ----------
  const capEl=$('caption'), kick=$('kicker'), ttl=$('sceneTitle'), prog=$('progress');
  function caption(parts){ capEl.textContent=''; for(const p of parts){ if(typeof p==='string') capEl.appendChild(document.createTextNode(p)); else { const b=document.createElement('strong'); b.textContent=p.b; capEl.appendChild(b); } } capEl.classList.remove('in'); void capEl.offsetWidth; capEl.classList.add('in'); }
  const statEl=$('stat');
  function statShow(lbl, big, sub, legend, note){ $('statLbl').textContent=lbl; $('statBig').textContent=typeof big==='number'?fmt(big):big; const sb=$('statSub'); sb.textContent=''; if(sub) for(const p of sub){ if(typeof p==='string') sb.appendChild(document.createTextNode(p)); else { const b=document.createElement('b'); b.textContent=p.b; sb.appendChild(b); } }
    const lg=$('statLg'); lg.textContent=''; for(const [c,t] of (legend||[])){ const s=document.createElement('span'); const i=document.createElement('i'); i.style.background=c; i.style.color=c; s.appendChild(i); s.appendChild(document.createTextNode(t)); lg.appendChild(s); }
    if(note){ const n=document.createElement('span'); n.className='note'; n.textContent=note; lg.appendChild(n); }
    lg.style.display=(legend&&legend.length)||note?'':'none'; statEl.classList.remove('on'); void statEl.offsetWidth; statEl.classList.add('on'); }
  function statHide(){ statEl.classList.remove('on'); }
  const hero=$('hero'), heroNum=$('heroNum'), heroLab=$('heroLab'); let heroRaf=0;
  function heroCount(to, lab, f, ms, from){ f=f||fmt; hero.classList.add('on'); heroLab.textContent=lab; cancelAnimationFrame(heroRaf); const t0=performance.now(), d=reduceMotion?0:(ms||1600), a=from||0;
    const step=now=>{ const p=d?Math.min(1,(now-t0)/d):1; heroNum.textContent=f(a+(to-a)*easeOut(p)); if(p<1) heroRaf=requestAnimationFrame(step); }; heroRaf=requestAnimationFrame(step); }
  function heroSet(text, lab){ hero.classList.add('on'); heroNum.textContent=text; if(lab!=null) heroLab.textContent=lab; }
  function heroHide(){ hero.classList.remove('on'); cancelAnimationFrame(heroRaf); }
  const cold=$('cold'), coldNum=$('coldNum'), coldLine=$('coldLine'), finale=$('finale'), chapter=$('chapter');
  function cinema(on){ document.body.classList.toggle('cinema',!!on); }
  const stTitle=$('stTitle');
  function stateTitle(name, sub){ $('stName').textContent=name; $('stSub').textContent=sub; stTitle.classList.remove('on'); void stTitle.offsetWidth; stTitle.classList.add('on'); later(()=>stTitle.classList.remove('on'),4200); }
  function overlaysOff(){ stTitle.classList.remove('on'); cold.classList.remove('on'); coldLine.classList.remove('on'); finale.classList.remove('on'); chapter.classList.remove('on'); cinema(false); heroHide(); }
  function tag(i, s, parts, cls, dy){ const L=tags[i]; setText(L,parts); L.el.className='lbl tag'+(cls?' '+cls:''); L.st=s; L.dy=dy||0; L.to=1; return L; }
  function tagsTick(){ for(const L of tags){ const s=L.st; if(!s) continue; L.p.set(s.lx, TOP+s.M.lift+Math.max(s.C.h*V.cols,s.C.g*V.ghost)+0.75+L.dy, s.lz); } }

  (function(){ const row=$('finRow'); [['×'+ratio.toFixed(1),'the actions of the same days last year'],[fmt(new27),'new advocates since July 1, ×'+(new27/new26).toFixed(1)+' last year'],[ahead.length+' of '+states.length,'ahead of their own FY26 start ('+juris+')']].forEach(([n,l])=>{ const c=document.createElement('div'); c.className='cell'; const a=document.createElement('div'); a.className='n'; a.textContent=n; const b=document.createElement('div'); b.className='l'; b.textContent=l; c.appendChild(a); c.appendChild(b); row.appendChild(c); });
    const cta=$('finCta'); cta.appendChild(document.createTextNode('Every email, every text, every call in the weeks ahead keeps this curve climbing. ')); const b=document.createElement('b'); b.textContent='Keep up the momentum.'; cta.appendChild(b); })();

  // ---------- scenes ----------
  const timers=new Set(); function later(fn,ms){ if(reduceMotion){ fn(); return; } const id=setTimeout(()=>{ timers.delete(id); fn(); },ms); timers.add(id); }
  function clearTimers(){ for(const id of timers) clearTimeout(id); timers.clear(); }
  let runId=0;
  const HOME={tx:0,ty:1.6,tz:0.9,theta:-0.3,phi:0.98,r:42,fov:36};
  const COLS={tx:0.6,ty:3.2,tz:0.4,theta:-0.36,phi:1.02,r:42,fov:36};
  const legend26=['rgba(201,195,211,.9)','FY26, same days (glass column and ring)'];
  const legendRamp=['#3cc2ae','FY27 · more saturated teal = bigger jump on FY26'];

  const NOCH=new Set(['Opening','Close','Explore']);
  let scenes=[], idx=0, timer=null, paused=false, overlay=null, cameFrom=null, tour=[];

  function buildScenes(){
    scenes=[
      {k:'Opening', t:'FY27 so far', stage:'cold', ms:15000, run(){ const my=runId; cinema(true); statHide(); hideLabels();
          world({map:0, edges:0, vortex:1, core:0.3, cols:0, colT:4, skyLift:0.4},0); EDGE_U.uReveal.value=-30; tw('conv',0,0); tw('burst',0,0); tw('flash',0,0);
          setCam({tx:0,ty:5,tz:0,theta:-0.25,phi:1.05,r:38,fov:40}); flyTo({theta:0.35,phi:0.95,r:30,fov:36},8800); drift=0;
          cold.classList.add('on'); coldLine.classList.remove('on'); caption(['']);
          tw('conv',1,4600,t=>t*t*(3-2*t)); tw('core',1,4600);
          const t0=performance.now(), d=reduceMotion?0:4600; const step=now=>{ if(runId!==my) return; const p=d?Math.min(1,(now-t0)/d):1; coldNum.textContent=fmt(total27*(1-Math.pow(1-p,4))); if(p<1) requestAnimationFrame(step); }; coldNum.textContent='0'; requestAnimationFrame(step);
          later(()=>{ coldLine.textContent=''; const b=document.createElement('b'); b.textContent='×'+ratio.toFixed(1); coldLine.appendChild(b); coldLine.appendChild(document.createTextNode(' the same '+dayWord+' days last year.')); coldLine.classList.add('on'); }, 5000);
          later(()=>{ cold.classList.remove('on'); curStage='map'; tw('flash',0.55,140); later(()=>tw('flash',0,1600),160); tw('burst',1,3200,easeOut); tw('core',0,1200); tw('vortex',0,3200); tw('map',1,2600); tw('edges',1,1200); tw('skyLift',1,3000);
            const r0=performance.now(); const rv=now=>{ if(runId!==my) return; const p=Math.min(1,(now-r0)/2600); EDGE_U.uReveal.value=-20+46*easeOut(p); if(p<1) requestAnimationFrame(rv); }; requestAnimationFrame(rv);
            if(reduceMotion) EDGE_U.uReveal.value=40;
            flyTo(HOME,5200,6); later(()=>{ tw('cols',1,2600); tw('abLab',0.7,2000); },1600); }, 8600);
          later(()=>{ cinema(false); caption(['July 1 to October ', {b: asOf.getDate()+', 2026'}, '. What ', {b: fmt(N.tk)+' advocates'}, ' did for the cause, told against the same days a year ago. Every number is from Quorum.']); drift=0.012; }, 10600); } },
      {k:'Opening', t:'The first '+fyDay+' days of FY27', stage:'map', ms:9000, run(){ cinema(false); world({cols:1, colT:4, abLab:0.7}); EDGE_U.uReveal.value=40; statHide();
          if(cam.r>60) setCam(HOME); flyTo({tx:0.4,ty:2.2,tz:0.6,theta:-0.05,phi:1.04,r:39},8600); drift=0.006;
          caption(['July 1 to October ', {b: asOf.getDate()+', 2026'}, '. What ', {b: fmt(N.tk)+' advocates'}, ' did, told against the same days a year ago. Every number is from Quorum.']); } },
      {k:'Recruitment', t:'The people on the list', stage:'map', ms:12000, run(){ world({map:0.3, edges:0.6, old:1, net:0, fall:0, actP:0, thread:0, cols:0, cloud:1});
          flyTo({tx:2.4,ty:0,tz:0.8,theta:-0.55,phi:1.1,r:33},10000,3); drift=0.01;
          setText(cloudL,[{b:fmt(noStateC26)}, 'no state on file']);
          caption(['A year ago today, ', {b: fmt(N.c26)+' advocates'}, ' were on the list. Each light is 100 people, shown in their state; the ', fmt(noStateC26), ' with no state on file hover offshore.']);
          later(()=>statShow('On the list, '+monthFull[(asOf.getMonth()+6)%12]+' '+asOf.getDate()+', '+(asOf.getFullYear()-1), N.c26, null, [['#8f87a3','About 100 advocates per light']], 'Where a light sits inside its state is illustrative.'), 500); } },
      {k:'Recruitment', t:'Who joined since', stage:'map', ms:12000, run(){ world({map:0.3, edges:0.6, old:1, net:1, fall:1, fallMs:5600, actP:0, thread:0, cols:0, cloud:1}); tw('fall',0,0); tw('fall',1,5600,t=>t);
          flyTo({tx:2,ty:0.4,tz:0.4,theta:-0.15,phi:1.05,r:31},10000); drift=0.01;
          setText(cloudL,[{b:fmt(noStateC)}, 'no state on file']);
          caption(['Since July 1, ', {b: fmt(new27)+' new advocates'}, ' arrived, against ' + fmt(new26) + ' in the same window last year. The list stands at ', {b: fmt(N.c)}, '.']);
          statShow('On the list today', N.c, ['New since July 1: ', {b: fmt(new27)}, ' (×' + (new27/new26).toFixed(1) + ' last year)'], [['#8f87a3','On the list a year ago'],['#72f0d8','Falling lights: new since July 1'],['#ffffff','Rest of the net growth since a year ago']], 'Net change over the year: +'+fmt(N.c-N.c26)+'.'); } },
      {k:'Recruitment', t:'Who showed up', stage:'map', ms:13000, run(){ world({map:0.3, edges:0.6, old:1, net:1, fall:1, actP:1, actMs:4200, thread:1, cols:0, cloud:1}); tw('act',0,0); tw('act',1,4200,t=>t);
          flyTo({tx:1.2,ty:0.8,tz:1.0,theta:0.4,phi:1.16,r:28},11000,2); drift=0.012;
          caption([{b: fmt(N.tk)+' of them'}, ' took an action for the cause this fiscal year: ' + pct(N.tk/N.c) + ' of everyone on the list, each acting ' + perActor.toFixed(1) + ' times on average.']);
          statShow('Took action in FY27', N.tk, [{b: pct(N.tk/N.c)}, ' of the list'], [['#8f87a3','On the list a year ago'],['#ffffff','Joined or added since'],['#ffa400','Took action in FY27']]); } },
      {k:'Action', t:'A year ago, by state', stage:'map', ms:11000, run(){ world({old:0.12, net:0.12, thread:0, ghost:1, ghostOnly:true, cols:0, colT:4, abLab:0.8});
          flyTo(Object.assign({},COLS,{theta:-0.55,phi:1.05,r:43}),7000); drift=0.008;
          caption(['Now the states. The glass columns are the same window of ', {b:'FY26'}, ': ' + fmt(total26) + ' actions in all, ' + fmt(stSum26) + ' of them tied to a state. The map is geographic, with Alaska and Hawaii inset.']);
          statShow('FY26 · Jul 1 to Oct '+asOf.getDate()+', '+(asOf.getFullYear()-1), total26, ['actions to elected officials'], [legend26]); } },
      {k:'Action', t:'This year rises', stage:'map', ms:16000, run(){ const my=runId; statHide(); world({ghost:1, cols:1, colT:0, abLab:0.8}); tw('colT',0,0);
          flyTo(Object.assign({},COLS,{theta:0.08,phi:1.0,r:41,ty:3.6}),14500); drift=0;
          caption(['Watch FY27 grow month by month, ', {b:'July'}, ' first. Each glass ring is where the state stood on the same day last year.']);
          later(()=>{ if(runId!==my) return; tw('colT',4,11000,t=>t); const t0=performance.now(); const names=['July','August','September','October'];
            const step=now=>{ if(runId!==my) return; const T=V.colT; const m=Math.min(3,Math.floor(T)); const r26=cum(N.a26,T);
              heroSet(fmt(cum(N.a,T)), (T>=3.999?'by October '+asOf.getDate():'through '+names[m]) + ' · ×' + (r26>0?(cum(N.a,T)/r26).toFixed(1):'0') + ' the same days last year');
              if(now-t0<11400 && !reduceMotion) requestAnimationFrame(step);
              else { heroSet(fmt(total27),'by October '+asOf.getDate()+' · ×'+ratio.toFixed(1)+' the same days last year'); caption([{b: fmt(total27)+' actions'}, ' by October '+asOf.getDate()+', against ' + fmt(total26) + ' a year earlier: ×' + ratio.toFixed(1) + '. The more saturated the teal, the bigger the state\'s jump on its own FY26.']);
                statShow('FY27 against FY26, same days', '×'+ratio.toFixed(1), [fmt(total27)+' vs '+fmt(total26)+' actions'], [legendRamp, legend26]); } };
            requestAnimationFrame(step); }, 900); } },
      {k:'Action', t:'One month made the year', stage:'timeline', ms:16000, run(){ const my=runId; statHide(); world({map:0, edges:0, tl:1, cols:0, ghost:0, abLab:0, embers:0.2});
          panes.forEach(p=>p.th=0); monos.forEach(m=>m.th=0); for(const L of mo26L.concat(mo27L)) L.to=0;
          flyTo({tx:-6.5,ty:3.2,tz:TLZ+2,theta:-0.62,phi:1.3,r:21,fov:38},4200); drift=0;
          moL.forEach((L,i)=>{ L.p.set(TLX(i),FLOOR_Y+0.1,TLZ+3.2); L.to=0.9; });
          caption(['Lay the months out in a row. First ', {b:'last year'}, ', July to June, in glass.']);
          let i=0; const t1=()=>{ if(runId!==my) return; panes[i].th=N.full12[i]*TLH; const L=mo26L[i]; setText(L,fmt(N.full12[i])); L.el.className='lbl val'; L.el.style.color='rgba(255,255,255,.55)'; L.p.set(TLX(i),FLOOR_Y+N.full12[i]*TLH+0.35,TLZ-1.6); L.to=0.8; i++; if(i<12) later(t1,230); };
          later(t1,1300); later(()=>flyTo({tx:0,ty:3.5,tz:TLZ+1,theta:0.18,phi:1.26,r:27},4500),3600);
          later(()=>{ if(runId!==my) return; caption(['Now ', {b:'this year'}, ' in front. '+PKM+': ', {b: fmt(N.a[PK])+' actions'}, ', ' + pct(N.a[PK]/total27,0) + ' of FY27 so far' + (PK===2?', stacked around the Ways and Means markup':'') + '.' + (beatAll?' It beat every single month of FY26.':'')]);
            let j=0; const t2=()=>{ if(runId!==my) return; monos[j].th=N.a[j]*TLH; mo26L[j].to=0; const L=mo27L[j]; setText(L, (j===3?'Oct 1 to '+asOf.getDate()+': ':'')+fmt(N.a[j])); L.el.className='lbl val'+(j===PK?' gold':''); L.p.set(TLX(j),FLOOR_Y+N.a[j]*TLH+0.45,TLZ+1.1); L.to=1; j++; if(j<4) later(t2,650); else { flyTo({tx:TLX(PK)*0.45,ty:5.2,tz:TLZ+0.5,theta:0.3,phi:1.33,r:31},3600); heroCount(N.a[PK],'actions in '+PKM+(PK===2?' · Ways and Means markup':'')+(beatAll?' · more than any single month of FY26':''),null,1600);
              mo27L[PK].to=0; const bi=N.full12.indexOf(best26); statShow(PKM+' vs the best FY26 month', '×'+(N.a[PK]/best26).toFixed(1), ['Best FY26 month: ' + monthFull[bi] + ', ' + fmt(N.full12[bi]) + ' · FY27: Jul ' + fmt(N.a[0]) + ' · Aug ' + fmt(N.a[1]) + ' · Oct 1 to '+asOf.getDate()+': ' + fmt(N.a[3])], [['#ffc54d',PKM+' FY27'],['#ffffff','FY27 months'],['rgba(201,195,211,.9)','FY26 full months, in glass']], 'FY26 October is the full month; FY27 October is only '+asOf.getDate()+' days so far.'); } };
            t2(); }, 7400); } },
      {k:'Growth', t:'Almost every state is ahead', stage:'map', ms:18000, run(){ const my=runId; statHide(); world({cols:1, colT:4, ghost:1, abLab:0.55});
          flyTo(Object.assign({},COLS,{theta:-0.42,phi:1.02,r:42}),2600); drift=0;
          heroCount(0,'of '+states.length+' ahead of their own start last year',v=>String(Math.round(v)),1);
          const order=ahead.slice().sort((a,b)=>a.lx-b.lx); let w=0; const lit=new Set();
          later(()=>{ if(runId!==my) return; tw('curtainA',1,500); V.curtain=-19; tw('curtain',19.5,5200,t=>t);
            const sweep=()=>{ if(runId!==my) return; while(w<order.length && order[w].lx<=V.curtain){ lit.add(order[w].ab); w++; } litAhead=new Set(lit); if(w>0) heroSet(String(w)); if(w<order.length && !reduceMotion) requestAnimationFrame(sweep); else { litAhead=new Set(order.map(s=>s.ab)); heroSet(String(order.length)+' of '+states.length,'ahead of their own start last year'); later(()=>{ if(runId!==my) return; tw('curtainA',0,800); hl=new Set(grow.slice(0,4).map(x=>x.ab)); beamOn=grow.slice(0,4).map(x=>x.ab); tw('beam',1,1200);
              grow.slice(0,4).forEach((x,i)=>tag(i,byAb[x.ab],[byAb[x.ab].name+' ',{b:'×'+x.g.toFixed(1)}],'',i%2?0.5:0)); heroSet(String(order.length)+' of '+states.length,'ahead · gold: the four steepest climbs'); },700); } };
            if(reduceMotion){ V.curtain=19.5; } requestAnimationFrame(sweep); }, 1400);
          const lean=(ab,th)=>{ const s=byAb[ab]; return {tx:s.lx*0.55, tz:s.lz*0.55, ty:2.4, r:31, phi:1.0, theta:th}; };
          later(()=>flyTo(lean(grow[0].ab,-0.75),3800), 8200); later(()=>flyTo(lean(grow[2].ab,0.3),3800), 12400);
          caption([{b: ahead.length+' of '+states.length}, ' (' + juris + ') are ahead of where they stood a year ago. Steepest climbs on a real base: ' + grow.slice(0,4).map(x=>byAb[x.ab].name+' ×'+x.g.toFixed(1)).join(', ') + '.']); } },
      {k:'Growth', t:'Where the volume sits', stage:'map', ms:15000, run(){ const top3=byAct.slice(0,3); world({cols:1, colT:4, ghost:0.35, hl:top3.map(s=>s.ab), dimOthers:true, spot:top3.map(s=>s.ab), cone:1, abLab:0.5});
          flyTo(Object.assign({},COLS,{theta:0.12,phi:1.0,r:40}),3600); later(()=>flyTo({tx:3,ty:3,tz:0,theta:0.55,phi:1.02,r:37},6000), 4600); drift=0;
          top3.forEach((s,i)=>tag(i,s,[s.name+' ',{b:fmt(cum(s.a,4))}],'',0.2));
          caption([{b: top3.map(s=>s.name).join(', ')}, ' hold ' + pct(top3.reduce((x,s)=>x+cum(s.a,4),0)/stSum,0) + ' of state-attributed actions; the top ten hold ' + pct(byAct.slice(0,10).reduce((x,s)=>x+cum(s.a,4),0)/stSum,0) + '. Read the short columns as capacity, not failure.']);
          statShow('Top three states', top3.reduce((x,s)=>x+cum(s.a,4),0), ['actions · ' + top3.map(s=>s.ab+' '+fmt(cum(s.a,4))).join(' · ')], [['#ffc54d','Top three'],['rgba(201,195,211,.6)','Everyone else']], 'Shares are of the '+fmt(stSum)+' actions tied to a state.'); } },
      {k:'Engagement', t:'List size is not engagement', stage:'map', ms:17000, run(){ const my=runId; world({cols:1, colT:4, ghost:0, colorMode:'flat', abLab:0.6});
          flyTo(Object.assign({},COLS,{theta:-0.5,phi:1.04,r:41}),2600); drift=0;
          caption(['Same states, same camera. Right now height is raw volume.']); statHide();
          later(()=>{ if(runId!==my) return; metric='r'; hl=new Set(byRate.slice(0,3).map(s=>s.ab));
            byRate.slice(0,3).forEach((s,i)=>tag(i,s,[s.name+' ',{b:pct(s.tk/s.c)}],'',0.3));
            caption(['Switch the height to the ', {b:'share of each list that acted'}, ' and the skyline flattens. ' + byRate.slice(0,3).map(s=>s.name+' '+pct(s.tk/s.c)).join(', ') + ' lead; ' + byRate.slice(-3).map(s=>s.ab+' '+pct(s.tk/s.c)).join(', ') + ' trail. Double digits are reachable at very different list sizes.']);
            statShow('Share of list who acted', pct(N.tk/N.c), ['national · best: ', {b: byRate[0].name + ' ' + pct(byRate[0].tk/byRate[0].c)}], [['#ffc54d','Top three by share']], 'Ranking counts states with more than 500 advocates on the list.');
            const s0=byRate[0]; flyTo({tx:s0.lx*0.45, tz:s0.lz*0.45, ty:2.6, r:39, phi:1.0, theta:0.36}, 4200); }, 3400); } },
      {k:'Channels', t:'The under-used channel', stage:'map', ms:17000, run(){ world({cols:1, colT:4, ghost:1, metric:'t', lanes:zeroText.map(s=>s.ab), abLab:0.6});
          flyTo(Object.assign({},COLS,{theta:-0.38,phi:0.98,r:40}),6000); drift=0.006;
          caption(['Height is now ', {b:'texts delivered'}, '. Texts were clicked at ' + pct(N.t_clicks/sum(N.t),0) + ' of delivered against ' + pct(N.e_clicks/sum(N.e),1) + ' for email, and produced ' + fmt(N.t_conv) + ' tracked conversions. The pulsing gold states are the ', {b: zeroText.length + ' states'}, ' that sent no state texts this window. Every one is an open lane.']);
          statShow('Texts delivered, FY27', sum(N.t), ['vs ' + fmt(sum(N.t26)) + ' last year · ' + fmt(N.t_conv) + ' conversions'], [['#a36a10','No state texts this window'],['#3cc2ae','Texts up on FY26'],legend26]); } },
    ];
    for(const ab of tour){ if(byAb[ab]) scenes.push(...stateScenes(byAb[ab])); }
    scenes.push({k:'Pace', t:'Against all of last year', stage:'rings', ms:15000, run(){ const my=runId; statHide(); world({cols:0, ghost:0, rings:1, map:0, edges:0, abLab:0, embers:0.15}); tw('ringFrac',0,0);
        flyTo({tx:0,ty:RING_Y,tz:0,theta:0.2,phi:1.72,r:17,fov:44},4200); drift=0;
        later(()=>flyTo({tx:0,ty:RING_Y-1.5,tz:0,theta:0.55,phi:0.72,r:30,fov:38},8000),4600);
        const ra=Math.PI/2-(fyPct/100)*Math.PI*2;
        ringL[0].p.set(-R1-0.4,RING_Y+0.7,0); setText(ringL[0],['Actions · ',{b:pct(paceA,0)},' of all FY26']);
        ringL[1].p.set(0,RING_Y+0.6,R2+0.2); setText(ringL[1],['New advocates · ',{b:pct(paceN,0)},' of all FY26']);
        ringL[2].p.set(Math.cos(ra)*(R1+1.6),RING_Y+0.5,-Math.sin(ra)*(R1+1.6)); setText(ringL[2],['Today · ',{b:fyPct+'%'},' of the year']);
        ringL.forEach(L=>L.to=1);
        caption(['Two rings. The gold blade is today: ', {b: fyPct+'% of the fiscal year'}, ' has passed. The fill is how much of ', {b:'all of last year'}, ' this year has already matched.']);
        later(()=>{ if(runId!==my) return; tw('ringFrac',1,3200,easeOut); heroCount(paceA*100,'of all of FY26\'s actions already matched, with '+fyPct+'% of the year gone',v=>Math.round(v)+'%',3200);
          statShow('FY27 vs all of FY26', pct(paceA,0), ['of FY26 actions · ', {b: pct(paceN,0)}, ' of FY26 new advocates'], [['#ffffff','Outer ring: actions'],['#3fc2b0','Inner ring: new advocates'],['#ffa400','Gold blade: today, '+fyPct+'% of the year']], pct(N.a[PK]/total27,0)+' of FY27 actions so far came in '+PKM+', so read pace with that spike in mind.'); }, 2600); } });
    scenes.push({k:'Close', t:'Keep up the momentum', stage:'map', ms:22000, run(){ statHide(); world({cols:1, colT:4, ghost:0.5, embers:1, abLab:0});
        flyTo({tx:0,ty:2.6,tz:0,theta:-0.5,phi:1.08,r:47,fov:36},4500); drift=0.02; cinema(true); later(()=>finale.classList.add('on'), 1400);
        caption(['×'+ratio.toFixed(1)+' the actions, ×'+(new27/new26).toFixed(1)+' the recruits, '+ahead.length+' of '+states.length+' ahead of last year'+(beatAll?', and one month that outdid any month of FY26':'')+'. Replay, or pick a state to explore.']); } });
  }

  function stateScenes(s, opts){ opts=opts||{}; const dm=dio.meta(s.ab); const m={nick:dm.nick||s.meta.nick, known:dm.known||s.meta.known, cap:dm.cap||s.meta.cap};
    const a=cum(s.a,4), a26=cum(s.a26,4), n=cum(s.n,4), n26=cum(s.n26,4); const rank=byAct.findIndex(x=>x.ab===s.ab)+1; const best=s.a.indexOf(Math.max(...s.a));
    const k=opts.explore?'Explore':'State tour';
    const arrive={k, t:s.name, st:s.ab, stage:'map', ms:13500, run(){ const my=runId; statHide(); world({cols:1, colT:4, ghost:0, hl:[s.ab], dimOthers:true, abLab:0.4}); let delay=0;
        if(cameFrom && cameFrom!==s.ab && cam.r<30){ flyTo(HOME,2600,4); delay=2600; caption(['Back out to the map, then across to ', {b:s.name}, '.']); }
        else { if(cam.r<18) setCam(HOME); flyTo(HOME,1000); delay=1000; caption(['Next, ', {b:s.name}, '. Find it on the map.']); }
        later(()=>{ if(runId!==my) return; world({cols:0, ghost:0, hl:[s.ab], stageAb:s.ab, abLab:0}); flyTo({tx:s.lx,ty:1.4,tz:s.lz,theta:-0.3,phi:0.9,r:10},2600); caption(['Diving into ', {b:s.name}, '.']); }, delay);
        later(()=>{ if(runId!==my) return; cut('dio', ()=>{ dio.load(s.ab,true); dioSet(s); DD.on=false; DD.h.fill(0); DD.g.fill(0); world({map:0, edges:0, cols:0, ghost:0, dio:1, abLab:0, embers:0.3}); setCam(DIO_A0); flyTo(DIO_A1,5600); later(()=>{ if(runId===my) flyTo(Object.assign({},DIO_A1,DIO_A2),6200); },5600); drift=0;
            stateTitle(s.name, [m.nick?'The '+m.nick:'', m.cap?'Capital '+m.cap:''].filter(Boolean).join(' · ')); later(()=>{ if(runId===my && dio.capital()) dioCap.to=1; },2900);
            caption([{b:s.name}, (m.nick?', the ' + m.nick:'') + (m.cap?'. Capital: ':''), m.cap?{b:m.cap}:'', '. ' + (m.known||'')]); }); }, delay+2500);
        this.ms=delay+13000; } };
    const numbers={k, t:s.name+' by the numbers', st:s.ab, stage:'dio', cut:Object.assign({},DIO_A1,DIO_A2), ms:15000, run(){ const my=runId; statHide(); if(dio.ab!==s.ab) dio.load(s.ab,false); dioSet(s); world({map:0, edges:0, cols:0, ghost:0, dio:1, abLab:0, embers:0.3}); DD.on=true;
        flyTo(DIO_N,9000); drift=0; if(dio.capital()) dioCap.to=1; later(()=>{ if(runId!==my) return; for(const L of DIO_LBL) L.to=1; },1400);
        caption([{b:s.name}, ': ' + fmt(a) + ' actions since July 1 against ' + fmt(a26) + ' in the same window last year' + (a26? ' (×'+(a/a26).toFixed(1)+')':'') + '. ' + monthFull[best] + ' was the big month. ' + fmt(n) + ' new advocates joined (' + fmt(n26) + ' last year) and ' + pct(s.c? s.tk/s.c:0) + ' of the list took action.']);
        later(()=>statShow(s.name + (m.cap?' · capital ' + m.cap:'') + ' · FY27 to date', a, ['Rank ', {b: rank + ' of ' + states.length}, ' on actions · ' + fmt(s.tk) + ' of ' + fmt(s.c) + ' advocates acted · emails ' + fmt(sum(s.e)) + ' · texts ' + fmt(sum(s.t))], [['#ffffff','FY27 actions by month'],['#ffc54d',PKM],['rgba(201,195,211,.9)','Glass and ring: same month of FY26'],['#3fc2b0','New advocates since July 1 (own scale)']], 'October is October 1 to '+asOf.getDate()+' in both years.'), 700); } };
    return [arrive, numbers]; }

  // ---------- navigation ----------
  function list(){ return overlay? overlay.scenes : scenes; }
  function renderProgress(){ prog.textContent=''; const L=list(); L.forEach((sc,j)=>{ const sp=document.createElement('span'); if(j>0 && L[j-1].k!==sc.k) sp.classList.add('ch'); prog.appendChild(sp); }); markProgress(); }
  function markProgress(ms){ [...prog.children].forEach((sp,j)=>{ sp.classList.toggle('done',j<idx); sp.classList.toggle('live',j===idx); if(ms!=null) sp.style.setProperty('--ms',ms+'ms'); }); }
  let lastChapter=null;
  function showAt(i){ const L=list(); clearTimeout(timer); clearTimers(); drift=0; runId++; overlaysOff(); statHide(); hideLabels(); for(const s of states) s.L.to=0;
    tw('curtainA',0,300); EDGE_U.uReveal.value=Math.max(EDGE_U.uReveal.value, i===0&&!overlay?-30:40);
    idx=clamp(i,0,L.length-1); const sc=L[idx]; if(!sc.st) cameFrom=null;
    const chs=[...new Set(L.map(x=>x.k))].filter(k=>!NOCH.has(k)); const chn=chs.indexOf(sc.k)+1; const chs2=chn? String(chn).padStart(2,'0') : '';
    kick.textContent=(chs2?'Chapter '+chs2+' · ':'')+sc.k+' · '+(idx+1)+' of '+L.length; ttl.textContent=sc.t;
    // chapter card, shown when the story enters a new chapter
    const needCut = !!sc.stage && sc.stage!==curStage && !reduceMotion;
    if(!overlay && chs2 && sc.k!==lastChapter && L[idx-1] && L[idx-1].k!==sc.k){ $('chNum').textContent=chs2; $('chName').textContent=sc.k; chapter.classList.add('on'); if(!needCut){ tw('fade',0.35,250); later(()=>tw('fade',0,900),260); } later(()=>chapter.classList.remove('on'),2300); }
    else if(!needCut) tw('fade',0,350);
    lastChapter=sc.k;
    const my=runId;
    const go=()=>{ sc.run(); if(sc.st) cameFrom=sc.st; markProgress(sc.ms); prog.classList.toggle('paused',paused);
      clearTimeout(timer); if(!paused && !reduceMotion && idx<L.length-1 && runId===my) timer=setTimeout(()=>show(idx+1), sc.ms); };
    if(needCut) cut(sc.stage, ()=>{ setCam(sc.cut || STAGE_CAM[sc.stage] || cam); go(); }); else { if(sc.stage) curStage=sc.stage; go(); }
    $('prevBtn').disabled= idx===0; $('nextBtn').textContent= idx===L.length-1? (overlay?'Back to story':'Replay'):'Next'; }
  const STAGE_CAM={ map:{tx:0.6,ty:3.2,tz:0.4,theta:-0.36,phi:1.02,r:44,fov:36}, timeline:{tx:-8,ty:3.6,tz:TLZ+2,theta:-0.78,phi:1.28,r:27,fov:38}, rings:{tx:0,ty:RING_Y,tz:0,theta:-0.1,phi:1.62,r:22,fov:44}, dio:DIO_A0 };
  function cut(stage, fn){ const my=runId; if(reduceMotion || curStage===stage){ curStage=stage; fn(); return; }
    tw('fade',1,380,t=>t*t); later(()=>{ if(runId!==my) return; curStage=stage; SNAP=true; try{ fn(); } finally{ SNAP=false; } tw('fade',0,850); },400); }
  function show(i){ const L=list(); const cur=L[idx]; cameFrom = cur && cur.st ? cur.st : null; if(i===0 && !overlay) lastChapter=null; showAt(i); }
  $('prevBtn').addEventListener('click',()=>show(idx-1));
  $('nextBtn').addEventListener('click',()=>{ const L=list(); if(idx===L.length-1 && overlay){ $('backBtn').click(); return; } show(idx===L.length-1?0:idx+1); });
  const pauseBtn=$('pauseBtn'); pauseBtn.addEventListener('click',()=>{ paused=!paused; pauseBtn.textContent=paused?'Resume':'Pause'; prog.classList.toggle('paused',paused); if(paused) clearTimeout(timer); else if(idx<list().length-1) timer=setTimeout(()=>show(idx+1), 4000); });
  function fullscreen(){ const d=document; if(!d.fullscreenElement){ (d.documentElement.requestFullscreen||d.documentElement.webkitRequestFullscreen||function(){}).call(d.documentElement); } else { (d.exitFullscreen||d.webkitExitFullscreen||function(){}).call(d); } }
  $('fsBtn').addEventListener('click',fullscreen);
  window.addEventListener('keydown',e=>{ if(/^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)) return; if(e.key==='ArrowRight'||e.key==='PageDown') show(idx+1); else if(e.key==='ArrowLeft'||e.key==='PageUp') show(idx-1); else if(e.key===' '){ e.preventDefault(); pauseBtn.click(); } else if(e.key==='f'||e.key==='F') fullscreen(); });

  const sel=$('stateSel'); states.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(s=>{ const o=document.createElement('option'); o.value=s.ab; o.textContent=s.name; sel.appendChild(o); });
  sel.addEventListener('change',()=>{ const ab=sel.value; sel.value=''; if(!ab) return; const cur=list()[idx]; cameFrom=cur&&cur.st?cur.st:null; if(!overlay) overlay={back:idx, scenes:[]}; overlay.scenes=stateScenes(byAb[ab],{explore:true}); $('backBtn').classList.add('on'); paused=false; pauseBtn.textContent='Pause'; renderProgress(); showAt(0); });
  $('backBtn').addEventListener('click',()=>{ if(!overlay) return; const back=overlay.back; overlay=null; cameFrom=null; $('backBtn').classList.remove('on'); renderProgress(); lastChapter=scenes[back]&&scenes[back].k; showAt(back); });

  // tour selection: #tour=NJ,TX in the link, else this browser's saved tour
  function readTour(){ const h=(location.hash||'').match(/tour=([A-Za-z,]+)/); let l=null; if(h) l=h[1].toUpperCase().split(','); else { try{ const s=localStorage.getItem('fy27tour'); if(s) l=JSON.parse(s); }catch(e){} } if(!Array.isArray(l)) l=[]; return l.filter((ab,i)=>byAb[ab] && l.indexOf(ab)===i); }
  tour=readTour();
  const tp=$('tourPanel'), tg=$('tourGrid'), tOrder=$('tourOrder'), tCode=$('tourCode'), tMsg=$('tourMsg');
  let draft=tour.slice();
  states.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(s=>{ const l=document.createElement('label'); const i=document.createElement('input'); i.type='checkbox'; i.value=s.ab; i.checked=draft.includes(s.ab); i.addEventListener('change',()=>{ if(i.checked){ if(!draft.includes(s.ab)) draft.push(s.ab); } else draft=draft.filter(x=>x!==s.ab); syncTour(); }); l.appendChild(i); l.appendChild(document.createTextNode(s.name)); tg.appendChild(l); });
  function syncTour(){ tOrder.textContent=''; if(!draft.length){ tOrder.textContent='No states selected: the story runs national only.'; } else { tOrder.appendChild(document.createTextNode('Order: ')); draft.forEach((ab,i)=>{ const b=document.createElement('b'); b.textContent=byAb[ab].name; tOrder.appendChild(b); if(i<draft.length-1) tOrder.appendChild(document.createTextNode(' → ')); }); } tCode.value=draft.join(','); [...tg.querySelectorAll('input')].forEach(i=>{ i.checked=draft.includes(i.value); }); }
  function applyTour(l){ tour=l.filter((ab,i)=>byAb[ab] && l.indexOf(ab)===i); draft=tour.slice(); syncTour(); try{ localStorage.setItem('fy27tour',JSON.stringify(tour)); }catch(e){} try{ history.replaceState(null,'', tour.length? '#tour='+tour.join(',') : location.pathname+location.search); }catch(e){}
    buildScenes(); if(overlay){ overlay.back=Math.min(overlay.back,scenes.length-1); } else { idx=clamp(idx,0,scenes.length-1); } renderProgress(); tMsg.textContent= tour.length? 'Tour set: '+tour.length+' state'+(tour.length>1?'s':'')+' added after the Channels chapter.' : 'Tour cleared.'; }
  $('tourBtn').addEventListener('click',()=>{ tp.classList.toggle('on'); syncTour(); tMsg.textContent=''; });
  $('tourClose').addEventListener('click',()=>tp.classList.remove('on'));
  $('tourClear').addEventListener('click',()=>{ draft=[]; syncTour(); });
  $('tourApply').addEventListener('click',()=>{ const typed=tCode.value.toUpperCase().split(/[^A-Z]+/).filter(Boolean); applyTour(typed.length||!tCode.value.trim()? typed : draft); });
  tCode.addEventListener('change',()=>{ draft=tCode.value.toUpperCase().split(/[^A-Z]+/).filter(ab=>byAb[ab]); syncTour(); });
  $('tourCopy').addEventListener('click',async()=>{ const code=draft.join(','); const url=(location.href.split('#')[0])+(code?'#tour='+code:''); try{ await navigator.clipboard.writeText(url); tMsg.textContent='Link copied. Tour code: '+(code||'none')+'. If the link opens without the tour, paste the code into the box and press Apply.'; }catch(e){ tCode.value=code; tCode.select(); tMsg.textContent='Copy blocked by the browser; the code is selected above. Link: '+url; } });
  window.addEventListener('hashchange',()=>{ const nt=readTour(); if(nt.join()!==tour.join()) applyTour(nt); });
  syncTour();

  // ---------- resize, quality, loop ----------
  function resize(){ const w=innerWidth, h=innerHeight; renderer.setPixelRatio(dprFor(quality)); renderer.setSize(w,h,false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w,h); finalPass.uniforms.uRes.value.set(w*renderer.getPixelRatio(),h*renderer.getPixelRatio()); labW=w; labH=h; sizeMirror(); safeT=0; }
  window.addEventListener('resize',resize); resize();
  let frames=0, acc=0, checkAt=performance.now()+4000, last=performance.now();
  // drop resolution, then MSAA and the mirror, if the machine cannot hold roughly 38 fps over two seconds
  function adapt(raw,now){ if(QS.get('q')||document.hidden) return; if(now<checkAt){ acc=0; frames=0; return; } acc+=raw; frames++; if(acc>=2){ const avg=acc/frames; acc=0; frames=0; if(avg>1/38 && quality>0){ quality--; if(quality===0){ composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); makeComposer(); } resize(); checkAt=now+2500; } } }

  // small hook for presenters and screenshot tooling: __fy27.go(3), __fy27.explore('NJ')
  window.__fy27={ go:i=>show(i), scenes:()=>list().map(s=>s.t), explore:ab=>{ sel.value=ab; sel.dispatchEvent(new Event('change')); }, pause:()=>{ if(!paused) pauseBtn.click(); }, quality:()=>quality };

  function frame(now){
    const raw=(now-last)/1000, dt=Math.min(0.1,raw); last=now;
    U.uTime.value=now*0.001; finalPass.uniforms.uTime.value=reduceMotion?0:now*0.001;
    twTick(now); measureSafe(now); placeCamera(dt,now); worldTick(dt,now); tagsTick(); labelsTick(dt);
    composer.render(dt); adapt(raw,now);
    requestAnimationFrame(frame);
  }
  buildScenes(); renderProgress(); show(0); requestAnimationFrame(frame);

  // ---------- fallback for machines without WebGL ----------
  function fallback(){ document.body.classList.remove('cinema'); $('fallback').classList.add('on'); $('caption').textContent='The 3D view needs WebGL. The key numbers are above.'; $('caption').classList.add('in');
    const g=$('fbGrid'); const add=(n,l)=>{ const c=document.createElement('div'); c.className='card'; const a=document.createElement('div'); a.className='n'; a.textContent=n; const b=document.createElement('div'); b.className='l'; b.textContent=l; c.appendChild(a); c.appendChild(b); g.appendChild(c); };
    add(fmt(total27),'actions since July 1 (×'+ratio.toFixed(1)+' the same days of FY26)'); add(fmt(N.tk),'advocates took action, '+pct(N.tk/N.c)+' of the list'); add(fmt(new27),'new advocates since July 1 (×'+(new27/new26).toFixed(1)+' last year)');
    add(fmt(N.a[PK]),'actions in '+PKM+(beatAll?', more than any month of FY26':'')); add(ahead.length+' of '+states.length,'ahead of their own FY26 start'); add(pct(paceA,0),'of all FY26 actions matched with '+fyPct+'% of the year gone');
    ['top','bottom'].forEach(id=>{ const el=$(id); if(id==='top') $('pick').style.display='none'; else $('ctl').style.display='none'; }); }
}
Promise.race([document.fonts?document.fonts.ready:Promise.resolve(),new Promise(r=>setTimeout(r,1500))]).then(boot);
})();
