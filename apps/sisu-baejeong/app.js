const DAYS = ["월", "화", "수", "목", "금"];
const DAY_NAMES = { 월: "월요일", 화: "화요일", 수: "수요일", 목: "목요일", 금: "금요일" };
const PERIODS = Array.from({ length: 14 }, (_, index) => index + 1);
const STORAGE_KEY = "sisu-timetable-state-v2";
const TARGET_DEPARTMENT_NAMES = new Set(["전자공학과", "반도체공학과", "시스템반도체학과"]);
const EXTERNAL_COURSE_NAMES = new Set(["수학1", "물리학및실험1", "화학및실험1"]);
const EXTERNAL_PROFESSOR_IDS = new Set(["P_MATH", "P_PHY", "P_PHY2", "P_CHEM", "P_CHEM2"]);
const FIRST_SEMESTER_SEED_IDS = new Set([
  "EE101",
  "EE102",
  "EE103",
  "EE104",
  "EE105",
  "EE201",
  "EE202",
  "EE203",
  "EE204",
  "EE205",
  "EE301",
  "EE302",
  "EE303",
  "EE304",
  "EE305",
  "EE306",
  "EE401",
  "EE402",
  "EE403",
  "EE404",
  "SC101",
  "SC201",
  "SC301",
  "SC401",
  "SYS101",
  "SYS201",
  "SYS301"
]);

const defaultData = {
  semester: "26-2학기",
  activeTab: "courses",
  selectedAssignmentId: "",
  constraints: {
    facultyRatioTarget: 65,
    maxSameCourseSections: 2,
    enforceRotc: true,
    enforceSplitTheory: true
  },
  courses: [
    {
      id: "CS101",
      name: "프로그래밍기초",
      year: 1,
      category: "전공필수",
      type: "computer",
      credits: 3,
      pattern: [2, 1],
      expectedStudents: 96,
      maxSeats: 40,
      tolerance: 3,
      roomType: "computer",
      eligible: ["P01", "P03", "P06"],
      fixed: "",
      enabled: true
    },
    {
      id: "CS204",
      name: "자료구조",
      year: 2,
      category: "전공필수",
      type: "theory",
      credits: 3,
      pattern: [2, 1],
      expectedStudents: 124,
      maxSeats: 60,
      tolerance: 10,
      roomType: "lecture",
      eligible: ["P01", "P02", "P03"],
      fixed: "",
      enabled: true
    },
    {
      id: "CS220",
      name: "웹프로그래밍실습",
      year: 2,
      category: "전공선택",
      type: "lab",
      credits: 3,
      pattern: [3],
      expectedStudents: 78,
      maxSeats: 35,
      tolerance: 3,
      roomType: "lab",
      eligible: ["P03", "P05", "P06"],
      fixed: "",
      enabled: true
    },
    {
      id: "CS310",
      name: "운영체제",
      year: 3,
      category: "전공필수",
      type: "theory",
      credits: 3,
      pattern: [2, 1],
      expectedStudents: 72,
      maxSeats: 60,
      tolerance: 10,
      roomType: "lecture",
      eligible: ["P02", "P04", "P07"],
      fixed: "",
      enabled: true
    },
    {
      id: "CS330",
      name: "데이터베이스",
      year: 3,
      category: "전공선택",
      type: "theory",
      credits: 3,
      pattern: [2, 1],
      expectedStudents: 88,
      maxSeats: 60,
      tolerance: 10,
      roomType: "lecture",
      eligible: ["P01", "P04", "P05"],
      fixed: "",
      enabled: true
    },
    {
      id: "CS350",
      name: "인공지능",
      year: 3,
      category: "전공필수",
      type: "theory",
      credits: 3,
      pattern: [2, 1],
      expectedStudents: 110,
      maxSeats: 60,
      tolerance: 10,
      roomType: "lecture",
      eligible: ["P02", "P03", "P07"],
      fixed: "",
      enabled: true
    },
    {
      id: "CS401",
      name: "P-실무프로젝트(AI)",
      year: 4,
      category: "전공필수",
      type: "project",
      credits: 3,
      pattern: [3],
      expectedStudents: 64,
      maxSeats: 30,
      tolerance: 0,
      roomType: "lab",
      eligible: ["P01", "P02", "P04"],
      fixed: "",
      enabled: true
    },
    {
      id: "CS301",
      name: "취창업 진로세미나",
      year: 3,
      category: "전공필수",
      type: "seminar",
      credits: 1,
      pattern: [1],
      expectedStudents: 98,
      maxSeats: 60,
      tolerance: 10,
      roomType: "lecture",
      eligible: ["P01", "P02", "P04"],
      fixed: "월10",
      enabled: true
    }
  ],
  professors: [
    {
      id: "P01",
      name: "김도현",
      type: "전임",
      minCredits: 9,
      maxCredits: 18,
      availability: "월1-8,화1-8,수3-10,목1-8",
      canTeach: ["CS101", "CS204", "CS330", "CS401", "CS301"]
    },
    {
      id: "P02",
      name: "이서연",
      type: "전임",
      minCredits: 9,
      maxCredits: 18,
      availability: "월3-10,화1-6,수1-8,목1-10,금1-4",
      canTeach: ["CS204", "CS310", "CS350", "CS401", "CS301"]
    },
    {
      id: "P03",
      name: "박민수",
      type: "신임전임",
      minCredits: 6,
      maxCredits: 18,
      availability: "월1-6,화3-10,수1-8,목5-10,금1-6",
      canTeach: ["CS101", "CS204", "CS220", "CS350"]
    },
    {
      id: "P04",
      name: "정하늘",
      type: "전임",
      minCredits: 9,
      maxCredits: 18,
      availability: "월1-10,수1-10,목1-6,금1-8",
      canTeach: ["CS310", "CS330", "CS401", "CS301"]
    },
    {
      id: "P05",
      name: "최유진",
      type: "겸임",
      minCredits: 0,
      maxCredits: 9,
      availability: "화5-10,목5-10,금3-8",
      canTeach: ["CS220", "CS330"]
    },
    {
      id: "P06",
      name: "오세훈",
      type: "강사",
      minCredits: 0,
      maxCredits: 4.9,
      availability: "월5-10,수5-10,금5-10",
      canTeach: ["CS101", "CS220"]
    },
    {
      id: "P07",
      name: "한가람",
      type: "초빙",
      minCredits: 0,
      maxCredits: 9,
      availability: "화1-6,수1-6,목1-6",
      canTeach: ["CS310", "CS350"]
    }
  ],
  rooms: [
    { id: "R101", name: "A101 강의실", type: "lecture", capacity: 70 },
    { id: "R102", name: "A102 강의실", type: "lecture", capacity: 60 },
    { id: "R201", name: "A201 대형강의실", type: "lecture", capacity: 120 },
    { id: "L101", name: "B101 실험실", type: "lab", capacity: 36 },
    { id: "L102", name: "B102 실험실", type: "lab", capacity: 40 },
    { id: "C301", name: "C301 전산실습실", type: "computer", capacity: 42 },
    { id: "C302", name: "C302 전산실습실", type: "computer", capacity: 38 }
  ],
  schedule: [],
  lastRun: null
};

defaultData.selectedDepartment = "전자공학과";
defaultData.viewMode = "yearMatrix";
defaultData.departments = [
  { id: "전자공학과", college: "반도체대학", quotas: { 1: 120, 2: 120, 3: 110, 4: 100 } },
  { id: "반도체공학과", college: "반도체대학", quotas: { 1: 80, 2: 80, 3: 70, 4: 60 } },
  { id: "시스템반도체학과", college: "반도체대학", quotas: { 1: 60, 2: 55, 3: 50, 4: 45 } }
];

