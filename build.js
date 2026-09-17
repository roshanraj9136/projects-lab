const fs = require('fs')
const path = require('path')

// index.html = Interview Lab template (src/base.html) with this lab's diagrams and topics.
const root = __dirname
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'src', 'config.json'), 'utf8'))
let base = fs.readFileSync(path.join(root, 'src', 'base.html'), 'utf8').replace(/\r\n/g, '\n')

function cut(marker) {
  const i = base.indexOf(marker)
  if (i < 0) throw new Error('marker not found: ' + marker.slice(0, 40))
  return i
}
const m1 = 'const DIAGRAMS = {};\n'
const m2 = '</script>\n\n<style>\n.lesson{'
const m3 = '<script>const TOPICS = [];</script>\n'
const m4 = '<script>\nconst DAY = 86400000;'

const head = base.slice(0, cut(m1) + m1.length)
const lessonCss = base.slice(cut(m2), cut(m3) + m3.length)
let app = base.slice(cut(m4))

const diagrams = fs.readFileSync(path.join(root, 'src', 'diagrams.js'), 'utf8')
const dir = path.join(root, 'src', 'topics')
const topics = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()
  .map((f) => '<script>\n' + fs.readFileSync(path.join(dir, f), 'utf8') + '\n</script>').join('\n\n')

// Sidebar groups come from each topic's `group` instead of the skills lab's tiers.
app = app.replace(
  /const groups = \[\n[\s\S]*?\n  \];/,
  "const groups = [];\n  TOPICS.forEach(t => { let g = groups.find(x => x[0] === t.group); if(!g){ g = [t.group, []]; groups.push(g); } g[1].push(t); });"
)
app = app.replace("{ crit:'Critical', mod:'Moderate', liab:'Risky' }", "{ crit:'Basics', mod:'Deep dive', liab:'Tough questions' }")
app = app.split("'labhi.").join("'" + cfg.key + '.')

let html = head + diagrams + '\n' + lessonCss + '\n' + topics + '\n\n' + app
html = html
  .replace('<title>Interview Lab</title>', () => '<title>' + cfg.title + '</title>')
  .replace('&gt;_</span> Interview Lab', () => '&gt;_</span> ' + cfg.title)
  .replace(/<meta name="description" content="[^"]*">/, () => '<meta name="description" content="' + cfg.description + '">')

if (html.includes('labhi.') || !html.includes(cfg.key + '.progress')) throw new Error('storage key rewrite failed')
fs.writeFileSync(path.join(root, 'index.html'), html, 'utf8')
console.log('Built index.html for ' + cfg.title + ': ' + (topics.split('TOPICS.push').length - 1) + ' topics, ' + html.length + ' bytes')
