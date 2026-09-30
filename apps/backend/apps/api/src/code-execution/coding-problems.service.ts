import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';

export interface CodingProblemDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  tags: string[];
  starterCodes: Record<string, string>;
  constraints: string[];
  hints: string[];
  publicTestCases: Array<{ input: string; expectedOutput: string }>;
  isSolved?: boolean;
}

const SEED_PROBLEMS = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    category: 'Arrays & Hashing',
    tags: ['Array', 'Hash Table'],
    description:
      'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nInput format:\nLine 1: space-separated integers\nLine 2: target integer\n\nOutput format: space-separated indices\n\nExample 1:\nInput:\n2 7 11 15\n9\nOutput:\n0 1',
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9'],
    hints: [
      'A brute force approach checks all pairs in O(n^2) time. Can we do better with auxiliary space?',
      'Use a hash map to store each number and its index as you iterate.',
      'For each number x, check if (target - x) already exists in the map.',
    ],
    starterCodes: {
      PYTHON: `def two_sum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            return f"{lookup[diff]} {i}"
        lookup[num] = i
    return ""

if __name__ == "__main__":
    import sys
    lines = sys.stdin.read().splitlines()
    if len(lines) >= 2:
        nums = list(map(int, lines[0].split()))
        target = int(lines[1])
        print(two_sum(nums, target))
`,
      CPP: `#include <iostream>
#include <vector>
#include <sstream>
#include <unordered_map>

int main() {
    std::string line1, line2;
    if (std::getline(std::cin, line1) && std::getline(std::cin, line2)) {
        std::stringstream ss(line1);
        std::vector<int> nums;
        int val;
        while (ss >> val) nums.push_back(val);
        int target = std::stoi(line2);
        
        std::unordered_map<int, int> seen;
        for (int i = 0; i < (int)nums.size(); ++i) {
            int diff = target - nums[i];
            if (seen.count(diff)) {
                std::cout << seen[diff] << " " << i << std::endl;
                return 0;
            }
            seen[nums[i]] = i;
        }
    }
    return 0;
}
`,
      JAVA: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        if (!sc.hasNextInt()) return;
        int target = sc.nextInt();

        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);

        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (map.containsKey(diff)) {
                System.out.println(map.get(diff) + " " + i);
                return;
            }
            map.put(nums[i], i);
        }
    }
}
`,
    },
    testCases: [
      { input: '2 7 11 15\n9\n', expectedOutput: '0 1', isHidden: false },
      { input: '3 2 4\n6\n', expectedOutput: '1 2', isHidden: false },
      { input: '3 3\n6\n', expectedOutput: '0 1', isHidden: false },
      { input: '1 5 8 12 14\n20\n', expectedOutput: '2 3', isHidden: true },
      { input: '-3 4 3 90\n0\n', expectedOutput: '0 2', isHidden: true },
    ],
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'EASY',
    category: 'Stacks & Strings',
    tags: ['Stack', 'String'],
    description:
      'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type of brackets and closed in the correct order.\n\nInput format: single string\nOutput format: "true" or "false"',
    constraints: ['1 <= s.length <= 10^4', 's consists of parentheses only ()[]{}'],
    hints: [
      'Use a stack to keep track of expected closing brackets.',
      'When you see an open bracket, push its matching closing bracket onto the stack.',
      'When you see a closing bracket, verify if it matches the top of the stack.',
    ],
    starterCodes: {
      PYTHON: `def is_valid(s):
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    for char in s.strip():
        if char in pairs:
            if not stack or stack[-1] != pairs[char]:
                return "false"
            stack.pop()
        else:
            stack.append(char)
    return "true" if not stack else "false"

if __name__ == "__main__":
    import sys
    s = sys.stdin.read().strip()
    print(is_valid(s))
`,
      CPP: `#include <iostream>
#include <string>
#include <stack>

