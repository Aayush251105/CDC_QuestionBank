// Sample data taken from the design pages (renderVals) so the built pages
// look like the designs. Every count the UI shows is computed from these
// rows, so numbers are smaller than the mock-ups (CLAUDE.md section 2a.4).
//
// Safe to run more than once: it stops if the database already has companies.
// It never deletes data.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  Difficulty,
  PrismaClient,
  QuestionType,
  RoundType,
  SubmissionStatus,
} from "../src/generated/prisma/client";
import { normalisePin, slugify } from "../src/lib/slug";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const d = (y: number, m: number, day: number) =>
  new Date(Date.UTC(y, m - 1, day));

// ---------- Topics (08-Topics) ----------

const TAG_GROUPS: [string, string[]][] = [
  [
    "Data structures and algorithms",
    [
      "Arrays and strings",
      "Sliding window",
      "Hashing",
      "Dynamic programming",
      "Graphs",
      "Trees",
      "Binary search",
      "Greedy",
      "Stacks and queues",
    ],
  ],
  [
    "Aptitude",
    [
      "Quantitative",
      "Logical reasoning",
      "Verbal ability",
      "Data interpretation",
    ],
  ],
  [
    "Computer science fundamentals",
    [
      "SQL",
      "Operating systems",
      "DBMS theory",
      "C and C++ output",
      "Computer networks",
    ],
  ],
  ["Other", ["Work style and behaviour", "Essay writing", "Core engineering"]],
];

// ---------- Companies (03-Companies) ----------

const COMPANIES: [string, string][] = [
  ["Accenture", "Consulting"],
  ["Adobe", "Software"],
  ["Amazon", "Software"],
  ["Deloitte", "Consulting"],
  ["Goldman Sachs", "Finance"],
  ["HCLTech", "Software"],
  ["Infosys", "Software"],
  ["L&T", "Core engineering"],
  ["Microsoft", "Software"],
  ["Samsung R&D", "Software"],
  ["TCS", "Software"],
  ["ZS Associates", "Analytics"],
];

// ---------- Drives and rounds (04-Company-detail, 05-Round-detail, S1) ----------

type RoundSeed = {
  key: string; // used below to attach questions and submissions
  name: string;
  type: RoundType;
  date: Date;
  format?: string;
  platform?: string;
  durationMin?: number;
  sections?: string[];
  slug?: string;
};
type DriveSeed = {
  company: string;
  year: number;
  name: string;
  roles: string[];
  open?: boolean;
  pin?: string;
  rounds: RoundSeed[];
};

const OA = "Online assessment";

