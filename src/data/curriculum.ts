import { Lesson, TutorId, TutorProfile } from "../types/lesson";
import heroStudioImage from "../assets/images/studio_hero_immersion_1794595443923.jpg";
import tutorMayaImage from "../assets/images/tutor_maya_seattle_1794595442750.jpg";
import tutorLiamImage from "../assets/images/tutor_liam_melbourne_1794595443849.jpg";
import tutorOliverImage from "../assets/images/tutor_oliver_london_1794595442914.jpg";

export const HERO_STUDIO_IMAGE = heroStudioImage;

export const TUTORS: Record<TutorId, TutorProfile> = {
  maya: {
    id: "maya",
    name: "Maya",
    city: "Seattle, USA",
    accentLabel: "American English",
    voiceName: "Kore",
    stylePrompt: "Warm, clear, relaxed Pacific Northwest American speaker",
    avatarUrl: tutorMayaImage,
    bioThai: "นักออกแบบผลิตภัณฑ์และครูสอนภาษาจากซีแอตเทิล เชี่ยวชาญการฟังเสียงเชื่อมคำ (Connected Speech) และบทสนทนาชีวิตประจำวัน",
    specialtyThai: "การฟังธรรมชาติและบทสนทนาในชีวิตจริง",
  },
  liam: {
    id: "liam",
    name: "Liam",
    city: "Melbourne, Australia",
    accentLabel: "Australian English",
    voiceName: "Puck",
    stylePrompt: "Friendly, energetic Australian speaker with natural rhythm",
    avatarUrl: tutorLiamImage,
    bioThai: "เจ้าของคาเฟ่และนักเล่าเรื่องจากเมลเบิร์น จะพาคุณฝึกโต้ตอบแบบเป็นกันเอง ใช้อารมณ์ขัน และเล่าเรื่องให้น่าฟังเหมือนเพื่อนต่างชาติ",
    specialtyThai: "Small Talk และการเล่าเรื่องอย่างเป็นธรรมชาติ",
  },
  oliver: {
    id: "oliver",
    name: "Oliver",
    city: "London, UK",
    accentLabel: "British English",
    voiceName: "Charon",
    stylePrompt: "Articulate, polite, modern London British speaker",
    avatarUrl: tutorOliverImage,
    bioThai: "ที่ปรึกษาด้านการสื่อสารจากลอนดอน สอนการใช้ภาษาอังกฤษในที่ทำงาน การโน้มน้าวอย่างสุภาพ และการเขียนที่สละสลวย",
    specialtyThai: "ภาษาอังกฤษในการทำงานและการสื่อสารเชิงลึก",
  },
};

export interface FreeTalkScenario {
  id: string;
  titleEn: string;
  titleThai: string;
  tutorId: TutorId;
  levelLabel: string;
  descriptionThai: string;
  scenarioPrompt: string;
  openingLineEn: string;
  openingLineThai: string;
}

export const FREE_TALK_SCENARIOS: FreeTalkScenario[] = [
  {
    id: "ft-friends",
    titleEn: "Meeting a New Friend at a Rooftop",
    titleThai: "ทำความรู้จักเพื่อนต่างชาติใหม่ในงานสังสรรค์",
    tutorId: "maya",
    levelLabel: "Everyday Social",
    descriptionThai: "ฝึกทักทาย ถามไถ่เรื่องงานอดิเรก และต่อบทสนทนาไม่ให้เดดแอร์",
    scenarioPrompt: "You just met at a friend's casual rooftop gathering in Seattle. Make friendly small talk about work, food, or weekend plans.",
    openingLineEn: "Hey! I don't think we've met yet—I'm Maya, a friend of Sarah's from work. How are you enjoying the night so far?",
    openingLineThai: "เฮ้ เรายังไม่เคยเจอกันเลยใช่ไหม เราชื่อมายา เป็นเพื่อนที่ทำงานของซาร่าห์ คืนนี้เป็นยังไงบ้าง สนุกไหม?",
  },
  {
    id: "ft-interview",
    titleEn: "International Job & Portfolio Chat",
    titleThai: "สัมภาษณ์งานและเล่าประสบการณ์กับทีมต่างชาติ",
    tutorId: "oliver",
    levelLabel: "Career Fluency",
    descriptionThai: "ฝึกตอบคำถามสัมภาษณ์ เล่าจุดแข็ง และถามกลับอย่างมั่นใจและสุภาพ",
    scenarioPrompt: "An informal 15-minute video chat with a hiring manager in London about your recent projects and why you want to join an international team.",
    openingLineEn: "Lovely to meet you! Thanks for hopping on this call. Before we dive into the role, could you tell me a bit about what you've been working on lately?",
    openingLineThai: "ยินดีที่ได้รู้จักครับ ขอบคุณที่สละเวลามาคุยกัน ก่อนเข้าเรื่องตำแหน่งงาน ช่วยเล่าให้ฟังคร่าวๆ หน่อยได้ไหมว่าช่วงนี้คุณทำโปรเจกต์อะไรอยู่บ้าง?",
  },
  {
    id: "ft-travel",
    titleEn: "Local Recommendations in Melbourne",
    titleThai: "ขอคำแนะนำร้านเด็ดและวางแผนเที่ยวกับคนท้องถิ่น",
    tutorId: "liam",
    levelLabel: "Travel & Culture",
    descriptionThai: "ฝึกถามทาง ขอคำแนะนำอาหาร และคุยแลกเปลี่ยนวัฒนธรรมกับคนพื้นที่",
    scenarioPrompt: "You are visiting Melbourne for the first time and chatting with Liam at a neighborhood café about hidden food spots and weekend trips.",
    openingLineEn: "G'day! First time in Melbourne? Let me know what kind of food you're into and I'll point you toward the best spots around here.",
    openingLineThai: "หวัดดี! มาเมลเบิร์นครั้งแรกเหรอ? บอกมาได้เลยว่าชอบกินแนวไหน เดี๋ยวแนะนำร้านลับเด็ดๆ แถวนี้ให้",
  },
  {
    id: "ft-debate",
    titleEn: "Sharing Opinions on Work & AI",
    titleThai: "แลกเปลี่ยนมุมมองและแสดงความคิดเห็นเชิงลึก",
    tutorId: "oliver",
    levelLabel: "Advanced Nuance",
    descriptionThai: "ฝึกเห็นด้วย เห็นต่างอย่างมีชั้นเชิง และยกตัวอย่างประกอบคำพูด",
    scenarioPrompt: "A lively coffee chat debating how remote work and modern technology change how people connect and learn.",
    openingLineEn: "I'm genuinely curious what you think—do you feel working remotely makes teams more focused, or do we lose something by not being in the same room?",
    openingLineThai: "ผมอยากรู้มุมมองคุณจริงๆ นะ คุณคิดว่าการทำงานทางไกลช่วยให้ทีมโฟกัสมากขึ้น หรือเราเสียบรรยากาศบางอย่างไปจากการไม่ได้เจอกัน?",
  },
];

