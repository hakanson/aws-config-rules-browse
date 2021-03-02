const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const configDir = '../aws-config-rules/aws-config-conformance-packs';
const configBase = 'https://github.com/awslabs/aws-config-rules/tree/master/aws-config-conformance-packs/';
const docDir = '../aws-config-developer-guide/doc_source';
const docBase = 'https://github.com/awsdocs/aws-config-developer-guide/tree/main/doc_source/';
const data = {};

console.log('reading ' + configDir);
const files = fs.readdirSync(configDir);
files.forEach(function (file) {
    if (file.endsWith('.yaml')) {
        let name = `${file.replace(/\-/g, ' ').replace(/\.yaml$/, '')}`;
        console.log('* ' + file);
        let configYaml = fs.readFileSync(path.join(configDir, file), { encoding: 'utf8' });
        const doc = yaml.load(configYaml);
        if (doc['Resources']) {
            for (const [rkey, rvalue] of Object.entries(doc['Resources'])) {
                if (rvalue.Properties) {
                    if (rvalue.Properties?.Source?.Owner == 'AWS') {
                        let id = rvalue.Properties?.Source?.SourceIdentifier;
                        let configRuleName = rvalue.Properties.ConfigRuleName;
                        let resourceType = rvalue.Properties?.Scope?.ComplianceResourceTypes || 'Trigger type: Periodic';
                        let resourceTypes = Array.isArray(resourceType) ? resourceType : [resourceType];
                        resourceTypes.forEach(function (rt) {
                            let record = data[rt];
                            if (!record) {
                                record = {};
                                data[rt] = record
                            }
                            if (!record[id]) {
                                record[id] = { rule: null, packs: {} };
                            }
                            if (!record[id].rule && fs.existsSync(path.join(docDir, configRuleName + '.md'))) {
                                record[id].rule = configRuleName
                            }
                            record[id].packs[name] = file;
                        });
                    }
                }
            }
        }
    }
});


let mdFilename = 'conformancePackByResourceType.md';
console.log('\nwriting ' + mdFilename);
let md = fs.createWriteStream(mdFilename);
md.write('# AWS Config Rules Conformance Packs by Resource Type\n');

md.write('\n## Table of Contents\n');
for (const tckey of Object.keys(data).sort()) {
  md.write(`* [${tckey}](#${tckey.toLowerCase()})\n`); // .replace(/::/g, '-')
}
md.write('\n---\n')

for (const [tkey, tvalue] of Object.entries(data).sort()) {
    md.write(`\n### ${tkey}\n`);
    for (const [rkey, rvalue] of Object.entries(tvalue).sort()) {
        if (rvalue.rule) {
            md.write(`* [${rkey}](${docBase}${rvalue.rule}.md) (${Object.entries(rvalue.packs).length})\n`);
        } else {
            md.write(`* ${rkey} (${Object.entries(rvalue.packs).length})\n`);
        }
        for (const [pkey, pvalue] of Object.entries(rvalue.packs).sort()) {
            md.write(`  * [${pkey}](${configBase}${pvalue})\n`);
        }
    }
}
md.end();