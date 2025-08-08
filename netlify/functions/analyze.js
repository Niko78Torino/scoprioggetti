const fetch = require('node-fetch');

// Dizionario dei prompt per lingua
const prompts = {
    it: {
        question: `Riguardo a questa immagine, rispondi alla seguente domanda in italiano: "{question}". Fornisci la risposta con un tono {tone}. Se la domanda non è pertinente all'immagine, analizza l'oggetto in dettaglio con un tono {tone}.`,
        no_question: `Analizza in dettaglio l'oggetto presente in questa immagine con un tono {tone}, in italiano. Descrivi le sue caratteristiche principali, i possibili usi, il contesto in cui si trova e i materiali di cui potrebbe essere composto.`
    },
    en: {
        question: `Regarding this image, answer the following question in English: "{question}". Provide the answer in a {tone} tone. If the question is not relevant to the image, analyze the object in detail in a {tone} tone.`,
        no_question: `Analyze the object in this image in detail in a {tone} tone, in English. Describe its main features, possible uses, the context in which it is found, and the materials it might be made of.`
    }
};

exports.handler = async function(event) {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { base64ImageData, mimeType, tone, question, lang } = JSON.parse(event.body);
        const currentLang = prompts[lang] ? lang : 'it'; // Default to Italian if lang is invalid

        let promptText = question
            ? prompts[currentLang].question.replace('{question}', question).replace('{tone}', tone)
            : prompts[currentLang].no_question.replace('{tone}', tone);

        // Append the safety instruction in English, as it's most reliable for the model.
        promptText += ` If you cannot identify the object with certainty, if the image is unclear, or if it is not an object, respond EXACTLY and ONLY with the word: 'INDETERMINATO'`;

        const payload = {
            contents: [{
                role: "user",
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: mimeType, data: base64ImageData } }
                ]
            }],
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Error from Gemini API: ${response.statusText}`);
        }

        const result = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error('Error in Netlify function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal error occurred.' }),
        };
    }
};
