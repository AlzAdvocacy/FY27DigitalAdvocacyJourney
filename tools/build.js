// Assemble src/ into one self-contained index.html (no network needed to view it).
// Usage: node tools/build.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = p => fs.readFileSync(path.join(root, 'src', p));
const txt = p => src(p).toString('utf8');

// JSON goes inside <script type="application/json">, so neutralise any "</" sequence.
const json = p => JSON.stringify(JSON.parse(txt(p))).replace(/<\//g, '<\\/');
const font = (file, weight) => `@font-face{font-family:"Houschka Alt Pro";src:url("data:font/woff;base64,${src('fonts/' + file).toString('base64')}") format("woff");font-weight:${weight};font-style:normal;font-display:swap}`;

// Let the bloom pass keep HDR values when the GPU supports half-float targets.
const post = txt('vendor/three-r128-post.js').replace(
  /(const pars = \{\s*minFilter: THREE\.LinearFilter,\s*magFilter: THREE\.LinearFilter,\s*format: THREE\.RGBAFormat)/,
  '$1,\n\t\t\t\ttype: THREE.__bloomType || THREE.UnsignedByteType'
);
if (!post.includes('THREE.__bloomType')) throw new Error('bloom patch did not apply');

const parts = {
  FONTS: font('houschka-300-500.woff', '300 500') + '\n' + font('houschka-600-900.woff', '600 900'),
  CSS: txt('style.css'),
  DATA: json('data.json'),
  GEO: json('geo.json'),
  META: json('meta.json'),
  THREE: txt('vendor/three-r128.min.js'),
  POST: post,
  APP: txt('app.js'),
};
for (const k of ['THREE', 'POST', 'APP']) if (/<\/script/i.test(parts[k])) throw new Error(k + ' contains </script');

let html = txt('template.html');
for (const [k, v] of Object.entries(parts)) {
  const token = `/*@@${k}@@*/`;
  if (!html.includes(token)) throw new Error('missing token ' + token);
  html = html.split(token).join(v); // split/join avoids $-pattern surprises in String.replace
}
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(0) + ' KB');
