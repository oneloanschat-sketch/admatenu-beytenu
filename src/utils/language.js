const franc = require('franc'); // We might need to install this or use simple regex if package size is concern. 
// For simplicity and avoiding large deps, let's use regex for Hebrew/Arabic/Russian specific characters.

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
