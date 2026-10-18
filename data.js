/* ============================================================
   ICT Secondary — data.js
   UI copy (Arabic / English) + curriculum structure
   (years -> terms -> units). Units are defined in the
   data-units-*.js files loaded before this file.
   ============================================================ */

var COPY = {
  ar: {
    brand: 'منصة ICT الثانوية', brandSub: 'تكنولوجيا المعلومات والاتصالات',
    unitsTitle: 'الوحدات الدراسية', overall: 'تقدمك العام', certificate: 'شهادة الإكمال',
    footer: 'تعلّم بالتجربة — كل محاولة تقرّبك من الإتقان.',
    profileTitle: 'ملفك الشخصي', name: 'الاسم', points: 'النقاط', certs: 'الشهادات',
    reset: 'إعادة تعيين التقدم', certTitle: 'الشهادة', certHead: 'شهادة إتمام',
    certSub: 'تُمنح هذه الشهادة إلى', certCourse: 'لإتمامه بنجاح مسار',
    certDownload: 'تحميل / طباعة الشهادة', certProgress: 'شهادة تقدّم',
    lesson: 'الدرس', of: 'من', completed: 'مكتمل', notCompleted: 'غير مكتمل',
    start: 'ابدأ الدرس', reopen: 'إعادة فتح', markDone: 'تحديد كمكتمل',
    markUndone: 'تحديد كغير مكتمل', backToUnit: 'العودة للوحدة',
    concepts: 'المفاهيم الأساسية', example: 'مثال تطبيقي', examples: 'أمثلة تطبيقية',
    practice: 'مهمة تطبيقية', lessonGoal: 'هدف الدرس', quizTitle: 'اختبر فهمك',
    check: 'تحقق من الإجابة', retry: 'إعادة المحاولة', correct: 'إجابة صحيحة',
    wrong: 'إجابة غير صحيحة', needAll: 'أجب عن جميع الأسئلة أولاً.',
    passed: 'ممتاز! تم تسجيل إتمام الدرس (+10 نقاط).', again: 'راجع الشرح وحاول مرة أخرى.',
    prev: 'الدرس السابق', next: 'الدرس التالي', run: 'تشغيل الكود', output: 'سيظهر الناتج هنا…',
    runHint: 'جرّب تعديل الكود ثم اضغط تشغيل.', empty: '(لا يوجد ناتج)', error: 'خطأ',
    coming: 'قريباً', comingTitle: 'هذا المحتوى قيد الإعداد',
    comingText: 'نعمل على إضافة منهج هذا الصف/الترم. «أولى ثانوي — الترم الأول» متاح بالكامل الآن.',
    resetConfirm: 'هل تريد إعادة تعيين كل التقدم؟ لا يمكن التراجع.',
    resetDone: 'تم إعادة تعيين التقدم.', pointsToast: 'أحسنت! +10 نقاط',
    t1: 'الترم الأول', t2: 'الترم الثاني', units: 'وحدات', lessons: 'دروس',
    heroTitle: 'مقدمة في تكنولوجيا المعلومات والاتصالات',
    heroText: 'منهج «البرمجة والذكاء الاصطناعي» للصف الأول الثانوي — تعلّم المفاهيم، وطبّق، واختبر نفسك، واكتب بايثون فعلياً.',
    browse: 'تصفّح الوحدات', continueLearning: 'تابع التعلّم', pickLesson: 'اختر درساً للبدء',
    done: 'أُنجز', startCourse: 'ابدأ من هنا', nextLesson: 'الدرس التالي ←', prevLesson: '→ الدرس السابق',
    unit: 'الوحدة', whatYouLearn: 'ماذا ستتعلّم', langName: 'English'
  },
  en: {
    brand: 'ICT Secondary', brandSub: 'Information & Communication Technology',
    unitsTitle: 'Study Units', overall: 'Overall progress', certificate: 'Certificate',
    footer: 'Learn by doing — every attempt brings you closer to mastery.',
    profileTitle: 'Your Profile', name: 'Name', points: 'Points', certs: 'Certificates',
    reset: 'Reset progress', certTitle: 'Certificate', certHead: 'Certificate of Completion',
    certSub: 'This certificate is awarded to', certCourse: 'for successfully completing',
    certDownload: 'Download / Print', certProgress: 'Certificate of Progress',
    lesson: 'Lesson', of: 'of', completed: 'Completed', notCompleted: 'Not completed',
    start: 'Start lesson', reopen: 'Re-open', markDone: 'Mark as completed',
    markUndone: 'Mark as not completed', backToUnit: 'Back to unit',
    concepts: 'Key concepts', example: 'Example', examples: 'Examples',
    practice: 'Practice task', lessonGoal: 'Lesson goal', quizTitle: 'Check your understanding',
    check: 'Check answers', retry: 'Try again', correct: 'Correct', wrong: 'Incorrect',
    needAll: 'Please answer all questions first.', passed: 'Great! Lesson marked complete (+10 pts).',
    again: 'Review the explanation and try again.', prev: 'Previous lesson', next: 'Next lesson',
    run: 'Run code', output: 'Output will appear here…', runHint: 'Edit the code, then press Run.',
    empty: '(no output)', error: 'Error', coming: 'Soon', comingTitle: 'This content is being prepared',
    comingText: 'We are adding this grade/term. “Grade 10 — Term 1” is fully available now.',
    resetConfirm: 'Reset all progress? This cannot be undone.', resetDone: 'Progress reset.',
    pointsToast: 'Well done! +10 pts', t1: 'Term 1', t2: 'Term 2', units: 'units', lessons: 'lessons',
    heroTitle: 'Introduction to ICT',
    heroText: 'The “Programming & AI” curriculum for Grade 10 — learn concepts, practise, self-test, and write real Python.',
    browse: 'Browse units', continueLearning: 'Continue learning', pickLesson: 'Pick a lesson to begin',
    done: 'Done', startCourse: 'Start here', nextLesson: 'Next lesson →', prevLesson: '← Previous lesson',
    unit: 'Unit', whatYouLearn: "What you'll learn", langName: 'العربية'
  }
};