export const CURATED_LESSONS: Lesson[] = [
  // ================= RANK 1 (A1 — EASY STARTERS) =================
  {
    id: "A1-1",
    rankId: "A1",
    sequenceNumber: 1,
    number: "01",
    topicCategory: "ทักทายและแนะนำตัว",
    titleEn: "Hello, Names & Friendly Basics",
    titleThai: "ทักทาย แนะนำตัว และถามชื่ออย่างเป็นมิตร",
    levelLabel: "ขั้นที่ 1 (A1) · ง่าย",
    durationMinutes: 10,
    tutorId: "maya",
    summaryThai:
      "เริ่มต้นจากพื้นฐานที่ใช้งานได้ทันที ฝึกทักทาย แนะนำชื่อ และตอบคำถามง่ายๆ เวลาเจอเพื่อนต่างชาติครั้งแรก",
    culturalInsightThai:
      "ชาวต่างชาติมักพูดสั้นๆ อย่าง 'Hi, I'm Maya. Nice to meet you!' พร้อมยิ้มและสบตา ไม่ต้องพูดทางการเกินไปก็ฟังดูสุภาพมากแล้ว",
    listening: {
      sceneTitleThai: "บรรยากาศ: เจอเพื่อนใหม่ในคลาสเรียนวันแรก",
      contextThai: "Maya ทักทายเพื่อนใหม่ที่นั่งข้างๆ ด้วยประโยคสั้น ชัด ฟังง่าย เหมาะสำหรับผู้เริ่มต้น",
      partnerName: "Sam",
      partnerVoice: "Fenrir",
      dialogue: [
        {
          id: "a1-1-d1",
          speaker: "Maya",
          voiceName: "Kore",
          style: "Slow, clear, warm American speaker",
          english: "Hi! I'm Maya. What's your name?",
          thai: "สวัสดีค่ะ! ฉันชื่อมายา คุณชื่ออะไรคะ?",
          connectedNotes: [
            {
              phrase: "What's your",
              soundsLike: "วัทส์-เยอร์",
              explanationThai: "ย่อมาจาก 'What is your' เวลาพูดจริงจะรวมเป็น 2 พยางค์สั้นๆ",
            },
          ],
        },
        {
          id: "a1-1-d2",
          speaker: "Sam",
          voiceName: "Fenrir",
          style: "Friendly, clear speaker",
          english: "Hi Maya! I'm Sam. Nice to meet you.",
          thai: "สวัสดีครับมายา! ผมชื่อแซม ยินดีที่ได้รู้จักครับ",
          connectedNotes: [
            {
              phrase: "Nice to meet you",
              soundsLike: "ไนซ์-ทะ-มีท-ชู",
              explanationThai: "เสียง t ท้าย meet เชื่อมกับ you เบาๆ เป็น 'มีท-ชู'",
            },
          ],
        },
        {
          id: "a1-1-d3",
          speaker: "Maya",
          voiceName: "Kore",
          style: "Warm, clear speaker",
          english: "Nice to meet you too! Where are you from?",
          thai: "ยินดีที่ได้รู้จักเช่นกันค่ะ! คุณมาจากไหนคะ?",
        },
        {
          id: "a1-1-d4",
          speaker: "Sam",
          voiceName: "Fenrir",
          style: "Friendly, clear speaker",
          english: "I'm from Bangkok, Thailand. How about you?",
          thai: "ผมมาจากกรุงเทพฯ ประเทศไทยครับ แล้วคุณล่ะ?",
        },
      ],
      questions: [
        {
          id: "a1-1-q1",
          questionThai: "Sam มาจากเมืองไหน?",
          options: ["Seattle", "Bangkok", "London"],
          correctIndex: 1,
          explanationThai: "Sam ตอบชัดเจนว่า 'I'm from Bangkok, Thailand.'",
        },
        {
          id: "a1-1-q2",
          questionThai: "เมื่อมีคนพูดว่า 'Nice to meet you' เราควรตอบกลับสั้นๆ ว่าอะไร?",
          options: ["I am from here.", "Nice to meet you too!", "What is your name?"],
          correctIndex: 1,
          explanationThai: "เติมคำว่า 'too' ท้ายประโยค เพื่อบอกว่า 'ยินดีที่ได้รู้จักเช่นกัน'",
        },
      ],
    },
    speaking: {
      shadowingPhrases: [
        {
          id: "a1-1-s1",
          english: "Hi! I'm Maya. Nice to meet you.",
          stressGuide: "HI! I'm MA-ya. NICE to MEET you.",
          ipa: "/haɪ | aɪm ˈmaɪə | naɪs tə miːt juː/",
          thaiMeaning: "สวัสดี! ฉันชื่อมายา ยินดีที่ได้รู้จักนะ",
          nativeTipThai: "เว้นจังหวะสั้นๆ หลังชื่อตัวเอง แล้วยิ้มขณะพูดคำว่า Nice to meet you",
        },
        {
          id: "a1-1-s2",
          english: "Where are you from? I'm from Thailand.",
          stressGuide: "WHERE are you FROM? I'm from THAI-land.",
          ipa: "/wɛr ɑːr juː frʌm | aɪm frʌm ˈtaɪlænd/",
          thaiMeaning: "คุณมาจากไหน? ฉันมาจากประเทศไทย",
          nativeTipThai: "เน้นคำว่า 'WHERE', 'FROM' และ 'THAI-land' ให้ชัดเจน",
        },
        {
          id: "a1-1-s3",
          english: "I'm doing great, thank you!",
          stressGuide: "I'm DO-ing GREAT, THANK you!",
          ipa: "/aɪm ˈduːɪŋ ɡreɪt | θæŋk juː/",
          thaiMeaning: "สบายดีมากเลย ขอบคุณครับ/ค่ะ!",
          nativeTipThai: "ใช้แทน 'I am fine, thank you' จะฟังดูเป็นธรรมชาติและมีชีวิตชีวากว่า",
        },
      ],
      roleplayTitle: "First Hello with Maya",
      roleplayContextThai: "ลองทักทายและแนะนำตัวเองง่ายๆ กับ Maya เธอจะถามชื่อและเมืองที่คุณอยู่ด้วยประโยคสั้นๆ",
      roleplayScenarioPrompt:
        "You are Maya speaking to an A1 beginner learner. Use very simple, short, clear English sentences (max 10-12 words per sentence). Ask their name, where they are from, and what food or drink they like.",
      openingLineEn: "Hi! I'm Maya. Welcome to our first lesson! What's your name?",
      openingLineThai: "สวัสดีค่ะ! ฉันชื่อมายา ยินดีต้อนรับสู่บทเรียนแรกนะคะ คุณชื่ออะไรเอ่ย?",
      goalTurns: 2,
    },
    reading: {
      formatLabel: "Simple Welcome Card",
      headline: "Welcome to Seattle!",
      authorMeta: "Maya Lin · Beginner Note · 1 min read",
      paragraphs: [
        "Hello! My name is Maya. I live in Seattle, a green city by the water. I work as a designer and I love drinking iced coffee every morning.",
        "On weekends, I like to walk in the park and cook simple food at home. My favorite food is Thai green curry!",
        "Please say hello when we meet. Don't worry about mistakes—we learn together step by step.",
      ],
      expressions: [
        {
          id: "a1-1-e1",
          phrase: "by the water",
          ipa: "/baɪ ðə ˈwɔːtər/",
          register: "Neutral",
          meaningThai: "อยู่ติดริมน้ำ / ริมทะเลหรือทะเลสาบ",
          example: "Our hotel is right by the water.",
        },
        {
          id: "a1-1-e2",
          phrase: "on weekends",
          ipa: "/ɒn ˈwiːkɛndz/",
          register: "Neutral",
          meaningThai: "ในวันหยุดสุดสัปดาห์ (เสาร์-อาทิตย์)",
          example: "I usually wake up late on weekends.",
        },
        {
          id: "a1-1-e3",
          phrase: "say hello",
          ipa: "/seɪ həˈloʊ/",
          register: "Neutral",
          meaningThai: "ทักทาย",
          example: "Come over and say hello to my friend.",
        },
        {
          id: "a1-1-e4",
          phrase: "step by step",
          ipa: "/stɛp baɪ stɛp/",
          register: "Neutral",
          meaningThai: "ทีละขั้น ทีละก้าว ค่อยเป็นค่อยไป",
          example: "You can speak English well step by step.",
        },
      ],
      questions: [
        {
          id: "a1-1-rq1",
          questionThai: "Maya ชอบกินอาหารไทยเมนูไหน?",
          options: ["ผัดไทย", "แกงเขียวหวาน (Thai green curry)", "ต้มยำกุ้ง"],
          correctIndex: 1,
          explanationThai: "ในย่อหน้าที่ 2 บอกว่า 'My favorite food is Thai green curry!'",
        },
        {
          id: "a1-1-rq2",
          questionThai: "วันเสาร์-อาทิตย์ Maya ชอบทำอะไร?",
          options: ["เดินเล่นในสวนและทำอาหารง่ายๆ ที่บ้าน", "ไปทำงานที่ออฟฟิศ", "เดินทางไปต่างประเทศ"],
          correctIndex: 0,
          explanationThai: "'On weekends, I like to walk in the park and cook simple food at home.'",
        },
      ],
    },
    writing: {
      promptTitle: "Introduce Yourself in 3 Simple Sentences",
      promptInstructionThai:
        "เขียนแนะนำตัวสั้นๆ เป็นภาษาอังกฤษ 2–3 ประโยค (ชื่อของคุณ มาจากที่ไหน และชอบกินอะไรหรือชอบทำอะไร)",
      promptInstructionEn: "Write 2–3 simple sentences introducing your name, city, and one thing you like.",
      targetExpressions: ["My name is", "I'm from", "I like", "Nice to meet you"],
      minWords: 10,
      sampleStarter: "Hi! My name is...",
    },
  },
  {
    id: "A1-2",
    rankId: "A1",
    sequenceNumber: 2,
    number: "02",
    topicCategory: "อาหารและร้านกาแฟ",
    titleEn: "Ordering Food & Drinks Simply",
    titleThai: "สั่งอาหารและเครื่องดื่มแบบเข้าใจง่ายทันที",
    levelLabel: "ขั้นที่ 1 (A1) · ง่าย",
    durationMinutes: 12,
    tutorId: "liam",
    summaryThai:
      "ฝึกสั่งอาหาร เลือกร้อนหรือเย็น ถามราคา และขอบคุณพนักงานด้วยประโยคสั้นๆ ที่ใช้ได้จริงทั่วโลก",
    culturalInsightThai:
      "คำว่า 'Can I have...' หรือ 'I'd like...' เป็นคำสั่งอาหารที่สุภาพและง่ายที่สุด ใช้ได้ทั้งร้านกาแฟและร้านอาหาร",
    listening: {
      sceneTitleThai: "บรรยากาศ: สั่งอาหารเช้าและกาแฟที่เคาน์เตอร์",
      contextThai: "Liam สั่งกาแฟและแซนด์วิชง่ายๆ จากพนักงานแคชเชียร์ ลองฟังคำสำคัญอย่างราคาและขนาดแก้ว",
      partnerName: "Emma",
      partnerVoice: "Zephyr",
      dialogue: [
        {
          id: "a1-2-d1",
          speaker: "Emma",
          voiceName: "Zephyr",
          style: "Clear, polite cafe cashier",
          english: "Hello! What would you like today?",
          thai: "สวัสดีค่ะ! วันนี้รับอะไรดีคะ?",
        },
        {
          id: "a1-2-d2",
          speaker: "Liam",
          voiceName: "Puck",
          style: "Clear, friendly customer",
          english: "Hi! Can I have one iced coffee and a cheese sandwich, please?",
          thai: "สวัสดีครับ! ขอกาแฟเย็นหนึ่งแก้วกับแซนด์วิชชีสหนึ่งชิ้นครับ",
          connectedNotes: [
            {
              phrase: "Can I have",
              soundsLike: "แค-นาย-แฮฟ",
              explanationThai: "ประโยคขอหรือสั่งของที่ใช้บ่อยที่สุดและสุภาพ",
            },
          ],
        },
        {
          id: "a1-2-d3",
          speaker: "Emma",
          voiceName: "Zephyr",
          style: "Helpful cashier",
          english: "Sure! Small or large coffee?",
          thai: "ได้เลยค่ะ! กาแฟแก้วเล็กหรือใหญ่ดีคะ?",
        },
        {
          id: "a1-2-d4",
          speaker: "Liam",
          voiceName: "Puck",
          style: "Polite customer",
          english: "Small, please. How much is it?",
          thai: "แก้วเล็กครับ ทั้งหมดราคาเท่าไหร่ครับ?",
        },
      ],
      questions: [
        {
          id: "a1-2-q1",
          questionThai: "Liam สั่งกาแฟขนาดไหน?",
          options: ["Large (ใหญ่)", "Medium (กลาง)", "Small (เล็ก)"],
          correctIndex: 2,
          explanationThai: "Liam ตอบชัดเจนว่า 'Small, please.'",
        },
        {
          id: "a1-2-q2",
          questionThai: "นอกจากกาแฟแล้ว Liam สั่งอะไรอีก?",
          options: ["แซนด์วิชชีส", "เค้กช็อกโกแลต", "น้ำส้ม"],
          correctIndex: 0,
          explanationThai: "เขาสั่ง 'one iced coffee and a cheese sandwich'",
        },
      ],
    },
    speaking: {
      shadowingPhrases: [
        {
          id: "a1-2-s1",
          english: "Can I have one iced coffee, please?",
          stressGuide: "Can I HAVE one ICED COF-fee, PLEASE?",
          ipa: "/kənaɪ hæv wʌn aɪst ˈkɒfi pliːz/",
          thaiMeaning: "ขอกาแฟเย็นหนึ่งแก้วครับ/ค่ะ",
          nativeTipThai: "ปิดท้ายด้วย 'please' เสมอ จะฟังดูน่ารักและสุภาพทันที",
        },
        {
          id: "a1-2-s2",
          english: "How much is it? Here you go.",
          stressGuide: "HOW MUCH is it? HERE you GO.",
          ipa: "/haʊ mʌtʃ ɪz ɪt | hɪr juː ɡoʊ/",
          thaiMeaning: "ราคาเท่าไหร่ครับ? นี่เงินครับ (ตอนยื่นเงิน/บัตร)",
          nativeTipThai: "'Here you go' ใช้พูดตอนยื่นเงินหรือของให้คนอื่นได้ทุกโอกาส",
        },
        {
          id: "a1-2-s3",
          english: "For here, please. Thank you!",
          stressGuide: "For HERE, PLEASE. THANK you!",
          ipa: "/fər hɪr pliːz | θæŋk juː/",
          thaiMeaning: "ทานที่ร้านครับ ขอบคุณครับ!",
          nativeTipThai: "'For here' = ทานที่ร้าน, 'To go' = รับกลับบ้าน",
        },
      ],
      roleplayTitle: "Simple Coffee Order with Liam",
      roleplayContextThai: "ลองสั่งเครื่องดื่มและขนมง่ายๆ กับ Liam ที่เคาน์เตอร์ร้านกาแฟ",
      roleplayScenarioPrompt:
        "You are Liam working at a cafe counter speaking to an A1 beginner. Use short, simple sentences. Ask what they want to drink, hot or iced, small or large, and tell them the price ($5).",
      openingLineEn: "G'day! Welcome to our cafe. What would you like to drink today?",
      openingLineThai: "สวัสดีครับ! ยินดีต้อนรับสู่ร้านกาแฟ วันนี้รับเครื่องดื่มอะไรดีครับ?",
      goalTurns: 2,
    },
    reading: {
      formatLabel: "Cafe Chalkboard Menu",
      headline: "Sunny Morning Cafe Menu",
      authorMeta: "Daily Specials · Open 7 AM – 4 PM",
      paragraphs: [
        "Good morning! Today we have fresh hot coffee ($3), iced latte ($4), and sweet Thai iced tea ($4). All drinks come in small or large sizes.",
        "Hungry? Try our warm ham and cheese toast ($5) or fresh banana bread ($3). We also have soy milk and oat milk for free!",
        "Please order at the counter. You can pay by cash or card.",
      ],
      expressions: [
        {
          id: "a1-2-e1",
          phrase: "fresh",
          ipa: "/frɛʃ/",
          register: "Neutral",
          meaningThai: "สดใหม่ เพิ่งทำเสร็จ",
          example: "The bread is warm and fresh.",
        },
        {
          id: "a1-2-e2",
          phrase: "for free",
          ipa: "/fər friː/",
          register: "Neutral",
          meaningThai: "ฟรี ไม่มีค่าใช้จ่ายเพิ่ม",
          example: "Drinking water is for free here.",
        },
        {
          id: "a1-2-e3",
          phrase: "at the counter",
          ipa: "/æt ðə ˈkaʊntər/",
          register: "Neutral",
          meaningThai: "ที่หน้าเคาน์เตอร์",
          example: "Please pick up your cup at the counter.",
        },
        {
          id: "a1-2-e4",
          phrase: "cash or card",
          ipa: "/kæʃ ɔːr kɑːrd/",
          register: "Neutral",
          meaningThai: "เงินสดหรือบัตร",
          example: "Can I pay by cash or card?",
        },
      ],
      questions: [
        {
          id: "a1-2-rq1",
          questionThai: "ชาเย็นไทย (Thai iced tea) ราคาเท่าไหร่?",
          options: ["$3", "$4", "$5"],
          correctIndex: 1,
          explanationThai: "เมนูระบุว่า 'sweet Thai iced tea ($4)'",
        },
        {
          id: "a1-2-rq2",
          questionThai: "ถ้าขอเปลี่ยนเป็นนมโอ๊ต (oat milk) ต้องจ่ายเพิ่มไหม?",
          options: ["ต้องจ่ายเพิ่ม $1", "ฟรี ไม่มีค่าใช้จ่าย", "ไม่มีบริการ"],
          correctIndex: 1,
          explanationThai: "'We also have soy milk and oat milk for free!'",
        },
      ],
    },
    writing: {
      promptTitle: "Write a Simple Food Order Note",
      promptInstructionThai:
        "เขียนข้อความสั้นๆ 2–3 ประโยคเพื่อสั่งอาหารและเครื่องดื่มให้เพื่อน (ระบุขนาดและบอกว่าทานที่ร้านหรือกลับบ้าน)",
      promptInstructionEn: "Write 2–3 simple sentences ordering one drink and one snack politely.",
      targetExpressions: ["Can I have", "please", "small", "to go"],
      minWords: 12,
      sampleStarter: "Hi! Can I have a small iced latte and...",
    },
  },

  // ================= RANK 2 (A2 — DAILY CONFIDENCE) =================
  {
    id: "A2-1",
    rankId: "A2",
    sequenceNumber: 1,
    number: "01",
    topicCategory: "ชีวิตประจำวันและงานอดิเรก",
    titleEn: "Weekend Plans & Free Time",
    titleThai: "ชวนเพื่อนทำกิจกรรมและคุยเรื่องวันหยุด",
    levelLabel: "ขั้นที่ 2 (A2) · ง่าย-กลาง",
    durationMinutes: 14,
    tutorId: "liam",
    summaryThai:
      "ต่อยอดจากประโยคสั้นมาเป็นการชวนเพื่อน ถามเวลาว่าง และเล่าว่าวันเสาร์อาทิตย์ที่ผ่านมาทำอะไรมาบ้าง",
    culturalInsightThai:
      "ถ้าอยากชวนเพื่อนต่างชาติง่ายๆ ไม่ต้องใช้ประโยคยาว แค่ถามว่า 'Are you free this Saturday? Want to grab lunch?' ก็เป็นธรรมชาติทันที",
    listening: {
      sceneTitleThai: "บรรยากาศ: คุยกันหน้าลิฟต์ก่อนกลับบ้านวันศุกร์",
      contextThai: "Liam ถามเพื่อนเรื่องแพลนวันเสาร์อาทิตย์ และชวนไปตลาดนัดอาหารด้วยกัน",
      partnerName: "Claire",
      partnerVoice: "Zephyr",
      dialogue: [
        {
          id: "a2-1-d1",
          speaker: "Liam",
          voiceName: "Puck",
          style: "Friendly, relaxed Australian",
          english: "Hey Claire, any fun plans for the weekend?",
          thai: "เฮ้แคลร์ สุดสัปดาห์นี้มีแพลนสนุกๆ อะไรไหม?",
          connectedNotes: [
            {
              phrase: "plans for the",
              soundsLike: "แพลนส์-เฟอะ-เดอะ",
              explanationThai: "ลดเสียง 'for' ให้สั้นและเบา เพื่อต่อคำว่า 'the weekend' ได้เร็วขึ้น",
            },
          ],
        },
        {
          id: "a2-1-d2",
          speaker: "Claire",
          voiceName: "Zephyr",
          style: "Cheerful coworker",
          english: "Not really! On Saturday morning I usually sleep in and clean my apartment.",
          thai: "ยังไม่มีเลย! เช้าวันเสาร์ปกติฉันจะตื่นสายหน่อยแล้วก็ทำความสะอาดห้อง",
          connectedNotes: [
            {
              phrase: "sleep in",
              soundsLike: "สลีพ-พิน",
              explanationThai: "'sleep in' แปลว่าตื่นสายกว่าปกติในวันหยุด (ตั้งใจนอนต่อ)",
            },
          ],
        },
        {
          id: "a2-1-d3",
          speaker: "Liam",
          voiceName: "Puck",
          style: "Inviting tone",
          english: "Want to check out the night market on Sunday afternoon? There's great street food.",
          thai: "บ่ายวันอาทิตย์ไปเดินตลาดนัดด้วยกันไหม? มีของกินริมทางอร่อยๆ เพียบเลย",
        },
        {
          id: "a2-1-d4",
          speaker: "Claire",
          voiceName: "Zephyr",
          style: "Happy agreement",
          english: "Sounds awesome! Let's meet at two near the station.",
          thai: "ฟังดูดีมาก! เจอกันตอนบ่ายสองแถวสถานีนะ",
        },
      ],
      questions: [
        {
          id: "a2-1-q1",
          questionThai: "เช้าวันเสาร์ปกติ Claire มักจะทำอะไร?",
          options: ["ไปวิ่งมาราธอน", "ตื่นสายและทำความสะอาดห้อง", "ไปทำงานพิเศษ"],
          correctIndex: 1,
          explanationThai: "Claire บอกว่า 'I usually sleep in and clean my apartment.'",
        },
        {
          id: "a2-1-q2",
          questionThai: "ทั้งสองคนนัดเจอกันวันไหนและกี่โมง?",
          options: ["วันเสาร์ บ่ายสอง", "วันอาทิตย์ บ่ายสอง", "วันศุกร์ ตอนเย็น"],
          correctIndex: 1,
          explanationThai: "Liam ชวนไปวันอาทิตย์ และ Claire ตอบว่า 'Let's meet at two near the station.'",
        },
      ],
    },
    speaking: {
      shadowingPhrases: [
        {
          id: "a2-1-s1",
          english: "Do you have any plans for this weekend?",
          stressGuide: "Do you have AN-y PLANS for this WEEK-end?",
          ipa: "/duː juː hæv ˈɛni plænz fər ðɪs ˈwiːkɛnd/",
          thaiMeaning: "สุดสัปดาห์นี้คุณมีแพลนทำอะไรไหม?",
          nativeTipThai: "พูดคำว่า 'Do you' เบาๆ เป็น 'ดุ-ยู' แล้วเน้นชัดที่ 'PLANS' และ 'WEEKEND'",
        },
        {
          id: "a2-1-s2",
          english: "On Sunday morning, I like to sleep in and relax.",
          stressGuide: "On SUN-day MOR-ning, I LIKE to SLEEP IN and re-LAX.",
          ipa: "/ɒn ˈsʌndeɪ ˈmɔːrnɪŋ | aɪ laɪk tə sliːp ɪn ənd rɪˈlæks/",
          thaiMeaning: "เช้าวันอาทิตย์ฉันชอบตื่นสายแล้วพักผ่อนชิลๆ",
          nativeTipThai: "เชื่อม 'sleep in' ให้ติดกันเป็นเสียงเดียวว่า 'สลีพ-พิน'",
        },
        {
          id: "a2-1-s3",
          english: "Sounds great! Let's meet at two o'clock.",
          stressGuide: "SOUNDS GREAT! Let's MEET at TWO o'clock.",
          ipa: "/saʊndz ɡreɪt | lɛts miːt æt tuː əˈklɒk/",
          thaiMeaning: "ฟังดูเยี่ยมเลย! เจอกันตอนบ่ายสองนะ",
          nativeTipThai: "'Sounds great!' เป็นคำตอบตกลงที่เจ้าของภาษาใช้บ่อยที่สุด",
        },
      ],
      roleplayTitle: "Making Weekend Plans with Liam",
      roleplayContextThai: "Liam กำลังจะชวนคุณไปเที่ยวช่วงสุดสัปดาห์ ลองบอกสิ่งที่คุณชอบทำและนัดเวลากับเขา",
      roleplayScenarioPrompt:
        "You are Liam chatting with an A2 learner about weekend plans. Keep sentences clear and friendly. Ask what they like doing on weekends and invite them to try a local food market or coffee spot.",
      openingLineEn: "Hey! It's almost the weekend. What do you usually do on Saturdays?",
      openingLineThai: "เฮ้! ใกล้ถึงวันหยุดแล้ว ปกติวันเสาร์คุณทำอะไรบ้าง?",
      goalTurns: 3,
    },
    reading: {
      formatLabel: "Text Message Thread",
      headline: "Sunday Afternoon Food Market Plan",
      authorMeta: "Liam & Friends · Group Chat · 1 min read",
      paragraphs: [
        "Hey everyone! The weather looks sunny this Sunday, so I'm thinking of going to the river market around 1 p.m. They have fresh mango sticky rice and iced Thai tea.",
        "If you want to join, just meet us outside the main train exit. We'll walk around for an hour and then sit by the river.",
        "Let me know by Saturday night so we know who to wait for!",
      ],
      expressions: [
        {
          id: "a2-1-e1",
          phrase: "thinking of",
          ipa: "/ˈθɪŋkɪŋ ʌv/",
          register: "Casual",
          meaningThai: "กำลังคิดว่าจะ... (วางแผนคร่าวๆ)",
          example: "I'm thinking of cooking pasta tonight.",
        },
        {
          id: "a2-1-e2",
          phrase: "walk around",
          ipa: "/wɔːk əˈraʊnd/",
          register: "Neutral",
          meaningThai: "เดินเล่นชมบรรยากาศไปเรื่อยๆ",
          example: "Let's walk around the old town after lunch.",
        },
        {
          id: "a2-1-e3",
          phrase: "let me know",
          ipa: "/lɛt miː noʊ/",
          register: "Neutral",
          meaningThai: "บอกให้ฉันรู้ด้วยนะ / แจ้งกลับด้วยนะ",
          example: "Let me know when you get home safely.",
        },
        {
          id: "a2-1-e4",
          phrase: "wait for",
          ipa: "/weɪt fɔːr/",
          register: "Neutral",
          meaningThai: "รอใครสักคน",
          example: "Thanks for waiting for me at the gate.",
        },
      ],
      questions: [
        {
          id: "a2-1-rq1",
          questionThai: "กลุ่มเพื่อนจะนัดเจอกันตรงจุดไหน?",
          options: ["ข้างในร้านอาหาร", "ด้านนอกทางออกหลักของสถานีรถไฟ", "ที่บ้านของ Liam"],
          correctIndex: 1,
          explanationThai: "'meet us outside the main train exit'",
        },
        {
          id: "a2-1-rq2",
          questionThai: "ต้องแจ้ง Liam ภายในเมื่อไหร่ถ้าจะไปด้วย?",
          options: ["คืนวันเสาร์", "เช้าวันจันทร์", "ตอนบ่ายวันอาทิตย์"],
          correctIndex: 0,
          explanationThai: "'Let me know by Saturday night'",
        },
      ],
    },
    writing: {
      promptTitle: "Reply to Liam's Weekend Message",
      promptInstructionThai:
        "เขียนข้อความตอบกลับ Liam ว่าคุณอยากไปด้วย พร้อมถามรายละเอียดเพิ่ม 1 อย่าง (เช่น กี่โมง หรือกินอะไรดี)",
      promptInstructionEn: "Write a friendly 3–4 sentence reply accepting Liam's invitation and asking one detail.",
      targetExpressions: ["Sounds great", "I'd love to", "let me know", "meet at"],
      minWords: 18,
      sampleStarter: "Hey Liam! Sounds great, I'd love to join on Sunday...",
    },
  },

  // ================= RANK 3 (B1 — CONVERSATIONAL FLOW) =================
  {
    id: "B1-1",
    rankId: "B1",
    sequenceNumber: 1,
    number: "01",
    topicCategory: "Small Talk & เข้าสังคม",
    titleEn: "Coffee, Rhythm & Real First Impressions",
    titleThai: "ชวนคุยอย่างเป็นธรรมชาติและจับจังหวะเสียงเชื่อมคำ",
    levelLabel: "ขั้นที่ 3 (B1) · ปานกลาง",
    durationMinutes: 15,
    tutorId: "maya",
    summaryThai:
      "เปลี่ยนจากประโยคตำรา มาเป็นการทักทาย สั่งกาแฟ และฟังเสียงรวบคำ (gonna, kinda, for a bit) ที่เจ้าของภาษาใช้จริง",
    culturalInsightThai:
      "ในอเมริกา คำถาม 'How's it going?' ตอนสั่งกาแฟมักเป็นการทักทายสั้นๆ แค่ยิ้มแล้วตอบ 'Pretty good, thanks! Can I grab...' ก็ดูเป็นธรรมชาติทันที",
    listening: {
      sceneTitleThai: "บรรยากาศ: ร้านกาแฟช่วงเช้าในซีแอตเทิล",
      contextThai: "Maya กำลังสั่งกาแฟและคุยสั้นๆ กับพนักงานบาริสต้าชื่อ Sam ลองฟังแบบปิดซับก่อนเพื่อฝึกจับใจความ",
      partnerName: "Sam",
      partnerVoice: "Fenrir",
      dialogue: [
        {
          id: "l1-d1",
          speaker: "Sam",
          voiceName: "Fenrir",
          style: "Warm, upbeat Seattle barista",
          english: "Morning! How's it going today? What can I get started for you?",
          thai: "สวัสดีตอนเช้าครับ! วันนี้เป็นไงบ้างครับ รับอะไรดีเอ่ย?",
          connectedNotes: [
            {
              phrase: "How's it going",
              soundsLike: "ฮาว-ซิท-โก-อิง",
              explanationThai: "คำว่า 'How's' เชื่อมเสียง s เข้ากับ 'it' เป็น 'ซิท' เจ้าของภาษาไม่เว้นวรรคระหว่างคำ",
            },
            {
              phrase: "What can I",
              soundsLike: "วัท-เคอะ-นาย",
              explanationThai: "'can' ในประโยคคำถามที่ไม่เน้น จะลดเสียงเป็น 'เคอะ' แล้วเชื่อมกับ 'I' เป็น 'เคอะ-นาย'",
            },
          ],
        },
        {
          id: "l1-d2",
          speaker: "Maya",
          voiceName: "Kore",
          style: "Friendly, relaxed customer",
          english: "Pretty good, thanks! Can I grab an iced oat latte, maybe with light ice?",
          thai: "สบายดีค่ะ ขอบคุณ! ขอลาเต้เย็นนมโอ๊ตแก้วนึงนะคะ ขอแบบน้ำแข็งน้อยหน่อยค่ะ",
          connectedNotes: [
            {
              phrase: "Can I grab",
              soundsLike: "เคอะ-นาย-แกร็บ",
              explanationThai: "เจ้าของภาษามักใช้ 'Can I grab...' แทน 'I want to order...' เพื่อให้ฟังเป็นกันเอง",
            },
          ],
        },
        {
          id: "l1-d3",
          speaker: "Sam",
          voiceName: "Fenrir",
          style: "Friendly barista confirming order",
          english: "You got it. Are you gonna hang out here for a bit, or is this to go?",
          thai: "ได้เลยครับ วันนี้จะนั่งทานที่นี่สักพัก หรือรับกลับบ้านครับ?",
          connectedNotes: [
            {
              phrase: "gonna",
              soundsLike: "กอน-นะ",
              explanationThai: "รูปย่อพูดจริงของ 'going to' เมื่อตามด้วยกริยา",
            },
            {
              phrase: "for a bit",
              soundsLike: "เฟอะ-ระ-บิท",
              explanationThai: "แปลว่า 'สักครู่ / สักพัก' เชื่อมเสียงเป็น 'เฟอะ-ระ-บิท'",
            },
          ],
        },
        {
          id: "l1-d4",
          speaker: "Maya",
          voiceName: "Kore",
          style: "Warm, appreciative customer",
          english: "I'm actually meeting a friend here, so I'll take it for here. Thanks a bunch!",
          thai: "พอดีนัดเพื่อนไว้ที่นี่ค่ะ งั้นทานที่นี่เลย ขอบคุณมากๆ นะคะ!",
          connectedNotes: [
            {
              phrase: "Thanks a bunch",
              soundsLike: "แทงค์-ซะ-บันช์",
              explanationThai: "สำนวนขอบคุณแบบอบอุ่นเป็นกันเองมากกว่า 'Thank you very much'",
            },
          ],
        },
      ],
      questions: [
        {
          id: "l1-q1",
          questionThai: "Maya สั่งเครื่องดื่มแบบมีเงื่อนไขพิเศษอะไร?",
          options: [
            "ขอเพิ่มช็อตเอสเปรสโซและไม่ใส่น้ำแข็ง",
            "ขอนมโอ๊ตและใส่น้ำแข็งน้อย",
            "ขอแบบร้อนและรับกลับบ้าน",
          ],
          correctIndex: 1,
          explanationThai: "Maya พูดว่า 'iced oat latte, maybe with light ice' ซึ่ง 'light ice' แปลว่าใส่น้ำแข็งน้อย",
        },
        {
          id: "l1-q2",
          questionThai: "ทำไม Maya ถึงเลือกทานที่ร้าน ('for here')?",
          options: [
            "เพราะฝนตกหนักข้างนอก",
            "เพราะเธอนัดเพื่อนมาเจอที่ร้านนี้",
            "เพราะเธอลืมเอากระเป๋าตังค์มา",
          ],
          correctIndex: 1,
          explanationThai: "เธอตอบว่า 'I'm actually meeting a friend here, so I'll take it for here.'",
        },
      ],
    },
    speaking: {
      shadowingPhrases: [
        {
          id: "l1-s1",
          english: "Pretty good, thanks! How's your morning going?",
          stressGuide: "PRE-tty GOOD, THANKS! HOW'S your MOR-ning GO-ing?",
          ipa: "/ˈprɪti ɡʊd θæŋks | haʊz jər ˈmɔːrnɪŋ ˈɡoʊɪŋ/",
          thaiMeaning: "ก็ดีเลย ขอบคุณ! เช้านี้ของคุณเป็นไงบ้าง?",
          nativeTipThai: "ย้ำเสียงหนักที่ 'GOOD', 'THANKS' และ 'MOR-ning' ส่วน 'your' ออกเสียงเบาเร็วๆ เป็น 'เยอร์'",
        },
        {
          id: "l1-s2",
          english: "Can I grab an iced oat latte with light ice?",
          stressGuide: "Can I GRAB an ICED OAT LAT-te with LIGHT ICE?",
          ipa: "/kənaɪ ɡræb ən aɪst oʊt ˈlɑːteɪ wɪð laɪt aɪs/",
          thaiMeaning: "ขอลาเต้เย็นนมโอ๊ต น้ำแข็งน้อยแก้วนึงค่ะ",
          nativeTipThai: "รวบ 'Can I' เป็นเสียงเดียว 'เคอะ-นาย' แล้วเน้นชัดที่ 'GRAB' และ 'LIGHT ICE'",
        },
        {
          id: "l1-s3",
          english: "I'm gonna hang out here for a bit. Thanks a bunch!",
          stressGuide: "I'm GON-na HANG OUT here for a BIT. THANKS a BUNCH!",
          ipa: "/aɪm ˈɡʌnə hæŋ aʊt hɪr fərə bɪt | θæŋks ə bʌntʃ/",
          thaiMeaning: "เดี๋ยวจะนั่งเล่นที่นี่สักพัก ขอบคุณมากนะ!",
          nativeTipThai: "เชื่อมคำ 'for a bit' ให้ไหลเป็น 'เฟอะ-ระ-บิท'",
        },
      ],
      roleplayTitle: "Ordering & Small Talk at Maya's Favorite Café",
      roleplayContextThai: "สวมบทบาทลูกค้าในร้านกาแฟที่ซีแอตเทิล Maya จะรับบทบาริสต้าที่ชวนคุณคุยอย่างเป็นกันเอง",
      roleplayScenarioPrompt:
        "You are a friendly barista at a cozy Seattle coffee shop. Greet the learner, take their drink order, and make casual small talk about their plans for the day.",
      openingLineEn: "Hey there! Welcome in. How's your day treating you so far? What can I get started for you?",
      openingLineThai: "สวัสดีค่า ยินดีต้อนรับค่ะ! วันนี้เป็นไงบ้างคะ รับเครื่องดื่มอะไรดีเอ่ย?",
      goalTurns: 3,
    },
    reading: {
      formatLabel: "Neighborhood Café Note & Review",
      headline: "Why Locals Keep Coming Back to Cedar Street Roasters",
      authorMeta: "Seattle Neighborhood Guide · 2 min read",
      paragraphs: [
        "If you walk past Cedar Street around 8 a.m., you'll probably spot a line winding out the door. Don't let the crowd put you off—things move surprisingly fast, and the staff always make you feel right at home.",
        "Most regulars swear by their brown sugar oat cortado. It hits the spot on a rainy morning without being overly sweet. If you're on the fence about pastries, grab a warm cardamom bun before they sell out.",
        "Best of all, nobody rushes you out the door. Whether you just want to grab a cup to go or catch up with an old friend by the window, it's the kind of place where you instantly lose track of time.",
      ],
      expressions: [
        {
          id: "l1-e1",
          phrase: "put you off",
          ipa: "/pʊt juː ɒf/",
          register: "Casual",
          meaningThai: "ทำให้รู้สึกไม่อยากทำ / ทำให้ถอดใจ",
          example: "Don't let the long menu put you off—everything is delicious.",
        },
        {
          id: "l1-e2",
          phrase: "hits the spot",
          ipa: "/hɪts ðə spɒt/",
          register: "Idiomatic",
          meaningThai: "ถูกใจพอดีเป๊ะ / ชื่นใจสุดๆ",
          example: "A cold iced tea really hits the spot on a hot afternoon.",
        },
        {
          id: "l1-e3",
          phrase: "on the fence",
          ipa: "/ɒn ðə fɛns/",
          register: "Idiomatic",
          meaningThai: "ลังเล ยังตัดสินใจไม่ได้",
          example: "I'm still on the fence about whether to take the morning flight.",
        },
        {
          id: "l1-e4",
          phrase: "catch up with",
          ipa: "/kætʃ ʌp wɪð/",
          register: "Neutral",
          meaningThai: "นัดเจอกันเพื่ออัปเดตชีวิตหลังจากไม่ได้เจอนาน",
          example: "Let's grab lunch next week and catch up!",
        },
      ],
      questions: [
        {
          id: "l1-rq1",
          questionThai: "ประโยค 'Don't let the crowd put you off' สื่อความหมายว่าอะไร?",
          options: [
            "อย่าเพิ่งถอดใจเพราะเห็นคนต่อแถวเยอะ",
            "อย่าไปยืนขวางทางคนอื่นในร้าน",
            "แนะนำให้มาตอนร้านใกล้ปิดเท่านั้น",
          ],
          correctIndex: 0,
          explanationThai: "'put someone off' แปลว่าทำให้หมดอารมณ์หรือถอดใจ",
        },
        {
          id: "l1-rq2",
          questionThai: "บรรยากาศของร้านนี้เป็นอย่างไรตามย่อหน้าสุดท้าย?",
          options: [
            "เร่งรีบและเสียงดัง",
            "ผ่อนคลาย ไม่มีใครเร่งให้ออกจากร้านจนลืมเวลา",
            "ห้ามคุยเสียงดังเพราะเป็นโซนทำงาน",
          ],
          correctIndex: 1,
          explanationThai: "'nobody rushes you out the door' และ 'lose track of time' สื่อถึงบรรยากาศที่นั่งสบาย",
        },
      ],
    },
    writing: {
      promptTitle: "Texting a Foreign Friend to Meet for Coffee",
      promptInstructionThai:
        "เขียนข้อความสั้นๆ (3–5 ประโยค) ส่งหาเพื่อนต่างชาติเพื่อชวนไปนั่งดื่มกาแฟและอัปเดตชีวิตสุดสัปดาห์นี้",
      promptInstructionEn: "Write a casual text inviting a friend to catch up over coffee this weekend.",
      targetExpressions: ["catch up", "on the fence", "grab a coffee", "for a bit"],
      minWords: 20,
      sampleStarter: "Hey! It's been a while since we last caught up. Are you free to grab a coffee this Saturday?",
    },
  },

  // ================= RANK 4 (B2 — WORKPLACE & NUANCE) =================
  {
    id: "B2-1",
    rankId: "B2",
    sequenceNumber: 1,
    number: "01",
    topicCategory: "การทำงานและประชุมทีม",
    titleEn: "Workplace Standups & Polite Pushback",
    titleThai: "สื่อสารในที่ทำงาน อัปเดตงาน และเห็นต่างอย่างมืออาชีพ",
    levelLabel: "ขั้นที่ 4 (B2) · กลาง-สูง",
    durationMinutes: 20,
    tutorId: "oliver",
    summaryThai:
      "พูดในที่ประชุมกับทีมต่างชาติอย่างมั่นใจ รู้จักวิธีขอเลื่อนเดดไลน์ เสนอไอเดีย และปฏิเสธหรือเห็นต่างโดยไม่ฟังดูแข็งกระด้าง",
    culturalInsightThai:
      "ในวัฒนธรรมการทำงานฝั่งตะวันตก เจ้าของภาษามักใช้คำเชื่อมอย่าง 'I see where you're coming from, though...' เพื่อรับฟังก่อนเสนออีกมุม",
    listening: {
      sceneTitleThai: "บรรยากาศ: ประชุมทีมประจำวัน (Daily Standup) ที่ลอนดอน",
      contextThai: "Oliver กำลังคุยกับเพื่อนร่วมทีมชื่อ Hannah เรื่องตารางปล่อยฟีเจอร์ใหม่ที่มีเวลาจำกัด",
      partnerName: "Hannah",
      partnerVoice: "Kore",
      dialogue: [
        {
          id: "l3-d1",
          speaker: "Hannah",
          voiceName: "Kore",
          style: "Focused UK product manager",
          english: "Morning Oliver. Quick check-in—are we still on track to ship the redesign by Friday?",
          thai: "สวัสดีตอนเช้าโอลิเวอร์ เช็กเร็วนิดนึง—เรายังทันปล่อยดีไซน์ใหม่วันศุกร์นี้ใช่ไหม?",
          connectedNotes: [
            {
              phrase: "on track to",
              soundsLike: "ออน-แทร็ค-ทู",
              explanationThai: "เป็นไปตามแผน / ทันตามกำหนดการ",
            },
          ],
        },
        {
          id: "l3-d2",
          speaker: "Oliver",
          voiceName: "Charon",
          style: "Calm, thoughtful British designer",
          english: "To be honest, Friday might be cutting it a bit close. The mobile layout still needs testing.",
          thai: "เอาตรงๆ นะ วันศุกร์อาจจะกระชั้นชิดไปหน่อยครับ หน้าจอมือถือยังต้องเทสต์อีกนิด",
          connectedNotes: [
            {
              phrase: "cutting it a bit close",
              soundsLike: "คัท-ทิง-อิท-อะ-บิท-โคลส",
              explanationThai: "สำนวนสุภาพแปลว่า 'เวลาฉิวเฉียด / กระชั้นชิดมาก'",
            },
          ],
        },
        {
          id: "l3-d3",
          speaker: "Hannah",
          voiceName: "Kore",
          style: "Pragmatic, solution-oriented tone",
          english: "Gotcha. What if we launch the desktop version first and hold off on mobile until Tuesday?",
          thai: "เข้าใจเลย งั้นถ้าเราปล่อยเวอร์ชันเดสก์ท็อปก่อน แล้วชะลอฝั่งมือถือไปวันอังคารล่ะ?",
          connectedNotes: [
            {
              phrase: "hold off on",
              soundsLike: "โฮล-ดอฟ-ออน",
              explanationThai: "ชะลอไว้ก่อน / เลื่อนออกไปชั่วคราว",
            },
          ],
        },
        {
          id: "l3-d4",
          speaker: "Oliver",
          voiceName: "Charon",
          style: "Collaborative, relieved agreement",
          english: "That makes total sense. Let's touch base tomorrow afternoon once QA wraps up.",
          thai: "เข้าท่าเลยครับ งั้นเดี๋ยวพรุ่งนี้บ่ายเราค่อยมาอัปเดตกันอีกทีพอ QA ตรวจเสร็จ",
          connectedNotes: [
            {
              phrase: "touch base",
              soundsLike: "ทัช-เบส",
              explanationThai: "ทักทาย/คุยอัปเดตสั้นๆ เพื่อเช็กความคืบหน้า",
            },
          ],
        },
      ],
      questions: [
        {
          id: "l3-q1",
          questionThai: "ประโยค 'Friday might be cutting it a bit close' ของ Oliver หมายความว่าอย่างไร?",
          options: [
            "วันศุกร์เป็นวันที่เหมาะที่สุดที่จะปล่อยงาน",
            "กำหนดส่งวันศุกร์กระชั้นชิดเกินไป อาจไม่ทัน",
            "เขาขอลางานในวันศุกร์นี้",
          ],
          correctIndex: 1,
          explanationThai: "'cutting it close' แปลว่าเวลาจวนเจียนมาก มีความเสี่ยงที่จะทำไม่ทัน",
        },
        {
          id: "l3-q2",
          questionThai: "ทั้งคู่ตกลงแก้ปัญหาอย่างไร?",
          options: [
            "เลื่อนทั้งหมดไปสัปดาห์หน้า",
            "ปล่อยฝั่งเดสก์ท็อปก่อน และเลื่อนฝั่งมือถือไปวันอังคาร",
            "ตัดการทดสอบ QA ทิ้งไปเลย",
          ],
          correctIndex: 1,
          explanationThai: "Hannah เสนอให้ 'launch the desktop version first and hold off on mobile until Tuesday'",
        },
      ],
    },
    speaking: {
      shadowingPhrases: [
        {
          id: "l3-s1",
          english: "I see where you're coming from, though we might need more time.",
          stressGuide: "I SEE where you're COM-ing from, though we MIGHT need MORE TIME.",
          ipa: "/aɪ siː wɛr jər ˈkʌmɪŋ frʌm | ðoʊ wi maɪt niːd mɔːr taɪm/",
          thaiMeaning: "ผมเข้าใจมุมของคุณนะ แต่เราอาจจะต้องขอเวลาเพิ่มอีกหน่อย",
          nativeTipThai: "ใช้ 'I see where you're coming from' นำหน้าเสมอเมื่อต้องเห็นต่าง",
        },
        {
          id: "l3-s2",
          english: "To be honest, tomorrow is cutting it a bit close.",
          stressGuide: "To be HON-est, to-MOR-row is CUT-ting it a bit CLOSE.",
          ipa: "/tə bi ˈɒnɪst | təˈmɒroʊ ɪz ˈkʌtɪŋ ɪt ə bɪt kloʊs/",
          thaiMeaning: "เอาตามตรง พรุ่งนี้อาจจะกระชั้นชิดไปสักหน่อยครับ",
          nativeTipThai: "คำว่า 'Honest' ไม่ออกเสียงตัว H (อ่านว่า ออน-นิสท์)",
        },
        {
          id: "l3-s3",
          english: "Let's touch base tomorrow afternoon once everything wraps up.",
          stressGuide: "Let's TOUCH BASE to-MOR-row af-ter-NOON once EV-ery-thing WRAPS UP.",
          ipa: "/lɛts tʌtʃ beɪs təˈmɒroʊ ˌæftərˈnuːn wʌns ˈɛvriθɪŋ ræps ʌp/",
          thaiMeaning: "เดี๋ยวพรุ่งนี้บ่ายมาคุยอัปเดตกันอีกทีพอทุกอย่างเสร็จเรียบร้อยนะครับ",
          nativeTipThai: "เน้นชัดที่วลีคู่ 'TOUCH BASE' และ 'WRAPS UP'",
        },
      ],
      roleplayTitle: "Negotiating a Deadline with Oliver",
      roleplayContextThai: "Oliver เป็นหัวหน้าทีมในลอนดอนที่ถามคุณเรื่องความคืบหน้าโปรเจกต์ ลองอธิบายเหตุผลอย่างสุภาพและเสนอทางออก",
      roleplayScenarioPrompt:
        "You are Oliver, a supportive team lead in London. Ask the learner for an update on a client presentation due tomorrow. Encourage them to propose a realistic compromise.",
      openingLineEn: "Hi there! Just wanted to quickly check in on the client deck—how's it shaping up for tomorrow morning?",
      openingLineThai: "สวัสดีครับ! อยากแวะเช็กเรื่องสไลด์พรีเซนต์ลูกค้านิดนึง ตอนนี้คืบหน้าไปถึงไหนแล้ว พร้อมสำหรับพรุ่งนี้เช้าไหมครับ?",
      goalTurns: 3,
    },
    reading: {
      formatLabel: "Team Slack Thread",
      headline: "Re: Q4 Product Launch Timeline Adjustment",
      authorMeta: "Product & Engineering Channel · London HQ",
      paragraphs: [
        "Hey team — quick heads-up on the analytics dashboard. We're mostly in good shape, but a couple of edge cases popped up during yesterday's testing.",
        "Rather than rushing a half-baked fix before the weekend, I'd suggest we hold off on the public announcement until Monday morning. That gives everyone breathing room to double-check the numbers.",
        "If anyone feels strongly about sticking to Friday, please chime in below. Otherwise, let's play it by ear after this afternoon's review.",
      ],
      expressions: [
        {
          id: "l3-e1",
          phrase: "quick heads-up",
          ipa: "/kwɪk hɛdz ʌp/",
          register: "Workplace",
          meaningThai: "การแจ้งเตือนล่วงหน้าสั้นๆ ให้ทีมรับรู้",
          example: "Just a quick heads-up: the meeting moved to Room B.",
        },
        {
          id: "l3-e2",
          phrase: "half-baked",
          ipa: "/hæf beɪkt/",
          register: "Idiomatic",
          meaningThai: "ยังไม่สุกงอม / งานที่ทำแบบรีบๆ ยังไม่สมบูรณ์",
          example: "We shouldn't pitch a half-baked idea to the client.",
        },
        {
          id: "l3-e3",
          phrase: "chime in",
          ipa: "/tʃaɪm ɪn/",
          register: "Workplace",
          meaningThai: "ร่วมแสดงความคิดเห็นเสริมเข้ามาในวงสนทนา",
          example: "Feel free to chime in if you have any feedback.",
        },
        {
          id: "l3-e4",
          phrase: "play it by ear",
          ipa: "/pleɪ ɪt baɪ ɪr/",
          register: "Idiomatic",
          meaningThai: "ดูสถานการณ์หน้างานแล้วค่อยตัดสินใจอีกที",
          example: "Let's see how busy the venue is and play it by ear.",
        },
      ],
      questions: [
        {
          id: "l3-rq1",
          questionThai: "ทำไมผู้เขียน Slack จึงเสนอให้เลื่อนการประกาศออกไปเป็นวันจันทร์?",
          options: [
            "เพราะทีมอยากหยุดงานวันศุกร์",
            "เพื่อไม่ให้รีบปล่อยงานที่ยังไม่สมบูรณ์ และมีเวลาเช็กตัวเลขซ้ำให้ชัวร์",
            "เพราะระบบล่มทั้งหมด",
          ],
          correctIndex: 1,
          explanationThai: "ผู้เขียนใช้คำว่า 'Rather than rushing a half-baked fix' และต้องการ 'breathing room'",
        },
        {
          id: "l3-rq2",
          questionThai: "วลี 'please chime in below' ในช่องแชททำงานแปลว่าอะไร?",
          options: [
            "กรุณาปิดเสียงแจ้งเตือน",
            "เชิญร่วมออกความเห็นเพิ่มเติมด้านล่างได้เลย",
            "ให้ลบข้อความทิ้งทันที",
          ],
          correctIndex: 1,
          explanationThai: "'chime in' คือการร่วมเสนอความเห็นเพิ่มเติมในกลุ่ม",
        },
      ],
    },
    writing: {
      promptTitle: "Write a Professional Slack Update",
      promptInstructionThai:
        "เขียนข้อความ Slack ถึงทีมเพื่อแจ้งความคืบหน้าและขอเลื่อนส่งงานออกไป 1–2 วันอย่างมืออาชีพ พร้อมเสนอทางออกที่ชัดเจน",
      promptInstructionEn: "Write a polite, clear Slack message informing your team of a slight delay and proposing next steps.",
      targetExpressions: ["quick heads-up", "cutting it close", "hold off on", "touch base"],
      minWords: 28,
      sampleStarter: "Hey team, quick heads-up on the report—I'm making solid progress, though Friday might be...",
    },
  },

  // ================= RANK 5 (C1 — ADVANCED NUANCE) =================
  {
    id: "C1-1",
    rankId: "C1",
    sequenceNumber: 1,
    number: "01",
    topicCategory: "สำนวน อารมณ์ขัน และนัยแฝง",
    titleEn: "Nuance, Persuasion & Native Fluency",
    titleThai: "สื่อสารเชิงลึก โน้มน้าวใจ และพูดคล่องด้วยสำนวนขั้นสูง",
    levelLabel: "ขั้นที่ 5 (C1) · สูง",
    durationMinutes: 22,
    tutorId: "oliver",
    summaryThai:
      "ฝึกอ่านความหมายแฝง แสดงทัศนะอย่างมีน้ำหนัก ใช้สำนวนเปรียบเปรย และตัวเชื่อมความคิดระดับ C1",
    culturalInsightThai:
      "การใช้ Discourse Markers เช่น 'That being said...', 'To be fair...', 'The silver lining is...' ช่วยจัดระเบียบความคิดขณะพูดได้อย่างมืออาชีพ",
    listening: {
      sceneTitleThai: "บรรยากาศ: รายการพอดแคสต์คุยเรื่องการปรับตัวในต่างแดน",
      contextThai: "Oliver และ Maya แลกเปลี่ยนมุมมองเรื่องการย้ายไปทำงานต่างประเทศและการเรียนรู้จากความผิดพลาด",
      partnerName: "Maya",
      partnerVoice: "Kore",
      dialogue: [
        {
          id: "l5-d1",
          speaker: "Maya",
          voiceName: "Kore",
          style: "Reflective podcast host",
          english: "Moving abroad sounds glamorous on paper, but honestly, the first three months threw me for a loop.",
          thai: "การย้ายไปอยู่ต่างประเทศฟังดูหรูหราในกระดาษนะ แต่เอาเข้าจริง สามเดือนแรกนี่ทำเอาฉันมึนไปเลย",
          connectedNotes: [
            {
              phrase: "threw me for a loop",
              soundsLike: "ธรู-มี-เฟอะ-ระ-ลูป",
              explanationThai: "ทำให้ตั้งตัวไม่ทัน / ประหลาดใจหรือสับสนหนักมาก",
            },
          ],
        },
        {
          id: "l5-d2",
          speaker: "Oliver",
          voiceName: "Charon",
          style: "Thoughtful, empathetic co-host",
          english: "Oh, I bet. To be fair, it's hard when you're second-guessing every word you say.",
          thai: "โอ้ เชื่อเลยครับ จริงๆ มันเหนื่อยนะเวลาที่เราต้องคอยระแวงทุกคำที่ตัวเองพูดออกไป",
          connectedNotes: [
            {
              phrase: "second-guessing",
              soundsLike: "เซ็ค-เคินด์-เกส-ซิง",
              explanationThai: "ลังเลสงสัยในสิ่งที่ตัวเองพูดหรือทำลงไป",
            },
          ],
        },
        {
          id: "l5-d3",
          speaker: "Maya",
          voiceName: "Kore",
          style: "Warm, insightful realization",
          english: "Exactly! The silver lining, though, was realizing people care way more about warmth than perfect grammar.",
          thai: "เป๊ะเลย! แต่ข้อดีที่ซ่อนอยู่ก็คือ ฉันเพิ่งรู้ว่าผู้คนแคร์ความจริงใจมากกว่าไวยากรณ์ที่สมบูรณ์แบบเสียอีก",
          connectedNotes: [
            {
              phrase: "The silver lining",
              soundsLike: "เดอะ-ซิล-เวอร์-ไล-นิง",
              explanationThai: "แง่มุมดีๆ ที่ซ่อนอยู่ในสถานการณ์ที่ยากลำบาก",
            },
          ],
        },
        {
          id: "l5-d4",
          speaker: "Oliver",
          voiceName: "Charon",
          style: "Encouraging, resonant conclusion",
          english: "Couldn't agree more. Once you stop translating in your head, everything starts to click.",
          thai: "เห็นด้วยสุดๆ ครับ พอเราเลิกแปลในหัวทีละคำ ทุกอย่างมันจะเริ่มคลิกและไหลลื่นเอง",
          connectedNotes: [
            {
              phrase: "starts to click",
              soundsLike: "สตาร์ทส์-ทะ-คลิก",
              explanationThai: "'click' ในบริบทนี้แปลว่า 'เข้าใจแจ่มแจ้ง / ลงตัวเข้าที่เข้าทาง'",
            },
          ],
        },
      ],
      questions: [
        {
          id: "l5-q1",
          questionThai: "ข้อดี ('silver lining') ที่ Maya ค้นพบจากการย้ายไปอยู่ต่างประเทศคืออะไร?",
          options: [
            "คนต่างชาติให้ความสำคัญกับความอบอุ่นเป็นกันเองมากกว่าไวยากรณ์เป๊ะๆ",
            "ต้องพูดให้เร็วที่สุดถึงจะดูเก่ง",
            "ควรหลีกเลี่ยงการคุยกับคนแปลกหน้า",
          ],
          correctIndex: 0,
          explanationThai: "'people care way more about warmth than perfect grammar'",
        },
        {
          id: "l5-q2",
          questionThai: "ตามคำพูดของ Oliver เมื่อไหร่ที่ภาษาอังกฤษจะ 'starts to click'?",
          options: [
            "เมื่อท่องศัพท์ได้ครบหมื่นคำ",
            "เมื่อหยุดแปลในหัวและกล้าสื่อสารตรงๆ",
            "เมื่อจำกฎแกรมมาร์ได้ทุกข้อ",
          ],
          correctIndex: 1,
          explanationThai: "'Once you stop translating in your head, everything starts to click.'",
        },
      ],
    },
    speaking: {
      shadowingPhrases: [
        {
          id: "l5-s1",
          english: "That being said, I still think it's worth taking the leap.",
          stressGuide: "THAT be-ing SAID, I STILL think it's WORTH ta-king the LEAP.",
          ipa: "/ðæt ˈbiːɪŋ sɛd | aɪ stɪl θɪŋk ɪts wɜːrθ ˈteɪkɪŋ ðə liːp/",
          thaiMeaning: "ถึงอย่างนั้นก็ตาม ผมก็ยังคิดว่ามันคุ้มค่าที่จะลองเสี่ยงดูนะ",
          nativeTipThai: "'That being said,' ใช้เปลี่ยนมุมมองอย่างสละสลวย",
        },
        {
          id: "l5-s2",
          english: "Read between the lines—they're actually asking for support.",
          stressGuide: "READ be-tween the LINES—they're AC-tual-ly AS-king for sup-PORT.",
          ipa: "/riːd bɪˈtwiːn ðə laɪnz | ðɛr ˈæktʃuəli ˈæskɪŋ fər səˈpɔːrt/",
          thaiMeaning: "ลองตีความนัยดูดีๆ สิ จริงๆ แล้วพวกเขากำลังขอความช่วยเหลืออยู่นะ",
          nativeTipThai: "เน้นคำว่า 'READ' และ 'LINES' ให้หนักแน่น",
        },
        {
          id: "l5-s3",
          english: "Once you stop second-guessing yourself, everything clicks.",
          stressGuide: "ONCE you STOP sec-ond-GUES-sing your-SELF, EV-ery-thing CLICKS.",
          ipa: "/wʌns juː stɒp ˈsɛkəndˌɡɛsɪŋ jərˈsɛlf | ˈɛvriθɪŋ klɪks/",
          thaiMeaning: "พอคุณเลิกสงสัยในตัวเองเมื่อไหร่ ทุกอย่างจะลงตัวทันที",
          nativeTipThai: "ฝึกพูดประโยคนี้ด้วยความมั่นใจและจังหวะที่เป็นธรรมชาติ",
        },
      ],
      roleplayTitle: "Deep Roundtable Discussion with Oliver",
      roleplayContextThai: "Oliver จะชวนคุณคุยแลกเปลี่ยนมุมมองแบบผู้ใหญ่ในประเด็นการปรับตัวและการเติบโต",
      roleplayScenarioPrompt:
        "You are Oliver hosting an advanced C1 discussion. Ask thoughtful follow-up questions about cultural adaptation and learning, encouraging rich idioms and nuanced reasoning.",
      openingLineEn: "I'd love your candid take: when people move abroad or join global teams, what makes the biggest difference between merely surviving and truly thriving?",
      openingLineThai: "ผมอยากฟังความเห็นตรงๆ ของคุณเลยครับ เวลาคนเราย้ายไปอยู่ต่างประเทศหรือร่วมงานกับทีมระดับโลก อะไรคือจุดเปลี่ยนที่ทำให้เราไม่ได้แค่เอาตัวรอด แต่เติบโตได้จริง?",
      goalTurns: 3,
    },
    reading: {
      formatLabel: "Editorial Essay",
      headline: "Why Fluency Feels Less Like a Test and More Like Music",
      authorMeta: "Oliver Grant · London Atelier · 3 min read",
      paragraphs: [
        "Most of us grew up treating English like an obstacle course—memorize ten rules, avoid every mistake, and pray nobody asks a follow-up question. No wonder so many thoughtful learners freeze up mid-sentence.",
        "Yet listen to any natural conversation on a London train or a Melbourne street. People pause, change direction mid-thought, and use simple words with rich rhythm. Fluency isn't about never stumbling; it's about keeping the music going when you do.",
        "The moment you allow yourself to speak imperfectly—to paraphrase, ask for clarity, and share real stories—the barrier dissolves. On the other side of hesitation isn't perfection; it's genuine human connection.",
      ],
      expressions: [
        {
          id: "l5-e1",
          phrase: "freeze up",
          ipa: "/friːz ʌp/",
          register: "Casual",
          meaningThai: "สมองตื้อ พูดไม่ออกกะทันหันเพราะความประหม่า",
          example: "I used to freeze up whenever someone asked me a question in English.",
        },
        {
          id: "l5-e2",
          phrase: "mid-thought",
          ipa: "/mɪd θɔːt/",
          register: "Neutral",
          meaningThai: "กลางคันขณะที่กำลังคิดหรือพูดอยู่",
          example: "She stopped mid-thought when she spotted an old friend.",
        },
        {
          id: "l5-e3",
          phrase: "paraphrase",
          ipa: "/ˈpærəfreɪz/",
          register: "Neutral",
          meaningThai: "อธิบายด้วยคำพูดของตัวเองให้ง่ายขึ้นเมื่อนึกศัพท์ไม่ออก",
          example: "If you forget a word, just paraphrase what you mean.",
        },
        {
          id: "l5-e4",
          phrase: "dissolves",
          ipa: "/dɪˈzɒlvz/",
          register: "Idiomatic",
          meaningThai: "สลายหายไป ค่อยๆ หมดไป",
          example: "The awkward silence dissolves once everyone laughs.",
        },
      ],
      questions: [
        {
          id: "l5-rq1",
          questionThai: "ตามบทความ 'Fluency' (ความคล่องแคล่ว) ที่แท้จริงหมายถึงอะไร?",
          options: [
            "การไม่พูดผิดแกรมมาร์เลยแม้แต่คำเดียว",
            "การรักษาจังหวะการสื่อสารให้เดินต่อได้ แม้จะมีสะดุดหรือเปลี่ยนประโยคบ้าง",
            "การพูดให้เร็วที่สุดเท่าที่จะทำได้",
          ],
          correctIndex: 1,
          explanationThai: "ผู้เขียนเปรียบเทียบว่า 'Fluency isn't about never stumbling; it's about keeping the music going when you do.'",
        },
        {
          id: "l5-rq2",
          questionThai: "ผู้เขียนแนะนำให้ทำอย่างไรเมื่อต้องก้าวข้ามความลังเลในการพูด?",
          options: [
            "อนุญาตให้ตัวเองพูดแบบไม่สมบูรณ์แบบ กล้าอธิบายอ้อมๆ และเล่าเรื่องจริง",
            "เงียบไว้จนกว่าจะแต่งประโยคในหัวได้ครบ 100%",
            "ท่องบทความยาวๆ ให้ได้ก่อนพูด",
          ],
          correctIndex: 0,
          explanationThai: "'The moment you allow yourself to speak imperfectly—to paraphrase, ask for clarity, and share real stories—the barrier dissolves.'",
        },
      ],
    },
    writing: {
      promptTitle: "Your Native Reflection & Persuasive Perspective",
      promptInstructionThai:
        "เขียนย่อหน้าสั้นๆ (4–6 ประโยค) สะท้อนมุมมองของคุณเกี่ยวกับการก้าวข้ามความกลัวในการสื่อสารข้ามวัฒนธรรม",
      promptInstructionEn: "Write a nuanced 4–6 sentence reflection on overcoming hesitation in cross-cultural communication.",
      targetExpressions: ["that being said", "silver lining", "freeze up", "paraphrase"],
      minWords: 35,
      sampleStarter: "For a long time, I used to freeze up whenever I had to speak English. That being said...",
    },
  },

  // ================= RANK 6 (C2 — NATIVE MASTERY) =================
  {
    id: "C2-1",
    rankId: "C2",
    sequenceNumber: 1,
    number: "01",
    topicCategory: "วาทศิลป์และมุมมองระดับสูง",
    titleEn: "Subtext, Rhetoric & Executive Clarity",
    titleThai: "วาทศิลป์ระดับสูง การตีความนัย และสื่อสารอย่างทรงพลัง",
    levelLabel: "ขั้นที่ 6 (C2) · ระดับเจ้าของภาษา",
    durationMinutes: 25,
    tutorId: "oliver",
    summaryThai:
      "ระดับสูงสุดของการสื่อสาร: ถอดรหัสภาษาที่มีนัยแฝง การใช้น้ำเสียงโน้มน้าวอย่างมีชั้นเชิง และการเขียนเชิงบรรณาธิการ",
    culturalInsightThai:
      "ในระดับ C2 ความแตกต่างไม่ได้อยู่ที่การใช้ศัพท์หรูหราเกินจำเป็น แต่อยู่ที่ความแม่นยำในการเลือกคำ (Precision) และจังหวะเว้นวรรคที่ทรงพลัง",
    listening: {
      sceneTitleThai: "บรรยากาศ: การอภิปรายผู้บริหารและนักออกแบบที่ลอนดอน",
      contextThai: "Oliver และ Maya ถกกันเรื่องความเร็วในการสร้างเทคโนโลยีกับผลกระทบต่อความใส่ใจของมนุษย์",
      partnerName: "Maya",
      partnerVoice: "Kore",
      dialogue: [
        {
          id: "c2-1-d1",
          speaker: "Maya",
          voiceName: "Kore",
          style: "Sharp, articulate American strategist",
          english: "Every tool promises to buy back our time, yet somehow we're all perpetually strapped for attention.",
          thai: "เครื่องมือทุกชิ้นต่างสัญญาว่าจะช่วยซื้อเวลาคืนให้เรา แต่ไหงพวกเราทุกคนถึงยังขาดแคลนสมาธิอยู่ตลอดเวลา",
          connectedNotes: [
            {
              phrase: "strapped for attention",
              soundsLike: "สแทรพท์-เฟอะ-ระ-เทน-ชัน",
              explanationThai: "'strapped for...' แปลว่าขาดแคลนอย่างหนัก มักใช้กับเงินหรือเวลา แต่นำมาใช้กับสมาธิได้อย่างเฉียบคม",
            },
          ],
        },
        {
          id: "c2-1-d2",
          speaker: "Oliver",
          voiceName: "Charon",
          style: "Measured, witty British commentator",
          english: "Spot on. Efficiency without discernment just helps us run faster in directions we haven't bothered to question.",
          thai: "ตรงเผงเลยครับ ประสิทธิภาพที่ปราศจากการไตร่ตรองก็แค่ช่วยให้เราวิ่งเร็วขึ้นไปในทิศทางที่เรายังไม่เคยเสียเวลาตั้งคำถามด้วยซ้ำ",
          connectedNotes: [
            {
              phrase: "Spot on",
              soundsLike: "สปอท-ออน",
              explanationThai: "สำนวนอังกฤษแปลว่า 'เป๊ะ / ตรงประเด็นที่สุด'",
            },
          ],
        },
      ],
      questions: [
        {
          id: "c2-1-q1",
          questionThai: "ความย้อนแย้งที่ Maya ชี้ให้เห็นคืออะไร?",
          options: [
            "เทคโนโลยีช่วยประหยัดเวลา แต่คนกลับมีสมาธิจดจ่อน้อยลงเรื่อยๆ",
            "เครื่องมือดิจิทัลมีราคาแพงเกินไป",
            "ทุกคนควรเลิกใช้อินเทอร์เน็ต",
          ],
          correctIndex: 0,
          explanationThai: "เธอพูดว่า 'Every tool promises to buy back our time, yet somehow we're all perpetually strapped for attention.'",
        },
        {
          id: "c2-1-q2",
          questionThai: "Oliver มองว่า 'ประสิทธิภาพที่ปราศจากการไตร่ตรอง' ส่งผลอย่างไร?",
          options: [
            "ทำให้ทำงานช้าลง",
            "ทำให้เรายิ่งเร่งรีบไปในทิศทางที่ไม่ได้ตั้งคำถามว่าถูกต้องหรือไม่",
            "ช่วยให้ตัดสินใจแม่นยำขึ้นเสมอ",
          ],
          correctIndex: 1,
          explanationThai: "'helps us run faster in directions we haven't bothered to question'",
        },
      ],
    },
    speaking: {
      shadowingPhrases: [
        {
          id: "c2-1-s1",
          english: "Efficiency without discernment merely accelerates the wrong priorities.",
          stressGuide: "Ef-FI-cien-cy with-out dis-CERN-ment MERE-ly ac-CEL-er-ates the WRONG pri-OR-i-ties.",
          ipa: "/ɪˈfɪʃənsi wɪˈðaʊt dɪˈsɜːrnmənt ˈmɪrli əkˈsɛləreɪts ðə rɒŋ praɪˈɒrɪtiz/",
          thaiMeaning: "ประสิทธิภาพที่ไร้ซึ่งวิจารณญาณเป็นเพียงตัวเร่งให้เราทำสิ่งที่ไม่สำคัญเร็วขึ้นเท่านั้น",
          nativeTipThai: "คุมจังหวะช้าลงเล็กน้อยในคำสำคัญอย่าง 'discernment' เพื่อสร้างน้ำหนักในการพูด",
        },
        {
          id: "c2-1-s2",
          english: "To play devil's advocate, isn't friction sometimes what deepens understanding?",
          stressGuide: "To play DEV-il's AD-vo-cate, IS-n't FRIC-tion SOME-times what DEE-pens un-der-STAN-ding?",
          ipa: "/tə pleɪ ˈdɛvəlz ˈædvəkət | ˈɪzənt ˈfrɪkʃən ˈsʌmtaɪmz wʌt ˈdiːpənz ˌʌndərˈstændɪŋ/",
          thaiMeaning: "ถ้าลองมองต่างมุมดูบ้าง บางครั้งอุปสรรคเล็กๆ น้อยๆ นั่นแหละไม่ใช่หรือที่ทำให้เราเข้าใจลึกซึ้งขึ้น?",
          nativeTipThai: "'play devil's advocate' ใช้เกริ่นก่อนตั้งคำถามท้าทายอย่างสร้างสรรค์",
        },
      ],
      roleplayTitle: "Executive Rhetoric & Debate with Oliver",
      roleplayContextThai: "โต้วาทีแลกเปลี่ยนทัศนะระดับสูงกับ Oliver โดยเน้นความชัดเจนของเหตุผลและชั้นเชิงภาษา",
      roleplayScenarioPrompt:
        "You are Oliver engaging in an articulate C2 debate about speed vs. craftsmanship in modern life. Challenge the learner politely with nuanced counterpoints and appreciate sophisticated phrasing.",
      openingLineEn: "Here's a provocation I've been mulling over: in an age obsessed with frictionless convenience, are we quietly losing the patience required for true mastery?",
      openingLineThai: "นี่คือประเด็นชวนคิดที่ผมครุ่นคิดอยู่ครับ: ในยุคที่ทุกอย่างหมกมุ่นกับความสะดวกไร้รอยต่อ เรากำลังสูญเสียความอดทนที่จำเป็นต่อความเชี่ยวชาญที่แท้จริงไปอย่างเงียบๆ หรือเปล่า?",
      goalTurns: 3,
    },
    reading: {
      formatLabel: "Longform Essay Excerpt",
      headline: "The Quiet Architecture of Unhurried Thought",
      authorMeta: "London Review · 3 min read",
      paragraphs: [
        "We tend to mistake immediacy for insight. A crisp answer delivered within milliseconds carries an aura of authority, even when the underlying premise begs for scrutiny.",
        "Yet genuine mastery—whether in language, craft, or leadership—resides in the pauses between remarks: the willingness to sit with ambiguity rather than papering over it with clichés.",
      ],
      expressions: [
        {
          id: "c2-1-e1",
          phrase: "begs for scrutiny",
          ipa: "/bɛɡz fər ˈskruːtɪni/",
          register: "Idiomatic",
          meaningThai: "สมควรถูกตรวจสอบตั้งคำถามอย่างละเอียด",
          example: "Such a bold claim begs for closer scrutiny.",
        },
        {
          id: "c2-1-e2",
          phrase: "papering over",
          ipa: "/ˈpeɪpərɪŋ ˈoʊvər/",
          register: "Idiomatic",
          meaningThai: "กลบเกลื่อนปัญหาไว้ผิวเผินโดยไม่ได้แก้ไขจริง",
          example: "No slogan can keep papering over structural flaws.",
        },
      ],
      questions: [
        {
          id: "c2-1-rq1",
          questionThai: "ผู้เขียนเตือนให้ระวังความเข้าใจผิดเรื่องใดในย่อหน้าแรก?",
          options: [
            "การเข้าใจผิดว่าคำตอบที่รวดเร็วทันใจหมายถึงความลุ่มลึกเสมอไป",
            "การเขียนบทความที่ยาวเกินไป",
            "การพูดช้าเกินไปในที่ประชุม",
          ],
          correctIndex: 0,
          explanationThai: "'We tend to mistake immediacy for insight.'",
        },
      ],
    },
    writing: {
      promptTitle: "Craft a Concise Editorial Argument",
      promptInstructionThai:
        "เขียนบทความสั้นระดับบรรณาธิการ (4–6 ประโยค) แสดงทัศนะเรื่อง 'ความเร็วกับคุณภาพ' ในการทำงานหรือการเรียนรู้",
      promptInstructionEn: "Write a sharp, balanced 4–6 sentence editorial argument contrasting speed with depth.",
      targetExpressions: ["discernment", "begs for scrutiny", "play devil's advocate", "papering over"],
      minWords: 40,
      sampleStarter: "While modern tools celebrate speed above all else, true craftsmanship begs for...",
    },
  },
];
