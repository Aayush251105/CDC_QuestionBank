import { describe, expect, it } from "vitest";
import {
  type CompanyListItem,
  filterCompanies,
  parseCompanyFilters,
} from "./companies";
import { fullDate, monthYear } from "./labels";

const c = (
  name: string,
  sector: string,
  years: number[],
  questions: number,
  last: string,
  aliases: string[] = [],
): CompanyListItem => ({
  id: name,
  name,
  slug: name.toLowerCase(),
  sector,
  aliases,
  years,
  lastDrive: new Date(last),
  drives: years.length,
  questions,
});

const list = [
  c("TCS", "Software", [2025], 4, "2025-10-04", ["Tata Consultancy Services"]),
  c("Amazon", "Software", [2025, 2024], 3, "2025-09-02"),
  c("Goldman Sachs", "Finance", [2025, 2024], 3, "2025-08-05"),
  c("Deloitte", "Consulting", [2025], 2, "2025-07-30"),
];
const names = (rows: CompanyListItem[]) => rows.map((r) => r.name);

describe("filterCompanies", () => {
  it("sorts A to Z by default", () => {
    expect(names(filterCompanies(list, {}))).toEqual([
      "Amazon",
      "Deloitte",
      "Goldman Sachs",
      "TCS",
    ]);
  });

  it("finds by name or alias, ignoring case", () => {
    expect(names(filterCompanies(list, { q: "gold" }))).toEqual([
      "Goldman Sachs",
    ]);
    expect(names(filterCompanies(list, { q: "tata" }))).toEqual(["TCS"]);
  });

  it("filters by sector and year", () => {
    expect(names(filterCompanies(list, { sector: "Software" }))).toEqual([
      "Amazon",
      "TCS",
    ]);
    expect(names(filterCompanies(list, { year: 2024 }))).toEqual([
      "Amazon",
      "Goldman Sachs",
    ]);
  });

  it("sorts by questions and by latest drive", () => {
    expect(names(filterCompanies(list, { sort: "questions" }))).toEqual([
      "TCS",
      "Amazon",
      "Goldman Sachs",
      "Deloitte",
    ]);
    expect(names(filterCompanies(list, { sort: "latest" }))[0]).toBe("TCS");
  });
});

describe("parseCompanyFilters", () => {
  it("reads the URL and ignores junk", () => {
    expect(
      parseCompanyFilters({ q: " ama ", year: "2025", sort: "questions" }),
    ).toEqual({
      q: "ama",
      sector: undefined,
      year: 2025,
      sort: "questions",
    });
    expect(
      parseCompanyFilters({ year: "abc", sort: "drop table" }),
    ).toMatchObject({
      year: undefined,
      sort: "az",
    });
  });
});

describe("dates", () => {
  it("formats like the design", () => {
    expect(fullDate(new Date("2025-08-14T00:00:00Z"))).toBe("14 Aug 2025");
    expect(monthYear(new Date("2025-09-12T00:00:00Z"))).toBe("Sep 2025");
    expect(monthYear(null)).toBe("–");
  });
});
