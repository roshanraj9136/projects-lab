const fs = require('fs');
const path = require('path');

const root = __dirname;
const shell = fs.readFileSync(path.join(root, 'src', 'shell.html'), 'utf8');
let dg = fs.readFileSync(path.join(root, 'src', 'diagrams.js'), 'utf8');
const content = fs.readFileSync(path.join(root, 'src', 'content.js'), 'utf8');

if (!dg.includes('var D = window.D')) {
  dg = dg.replace('window.D = (function () {', 'var D = window.D = (function () {');
}

const title = 'Projects Lab';
const html = shell.replace('__TITLE__', title).replace('/*__CONTENT__*/', dg + '\n' + content);

fs.writeFileSync(path.join(root, 'index.html'), html, 'utf8');
console.log('Successfully built index.html for ' + title + ' (' + html.length + ' bytes)');
