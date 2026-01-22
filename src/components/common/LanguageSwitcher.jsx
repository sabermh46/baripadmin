import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  // Check if current language starts with 'bn' (to handle 'bn-BD' etc.)
  const isBengali = i18n.language?.startsWith('bn');

  const toggleLanguage = () => {
    const newLang = isBengali ? 'en' : 'bn';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="flex items-center justify-center p-4">
      <button
        onClick={toggleLanguage}
        className="relative flex h-10 w-18 cursor-pointer items-center rounded-full bg-gray-200 p-1 transition-colors duration-300 dark:bg-gray-300"
        aria-label="Toggle Language"
      >
        {/* Sliding Indicator */}
        <div
          className={`absolute h-8 w-8 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out dark:bg-primary-600 ${
            isBengali ? 'translate-x-8' : 'translate-x-0'
          }`}
        />
        
        {/* Labels */}
        <span className={`z-10 flex-1 text-center text-sm font-medium transition-colors ${!isBengali ? 'text-primary-600 dark:text-white' : 'text-black'}`}>
          EN
        </span>
        <span className={`z-10 flex-1 text-center text-sm font-medium transition-colors ${isBengali ? 'text-primary-600 dark:text-white' : 'text-black'}`}>
          বাং
        </span>
      </button>
    </div>
  );
}

export default LanguageSwitcher;