export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface TestCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  durationMs: number;
}

export interface RunResult {
  status: 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  testResults: TestCaseResult[];
  compileError?: string;
  runtimeError?: string;
}
