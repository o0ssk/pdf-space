export type LandingLocale = "ar" | "en";

export type FeatureItem = {
  id: string;
  title: string;
  tag: string;
  description: string;
};

export type LandingCopy = {
  navigation: {
    home: string;
    product: string;
    features: string;
    howItWorks: string;
    trust: string;
    faq: string;
    login: string;
    openApp: string;
    openMenu: string;
    closeMenu: string;
    dismissMenu: string;
    switchLanguage: string;
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
    sourceName: string;
    sourceMeta: string;
    destinationName: string;
    destinationMeta: string;
    sourceRole: string;
    destinationRole: string;
    activePageLabel: string;
    destinationSlotLabel: string;
    sceneDescription: string;
    transferStatus: string;
    tools: readonly string[];
  };
  showcase: {
    title: string;
    description: string;
    tabs: readonly [string, string, string];
    documentNames: readonly [string, string];
  };
  features: {
    eyebrow: string;
    title: string;
    description: string;
    items: readonly FeatureItem[];
  };
  trust: {
    eyebrow: string;
    title: string;
    description: string;
    metrics: readonly {
      value: string;
      label: string;
      sublabel: string;
    }[];
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    description: string;
    steps: readonly {
      number: string;
      title: string;
      description: string;
    }[];
  };
  faq: {
    eyebrow: string;
    title: string;
    description: string;
    items: readonly {
      question: string;
      answer: string;
    }[];
  };
  finalCta: {
    eyebrow: string;
    title: string;
    description: string;
    action: string;
    footnote: string;
  };
  footer: {
    description: string;
    legal: string;
    privacy: string;
    terms: string;
    socialComingSoon: string;
    copyright: string;
  };
  comingSoon: {
    eyebrow: string;
    title: string;
    descriptions: Record<"login" | "privacy" | "terms", string>;
    returnHome: string;
    openApp: string;
  };
};