/* Extra UI strings for labs, games, projects and the AI tutor */
Object.assign(COPY.ar, {
  navLessons: 'الدروس', navLabs: 'المعامل', navGames: 'الألعاب', navProjects: 'المشاريع',
  labsTitle: 'المعامل التفاعلية', labsIntro: 'جرّب بنفسك: شفّر النصوص، حوّل الأنظمة العددية، شغّل البوابات المنطقية، وحلّل البيانات.',
  gamesTitle: 'الألعاب والتحديات', gamesIntro: 'العب، اجمع النقاط، واكتشف المفاهيم البرمجية وراء كل لعبة.',
  projectsTitle: 'المشاريع', projectsIntro: 'أفكار مشاريع تطبّق فيها ما تعلّمته في كل وحدة.',
  openLab: 'افتح المعمل', openGame: 'العب الآن', backToList: 'رجوع',
  relatedLab: 'جرّب المعمل التفاعلي', relatedGame: 'العب لعبة عن الوحدة', relatedProject: 'شوف مشاريع الوحدة',
  tutorTitle: 'المدرّس الذكي', tutorIntro: 'اسأل عن أي حاجة في الدرس: اشرح، لخّص، أو هات أمثلة.',
  tutorExplain: 'اشرح تاني', tutorSummary: 'لخّص الدرس', tutorExample: 'مثال جديد', tutorAsk: 'اسأل',
  tutorPlaceholder: 'اكتب سؤالك عن الدرس...', tutorReady: 'متصل', tutorOffline: 'وضع محلي',
  tutorThinking: 'بيكتب...', tutorError: 'معلش، حصلت مشكلة. جرّب تاني.', tutorYou: 'أنت',
  tutorWelcome: 'أهلًا! أنا معاك في الدرس ده. اسألني عن أي نقطة أو اضغط «اشرح تاني».',
  challengeTitle: 'تحدي الدرس', projectSteps: 'خطوات المشروع', unitProjects: 'مشاريع الوحدة',
  showDemo: 'شوف النتيجة (ديمو)', demoHint: 'دي النتيجة النهائية اللي المفروض توصلها — جرّبها بنفسك!',
  demoBadge: 'ديمو', themeLight: 'الوضع النهاري ☀️', themeDark: 'الوضع الليلي 🌙',
  popupBlocked: 'اسمح بالنوافذ المنبثقة للطباعة.',
  ariaMenu: 'فتح القائمة', ariaYear: 'اختيار الصف', titleTerm: 'تبديل الترم', ariaTheme: 'تغيير وضع العرض',
  titleTheme: 'الليلي/النهاري', ariaLang: 'تغيير اللغة', titleLang: 'عربي/English', ariaProfile: 'الملف الشخصي',
  ariaClose: 'إغلاق', ariaUnits: 'الوحدات',
  pointsLbl: 'نقطة', labsCount: 'معمل', gamesCount: 'لعبة'
});
Object.assign(COPY.en, {
  navLessons: 'Lessons', navLabs: 'Labs', navGames: 'Games', navProjects: 'Projects',
  labsTitle: 'Interactive Labs', labsIntro: 'Try it yourself: encrypt text, convert number systems, run logic gates, and analyse data.',
  gamesTitle: 'Games & Challenges', gamesIntro: 'Play, collect points, and discover the coding ideas behind each game.',
  projectsTitle: 'Projects', projectsIntro: 'Project ideas that apply what you learned in every unit.',
  openLab: 'Open lab', openGame: 'Play now', backToList: 'Back',
  relatedLab: 'Try the interactive lab', relatedGame: 'Play a game for this unit', relatedProject: 'See unit projects',
  tutorTitle: 'AI Tutor', tutorIntro: 'Ask anything about this lesson: explain, summarise, or give examples.',
  tutorExplain: 'Explain again', tutorSummary: 'Summarise', tutorExample: 'New example', tutorAsk: 'Ask',
  tutorPlaceholder: 'Ask a question about this lesson...', tutorReady: 'Online', tutorOffline: 'Local mode',
  tutorThinking: 'Typing...', tutorError: 'Sorry, something went wrong. Try again.', tutorYou: 'You',
  tutorWelcome: 'Hi! I am here with you in this lesson. Ask me about any point or tap “Explain again”.',
  challengeTitle: 'Lesson challenge', projectSteps: 'Project steps', unitProjects: 'Unit projects',
  showDemo: 'See the result (demo)', demoHint: 'This is the expected outcome — try it yourself!',
  demoBadge: 'demo', themeLight: 'Light mode ☀️', themeDark: 'Dark mode 🌙',
  popupBlocked: 'Please allow pop-ups to print.',
  ariaMenu: 'Open menu', ariaYear: 'Choose grade', titleTerm: 'Switch term', ariaTheme: 'Change display mode',
  titleTheme: 'Dark/Light', ariaLang: 'Change language', titleLang: 'English/عربي', ariaProfile: 'Profile',
  ariaClose: 'Close', ariaUnits: 'Units',
  pointsLbl: 'pts', labsCount: 'labs', gamesCount: 'games'
});

