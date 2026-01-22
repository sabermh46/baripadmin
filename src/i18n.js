import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';



const resources = {
  en: {
    translation: {
      "welcome": "Welcome",
      "switch_lang": "Change Language",
      "dashboard": "Dashboard",
      "houses": "Houses",
      "notification": "Notification",
      "profile": "Profile",
      "staffs": "Staffs",
      "caretakers": "Caretakers",
      "house_owners": "House Owners",
      "renters": "Renters",
      "settings": "Settings"
    }
  },
  bn: {
    translation: {
      "welcome": "স্বাগতম",
      "switch_lang": "ভাষা পরিবর্তন করুন",
      "dashboard": "ড্যাশবোর্ড",
      "houses": "বাড়ি",
      "notification": "নোটিফিকেশন",
      "profile": "প্রোফাইল",
      "staffs": "স্টাফ",
      "caretakers": "পরিচারক",
      "house_owners": "বাড়ির মালিক",
      "renters": "ভাড়াটিয়া",
      "settings": "সেটিংস"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    detection: {
      // Order of detection: 1. URL, 2. LocalStorage, 3. Cookie, 4. Browser
      order: ['querystring', 'localStorage', 'cookie', 'navigator'],
      // Cache the language in these locations
      caches: ['localStorage', 'cookie'],
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;