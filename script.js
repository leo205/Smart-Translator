document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const sourceLangSelect = document.getElementById('source-lang');
    const targetLangSelect = document.getElementById('target-lang');
    const sourceTextarea = document.getElementById('source-text');
    const targetTextarea = document.getElementById('target-text');
    const sourceCharCount = document.getElementById('source-char-count');
    const translateBtn = document.getElementById('translate-btn');
    const swapBtn = document.getElementById('swap-btn');
    const copyBtn = document.getElementById('copy-btn');
    const contextInput = document.getElementById('context-input');

    const API_BASE_URL = 'http://127.0.0.1:8000'; // Your Python backend URL

    // --- Functions ---

    // 1. Fetch languages from the backend and populate dropdowns
    async function populateLanguages() {
        try {
            const response = await fetch(`${API_BASE_URL}/languages`);
            if (!response.ok) throw new Error('Failed to load languages.');
            
            const languages = await response.json();
            
            languages.forEach(lang => {
                const optionSource = new Option(`${lang.name} (${lang.native_name})`, lang.code);
                const optionTarget = new Option(`${lang.name} (${lang.native_name})`, lang.code);
                
                sourceLangSelect.appendChild(optionSource);
                targetLangSelect.appendChild(optionTarget);
            });
            
            // Set a default target language, e.g., Spanish 'es'
            targetLangSelect.value = 'es';

        } catch (error) {
            console.error('Error populating languages:', error);
            alert('Could not load languages from the server. Please ensure the backend is running.');
        }
    }

    // 2. Handle the translation process
    async function handleTranslate() {
        const text = sourceTextarea.value.trim();
        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;
        const context = contextInput.value.trim();

        if (!text) return;

        translateBtn.disabled = true;
        translateBtn.innerHTML = 'Translating...';
        targetTextarea.value = 'Thinking...';

        try {
            const response = await fetch(`${API_BASE_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    source_language: sourceLang,
                    target_language: targetLang,
                    context: context
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Translation failed.');
            }

            const result = await response.json();
            targetTextarea.value = result.translated_text;

        } catch (error) {
            console.error('Translation error:', error);
            targetTextarea.value = `Error: ${error.message}`;
        } finally {
            translateBtn.disabled = false;
            translateBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5L14.5 9.5L19.5 12L14.5 14.5L12 19.5L9.5 14.5L4.5 12L9.5 9.5L12 4.5Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Translate`;
        }
    }
    
    // 3. Swap languages and text
    function handleSwapLanguages() {
        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;
        const sourceText = sourceTextarea.value;
        const targetText = targetTextarea.value;

        // Swap dropdowns (if source wasn't auto-detect)
        if (sourceLang !== 'auto') {
            sourceLangSelect.value = targetLang;
            targetLangSelect.value = sourceLang;
        }

        // Swap text
        sourceTextarea.value = targetText;
        targetTextarea.value = sourceText;
        updateCharCount(); // Update count after swapping
    }
    
    // 4. Copy translated text to clipboard
    function handleCopy() {
        if (!targetTextarea.value) return;
        navigator.clipboard.writeText(targetTextarea.value)
            .then(() => {
                copyBtn.innerHTML = 'Copied!';
                setTimeout(() => {
                   copyBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
                }, 2000);
            })
            .catch(err => console.error('Failed to copy text:', err));
    }
    
    // 5. Update character count
    function updateCharCount() {
        const count = sourceTextarea.value.length;
        sourceCharCount.textContent = `${count} / 5000 characters`;
    }


    // --- Event Listeners ---
    translateBtn.addEventListener('click', handleTranslate);
    swapBtn.addEventListener('click', handleSwapLanguages);
    copyBtn.addEventListener('click', handleCopy);
    sourceTextarea.addEventListener('input', updateCharCount);

    // --- Initial Load ---
    populateLanguages();
});