const DRIVES: DriveSeed[] = [
  {
    company: "Amazon",
    year: 2025,
    name: "SDE intern",
    roles: ["SDE intern"],
    open: true,
    pin: "AMZN-INT-25",
    rounds: [
      {
        key: "amz25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 8, 14),
        format: "2 coding questions and a work style survey",
        platform: "HackerRank",
        durationMin: 105,
        sections: ["Coding", "Work style survey"],
      },
      {
        key: "amz25-tech",
        name: "Technical interview",
        type: "TECHNICAL",
        date: d(2025, 8, 28),
        format: "Data structures and problem solving",
        platform: "Amazon Chime",
        durationMin: 60,
      },
      {
        key: "amz25-hr",
        name: "Bar raiser and HR",
        type: "HR",
        date: d(2025, 8, 29),
        format: "Leadership principles",
        platform: "On campus",
        durationMin: 45,
      },
    ],
  },
  {
    company: "Amazon",
    year: 2025,
    name: "SDE I, full time",
    roles: ["SDE I"],
    open: true,
    pin: "AMZN-FT-25",
    rounds: [
      {
        key: "amz25ft-oa",
        name: OA,
        slug: "sde-i-online-assessment", // same company and year as the intern drive
        type: "OA",
        date: d(2025, 9, 2),
        format: "2 coding questions",
        platform: "HackerRank",
        durationMin: 90,
      },
    ],
  },
  {
    company: "Amazon",
    year: 2024,
    name: "SDE intern",
    roles: ["SDE intern"],
    rounds: [
      {
        key: "amz24-oa",
        name: OA,
        type: "OA",
        date: d(2024, 8, 9),
        format: "2 coding and 15 MCQ",
        platform: "HackerRank",
        durationMin: 90,
      },
      {
        key: "amz24-tech",
        name: "Technical interview",
        type: "TECHNICAL",
        date: d(2024, 8, 22),
        format: "Data structures",
        platform: "Amazon Chime",
        durationMin: 60,
      },
    ],
  },
  {
    company: "Amazon",
    year: 2023,
    name: "SDE intern",
    roles: ["SDE intern"],
    rounds: [
      {
        key: "amz23-oa",
        name: OA,
        type: "OA",
        date: d(2023, 8, 17),
        format: "2 coding and a debugging section",
        platform: "HackerEarth",
        durationMin: 90,
      },
    ],
  },
  {
    company: "Amazon",
    year: 2022,
    name: "SDE intern",
    roles: ["SDE intern"],
    rounds: [
      {
        key: "amz22-oa",
        name: OA,
        type: "OA",
        date: d(2022, 9, 3),
        format: "2 coding",
        platform: "HackerRank",
        durationMin: 70,
      },
    ],
  },
  {
    company: "Microsoft",
    year: 2025,
    name: "SWE intern",
    roles: ["SWE intern"],
    open: true,
    pin: "MSFT-25",
    rounds: [
      {
        key: "ms25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 9, 10),
        platform: "Codility",
        durationMin: 90,
      },
    ],
  },
  {
    company: "Microsoft",
    year: 2024,
    name: "SWE intern",
    roles: ["SWE intern"],
    rounds: [
      {
        key: "ms24-oa",
        name: OA,
        type: "OA",
        date: d(2024, 8, 20),
        platform: "Codility",
        durationMin: 90,
      },
      {
        key: "ms24-int2",
        name: "Technical interview 2",
        type: "TECHNICAL",
        date: d(2024, 9, 2),
        format: "System design",
        durationMin: 60,
      },
    ],
  },
  {
    company: "Adobe",
    year: 2025,
    name: "Product intern",
    roles: ["Product intern"],
    rounds: [
      {
        key: "adb25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 8, 18),
        platform: "HackerRank",
        durationMin: 90,
      },
    ],
  },
  {
    company: "Adobe",
    year: 2023,
    name: "Product intern",
    roles: ["Product intern"],
    rounds: [
      {
        key: "adb23-oa",
        name: OA,
        type: "OA",
        date: d(2023, 8, 21),
        platform: "HackerRank",
        durationMin: 90,
      },
    ],
  },
  {
    company: "Deloitte",
    year: 2025,
    name: "Analyst",
    roles: ["Analyst"],
    open: true,
    pin: "DLT-25",
    rounds: [
      {
        key: "dlt25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 7, 30),
        platform: "AMCAT",
        durationMin: 60,
      },
      {
        key: "dlt25-apt",
        name: "Aptitude test",
        type: "OA",
        date: d(2025, 7, 25),
        platform: "AMCAT",
        durationMin: 45,
        sections: ["Quantitative", "Logical reasoning", "Verbal ability"],
      },
    ],
  },
  {
    company: "TCS",
    year: 2025,
    name: "Ninja",
    roles: ["Ninja", "Digital"],
    rounds: [
      {
        key: "tcs25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 10, 4),
        platform: "TCS iON",
        durationMin: 90,
      },
      {
        key: "tcs25-apt",
        name: "Aptitude round",
        type: "OA",
        date: d(2025, 10, 4),
        platform: "TCS iON",
        durationMin: 50,
      },
    ],
  },
  {
    company: "Goldman Sachs",
    year: 2025,
    name: "Engineering analyst",
    roles: ["Engineering analyst"],
    rounds: [
      {
        key: "gs25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 8, 5),
        platform: "HackerRank",
        durationMin: 120,
      },
    ],
  },
  {
    company: "Goldman Sachs",
    year: 2024,
    name: "Engineering analyst",
    roles: ["Engineering analyst"],
    rounds: [
      {
        key: "gs24-oa",
        name: OA,
        type: "OA",
        date: d(2024, 11, 12),
        platform: "HackerRank",
        durationMin: 120,
      },
    ],
  },
  {
    company: "Samsung R&D",
    year: 2025,
    name: "Software engineer",
    roles: ["Software engineer"],
    rounds: [
      {
        key: "sam25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 9, 12),
        platform: "Samsung SWC",
        durationMin: 180,
      },
    ],
  },
  {
    company: "ZS Associates",
    year: 2025,
    name: "Business technology analyst",
    roles: ["Business technology analyst"],
    rounds: [
      {
        key: "zs25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 9, 18),
        platform: "HackerRank",
        durationMin: 90,
      },
    ],
  },
  {
    company: "Accenture",
    year: 2025,
    name: "Associate software engineer",
    roles: ["Associate software engineer"],
    rounds: [
      {
        key: "acn25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 9, 8),
        platform: "Cocubes",
        durationMin: 90,
      },
    ],
  },
  {
    company: "HCLTech",
    year: 2025,
    name: "Graduate engineer trainee",
    roles: ["Graduate engineer trainee"],
    rounds: [
      {
        key: "hcl25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 9, 22),
        platform: "Mettl",
        durationMin: 75,
      },
    ],
  },
  {
    company: "L&T",
    year: 2024,
    name: "Graduate engineer trainee",
    roles: ["Graduate engineer trainee"],
    rounds: [
      {
        key: "lt24-oa",
        name: OA,
        type: "OA",
        date: d(2024, 12, 3),
        platform: "Mettl",
        durationMin: 60,
      },
    ],
  },
  {
    company: "Infosys",
    year: 2025,
    name: "Systems engineer",
    roles: ["Systems engineer"],
    rounds: [
      {
        key: "inf25-oa",
        name: OA,
        type: "OA",
        date: d(2025, 7, 20),
        platform: "HackerRank",
        durationMin: 180,
      },
    ],
  },
];

