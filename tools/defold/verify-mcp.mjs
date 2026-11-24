// Exercise the same launcher and stdio transport used by .codex/config.toml.
// Usage: node tools/defold/verify-mcp.mjs [--tests] [--run]
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, "../..");
const mcpDir = process.env.DEFOLD_MCP_DIR || path.resolve(repoRoot, "../defold-mcp");
const requireMcp = createRequire(path.join(mcpDir, "package.json"));
const { Client } = await import(pathToFileURL(requireMcp.resolve("@modelcontextprotocol/sdk/client/index.js")));
const { StdioClientTransport } = await import(pathToFileURL(requireMcp.resolve("@modelcontextprotocol/sdk/client/stdio.js")));
const lock = JSON.parse(await readFile(path.join(toolsDir, "toolchain.json"), "utf8"));
const runFile = promisify(execFile);
const { stdout: revision } = await runFile("git", ["-C", mcpDir, "rev-parse", "HEAD"]);
assert.equal(revision.trim(), lock.mcp_commit, "MCP checkout does not match the reviewed commit");
const { stdout: dirty } = await runFile("git", ["-C", mcpDir, "status", "--porcelain", "--untracked-files=normal"]);
assert.equal(dirty.trim(), "", "MCP checkout has local changes; review before verification");
const packageInfo = JSON.parse(await readFile(path.join(mcpDir, "package.json"), "utf8"));
assert.equal(packageInfo.version, lock.mcp_package_version);
console.log(`Reviewed MCP checkout: ${revision.trim()}`);
const client = new Client({ name: "rebirth-dungeon-verification", version: "1.0.0" });


async function call(name, args = {}) {
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 600_000 });
    const text = result.content?.filter((item) => item.type === "text").map((item) => item.text).join("\n") || "";
    assert.ok(!result.isError, `${name}: ${text}`);
    console.log(`${name}: ${text}`);
    return text;
}

async function bundleExecutable(bundleOutput, extraArgs = []) {
    assert.equal(process.platform, "darwin", "Native verification currently supports macOS bundles");
    await call("defold_bundle", {
        version: lock.defold_version,
        platform: process.arch === "arm64" ? "arm64-macos" : "x86_64-macos",
        variant: "debug", bundle_output: bundleOutput, timeout_seconds: 540, extra_args: extraArgs,
    });
    const apps = (await readdir(bundleOutput)).filter((name) => name.endsWith(".app"));
    assert.equal(apps.length, 1, "Expected one application in verification bundle directory");
    const app = path.join(bundleOutput, apps[0]);
    const { stdout } = await runFile("python3", ["-c",
        "import plistlib,sys;print(plistlib.load(open(sys.argv[1],'rb'))['CFBundleExecutable'])",
        path.join(app, "Contents", "Info.plist")]);
    return path.join(app, "Contents", "MacOS", stdout.trim());
}

try {
    await client.connect(new StdioClientTransport({
        command: "/bin/sh",
        args: [path.join(toolsDir, "start-mcp.sh")],
        // This verification must never target an unrelated environment override.
        env: { ...process.env, DEFOLD_PROJECT_ROOT: repoRoot },
        stderr: "inherit",
    }));
    const { tools } = await client.listTools();
    assert.ok(tools.some((tool) => tool.name === "defold_build"));
    console.log(`MCP handshake: ${tools.length} tools available`);
    const doctor = JSON.parse(await call("defold_doctor", { response_format: "json" }));
    assert.equal(doctor.project_root_error, null);
    assert.equal(path.resolve(doctor.project_root), repoRoot);
    assert.equal(doctor.java.ok, true);
    assert.ok(Number.parseInt(doctor.java.version, 10) >= lock.java_minimum_major,
        `Bob ${lock.defold_version} requires JDK ${lock.java_minimum_major}+; set JAVA_HOME`);
    const setup = await call("defold_setup", { version: lock.defold_version });
    assert.ok(setup.includes(`sha1 ${lock.defold_engine_sha1.slice(0, 8)}`), "Unexpected engine release revision");
    await call("defold_project_info");
    const docs = await call("defold_api_search", { version: lock.defold_version, query: "get_save_file", namespace: "sys" });
    assert.match(docs, /sys\.get_save_file/);
    await call("defold_resolve_dependencies", { version: lock.defold_version, timeout_seconds: 540 });
    await call("defold_build", { version: lock.defold_version, archive: true, timeout_seconds: 540 });

    if (process.argv.includes("--tests")) {
        const testExecutable = await bundleExecutable(path.join(repoRoot, "bundle", "test-verification"),
            ["--settings", path.join(repoRoot, "tests", "test.settings")]);
        const result = await runFile(testExecutable, [], { cwd: path.dirname(testExecutable), timeout: 50_000,
            maxBuffer: 8 * 1024 * 1024 });
        console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);
        const output = result.stdout + result.stderr;
        const totals = output.match(/(\d+) tests[\s\S]*?(\d+) passed/);
        assert.ok(totals, "DefTest completion summary missing");
        assert.ok(Number(totals[1]) > 0, "No engine tests ran");
        assert.equal(totals[1], totals[2], "Not all engine tests passed");
        for (const status of ["failed", "errors", "unassertive"]) {
            assert.match(output, new RegExp(`\\b0 ${status}\\b`), `DefTest must report zero ${status}`);
            assert.doesNotMatch(output, new RegExp(`\\b[1-9]\\d* ${status}\\b`));
        }
        assert.doesNotMatch(output, /ERROR:(SCRIPT|RESOURCE|GAMEOBJECT|GRAPHICS|SHADER)|WARNING:RENDER/);
        console.log(`Native DefTest verification passed: ${totals[1]} tests`);
    }
    if (process.argv.includes("--run")) {
        const executable = await bundleExecutable(path.join(repoRoot, "bundle", "verification"));
        const result = await runFile("python3", [path.join(toolsDir, "run-native.py"), executable],
            { timeout: 25_000, maxBuffer: 4 * 1024 * 1024 });
        console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);
    }
    console.log("Defold MCP verification passed.");
} finally {
    await client.close();
}
