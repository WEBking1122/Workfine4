const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectPage.tsx', 'utf8');
code = code.replace(/"([^"]*)"/g, (match) => match.replace(/\n\s*/g, ' '));
fs.writeFileSync('src/pages/ProjectPage.tsx', code);
