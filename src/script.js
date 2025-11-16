document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Translator initializing...');
    
    // --- DOM Elements ---
    const sourceLangSelect = document.getElementById('source-lang');
    const targetLangSelect = document.getElementById('target-lang');
    const sourceTextarea = document.getElementById('source-text');
    const targetTextarea = document.getElementById('target-text');
    const sourceCharCount = document.getElementById('source-char-count');
    const swapBtn = document.getElementById('swap-btn');
    const copyBtn = document.getElementById('copy-btn');
    const contextInput = document.getElementById('context-input');
    const themeToggle = document.querySelector('.theme-toggle');

    // Check if all elements exist
    if (!sourceLangSelect || !targetLangSelect || !sourceTextarea || !targetTextarea) {
        console.error('❌ Critical elements missing!', {
            sourceLangSelect: !!sourceLangSelect,
            targetLangSelect: !!targetLangSelect,
            sourceTextarea: !!sourceTextarea,
            targetTextarea: !!targetTextarea
        });
        alert('Error: Page elements not found. Please refresh the page.');
        return;
    }

    const API_BASE_URL = 'http://127.0.0.1:8000'; // Python backend URL

    // Real-time translation variables
    let translateTimeout = null;
    let isTranslating = false;
    const DEBOUNCE_DELAY = 10; // Wait 300ms after user stops typing (very fast!)

    // --- Functions ---

    // 1. Fetch languages from the backend and populate dropdowns
    async function populateLanguages() {
        try {
            console.log('📡 Loading languages from backend...');
            const response = await fetch(`${API_BASE_URL}/languages`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const languages = await response.json();
            console.log('✅ Languages loaded:', languages.length, 'languages');
            
            if (!languages || languages.length === 0) {
                throw new Error('No languages returned from server');
            }
            
            // Clear existing options (except auto-detect for source)
            sourceLangSelect.innerHTML = '<option value="auto">Auto-detect</option>';
            targetLangSelect.innerHTML = '';
            
            languages.forEach(lang => {
                if (lang.code && lang.name) {
                    const optionSource = new Option(`${lang.name} (${lang.native_name})`, lang.code);
                    const optionTarget = new Option(`${lang.name} (${lang.native_name})`, lang.code);
                    
                    sourceLangSelect.appendChild(optionSource);
                    targetLangSelect.appendChild(optionTarget);
                }
            });
            
            // Set a default target language, e.g., Spanish 'es'
            if (targetLangSelect.options.length > 0) {
                // Try to set Spanish, or just use the first option
                const spanishOption = Array.from(targetLangSelect.options).find(opt => opt.value === 'es');
                if (spanishOption) {
                    targetLangSelect.value = 'es';
                } else {
                    targetLangSelect.value = targetLangSelect.options[0].value;
                }
                console.log('✅ Default target language set to:', targetLangSelect.value);
            } else {
                console.error('❌ No language options available!');
            }

        } catch (error) {
            console.error('❌ Error populating languages:', error);
            const errorMsg = `Could not load languages: ${error.message}\n\nPlease ensure:\n1. Backend is running at http://127.0.0.1:8000\n2. No firewall is blocking the connection`;
            alert(errorMsg);
            
            // Add fallback languages so the app still works
            const fallbackLangs = [
                {code: 'en', name: 'English', native_name: 'English'},
                {code: 'es', name: 'Spanish', native_name: 'Español'},
                {code: 'fr', name: 'French', native_name: 'Français'},
                {code: 'de', name: 'German', native_name: 'Deutsch'},
                {code: 'it', name: 'Italian', native_name: 'Italiano'},
                {code: 'pt', name: 'Portuguese', native_name: 'Português'},
                {code: 'ja', name: 'Japanese', native_name: '日本語'},
                {code: 'ko', name: 'Korean', native_name: '한국어'},
                {code: 'zh', name: 'Chinese', native_name: '中文'}
            ];
            
            sourceLangSelect.innerHTML = '<option value="auto">Auto-detect</option>';
            targetLangSelect.innerHTML = '';
            fallbackLangs.forEach(lang => {
                const optionSource = new Option(`${lang.name} (${lang.native_name})`, lang.code);
                const optionTarget = new Option(`${lang.name} (${lang.native_name})`, lang.code);
                sourceLangSelect.appendChild(optionSource);
                targetLangSelect.appendChild(optionTarget);
            });
            targetLangSelect.value = 'es';
            console.log('⚠️ Using fallback languages');
        }
    }

    // 2. Handle the translation process (real-time only)
    async function handleTranslate() {
        const text = sourceTextarea.value.trim();
        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;
        const context = contextInput ? contextInput.value.trim() : '';

        if (!text) {
            targetTextarea.value = '';
            return;
        }

        if (!targetLang || targetLang === '') {
            console.error('❌ No target language selected');
            targetTextarea.value = 'Please select a target language';
            return;
        }

        // Prevent multiple simultaneous translations
        if (isTranslating) {
            console.log('⏳ Translation already in progress, skipping...');
            return;
        }
        isTranslating = true;
        
        // Show loading indicator in textarea
        const previousText = targetTextarea.value;
        //targetTextarea.value = 'Translating...'; does not make it look cool

        try {
            console.log('📤 Sending translation request...', { text: text.substring(0, 30), sourceLang, targetLang });
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

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
                throw new Error(errorData.detail || 'Translation failed.');
            }

            const result = await response.json();
            console.log('✅ Translation received:', result.translated_text?.substring(0, 50));
            
            if (result.translated_text) {
                targetTextarea.value = result.translated_text;
            } else {
                throw new Error('No translation text in response');
            }

        } catch (error) {
            console.error('❌ Translation error:', error);
            targetTextarea.value = `Error: ${error.message}`;
        } finally {
            isTranslating = false;
        }
    }

    // 2b. Real-time translation with debouncing
    function handleRealTimeTranslate() {
        // Clear existing timeout
        if (translateTimeout) {
            clearTimeout(translateTimeout);
        }

        // Set new timeout
        translateTimeout = setTimeout(() => {
            handleTranslate();
        }, DEBOUNCE_DELAY);
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
        } else {
            // If source was auto, just set target to what source would be
            targetLangSelect.value = sourceLangSelect.options[1]?.value || 'en';
        }

        // Swap text
        sourceTextarea.value = targetText;
        targetTextarea.value = sourceText;
        updateCharCount(); // Update count after swapping
        
        // Trigger translation if there's text
        if (sourceTextarea.value.trim()) {
            handleRealTimeTranslate();
        }
    }
    
    // 4. Copy translated text to clipboard
    function handleCopy() {
        if (!targetTextarea.value) return;
        navigator.clipboard.writeText(targetTextarea.value)
            .then(() => {
                if (copyBtn) {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = 'Copied!';
                    setTimeout(() => {
                       copyBtn.innerHTML = originalHTML;
                    }, 2000);
                }
            })
            .catch(err => console.error('Failed to copy text:', err));
    }
    
    // 5. Update character count
    function updateCharCount() {
        if (sourceCharCount) {
            const count = sourceTextarea.value.length;
            sourceCharCount.textContent = `${count} / 5000 characters`;
        }
    }

    // 6. Toggle dark mode
    function toggleTheme() {
        if (themeToggle) {
            document.body.classList.toggle('dark');
            // Save preference
            if (document.body.classList.contains('dark')) {
                localStorage.setItem('theme', 'dark');
            } else {
                localStorage.setItem('theme', 'light');
            }
        }
    }

    // --- Event Listeners ---
    // Real-time translation as user types (instant!)
    sourceTextarea.addEventListener('input', () => {
        updateCharCount();
        handleRealTimeTranslate();
    });
    
    // Also translate when language changes
    sourceLangSelect.addEventListener('change', () => {
        console.log('🔄 Source language changed to:', sourceLangSelect.value);
        handleRealTimeTranslate();
    });
    targetLangSelect.addEventListener('change', () => {
        console.log('🔄 Target language changed to:', targetLangSelect.value);
        handleRealTimeTranslate();
    });
    
    if (contextInput) {
        contextInput.addEventListener('input', handleRealTimeTranslate);
    }
    
    if (swapBtn) {
        swapBtn.addEventListener('click', handleSwapLanguages);
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', handleCopy);
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // --- Initial Load ---
    console.log('✅ All event listeners attached');
    populateLanguages().then(() => {
        console.log('✅ Languages populated, ready to translate!');
    }).catch(err => {
        console.error('❌ Failed to populate languages:', err);
    });
    updateCharCount();

    // Restore theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
    }
    
    console.log('✅ Translator fully initialized!');
});
