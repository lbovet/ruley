documents("test-data/articles/**/*.yaml", (doc, path) => {
    schema("test-data/articles/article.schema.json", doc);
    rule("filename", path, "must have a filename containing the string 'article'", () => {
        expect(path.split("/").slice(-1)[0]).toContain("article");
    });
});

documents("test-data/books/**/*.yaml", (doc) => {
    property("chapters", doc.chapters, chapter =>
        property("title", chapter.title, title => {
            rule("capitalized", title, "must start with a capital letter", () => {
                expect(title).toMatch("^[A-Z].*");
            });
            rule("letters-only", title, "must contains only letters", () => {
                expect(title).toMatch("^[A-Za-z ]*$");
            });
        }));
    rule("page-number", doc.pages, "'pages' must be positive if present", pages => {
        expect(pages == null || pages > 0).toBeTrue();
    });
});