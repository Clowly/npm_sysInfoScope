const os = require("node:os");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

function readTextFile(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function parseOsRelease(content) {
  if (!content) return {};

  const result = {};
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;

    let value = match[2].trim();

    // os-release values may be quoted. This handles the common quoted form
    // without evaluating shell expressions or executing anything.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[match[1]] = value;
  }

  return result;
}

function detectWsl() {
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) return true;
  const procVersion = readTextFile("/proc/version") || "";
  const osRelease = readTextFile("/proc/sys/kernel/osrelease") || "";
  return /microsoft|wsl/i.test(`${procVersion}\n${osRelease}`);
}

function detectContainer() {
  if (fs.existsSync("/.dockerenv")) {
    return { isContainer: true, container: "docker" };
  }

  if (fs.existsSync("/run/.containerenv")) {
    return { isContainer: true, container: "podman" };
  }

  const cgroup = readTextFile("/proc/1/cgroup") || "";
  if (/docker/i.test(cgroup)) {
    return { isContainer: true, container: "docker" };
  }
  if (/kubepods/i.test(cgroup)) {
    return { isContainer: true, container: "kubernetes" };
  }
  if (/containerd/i.test(cgroup)) {
    return { isContainer: true, container: "containerd" };
  }
  if (/libpod/i.test(cgroup)) {
    return { isContainer: true, container: "podman" };
  }

  return { isContainer: false, container: null };
}

function getMacOSVersion() {
  try {
    return execFileSync("sw_vers", ["-productVersion"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim() || null;
  } catch {
    return null;
  }
}

function getWindowsName(release) {
  // Windows 11 uses build 22000 or later. Node's os.release() commonly
  // reports a 10.0.x kernel version even on Windows 11.
  const build = Number(String(release).split(".").at(-1));
  if (Number.isFinite(build) && build >= 22000) return "Windows 11";
  if (Number.isFinite(build) && build > 0) return "Windows 10";
  return "Windows";
}

/**
 * Detect the OS and runtime environment for the current Node.js process.
 *
 * Note: in WSL or a Linux container, platform/kernel describe the Linux
 * environment visible to the process, not necessarily the physical host.
 */
function getSystemInfo() {
  const platform = process.platform;
  const kernel = os.type();
  const kernelVersion = os.release();
  const architecture = os.arch();

  const info = {
    name: kernel,
    version: null,
    prettyName: kernel,
    id: platform,
    platform,
    kernel,
    kernelVersion,
    architecture,
    isWsl: false,
    isContainer: false,
    container: null
  };

  if (platform === "linux") {
    const release = parseOsRelease(
      readTextFile("/etc/os-release") || readTextFile("/usr/lib/os-release")
    );

    info.name = release.NAME || "Linux";
    info.version = release.VERSION_ID || null;
    info.prettyName = release.PRETTY_NAME || info.name;
    info.id = release.ID || "linux";
    info.isWsl = detectWsl();

    const containerInfo = detectContainer();
    info.isContainer = containerInfo.isContainer;
    info.container = containerInfo.container;
  } else if (platform === "win32") {
    info.name = getWindowsName(kernelVersion);
    info.version = kernelVersion;
    info.prettyName = `${info.name} (${kernelVersion})`;
    info.id = "windows";
  } else if (platform === "darwin") {
    const version = getMacOSVersion();
    info.name = "macOS";
    info.version = version;
    info.prettyName = version ? `macOS ${version}` : "macOS";
    info.id = "macos";
    info.kernel = "Darwin";
  } else if (platform === "freebsd") {
    info.name = "FreeBSD";
    info.version = kernelVersion;
    info.prettyName = `FreeBSD ${kernelVersion}`;
    info.id = "freebsd";
  }

  return info;
}

module.exports = {
  getSystemInfo,
  parseOsRelease
};
