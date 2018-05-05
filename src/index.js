
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { promisify } = require('util');
const prettyBytes = require('pretty-bytes');
const ProgressBar = require('progress');
const Confirm = require('prompt-confirm');
const argv = require('minimist')(process.argv.slice(2));
const copy = promisify(fs.copyFile);
const mkdir = promisify(require('mkdirp'));
const exists = promisify(fs.exists);

if (!argv._[0] || !argv._[1]) {
  console.error('usage: clone-images src/path destination/path');
  return;
}

const srcDir = path.resolve(argv._[0]);
const destDir = path.resolve(argv._[1]);

const files = [].concat(
  glob.sync('**/*.jpg', { cwd: srcDir }),
  glob.sync('**/*.jpeg', { cwd: srcDir }),
  glob.sync('**/*.JPG', { cwd: srcDir }),
  glob.sync('**/*.JPEG', { cwd: srcDir }),
  glob.sync('**/*.PNG', { cwd: srcDir }),
  glob.sync('**/*.png', { cwd: srcDir }),
).reduce((result, file) => {
  if (fs.existsSync(`${destDir}/${file}`)) {
    return result;
  }

  const stat = fs.lstatSync(`${srcDir}/${file}`);

  return [
    ...result,
    {
      stat,
      path: file,
    },
  ];
}, []);

const filesize = files.reduce((sum, file) => sum + file.stat.size, 0);

async function run() {
  const confirm = new Confirm(`copying ${files.length} files  -   ${prettyBytes(filesize)} (${prettyBytes(filesize / files.length)} / file) \nsrc:  ${srcDir}\ndest: ${destDir}\n`);
  const confirmed = await confirm.run();

  if (!confirmed) {
    return;
  }

  const bar = new ProgressBar('  copying [:bar] :rate/bps :percent :etas  ', {
    complete: '=',
    incomplete: ' ',
    total: filesize,
  });

  files.forEach(async (file) => {
    const src = `${srcDir}/${file.path}`;
    const dest = `${destDir}/${file.path}`;
    const dir = path.dirname(dest);
    const dirExists = await exists(dir);

    if (!dirExists) {
      await mkdir(dir);
    }

    await copy(src, dest);

    bar.tick(file.stat.size);
  });
}

run();
