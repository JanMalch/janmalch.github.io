import { marked } from "marked";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { minify } from "html-minifier-terser";

const profileReadme = readFileSync("./JanMalch/README.md", "utf-8");
const profileHtml = await marked.parse(profileReadme, {
    gfm: true,
});

const cleanedHtml = profileHtml
    .replaceAll(' align="center"', "")
    .replaceAll(' alt="', ' height="28" alt="')
    .replaceAll('a href="', 'a rel="noopener" href="')
    .replace(
        "Hello there :wave:",
        '<a href="https://github.com/JanMalch" rel="noopener">JanMalch</a>',
    );

const css = readFileSync("./styles.css", "utf-8");

const html = `<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset="utf-8">
<meta content="width=device-width,initial-scale=1" name="viewport">
<meta content="JanMalch's GitHub Profile" name="description">
<link href="favicon.ico" rel="shortcut icon" type="image/x-icon">
<title>JanMalch's GitHub profile</title>
<style>${css}</style>
</head>
<body>
<main>
${cleanedHtml}
</main>
</body>
</html>
`;

const minified = await minify(html, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    minifyCSS: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeEmptyElements: true,
    removeRedundantAttributes: true,
});

if (!existsSync("./build")) {
    mkdirSync("./build");
}
writeFileSync("./build/index.html", minified, "utf-8");
writeFileSync("./build/favicon.ico", readFileSync("./favicon.ico"));
