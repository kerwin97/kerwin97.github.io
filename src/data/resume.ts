export interface WorkExperience {
  company: string;
  role: string;
  period: string;
  bullets: string[];
  demo?: "tradePipeline";
}

export interface SkillGroup {
  category: string;
  items: string[];
  featured?: string[];
}

export interface Project {
  name: string;
  context: string;
  period: string;
  bullets: string[];
  tags: string[];
}

export interface Education {
  institution: string;
  degree: string;
  period: string;
}

export const personal = {
  name: "Lim Shi Chen Kerwin",
  displayName: "Kerwin Lim",
  title: "Software Engineer",
  location: "Singapore",
  email: "kerwinlim97@gmail.com",
  phone: "+65-82220812",
};

export const experience: WorkExperience[] = [
  {
    company: "Goldman Sachs",
    role: "Associate Software Engineer",
    period: "Apr 2025 – Present",
    demo: "tradePipeline",
    bullets: [
      "Optimized distributed systems utilizing Java and Akka for actor-based concurrency, enhancing data pipeline throughput and reducing processing latency while managing hardware limitations.",
      "Architected and managed high-volume data streaming pipelines leveraging Kafka and RabbitMQ, significantly improving system scalability and reliability for handling 10k+ transactions/messages daily.",
      "Led Site Reliability Engineering initiatives for the platform by developing React + REST API dashboards for users to define and monitor SLOs/SLIs, enhancing system observability and uptime.",
      "Led AI initiatives by integrating an agentic AI workflow assistant and writing skills that eliminated manual support triage time by identifying false positives and suggesting actionable fixes.",
      "Built and maintained backend services in a proprietary object-oriented language to support finance workflows and regulatory requirements, while onboarding multiple trading desks by delivering new features, managing resource utilization, and coordinating closely with cross-functional stakeholders.",
    ],
  },
  {
    company: "Kulicke & Soffa",
    role: "Advanced Software (Systems) Engineer",
    period: "Jul 2022 – Apr 2025",
    bullets: [
      "Built real-time C++ systems on VxWorks and Linux over hypervisor for semiconductor equipment, designing multi-threaded data pipelines and integrating telemetry streams with monitoring services.",
      "Owned end-to-end delivery of Vertical Wire Height Monitor, building Qt/C++ applications (MVC, 10+ UI screens, custom X11 rendering) integrated with real-time wire visualization, hardware control, SQLite database.",
      "Designed and implemented logging and telemetry export capabilities across 10+ features, such as vision data, reducing debugging time by 80% for both customers and in-house engineers.",
      "Extended the real-time process-monitoring pipeline by adding new signals and dashboards using FlatBuffers, SQLite, and Python analytics services, improving error detection coverage.",
      "Developed automated calibration tools using computer vision and mathematical modeling to compensate for temperature-induced drift, reducing manual calibration time by 30%.",
      "Maintained code quality using cppcheck, PVS-Studio, and clang-tidy static analysis tools. Managed cross-platform builds (Windows/Linux) with CMake and collaborated via Git, Jira, and Confluence in an agile environment across the global teams.",
    ],
  },
  {
    company: "GWS",
    role: "Machine Learning Engineer Intern",
    period: "May 2022 – Jul 2022",
    bullets: [
      "Led a 3-person engineering team to develop an end-to-end audio biodiversity monitoring system, utilizing Python and TensorFlow to automate the identification of 4 distinct poultry species in noisy environments.",
      "Implemented unsupervised clustering algorithms (K-Means, DBSCAN, GMM), utilizing the Elbow Method and BIC scores to optimize hyper parameters Architected a semi-supervised learning framework combining a Convolutional Neural Network (CNN) for feature extraction with Gaussian Mixture Models (GMM).",
      "Facilitated data-driven decision making by translating technical findings into actionable insights in stakeholder presentations, communicating model performance metrics (Confusion Matrices, Log Loss) to guide project strategy",
    ],
  },
  {
    company: "Gullie",
    role: "Frontend Developer",
    period: "Jun 2020 – Dec 2020",
    bullets: [
      "Built the company's cross-platform mobile app in Flutter and Dart, delivering iOS and Android from a single codebase.",
      "Connected the app's screens to live data through Firebase and SQL-backed services.",
      "Worked in a small, fast-moving startup team, taking features from design through development and testing and iterating quickly on user feedback.",
    ],
  },
];

export const skills: SkillGroup[] = [
  {
    category: "Languages",
    items: ["Java", "JavaScript", "TypeScript", "Python", "R", "C", "C++", "Dart", "SQL", "HTML", "CSS", "Shell Scripting"],
    featured: ["Java", "JavaScript", "TypeScript", "Python", "C++"],
  },
  {
    category: "Frameworks & Libraries",
    items: ["React", "React Native", "Flutter", "Next.js", "Node.js", "MaterialUI", "REST API", "Figma", "Balsamiq", "Robot", "LabView"],
    featured: ["React"],
  },
  {
    category: "Databases & Tools",
    items: ["MongoDB", "NoSQL", "MySQL", "PostgreSQL", "Hadoop", "Spark", "Docker", "Unix", "Linux", "Git", "Kafka", "RabbitMQ"],
    featured: [],
  },
  {
    category: "ML & Data Analytics",
    items: ["Pandas", "NumPy", "Seaborn", "Tableau", "Streamlit", "Scikit-Learn", "TensorFlow", "PyTorch", "PowerBI"],
    featured: ["Python"],
  },
];

export const projects: Project[] = [
  {
    name: "Space Together",
    context: "Hack&Roll Hackathon",
    period: "May 2021",
    bullets: [
      "Developed a mobile application in Swift in tandem with CoreBluetooth and BlueTrace that alerted users with a fun customizable ringtone when they were too close to other people.",
      "Intended to encourage and make safe distancing fun during COVID-19.",
    ],
    tags: ["Swift", "CoreBluetooth", "BlueTrace"],
  },
  {
    name: "NapMap",
    context: "Project Orbital",
    period: "May 2019",
    bullets: [
      "Used React Native and Google API to develop a mobile application that used geolocation to alert users that they were reaching their destination.",
    ],
    tags: ["React Native", "Google Maps API"],
  },
  {
    name: "LegalAlligator",
    context: "Legal Tech Hackathon",
    period: "May 2019",
    bullets: [
      "Built a React web application to help people seeking legal help categorize and understand their options.",
      "Designed an intuitive UI that guides users through legal scenarios, surfacing relevant resources and next steps based on their situation.",
    ],
    tags: ["React", "JavaScript"],
  },
];

export const education: Education[] = [
  {
    institution: "National University of Singapore (NUS)",
    degree: "Bachelor of Computing (Computer Science), Honours",
    period: "Aug 2018 – May 2022",
  },
];

export const additional = [
  "Fluent in English and Mandarin (both spoken and written)",
  "Touch Rugby Club and Varsity Player",
  "Ex-National and Varsity International Chess Player",
];
