# Rulya

Helps you define and apply semantic validation to a collection of YAML files. Typically used as pre-commit hook or CI/CD build step.

## Usage

Create a NPM package in the directory containing the files to validate:

```
npm init
```
And set the [test script](https://docs.npmjs.com/cli/v8/commands/npm-test) to:
```
jasmine --require=rulya validate.js
```

Add Rulya as a development dependency:

```
npm install rulya --save-dev
```

Write your validation rules in `validate.js`:

```js
// Traverse all YAML files in the test-data/articles directory
documents("test-data/articles/**/*.yaml", (doc, path) => {

    // Validate against a JSON schema (can be a URL as well)
    schema("test-data/articles/article.schema.json", doc);

    // Define a rule on the filename
    rule("filename", path, "must have a filename containing the string 'article'", () => {
        expect(path.split("/").slice(-1)[0]).toContain("article");
    });
});

// Traverse all YAML files in the test-data/books directory
documents("test-data/books/**/*.yaml", (doc) => {

    // Iterate through the chapters
    property("chapters", doc.chapters, chapter =>

        // Group rules applied to the chapter titles
        property("title", chapter.title, title => {

            // Define rules for the chapter titles

            rule("capitalized", title, "must start with a capital letter", () => {
                expect(title).toMatch("^[A-Z].*");
            });

            rule("letters-only", title, "must contains only letters", () => {
                expect(title).toMatch("^[A-Za-z ]*$");
            });
        }));

    // A rule can be defined standalone, the property name must be writen in the description though
    rule("page-number", doc.pages, "'pages' must be positive if present", pages => {
        expect(pages == null || pages > 0).toBeTrue();
    });
});

```

Run your rules with:

```
npm test
```

## Breaking the Rules

If for some reason you need to disable some rule, use a _skip comment_ with the rule names.

```yaml
    - title: "a fantastic tale no 1" # skip(capitalized,letters-only)
```
For rules applying to the whole document, the _skip comment_ must be on the first line:

```yaml
# skip(schema,filename)
text: Hello
```

## Expectations

Rulya uses [Jasmine](https://jasmine.github.io/index.html) under the hood, you can use all its [matchers](https://jasmine.github.io/api/edge/matchers.html) in the rule definitions.

## API
| | |
|-|-|
| `documents(pattern,callback)` | Traverses and parses YAML documents using a [glob](https://www.npmjs.com/package/glob) `pattern`. |
| `property(name,value,callback)` | Steps down in a property to group multiple rules together. It creates a [describe](https://jasmine.github.io/api/edge/global.html#describe) section at the Jasmine level. `name` and `value` typically corresponds to a YAML map entry. `callback` will be called with `value` as parameter or each item if `value` is an array. |
| `rule(name,value,description,callback)` | Defines a rule. `name` identifies the rule if you want to skip it (see _Breaking the Rules_, above). `value` is the YAML element the rule applies to. This creates a single [spec](https://jasmine.github.io/api/edge/global.html#it) at the Jasmine level. |
| `schema(reference, doc)` | Validates a document against a [JSON Schema](https://json-schema.org/). `reference` is the filesystem path or an URL pointing to the schema. |
||

## Customization

You can use [Jasmine](https://jasmine.github.io/index.html)'s `describe` and `it` functions if you need more flexibility than `property` and `rule` provide. Just note that `rule` manages the _skip comment_ for you.
