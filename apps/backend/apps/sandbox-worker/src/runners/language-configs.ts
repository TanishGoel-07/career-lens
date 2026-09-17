import { LanguageConfig } from './docker-runner';

/**
 * Pinned, minimal images per language. Each image should be built in
 * CI with NO package manager network access at runtime (offline
 * toolchain only) — see docs/sandbox-security.md. Using distroless /
 * slim bases keeps the attack surface (and the blast radius of any
 * container escape) as small as practical.
 */
export const LANGUAGE_CONFIGS: Record<'PYTHON' | 'CPP' | 'JAVA', LanguageConfig> = {
  PYTHON: {
    image: 'careerlens/sandbox-python:3.12-slim',
    fileName: 'main.py',
    runCmd: ['python3', '/sandbox/work/main.py'],
  },
  CPP: {
    image: 'careerlens/sandbox-cpp:gcc13',
    fileName: 'main.cpp',
    compileCmd: ['g++', '-O2', '-o', '/sandbox/a.out', '/sandbox/work/main.cpp'],
    runCmd: ['/sandbox/a.out'],
  },
  JAVA: {
    image: 'careerlens/sandbox-java:21-jdk-slim',
    fileName: 'Main.java',
    compileCmd: ['javac', '-d', '/sandbox', '/sandbox/work/Main.java'],
    runCmd: ['java', '-cp', '/sandbox', 'Main'],
  },
};
