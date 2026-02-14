// Simple regex for Hebrew/Arabic/Russian specific characters.

const detectLanguage = (text) => {
    if (!text) return 'he'; // Default

    const hebrewPattern = /[\u0590-\u05FF]/;
    const arabicPattern = /[\u0600-\u06FF]/;
    const russianPattern = /[\u0400-\u04FF]/;

    if (arabicPattern.test(text)) return 'ar';
    if (russianPattern.test(text)) return 'ru';
    if (hebrewPattern.test(text)) return 'he';

    return 'he'; // Default to Hebrew if unsure
};

module.exports = {
    detectLanguage,
};