// ---------- Questions (02 Home, 05, 06, 07 Search, 11 Bookmarks) ----------

type QuestionSeed = {
  key: string;
  round: string;
  title: string;
  type: QuestionType;
  difficulty: Difficulty;
  tags: string[];
  body: string;
  options?: { key: string; text: string }[];
  notes?: string;
  alsoIn?: string[]; // other round keys ("Where it was asked")
};

const QUESTIONS: QuestionSeed[] = [
  {
    key: "q-longest-k",
    round: "amz25-oa",
    title: "Longest substring with at most K distinct characters",
    type: "CODING",
    difficulty: "MEDIUM",
    tags: ["Sliding window", "Hashing", "Arrays and strings"],
    body: [
      "Given a string `s` and an integer `k`, return the length of the longest substring of `s` that contains at most `k` distinct characters.",
      "",
      "**Constraints**",
      "",
      "- 1 ≤ |s| ≤ 10^5",
      "- 0 ≤ k ≤ 26",
      "- `s` has lowercase English letters only",
      "",
      "**Example**",
      "",
      "```",
      'Input:  s = "eceba", k = 2',
      "Output: 3",
      'Why:    "ece" is the longest substring with 2 distinct characters',
      "```",
    ].join("\n"),
    notes: "15 test cases, 3 hidden. Two said an O(n²) approach timed out.",
    alsoIn: ["ms24-oa", "adb23-oa"],
  },
  {
    key: "q-truck",
    round: "amz25-oa",
    title: "Smallest truck capacity to ship all packages in D days",
    type: "CODING",
    difficulty: "HARD",
    tags: ["Binary search", "Greedy"],
    body: [
      "Packages have weights `w[i]` and must ship in the given order. Each day one truck carries at most `C`. Find the smallest `C` that ships everything within `D` days.",
      "",
      "```",
      "Input:  w = [1,2,3,4,5,6,7,8,9,10], D = 5",
      "Output: 15",
      "```",
    ].join("\n"),
    alsoIn: ["adb25-oa"],
  },
  {
    key: "q-teammate",
    round: "amz25-oa",
    title: "A teammate misses a deadline your work depends on",
    type: "MCQ",
    difficulty: "EASY",
    tags: ["Work style and behaviour"],
    body: "Pick the response closest to how you would act.",
    options: [
      { key: "A", text: "Escalate to your manager straight away" },
      { key: "B", text: "Talk to the teammate and agree a new plan" },
      { key: "C", text: "Do their part yourself" },
      { key: "D", text: "Wait and see" },
    ],
    alsoIn: ["amz24-oa"],
  },
  {
    key: "q-salary",
    round: "dlt25-oa",
    title: "Second highest salary in each department",
    type: "SQL",
    difficulty: "EASY",
    tags: ["SQL"],
    body: "Table `employees(id, name, dept_id, salary)`. For each department, return the second highest distinct salary. Departments with only one salary should not appear.",
  },
  {
    key: "q-pipes",
    round: "tcs25-apt",
    title: "Two pipes fill a tank while a leak empties it",
    type: "APTITUDE",
    difficulty: "EASY",
    tags: ["Quantitative"],
    body: "Pipe A fills a tank in 12 hours and pipe B in 15 hours. A leak empties the full tank in 20 hours. With all three open, how long does it take to fill the tank?",
    options: [
      { key: "A", text: "8 hours" },
      { key: "B", text: "10 hours" },
      { key: "C", text: "12 hours" },
      { key: "D", text: "15 hours" },
    ],
  },
  {
    key: "q-trains",
    round: "tcs25-apt",
    title: "Trains crossing a platform",
    type: "APTITUDE",
    difficulty: "EASY",
    tags: ["Quantitative"],
    body: "A 240 m train running at 54 km/h crosses a platform in 30 seconds. How long is the platform?",
  },
  {
    key: "q-max-sum-k",
    round: "tcs25-oa",
    title: "Maximum sum of any subarray of size K",
    type: "CODING",
    difficulty: "EASY",
    tags: ["Sliding window", "Arrays and strings"],
    body: "Given an array of integers and a number `k`, return the maximum sum of any contiguous subarray of length `k`. A fixed-size sliding window of length `k` moves across the array.",
  },
  {
    key: "q-fruits",
    round: "tcs25-oa",
    title: "Fruits into two baskets",
    type: "CODING",
    difficulty: "EASY",
    tags: ["Sliding window", "Hashing"],
    body: "Each tree in a row gives one fruit of type `fruits[i]`. You have two baskets, each holding one type. Starting from any tree and moving right, return the most fruit you can pick.",
  },
  {
    key: "q-min-window",
    round: "gs24-oa",
    title: "Smallest window containing all characters of a pattern",
    type: "CODING",
    difficulty: "HARD",
    tags: ["Sliding window", "Hashing", "Arrays and strings"],
    body: "Given strings `s` and `t`, find the minimum window in `s` that contains every character of `t`, including duplicates. Return an empty string if there is none.",
  },
  {
    key: "q-connect-cities",
    round: "gs24-oa",
    title: "Minimum cost to connect all cities",
    type: "CODING",
    difficulty: "HARD",
    tags: ["Graphs", "Greedy"],
    body: "There are `n` cities and a list of possible roads `[a, b, cost]`. Return the minimum total cost to connect every city, or -1 if it cannot be done.",
  },
  {
    key: "q-islands",
    round: "gs25-oa",
    title: "Number of islands in a grid",
    type: "CODING",
    difficulty: "MEDIUM",
    tags: ["Graphs"],
    body: "Given a grid of `1` (land) and `0` (water), count the islands. An island is land connected up, down, left or right.",
  },
  {
    key: "q-islands-2",
    round: "ms24-oa",
    title: "Count islands after each land addition",
    type: "CODING",
    difficulty: "HARD",
    tags: ["Graphs"],
    body: "A grid starts as all water. You are given positions that turn into land one at a time. After each addition, return the number of islands.",
  },
  {
    key: "q-url-shortener",
    round: "ms24-int2",
    title: "Design a URL shortener",
    type: "WRITTEN",
    difficulty: "HARD",
    tags: ["DBMS theory"],
    body: "Design a service that turns long URLs into short links and redirects them. Discuss the data model, how short codes are generated, and how it scales to millions of reads a day.",
  },
  {
    key: "q-c-pointer",
    round: "sam25-oa",
    title: "Output of the given C pointer snippet",
    type: "MCQ",
    difficulty: "MEDIUM",
    tags: ["C and C++ output"],
    body: [
      "What does this print?",
      "",
      "```c",
      "int a[] = {1, 2, 3};",
      "int *p = a;",
      'printf("%d", *(p + 1));',
      "```",
    ].join("\n"),
    options: [
      { key: "A", text: "1" },
      { key: "B", text: "2" },
      { key: "C", text: "3" },
      { key: "D", text: "Garbage value" },
    ],
  },
  {
    key: "q-technique",
    round: "sam25-oa",
    title: "Which technique solves the subarray problem in O(n)?",
    type: "MCQ",
    difficulty: "EASY",
    tags: ["Sliding window"],
    body: "You need the longest subarray whose sum is at most S, with all elements positive. Which technique solves it in O(n)?",
    options: [
      { key: "A", text: "Brute force" },
      { key: "B", text: "Sliding window" },
      { key: "C", text: "Recursion" },
      { key: "D", text: "Sorting" },
    ],
  },
  {
    key: "q-rolling-avg",
    round: "zs25-oa",
    title: "Rolling 7-day average of orders per customer",
    type: "SQL",
    difficulty: "MEDIUM",
    tags: ["SQL"],
    body: "Table `orders(customer_id, order_date, amount)`. For each customer and date, return the average amount over that day and the 6 days before it. Use a window function with `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`.",
  },
  {
    key: "q-repeating",
    round: "adb25-oa",
    title: "Longest repeating character replacement",
    type: "CODING",
    difficulty: "MEDIUM",
    tags: ["Sliding window", "Arrays and strings"],
    body: "Given a string `s` and an integer `k`, you may change at most `k` characters. Return the length of the longest substring with all the same letter.",
  },
  {
    key: "q-remote-essay",
    round: "acn25-oa",
    title: "Essay on remote work",
    type: "WRITTEN",
    difficulty: "EASY",
    tags: ["Essay writing", "Verbal ability"],
    body: "Write 200 to 250 words on whether remote work helps or hurts teams early in their careers.",
  },
  {
    key: "q-tcp-udp",
    round: "hcl25-oa",
    title: "When is UDP a better choice than TCP?",
    type: "MCQ",
    difficulty: "EASY",
    tags: ["Computer networks"],
    body: "Which of these is the best fit for UDP?",
    options: [
      { key: "A", text: "File transfer" },
      { key: "B", text: "Live video calls" },
      { key: "C", text: "Online banking" },
      { key: "D", text: "Sending email" },
    ],
  },
  {
    key: "q-beam",
    round: "lt24-oa",
    title: "Maximum bending moment in a simply supported beam",
    type: "APTITUDE",
    difficulty: "MEDIUM",
    tags: ["Core engineering"],
    body: "A simply supported beam of span 6 m carries a uniformly distributed load of 10 kN/m. Find the maximum bending moment.",
  },
  {
    key: "q-seating",
    round: "dlt25-apt",
    title: "Six friends at a round table",
    type: "APTITUDE",
    difficulty: "MEDIUM",
    tags: ["Logical reasoning"],
    body: "Six friends sit at a round table. A sits opposite D, B is to the left of A, and C is not next to D. Who sits to the right of D?",
  },
];

