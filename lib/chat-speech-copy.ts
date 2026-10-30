import type { Language } from "./i18n";

// Shown beside the speech controls, including in the compact chat widget.
const disclosures: Record<Language, string> = {
  en: "If a device voice is unavailable, read-aloud sends the reply text to Google Gemini to create audio.",
  hi: "डिवाइस पर आवाज़ उपलब्ध न होने पर, उत्तर सुनाने के लिए उसका पाठ Google Gemini को भेजा जाता है।",
  bn: "ডিভাইসে উপযুক্ত কণ্ঠ না থাকলে, পড়ে শোনানোর অডিও তৈরির জন্য উত্তরের লেখা Google Gemini-তে পাঠানো হয়।",
  ta: "சாதனத்தில் பொருத்தமான குரல் இல்லையெனில், ஒலியை உருவாக்க பதிலின் உரை Google Gemini-க்கு அனுப்பப்படும்.",
  te: "పరికరంలో తగిన స్వరం లేకపోతే, ఆడియోను రూపొందించడానికి సమాధాన వచనం Google Geminiకి పంపబడుతుంది.",
  mr: "डिव्हाइसवर योग्य आवाज नसल्यास, वाचून दाखवण्यासाठी उत्तराचा मजकूर Google Gemini कडे पाठवला जातो.",
  gu: "ઉપકરણ પર યોગ્ય અવાજ ન હોય તો, વાંચી સંભળાવવાનો ઑડિયો બનાવવા જવાબનું લખાણ Google Geminiને મોકલવામાં આવે છે.",
  kn: "ಸಾಧನದಲ್ಲಿ ಸೂಕ್ತ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲದಿದ್ದರೆ, ಆಡಿಯೊ ರಚಿಸಲು ಉತ್ತರದ ಪಠ್ಯವನ್ನು Google Geminiಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.",
  ml: "ഉപകരണത്തിൽ അനുയോജ്യമായ ശബ്ദം ഇല്ലെങ്കിൽ, ഓഡിയോ ഉണ്ടാക്കാൻ മറുപടിയുടെ വാചകം Google Gemini-ലേക്ക് അയയ്ക്കും.",
  pa: "ਡਿਵਾਈਸ ਉੱਤੇ ਢੁਕਵੀਂ ਆਵਾਜ਼ ਨਾ ਹੋਣ ’ਤੇ, ਆਡੀਓ ਬਣਾਉਣ ਲਈ ਜਵਾਬ ਦਾ ਪਾਠ Google Gemini ਨੂੰ ਭੇਜਿਆ ਜਾਂਦਾ ਹੈ।",
};

export function speechDisclosure(language: Language) { return disclosures[language]; }