var CURRICULUM = {
  years: [
    {
      id: 'y1', shortAr: '١', shortEn: '1', nameAr: 'أولى ثانوي', nameEn: 'Grade 10',
      terms: [
        { id: 't1', nameAr: 'الترم الأول', nameEn: 'Term 1', units: [].concat(window.__UNITS_A || [], window.__UNITS_B || [], window.__UNITS_C || []) },
        { id: 't2', nameAr: 'الترم الثاني', nameEn: 'Term 2', units: [] }
      ]
    },
    {
      id: 'y2', shortAr: '٢', shortEn: '2', nameAr: 'تانية ثانوي', nameEn: 'Grade 11',
      terms: [
        { id: 't1', nameAr: 'الترم الأول', nameEn: 'Term 1', units: [] },
        { id: 't2', nameAr: 'الترم الثاني', nameEn: 'Term 2', units: [] }
      ]
    },
    {
      id: 'y3', shortAr: '٣', shortEn: '3', nameAr: 'تالتة ثانوي', nameEn: 'Grade 12',
      terms: [
        { id: 't1', nameAr: 'الترم الأول', nameEn: 'Term 1', units: [] },
        { id: 't2', nameAr: 'الترم الثاني', nameEn: 'Term 2', units: [] }
      ]
    }
  ]
};
