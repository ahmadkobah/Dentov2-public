/**
 * Consent Template Seed Data
 *
 * Default consent templates seeded for every new tenant.
 * Covers common dental procedures that require patient consent.
 * Bilingual (EN/AR).
 */

export interface ConsentTemplateSeed {
  name: { en: string; ar: string };
  procedureType: string;
  content: { en: string; ar: string };
  risks: { en: string; ar: string };
  isActive: boolean;
  isDefault: boolean;
}

export const consentTemplates: ConsentTemplateSeed[] = [
  {
    name: { en: 'General Dental Treatment', ar: 'علاج الأسنان العام' },
    procedureType: 'general',
    content: {
      en: 'I hereby consent to the dental treatment recommended by my dentist. I understand that the treatment may include examination, cleaning, X-rays, and other diagnostic or preventive procedures. I have been informed of the nature of the treatment, its benefits, and alternatives.',
      ar: 'أوافق بموجب هذا على علاج الأسنان الذي أوصى به طبيب أسناني. أفهم أن العلاج قد يشمل الفحص والتنظيف والأشعة السينية وغيرها من الإجراءات التشخيصية أو الوقائية. لقد تم إبلاغي بطبيعة العلاج وفوائده والبدائل المتاحة.',
    },
    risks: {
      en: 'Possible risks include but are not limited to: temporary sensitivity, minor discomfort, and allergic reactions to materials used.',
      ar: 'تشمل المخاطر المحتملة على سبيل المثال لا الحصر: حساسية مؤقتة، انزعاج بسيط، وردود فعل تحسسية تجاه المواد المستخدمة.',
    },
    isActive: true,
    isDefault: true,
  },
  {
    name: { en: 'Tooth Extraction', ar: 'قلع الأسنان' },
    procedureType: 'extraction',
    content: {
      en: 'I consent to the extraction of one or more teeth as recommended by my dentist. I understand the procedure involves the removal of the tooth/teeth and may include the use of local anesthesia. The dentist has explained the reasons for extraction, possible alternatives, and expected recovery time.',
      ar: 'أوافق على قلع سن واحد أو أكثر حسب توصية طبيب أسناني. أفهم أن الإجراء يتضمن إزالة السن/الأسنان وقد يشمل استخدام التخدير الموضعي. وقد شرح لي الطبيب أسباب القلع والبدائل الممكنة ووقت التعافي المتوقع.',
    },
    risks: {
      en: 'Possible risks include: bleeding, swelling, infection, dry socket, damage to adjacent teeth or structures, temporary or permanent numbness of the lip, tongue, or chin, and sinus complications for upper teeth.',
      ar: 'تشمل المخاطر المحتملة: النزيف، التورم، العدوى، السنخ الجاف، تلف الأسنان أو الهياكل المجاورة، خدر مؤقت أو دائم في الشفة أو اللسان أو الذقن، ومضاعفات الجيوب الأنفية للأسنان العلوية.',
    },
    isActive: true,
    isDefault: true,
  },
  {
    name: { en: 'Root Canal Treatment', ar: 'علاج قناة الجذر' },
    procedureType: 'endodontic',
    content: {
      en: 'I consent to root canal (endodontic) treatment on the specified tooth/teeth. I understand the procedure involves removing the infected or damaged pulp, cleaning and shaping the canals, and sealing them. A crown or restoration may be needed afterward to protect the treated tooth.',
      ar: 'أوافق على علاج قناة الجذر (علاج العصب) للسن/الأسنان المحددة. أفهم أن الإجراء يتضمن إزالة اللب المصاب أو التالف وتنظيف وتشكيل القنوات وإغلاقها. قد يكون هناك حاجة لتاج أو ترميم بعد ذلك لحماية السن المعالج.',
    },
    risks: {
      en: 'Possible risks include: instrument separation within the canal, perforation of the root, incomplete removal of infection, post-treatment discomfort, and the possibility that the tooth may still require extraction.',
      ar: 'تشمل المخاطر المحتملة: انفصال الأداة داخل القناة، ثقب الجذر، عدم إزالة العدوى بالكامل، الانزعاج بعد العلاج، واحتمال أن السن قد يحتاج إلى قلع.',
    },
    isActive: true,
    isDefault: true,
  },
  {
    name: { en: 'Dental Implant Placement', ar: 'زراعة الأسنان' },
    procedureType: 'implant',
    content: {
      en: 'I consent to the placement of dental implant(s) as recommended. I understand the procedure involves surgical placement of a titanium post into the jawbone, which will serve as a foundation for an artificial tooth. The process may require multiple visits over several months for healing and final restoration.',
      ar: 'أوافق على وضع زراعة/زراعات الأسنان حسبما أوصى به الطبيب. أفهم أن الإجراء يتضمن وضع جراحي لدعامة من التيتانيوم في عظم الفك، والتي ستكون بمثابة أساس لسن اصطناعي. قد تتطلب العملية زيارات متعددة على مدى عدة أشهر للشفاء والترميم النهائي.',
    },
    risks: {
      en: 'Possible risks include: implant failure, infection, nerve damage leading to numbness, sinus problems, bone loss around implant, damage to surrounding teeth or blood vessels, and the need for additional procedures such as bone grafting.',
      ar: 'تشمل المخاطر المحتملة: فشل الزراعة، العدوى، تلف الأعصاب المؤدي إلى التنميل، مشاكل الجيوب الأنفية، فقدان العظام حول الزراعة، تلف الأسنان أو الأوعية الدموية المحيطة، والحاجة لإجراءات إضافية مثل ترقيع العظام.',
    },
    isActive: true,
    isDefault: true,
  },
  {
    name: { en: 'Orthodontic Treatment', ar: 'علاج تقويم الأسنان' },
    procedureType: 'orthodontic',
    content: {
      en: 'I consent to orthodontic treatment including the placement of braces, aligners, or other appliances. I understand the treatment duration may vary and requires regular follow-up visits. I agree to follow the care instructions provided, including dietary restrictions and oral hygiene practices.',
      ar: 'أوافق على علاج تقويم الأسنان بما في ذلك تركيب التقويم أو المقومات الشفافة أو الأجهزة الأخرى. أفهم أن مدة العلاج قد تختلف وتتطلب زيارات متابعة منتظمة. أوافق على اتباع تعليمات العناية المقدمة، بما في ذلك القيود الغذائية وممارسات نظافة الفم.',
    },
    risks: {
      en: 'Possible risks include: tooth decay, gum disease, root resorption, relapse after treatment, temporomandibular joint (TMJ) discomfort, allergic reactions to materials, and the need for extended treatment duration.',
      ar: 'تشمل المخاطر المحتملة: تسوس الأسنان، أمراض اللثة، ارتشاف الجذر، الانتكاس بعد العلاج، عدم الراحة في المفصل الصدغي الفكي، ردود فعل تحسسية تجاه المواد، والحاجة لتمديد مدة العلاج.',
    },
    isActive: true,
    isDefault: true,
  },
  {
    name: { en: 'Teeth Whitening', ar: 'تبييض الأسنان' },
    procedureType: 'whitening',
    content: {
      en: 'I consent to professional teeth whitening treatment. I understand that results may vary depending on the original shade, type of discoloration, and individual tooth characteristics. The whitening agent may be applied in-office or provided for at-home use as directed by the dentist.',
      ar: 'أوافق على علاج تبييض الأسنان المهني. أفهم أن النتائج قد تختلف حسب اللون الأصلي ونوع التصبغ وخصائص الأسنان الفردية. قد يتم تطبيق مادة التبييض في العيادة أو تقديمها للاستخدام المنزلي حسب توجيهات الطبيب.',
    },
    risks: {
      en: 'Possible risks include: temporary tooth sensitivity, gum irritation, uneven whitening results, and the need for repeated treatments to maintain results.',
      ar: 'تشمل المخاطر المحتملة: حساسية الأسنان المؤقتة، تهيج اللثة، نتائج تبييض غير متساوية، والحاجة لتكرار العلاج للحفاظ على النتائج.',
    },
    isActive: true,
    isDefault: true,
  },
  {
    name: { en: 'Crown and Bridge', ar: 'التيجان والجسور' },
    procedureType: 'prosthodontic',
    content: {
      en: 'I consent to the preparation and placement of a dental crown and/or bridge. I understand the procedure involves reshaping the tooth/teeth to accommodate the restoration, taking impressions, and placing a temporary restoration followed by the final crown/bridge at a subsequent visit.',
      ar: 'أوافق على تحضير وتركيب تاج و/أو جسر للأسنان. أفهم أن الإجراء يتضمن إعادة تشكيل السن/الأسنان لاستيعاب الترميم، وأخذ الطبعات، ووضع ترميم مؤقت يليه التاج/الجسر النهائي في زيارة لاحقة.',
    },
    risks: {
      en: 'Possible risks include: tooth sensitivity, nerve damage requiring root canal treatment, improper fit, allergic reactions to materials, fracture of the restoration, and the need for replacement over time.',
      ar: 'تشمل المخاطر المحتملة: حساسية الأسنان، تلف العصب الذي قد يتطلب علاج قناة الجذر، عدم ملاءمة الترميم، ردود فعل تحسسية تجاه المواد، كسر الترميم، والحاجة للاستبدال مع مرور الوقت.',
    },
    isActive: true,
    isDefault: true,
  },
  {
    name: { en: 'Periodontal (Gum) Treatment', ar: 'علاج اللثة' },
    procedureType: 'periodontic',
    content: {
      en: 'I consent to periodontal treatment which may include deep cleaning (scaling and root planing), gum surgery, or other procedures to treat gum disease. I understand the importance of maintaining good oral hygiene and attending follow-up appointments.',
      ar: 'أوافق على علاج اللثة الذي قد يشمل التنظيف العميق (التقليح وكشط الجذور)، جراحة اللثة، أو إجراءات أخرى لعلاج أمراض اللثة. أفهم أهمية الحفاظ على نظافة الفم الجيدة وحضور مواعيد المتابعة.',
    },
    risks: {
      en: 'Possible risks include: tooth sensitivity, gum recession, bleeding, infection, temporary or permanent changes in tooth appearance, and the possibility that the condition may recur.',
      ar: 'تشمل المخاطر المحتملة: حساسية الأسنان، انحسار اللثة، النزيف، العدوى، تغييرات مؤقتة أو دائمة في مظهر الأسنان، واحتمال تكرار الحالة.',
    },
    isActive: true,
    isDefault: true,
  },
  {
    name: { en: 'Pediatric Dental Treatment', ar: 'علاج أسنان الأطفال' },
    procedureType: 'pediatric',
    content: {
      en: 'I, as the parent/legal guardian, consent to dental treatment for my child. The treatment may include examination, cleaning, fillings, sealants, fluoride application, and other procedures as deemed necessary by the pediatric dentist. Behavior management techniques such as tell-show-do, nitrous oxide, or conscious sedation may be used.',
      ar: 'أوافق بصفتي الوالد/الوصي القانوني على علاج الأسنان لطفلي. قد يشمل العلاج الفحص والتنظيف والحشوات ومانعات التسرب وتطبيق الفلورايد وإجراءات أخرى حسبما يراه طبيب أسنان الأطفال ضرورياً. قد تُستخدم تقنيات إدارة السلوك مثل أخبر-أرِ-افعل، أو أكسيد النيتروس، أو التخدير الواعي.',
    },
    risks: {
      en: "Possible risks include: temporary discomfort, allergic reactions, nausea from sedation, and the need for additional visits. Behavior management techniques are used to ensure the child's safety and comfort.",
      ar: 'تشمل المخاطر المحتملة: الانزعاج المؤقت، ردود الفعل التحسسية، الغثيان من التخدير، والحاجة لزيارات إضافية. تُستخدم تقنيات إدارة السلوك لضمان سلامة الطفل وراحته.',
    },
    isActive: true,
    isDefault: true,
  },
  {
    name: { en: 'Surgical Procedure', ar: 'إجراء جراحي' },
    procedureType: 'surgical',
    content: {
      en: 'I consent to the oral/dental surgical procedure as explained by my dentist. I understand the nature of the surgery, including the type of anesthesia to be used, and the expected recovery process. I agree to follow all pre-operative and post-operative instructions provided.',
      ar: 'أوافق على الإجراء الجراحي الفموي/السني كما شرحه لي طبيب أسناني. أفهم طبيعة الجراحة، بما في ذلك نوع التخدير المستخدم، وعملية التعافي المتوقعة. أوافق على اتباع جميع التعليمات المقدمة قبل وبعد العملية.',
    },
    risks: {
      en: 'Possible risks include: excessive bleeding, infection, swelling, pain, nerve damage, jaw fracture, adverse reaction to anesthesia, and the potential need for additional surgical procedures.',
      ar: 'تشمل المخاطر المحتملة: النزيف المفرط، العدوى، التورم، الألم، تلف الأعصاب، كسر الفك، رد فعل سلبي تجاه التخدير، والحاجة المحتملة لإجراءات جراحية إضافية.',
    },
    isActive: true,
    isDefault: true,
  },
];
