/**
 * Agronomy AI — Navigation Registry
 * Allowlisted navigation map with multilingual voice aliases for all 8 routes.
 */

import { NavigationEntry } from './voiceOS'

export const NAVIGATION_REGISTRY: Record<string, NavigationEntry> = {
  home: {
    path: '/',
    label: 'Home',
    description: 'Agronomy AI home page with features overview',
    keywords_en: ['home', 'homepage', 'main', 'start', 'go home', 'back to home', 'main page'],
    keywords_te: ['హోమ్', 'హోమ్ పేజ్', 'ప్రారంభ పేజ్', 'మొదటి పేజ్', 'ముందు పేజీ'],
    keywords_hi: ['होम', 'होम पेज', 'मुख्य पेज', 'शुरुआत', 'मुख्य'],
  },
  scanning: {
    path: '/scanning',
    label: 'Disease Scanner',
    description: 'Plant disease detection using AI and camera',
    keywords_en: ['scan', 'scanning', 'disease', 'detect', 'plant disease', 'disease detection', 'scan plant', 'check disease', 'disease scanner', 'diagnose', 'analyze plant', 'check leaf', 'leaf scan'],
    keywords_te: ['స్కాన్', 'తెగులు', 'తెగులు తనిఖీ', 'మొక్క తెగులు', 'తెగులు గుర్తించు', 'ఆకు తనిఖీ', 'స్కానింగ్'],
    keywords_hi: ['स्कैन', 'रोग', 'रोग जांच', 'पौधे की जांच', 'बीमारी', 'रोग पहचान', 'स्कैनिंग', 'पत्ती जांच'],
  },
  'crop-recommendation': {
    path: '/crop-recommendation',
    label: 'Crop Recommender',
    description: 'Get crop recommendations based on soil and climate data',
    keywords_en: ['crop recommendation', 'recommend crop', 'crop advice', 'what crop', 'crop suggestion', 'crop recommender', 'soil analysis', 'which crop', 'best crop', 'suitable crop'],
    keywords_te: ['పంట సిఫార్సు', 'పంట సలహా', 'పంట తెలుసుకో', 'ఏ పంట', 'పంట సూచన', 'పంట నిర్ణయం'],
    keywords_hi: ['फसल सलाह', 'फसल सिफारिश', 'कौन सी फसल', 'फसल चुनाव', 'फसल सुझाव', 'कौनसी फसल'],
  },
  crops: {
    path: '/crops',
    label: 'Crop Guides',
    description: 'Detailed cultivation guides for 23 major crops',
    keywords_en: ['crop guides', 'crop info', 'cultivation', 'crop library', 'growing guide', 'crop details', 'crops', 'crop information', 'farming guide'],
    keywords_te: ['పంట మార్గదర్శకాలు', 'పంట సమాచారం', 'పంట వివరాలు', 'పంట గైడ్', 'వ్యవసాయ మార్గదర్శకాలు'],
    keywords_hi: ['फसल मार्गदर्शिका', 'फसल जानकारी', 'खेती गाइड', 'फसल विवरण', 'फसलें', 'फसल की जानकारी'],
  },
  dashboard: {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Agricultural analytics and statistics',
    keywords_en: ['dashboard', 'stats', 'statistics', 'analytics', 'reports', 'overview', 'data', 'numbers'],
    keywords_te: ['డాష్‌బోర్డ్', 'గణాంకాలు', 'నివేదికలు', 'సారాంశం', 'విశ్లేషణ'],
    keywords_hi: ['डैशबोर्ड', 'आंकड़े', 'विश्लेषण', 'रिपोर्ट', 'सारांश', 'डेटा'],
  },
  history: {
    path: '/history',
    label: 'History',
    description: 'Past disease scans and crop recommendations',
    keywords_en: ['history', 'previous scans', 'past results', 'my scans', 'scan history', 'past recommendations', 'old results'],
    keywords_te: ['చరిత్ర', 'మునుపటి స్కాన్లు', 'పాత ఫలితాలు', 'నా స్కాన్లు'],
    keywords_hi: ['इतिहास', 'पुराने स्कैन', 'पिछले परिणाम', 'मेरे स्कैन', 'पुरानी जांच'],
  },
  fertilizer: {
    path: '/fertilizer',
    label: 'Fertilizer Guide',
    description: 'Fertilizer recommendations and guidance',
    keywords_en: ['fertilizer', 'fertiliser', 'fertilizer guide', 'manure', 'npk', 'nutrients', 'urea', 'dap', 'soil nutrients'],
    keywords_te: ['ఎరువు', 'ఎరువు గైడ్', 'ఎరువుల సమాచారం', 'యూరియా', 'డీఏపీ', 'పోషకాలు'],
    keywords_hi: ['उर्वरक', 'खाद', 'उर्वरक गाइड', 'यूरिया', 'डीएपी', 'पोषक तत्व'],
  },
  weather: {
    path: '/weather',
    label: 'Weather & Insights',
    description: 'Real-time hyper-local agricultural weather and farming advisory',
    keywords_en: ['weather', 'forecast', 'rain', 'temperature', 'climate', 'wind', 'humidity', 'rainfall', 'advisory'],
    keywords_te: ['వాతావరణం', 'వర్షం', 'ఉష్ణోగ్రత', 'వాతావరణ నివేదిక', 'వ్యవసాయ వాతావరణం'],
    keywords_hi: ['मौसम', 'बारिश', 'तापमान', 'मौसम पूर्वानुमान', 'कृषि मौसम'],
  },
  diseases: {
    path: '/diseases',
    label: 'Disease Encyclopedia',
    description: 'Botanical and clinical plant disease library',
    keywords_en: ['disease library', 'disease encyclopedia', 'diseases', 'plant diseases', 'symptoms', 'pathology'],
    keywords_te: ['తెగుళ్ళ సమాచారం', 'రోగ సూచి', 'వ్యాధుల జాబితా', 'తెగుళ్ళు'],
    keywords_hi: ['बीमारी लाइब्रेरी', 'रोग सूची', 'पौधों के रोग', 'फसल रोग'],
  },
  'how-to-use': {
    path: '/how-to-use',
    label: 'Guide & FAQ',
    description: 'How to use Agronomy AI and frequently asked questions',
    keywords_en: ['help', 'guide', 'faq', 'how to', 'how to use', 'instructions', 'tutorial', 'getting started', 'support'],
    keywords_te: ['సహాయం', 'మార్గదర్శి', 'తరచుగా అడిగే ప్రశ్నలు', 'ఎలా వాడాలి', 'సూచనలు'],
    keywords_hi: ['मदद', 'गाइड', 'अक्सर पूछे जाने वाले प्रश्न', 'कैसे उपयोग करें', 'निर्देश'],
  },
}

/**
 * Find a matching navigation entry from user speech (fuzzy, multilingual).
 * Returns the matching key (e.g. 'scanning') or null.
 */
export function findNavigationMatch(
  text: string,
  language: 'en' | 'te' | 'hi' = 'en'
): NavigationEntry | null {
  const normalised = text.toLowerCase().trim()

  for (const [, entry] of Object.entries(NAVIGATION_REGISTRY)) {
    const pool = [
      ...entry.keywords_en,
      ...(language === 'te' ? entry.keywords_te : []),
      ...(language === 'hi' ? entry.keywords_hi : []),
      entry.label.toLowerCase(),
    ]

    for (const kw of pool) {
      if (normalised.includes(kw.toLowerCase())) {
        return entry
      }
    }
  }
  return null
}

export function getNavigationRoute(pathOrKeyword: string): NavigationEntry | null {
  const norm = (pathOrKeyword || '').toLowerCase().trim()
  for (const [, entry] of Object.entries(NAVIGATION_REGISTRY)) {
    if (
      entry.path === norm ||
      entry.path.replace('/', '') === norm ||
      entry.label.toLowerCase() === norm
    ) {
      return entry
    }
  }
  return findNavigationMatch(pathOrKeyword)
}
