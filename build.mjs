#!/usr/bin/env node
// Builds t3-theme.json, the one file T3 Code imports, from theme.json (name and colours)
// and theme.css. Run `node build.mjs`, or `node build.mjs --check` to fail when the
// committed t3-theme.json is out of date. No dependencies.

import { readFileSync, writeFileSync } from 'node:fs';

const OUTPUT = 't3-theme.json';
// T3 Code refuses a theme whose CSS is longer than this.
const CSS_MAX_LENGTH = 50_000;
const NAME_MAX_LENGTH = 48;

// The colour roles T3 Code knows. It ignores any other key, so a typo would silently
// do nothing; the build fails on one instead.
const ROLES = new Set(
  `canvas chrome toolbar toolbarForeground toolbarBorder toolbarControl
  toolbarControlForeground toolbarControlHover surface surfaceRaised surfaceOverlay text
  textMuted border input focus accent accentForeground secondary secondaryForeground muted
  mutedForeground placeholder secondaryLabel iconMuted error errorForeground errorSurface
  warning warningForeground warningSurface update updateForeground updateSurface
  accentSurface accentSurfaceForeground messageSurface messageForeground messageAction
  messageActionForeground messageActionHover codeBackground codeForeground
  searchMatchBackground searchMatchForeground searchMatchActiveBackground
  searchMatchActiveForeground sidebar sidebarForeground sidebarMutedForeground
  sidebarControlSurface sidebarRowHover sidebarRowActive sidebarRowSelected sidebarBorder
  terminalBackground terminalForeground terminalCursor terminalSelection terminalScrollbar
  terminalScrollbarHover`.split(/\s+/),
);

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');

const problems = [];

/**
 * Strips comments and the whitespace CSS does not need. Text inside quotes is kept as
 * written. Spaces that can carry meaning are kept too: the one between two selectors
 * (`a b`, `a :hover`) and the ones around `+` and `-` (calc).
 */
function minifyCss(source) {
  const strings = [];
  let out = '';
  let depth = 0;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) {
        problems.push('theme.css: a comment is never closed.');
        break;
      }
      i = end + 1;
      out += ' ';
    } else if (char === '"' || char === "'") {
      let end = i + 1;
      while (end < source.length && source[end] !== char) end += source[end] === '\\' ? 2 : 1;
      if (end >= source.length) {
        problems.push('theme.css: a quoted string is never closed.');
        break;
      }
      // A placeholder keeps the string out of the whitespace pass below.
      out += `\u0000${strings.push(source.slice(i, end + 1)) - 1}\u0000`;
      i = end;
    } else if (char === '\\') {
      out += char + (source[i + 1] ?? '');
      i += 1;
    } else {
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;
      if (depth < 0) {
        problems.push('theme.css: there is a } with no { before it.');
        depth = 0;
      }
      out += char;
    }
  }
  if (depth > 0) problems.push(`theme.css: ${depth} { ${depth === 1 ? 'is' : 'are'} never closed.`);

  return out
    .replace(/\s+/g, ' ')
    .replace(/ ?([{};,>]) ?/g, '$1')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    .replace(/: /g, ':')
    .replace(/ !/g, '!')
    .replace(/;}/g, '}')
    .trim()
    .replace(/\u0000(\d+)\u0000/g, (_, index) => strings[Number(index)]);
}

function checkCss(css) {
  if (css.length > CSS_MAX_LENGTH) {
    problems.push(`theme.css: ${css.length} characters once minified; T3 Code takes at most ${CSS_MAX_LENGTH}.`);
  }
  if (/@import/i.test(css)) problems.push('theme.css: T3 Code does not load @import.');
  if (/image-set\(/i.test(css)) problems.push('theme.css: T3 Code does not load image-set().');
  for (const [, target] of css.matchAll(/url\(\s*["']?([^"')]*)/gi)) {
    if (!/^(data:|#)/i.test(target.trim())) {
      problems.push(`theme.css: url(${target.slice(0, 40)}) will not load; T3 Code allows only data: addresses and #ids.`);
    }
  }
}

function checkColors(colors, where) {
  if (colors === undefined) return;
  if (colors === null || typeof colors !== 'object' || Array.isArray(colors)) {
    problems.push(`theme.json: ${where} must be an object of role: colour.`);
    return;
  }
  for (const [role, value] of Object.entries(colors)) {
    if (!ROLES.has(role)) problems.push(`theme.json: ${where}.${role} is not a colour role T3 Code knows.`);
    // T3 Code takes literal colours only: nothing that depends on the page it is on.
    if (typeof value !== 'string' || !/^(#[0-9a-f]{3,8}|[a-z]+\([^()]*\)|[a-z]+)$/i.test(value.trim()) || /^(var|env|attr|calc|min|max|clamp)\(/i.test(value.trim())) {
      problems.push(`theme.json: ${where}.${role} must be a literal colour such as #4fcaa8 or oklch(0.76 0.12 172).`);
    }
  }
}

function checkSettings(settings) {
  if (typeof settings.name !== 'string' || settings.name.trim() === '' || settings.name.trim().length > NAME_MAX_LENGTH) {
    problems.push(`theme.json: name must be 1 to ${NAME_MAX_LENGTH} characters.`);
  }
  if (settings.appearance !== 'light' && settings.appearance !== 'dark') {
    problems.push('theme.json: appearance must be "light" or "dark".');
  }
  if ('css' in settings) problems.push('theme.json: the CSS belongs in theme.css, not in a "css" key.');
  checkColors(settings.colors, 'colors');
  for (const [mode, colors] of Object.entries(settings.variants ?? {})) {
    if (mode !== 'light' && mode !== 'dark') problems.push(`theme.json: variants.${mode} must be "light" or "dark".`);
    checkColors(colors, `variants.${mode}`);
  }
}

let settings;
try {
  settings = JSON.parse(read('theme.json'));
} catch (error) {
  console.error(`theme.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

checkSettings(settings);
const css = minifyCss(read('theme.css'));
checkCss(css);

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const built = `${JSON.stringify({ ...settings, ...(css ? { css } : {}) }, null, 2)}\n`;

if (process.argv.includes('--check')) {
  let committed = null;
  try {
    committed = read(OUTPUT);
  } catch {}
  if (committed !== built) {
    console.error(`${OUTPUT} is out of date. Run \`node build.mjs\` and commit the result.`);
    process.exit(1);
  }
  console.log(`${OUTPUT} is up to date.`);
} else {
  writeFileSync(new URL(OUTPUT, import.meta.url), built);
  console.log(`Wrote ${OUTPUT}: ${css.length} of ${CSS_MAX_LENGTH} CSS characters.`);
}