int main() {
    std::string s;
    if (std::cin >> s) {
        std::stack<char> st;
        for (char c : s) {
            if (c == '(') st.push(')');
            else if (c == '{') st.push('}');
            else if (c == '[') st.push(']');
            else {
                if (st.empty() || st.top() != c) {
                    std::cout << "false" << std::endl;
                    return 0;
                }
                st.pop();
            }
        }
        std::cout << (st.empty() ? "true" : "false") << std::endl;
    }
    return 0;
}
`,
      JAVA: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) return;
        String s = sc.next();
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) {
                System.out.println("false");
                return;
            }
        }
        System.out.println(stack.isEmpty() ? "true" : "false");
    }
}
`,
    },
    testCases: [
      { input: '()\n', expectedOutput: 'true', isHidden: false },
      { input: '()[]{}\n', expectedOutput: 'true', isHidden: false },
      { input: '(]\n', expectedOutput: 'false', isHidden: false },
      { input: '([)]\n', expectedOutput: 'false', isHidden: true },
      { input: '{[]}\n', expectedOutput: 'true', isHidden: true },
    ],
  },
  {
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'EASY',
    category: 'Sliding Window',
    tags: ['Array', 'Dynamic Programming'],
    description:
      'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit.\n\nInput format: space-separated stock prices\nOutput format: integer maximum profit',
    constraints: ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4'],
    hints: [
      'Track the minimum price seen so far as you iterate from left to right.',
      'At each day, the potential profit is prices[i] - min_price.',
      'Maintain the maximum profit observed across all days in O(n) time.',
    ],
    starterCodes: {
      PYTHON: `def max_profit(prices):
    min_price = float('inf')
    max_p = 0
    for p in prices:
        if p < min_price:
            min_price = p
        elif p - min_price > max_p:
            max_p = p - min_price
    return max_p

if __name__ == "__main__":
    import sys
    raw = sys.stdin.read().strip()
    if raw:
        prices = list(map(int, raw.split()))
        print(max_profit(prices))
`,
      CPP: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    int p;
    std::vector<int> prices;
    while (std::cin >> p) prices.push_back(p);
    int min_price = 1e9, max_p = 0;
    for (int price : prices) {
        min_price = std::min(min_price, price);
        max_p = std::max(max_p, price - min_price);
    }
    std::cout << max_p << std::endl;
    return 0;
}
`,
      JAVA: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> list = new ArrayList<>();
        while (sc.hasNextInt()) list.add(sc.nextInt());
        int minPrice = Integer.MAX_VALUE, maxProfit = 0;
        for (int p : list) {
            minPrice = Math.min(minPrice, p);
            maxProfit = Math.max(maxProfit, p - minPrice);
        }
        System.out.println(maxProfit);
    }
}
`,
    },
    testCases: [
      { input: '7 1 5 3 6 4\n', expectedOutput: '5', isHidden: false },
      { input: '7 6 4 3 1\n', expectedOutput: '0', isHidden: false },
      { input: '2 4 1\n', expectedOutput: '2', isHidden: true },
      { input: '1 2 4 2 5 7 2 4 9 0 9\n', expectedOutput: '9', isHidden: true },
    ],
  },
  {
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'MEDIUM',
    category: 'Sliding Window',
    tags: ['Hash Table', 'String', 'Sliding Window'],
    description:
      'Given a string `s`, find the length of the longest substring without duplicate characters.\n\nInput format: single string line\nOutput format: integer length',
    constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.'],
    hints: [
      'Use a sliding window with left and right pointers.',
      'Maintain a set or hash map of characters in the current window.',
      'When a duplicate is encountered, shrink the window from the left until the duplicate is removed.',
    ],
    starterCodes: {
      PYTHON: `def length_of_longest_substring(s):
    seen = {}
    left = 0
    max_len = 0
    for right, char in enumerate(s):
        if char in seen and seen[char] >= left:
            left = seen[char] + 1
        seen[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len

if __name__ == "__main__":
    import sys
    s = sys.stdin.readline().rstrip('\\r\\n')
    print(length_of_longest_substring(s))
`,
      CPP: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

int main() {
    std::string s;
    std::getline(std::cin, s);
    std::vector<int> last(256, -1);
    int left = 0, max_len = 0;
    for (int right = 0; right < (int)s.size(); ++right) {
        unsigned char c = s[right];
        if (last[c] >= left) left = last[c] + 1;
        last[c] = right;
        max_len = std::max(max_len, right - left + 1);
    }
    std::cout << max_len << std::endl;
    return 0;
}
`,
      JAVA: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        Map<Character, Integer> map = new HashMap<>();
        int left = 0, maxLen = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (map.containsKey(c) && map.get(c) >= left) {
                left = map.get(c) + 1;
            }
            map.put(c, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }
        System.out.println(maxLen);
    }
}
`,
    },
    testCases: [
      { input: 'abcabcbb\n', expectedOutput: '3', isHidden: false },
      { input: 'bbbbb\n', expectedOutput: '1', isHidden: false },
      { input: 'pwwkew\n', expectedOutput: '3', isHidden: false },
      { input: 'tmmzuxt\n', expectedOutput: '5', isHidden: true },
    ],
  },
  {
    slug: 'course-schedule',
    title: 'Course Schedule (Cycle Detection)',
    difficulty: 'MEDIUM',
    category: 'Graphs & Topological Sort',
    tags: ['Graph', 'Depth-First Search', 'Topological Sort'],
    description:
      'There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where prerequisites[i] = [ai, bi] indicates that you must take `bi` first if you want to take `ai`.\n\nReturn "true" if you can finish all courses, or "false" if there is a cycle.\n\nInput format:\nLine 1: numCourses\nLine 2+: ai bi pairs (or empty if none)\n\nExample:\n2\n1 0\nOutput: true',
    constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= 5000'],
    hints: [
      'Model the courses and prerequisites as a Directed Acyclic Graph (DAG).',
      'Use Kahn\'s algorithm (in-degree array + queue) or DFS with a visited state (0=unvisited, 1=visiting, 2=visited).',
      'If the graph contains any cycle, you cannot finish all courses.',
    ],
    starterCodes: {
      PYTHON: `def can_finish(num_courses, prereqs):
    from collections import defaultdict, deque
    adj = defaultdict(list)
    indegree = [0] * num_courses
    for dest, src in prereqs:
        adj[src].append(dest)
        indegree[dest] += 1
    
    q = deque([i for i in range(num_courses) if indegree[i] == 0])
    visited = 0
    while q:
        node = q.popleft()
        visited += 1
        for neighbor in adj[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                q.append(neighbor)
    return "true" if visited == num_courses else "false"

if __name__ == "__main__":
    import sys
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n = int(lines[0])
        prereqs = []
        for line in lines[1:]:
            parts = list(map(int, line.split()))
            if len(parts) >= 2:
                prereqs.append((parts[0], parts[1]))
        print(can_finish(n, prereqs))
`,
      CPP: `#include <iostream>
#include <vector>
#include <queue>

int main() {
    int n;
    if (std::cin >> n) {
        std::vector<std::vector<int>> adj(n);
        std::vector<int> indegree(n, 0);
        int u, v;
        while (std::cin >> u >> v) {
            adj[v].push_back(u);
            indegree[u]++;
        }
        std::queue<int> q;
        for (int i = 0; i < n; ++i) if (indegree[i] == 0) q.push(i);
        int visited = 0;
        while (!q.empty()) {
            int curr = q.front(); q.pop();
            visited++;
            for (int next : adj[curr]) {
                if (--indegree[next] == 0) q.push(next);
            }
        }
        std::cout << (visited == n ? "true" : "false") << std::endl;
    }
    return 0;
}
`,
      JAVA: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indegree = new int[n];
        while (sc.hasNextInt()) {
            int u = sc.nextInt();
            if (!sc.hasNextInt()) break;
            int v = sc.nextInt();
            adj.get(v).add(u);
            indegree[u]++;
        }
        Queue<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indegree[i] == 0) q.offer(i);
        int visited = 0;
        while (!q.isEmpty()) {
            int curr = q.poll();
            visited++;
            for (int next : adj.get(curr)) {
                if (--indegree[next] == 0) q.offer(next);
            }
        }
        System.out.println(visited == n ? "true" : "false");
    }
}
`,
    },
    testCases: [
      { input: '2\n1 0\n', expectedOutput: 'true', isHidden: false },
      { input: '2\n1 0\n0 1\n', expectedOutput: 'false', isHidden: false },
      { input: '4\n1 0\n2 1\n3 2\n', expectedOutput: 'true', isHidden: true },
      { input: '3\n0 1\n1 2\n2 0\n', expectedOutput: 'false', isHidden: true },
    ],
  },
];

@Injectable()
export class CodingProblemsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedProblems();
  }

  async seedProblems() {
    for (const [index, prob] of SEED_PROBLEMS.entries()) {
      const existing = await this.prisma.codingProblem.findUnique({ where: { slug: prob.slug } });
      if (!existing) {
        const created = await this.prisma.codingProblem.create({
          data: {
            slug: prob.slug,
            title: prob.title,
            difficulty: prob.difficulty,
            category: prob.category,
            tags: prob.tags,
            description: prob.description,
            constraints: prob.constraints,
            hints: prob.hints,
            starterCodes: prob.starterCodes,
            orderIndex: index,
          },
        });

        for (const [tIdx, tc] of prob.testCases.entries()) {
          await this.prisma.problemTestCase.create({
            data: {
              problemId: created.id,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden,
              orderIndex: tIdx,
            },
          });
        }
      }
    }
  }

  async listProblems(userId?: string, category?: string, difficulty?: string): Promise<CodingProblemDto[]> {
    const where: any = {};
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;

    const [problems, userSubmissions] = await Promise.all([
      this.prisma.codingProblem.findMany({
        where,
        include: {
          testCases: { where: { isHidden: false }, orderBy: { orderIndex: 'asc' } },
        },
        orderBy: { orderIndex: 'asc' },
      }),
      userId
        ? this.prisma.codeSubmission.findMany({
            where: { userId, status: 'COMPLETED' },
            select: { problemId: true },
          })
        : Promise.resolve([]),
    ]);

    const solvedProblemIds = new Set(userSubmissions.map((s) => s.problemId).filter(Boolean));

    return problems.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      category: p.category,
      tags: p.tags as string[],
      starterCodes: p.starterCodes as Record<string, string>,
      constraints: p.constraints as string[],
      hints: p.hints as string[],
      publicTestCases: p.testCases.map((tc) => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
      isSolved: solvedProblemIds.has(p.id),
    }));
  }

  async getProblemBySlug(slug: string, userId?: string): Promise<CodingProblemDto> {
    const problem = await this.prisma.codingProblem.findUnique({
      where: { slug },
      include: {
        testCases: { where: { isHidden: false }, orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!problem) throw new NotFoundException(`Problem ${slug} not found.`);

    let isSolved = false;
    if (userId) {
      const solved = await this.prisma.codeSubmission.findFirst({
        where: { userId, problemId: problem.id, status: 'COMPLETED' },
      });
      isSolved = Boolean(solved);
    }

    return {
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      category: problem.category,
      tags: problem.tags as string[],
      starterCodes: problem.starterCodes as Record<string, string>,
      constraints: problem.constraints as string[],
      hints: problem.hints as string[],
      publicTestCases: problem.testCases.map((tc) => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
      isSolved,
    };
  }

  async getHint(problemId: string, level: number): Promise<{ level: number; hint: string }> {
    const problem = await this.prisma.codingProblem.findUnique({ where: { id: problemId } });
    if (!problem) throw new NotFoundException('Problem not found.');

    const hints = (problem.hints as string[]) || [];
    const index = Math.max(0, Math.min(hints.length - 1, level - 1));
    return {
      level: index + 1,
      hint: hints[index] || 'Consider the optimal data structure for instant element lookups.',
    };
  }

  async getUserCodingStats(userId: string) {
    const [allProblems, submissions] = await Promise.all([
      this.prisma.codingProblem.findMany(),
      this.prisma.codeSubmission.findMany({ where: { userId } }),
    ]);

    const completed = submissions.filter((s) => s.status === 'COMPLETED');
    const solvedProblemIds = new Set(completed.map((s) => s.problemId).filter(Boolean));

    const totalSolved = solvedProblemIds.size;
    const easySolved = allProblems.filter((p) => p.difficulty === 'EASY' && solvedProblemIds.has(p.id)).length;
    const mediumSolved = allProblems.filter((p) => p.difficulty === 'MEDIUM' && solvedProblemIds.has(p.id)).length;
    const hardSolved = allProblems.filter((p) => p.difficulty === 'HARD' && solvedProblemIds.has(p.id)).length;

    return {
      totalSolved,
      totalProblems: allProblems.length,
      easySolved,
      mediumSolved,
      hardSolved,
      recentSubmissions: submissions.slice(0, 5),
    };
  }
}
