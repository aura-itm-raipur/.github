import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const readmePath = path.join(repoRoot, "profile", "README.md");

const START = "<!-- MEMBER-SHOWCASE:START -->";
const END = "<!-- MEMBER-SHOWCASE:END -->";

const TOKEN = process.env.GH_TOKEN;

async function githubUser(username) {
    const headers = {
        "User-Agent": "AURA"
    };

    if (TOKEN) {
        headers.Authorization = `Bearer ${TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/users/${username}`, {
        headers
    });

    if (!res.ok) return null;

    const data = await res.json();

    return {
        login: data.login,
        name: data.name || data.login,
        avatar: data.avatar_url,
        url: data.html_url
    };
}

function getContributors() {
    const output = execFileSync(
        "git",
        ["shortlog", "-sne", "--all"],
        {
            cwd: repoRoot,
            encoding: "utf8"
        }
    );

    return output
        .trim()
        .split("\n")
        .map(line => {

            const match = line.match(
                /^\s*(\d+)\s+(.+?)\s+<(.+)>$/
            );

            if (!match) return null;

            const commits = Number(match[1]);
            const email = match[3];

            const usernameMatch =
                email.match(/^(?:.+\+)?([^@]+)@users\.noreply\.github\.com$/);

            if (!usernameMatch) return null;

            return {
                commits,
                username: usernameMatch[1]
            };

        })
        .filter(Boolean)
        .filter(x => x.username !== "github-actions[bot]")
        .sort((a, b) => b.commits - a.commits)
        .slice(0, 10);
}

function render(users) {

    let html = `<table align="center">\n`;

    for (let i = 0; i < users.length; i++) {

        if (i % 5 === 0)
            html += "<tr>\n";

        const u = users[i];

        html += `
<td align="center">
<a href="${u.url}">
<img src="${u.avatar}" width="110"/><br>
<b>${u.name}</b>
</a><br>
${u.commits} commits
</td>
`;

        if (i % 5 === 4)
            html += "</tr>\n";
    }

    if (users.length % 5 !== 0)
        html += "</tr>";

    html += "</table>";

    return html;
}

async function main() {

    const contributors = getContributors();

    const users = [];

    for (const c of contributors) {

        const profile = await githubUser(c.username);

        if (!profile) continue;

        users.push({
            ...profile,
            commits: c.commits
        });

    }

    const readme = readFileSync(readmePath, "utf8");

    const start = readme.indexOf(START);
    const end = readme.indexOf(END);

    const updated =
        readme.slice(0, start + START.length) +
        "\n" +
        render(users) +
        "\n" +
        readme.slice(end);

    writeFileSync(readmePath, updated);

    console.log("Updated showcase.");
}

main();