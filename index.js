const fs = require('fs');
const YAML = require('yaml');
const glob = require('glob');
const traverse = require('traverse');
const ajv = new require("ajv")({
    jsonPointers: true,
    allErrors: true,
    verbose: true,
    logger: false
})
const AjvErrors = require('@segment/ajv-human-errors').AggregateAjvError
const request = require('request');

_skipList = comment => {
    var matches = comment.match(/skip\(([^\)]*)\)/)
    if (matches) {
        return matches[1].split(",").map(s => s.trim());
    } else {
        return [];
    }
};

_create = node => {
    var result;
    switch (node.type) {
        case "MAP":
            result = (Object.fromEntries(node.items.map(p =>
                [p.key.value, _create(p.value)])));
            break;
        case "SEQ":
            result = node.items.map(item => _create(item));
            break;
        default:
            switch (typeof (node.value)) {
                case "string":
                    result = new String(node.value);
                    break;
                case "number":
                    result = new Number(node.value);
                    break;
                case "boolean":
                    result = new Boolean(node.value);
                    break;
                default:
                    result = node.toJSON();
            }
    }
    if (node.comment) {
        result.skip = _skipList(node.comment);
    }
    return result;
};

_parse = (doc, path) => {
    var contents = YAML.parseDocument(doc).contents
    path = new String(path)
    path.skip = _skipList(doc.split("\n")[0]);
    return [Object.assign({ original: contents.toJSON(), skip: name => path.skip.indexOf(name) != -1 }, _create(contents)), path]
};

documents = (pattern, callback) =>
    glob.sync(pattern).forEach(path =>
        describe("'" + path + "'", () =>
            callback(..._parse(fs.readFileSync(path, 'utf8'), path))));

_schemaCache = {};

schema = (reference, doc) => {
    if (!doc.skip("schema")) {
        it("must comply with the schema at '" + reference + "'\n   ignore with '# skip(schema)'", done => {
            var validateDocument = (schema, doc) => {
                if (schema) {
                    delete schema.$schema;
                    traverse(schema).forEach(function() {
                        if(this.key === 'id' || this.key === '$id') {
                            this.remove();
                        }
                    });
                    try {
                        const validate = ajv.compile(schema)
                        if (!validate(doc.original)) {
                            validate.errors.forEach(error => {
                                error.instancePath = error.dataPath;
                            })
                            fail("\n    " + new AjvErrors(validate.errors).errors.map(error => error.message).join("\n    "));
                        }
                    } catch (err) {
                        fail(reference + ": " + err);
                    }
                }
                done();
            };

            var parseAndValidate = (err, schema) => {
                if (err) {
                    fail(reference + ": " + err);
                }
                try {
                    _schemaCache[reference] = JSON.parse(schema);
                } catch (err) {
                    fail(reference + ": " + err);
                }
                validateDocument(_schemaCache[reference], doc);
            };

            var schema = _schemaCache[reference];
            if (schema) {
                validateDocument(schema, doc);
            } else {
                if (reference.match("^https?://.*")) {
                    request(reference, (err, _, schema) => parseAndValidate(err, schema));
                } else {
                    fs.readFile(reference, "utf8", parseAndValidate);
                }
            };
        });
    }
};

property = (name, value, callback) =>
    Array.isArray(value) ?
        value.forEach((v, i) => describe("> '" + name + "[" + i + "]'", () => callback(v)))
        : describe("> '" + name + "'", () => callback(value));

rule = (name, value, expectation, callback) =>
    (!value || !value.skip || value.skip.indexOf(name) == -1) &&
    it(expectation + "\n   ignore with '# skip(" + name + ")'", () => callback(value));
