export type CurriculumSubject = {
  code: string;
  name: string;
  semester: number;
  branch: string;
  scheme: string;
  elective?: boolean;
};

const entries: [number, string, string, boolean?][] = [
  [1, "HU-101", "Basic English"],
  [1, "SC-102", "Basic Engineering Mathematics"],
  [1, "SC-103", "Basic Physics"],
  [1, "SC-104", "General Engineering Chemistry"],
  [1, "CS-105", "Computer Fundamentals & Hardware"],
  [1, "CS-106", "Basic Electrical and Electronics Engineering"],

  [2, "HU-201", "Advanced English"],
  [2, "SC-202", "Engineering Mathematics"],
  [2, "SC-203", "Applied Physics"],
  [2, "SC-204", "Applied Engineering Chemistry"],
  [2, "CS-205", "Programming in C"],
  [2, "CS-206", "Web Technologies"],

  [3, "SC-301", "Applied Engineering Mathematics"],
  [3, "EC-302", "Digital Electronics"],
  [3, "CS-303", "Data Structures Through C"],
  [3, "CS-304", "OOPS Through C++"],
  [3, "CS-305", "Computer Organization and Architecture"],
  [3, "CS-306", "Computer Networks"],

  [4, "SC-401", "Advanced Engineering Mathematics"],
  [4, "CS-402", "Java Programming"],
  [4, "CS-403", "Python Programming"],
  [4, "CS-404", "Relational Database Management Systems"],
  [4, "CS-405", "Cryptography & Network Security"],
  [4, "CS-406", "Operating Systems"],

  [5, "EC-501", "Entrepreneurship & Startups"],
  [5, "CS-502", ".NET Programming Through C#"],
  [5, "CS-503", "Mobile Application Development"],
  [5, "CS-504", "Software Engineering"],
  [5, "CS-505A", "Internet of Things", true],
  [5, "CS-505B", "Cloud Computing and Big Data", true],
  [5, "CS-506A", "Artificial Intelligence", true],
  [5, "CS-506B", "Machine Learning", true],
];

export const CSE_SUBJECTS: CurriculumSubject[] = entries.map(
  ([semester, code, name, elective]) => ({
    semester,
    code,
    name,
    branch: "CSE",
    scheme: "C24",
    elective: elective ?? false,
  })
);

export function getBranchSubjects(branch: string) {
  const normalized = branch.trim().toUpperCase();

  if (normalized === "CSE") {
    return CSE_SUBJECTS;
  }

  return [];
}

export function getSubject(code: string) {
  return CSE_SUBJECTS.find((subject) => subject.code === code);
}