defaultData.courses = [
  { id: "EE112", department: "전자공학과", term: 2, name: "기초공학설계", year: 1, curriculumYear: 2026, category: "전공필수", type: "project", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 40, tolerance: 3, roomType: "lab", eligible: ["P_KMJ", "P_KJW", "P_HHS", "P_JGH"], fixed: "", enabled: true },
  { id: "EE212", department: "전자공학과", term: 2, name: "기초회로실험2", year: 2, curriculumYear: 2025, category: "전공선택", type: "lab", credits: 2, pattern: [2], expectedStudents: 0, maxSeats: 30, tolerance: 3, roomType: "lab", eligible: ["P_LTB", "P_LWJ", "P_SMK", "P_PJS"], fixed: "", enabled: true },
  { id: "EE213", department: "전자공학과", term: 2, name: "공업수학2", year: 2, curriculumYear: 2025, category: "전공선택", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_SHM", "P_NSS", "P_HHS"], fixed: "", enabled: true },
  { id: "EE214", department: "전자공학과", term: 2, name: "회로이론2", year: 2, curriculumYear: 2025, category: "전공선택", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_LTB", "P_LWJ", "P_SMK", "P_PJS"], fixed: "", enabled: true },
  { id: "EE215", department: "전자공학과", term: 2, name: "전자기학2", year: 2, curriculumYear: 2025, category: "전공선택", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_CSB", "P_CHJ"], fixed: "", enabled: true },
  { id: "EE216", department: "전자공학과", term: 2, name: "신호및시스템", year: 2, curriculumYear: 2025, category: "전공선택", type: "theory", credits: 2, pattern: [2], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_MKS", "P_NSS", "P_SHM"], fixed: "", enabled: true },
  { id: "EE312", department: "전자공학과", term: 2, name: "전자회로2", year: 3, curriculumYear: 2024, category: "전공선택", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_KYJ", "P_SMK", "P_CHJ"], fixed: "", enabled: true },
  { id: "EE313", department: "전자공학과", term: 2, name: "마이크로프로세서", year: 3, curriculumYear: 2024, category: "전공선택", type: "computer", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 40, tolerance: 3, roomType: "computer", eligible: ["P_JJP", "P_KYJ", "P_MKS"], fixed: "", enabled: true },
  { id: "EE314", department: "전자공학과", term: 2, name: "전자회로실험", year: 3, curriculumYear: 2024, category: "전공필수", type: "lab", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 30, tolerance: 3, roomType: "lab", eligible: ["P_KYJ", "P_HHS", "P_KJW", "P_JJP"], fixed: "", enabled: true },
  { id: "EE315", department: "전자공학과", term: 2, name: "P-실무프로젝트", year: 3, curriculumYear: 2024, category: "전공필수", type: "project", weekType: "pPractice4", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 30, tolerance: 0, roomType: "lab", eligible: ["P_PJC", "P_JJP", "P_KJW", "P_HHS", "P_SHM"], fixed: "", enabled: true },
  { id: "EE412", department: "전자공학과", term: 2, name: "캡스톤디자인2", year: 4, curriculumYear: 2023, category: "전공필수", type: "project", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 30, tolerance: 0, roomType: "lab", eligible: ["P_PJC", "P_JJP", "P_KJW", "P_HHS", "P_SHM"], fixed: "", enabled: true },
  { id: "EE413", department: "전자공학과", term: 2, name: "이동통신시스템", year: 4, curriculumYear: 2023, category: "전공선택", type: "theory", credits: 2, pattern: [2], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_NSS", "P_MKS"], fixed: "", enabled: true },
  { id: "EE414", department: "전자공학과", term: 2, name: "임베디드시스템", year: 4, curriculumYear: 2023, category: "전공선택", type: "computer", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 40, tolerance: 3, roomType: "computer", eligible: ["P_JGH", "P_KYJ", "P_MKS"], fixed: "", enabled: true },
  { id: "SC112", department: "반도체공학과", term: 2, name: "기초공학설계", year: 1, curriculumYear: 2026, category: "전공필수", type: "project", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 40, tolerance: 3, roomType: "lab", eligible: ["P_PJC", "P_SMK"], fixed: "", enabled: true },
  { id: "SC212", department: "반도체공학과", term: 2, name: "기초회로실험", year: 2, curriculumYear: 2025, category: "전공필수", type: "lab", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 30, tolerance: 3, roomType: "lab", eligible: ["P_LTB", "P_SMK"], fixed: "", enabled: true },
  { id: "SC213", department: "반도체공학과", term: 2, name: "회로이론2", year: 2, curriculumYear: 2025, category: "전공필수", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_LTB", "P_SMK"], fixed: "", enabled: true },
  { id: "SC214", department: "반도체공학과", term: 2, name: "전자기학2", year: 2, curriculumYear: 2025, category: "전공필수", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_CSB", "P_CHJ"], fixed: "", enabled: true },
  { id: "SC215", department: "반도체공학과", term: 2, name: "반도체물성", year: 2, curriculumYear: 2025, category: "전공필수", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_PJC", "P_CES"], fixed: "", enabled: true },
  { id: "SC216", department: "반도체공학과", term: 2, name: "신호및시스템", year: 2, curriculumYear: 2025, category: "전공필수", type: "theory", credits: 2, pattern: [2], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_NSS", "P_SHM"], fixed: "", enabled: true },
  { id: "SC312", department: "반도체공학과", term: 2, name: "진공공정실험", year: 3, curriculumYear: 2024, category: "전공선택", type: "lab", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 30, tolerance: 3, roomType: "lab", eligible: ["P_SMK", "P_CES"], fixed: "", enabled: true },
  { id: "SC313", department: "반도체공학과", term: 2, name: "전자회로실험", year: 3, curriculumYear: 2024, category: "전공선택", type: "lab", credits: 2, pattern: [2], expectedStudents: 0, maxSeats: 30, tolerance: 3, roomType: "lab", eligible: ["P_KYJ", "P_SMK"], fixed: "", enabled: true },
  { id: "SC314", department: "반도체공학과", term: 2, name: "이온도핑확산공정", year: 3, curriculumYear: 2024, category: "전공선택", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_PJC", "P_SMK"], fixed: "", enabled: true },
  { id: "SC315", department: "반도체공학과", term: 2, name: "패터닝및에칭공정", year: 3, curriculumYear: 2024, category: "전공선택", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_CES", "P_SMK"], fixed: "", enabled: true },
  { id: "SC316", department: "반도체공학과", term: 2, name: "반도체메모리소자", year: 3, curriculumYear: 2024, category: "전공선택", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_PJC", "P_CES"], fixed: "", enabled: true },
  { id: "SC317", department: "반도체공학과", term: 2, name: "광전자공학", year: 3, curriculumYear: 2024, category: "전공선택", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_CES", "P_KSJ"], fixed: "", enabled: true },
  { id: "SC412", department: "반도체공학과", term: 2, name: "P-프로젝트2", year: 4, curriculumYear: 2023, category: "전공필수", type: "project", weekType: "pPractice4", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 30, tolerance: 0, roomType: "lab", eligible: ["P_PJC", "P_SMK"], fixed: "", enabled: true },
  { id: "SC413", department: "반도체공학과", term: 2, name: "MEMS및나노공정", year: 4, curriculumYear: 2023, category: "전공선택", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_PJC", "P_CES"], fixed: "", enabled: true },
  { id: "SC414", department: "반도체공학과", term: 2, name: "반도체공학전산모사", year: 4, curriculumYear: 2023, category: "전공선택", type: "computer", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 40, tolerance: 3, roomType: "computer", eligible: ["P_CES", "P_SMK"], fixed: "", enabled: true },
  { id: "SC415", department: "반도체공학과", term: 2, name: "소자시뮬레이션실험", year: 4, curriculumYear: 2023, category: "전공선택", type: "lab", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 30, tolerance: 3, roomType: "lab", eligible: ["P_PJC", "P_SMK"], fixed: "", enabled: true },
  { id: "SYS312", department: "시스템반도체학과", term: 2, name: "시스템프로그래밍", year: 3, curriculumYear: 2024, category: "전공필수", type: "computer", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 40, tolerance: 3, roomType: "computer", eligible: ["P_JGH", "P_MKS"], fixed: "", enabled: true },
  { id: "SYS313", department: "시스템반도체학과", term: 2, name: "컴퓨터구조", year: 3, curriculumYear: 2024, category: "전공필수", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_MKS", "P_JGH"], fixed: "", enabled: true },
  { id: "SYS314", department: "시스템반도체학과", term: 2, name: "전자회로2", year: 3, curriculumYear: 2024, category: "전공필수", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_KYJ", "P_SMK"], fixed: "", enabled: true },
  { id: "SYS315", department: "시스템반도체학과", term: 2, name: "기계학습", year: 3, curriculumYear: 2024, category: "전공필수", type: "theory", credits: 3, pattern: [2, 1], expectedStudents: 0, maxSeats: 60, tolerance: 10, roomType: "lecture", eligible: ["P_MKS"], fixed: "", enabled: true },
  { id: "SYS316", department: "시스템반도체학과", term: 2, name: "P-프로젝트1", year: 3, curriculumYear: 2024, category: "전공필수", type: "project", weekType: "pPractice4", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 30, tolerance: 0, roomType: "lab", eligible: ["P_JJP", "P_KJW", "P_MKS"], fixed: "", enabled: true },
  { id: "SYS412", department: "시스템반도체학과", term: 2, name: "AI SoC설계", year: 4, curriculumYear: 2023, category: "전공필수", type: "computer", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 40, tolerance: 3, roomType: "computer", eligible: ["P_MKS", "P_KYJ"], fixed: "", enabled: true },
  { id: "SYS413", department: "시스템반도체학과", term: 2, name: "디지털집적회로설계2", year: 4, curriculumYear: 2023, category: "전공필수", type: "computer", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 40, tolerance: 3, roomType: "computer", eligible: ["P_JJP", "P_KYJ"], fixed: "", enabled: true },
  { id: "SYS414", department: "시스템반도체학과", term: 2, name: "아날로그집적회로설계2", year: 4, curriculumYear: 2023, category: "전공필수", type: "computer", credits: 3, pattern: [3], expectedStudents: 0, maxSeats: 40, tolerance: 3, roomType: "computer", eligible: ["P_SMK", "P_CES"], fixed: "", enabled: true },
  { id: "SYS415", department: "시스템반도체학과", term: 2, name: "P-프로젝트3", year: 4, curriculumYear: 2023, category: "전공필수", type: "project", weekType: "pPractice4", credits: 6, pattern: [3, 3], expectedStudents: 0, maxSeats: 30, tolerance: 0, roomType: "lab", eligible: ["P_JJP", "P_MKS"], fixed: "", enabled: true }
];

defaultData.professors = [
  { id: "P_KMJ", name: "김미진", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,화1-10,수1-8,목1-8,금1-8", canTeach: ["EE112"] },
  { id: "P_SHM", name: "손혁민", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,수1-6,목1-10,금1-6", canTeach: ["EE213", "EE216", "EE315", "EE412", "SC216"] },
  { id: "P_NSS", name: "남성식", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,화1-10,수1-10,금1-8", canTeach: ["EE213", "EE216", "EE413", "SC216"] },
  { id: "P_JJP", name: "정재필", type: "전임", minCredits: 9, maxCredits: 18, availability: "월5-10,화5-10,목5-10", canTeach: ["EE313", "EE314", "EE315", "EE412", "SYS316", "SYS413"] },
  { id: "P_KJW", name: "김장원", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,화1-10,수1-10,목1-10", canTeach: ["EE112", "EE314", "EE315", "EE412", "SYS316"] },
  { id: "P_CHJ", name: "최호종", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-8,화1-8,수1-8,금1-8", canTeach: ["EE215", "EE312", "SC214"] },
  { id: "P_MKS", name: "민경식", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,화1-10,수1-10,목1-10", canTeach: ["EE216", "EE313", "EE414", "SYS312", "SYS313", "SYS315", "SYS412", "SYS415"] },
  { id: "P_KYJ", name: "김영준", type: "전임", minCredits: 9, maxCredits: 18, availability: "월2-10,화1-10,수1-10,금1-10", canTeach: ["EE312", "EE313", "EE314", "EE414", "SC313", "SYS314", "SYS412", "SYS413"] },
  { id: "P_HHS", name: "한형석", type: "전임", minCredits: 9, maxCredits: 18, availability: "화1-10,수1-10,목1-10,금1-10", canTeach: ["EE112", "EE212", "EE213", "EE314", "EE315", "EE412"] },
  { id: "P_CES", name: "조의식", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-8,화1-8,수1-8,금1-8", canTeach: ["SC215", "SC312", "SC315", "SC316", "SC317", "SC413", "SC414", "SYS414"] },
  { id: "P_KSJ", name: "권상직", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,수1-10,목1-10,금1-10", canTeach: ["SC317"] },
  { id: "P_LTB", name: "이태봉", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,목1-10,금1-10", canTeach: ["EE212", "EE214", "SC212", "SC213"] },
  { id: "P_PJC", name: "박정철", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,목1-10,금1-10", canTeach: ["EE315", "EE412", "SC112", "SC215", "SC316", "SC412", "SC413", "SC415"] },
  { id: "P_LWJ", name: "이원재", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,화1-10,수1-10,목1-10,금1-10", canTeach: ["EE212", "EE214"] },
  { id: "P_SMK", name: "상민규", type: "전임", minCredits: 9, maxCredits: 18, availability: "화4-10,수4-10,목4-10,금4-10", canTeach: ["EE212", "EE214", "EE312", "SC112", "SC212", "SC213", "SC215", "SC312", "SC314", "SC315", "SC412", "SC414", "SC415", "SYS314", "SYS414"] },
  { id: "P_CSB", name: "조성보", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,화1-10,수1-10,목1-10", canTeach: ["EE215", "SC214"] },
  { id: "P_PJS", name: "박진성", type: "강사", minCredits: 0, maxCredits: 4.9, availability: "화1-10,목1-10", canTeach: ["EE212", "EE214"] },
  { id: "P_JGH", name: "전광호", type: "전임", minCredits: 9, maxCredits: 18, availability: "월1-10,화1-10,수1-10,목1-6,금1-6", canTeach: ["EE112", "EE414", "SYS312", "SYS313"] },
  { id: "P_KDS", name: "강동수", type: "강사", minCredits: 0, maxCredits: 4.9, availability: "화5-10,목5-10,금5-10", canTeach: ["EE112"] }
];

defaultData.rooms = [
  { id: "R410", name: "410호", type: "lecture", capacity: 60 },
  { id: "R504", name: "504호", type: "lecture", capacity: 60 },
  { id: "R505", name: "505호", type: "lecture", capacity: 60 },
  { id: "R306", name: "306호", type: "lecture", capacity: 70 },
  { id: "R233", name: "반도체233호", type: "lecture", capacity: 120 },
  { id: "L715", name: "715호", type: "lab", capacity: 30 },
  { id: "L716", name: "716호", type: "lab", capacity: 30 },
  { id: "L717", name: "717호", type: "lab", capacity: 30 },
  { id: "L714A", name: "714A호", type: "lab", capacity: 30 },
  { id: "L602", name: "반도체602호", type: "lab", capacity: 30 },
  { id: "C715", name: "715호 전산실", type: "computer", capacity: 40 },
  { id: "C716", name: "716호 전산실", type: "computer", capacity: 40 }
];

const REFERENCE_TIMETABLES = [
  {
    id: "ee-2026-1",
    department: "전자공학과",
    semester: "2026 1학기",
    source: "26-1학기 시간표-0122.xlsx",
    rows: [
      {
        day: "월",
        year: "1",
        cells: [
          { period: 1, span: 4, text: "C프로그래밍 [1. 김미진 715]" },
          { period: 5, span: 2, text: "College English(교필)" },
          { period: 10, span: 1, text: "가천인세미나" }
        ]
      },
      {
        day: "월",
        year: "2",
        cells: [
          { period: 1, span: 2, text: "디지털논리회로 [3. 정재필 504] [4. 김장원 505]" },
          { period: 3, span: 2, text: "공업수학 [1. 손혁민 505] [2. 남성식 504]" },
          { period: 5, span: 2, text: "AI 프로그래밍입문(교선)" },
          { period: 7, span: 2, text: "전자기학1 [3. 최호종 504]" },
          { period: 9, span: 1, text: "전자기학1 [2. 최호종 410]" }
        ]
      },
      { day: "월", year: "2", cells: [{ period: 6, span: 1, text: "505호 스마트보안" }] },
      {
        day: "월",
        year: "3",
        cells: [
          { period: 1, span: 2, text: "기계학습과 AI [1. 민경식 410]" },
          { period: 3, span: 2, text: "기계학습과 AI [2. 민경식 410]" },
          { period: 5, span: 3, text: "디지털회로실험 [1. 김영준 716]" }
        ]
      },
      { day: "월", year: "3", cells: [{ period: 5, span: 2, text: "전자회로1 [3. 최호종 504]" }] },
      {
        day: "월",
        year: "4",
        cells: [
          { period: 1, span: 3, text: "캡스톤디자인1 [1. 박정철 714A]" },
          { period: 4, span: 3, text: "캡스톤디자인1 [2. 정재필 717]" },
          { period: 7, span: 2, text: "전자디스플레이공학 [1. 조의식 410] [2. 권상직 505]" },
          { period: 9, span: 1, text: "디지털통신\n[1. 남성식 306]" }
        ]
      },
      {
        day: "화",
        year: "1",
        cells: [
          { period: 1, span: 4, text: "C프로그래밍 [2. 김미진 208]" },
          { period: 5, span: 4, text: "C프로그래밍 [3. 김미진 715] [4. 강동수 716]" }
        ]
      },
      {
        day: "화",
        year: "2",
        cells: [
          { period: 1, span: 2, text: "회로이론1 [1. 이태봉 505]" },
          { period: 4, span: 2, text: "물리전자공학 [2. 조의식 반도체233]" },
          { period: 6, span: 1, text: "디지털논리회로\n[3. 정재필 504]" },
          { period: 7, span: 2, text: "디지털논리회로 [1. 김장원 505] [2. 정재필 504]" }
        ]
      },
      {
        day: "화",
        year: "2",
        cells: [
          { period: 1, span: 2, text: "물리전자공학 [1. 박정철 504]" },
          { period: 6, span: 3, text: "디지털논리회로 [박진성 비전타워 305 (정원 50)]" }
        ]
      },
      {
        day: "화",
        year: "3",
        cells: [
          { period: 1, span: 3, text: "디지털회로실험 [2. 한형석 716] [3.  김장원 715]" },
          { period: 4, span: 1, text: "반도체공학 [1. 박정철 504] [2. 상민규 410]" },
          { period: 5, span: 1, text: "기계학습과 AI\n[1. 민경식 505]" },
          { period: 7, span: 1, text: "기계학습과 AI \n[2. 민경식 410]" }
        ]
      },
      {
        day: "화",
        year: "3",
        cells: [
          { period: 3, span: 1, text: "제어공학 [1. 이태봉 505]" },
          { period: 5, span: 2, text: "410호 스마트보안" }
        ]
      },
      {
        day: "화",
        year: "4",
        cells: [
          { period: 2, span: 1, text: "전자디스플레이공학\n[1. 조의식 410]" },
          { period: 4, span: 1, text: "306호 의공" },
          { period: 8, span: 2, text: "디지털통신 [1. 남성식 306]" }
        ]
      },
      {
        day: "수",
        year: "1",
        cells: [
          { period: 1, span: 3, text: "수학1(계교)" },
          { period: 5, span: 3, text: "수학1(계교)" }
        ]
      },
      {
        day: "수",
        year: "2",
        cells: [
          { period: 1, span: 1, text: "회로이론1 [1. 이태봉 505]" },
          { period: 3, span: 1, text: "전자기학1 \n[1. 조성보 반도체 233]" },
          { period: 4, span: 1, text: "물리전자공학 \n[2. 조의식 반도체233]" },
          { period: 5, span: 1, text: "회로이론1 [2. 이원재 505] \n[3. 상민규 410]" },
          { period: 6, span: 2, text: "전자기학1 [2. 최호종 410]" },
          { period: 8, span: 1, text: "전자기학1 [3. 최호종 410]" }
        ]
      },
      { day: "수", year: "2", cells: [{ period: 1, span: 1, text: "물리전자공학 \n[1. 박정철 504]" }] },
      { day: "수", year: "3", cells: [{ period: 2, span: 2, text: "제어공학 [1. 이태봉 505]" }] },
      {
        day: "수",
        year: "3",
        cells: [
          { period: 2, span: 2, text: "반도체공학 [1. 박정철 504]" },
          { period: 5, span: 1, text: "통신이론 [3. 민경식 504]" },
          { period: 6, span: 2, text: "전자회로1 [1. 김영준 505] [2. 상민규 504]" },
          { period: 8, span: 1, text: "통신이론 [2. 손혁민 504]" },
          { period: 9, span: 1, text: "전자회로1 [3. 최호종 410]" }
        ]
      },
      { day: "수", year: "3", cells: [{ period: 8, span: 2, text: "통신이론 [1. 남성식 505]" }] },
      { day: "수", year: "4", cells: [{ period: 6, span: 3, text: "전자공학심화실험 [4. 민경식 716]" }] },
      {
        day: "수",
        year: "4",
        cells: [
          { period: 1, span: 3, text: "전자공학심화실험 [1. 김장원 715] [2. 한형석 716]" },
          { period: 4, span: 1, text: "디지털신호처리\n[1. 남성식 306]" },
          { period: 5, span: 3, text: "전자공학심화실험 [3. 조의식 반도체602]" }
        ]
      },
      {
        day: "목",
        year: "1",
        cells: [
          { period: 1, span: 4, text: "화학및실험1(계교)" },
          { period: 5, span: 4, text: "화학및실험1(계교)" }
        ]
      },
      {
        day: "목",
        year: "1",
        cells: [
          { period: 1, span: 4, text: "물리학및실험1(계교)" },
          { period: 5, span: 4, text: "물리학및실험1(계교)" }
        ]
      },
      {
        day: "목",
        year: "2",
        cells: [
          { period: 1, span: 2, text: "공업수학 [3. 한형석 505]" },
          { period: 3, span: 2, text: "전자기학1 [1. 조성보 반도체233]" },
          { period: 5, span: 1, text: "디지털논리회로[1. 김장원 505][2.정재필 504]" },
          { period: 6, span: 3, text: "회로이론1 [4. 박진성 410]" }
        ]
      },
      { day: "목", year: "2", cells: [{ period: 2, span: 1, text: "디지털논리회로\n[4. 김장원 504]" }] },
      {
        day: "목",
        year: "3",
        cells: [
          { period: 1, span: 3, text: "디지털회로실험 [4.716 김영준]" },
          { period: 6, span: 3, text: "디지털회로실험 [5. 정재필 715]" }
        ]
      },
      {
        day: "목",
        year: "3",
        cells: [
          { period: 1, span: 3, text: "제어공학 [3. 전광호 410]" },
          { period: 6, span: 2, text: "통신이론 [3. 민경식 504]" },
          { period: 8, span: 2, text: "반도체공학 [2. 상민규 510]" }
        ]
      },
      { day: "목", year: "4", cells: [{ period: 6, span: 1, text: "전자디스플레이공학\n[2. 권상직 505]" }] },
      {
        day: "목",
        year: "4",
        cells: [
          { period: 1, span: 3, text: "캡스톤디자인1 [5. 손혁민 306]" },
          { period: 6, span: 3, text: "캡스톤디자인1 [3. 김장원 717] [4. 한형석 716]" }
        ]
      },
      { day: "금", year: "1", cells: [{ period: 5, span: 4, text: "C프로그래밍 [5. 전광호 715]" }] },
      {
        day: "금",
        year: "2",
        cells: [
          { period: 1, span: 1, text: "공업수학 [3. 한형석 505]" },
          { period: 3, span: 1, text: "공업수학1 \n[2. 남성식504]" },
          { period: 4, span: 2, text: "회로이론1 [3. 상민규 504]" },
          { period: 6, span: 2, text: "회로이론1 [2. 이원재 505]" },
          { period: 9, span: 1, text: "공업수학\n[1. 손혁민 505]" }
        ]
      },
      {
        day: "금",
        year: "3",
        cells: [
          { period: 1, span: 3, text: "제어공학 [4. 전광호 410]" },
          { period: 5, span: 1, text: "전자회로1 [1. 김영준 505]" },
          { period: 6, span: 1, text: "전자회로1[2. 상민규 504]" },
          { period: 7, span: 2, text: "통신이론 [2. 손혁민 410]" }
        ]
      },
      { day: "금", year: "3", cells: [{ period: 8, span: 1, text: "통신이론 [1. 남성식 505]" }] },
      {
        day: "금",
        year: "4",
        cells: [
          { period: 2, span: 3, text: "전자공학심화실험 [6. 한형석 716]" },
          { period: 5, span: 2, text: "디지털신호처리[1. 남성식 306]" }
        ]
      }
    ]
  }
];

let state = loadState();

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  if (!state.schedule.length) {
    runOptimization({ iterations: 8, silent: true });
  }
  renderAll();
});

function cacheElements() {
  els.summary = document.querySelector("#summaryStrip");
  els.timetable = document.querySelector("#timetable");
  els.inspector = document.querySelector("#inspectorBody");
  els.dataBody = document.querySelector("#dataBody");
  els.dataHint = document.querySelector("#dataHint");
  els.department = document.querySelector("#departmentSelect");
  els.semester = document.querySelector("#semesterInput");
  els.constraintRotc = document.querySelector("#constraintRotc");
  els.constraintSplit = document.querySelector("#constraintSplit");
  els.ratioTarget = document.querySelector("#ratioTarget");
  els.sameCourseLimit = document.querySelector("#sameCourseLimit");
  els.quotaInputs = [1, 2, 3, 4].map((year) => document.querySelector(`#quotaYear${year}`));
  els.importFile = document.querySelector("#importFile");
}

function bindEvents() {
  document.querySelector("#optimizeButton").addEventListener("click", () => {
    window.setTimeout(() => runOptimization({ iterations: 12 }), 0);
  });
  document.querySelector("#validateButton").addEventListener("click", () => {
    const validation = validateSchedule(state.schedule);
    state.lastRun = { ...state.lastRun, validation };
    saveState();
    renderAll();
  });
  document.querySelector("#resetButton").addEventListener("click", () => {
    state = clone(defaultData);
    runOptimization({ iterations: 8, silent: true });
    saveState();
    renderAll();
  });
  document.querySelector("#importButton").addEventListener("click", () => els.importFile.click());
  document.querySelector("#exportButton").addEventListener("click", exportJson);
  document.querySelector("#csvButton").addEventListener("click", exportCsv);
  document.querySelector("#addCourseButton").addEventListener("click", addCourse);
  document.querySelector("#addProfessorButton").addEventListener("click", addProfessor);
  document.querySelector("#addRoomButton").addEventListener("click", addRoom);

  document.querySelectorAll(".data-tab").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
  document.querySelectorAll("[data-tab-jump]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tabJump));
  });

  els.semester.addEventListener("change", () => {
    state.semester = els.semester.value.trim() || "미지정 학기";
    state.schedule = [];
    runOptimization({ iterations: 8, silent: true });
    saveState();
    renderAll();
  });
  els.department.addEventListener("change", () => {
    state.selectedDepartment = els.department.value;
    state.schedule = [];
    runOptimization({ iterations: 8, silent: true });
    saveState();
    renderAll();
  });
  els.quotaInputs.forEach((input, index) => {
    input.addEventListener("change", () => {
      const department = getSelectedDepartment();
      department.quotas[index + 1] = Math.max(1, toNumber(input.value, department.quotas[index + 1] || 1));
      state.schedule = [];
      runOptimization({ iterations: 8, silent: true });
      saveState();
      renderAll();
    });
  });
  document.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.viewMode = button.dataset.viewMode;
      saveState();
      renderAll();
    });
  });
  els.constraintRotc.addEventListener("change", () => updateConstraint("enforceRotc", els.constraintRotc.checked));
  els.constraintSplit.addEventListener("change", () => updateConstraint("enforceSplitTheory", els.constraintSplit.checked));
  els.ratioTarget.addEventListener("change", () => updateConstraint("facultyRatioTarget", toNumber(els.ratioTarget.value, 65)));
  els.sameCourseLimit.addEventListener("change", () => updateConstraint("maxSameCourseSections", toNumber(els.sameCourseLimit.value, 2)));

  els.importFile.addEventListener("change", handleImport);

  els.timetable.addEventListener("click", (event) => {
    const item = event.target.closest("[data-assignment]");
    if (!item) return;
    state.selectedAssignmentId = item.dataset.assignment;
    saveState();
    renderAll();
  });

  els.dataBody.addEventListener("change", handleTableChange);
  els.dataBody.addEventListener("click", handleTableClick);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return normalizeState(clone(defaultData));
    const parsed = JSON.parse(saved);
    return normalizeState({ ...clone(defaultData), ...parsed });
  } catch {
    return normalizeState(clone(defaultData));
  }
}

function normalizeState(raw) {
  raw.constraints = { ...clone(defaultData.constraints), ...(raw.constraints || {}) };
  raw.departments = filterTargetDepartments(Array.isArray(raw.departments) ? raw.departments : clone(defaultData.departments));
  if (!raw.departments.length) raw.departments = clone(defaultData.departments);
  raw.selectedDepartment = raw.selectedDepartment || raw.departments[0]?.id || defaultData.selectedDepartment;
  if (!raw.departments.some((department) => department.id === raw.selectedDepartment)) {
    raw.selectedDepartment = raw.departments[0]?.id || defaultData.selectedDepartment;
  }
  raw.viewMode = raw.viewMode || "yearMatrix";
  raw.courses = filterTargetCourses(Array.isArray(raw.courses) ? raw.courses : clone(defaultData.courses));
  raw.professors = Array.isArray(raw.professors) ? raw.professors : clone(defaultData.professors);
  raw.rooms = Array.isArray(raw.rooms) ? raw.rooms : clone(defaultData.rooms);
  raw.schedule = Array.isArray(raw.schedule) ? raw.schedule : [];
  raw.activeTab = raw.activeTab || "courses";
  raw.semester = raw.semester || "미지정 학기";
  raw.courses = filterTargetCourses(raw.courses).filter((course) => !isExternalCourse(course));
  mergeDefaultTermCourses(raw);
  mergeDefaultTermProfessors(raw);
  raw.courses.forEach((course) => {
    course.pattern = parsePattern(course.pattern);
    course.eligible = parseList(course.eligible);
    course.enabled = course.enabled !== false;
    course.term = normalizeTerm(course.term, course);
    course.weekType = course.weekType || inferWeekType(course);
  });
  const courseIds = new Set(raw.courses.map((course) => course.id));
  raw.professors = raw.professors.filter((professor) => !EXTERNAL_PROFESSOR_IDS.has(professor.id));
  raw.professors.forEach((professor) => {
    professor.canTeach = parseList(professor.canTeach)
      .map((courseRef) => raw.courses.find((course) => course.id === courseRef || course.name === courseRef)?.id || courseRef)
      .filter((courseId, index, list) => courseIds.has(courseId) && list.indexOf(courseId) === index);
  });
  syncTeachingLinks(raw);
  raw.rooms.forEach((room) => {
    room.enabled = room.enabled !== false;
    room.capacity = toNumber(room.capacity, 0);
  });
  const selectedTerm = semesterTerm(raw.semester);
  raw.schedule = raw.schedule.filter((assignment) => {
    const course = raw.courses.find((item) => item.id === assignment.courseId);
    return course && courseMatchesTerm(course, selectedTerm);
  });
  return raw;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function filterTargetDepartments(departments) {
  return departments.filter((department) => TARGET_DEPARTMENT_NAMES.has(department.id));
}

function filterTargetCourses(courses) {
  return courses.filter((course) => !course.department || TARGET_DEPARTMENT_NAMES.has(course.department));
}

function mergeDefaultTermCourses(raw) {
  const selectedTerm = semesterTerm(raw.semester);
  if (!selectedTerm) return;
  const existingIds = new Set(raw.courses.map((course) => course.id));
  defaultData.courses
    .filter((course) => courseMatchesTerm(course, selectedTerm))
    .forEach((course) => {
      if (!existingIds.has(course.id)) {
        raw.courses.push(clone(course));
        existingIds.add(course.id);
      }
    });
}

function mergeDefaultTermProfessors(raw) {
  const selectedTerm = semesterTerm(raw.semester);
  const courseIds = new Set(raw.courses.filter((course) => courseMatchesTerm(course, selectedTerm)).map((course) => course.id));
  const existingById = new Map(raw.professors.map((professor) => [professor.id, professor]));
  defaultData.professors
    .filter((professor) => !EXTERNAL_PROFESSOR_IDS.has(professor.id))
    .forEach((professor) => {
      const defaultCanTeach = parseList(professor.canTeach).filter((courseId) => courseIds.has(courseId));
      if (!existingById.has(professor.id)) {
        raw.professors.push({ ...clone(professor), canTeach: defaultCanTeach });
        return;
      }
      const current = existingById.get(professor.id);
      const merged = [...parseList(current.canTeach), ...defaultCanTeach];
      current.canTeach = merged.filter((courseId, index) => merged.indexOf(courseId) === index);
    });
}

function syncTeachingLinks(data) {
  const courses = Array.isArray(data.courses) ? data.courses : [];
  const professors = Array.isArray(data.professors) ? data.professors : [];
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const courseByName = new Map(courses.map((course) => [String(course.name || "").trim(), course]).filter(([name]) => name));
  const professorById = new Map(professors.map((professor) => [professor.id, professor]));
  const professorByName = new Map(professors.map((professor) => [String(professor.name || "").trim(), professor]).filter(([name]) => name));
  const resolveCourseId = (value) => {
    const text = String(value || "").trim();
    return courseById.has(text) ? text : courseByName.get(text)?.id || "";
  };
  const resolveProfessorId = (value) => {
    const text = String(value || "").trim();
    return professorById.has(text) ? text : professorByName.get(text)?.id || "";
  };

  courses.forEach((course) => {
    course.eligible = uniqueList(parseList(course.eligible).map(resolveProfessorId).filter((professorId) => professorById.has(professorId)));
  });
  professors.forEach((professor) => {
    professor.canTeach = uniqueList(parseList(professor.canTeach).map(resolveCourseId).filter((courseId) => courseById.has(courseId)));
  });
  courses.forEach((course) => {
    course.eligible.forEach((professorId) => {
      const professor = professorById.get(professorId);
      if (professor && !professor.canTeach.includes(course.id)) professor.canTeach.push(course.id);
    });
  });
  professors.forEach((professor) => {
    professor.canTeach.forEach((courseId) => {
      const course = courseById.get(courseId);
      if (course && !course.eligible.includes(professor.id)) course.eligible.push(professor.id);
    });
  });
}

function isExternalCourse(course) {
  return EXTERNAL_COURSE_NAMES.has(String(course?.name || "").trim());
}

function normalizeTerm(value, course) {
  const explicit = Number(value);
  if (explicit === 1 || explicit === 2) return explicit;
  return inferCourseTerm(course);
}

function inferCourseTerm(course) {
  if (FIRST_SEMESTER_SEED_IDS.has(course?.id)) return 1;
  const name = String(course?.name || "");
  if (/(공업수학|회로이론|전자기학|전자회로|캡스톤디자인|College English|수학|물리학및실험|화학및실험)1$/.test(name)) return 1;
  if (/(공업수학|회로이론|전자기학|전자회로|캡스톤디자인|College English|수학|물리학및실험|화학및실험)2$/.test(name)) return 2;
  return 2;
}

function semesterTerm(text) {
  const value = String(text || "");
  const match = value.match(/([12])\s*학기/) || value.match(/-([12])/) || value.match(/\b([12])\b/);
  return match ? Number(match[1]) : 0;
}

function courseMatchesTerm(course, term) {
  if (!term) return true;
  return normalizeTerm(course?.term, course) === term;
}

function updateConstraint(key, value) {
  state.constraints[key] = value;
  saveState();
  renderAll();
}

function setActiveTab(tab) {
  state.activeTab = tab;
  saveState();
  renderAll();
  document.querySelector(".data-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderAll() {
  renderDepartmentControls();
  els.semester.value = state.semester;
  els.constraintRotc.checked = Boolean(state.constraints.enforceRotc);
  els.constraintSplit.checked = Boolean(state.constraints.enforceSplitTheory);
  els.ratioTarget.value = state.constraints.facultyRatioTarget;
  els.sameCourseLimit.value = state.constraints.maxSameCourseSections;
  const department = getSelectedDepartment();
  els.quotaInputs.forEach((input, index) => {
    input.value = department.quotas[index + 1] || "";
  });
  document.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.viewMode === state.viewMode);
  });
  document.querySelectorAll(".data-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });
  document.querySelectorAll("[data-tab-jump]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tabJump === state.activeTab);
  });
  document.querySelector("#addCourseButton").hidden = state.activeTab !== "courses";
  document.querySelector("#addProfessorButton").hidden = state.activeTab !== "professors";
  document.querySelector("#addRoomButton").hidden = state.activeTab !== "rooms";

  const validation = validateSchedule(state.schedule);
  state.lastRun = { ...(state.lastRun || {}), validation };
  renderSummary(validation);
  renderTimetable(validation);
  renderInspector(validation);
  renderDataPanel(validation);
}

function renderDepartmentControls() {
  const options = state.departments
    .map((department) => `<option value="${escapeAttr(department.id)}" ${department.id === state.selectedDepartment ? "selected" : ""}>${escapeHtml(department.id)}</option>`)
    .join("");
  els.department.innerHTML = options;
}

function renderSummary(validation) {
  const sections = buildSections();
  const assigned = state.schedule.filter((item) => item.status === "assigned").length;
  const facultyRatio = validation.metrics.facultyRatio;
  const hard = validation.violations.filter((item) => item.level === "hard").length;
  const warn = validation.violations.filter((item) => item.level === "warn").length;
  const roomsUsed = new Set(state.schedule.filter((item) => item.roomId).map((item) => item.roomId)).size;
  const usableRooms = activeRooms().length;
  const minMet = validation.metrics.professorLoads.filter((item) => item.load >= item.min || !isFacultyType(item.type)).length;

  els.summary.innerHTML = [
    summaryCard("분반 배정", `${assigned}/${sections.length}`, "계산된 개설 분반"),
    summaryCard("충돌", String(hard), warn ? `주의 ${warn}건` : "주의 없음"),
    summaryCard("전임 담당", `${Math.round(facultyRatio)}%`, `목표 ${state.constraints.facultyRatioTarget}%`),
    summaryCard("교수 시수", `${minMet}/${validation.metrics.professorLoads.length}`, "최소 시수 충족"),
    summaryCard("강의실", `${roomsUsed}/${usableRooms}`, "사용 가능 강의실")
  ].join("");
}

function summaryCard(label, value, caption) {
  return `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(caption)}</small></article>`;
}

function renderTimetable(validation) {
  if (state.viewMode === "yearMatrix") {
    renderYearMatrix(validation);
    return;
  }
  renderWeekGrid(validation);
}

function renderWeekGrid(validation) {
  els.timetable.className = "timetable";
  const assignmentLevels = mapAssignmentLevels(validation.violations);
  const dayColumns = DAYS.map((day) => {
    const cells = PERIODS.map((period) => {
      const blocked = isRotcBlocked({ year: 3 }, { day, start: period, duration: 1 }) ? " blocked" : "";
      return `<div class="slot-cell${state.constraints.enforceRotc ? blocked : ""}" aria-hidden="true"></div>`;
    }).join("");
    const events = state.schedule
      .filter((item) => item.status === "assigned")
      .flatMap((item) =>
        item.blocks
          .filter((block) => block.day === day)
          .map((block) => renderEvent(item, block, assignmentLevels.get(item.id)))
      )
      .join("");
    return `<div class="day-lane">${cells}${events}</div>`;
  }).join("");

  const periods = PERIODS.map((period) => `<div class="period-label">${period}교시</div>`).join("");
  els.timetable.innerHTML = `<div class="corner-cell">교시</div>${DAYS.map((day) => `<div class="day-title">${DAY_NAMES[day]}</div>`).join("")}<div class="period-column">${periods}</div>${dayColumns}`;
}

function renderYearMatrix(validation) {
  els.timetable.className = "timetable matrix";
  const assignmentLevels = mapAssignmentLevels(validation.violations);
  const header = `<tr><th>요일</th><th>학년</th>${PERIODS.map((period) => `<th>${period}교시</th>`).join("")}</tr>`;
  const rows = DAYS.flatMap((day) =>
    [1, 2, 3, 4].map((year, yearIndex) => {
      let cells = "";
      let period = 1;
      while (period <= 14) {
        const blockEvents = state.schedule
          .filter((item) => item.status === "assigned")
          .filter((item) => {
            const course = findById(state.courses, item.courseId);
            return course?.year === year && courseInSelectedDepartment(course);
          })
          .flatMap((item) => item.blocks.filter((block) => block.day === day && block.start === period).map((block) => ({ item, block })));
        if (blockEvents.length) {
          const duration = Math.max(...blockEvents.map(({ block }) => block.duration));
          const chips = blockEvents.map(({ item }) => renderMatrixChip(item, assignmentLevels.get(item.id))).join("");
          cells += `<td colspan="${duration}">${chips}</td>`;
          period += duration;
          continue;
        }
        const blocked = state.constraints.enforceRotc && ["화", "목"].includes(day) && year >= 3 && period >= 7 && period <= 10;
        cells += `<td class="${blocked ? "blocked" : ""}"></td>`;
        period += 1;
      }
      const dayCell = yearIndex === 0 ? `<th class="day-head" rowspan="4">${DAY_NAMES[day]}</th>` : "";
      return `<tr>${dayCell}<th class="year-head">${year}</th>${cells}</tr>`;
    })
  ).join("");
  els.timetable.innerHTML = `<table class="matrix-table">${header}<tbody>${rows}</tbody></table>`;
}

function renderMatrixChip(item, level) {
  const course = findById(state.courses, item.courseId);
  const professor = findById(state.professors, item.professorId);
  const room = findById(state.rooms, item.roomId);
  const statusClass = level === "hard" ? " danger" : level === "warn" ? " warn" : "";
  return `<button class="matrix-chip${statusClass}" data-assignment="${escapeAttr(item.id)}" title="${escapeAttr(course?.name || item.courseId)}">${escapeHtml(course?.name || item.courseId)} [${item.sectionNo}. ${escapeHtml(professor?.name || "미배정")} ${escapeHtml(roomShort(room))}]</button>`;
}

function renderEvent(item, block, level) {
  const course = findById(state.courses, item.courseId);
  const professor = findById(state.professors, item.professorId);
  const room = findById(state.rooms, item.roomId);
  const top = (block.start - 1) * 46 + 4;
  const height = block.duration * 46 - 8;
  const selected = state.selectedAssignmentId === item.id ? " selected" : "";
  const statusClass = level === "hard" ? " danger" : level === "warn" ? " warn" : "";
  const label = `${course?.id || item.courseId}-${item.sectionNo}`;
  const title = `${course?.name || ""} ${item.sectionNo}분반`;
  return `<button class="event${statusClass}${selected}" data-assignment="${escapeAttr(item.id)}" style="top:${top}px;height:${height}px" title="${escapeAttr(title)}"><strong>${escapeHtml(label)} ${escapeHtml(course?.name || "")}</strong><span>${escapeHtml(professor?.name || "미배정")} · ${escapeHtml(room?.name || "강의실 없음")}</span></button>`;
}

function renderInspector(validation) {
  const selected = state.schedule.find((item) => item.id === state.selectedAssignmentId) || state.schedule[0];
  if (!state.schedule.length) {
    els.inspector.innerHTML = `<p class="empty-state">아직 배정 결과가 없습니다. 최적화 실행을 누르면 과목별 분반, 교수 시수, 강의실 정원, 시간 충돌을 함께 계산합니다.</p>`;
    return;
  }
  if (selected && !state.selectedAssignmentId) {
    state.selectedAssignmentId = selected.id;
  }

  const course = selected ? findById(state.courses, selected.courseId) : null;
  const professor = selected ? findById(state.professors, selected.professorId) : null;
  const room = selected ? findById(state.rooms, selected.roomId) : null;
  const selectedViolations = validation.violations.filter((item) => item.assignmentId === selected?.id);
  const topViolations = validation.violations.slice(0, 8);

  els.inspector.innerHTML = `
    <section class="selected-block">
      <h3>${escapeHtml(course ? `${course.id} ${course.name}` : "선택된 배정")}</h3>
      <dl class="detail-list">
        <div><dt>분반</dt><dd>${selected ? `${selected.sectionNo}분반 / ${selected.seats}명` : "-"}</dd></div>
        <div><dt>교수</dt><dd>${escapeHtml(professor?.name || "미배정")}</dd></div>
        <div><dt>강의실</dt><dd>${escapeHtml(room?.name || "미배정")}</dd></div>
        <div><dt>시간</dt><dd>${escapeHtml(formatBlocks(selected?.blocks || []))}</dd></div>
        <div><dt>운영주차</dt><dd>${escapeHtml(course ? weekTypeLabel(courseWeekType(course)) : "-")}</dd></div>
        <div><dt>시수반영</dt><dd>${selected ? `${formatNumber(selected.loadUnit)}시수` : "-"}</dd></div>
      </dl>
    </section>

    <section>
      <div class="constraint-list">
        ${
          selectedViolations.length
            ? selectedViolations.map(renderViolation).join("")
            : `<div class="constraint-item ok"><strong>선택 배정 정상</strong><span>선택한 분반에는 직접 충돌이 없습니다.</span></div>`
        }
      </div>
    </section>

    <section>
      <p class="subtle">전체 제약조건</p>
      <div class="constraint-list">
        ${
          topViolations.length
            ? topViolations.map(renderViolation).join("")
            : `<div class="constraint-item ok"><strong>검사 통과</strong><span>현재 배정에서 강한 충돌을 찾지 못했습니다.</span></div>`
        }
      </div>
    </section>

    <section>
      <p class="subtle">교수 시수</p>
      <div class="load-list">${validation.metrics.professorLoads.map(renderLoadRow).join("")}</div>
    </section>
  `;
}

function renderViolation(item) {
  return `<div class="constraint-item ${item.level}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.message)}</span></div>`;
}

function renderLoadRow(item) {
  const ratio = item.max > 0 ? Math.min(100, (item.load / item.max) * 100) : 0;
  const cls = item.load > item.max ? "danger" : isFacultyType(item.type) && item.load < item.min ? "warn" : "";
  return `
    <div class="load-row">
      <div class="load-meta"><strong>${escapeHtml(item.name)}</strong><span>${formatNumber(item.load)} / ${formatNumber(item.min)}-${formatNumber(item.max)}</span></div>
      <div class="meter ${cls}"><span style="width:${ratio}%"></span></div>
    </div>
  `;
}

function renderDataPanel(validation) {
  const hints = {
    courses: "새로 짤 시간표의 과목은 학년도별 교육과정 요람 기준입니다. 담당가능은 교수 탭의 담당 가능 과목과 함께 갱신됩니다.",
    professors: "이전 학기 시간표는 교수 후보와 가능 강의실을 파악하는 참고자료입니다. 담당 가능 과목은 현재 학과·학기 과목명 드롭다운으로 추가합니다.",
    rooms: "이전 학기 시간표와 보유 시설을 참고해 사용할 강의실만 체크하고, 분류와 정원을 입력합니다. 최적화는 체크된 강의실만 후보로 사용합니다.",
    assignments: "배정 결과는 최적화 실행 후 갱신됩니다. 충돌 행은 제약조건 패널에서 원인을 확인할 수 있습니다.",
    reference: "전 학기 시간표는 교수 후보, 강의실 사용 패턴, 분반 표기 참고용입니다. 새 학기 개설 과목 판정에는 사용하지 않습니다."
  };
  els.dataHint.textContent = hints[state.activeTab] || "";
  if (state.activeTab === "courses") renderCoursesTable();
  if (state.activeTab === "professors") renderProfessorsTable();
  if (state.activeTab === "rooms") renderRoomsTable();
  if (state.activeTab === "assignments") renderAssignmentsTable(validation);
  if (state.activeTab === "reference") renderReferenceTable();
}

function renderCoursesTable() {
  const rows = state.courses
    .filter(courseInCurrentScope)
    .map((course) => {
      const sections = recommendedSections(course);
      const cancel = cancellationStatus(course);
      const demand = courseDemand(course);
      return `
        <tr>
          <td><input class="table-input medium" data-kind="courses" data-id="${escapeAttr(course.id)}" data-field="id" value="${escapeAttr(course.id)}" /></td>
          <td><input class="table-input medium" data-kind="courses" data-id="${escapeAttr(course.id)}" data-field="name" value="${escapeAttr(course.name)}" /></td>
          <td><input class="table-input short" type="number" data-kind="courses" data-id="${escapeAttr(course.id)}" data-field="year" value="${escapeAttr(course.year)}" /></td>
          <td><input class="table-input medium" data-kind="courses" data-id="${escapeAttr(course.id)}" data-field="category" value="${escapeAttr(course.category)}" /></td>
          <td>${selectHtml("courses", course.id, "type", course.type, [["theory", "이론"], ["lab", "실험실습"], ["computer", "전산실습"], ["project", "프로젝트"], ["seminar", "세미나"]])}</td>
          <td>${selectHtml("courses", course.id, "weekType", courseWeekType(course), [["regular16", "16주"], ["twelve12", "12주"], ["pPractice4", "P실무 4주"]])}</td>
          <td class="numeric"><input class="table-input short" type="number" step="0.5" data-kind="courses" data-id="${escapeAttr(course.id)}" data-field="credits" value="${escapeAttr(course.credits)}" /></td>
          <td><input class="table-input short" data-kind="courses" data-id="${escapeAttr(course.id)}" data-field="pattern" value="${escapeAttr(formatPattern(course.pattern))}" /></td>
          <td class="numeric"><input class="table-input short" type="number" data-kind="courses" data-id="${escapeAttr(course.id)}" data-field="expectedStudents" value="${escapeAttr(course.expectedStudents)}" /></td>
          <td class="numeric"><input class="table-input short" type="number" data-kind="courses" data-id="${escapeAttr(course.id)}" data-field="maxSeats" value="${escapeAttr(course.maxSeats)}" /></td>
          <td class="numeric"><input class="table-input short" type="number" data-kind="courses" data-id="${escapeAttr(course.id)}" data-field="tolerance" value="${escapeAttr(course.tolerance)}" /></td>
          <td>${selectHtml("courses", course.id, "roomType", course.roomType, [["lecture", "이론"], ["lab", "실험"], ["computer", "전산/실습"]])}</td>
          <td>${professorPickerHtml(course)}</td>
          <td><input class="table-input short" data-kind="courses" data-id="${escapeAttr(course.id)}" data-field="fixed" value="${escapeAttr(course.fixed || "")}" placeholder="월10" /></td>
          <td><span class="pill ${cancel.level}">${sections}분반 · ${demand}명 · ${escapeHtml(cancel.label)}</span></td>
          <td><button class="row-button" data-remove="courses" data-id="${escapeAttr(course.id)}">삭제</button></td>
        </tr>
      `;
    })
    .join("");
  els.dataBody.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>코드</th><th>과목명</th><th>학년</th><th>이수구분</th><th>유형</th><th>운영주차</th><th class="numeric">학점</th><th>분배</th>
        <th class="numeric">예상인원</th><th class="numeric">기준정원</th><th class="numeric">초과허용</th><th>강의실</th><th>담당가능</th><th>고정시간</th><th>계산</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderProfessorsTable() {
  const rows = state.professors
    .map((professor) => `
      <tr>
        <td><input class="table-input short" data-kind="professors" data-id="${escapeAttr(professor.id)}" data-field="id" value="${escapeAttr(professor.id)}" /></td>
        <td><input class="table-input medium" data-kind="professors" data-id="${escapeAttr(professor.id)}" data-field="name" value="${escapeAttr(professor.name)}" /></td>
        <td>${selectHtml("professors", professor.id, "type", professor.type, [["전임", "전임"], ["신임전임", "신임전임"], ["겸임", "겸임"], ["초빙", "초빙"], ["강사", "강사"], ["명예", "명예"], ["연구", "연구"]])}</td>
        <td class="numeric"><input class="table-input short" type="number" step="0.5" data-kind="professors" data-id="${escapeAttr(professor.id)}" data-field="minCredits" value="${escapeAttr(professor.minCredits)}" /></td>
        <td class="numeric"><input class="table-input short" type="number" step="0.5" data-kind="professors" data-id="${escapeAttr(professor.id)}" data-field="maxCredits" value="${escapeAttr(professor.maxCredits)}" /></td>
        <td><input class="table-input" data-kind="professors" data-id="${escapeAttr(professor.id)}" data-field="availability" value="${escapeAttr(professor.availability || "")}" /></td>
        <td>${coursePickerHtml(professor)}</td>
        <td><button class="row-button" data-remove="professors" data-id="${escapeAttr(professor.id)}">삭제</button></td>
      </tr>
    `)
    .join("");
  els.dataBody.innerHTML = `
    <table class="data-table">
      <thead><tr><th>ID</th><th>성명</th><th>구분</th><th class="numeric">최소</th><th class="numeric">최대</th><th>가능 시간</th><th>담당 가능 과목</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function coursePickerHtml(professor) {
  const selectedIds = normalizeCourseRefs(professor.canTeach);
  const visibleSelectedIds = selectedIds.filter((courseId) => {
    const course = findById(state.courses, courseId);
    return course && courseInCurrentScope(course);
  });
  const selectedSet = new Set(selectedIds);
  const options = courseOptionsForPicker()
    .filter((course) => !selectedSet.has(course.id))
    .map((course) => `<option value="${escapeAttr(course.id)}">${escapeHtml(course.name)} · ${course.year}학년</option>`)
    .join("");
  const chips = visibleSelectedIds
    .map((courseId) => findById(state.courses, courseId))
    .filter(Boolean)
    .map(
      (course) => `
        <span class="choice-chip">
          ${escapeHtml(course.name)}
          <button type="button" title="담당 과목 제거" data-remove-course="${escapeAttr(course.id)}" data-professor-id="${escapeAttr(professor.id)}">×</button>
        </span>
      `
    )
    .join("");
  return `
    <div class="choice-picker">
      <select class="table-select" data-course-add data-id="${escapeAttr(professor.id)}">
        <option value="">과목명으로 추가</option>
        ${options}
      </select>
      <div class="choice-chips">${chips || `<span class="empty-chip">선택 없음</span>`}</div>
    </div>
  `;
}

function professorPickerHtml(course) {
  const selectedIds = normalizeProfessorRefs(course.eligible);
  const selectedSet = new Set(selectedIds);
  const options = professorOptionsForPicker()
    .filter((professor) => !selectedSet.has(professor.id))
    .map((professor) => `<option value="${escapeAttr(professor.id)}">${escapeHtml(professor.name)} · ${escapeHtml(professor.type)}</option>`)
    .join("");
  const chips = selectedIds
    .map((professorId) => findById(state.professors, professorId))
    .filter(Boolean)
    .map(
      (professor) => `
        <span class="choice-chip professor-chip">
          ${escapeHtml(professor.name)}
          <button type="button" title="담당 교수 제거" data-remove-professor="${escapeAttr(professor.id)}" data-course-id="${escapeAttr(course.id)}">×</button>
        </span>
      `
    )
    .join("");
  return `
    <div class="choice-picker">
      <select class="table-select" data-professor-add data-id="${escapeAttr(course.id)}">
        <option value="">교수명으로 추가</option>
        ${options}
      </select>
      <div class="choice-chips">${chips || `<span class="empty-chip">선택 없음</span>`}</div>
    </div>
  `;
}

function courseOptionsForPicker() {
  return state.courses
    .filter((course) => course.enabled !== false && courseInCurrentScope(course))
    .sort((a, b) => toNumber(a.year, 0) - toNumber(b.year, 0) || String(a.name).localeCompare(String(b.name), "ko"));
}

function professorOptionsForPicker() {
  return [...state.professors].sort((a, b) => String(a.name).localeCompare(String(b.name), "ko"));
}

function normalizeCourseRefs(values) {
  const ids = [];
  parseList(values).forEach((value) => {
    const course = resolveCourseRef(value);
    const id = course?.id || value;
    if (id && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

function resolveCourseRef(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  return state.courses.find((course) => course.id === text) || state.courses.find((course) => course.name === text) || null;
}

function normalizeProfessorRefs(values) {
  const ids = [];
  parseList(values).forEach((value) => {
    const professor = resolveProfessorRef(value);
    const id = professor?.id || value;
    if (id && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

function resolveProfessorRef(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  return state.professors.find((professor) => professor.id === text) || state.professors.find((professor) => professor.name === text) || null;
}

function renderRoomsTable() {
  const rows = state.rooms
    .map((room) => `
      <tr>
        <td class="center"><input class="table-check" type="checkbox" data-kind="rooms" data-id="${escapeAttr(room.id)}" data-field="enabled" ${room.enabled !== false ? "checked" : ""} /></td>
        <td><input class="table-input short" data-kind="rooms" data-id="${escapeAttr(room.id)}" data-field="id" value="${escapeAttr(room.id)}" /></td>
        <td><input class="table-input medium" data-kind="rooms" data-id="${escapeAttr(room.id)}" data-field="name" value="${escapeAttr(room.name)}" /></td>
        <td>${selectHtml("rooms", room.id, "type", room.type, [["lecture", "이론"], ["lab", "실험"], ["computer", "전산/실습"]])}</td>
        <td class="numeric"><input class="table-input short" type="number" data-kind="rooms" data-id="${escapeAttr(room.id)}" data-field="capacity" value="${escapeAttr(room.capacity)}" /></td>
        <td><span class="pill ${room.enabled !== false ? "ok" : "warn"}">${room.enabled !== false ? "사용" : "제외"}</span></td>
        <td><button class="row-button" data-remove="rooms" data-id="${escapeAttr(room.id)}">삭제</button></td>
      </tr>
    `)
    .join("");
  els.dataBody.innerHTML = `
    <table class="data-table">
      <thead><tr><th>사용</th><th>ID</th><th>강의실명</th><th>분류</th><th class="numeric">정원</th><th>상태</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAssignmentsTable(validation) {
  const levels = mapAssignmentLevels(validation.violations);
  const rows = state.schedule
    .map((item) => {
      const course = findById(state.courses, item.courseId);
      const professor = findById(state.professors, item.professorId);
      const room = findById(state.rooms, item.roomId);
      const level = item.status !== "assigned" ? "hard" : levels.get(item.id) || "ok";
      return `
        <tr>
          <td><span class="pill ${level}">${level === "ok" ? "정상" : level === "warn" ? "주의" : "충돌"}</span></td>
          <td>${escapeHtml(course?.id || item.courseId)}</td>
          <td>${escapeHtml(course?.name || "")}</td>
          <td>${item.sectionNo}</td>
          <td>${escapeHtml(professor?.name || "미배정")}</td>
          <td>${escapeHtml(room?.name || "미배정")}</td>
          <td>${escapeHtml(formatBlocks(item.blocks || []))}</td>
          <td>${escapeHtml(course ? weekTypeLabel(courseWeekType(course)) : "-")}</td>
          <td class="numeric">${item.seats || 0}</td>
          <td class="numeric">${formatNumber(item.loadUnit || 0)}</td>
        </tr>
      `;
    })
    .join("");
  els.dataBody.innerHTML = `
    <table class="data-table">
      <thead><tr><th>상태</th><th>코드</th><th>과목명</th><th>분반</th><th>교수</th><th>강의실</th><th>시간</th><th>운영주차</th><th class="numeric">인원</th><th class="numeric">시수</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="10">배정 결과가 없습니다.</td></tr>`}</tbody>
    </table>
  `;
}

function renderReferenceTable() {
  const reference = referenceForSelectedDepartment();
  if (!reference) {
    els.dataBody.innerHTML = `
      <div class="reference-empty-state">
        <strong>${escapeHtml(state.selectedDepartment)} 전 학기 예시표가 없습니다.</strong>
        <span>현재 내장된 예시는 제공된 2026 1학기 전자공학과 시간표입니다. 다른 학과 자료를 받으면 같은 형식으로 추가할 수 있습니다.</span>
      </div>
    `;
    return;
  }

  const filledCells = reference.rows.reduce((sum, row) => sum + row.cells.length, 0);
  const header = `<tr><th>요일</th><th>학년</th>${PERIODS.map((period) => `<th>${period}교시</th>`).join("")}</tr>`;
  const rows = reference.rows.map((row, index) => renderReferenceRow(row, index, reference.rows)).join("");
  els.dataBody.innerHTML = `
    <div class="reference-summary">
      <strong>${escapeHtml(reference.department)} · ${escapeHtml(reference.semester)}</strong>
      <span>${escapeHtml(reference.source)} 기준 · 배정 셀 ${filledCells}개 · 교필/교선은 흐리게 표시</span>
    </div>
    <table class="data-table reference-table">
      <thead>${header}</thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderReferenceRow(row, index, rows) {
  const isDayStart = index === 0 || rows[index - 1].day !== row.day;
  const cellsByPeriod = new Map(row.cells.map((cell) => [cell.period, cell]));
  let period = 1;
  let cells = "";
  while (period <= 14) {
    const cell = cellsByPeriod.get(period);
    if (cell) {
      const span = Math.max(1, Math.min(15 - period, toNumber(cell.span, 1)));
      const className = isExternalReferenceText(cell.text) ? "reference-general" : "";
      cells += `<td class="${className}" colspan="${span}">${renderReferenceCellText(cell.text)}</td>`;
      period += span;
      continue;
    }
    cells += `<td class="reference-empty"></td>`;
    period += 1;
  }
  return `
    <tr class="${isDayStart ? "day-start" : ""}">
      <th class="reference-day">${escapeHtml(row.day)}</th>
      <th class="reference-year">${escapeHtml(row.year)}학년</th>
      ${cells}
    </tr>
  `;
}

function renderReferenceCellText(text) {
  return escapeHtml(text)
    .replace(/\n/g, "<br>")
    .replace(/([^\s])\[/g, "$1<br>[")
    .replace(/\s+(?=\[[^\]]+\])/g, "<br>");
}

function referenceForSelectedDepartment() {
  return REFERENCE_TIMETABLES.find((reference) => reference.department === state.selectedDepartment);
}

function isExternalReferenceText(text) {
  return /(계교|교필|교선|College English|수학1|물리학및실험1|화학및실험1|가천인세미나)/.test(String(text || ""));
}

function selectHtml(kind, id, field, value, options) {
  return `<select class="table-select" data-kind="${escapeAttr(kind)}" data-id="${escapeAttr(id)}" data-field="${escapeAttr(field)}">${options
    .map(([optionValue, label]) => `<option value="${escapeAttr(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(label)}</option>`)
    .join("")}</select>`;
}

function handleTableChange(event) {
  const courseAdd = event.target.closest("[data-course-add]");
  if (courseAdd) {
    const professor = findById(state.professors, courseAdd.dataset.id);
    const courseId = courseAdd.value;
    if (!professor || !courseId) return;
    if (addTeachingLink(professor.id, courseId)) {
      state.schedule = [];
      saveState();
      renderAll();
    }
    return;
  }

  const professorAdd = event.target.closest("[data-professor-add]");
  if (professorAdd) {
    const course = findById(state.courses, professorAdd.dataset.id);
    const professorId = professorAdd.value;
    if (!course || !professorId) return;
    if (addTeachingLink(professorId, course.id)) {
      state.schedule = [];
      saveState();
      renderAll();
    }
    return;
  }

  const input = event.target.closest("[data-kind][data-id][data-field]");
  if (!input) return;
  const { kind, id, field } = input.dataset;
  const list = state[kind];
  const item = findById(list, id);
  if (!item) return;
  let value = input.type === "checkbox" ? input.checked : input.value;
  if (["credits", "expectedStudents", "maxSeats", "tolerance", "year", "minCredits", "maxCredits", "capacity"].includes(field)) {
    value = toNumber(value, 0);
  }
  if (["pattern"].includes(field)) {
    value = parsePattern(value);
  }
  if (["eligible", "canTeach"].includes(field)) {
    value = parseList(value);
  }
  if (field === "id") {
    updateEntityId(kind, id, String(value).trim());
  } else {
    item[field] = value;
  }
  state.schedule = [];
  saveState();
  renderAll();
}

function handleTableClick(event) {
  const courseRemove = event.target.closest("[data-remove-course][data-professor-id]");
  if (courseRemove) {
    const professor = findById(state.professors, courseRemove.dataset.professorId);
    if (!professor) return;
    removeTeachingLink(professor.id, courseRemove.dataset.removeCourse);
    state.schedule = [];
    saveState();
    renderAll();
    return;
  }

  const professorRemove = event.target.closest("[data-remove-professor][data-course-id]");
  if (professorRemove) {
    const course = findById(state.courses, professorRemove.dataset.courseId);
    if (!course) return;
    removeTeachingLink(professorRemove.dataset.removeProfessor, course.id);
    state.schedule = [];
    saveState();
    renderAll();
    return;
  }

  const remove = event.target.closest("[data-remove]");
  if (!remove) return;
  const kind = remove.dataset.remove;
  const id = remove.dataset.id;
  state[kind] = state[kind].filter((item) => item.id !== id);
  cleanupTeachingLinks();
  state.schedule = [];
  saveState();
  renderAll();
}

function addTeachingLink(professorId, courseId) {
  const professor = findById(state.professors, professorId);
  const course = findById(state.courses, courseId);
  if (!professor || !course) return false;
  let changed = false;
  professor.canTeach = normalizeCourseRefs(professor.canTeach);
  course.eligible = normalizeProfessorRefs(course.eligible);
  if (!professor.canTeach.includes(course.id)) {
    professor.canTeach.push(course.id);
    changed = true;
  }
  if (!course.eligible.includes(professor.id)) {
    course.eligible.push(professor.id);
    changed = true;
  }
  return changed;
}

function removeTeachingLink(professorId, courseId) {
  const professor = findById(state.professors, professorId);
  const course = findById(state.courses, courseId);
  if (professor) {
    professor.canTeach = normalizeCourseRefs(professor.canTeach).filter((id) => id !== courseId);
  }
  if (course) {
    course.eligible = normalizeProfessorRefs(course.eligible).filter((id) => id !== professorId);
  }
}

function cleanupTeachingLinks() {
  const courseIds = new Set(state.courses.map((course) => course.id));
  const professorIds = new Set(state.professors.map((professor) => professor.id));
  state.professors.forEach((professor) => {
    professor.canTeach = normalizeCourseRefs(professor.canTeach).filter((courseId) => courseIds.has(courseId));
  });
  state.courses.forEach((course) => {
    course.eligible = normalizeProfessorRefs(course.eligible).filter((professorId) => professorIds.has(professorId));
  });
}

function updateEntityId(kind, oldId, newId) {
  if (!newId || oldId === newId) return;
  if (state[kind].some((item) => item.id === newId)) return;
  const item = findById(state[kind], oldId);
  if (!item) return;
  item.id = newId;
  if (kind === "courses") {
    state.professors.forEach((professor) => {
      professor.canTeach = professor.canTeach.map((courseId) => (courseId === oldId ? newId : courseId));
    });
  }
  if (kind === "professors") {
    state.courses.forEach((course) => {
      course.eligible = course.eligible.map((professorId) => (professorId === oldId ? newId : professorId));
    });
  }
}

function addCourse() {
  const next = state.courses.length + 1;
  state.courses.push({
    id: `NEW${next}`,
    department: state.selectedDepartment,
    term: semesterTerm(state.semester) || 2,
    name: "신규 과목",
    year: 1,
    category: "전공선택",
    type: "theory",
    credits: 3,
    pattern: [2, 1],
    weekType: "regular16",
    expectedStudents: 40,
    maxSeats: 60,
    tolerance: 10,
    roomType: "lecture",
    eligible: [],
    fixed: "",
    enabled: true
  });
  state.activeTab = "courses";
  state.schedule = [];
  saveState();
  renderAll();
}

function addProfessor() {
  const next = state.professors.length + 1;
  state.professors.push({
    id: `PX${next}`,
    name: "신규 교수",
    type: "전임",
    minCredits: 9,
    maxCredits: 18,
    availability: "월1-10,화1-10,수1-10,목1-10,금1-10",
    canTeach: []
  });
  state.activeTab = "professors";
  state.schedule = [];
  saveState();
  renderAll();
}

function addRoom() {
  const next = state.rooms.length + 1;
  state.rooms.push({ id: `RX${next}`, name: "신규 강의실", type: "lecture", capacity: 60, enabled: true });
  state.activeTab = "rooms";
  state.schedule = [];
  saveState();
  renderAll();
}

function runOptimization({ iterations = 12, silent = false } = {}) {
  const sections = buildSections();
  let best = null;
  for (let index = 0; index < iterations; index += 1) {
    const rng = mulberry32(1209 + index * 97 + sections.length * 13);
    const result = scheduleGreedy(sections, rng, index);
    const validation = validateSchedule(result.assignments);
    const hardCount = validation.violations.filter((item) => item.level === "hard").length;
    const warnCount = validation.violations.filter((item) => item.level === "warn").length;
    const facultyGap = Math.max(0, state.constraints.facultyRatioTarget - validation.metrics.facultyRatio);
    const unmetMin = validation.metrics.professorLoads.filter((item) => isFacultyType(item.type) && item.load < item.min).length;
    const score = hardCount * 100000 + warnCount * 1500 + facultyGap * 90 + unmetMin * 700 + result.score;
    if (!best || score < best.score) {
      best = { ...result, validation, score };
    }
  }
  state.schedule = best ? best.assignments : [];
  state.lastRun = {
    at: new Date().toISOString(),
    iterations,
    validation: best ? best.validation : validateSchedule([])
  };
  state.selectedAssignmentId = state.schedule[0]?.id || "";
  saveState();
  if (!silent) renderAll();
}

function scheduleGreedy(sections, rng, iteration) {
  const work = createWorkState();
  const sorted = [...sections].sort((a, b) => difficultyScore(b) - difficultyScore(a) || rng() - 0.5);
  if (iteration % 3 === 1) sorted.reverse();

  sorted.forEach((section) => {
    const candidates = buildCandidates(section, work, rng);
    if (!candidates.length) {
      work.assignments.push({
        id: section.id,
        courseId: section.course.id,
        sectionNo: section.sectionNo,
        professorId: "",
        roomId: "",
        blocks: [],
        seats: section.seats,
        loadUnit: 0,
        status: "unassigned"
      });
      work.score += 20000;
      return;
    }
    candidates.sort((a, b) => a.score - b.score || rng() - 0.5);
    applyCandidate(work, candidates[0]);
  });

  return { assignments: work.assignments, score: work.score };
}

function createWorkState() {
  const professorLoad = {};
  const professorBusy = {};
  const professorCourseCount = {};
  const roomBusy = {};
  state.professors.forEach((professor) => {
    professorLoad[professor.id] = 0;
    professorBusy[professor.id] = new Set();
    professorCourseCount[professor.id] = {};
  });
  activeRooms().forEach((room) => {
    roomBusy[room.id] = {};
  });
  return { assignments: [], professorLoad, professorBusy, professorCourseCount, roomBusy, score: 0 };
}

function buildCandidates(section, work, rng) {
  const course = section.course;
  const loadBias = facultyRatioNeed(work);
  const professors = state.professors
    .filter((professor) => professorCanTeach(professor, course))
    .filter((professor) => {
      const load = courseLoadUnit(course, professor);
      return work.professorLoad[professor.id] + load <= toNumber(professor.maxCredits, 0) + 0.001;
    })
    .sort((a, b) => professorPriority(a, course, work, loadBias) - professorPriority(b, course, work, loadBias) || rng() - 0.5);

  const usableRooms = activeRooms();
  const rooms = usableRooms
    .filter((room) => roomMatchesCourse(room, course))
    .sort((a, b) => Math.abs(a.capacity - section.seats) - Math.abs(b.capacity - section.seats) || rng() - 0.5);

  const relaxedRooms = rooms.length ? rooms : usableRooms;
  const candidates = [];

  professors.slice(0, 3).forEach((professor) => {
    relaxedRooms.slice(0, 4).forEach((room) => {
      const blockSets = generateBlockSets(section, professor, room, work, rng);
      blockSets.slice(0, 5).forEach((blocks) => {
        const candidate = {
          section,
          professor,
          room,
          blocks,
          score: candidateScore(section, professor, room, blocks, work, loadBias)
        };
        candidates.push(candidate);
      });
    });
  });

  return candidates.slice(0, 45);
}

function professorPriority(professor, course, work, loadBias) {
  const current = work.professorLoad[professor.id] || 0;
  const min = toNumber(professor.minCredits, 0);
  let score = 0;
  if (isFacultyType(professor.type)) score -= 8 + loadBias;
  if (current < min) score -= 12;
  score += current * 1.8;
  const sameCourse = work.professorCourseCount[professor.id]?.[course.id] || 0;
  score += sameCourse * 8;
  return score;
}

function facultyRatioNeed(work) {
  const totalAssigned = work.assignments.reduce((sum, item) => sum + (item.credits || 0), 0);
  if (!totalAssigned) return 10;
  const facultyAssigned = work.assignments.reduce((sum, item) => sum + (item.facultyCredit || 0), 0);
  const ratio = (facultyAssigned / totalAssigned) * 100;
  return ratio < state.constraints.facultyRatioTarget ? 12 : 0;
}

function generateBlockSets(section, professor, room, work, rng) {
  const course = section.course;
  const fixed = parseFixed(course.fixed);
  const pattern = parsePattern(course.pattern);
  if (fixed) {
    const blocks = [{ day: fixed.day, start: fixed.start, duration: pattern[0] || 1 }];
    return blocksValid(section, professor, room, work, blocks) ? [blocks] : [];
  }

  const optionsByPart = pattern.map((duration, partIndex) => {
    const options = [];
    DAYS.forEach((day) => {
      PERIODS.forEach((start) => {
        const block = { day, start, duration };
        if (start + duration - 1 > 14) return;
        if (!singleBlockValid(section, professor, room, work, block)) return;
        options.push(block);
      });
    });
    options.sort((a, b) => blockPreference(a, section, professor, room, partIndex) - blockPreference(b, section, professor, room, partIndex) || rng() - 0.5);
    return options.slice(0, 10);
  });

  const output = [];
  const choose = (index, blocks) => {
    if (output.length >= 14) return;
    if (index >= optionsByPart.length) {
      if (blocksValid(section, professor, room, work, blocks)) output.push(blocks.map((item) => ({ ...item })));
      return;
    }
    optionsByPart[index].forEach((block) => {
      if (overlapsBlocks(blocks, block)) return;
      if (state.constraints.enforceSplitTheory && shouldSplitAcrossDays(section.course) && blocks.some((chosen) => chosen.day === block.day)) return;
      choose(index + 1, [...blocks, block]);
    });
  };
  choose(0, []);
  return output;
}

function blockPreference(block, section, professor, room, partIndex) {
  let score = 0;
  score += Math.max(0, block.start - 8) * 1.5;
  score += block.day === "금" && block.start > 8 ? 4 : 0;
  score += Math.abs(room.capacity - section.seats) * 0.07;
  score += partIndex * 0.2;
  if (isFacultyType(professor.type) && block.start <= 4) score -= 0.5;
  return score;
}

function candidateScore(section, professor, room, blocks, work, loadBias) {
  const course = section.course;
  const load = courseLoadUnit(course, professor);
  let score = 0;
  const currentLoad = work.professorLoad[professor.id] || 0;
  const min = toNumber(professor.minCredits, 0);
  const max = toNumber(professor.maxCredits, 0);
  if (isFacultyType(professor.type)) score -= 14 + loadBias;
  if (currentLoad < min) score -= Math.min(18, (min - currentLoad) * 4);
  if (currentLoad + load > max) score += 5000;
  score += Math.max(0, room.capacity - section.seats) * 0.08;
  score += room.capacity < section.seats ? (section.seats - room.capacity) * 220 : 0;
  const sameCourse = work.professorCourseCount[professor.id]?.[course.id] || 0;
  score += sameCourse * 16;
  if (sameCourse >= state.constraints.maxSameCourseSections) score += 6000;
  blocks.forEach((block) => {
    score += Math.max(0, block.start - 8) * 1.2;
    score += block.day === "금" && block.start > 8 ? 5 : 0;
  });
  score += spreadPenalty(professor, blocks, work);
  return score;
}

function spreadPenalty(professor, blocks, work) {
  if (!isFacultyType(professor.type)) return 0;
  const usedDays = new Set();
  (work.professorBusy[professor.id] || new Set()).forEach((key) => usedDays.add(key.split("-")[0]));
  blocks.forEach((block) => usedDays.add(block.day));
  return usedDays.size >= 4 ? -2 : 2;
}

function applyCandidate(work, candidate) {
  const { section, professor, room, blocks } = candidate;
  const course = section.course;
  const load = courseLoadUnit(course, professor);
  const assignment = {
    id: section.id,
    courseId: course.id,
    sectionNo: section.sectionNo,
    professorId: professor.id,
    roomId: room.id,
    blocks,
    seats: section.seats,
    credits: toNumber(course.credits, 0),
    loadUnit: load,
    facultyCredit: isFacultyType(professor.type) ? toNumber(course.credits, 0) : 0,
    status: "assigned"
  };
  work.assignments.push(assignment);
  work.professorLoad[professor.id] += load;
  work.professorCourseCount[professor.id][course.id] = (work.professorCourseCount[professor.id][course.id] || 0) + 1;
  blocks.forEach((block) => {
    blockSlots(block).forEach((slot) => {
      work.professorBusy[professor.id].add(slot);
      work.roomBusy[room.id][slot] ||= [];
      work.roomBusy[room.id][slot].push(assignment);
    });
  });
  work.score += candidate.score;
}

function singleBlockValid(section, professor, room, work, block) {
  if (isRotcBlocked(section.course, block)) return false;
  const availability = parseAvailability(professor.availability);
  const slots = blockSlots(block);
  if (!slots.every((slot) => availability.has(slot))) return false;
  if (slots.some((slot) => work.professorBusy[professor.id]?.has(slot))) return false;
  if (
    slots.some((slot) =>
      (work.roomBusy[room.id]?.[slot] || []).some((existing) => {
        const existingCourse = findById(state.courses, existing.courseId);
        return !canShareRoomSlot(section.course, existingCourse);
      })
    )
  ) {
    return false;
  }
  return true;
}

function blocksValid(section, professor, room, work, blocks) {
  if (!blocks.length) return false;
  if (state.constraints.enforceSplitTheory && shouldSplitAcrossDays(section.course)) {
    const dayCount = new Set(blocks.map((block) => block.day)).size;
    if (dayCount < 2) return false;
  }
  const seen = new Set();
  for (const block of blocks) {
    if (!singleBlockValid(section, professor, room, work, block)) return false;
    for (const slot of blockSlots(block)) {
      if (seen.has(slot)) return false;
      seen.add(slot);
    }
  }
  return true;
}

function validateSchedule(assignments) {
  const violations = [];
  const professorLoads = state.professors.map((professor) => ({
    id: professor.id,
    name: professor.name,
    type: professor.type,
    min: toNumber(professor.minCredits, 0),
    max: toNumber(professor.maxCredits, 0),
    load: 0
  }));
  const loadMap = Object.fromEntries(professorLoads.map((item) => [item.id, item]));
  const professorSlots = {};
  const roomSlots = {};
  const professorCourseCounts = {};
  let totalCredits = 0;
  let facultyCredits = 0;

  assignments.forEach((assignment) => {
    const course = findById(state.courses, assignment.courseId);
    const professor = findById(state.professors, assignment.professorId);
    const room = findById(state.rooms, assignment.roomId);
    if (!course) return;
    totalCredits += toNumber(course.credits, 0);
    if (assignment.status !== "assigned") {
      violations.push({
        level: "hard",
        title: "미배정 분반",
        message: `${course.name} ${assignment.sectionNo}분반을 배정하지 못했습니다.`,
        assignmentId: assignment.id
      });
      return;
    }
    if (!professor || !professorCanTeach(professor, course)) {
      violations.push({
        level: "hard",
        title: "담당 가능 교수 불일치",
        message: `${course.name}은 ${professor?.name || "선택 교수"}의 담당 가능 과목에 없습니다.`,
        assignmentId: assignment.id
      });
    }
    if (room && room.enabled === false) {
      violations.push({
        level: "hard",
        title: "사용 제외 강의실 배정",
        message: `${room.name}은 사용 대상에서 제외되어 있습니다.`,
        assignmentId: assignment.id
      });
    }
    if (!room || !roomMatchesCourse(room, course)) {
      violations.push({
        level: "hard",
        title: "강의실 유형 불일치",
        message: `${course.name}은 ${roomTypeLabel(course.roomType)}이 필요합니다.`,
        assignmentId: assignment.id
      });
    }
    if (room && room.capacity < assignment.seats) {
      violations.push({
        level: "hard",
        title: "강의실 정원 초과",
        message: `${room.name} 정원 ${room.capacity}명보다 ${assignment.seats - room.capacity}명 많습니다.`,
        assignmentId: assignment.id
      });
    }

    const load = professor ? courseLoadUnit(course, professor) : 0;
    if (professor && loadMap[professor.id]) {
      loadMap[professor.id].load += load;
      if (isFacultyType(professor.type)) facultyCredits += toNumber(course.credits, 0);
      professorCourseCounts[professor.id] ||= {};
      professorCourseCounts[professor.id][course.id] = (professorCourseCounts[professor.id][course.id] || 0) + 1;
    }

    if (state.constraints.enforceSplitTheory && shouldSplitAcrossDays(course)) {
      const days = new Set((assignment.blocks || []).map((block) => block.day));
      if (days.size < 2) {
        violations.push({
          level: "hard",
          title: "3학점 이론 분산 필요",
          message: `${course.name}은 2일 이상으로 나누어 배정해야 합니다.`,
          assignmentId: assignment.id
        });
      }
    }

    (assignment.blocks || []).forEach((block) => {
      if (isRotcBlocked(course, block)) {
        violations.push({
          level: "hard",
          title: "ROTC 시간대 충돌",
          message: `${course.name} ${course.year}학년 전공이 ${block.day}${block.start}교시에 배정되었습니다.`,
          assignmentId: assignment.id
        });
      }
      const availability = professor ? parseAvailability(professor.availability) : new Set();
      blockSlots(block).forEach((slot) => {
        if (professor && !availability.has(slot)) {
          violations.push({
            level: "hard",
            title: "교수 가능 시간 외 배정",
            message: `${professor.name} 교수의 가능 시간에 ${formatSlot(slot)}이 없습니다.`,
            assignmentId: assignment.id
          });
        }
        if (professor) {
          professorSlots[professor.id] ||= {};
          if (professorSlots[professor.id][slot]) {
            violations.push({
              level: "hard",
              title: "교수 시간 중복",
              message: `${professor.name} 교수의 ${formatSlot(slot)} 배정이 중복됩니다.`,
              assignmentId: assignment.id
            });
          }
          professorSlots[professor.id][slot] = assignment.id;
        }
        if (room) {
          roomSlots[room.id] ||= {};
          const existingAssignments = roomSlots[room.id][slot] || [];
          existingAssignments.forEach((existing) => {
            const existingCourse = findById(state.courses, existing.courseId);
            if (!canShareRoomSlot(course, existingCourse)) {
              violations.push({
                level: "hard",
                title: "강의실 시간 중복",
                message: `${room.name}의 ${formatSlot(slot)}에 ${course.name}과 ${existingCourse?.name || existing.courseId}이 함께 배정되었습니다.`,
                assignmentId: assignment.id
              });
            }
          });
          roomSlots[room.id][slot] = [...existingAssignments, assignment];
        }
      });
    });
  });

  validatePPracticeRoomPairing(assignments, roomSlots, violations);

  professorLoads.forEach((item) => {
    if (item.load > item.max + 0.001) {
      violations.push({
        level: "hard",
        title: "교수 한계시수 초과",
        message: `${item.name}: ${formatNumber(item.load)}시수 / 한계 ${formatNumber(item.max)}시수`
      });
    }
    if (isFacultyType(item.type) && item.load + 0.001 < item.min) {
      violations.push({
        level: "warn",
        title: "전임 책임시수 미달",
        message: `${item.name}: ${formatNumber(item.load)}시수 / 책임 ${formatNumber(item.min)}시수`
      });
    }
  });

  Object.entries(professorCourseCounts).forEach(([professorId, counts]) => {
    const professor = findById(state.professors, professorId);
    Object.entries(counts).forEach(([courseId, count]) => {
      const course = findById(state.courses, courseId);
      if (count > state.constraints.maxSameCourseSections) {
        violations.push({
          level: "hard",
          title: "동일과목 분반 한도 초과",
          message: `${professor?.name || professorId} 교수에게 ${course?.name || courseId} ${count}분반이 배정되었습니다.`
        });
      }
    });
  });

  state.courses.filter((course) => course.enabled !== false && courseInSelectedDepartment(course)).forEach((course) => {
    const cancel = cancellationStatus(course);
    if (cancel.level === "warn") {
      violations.push({
        level: "warn",
        title: "폐강 기준 주의",
        message: `${course.name}: ${cancel.detail}`
      });
    }
    if (course.type === "project" && toNumber(course.expectedStudents, 0) / recommendedSections(course) < 30) {
      violations.push({
        level: "warn",
        title: "P-실무프로젝트 분반 인원",
        message: `${course.name}: 강좌별 30명 이상 원칙을 확인하세요.`
      });
    }
  });

  const facultyRatio = totalCredits ? (facultyCredits / totalCredits) * 100 : 0;
  if (facultyRatio + 0.001 < state.constraints.facultyRatioTarget) {
    violations.push({
      level: "hard",
      title: "전임교원 담당비율 미달",
      message: `현재 ${Math.round(facultyRatio)}% / 목표 ${state.constraints.facultyRatioTarget}%입니다.`
    });
  }

  return {
    violations,
    metrics: {
      professorLoads,
      facultyRatio,
      totalCredits,
      facultyCredits
    }
  };
}

function buildSections() {
  const sections = [];
  state.courses
    .filter((course) => course.enabled !== false && courseInCurrentScope(course))
    .forEach((course) => {
      const count = recommendedSections(course);
      const seats = Math.ceil(courseDemand(course) / count);
      for (let index = 1; index <= count; index += 1) {
        sections.push({
          id: `${course.id}-${index}`,
          course,
          sectionNo: index,
          seats
        });
      }
    });
  return sections;
}

function getSelectedDepartment() {
  if (!state.departments?.length) {
    state.departments = clone(defaultData.departments);
  }
  let department = state.departments.find((item) => item.id === state.selectedDepartment);
  if (!department) {
    department = state.departments[0];
    state.selectedDepartment = department.id;
  }
  department.quotas ||= { 1: 60, 2: 60, 3: 60, 4: 60 };
  return department;
}

function courseInSelectedDepartment(course) {
  return !course.department || course.department === state.selectedDepartment;
}

function courseInSelectedTerm(course) {
  return courseMatchesTerm(course, semesterTerm(state.semester));
}

function courseInCurrentScope(course) {
  return courseInSelectedDepartment(course) && courseInSelectedTerm(course);
}

function courseDemand(course) {
  const explicit = toNumber(course.expectedStudents, 0);
  if (explicit > 0) return explicit;
  const department = getSelectedDepartment();
  return Math.max(1, toNumber(department.quotas?.[course.year], 1));
}

function difficultyScore(section) {
  const course = section.course;
  const eligibleCount = state.professors.filter((professor) => professorCanTeach(professor, course)).length;
  let score = 0;
  score += parseFixed(course.fixed) ? 80 : 0;
  score += course.roomType !== "lecture" ? 28 : 0;
  score += (10 - Math.min(eligibleCount, 10)) * 8;
  score += parsePattern(course.pattern).length * 4;
  score += section.seats > 60 ? 12 : 0;
  score += course.year >= 3 ? 6 : 0;
  return score;
}

function recommendedSections(course) {
  const students = Math.max(0, courseDemand(course));
  const maxSeats = Math.max(1, toNumber(course.maxSeats, defaultMaxSeats(course.type)));
  const tolerance = Math.max(0, toNumber(course.tolerance, defaultTolerance(course.type)));
  if (students <= 0) return 1;
  return Math.max(1, Math.ceil(Math.max(1, students - tolerance) / maxSeats));
}

function defaultMaxSeats(type) {
  if (type === "lab" || type === "computer") return 40;
  if (type === "project") return 30;
  return 60;
}

function defaultTolerance(type) {
  if (type === "lab" || type === "computer") return 3;
  if (type === "project") return 0;
  return 10;
}

function cancellationStatus(course) {
  const students = courseDemand(course);
  let threshold = 15;
  if (course.category?.includes("계열교양") && course.type === "theory") threshold = 30;
  if (course.category?.includes("융합교양") || course.category?.includes("글쓰기")) threshold = 30;
  const exempt = ["전공필수", "세미나"].some((text) => String(course.category || "").includes(text)) || String(course.name || "").includes("진로세미나");
  if (!exempt && students < threshold) {
    return { level: "warn", label: "폐강주의", detail: `${students}명으로 폐강 기준 ${threshold}명 미만입니다.` };
  }
  return { level: "ok", label: "개설가능", detail: "기준 인원 충족" };
}

function courseLoadUnit(course, professor) {
  if (isFacultyType(professor.type)) return toNumber(course.credits, 0);
  return parsePattern(course.pattern).reduce((sum, value) => sum + value, 0);
}

function courseWeekType(course) {
  const value = course?.weekType || inferWeekType(course);
  return ["regular16", "twelve12", "pPractice4"].includes(value) ? value : "regular16";
}

function inferWeekType(course) {
  const name = String(course?.name || "").replace(/\s+/g, "");
  if (/P-?실무|피실무|실무프로젝트/.test(name)) return "pPractice4";
  if (/12주/.test(name)) return "twelve12";
  return "regular16";
}

function weekTypeLabel(type) {
  return { regular16: "16주", twelve12: "12주", pPractice4: "P실무 4주" }[type] || "16주";
}

function isPPracticeCourse(course) {
  return courseWeekType(course) === "pPractice4";
}

function isTwelveWeekCourse(course) {
  return courseWeekType(course) === "twelve12";
}

function canShareRoomSlot(courseA, courseB) {
  if (!courseA || !courseB) return false;
  return (isPPracticeCourse(courseA) && isTwelveWeekCourse(courseB)) || (isTwelveWeekCourse(courseA) && isPPracticeCourse(courseB));
}

function validatePPracticeRoomPairing(assignments, roomSlots, violations) {
  const reported = new Set();
  assignments
    .filter((assignment) => assignment.status === "assigned")
    .forEach((assignment) => {
      const course = findById(state.courses, assignment.courseId);
      if (!isPPracticeCourse(course)) return;
      const room = findById(state.rooms, assignment.roomId);
      (assignment.blocks || []).forEach((block) => {
        const slots = blockSlots(block);
        const companionsBySlot = slots.map((slot) => (roomSlots[assignment.roomId]?.[slot] || []).filter((item) => item.id !== assignment.id));
        const hasCompanionEverySlot = companionsBySlot.every((items) => items.length > 0);
        const hasTwelveEverySlot = companionsBySlot.every((items) => items.some((item) => isTwelveWeekCourse(findById(state.courses, item.courseId))));
        const incompatible = companionsBySlot
          .flat()
          .filter((item) => !isTwelveWeekCourse(findById(state.courses, item.courseId)))
          .map((item) => findById(state.courses, item.courseId)?.name || item.courseId);
        const key = `${assignment.id}-${assignment.roomId}-${block.day}-${block.start}`;
        if (!hasCompanionEverySlot && !reported.has(`${key}-empty`)) {
          reported.add(`${key}-empty`);
          violations.push({
            level: "warn",
            title: "P실무 12주 보완 가능",
            message: `${course.name}이 ${room?.name || "강의실"} ${formatBlocks([block])}에 배정되어 있습니다. 같은 강의실·시간을 추가 활용하려면 12주 수업만 넣을 수 있습니다.`,
            assignmentId: assignment.id
          });
        }
        if (hasCompanionEverySlot && !hasTwelveEverySlot && incompatible.length && !reported.has(`${key}-bad`)) {
          reported.add(`${key}-bad`);
          violations.push({
            level: "hard",
            title: "P실무 시간대 주차 불일치",
            message: `${room?.name || "강의실"} ${formatBlocks([block])}의 P실무 보완 배정에는 12주 수업만 들어갈 수 있습니다: ${[...new Set(incompatible)].join(", ")}`,
            assignmentId: assignment.id
          });
        }
      });
    });
}

function isFacultyType(type) {
  return ["전임", "신임전임"].includes(type);
}

function professorCanTeach(professor, course) {
  const courseEligible = normalizeProfessorRefs(course.eligible);
  const professorCanTeachList = normalizeCourseRefs(professor.canTeach);
  const courseAllows = courseEligible.includes(professor.id);
  const professorAllows = professorCanTeachList.includes(course.id);
  if (course.type === "seminar" && !isFacultyType(professor.type)) return false;
  return courseAllows && professorAllows;
}

function roomMatchesCourse(room, course) {
  if (!room) return false;
  if (room.enabled === false) return false;
  if (course.roomType === "lecture") return room.type === "lecture";
  if (course.roomType === "lab") return room.type === "lab" || room.type === "computer";
  if (course.roomType === "computer") return room.type === "computer";
  return true;
}

function shouldSplitAcrossDays(course) {
  if (isPPracticeCourse(course)) return false;
  const pattern = parsePattern(course.pattern);
  return course.type === "theory" && toNumber(course.credits, 0) >= 3 && pattern.reduce((sum, value) => sum + value, 0) >= 3;
}

function isRotcBlocked(course, block) {
  if (!state.constraints.enforceRotc) return false;
  if (toNumber(course.year, 0) < 3) return false;
  if (!["화", "목"].includes(block.day)) return false;
  const periods = blockSlots(block).map((slot) => Number(slot.split("-")[1]));
  return periods.some((period) => period >= 7 && period <= 10);
}

function parseAvailability(text) {
  const all = new Set(DAYS.flatMap((day) => PERIODS.map((period) => slotKey(day, period))));
  if (!String(text || "").trim()) return all;
  const matches = [...String(text).matchAll(/([월화수목금])\s*([0-9]{1,2})(?:\s*-\s*([0-9]{1,2}))?/g)];
  if (!matches.length) return all;
  const set = new Set();
  matches.forEach((match) => {
    const day = match[1];
    const start = Math.max(1, Math.min(14, Number(match[2])));
    const end = Math.max(start, Math.min(14, Number(match[3] || match[2])));
    for (let period = start; period <= end; period += 1) {
      set.add(slotKey(day, period));
    }
  });
  return set;
}

function parseFixed(text) {
  const match = String(text || "").trim().match(/^([월화수목금])\s*([0-9]{1,2})$/);
  if (!match) return null;
  const start = Number(match[2]);
  if (start < 1 || start > 14) return null;
  return { day: match[1], start };
}

function parsePattern(value) {
  if (Array.isArray(value)) return value.map((item) => toNumber(item, 0)).filter((item) => item > 0);
  const result = String(value || "")
    .split(/[+,/xX\s]+/)
    .map((item) => toNumber(item, 0))
    .filter((item) => item > 0);
  return result.length ? result : [1];
}

function parseList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueList(values) {
  return values.filter((value, index, list) => value && list.indexOf(value) === index);
}

function blockSlots(block) {
  return Array.from({ length: block.duration }, (_, index) => slotKey(block.day, block.start + index));
}

function slotKey(day, period) {
  return `${day}-${period}`;
}

function overlapsBlocks(blocks, block) {
  const existing = new Set(blocks.flatMap((item) => blockSlots(item)));
  return blockSlots(block).some((slot) => existing.has(slot));
}

function formatSlot(slot) {
  const [day, period] = slot.split("-");
  return `${day}${period}교시`;
}

function formatBlocks(blocks) {
  if (!blocks.length) return "-";
  return blocks.map((block) => `${block.day}${block.start}-${block.start + block.duration - 1}교시`).join(", ");
}

function formatPattern(pattern) {
  return parsePattern(pattern).join("+");
}

function formatNumber(value) {
  const number = toNumber(value, 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function findById(list, id) {
  return list.find((item) => item.id === id);
}

function roomTypeLabel(type) {
  return { lecture: "이론 강의실", lab: "실험실", computer: "전산/실습실" }[type] || type;
}

function activeRooms() {
  return state.rooms.filter((room) => room.enabled !== false);
}

function roomShort(room) {
  if (!room) return "";
  return String(room.name || room.id).replace(/\s*(강의실|실험실|전산실)$/g, "");
}

function mapAssignmentLevels(violations) {
  const map = new Map();
  violations.forEach((violation) => {
    if (!violation.assignmentId) return;
    const existing = map.get(violation.assignmentId);
    if (existing === "hard") return;
    map.set(violation.assignmentId, violation.level === "hard" ? "hard" : "warn");
  });
  return map;
}

function exportJson() {
  const payload = JSON.stringify(state, null, 2);
  downloadFile(`sisu-${state.semester}-data.json`, payload, "application/json;charset=utf-8");
}

function exportCsv() {
  const headers = ["학기", "과목코드", "과목명", "분반", "교수", "강의실", "시간", "인원", "시수"];
  const rows = state.schedule.map((item) => {
    const course = findById(state.courses, item.courseId);
    const professor = findById(state.professors, item.professorId);
    const room = findById(state.rooms, item.roomId);
    return [
      state.semester,
      course?.id || item.courseId,
      course?.name || "",
      item.sectionNo,
      professor?.name || "",
      room?.name || "",
      formatBlocks(item.blocks || []),
      item.seats || 0,
      formatNumber(item.loadUnit || 0)
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadFile(`sisu-${state.semester}-assignments.csv`, `\ufeff${csv}`, "text/csv;charset=utf-8");
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name.replace(/[\\/:*?"<>|]+/g, "_");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result));
      state = normalizeState({ ...clone(defaultData), ...imported });
      saveState();
      renderAll();
    } catch {
      alert("JSON 파일을 읽을 수 없습니다.");
    } finally {
      els.importFile.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function mulberry32(seed) {
  return function rng() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
