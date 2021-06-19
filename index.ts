import { Octokit } from '@octokit/core';
import csso from 'csso';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { minify as minifyHtml } from 'html-minifier';
import logSymbols from 'log-symbols';
import PurgeCSS from 'purgecss';
import fetch from 'node-fetch';
import sharp from 'sharp';

dotenv.config();

const accessToken = process.env.PERSONAL_ACCESS_TOKEN;
if (!accessToken) {
  console.error(logSymbols.error, `Personal access token missing.`);
  process.exit(1);
}

const htmlMinifyOptions = {
  collapseBooleanAttributes: true,
  collapseWhitespace: true,
  minifyCSS: true,
  removeComments: true,
  sortClassName: true,
  sortAttributes: true,
  useShortDoctype: true,
  removeRedundantAttributes: true,
};

async function main() {
  if (!existsSync('build')) {
    await mkdir('build');
  }
  const octokit = new Octokit({ auth: accessToken });

  const avatarBuffer = await octokit
    .request('GET /users/{username}', {
      username: 'JanMalch',
    })
    .then((res) => fetch(res.data.avatar_url))
    .then((res) => res.buffer());
  console.log(logSymbols.success, 'Fetched avatar');

  await sharp('favicon-shape.png')
    .composite([
      {
        input: await sharp(avatarBuffer).resize(48).toBuffer(),
        top: 0,
        left: 0,
        blend: 'in',
      },
    ])
    .png({ quality: 80 })
    .toFile('build/favicon.ico');

  const profileReadme = await octokit
    .request('GET /repos/{owner}/{repo}/readme', {
      owner: 'JanMalch',
      repo: 'JanMalch',
    })
    .then((res) =>
      Buffer.from(res.data.content, 'base64').toString().replace(':wave:', '')
    );

  console.log(logSymbols.success, 'Fetched profile README');

  const rendered = await octokit
    .request('POST /markdown', {
      text: profileReadme,
    })
    .then((res) => res.data.replace('Hi there', 'Hi there &#128075;'));

  console.log(logSymbols.success, 'Rendered Markdown as HTML');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="JanMalch's GitHub Profile">
<link rel="shortcut icon" type="image/x-icon" href="favicon.ico">
<title>JanMalch's GitHub profile</title>
</head>
<body>

<main class="markdown-body container-lg">

<h1>
<span>
<a href="https://github.com/JanMalch" rel="noopener">JanMalch's</a> GitHub Profile</span>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="96" height="96">
<path fill="#f1f1f1" fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
</svg>
</h1>

${rendered}

</main>

</body>
</html>
`;

  const css =
    (await readFile(`./node_modules/@primer/css/dist/layout.css`, 'utf-8')) +
    '\n' +
    ((await readFile(
      `./node_modules/github-markdown-css/github-markdown.css`,
      'utf-8'
    )) +
      `
body {
    background: #fafafa;
    margin: 0;
}

main {
    padding: 64px 64px 128px;
    background: white;
    border-left: 1px solid #eee;
    border-right: 1px solid #eee;
}

main h1 {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-end;
}

.markdown-body footer h3 {
    margin-top: 0;
}

.markdown-body footer div {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
}


img[data-canonical-src^="https://github-readme-stats.vercel.app"] {
    border-radius: 6px;
    box-shadow: 0 2.8px 2.2px rgba(0, 0, 0, 0.02), 0 6.7px 5.3px rgba(0, 0, 0, 0.028), 0 12.5px 10px rgba(0, 0, 0, 0.035), 0 22.3px 17.9px rgba(0, 0, 0, 0.042), 0 41.8px 33.4px rgba(0, 0, 0, 0.05), 0 100px 80px rgba(0, 0, 0, 0.07);
}

.markdown-body table {
    width: auto;
    display: table;
}

@media only screen and (max-width: 599px) {

    main {
        padding: 16px;
    }
    
    main.markdown-body :is(table, tbody, tr, td) {
        display: block;
        width: 100%;
        border: none;
        background: transparent !important;
    }
    
    main > h3:nth-of-type(2) + br + p {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: center;
        align-items: center;
    }
}
`);
  console.log(logSymbols.success, 'Loaded styles');

  const purgeCSSResults = await new PurgeCSS().purge({
    content: [{ raw: html, extension: 'html' }],
    css: [{ raw: css }],
    variables: true,
    keyframes: true,
    safelist: [/canonical-src/],
  });
  const purgedStyles = purgeCSSResults[0].css;
  console.log(logSymbols.success, 'Purged styles');
  const minified = csso.minify(purgedStyles, {
    comments: false,
    forceMediaMerge: true,
  }).css;
  console.log(logSymbols.success, 'Minified styles');

  await writeFile(
    'build/index.html',
    minifyHtml(
      html.replace('</head>', `<style>${minified}</style></head>`),
      htmlMinifyOptions
    ),
    'utf-8'
  );

  console.log(logSymbols.success, 'Written final index.html');
}

main().catch((err) => {
  console.error(logSymbols.error, 'An unknown error occurred.');
  console.error(err);
  process.exit(1);
});
