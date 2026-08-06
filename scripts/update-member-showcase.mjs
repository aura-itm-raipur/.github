import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const readmePath = path.join(repoRoot, 'profile', 'README.md');
const placeholderImage = '../assets/member-placeholder.svg';
const startMarker = '<!-- MEMBER-SHOWCASE:START -->';
const endMarker = '<!-- MEMBER-SHOWCASE:END -->';
const teamMembers = [
  { displayName: 'Aamir', username: 'Aamir4324m' },
  { displayName: 'Abhishek sharma', username: 'abhisketch077-netizen' },
  { displayName: 'Addyasha Agrawal', username: 'addyasha' },
  { displayName: 'Amar Sinha', username: 'amarcj' },
  { displayName: 'Beneeta Binu', username: 'beneetabinu' },
  { displayName: 'Dhrishti Rathore', username: 'dhrishtirathore61-lang' },
  { displayName: 'Dipti', username: 'diptj2528-art' },
  { displayName: 'Aryan Patel', username: 'ghostyARYAN' },
  { displayName: 'gracyverma', username: 'gracyverma' },
  { displayName: 'jaykumarsolanki3487-dev', username: 'jaykumarsolanki3487-dev' },
  { displayName: 'Richy Lima', username: 'Richii25' },
  { displayName: 'sarjupradhan474-coder', username: 'sarjupradhan474-coder' },
  { displayName: 'Tikesh Sahu', username: 'Tikesh01' },
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getContributors() {
  const output = execFileSync('git', ['shortlog', '-sne', '--all'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();

  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^\s*(\d+)\s+(.+?)\s+<(.+)>$/);

      if (!match) {
        return null;
      }

      const [, countText, displayName, email] = match;
      const usernameMatch = email.match(/^(?:[^+]+\+)?([^@]+)@users\.noreply\.github\.com$/i);

      return {
        count: Number(countText),
        displayName: displayName.trim(),
        username: usernameMatch ? usernameMatch[1] : null,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.count - left.count || left.displayName.localeCompare(right.displayName));
}

function renderShowcase(contributors) {
  const normalizedContributors = contributors.map((contributor) => ({
    displayName: contributor.displayName,
    username: contributor.username,
    count: contributor.count,
    kind: 'contributor',
  }));

  const seen = new Set(
    normalizedContributors.map((entry) => entry.username || entry.displayName.toLowerCase())
  );

  const normalizedTeamMembers = teamMembers
    .filter((member) => !seen.has(member.username || member.displayName.toLowerCase()))
    .map((member) => ({
      displayName: member.displayName,
      username: member.username,
      kind: 'member',
    }));

  const featuredMembers = [...normalizedContributors, ...normalizedTeamMembers].slice(0, 10);

  const cards = featuredMembers.map((member) => {
    const profileUrl = member.username ? `https://github.com/${member.username}` : 'https://github.com';
    const avatarUrl = member.username ? `https://github.com/${member.username}.png?size=120` : placeholderImage;

    return [
      '  <td align="center">',
      `    <a href="${profileUrl}">`,
      `      <img src="${avatarUrl}" width="120" alt="${escapeHtml(member.displayName)}">`,
      '      <br>',
      `      <strong>${escapeHtml(member.displayName)}</strong>`,
      '    </a>',
      '    <br>',
      member.kind === 'contributor'
        ? `    ${member.count} commit${member.count === 1 ? '' : 's'}`
        : '    AURA Member',
      '  </td>',
    ].join('\n');
  });

  const rows = [];

  for (let index = 0; index < cards.length; index += 5) {
    rows.push(['  <tr>', ...cards.slice(index, index + 5), '  </tr>'].join('\n'));
  }

  return [
    '<table align="center">',
    ...rows,
    '</table>',
  ].join('\n');
}

const readme = readFileSync(readmePath, 'utf8');
const startIndex = readme.indexOf(startMarker);
const endIndex = readme.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
  throw new Error('Member showcase markers were not found in profile/README.md.');
}

const before = readme.slice(0, startIndex + startMarker.length);
const after = readme.slice(endIndex);
const showcase = renderShowcase(getContributors());
const nextReadme = `${before}\n${showcase}\n${after}`;

if (nextReadme !== readme) {
  writeFileSync(readmePath, nextReadme);
}