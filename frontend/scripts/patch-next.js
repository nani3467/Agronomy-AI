const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'lib', 'recursive-delete.js');
if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes('const linkPath = await _fs.promises.readlink(absolutePath);') && !content.includes('// Windows OneDrive patch')) {
    content = content.replace(
      'const linkPath = await _fs.promises.readlink(absolutePath);',
      '// Windows OneDrive patch\n            let linkPath;\n            try { linkPath = await _fs.promises.readlink(absolutePath); } catch (e) { isSymlink = false; }\n            if (!isSymlink) return unlinkPath(absolutePath, isDirectory);'
    );
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[Agronomy AI] Applied Windows OneDrive readlink patch to Next.js recursive-delete.');
  }
}
