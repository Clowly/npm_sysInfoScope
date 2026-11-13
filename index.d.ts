export interface SystemInfo {
  /** Human-readable OS or distribution name, e.g. "Ubuntu" or "Windows 11". */
  name: string;
  /** OS/distribution version when it can be determined. */
  version: string | null;
  /** Human-readable OS name and version. */
  prettyName: string;
  /** Distribution ID, e.g. "ubuntu", "debian", "windows", or "macos". */
  id: string;
  /** Node.js platform identifier, e.g. "linux", "win32", or "darwin". */
  platform: NodeJS.Platform;
  /** Kernel family, e.g. "Linux", "Darwin", or "Windows_NT". */
  kernel: string;
  /** Kernel release version. */
  kernelVersion: string;
  /** CPU architecture, e.g. "x64" or "arm64". */
  architecture: string;
  /** Whether the current process appears to be running under WSL. */
  isWsl: boolean;
  /** Whether the current process appears to be inside a container. */
  isContainer: boolean;
  /** Detected container runtime, if identifiable. */
  container: "docker" | "podman" | "kubernetes" | "containerd" | null;
}

/** Detect the operating system and runtime environment of the current Node.js process. */
export function getSystemInfo(): SystemInfo;

/** Parse the contents of an os-release file. Exported for testing and advanced use. */
export function parseOsRelease(content: string | null | undefined): Record<string, string>;

export default getSystemInfo;
