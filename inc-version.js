const package = require('./package.json');
const [, version, id] = package.version.match(/(.*?)-SNAPSHOT-(\d+)/) || [];
if (id !== undefined) {
    package.version = `${version}-SNAPSHOT-${+id + 1}`;
}
delete package.devDependencies;
delete package.scripts;
const fs = require('fs');
fs.writeFileSync('./package.json', JSON.stringify(package, undefined, 2));
fs.writeFileSync('./version.out', package.version);