// ---------- People ----------

const STUDENTS = [
  // The signed-in student in every design page (12-Profile)
  {
    key: "aarav",
    name: "Aarav Sharma",
    email: "as123@snu.edu.in",
    rollNo: "2210110123",
    branch: "CSE",
    gradYear: 2026,
  },
  {
    key: "priya",
    name: "Priya Nair",
    email: "pn456@snu.edu.in",
    rollNo: "2210110456",
    branch: "CSE",
    gradYear: 2026,
    credit: true,
  },
  {
    key: "rohan",
    name: "Rohan Mehta",
    email: "rm789@snu.edu.in",
    rollNo: "2210110789",
    branch: "ECE",
    gradYear: 2026,
  },
  {
    key: "isha",
    name: "Isha Verma",
    email: "iv234@snu.edu.in",
    rollNo: "2210110234",
    branch: "CSE",
    gradYear: 2027,
  },
  {
    key: "kabir",
    name: "Kabir Singh",
    email: "ks567@snu.edu.in",
    rollNo: "2210110567",
    branch: "Mechanical",
    gradYear: 2026,
  },
];

async function main() {
  if ((await db.company.count()) > 0) {
    console.log("Database already has data; seed skipped.");
    return;
  }

  // Tags
  const tagId = new Map<string, string>();
  for (const [groupOrder, [group, names]] of TAG_GROUPS.entries()) {
    for (const name of names) {
      const tag = await db.tag.create({
        data: { name, slug: slugify(name), group, groupOrder },
      });
      tagId.set(name, tag.id);
    }
  }

  // Companies
  const companyId = new Map<string, string>();
  for (const [name, sector] of COMPANIES) {
    const c = await db.company.create({
      data: { name, slug: slugify(name), sector },
    });
    companyId.set(name, c.id);
  }

  // Drives and rounds
  const roundId = new Map<string, string>();
  for (const dr of DRIVES) {
    const drive = await db.drive.create({
      data: {
        companyId: companyId.get(dr.company)!,
        year: dr.year,
        name: dr.name,
        roles: dr.roles,
        status: dr.open ? "OPEN" : "CLOSED",
        submissionPin: dr.pin ? normalisePin(dr.pin) : null,
        pinCreatedAt: dr.pin ? new Date() : null,
      },
    });
    for (const [i, r] of dr.rounds.entries()) {
      const round = await db.round.create({
        data: {
          driveId: drive.id,
          order: i + 1,
          slug: r.slug ?? slugify(r.name),
          name: r.name,
          type: r.type,
          date: r.date,
          format: r.format,
          platform: r.platform,
          durationMin: r.durationMin,
          sections: r.sections ?? [],
        },
      });
      roundId.set(r.key, round.id);
    }
  }

  // Questions
  const questionId = new Map<string, string>();
  const orderInRound = new Map<string, number>();
  for (const q of QUESTIONS) {
    const order = (orderInRound.get(q.round) ?? 0) + 1;
    orderInRound.set(q.round, order);
    const created = await db.question.create({
      data: {
        roundId: roundId.get(q.round)!,
        order,
        title: q.title,
        bodyMarkdown: q.body,
        type: q.type,
        difficulty: q.difficulty,
        options: q.options,
        notes: q.notes,
        tags: { create: q.tags.map((t) => ({ tagId: tagId.get(t)! })) },
        appearances: {
          create: (q.alsoIn ?? []).map((r) => ({ roundId: roundId.get(r)! })),
        },
      },
    });
    questionId.set(q.key, created.id);
  }

  // Users
  const userId = new Map<string, string>();
  for (const s of STUDENTS) {
    const u = await db.user.create({
      data: {
        name: s.name,
        email: s.email,
        rollNo: s.rollNo,
        programme: "B.Tech",
        branch: s.branch,
        gradYear: s.gradYear,
        creditByDefault: s.credit ?? false,
      },
    });
    userId.set(s.key, u.id);
  }
  await db.user.create({
    data: { name: "CDC Admin", email: "cdc.admin@snu.edu.in", role: "ADMIN" },
  });

  // Submissions (10-My-submissions for Aarav; others so "Shared by" counts are real)
  type SubSeed = {
    user: string;
    round: string;
    status: SubmissionStatus;
    lastStep?: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    credit?: boolean;
    raw: {
      type: QuestionType;
      title: string;
      text: string;
      publishedAs?: string;
    }[];
  };
  const SUBMISSIONS: SubSeed[] = [
    {
      user: "aarav",
      round: "ms25-oa",
      status: "DRAFT",
      lastStep: "questions",
      raw: [
        {
          type: "CODING",
          title: "Merge overlapping intervals",
          text: "given list of intervals merge all overlapping ones",
        },
        {
          type: "MCQ",
          title: "Time complexity of heapify",
          text: "time complexity of building a heap from n items\na O(n) b O(n log n) c O(log n) d O(1)",
        },
      ],
    },
    {
      user: "aarav",
      round: "amz25-tech",
      status: "PENDING_REVIEW",
      submittedAt: d(2025, 8, 28),
      raw: [
        {
          type: "CODING",
          title: "Lowest common ancestor in a BST",
          text: "find LCA of two nodes in a binary search tree",
        },
        {
          type: "WRITTEN",
          title: "Tell me about a time you disagreed",
          text: "behavioural: a time you disagreed with a teammate",
        },
      ],
    },
    {
      user: "aarav",
      round: "amz25-oa",
      status: "PUBLISHED",
      submittedAt: d(2025, 8, 14),
      reviewedAt: d(2025, 8, 20),
      raw: [
        {
          type: "CODING",
          title: "Longest substring with at most K distinct characters",
          text: "given string s and int k find longest substring with atmost k distinct chars. s length upto 1e5\neg s = eceba k=2 ans 3",
          publishedAs: "q-longest-k",
        },
        {
          type: "CODING",
          title: "Smallest truck capacity to ship packages in D days",
          text: "packages w[i] ship in order, one truck per day max C, find min C within D days.\nw=[1..10] D=5 -> 15",
          publishedAs: "q-truck",
        },
        {
          type: "MCQ",
          title: "A teammate misses a deadline your work depends on",
          text: "teammate misses deadline what do u do\na escalate b talk to them c do it urself d wait",
          publishedAs: "q-teammate",
        },
      ],
    },
    {
      user: "aarav",
      round: "dlt25-apt",
      status: "PUBLISHED",
      submittedAt: d(2025, 7, 26),
      reviewedAt: d(2025, 8, 2),
      raw: [
        {
          type: "APTITUDE",
          title: "Six friends at a round table",
          text: "6 friends round table A opp D, B left of A, C not next to D. who is right of D",
          publishedAs: "q-seating",
        },
      ],
    },
    {
      user: "aarav",
      round: "inf25-oa",
      status: "NOT_PUBLISHED",
      submittedAt: d(2025, 7, 21),
      reviewedAt: d(2025, 7, 28),
      raw: [
        {
          type: "CODING",
          title: "Reverse words in a sentence",
          text: "reverse the order of words in a string",
        },
        {
          type: "APTITUDE",
          title: "Ages of father and son",
          text: "father is 3 times son, after 10 yrs twice. find ages",
        },
      ],
    },
    {
      user: "priya",
      round: "amz25-oa",
      status: "PUBLISHED",
      credit: true,
      submittedAt: d(2025, 8, 14),
      reviewedAt: d(2025, 8, 20),
      raw: [
        {
          type: "CODING",
          title: "Ship packages within D days",
          text: "binary search on capacity, ship within D days",
          publishedAs: "q-truck",
        },
      ],
    },
    {
      user: "rohan",
      round: "amz25-oa",
      status: "PUBLISHED",
      submittedAt: d(2025, 8, 15),
      reviewedAt: d(2025, 8, 20),
      raw: [
        {
          type: "CODING",
          title: "Longest substring with k distinct",
          text: "longest substring with at most k distinct characters",
          publishedAs: "q-longest-k",
        },
      ],
    },
    {
      user: "isha",
      round: "amz25-oa",
      status: "PENDING_REVIEW",
      submittedAt: d(2025, 8, 16),
      raw: [
        {
          type: "MCQ",
          title: "Work style survey question",
          text: "teammate misses deadline, what do you do",
        },
      ],
    },
    {
      user: "kabir",
      round: "lt24-oa",
      status: "PUBLISHED",
      submittedAt: d(2024, 12, 4),
      reviewedAt: d(2024, 12, 10),
      raw: [
        {
          type: "APTITUDE",
          title: "Beam bending moment",
          text: "simply supported beam 6m udl 10kN/m max BM",
          publishedAs: "q-beam",
        },
      ],
    },
  ];

  for (const s of SUBMISSIONS) {
    const sub = await db.submission.create({
      data: {
        userId: userId.get(s.user)!,
        roundId: roundId.get(s.round)!,
        enteredWithPin: true,
        status: s.status,
        lastStep: s.lastStep ?? "review",
        credit: s.credit ?? false,
        honourAcceptedAt: s.submittedAt,
        submittedAt: s.submittedAt,
        reviewStartedAt: s.reviewedAt,
        reviewedAt: s.reviewedAt,
      },
    });
    for (const [i, r] of s.raw.entries()) {
      const raw = await db.rawQuestion.create({
        data: {
          submissionId: sub.id,
          order: i + 1,
          type: r.type,
          title: r.title,
          textOriginal: r.text,
          textCleaned: s.status === "DRAFT" ? null : r.text,
        },
      });
      if (r.publishedAs) {
        const qid = questionId.get(r.publishedAs)!;
        await db.questionSource.create({
          data: { questionId: qid, rawQuestionId: raw.id },
        });
        if (s.credit) {
          await db.question.update({
            where: { id: qid },
            data: { creditedUserIds: { push: userId.get(s.user)! } },
          });
        }
      }
    }
  }

  // Bookmarks (11-Bookmarks, followed companies on 02-Home and 03-Companies)
  const aarav = userId.get("aarav")!;
  for (const name of ["Amazon", "Microsoft", "Deloitte", "Goldman Sachs"]) {
    await db.bookmark.create({
      data: { userId: aarav, companyId: companyId.get(name)! },
    });
  }
  for (const key of [
    "q-truck",
    "q-salary",
    "q-trains",
    "q-url-shortener",
    "q-islands",
  ]) {
    await db.bookmark.create({
      data: { userId: aarav, questionId: questionId.get(key)! },
    });
  }

  // One unread notification ("Notifications (1)"). Neutral: no outcome (2a.2).
  await db.notification.create({
    data: {
      userId: aarav,
      kind: "SUBMISSION_REVIEWED",
      link: "/me/submissions",
    },
  });

  console.log(
    `Seeded ${COMPANIES.length} companies, ${DRIVES.length} drives, ${QUESTIONS.length} questions, ` +
      `${STUDENTS.length + 1} users, ${SUBMISSIONS.length} submissions.`,
  );
  console.log(
    "Test PINs for open drives: AMZN-INT-25, AMZN-FT-25, MSFT-25, DLT-25",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
