export interface Institution {
  code: string;
  name: string;
  district: string;
  type: "Government" | "Aided" | "Private";
  state: "Telangana";
}

export const institutions: Institution[] = [
  {
    code: "GP-HYD",
    name: "Government Polytechnic, Hyderabad",
    district: "Hyderabad",
    type: "Government",
    state: "Telangana",
  },
  {
    code: "JNGP",
    name: "Jawaharlal Nehru Government Polytechnic, Ramanthapur",
    district: "Hyderabad",
    type: "Government",
    state: "Telangana",
  },
  {
    code: "GP-WGL",
    name: "Government Polytechnic, Warangal",
    district: "Warangal",
    type: "Government",
    state: "Telangana",
  },
  {
    code: "GP-NZB",
    name: "Government Polytechnic, Nizamabad",
    district: "Nizamabad",
    type: "Government",
    state: "Telangana",
  },
  {
    code: "GP-MBNR",
    name: "Government Polytechnic, Mahabubnagar",
    district: "Mahabubnagar",
    type: "Government",
    state: "Telangana",
  },
];
