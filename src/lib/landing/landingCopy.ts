export type LandingLocale = "ar" | "en";

export type LandingCopy = {
  navigation: {
    home: string;
    product: string;
    features: string;
    howItWorks: string;
    faq: string;
    login: string;
    openApp: string;
    openMenu: string;
    closeMenu: string;
    dismissMenu: string;
    switchLanguage: string;
  };
  hero: {
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
  };
  showcase: {
    title: string;
    description: string;
    tabs: readonly [string, string, string];
    documentNames: readonly [string, string];
  };
  features: {
    title: string;
    description: string;
    items: readonly {
      title: string;
      description: string;
    }[];
  };
  howItWorks: {
    title: string;
    description: string;
    steps: readonly {
      title: string;
      description: string;
    }[];
  };
  faq: {
    title: string;
    description: string;
    items: readonly {
      question: string;
      answer: string;
    }[];
  };
  finalCta: {
    title: string;
    action: string;
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

export const landingCopy = {
  en: {
    navigation: {
      home: "Home",
      product: "Product",
      features: "Features",
      howItWorks: "How It Works",
      faq: "FAQ",
      login: "Login",
      openApp: "Open App",
      openMenu: "Open navigation",
      closeMenu: "Close navigation",
      dismissMenu: "Dismiss navigation",
      switchLanguage: "Switch to Arabic",
    },
    hero: {
      title: "A smarter space for every PDF.",
      description:
        "Organize pages across documents, keep every source clear, and export standard PDF files locally.",
      primaryAction: "Open PDF Space",
      secondaryAction: "Explore the Workspace",
      sourceName: "Report 01",
      sourceMeta: "4 source pages",
      destinationName: "Plans 02",
      destinationMeta: "Open destination",
      sourceRole: "Source document",
      destinationRole: "Destination document",
      activePageLabel: "Page 02",
      destinationSlotLabel: "Position 03",
      sceneDescription:
        "A report page lifts from its source document and settles precisely into an open position in the destination document.",
      transferStatus: "Page moved. Source preserved.",
    },
    showcase: {
      title: "See the structure before you export it.",
      description:
        "A clear workspace keeps every document, page order, and original source visible.",
      tabs: ["Full Workspace", "Page Ordering", "Move Between PDFs"],
      documentNames: ["Report 01", "Plans 02"],
    },
    features: {
      title: "Built around the way PDF work actually happens.",
      description:
        "Four focused tools keep complex document work clear, local, and easy to resume.",
      items: [
        {
          title: "Visual PDF Organization",
          description:
            "Organize multiple PDFs in one visual workspace. Move and reorder pages while preserving the original source of every page.",
        },
        {
          title: "Save and Continue Later",
          description:
            "Keep your project structure saved locally and continue from where you stopped.",
        },
        {
          title: "Search Across Every PDF",
          description:
            "Search document names and PDF text in Arabic and English, then jump directly to the result.",
        },
        {
          title: "Flexible Standard Export",
          description:
            "Export organized documents as standard PDF files, individually or together in a ZIP archive.",
        },
      ],
    },
    howItWorks: {
      title: "From loose files to a clear document set.",
      description:
        "The workspace changes with each step, so the process stays visible from import to export.",
      steps: [
        {
          title: "Create a Project",
          description:
            "Start with a clean local workspace and name the work you want to organize.",
        },
        {
          title: "Import PDFs",
          description:
            "Bring in multiple source files without sending them to an external server.",
        },
        {
          title: "Organize Pages",
          description:
            "Reorder pages or move them between documents while keeping their source identity.",
        },
        {
          title: "Export",
          description:
            "Download one standard PDF or several organized PDFs together in a ZIP archive.",
        },
      ],
    },
    faq: {
      title: "Questions, answered plainly.",
      description:
        "The essentials about local projects, search, page movement, and export.",
      items: [
        {
          question: "What is PDF Space?",
          answer:
            "PDF Space is a visual workspace for organizing pages across multiple PDF documents while keeping each page connected to its original source.",
        },
        {
          question: "Are my PDF files uploaded to a server?",
          answer:
            "No. PDF processing and project storage happen locally in your browser. PDF Space does not upload your files.",
        },
        {
          question: "Can I save a project and continue later?",
          answer:
            "Yes. Projects are saved in this browser so you can reopen them later. Clearing site data can remove those local projects.",
        },
        {
          question: "Can PDF Space search Arabic and English text?",
          answer:
            "Yes. It can search embedded PDF text in Arabic and English. Scanned pages without embedded text require OCR, which is not included.",
        },
        {
          question: "What export formats are supported?",
          answer:
            "You can export one document as a standard PDF, or export several documents as separate PDFs inside one ZIP archive.",
        },
        {
          question: "Can I move pages between different PDFs?",
          answer:
            "Yes. Pages can move between document groups while their original PDF and source page remain traceable.",
        },
      ],
    },
    finalCta: {
      title: "Give every PDF a clearer place.",
      action: "Open PDF Space",
    },
    footer: {
      description:
        "A local-first visual workspace for organizing PDF pages and exporting standard files.",
      legal: "Legal",
      privacy: "Privacy Policy",
      terms: "Terms of Use",
      socialComingSoon: "Social links coming soon",
      copyright: "PDF Space. All rights reserved.",
    },
    comingSoon: {
      eyebrow: "Coming soon",
      title: "This part of PDF Space is still being prepared.",
      descriptions: {
        login:
          "Accounts are planned, but the current product works locally without signing in.",
        privacy:
          "The complete Privacy Policy is being prepared. PDF files currently stay in your browser and are not uploaded by PDF Space.",
        terms:
          "The complete Terms of Use are being prepared. No placeholder legal terms are shown here.",
      },
      returnHome: "Return Home",
      openApp: "Open PDF Space",
    },
  },
  ar: {
    navigation: {
      home: "الرئيسية",
      product: "المنتج",
      features: "المزايا",
      howItWorks: "كيف يعمل",
      faq: "الأسئلة",
      login: "تسجيل الدخول",
      openApp: "فتح التطبيق",
      openMenu: "فتح قائمة التنقل",
      closeMenu: "إغلاق قائمة التنقل",
      dismissMenu: "إخفاء قائمة التنقل",
      switchLanguage: "التبديل إلى الإنجليزية",
    },
    hero: {
      title: "مساحة أذكى لكل ملفات PDF.",
      description:
        "نظّم الصفحات بين المستندات، واحتفظ بمصدر كل صفحة، وصدّر ملفات PDF قياسية محليًا.",
      primaryAction: "فتح PDF Space",
      secondaryAction: "استكشف مساحة العمل",
      sourceName: "Report 01",
      sourceMeta: "٤ صفحات مصدر",
      destinationName: "Plans 02",
      destinationMeta: "وجهة مفتوحة",
      sourceRole: "المستند المصدر",
      destinationRole: "المستند الهدف",
      activePageLabel: "الصفحة 02",
      destinationSlotLabel: "الموضع 03",
      sceneDescription:
        "ترتفع صفحة تقرير من مستندها المصدر وتستقر بدقة في موضع مفتوح داخل المستند الهدف.",
      transferStatus: "تم نقل الصفحة مع حفظ المصدر.",
    },
    showcase: {
      title: "شاهد بنية الملفات قبل تصديرها.",
      description:
        "مساحة واضحة تُظهر كل مستند وترتيب الصفحات والمصدر الأصلي لكل صفحة.",
      tabs: ["مساحة العمل", "ترتيب الصفحات", "النقل بين الملفات"],
      documentNames: ["Report 01", "Plans 02"],
    },
    features: {
      title: "أدوات مصممة لطريقة العمل الحقيقية مع ملفات PDF.",
      description:
        "أربع قدرات مركزة تجعل تنظيم المستندات واضحًا ومحليًا وسهل المتابعة لاحقًا.",
      items: [
        {
          title: "تنظيم بصري لملفات PDF",
          description:
            "نظّم عدة ملفات PDF داخل مساحة عمل بصرية واحدة، وانقل الصفحات ورتّبها مع الاحتفاظ بمصدر كل صفحة.",
        },
        {
          title: "الحفظ والمتابعة لاحقًا",
          description:
            "احفظ بنية مشروعك محليًا، ثم عد إليه لاحقًا وأكمل من النقطة التي توقفت عندها.",
        },
        {
          title: "البحث في كل الملفات",
          description:
            "ابحث في أسماء المستندات ومحتوى صفحات PDF بالعربية والإنجليزية، وانتقل مباشرة إلى النتيجة.",
        },
        {
          title: "تصدير قياسي ومرن",
          description:
            "صدّر المستندات المرتبة كملفات PDF قياسية، منفردة أو مجمعة داخل ملف ZIP.",
        },
      ],
    },
    howItWorks: {
      title: "من ملفات متفرقة إلى مجموعة مستندات واضحة.",
      description:
        "تتغير واجهة العرض مع كل خطوة لتظل العملية مفهومة من الاستيراد حتى التصدير.",
      steps: [
        {
          title: "أنشئ مشروعًا",
          description:
            "ابدأ بمساحة عمل محلية نظيفة وامنح المشروع اسمًا واضحًا.",
        },
        {
          title: "استورد ملفات PDF",
          description:
            "أضف عدة ملفات مصدر من جهازك من دون إرسالها إلى خادم خارجي.",
        },
        {
          title: "نظّم الصفحات",
          description:
            "غيّر ترتيب الصفحات أو انقلها بين المستندات مع حفظ هوية مصدرها.",
        },
        {
          title: "صدّر الملفات",
          description:
            "نزّل ملف PDF قياسيًا واحدًا أو عدة ملفات منظمة داخل ملف ZIP.",
        },
      ],
    },
    faq: {
      title: "إجابات واضحة عن الأسئلة المهمة.",
      description:
        "ما تحتاج إلى معرفته عن المشاريع المحلية والبحث ونقل الصفحات والتصدير.",
      items: [
        {
          question: "ما هو PDF Space؟",
          answer:
            "PDF Space مساحة عمل بصرية لتنظيم الصفحات بين عدة مستندات PDF مع إبقاء كل صفحة مرتبطة بمصدرها الأصلي.",
        },
        {
          question: "هل يتم رفع ملفات PDF إلى خادم خارجي؟",
          answer:
            "لا. تتم معالجة الملفات وحفظ المشروع محليًا داخل متصفحك، ولا يرفع PDF Space ملفاتك.",
        },
        {
          question: "هل يمكنني حفظ المشروع والعودة إليه لاحقًا؟",
          answer:
            "نعم. تُحفظ المشاريع داخل هذا المتصفح لتفتحها لاحقًا. قد يؤدي مسح بيانات الموقع إلى حذف هذه المشاريع المحلية.",
        },
        {
          question: "هل يدعم PDF Space البحث بالعربية والإنجليزية؟",
          answer:
            "نعم. يمكنك البحث في النص المضمّن داخل ملفات PDF بالعربية والإنجليزية. الصفحات المصورة تحتاج إلى OCR، وهو غير متاح حاليًا.",
        },
        {
          question: "ما صيغ التصدير التي يدعمها؟",
          answer:
            "يمكنك تصدير مستند واحد كملف PDF قياسي، أو عدة مستندات كملفات PDF منفصلة داخل ملف ZIP.",
        },
        {
          question: "هل يمكن نقل الصفحات بين ملفات PDF مختلفة؟",
          answer:
            "نعم. يمكن نقل الصفحات بين مجموعات المستندات مع بقاء ملف المصدر ورقم الصفحة الأصلية واضحين.",
        },
      ],
    },
    finalCta: {
      title: "امنح كل ملف PDF مكانًا أوضح.",
      action: "فتح PDF Space",
    },
    footer: {
      description:
        "مساحة عمل بصرية محلية لتنظيم صفحات PDF وتصدير ملفات قياسية.",
      legal: "قانوني",
      privacy: "سياسة الخصوصية",
      terms: "شروط الاستخدام",
      socialComingSoon: "روابط التواصل قريبًا",
      copyright: "PDF Space. جميع الحقوق محفوظة.",
    },
    comingSoon: {
      eyebrow: "قريبًا",
      title: "هذا الجزء من PDF Space لا يزال قيد الإعداد.",
      descriptions: {
        login:
          "الحسابات مخطط لها، لكن المنتج الحالي يعمل محليًا من دون تسجيل الدخول.",
        privacy:
          "سياسة الخصوصية الكاملة قيد الإعداد. تبقى ملفات PDF حاليًا داخل متصفحك ولا يرفعها PDF Space.",
        terms:
          "شروط الاستخدام الكاملة قيد الإعداد، ولن نعرض نصوصًا قانونية مؤقتة أو غير مكتملة.",
      },
      returnHome: "العودة للرئيسية",
      openApp: "فتح PDF Space",
    },
  },
} as const satisfies Record<LandingLocale, LandingCopy>;