export const landingCopy: Record<LandingLocale, LandingCopy> = {
  en: {
    navigation: {
      home: "Overview",
      product: "Studio",
      features: "Capabilities",
      howItWorks: "Process",
      trust: "Architecture",
      faq: "FAQ",
      login: "Sign In",
      openApp: "Open Studio",
      openMenu: "Open navigation",
      closeMenu: "Close navigation",
      dismissMenu: "Dismiss navigation",
      switchLanguage: "العربية",
    },
    hero: {
      badge: "Local-First Architecture • Zero Cloud Uploads • End-to-End Privacy",
      title: "Quiet power for your PDF documents.",
      description:
        "An elegant, tactile workspace to merge, split, reorganize, compress, and inspect PDF files with millimeter precision. All processed in-memory directly within your browser.",
      primaryAction: "Open Workspace",
      secondaryAction: "Explore Capabilities",
      sourceName: "Financial Report 2026.pdf",
      sourceMeta: "4 source pages",
      destinationName: "Board Dossier.pdf",
      destinationMeta: "Active document",
      sourceRole: "Source File",
      destinationRole: "Target Assembly",
      activePageLabel: "Page 02",
      destinationSlotLabel: "Slot 03",
      sceneDescription:
        "A crisp financial page lifts effortlessly from its source and docks into the target document with mathematical precision.",
      transferStatus: "Page docked. Source preserved.",
      tools: ["Merge", "Split", "Compress", "Convert", "Organize", "AI Tools"],
    },
    showcase: {
      title: "See document geometry before you materialize it.",
      description:
        "A calm, spatial canvas keeps every document boundary, page orientation, and source lineage visible at a glance.",
      tabs: ["Spatial Canvas", "Tactile Reordering", "Bilingual Text Query"],
      documentNames: ["Financial Report 2026.pdf", "Board Dossier.pdf"],
    },
    features: {
      eyebrow: "The Core Toolkit",
      title: "Engineered for speed, precision, and complete stillness.",
      description:
        "Eight essential capabilities crafted to replace clunky legacy utilities with one unified, calm surface.",
      items: [
        {
          id: "merge",
          title: "Merge PDF",
          tag: "Assembly",
          description:
            "Unite disparate files into a cohesive, perfectly ordered publication with preserved bookmarks and vector fidelity.",
        },
        {
          id: "split",
          title: "Split PDF",
          tag: "Extraction",
          description:
            "Surgically extract chapters, isolate single sheets, or partition voluminous reports into standalone documents.",
        },
        {
          id: "compress",
          title: "Compress PDF",
          tag: "Optimization",
          description:
            "Lossless stream compaction that strips redundant overhead while keeping text and diagrams razor-sharp.",
        },
        {
          id: "convert",
          title: "Convert PDF",
          tag: "Interoperability",
          description:
            "Standard-compliant export that ensures universal rendering across every reader, operating system, and print engine.",
        },
        {
          id: "organize",
          title: "Organize Documents",
          tag: "Structure",
          description:
            "Group, name, and categorize multiple PDFs across an open architectural canvas inspired by physical drafting tables.",
        },
        {
          id: "rearrange",
          title: "Rearrange Pages",
          tag: "Sequencing",
          description:
            "Fluid drag-and-drop page sorting, instant 90° rotation, page cloning, and safe non-destructive removal.",
        },
        {
          id: "ai-tools",
          title: "AI PDF Tools",
          tag: "Intelligence",
          description:
            "In-memory semantic search, deep Arabic and English text indexing, and rapid contextual snippet discovery.",
        },
        {
          id: "workspace",
          title: "Smart Workspace",
          tag: "Local-First",
          description:
            "Automatic local state persistence in IndexedDB. Close your tab anytime and resume instantly with zero data loss.",
        },
      ],
    },
    trust: {
      eyebrow: "Absolute Privacy",
      title: "Your documents belong exclusively on your hardware.",
      description:
        "Traditional web PDF utilities silently upload your private contracts and statements to remote servers. PDF Space runs entirely within your browser's WebAssembly sandbox. Not a single byte ever crosses the network.",
      metrics: [
        {
          value: "0 ms",
          label: "Upload Latency",
          sublabel: "Processed instantly in client memory",
        },
        {
          value: "0 bytes",
          label: "Data Transferred",
          sublabel: "No servers, no tracking, no cloud storage",
        },
        {
          value: "100%",
          label: "Offline Capable",
          sublabel: "Works seamlessly without internet access",
        },
      ],
    },
    howItWorks: {
      eyebrow: "The Natural Workflow",
      title: "From scattered files to a curated set in four movements.",
      description:
        "A deliberate, distraction-free progression designed to eliminate anxiety and cognitive friction.",
      steps: [
        {
          number: "01",
          title: "Ingest",
          description:
            "Drop any number of local PDFs onto the canvas. Files are decoded in Web Workers with zero upload waiting time.",
        },
        {
          number: "02",
          title: "Curate",
          description:
            "Group related documents, create empty destination folders, and inspect high-resolution page thumbnails.",
        },
        {
          number: "03",
          title: "Refine",
          description:
            "Rearrange pages, rotate orientations, extract chapters, or perform deep Arabic & English text queries.",
        },
        {
          number: "04",
          title: "Materialize",
          description:
            "Download pristine, standard-compliant PDF files individually or bundled into a single organized ZIP package.",
        },
      ],
    },
    faq: {
      eyebrow: "Answers",
      title: "Designed with clarity and transparency.",
      description:
        "Everything you need to know about architecture, privacy, compatibility, and file integrity.",
      items: [
        {
          question: "How does PDF Space ensure my documents remain confidential?",
          answer:
            "All PDF decoding, page materialization, text search, and document assembly are executed exclusively in your browser using modern WebAssembly and Web Workers. Your files are never transmitted to any external server or third-party service.",
        },
        {
          question: "Can I merge and split multiple large documents simultaneously?",
          answer:
            "Yes. PDF Space is optimized for high-volume document workflows. You can import multiple multi-page PDFs, cross-drag pages between them, duplicate groups, and partition files with smooth 60fps performance.",
        },
        {
          question: "How does text search work with Arabic and English documents?",
          answer:
            "The platform features a custom geometric text reconstruction engine that respects bidirectional script flow. English reads left-to-right, Arabic reads right-to-left, and search snippets are presented with authentic typographic context.",
        },
        {
          question: "Are my workspace projects saved if I refresh or close the tab?",
          answer:
            "Yes. PDF Space utilizes browser IndexedDB to persist your workspaces locally on your device. When you reopen the studio, your documents, page arrangements, and project state are instantly restored.",
        },
        {
          question: "What formats can I export?",
          answer:
            "You can export individual document groups as standard PDF files, or export multiple organized groups simultaneously packaged inside a clean, structured ZIP archive.",
        },
        {
          question: "Is there any cost, subscription, or watermark?",
          answer:
            "PDF Space is completely free of watermarks, limitations, and accounts. It is designed as a pure, focused software instrument.",
        },
      ],
    },
    finalCta: {
      eyebrow: "Begin Now",
      title: "Experience the stillness of modern document craft.",
      description:
        "No signup required. No files uploaded. Start organizing, merging, and splitting your PDFs in seconds.",
      action: "Launch Workspace",
      footnote: "Free • Private by Design • No Account Required",
    },
    footer: {
      description:
        "A premium, local-first visual workspace for modern PDF engineering, page curation, and document architecture.",
      legal: "Legal & Policy",
      privacy: "Privacy Standard",
      terms: "Terms of Architecture",
      socialComingSoon: "Community links arriving soon",
      copyright: "PDF Space. Handcrafted for clarity and privacy.",
    },
    comingSoon: {
      eyebrow: "Coming Soon",
      title: "This section is currently being refined.",
      descriptions: {
        login:
          "Accounts are optional and planned for future multi-device sync. The core studio is fully operational locally today.",
        privacy:
          "Our privacy commitment is mathematical: zero files leave your browser. Comprehensive legal documentation is being formatted.",
        terms:
          "Terms of service documentation is in preparation. PDF Space operates locally on your machine.",
      },
      returnHome: "Return to Studio",
      openApp: "Open Workspace",
    },
  },
  ar: {
    navigation: {
      home: "نظرة عامة",
      product: "الاستوديو",
      features: "القدرات",
      howItWorks: "الآلية",
      trust: "المعمارية",
      faq: "الأسئلة",
      login: "تسجيل الدخول",
      openApp: "فتح الاستوديو",
      openMenu: "فتح قائمة التنقل",
      closeMenu: "إغلاق قائمة التنقل",
      dismissMenu: "إخفاء قائمة التنقل",
      switchLanguage: "English",
    },
    hero: {
      badge: "معمارية محلية بالكامل • خصوصية تامة • معالجة داخل المتصفح",
      title: "قوة هادئة لجميع مستنداتك.",
      description:
        "مساحة عمل مصممة بأعلى معايير الإتقان لدمج ملفات PDF، وتقسيمها، وإعادة ترتيب صفحاتها، وضغطها، واستخراج نصوصها بدقة متناهية ودون إرسال بايت واحد إلى خوادم خارجية.",
      primaryAction: "فتح مساحة العمل",
      secondaryAction: "استكشف القدرات",
      sourceName: "التقرير المالي 2026.pdf",
      sourceMeta: "٤ صفحات أصلية",
      destinationName: "ملف الإدارة التنفيذية.pdf",
      destinationMeta: "مستند نشط",
      sourceRole: "الملف المصدر",
      destinationRole: "المستند الهدف",
      activePageLabel: "صفحة 02",
      destinationSlotLabel: "موضع 03",
      sceneDescription:
        "ترتفع صفحة مستند بسلاسة من الملف المصدر لتستقر بدقة في المستند الهدف مع الحفاظ على سلامة المصدر الأصلي.",
      transferStatus: "تم نقل الصفحة. المصدر محفوظ بدقة.",
      tools: ["دمج", "تقسيم", "ضغط", "تحويل", "تنظيم", "أدوات الذكاء الاصطناعي"],
    },
    showcase: {
      title: "شاهد بنية المستند قبل استخراجه.",
      description:
        "مساحة هادئة تضع أمامك حدود المستندات، وترتيب الصفحات، والمصادر الأصلية في مشهد بصري متناسق.",
      tabs: ["الرقعة البصرية", "الترتيب الدقيق", "البحث ثنائي اللغة"],
      documentNames: ["التقرير المالي 2026.pdf", "ملف الإدارة التنفيذية.pdf"],
    },
    features: {
      eyebrow: "الأدوات الأساسية",
      title: "مصممة للسرعة، والدقة، والهدوء التام.",
      description:
        "ثماني قدرات جوهرية صُممت لتحل محل الأدوات التقليدية المعقدة بواجهة واحدة نقية وأنيقة.",
      items: [
        {
          id: "merge",
          title: "دمج PDF",
          tag: "تجميع",
          description:
            "اجمع عدة ملفات منفصلة في وثيقة متكاملة واحدة فائقة الجودة مع الحفاظ على الدقة الخطية والهيكلية.",
        },
        {
          id: "split",
          title: "تقسيم PDF",
          tag: "استخراج",
          description:
            "استخرج الفصول، أو اعزل صفحات محددة، أو قسّم التقارير الكبيرة إلى مستندات مستقلة في ثوانٍ.",
        },
        {
          id: "compress",
          title: "ضغط PDF",
          tag: "تحسين الحجم",
          description:
            "تقليص ذكي لحجم المستند يزيل البيانات الزائدة مع المحافظة التامة على نقاء النصوص والرسومات.",
        },
        {
          id: "convert",
          title: "تحويل PDF",
          tag: "توافق قياسي",
          description:
            "تصدير قياسي معتمد عالميًا يضمن ظهور المستند بالدقة ذاتها على كافة الأجهزة والشاشات والطابعات.",
        },
        {
          id: "organize",
          title: "تنظيم المستندات",
          tag: "هيكلة",
          description:
            "رتّب المستندات وسمّها داخل رقعة عمل مفتوحة مستوحاة من طاولات التصميم المعماري الحديث.",
        },
        {
          id: "rearrange",
          title: "ترتيب الصفحات",
          tag: "إعادة تنظيم",
          description:
            "إعادة ترتيب سلسة بالسحب والإفلات، تدوير فوري بزاوية ٩٠ درجة، وتكرار الصفحات وحذفها بأمان تام.",
        },
        {
          id: "ai-tools",
          title: "أدوات الذكاء الاصطناعي",
          tag: "بحث ذكي",
          description:
            "بحث نصي فوري داخل صفحات PDF يدعم العربية والإنجليزية مع إبراز النصوص وسياقها بدقة متناهية.",
        },
        {
          id: "workspace",
          title: "مساحة عمل ذكية",
          tag: "محلية بالكامل",
          description:
            "حفظ تلقائي للمشروع محليًا داخل متصفحك. أغلق الصفحة في أي وقت وعد إليها لتجد كل شيء كما تركته.",
        },
      ],
    },
    trust: {
      eyebrow: "خصوصية مطلقة",
      title: "مستنداتك ملك لك وحدك، ولا تغادر جهازك أبدًا.",
      description:
        "المواقع التقليدية ترفع ملفاتك الخاصة وعقودك الحساسة إلى خوادم بعيدة غير معلومة. أما PDF Space فيعمل بالكامل عبر تقنيات WebAssembly داخل متصفحك، دون إرسال بايت واحد عبر الشبكة.",
      metrics: [
        {
          value: "0 مللي ثانية",
          label: "وقت الرفع",
          sublabel: "معالجة فورية داخل ذاكرة المتصفح",
        },
        {
          value: "0 بايت",
          label: "بيانات مرسلة للخارج",
          sublabel: "لا توجد خوادم خارجية أو تتبع سحابي",
        },
        {
          value: "100%",
          label: "يعمل دون إنترنت",
          sublabel: "إمكانية تشغيل واستخدام كاملة دون اتصال",
        },
      ],
    },
    howItWorks: {
      eyebrow: "التدفق الطبيعي",
      title: "من ملفات مشتتة إلى مستندات متقنة في أربع خطوات.",
      description:
        "تسلسل هادئ ومريح يزيل التعقيد ويمنحك السيطرة الكاملة على كل صفحة.",
      steps: [
        {
          number: "01",
          title: "الاستيراد",
          description:
            "أسقط ملفات PDF مباشرة في مساحة العمل؛ تتم قراءتها فورًا في الذاكرة دون أي انتظار.",
        },
        {
          number: "02",
          title: "الهيكلة",
          description:
            "نظّم الملفات في مجموعات واضحة، وأنشئ مستندات جديدة، واستعرض مصغرات الصفحات عالية الدقة.",
        },
        {
          number: "03",
          title: "التحسين والترتيب",
          description:
            "رتّب الصفحات، دوّر اتجاهها، قسّم الأقسام، أو ابحث في المحتوى النصي بالعربية أو الإنجليزية.",
        },
        {
          number: "04",
          title: "التصدير القياسي",
          description:
            "حمّل ملفات PDF قياسية نظيفة، إما كملف مفرد أو مجمعة في ملف ZIP مرتب وجاهز للمشاركة.",
        },
      ],
    },
    faq: {
      eyebrow: "إجابات",
      title: "إجابات واضحة بكل شفافية.",
      description:
        "كل ما تحتاج إلى معرفته حول الخصوصية، والمعمارية التقنية، وحفظ المستندات وتوافقها.",
      items: [
        {
          question: "كيف يضمن PDF Space حماية وسرية ملفاتي بالكامل؟",
          answer:
            "تتم كافة عمليات فتح الملفات، وتوليد المصغرات، والبحث، والدمج، والتقسيم داخل متصفحك محليًا بالاعتماد على WebAssembly. لا يتم رفع أي مستند إلى أي خادم على الإطلاق.",
        },
        {
          question: "هل يمكنني دمج عدة ملفات ضخمة وإعادة تقسيمها في الوقت نفسه؟",
          answer:
            "نعم. تم تصميم المنصة لتوفر أعلى مستويات الأداء والسلاسة، مما يتيح لك التعامل مع ملفات متعددة ونقل الصفحات بينها بسرعة استجابة فائقة تصل إلى 60 إطارًا بالثانية.",
        },
        {
          question: "كيف يعمل البحث النصي مع المستندات العربية والإنجليزية؟",
          answer:
            "تحتوي المنصة على محرك هندسي متطور يفهم اتجاهات النصوص ثنائية اللغة؛ يتعامل مع العربية من اليمين إلى اليسار والإنجليزية من اليسار إلى اليمين ويظهر النتائج في سياقها الدقيق.",
        },
        {
          question: "هل تبقى مشاريعي محفوظة إذا أغلقت المتصفح أو قمت بتحديث الصفحة؟",
          answer:
            "نعم. يستخدم PDF Space قاعدة بيانات IndexedDB المحلية على جهازك لحفظ مساحة العمل وحالة المستندات تلقائيًا، لتتمكن من المتابعة فور إعادة فتح الاستوديو.",
        },
        {
          question: "ما هي الصيغ والخيارات المتاحة للتصدير؟",
          answer:
            "يمكنك تصدير أي مجموعة مستندات كملف PDF قياسي مستقل، أو تصدير عدة مجموعات معًا داخل ملف ZIP منظم بنقرة واحدة.",
        },
        {
          question: "هل توجد رسوم خفية أو علامات مائية على الملفات المصدرة؟",
          answer:
            "PDF Space أداة نظيفة تمامًا؛ لا توجد أي علامات مائية، ولا قيود على الاستخدام، ولا يتطلب إنشاء أي حساب.",
        },
      ],
    },
    finalCta: {
      eyebrow: "ابدأ الآن",
      title: "جرّب هدوء وإتقان التعامل الحديث مع المستندات.",
      description:
        "لا حاجة للتسجيل، ولا يتم رفع أي ملفات. ابدأ فورًا بتنظيم ودمج وتقسيم ملفات PDF بكل ثقة.",
      action: "تشغيل مساحة العمل",
      footnote: "مجاني بالكامل • خصوصية مطلقة بالتصميم • لا يتطلب حسابًا",
    },
    footer: {
      description:
        "مساحة عمل بصرية متميزة ومحلية بالكامل لهندسة ملفات PDF، وتنظيم الصفحات، وبناء المستندات الحديثة.",
      legal: "الشروط والسياسات",
      privacy: "معيار الخصوصية",
      terms: "شروط الاستخدام",
      socialComingSoon: "روابط المجتمع قريبًا",
      copyright: "PDF Space. صُمم بأعلى درجات العناية والخصوصية.",
    },
    comingSoon: {
      eyebrow: "قريبًا",
      title: "هذا القسم قيد التجهيز بعناية.",
      descriptions: {
        login:
          "الحسابات ميزة اختيارية مخطط لها مستقبلاً لمزامنة الأجهزة. الاستوديو يعمل محليًا بكامل طاقته الآن دون الحاجة لحساب.",
        privacy:
          "التزامنا بالخصوصية مبني على مبدأ تقني صارم: لا تغادر الملفات جهازك أبدًا. التوثيق القانوني قيد المراجعة.",
        terms:
          "وثيقة الشروط والأحكام قيد الإعداد النهائي. يعمل التطبيق محليًا على جهازك.",
      },
      returnHome: "العودة إلى الاستوديو",
      openApp: "فتح مساحة العمل",
    },
  },
};
