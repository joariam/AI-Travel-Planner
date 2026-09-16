const fs = require('node:fs/promises');
const path = require('node:path');
const { minify } = require('html-minifier-terser');

const rootDir = path.join(__dirname, '..');
const sourceDir = path.join(rootDir, 'public');
const outputDir = path.join(rootDir, 'dist');

async function build() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  for (const fileName of ['planner.html', 'admin.html']) {
    const source = await fs.readFile(path.join(sourceDir, fileName), 'utf8');
    const output = await minify(source, {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      minifyCSS: true,
      minifyJS: true,
      sortAttributes: false,
      sortClassName: false,
      sourceMap: false
    });
    await fs.writeFile(path.join(outputDir, fileName), output, 'utf8');
  }

  console.log('Production frontend built in dist/ without source maps.');
}

build().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
