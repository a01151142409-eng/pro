# الدليل التفاعلي لفسيولوجي | Physiology Interactive Guide

دليل دراسة تفاعلي ثنائي اللغة (عربي/إنجليزي) لمادة الفسيولوجي — كلية الطب، جامعة شرق بورسعيد الأهلية، الفرقة الأولى (MED101 / MED102 / MED103).

المصدر: Lecture Notes in Human Physiology — Prof. Mona A. Hussain (2026–2027).

## التشغيل

```bash
npm install
npm run dev       # خادم تطوير محلي
npm run build     # بناء نسخة الإنتاج في dist/
npm run preview   # معاينة نسخة الإنتاج
npm run lint      # فحص TypeScript (tsc --noEmit)
npm test          # اختبارات node:test على src/utils/*.test.ts
```

التطبيق **frontend ثابت بالكامل**: يعمل أوفلاين بعد البناء، بدون أي طلب شبكة خارجي وقت التشغيل، وبدون أي مفاتيح API. الخطوط مثبتة محليًا عبر حزم `@fontsource`.

## بنية المشروع

```
├── index.html
├── public/assets/images/          # كل الصور + manifest.json
└── src/
    ├── types/physiology.ts        # أنواع TypeScript
    ├── data/
    │   ├── curriculum.ts          # الفصول، المواضيع، الصور، المصطلحات، الجداول
    │   ├── assessments.ts         # MCQ + Spotter + Flashcards
    │   └── labsData.ts            # بيانات المعامل التفاعلية
    ├── utils/
    │   ├── studyLogic.ts          # دوال خالصة (كويز، تصحيح، بحث، تقدم)
    │   └── studyLogic.test.ts     # اختبارات node:test
    └── components/                # مكونات الواجهة
```

## إضافة محتوى جديد

### فصل أو موضوع
عدّل `src/data/curriculum.ts`:
1. أضف `ChapterMeta` جديدًا إلى `chapters` (معرّف مثل `a8` أو `b4`، ورقم، والعنوان بالعربي والإنجليزي، وقائمة معرّفات المواضيع `topicsSummary`).
2. أضف محتوى كل موضوع إلى `topics` بحقول `arBody` و`enBody` (مصفوفة فقرات).
3. اربط الجداول عبر `tableIds` والصور عبر `imageIds`.

### أسئلة وبطاقات
عدّل `src/data/assessments.ts`:
- `quizQuestions`: كل سؤال يحتاج إجابة صحيحة واحدة (`correct` = index)، و4–5 خيارات، وتفسيرًا عربيًا وإنجليزيًا.
- `spotters`: كل سؤال عملي يحتاج `imageId` موجودًا وإحداثيات pin بنسبة مئوية (0–100).
- `flashcards`: بطاقة لكل مصطلح مع التعريف بالاتجاهين.

### معمل تفاعلي
عدّل `src/data/labsData.ts` وأضف المعمل إلى `partALabs` أو `partBLabs` حسب جزء الفصل. الأنواع المتاحة: `explorer`, `slider`, `builder`, `matcher`, `case`, `compare`, `flow` — راجع الأنواع في `src/types/physiology.ts`.

## إضافة صور

1. ضع ملف الصورة في `public/assets/images/<chapter-id>/`.
2. أضف سجلًا في `public/assets/images/manifest.json` بنفس حقول `ImageItem` (id, file, ar, en, ch, topic).
3. أضف `ImageItem` مطابقًا في مصفوفة `images` داخل `src/data/curriculum.ts`.

الاختبارات تتحقق تلقائيًا من: تطابق manifest مع البيانات، وجود الملفات على القرص، وصحة الإحالات (الفصل/الموضوع/pins).

أي صورة غير متوفرة تُستبدل بملف SVG placeholder يحمل اسم الصورة المطلوبة حتى توفر نسختك الأصلية.

## ملاحظات الدقة الأكاديمية

- أي معلومة غير مؤكدة تُعلَّم في الكود بتعليق `// VERIFY` وتُجمع في قائمة "نقاط تحتاج مراجعة".
- المصطلح العلمي يُكتب دائمًا بالإنجليزية الأصلية بجانب الترجمة العربية.

## حفظ التقدم

التقدم يُحفظ تلقائيًا في `localStorage` ببادئة `phys_` (اللغة، الثيم، حجم الخط، الفصول المكتملة، العلامات، البطاقات المعروفة، الأسئلة الخاطئة، أفضل النتائج، الملاحظات). من الواجهة يمكنك **تصدير تقدمك** كملف JSON واستيراده لاحقًا على أي جهاز.

## اختصارات الكيبورد

- `/` بحث عام
- `Q` اختبار
- `S` سبوتر
- `Escape` إغلاق أي نافذة
