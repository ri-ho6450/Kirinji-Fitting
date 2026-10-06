import type { School } from "../domain/types";
export const schools: School[] = [
  "防府高等学校",
  "防府商工高等学校",
  "防府西高等学校",
  "誠英高等学校",
  "高川学園高等学校",
  "山口農業高等学校",
].map((name, i) => ({ id: `school-${i + 1}`, name }));
