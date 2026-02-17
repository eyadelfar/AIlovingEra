// Gemini API Integration for Comic Generation
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiComicGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
    };
    this.safetySettings = [
      {
        category: GoogleGenerativeAI.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: GoogleGenerativeAI.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: GoogleGenerativeAI.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: GoogleGenerativeAI.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: GoogleGenerativeAI.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: GoogleGenerativeAI.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: GoogleGenerativeAI.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: GoogleGenerativeAI.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
  }

  async initializeModel(modelName = 'gemini-pro-vision') {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({ model: modelName });
  }

  async generateComicFromImagesAndText(images, text, numPages, imagesPerPage) {
    try {
      // Convert images to base64 format
      const imageParts = await Promise.all(
        images.map(async (imageFile) => {
          const base64 = await this.fileToBase64(imageFile);
          return {
            inlineData: {
              data: base64,
              mimeType: imageFile.type,
            },
          };
        })
      );

      // Create prompt for comic generation
      const prompt = this.createComicPrompt(text, numPages, imagesPerPage);

      // Combine prompt and image parts
      const contents = [
        {
          role: 'user',
          parts: [
            ...imageParts,
            { text: prompt }
          ],
        },
      ];

      // Generate content using the model
      const result = await this.model.generateContent({
        contents,
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings,
      });

      const response = await result.response;
      const generatedText = response.text();

      // Parse the generated content to extract comic structure
      return this.parseComicResponse(generatedText, numPages);
    } catch (error) {
      console.error('Error generating comic:', error);
      throw error;
    }
  }

  createComicPrompt(text, numPages, imagesPerPage) {
    return `
      Create a comic book based on the provided images and text description.
      
      Text description: "${text}"
      
      Requirements:
      - Generate ${numPages} pages for the comic
      - Each page should contain ${imagesPerPage} panels/images
      - Create a coherent storyline that connects all images and text
      - Describe the layout of each panel on each page
      - Include dialogue bubbles and narrative elements
      - Suggest visual styles and panel arrangements
      
      Format your response as JSON with the following structure:
      {
        "pages": [
          {
            "pageNumber": 1,
            "panels": [
              {
                "panelNumber": 1,
                "description": "Description of what should be in this panel",
                "dialogue": "What characters are saying",
                "narrative": "Narrative text if needed",
                "layout": "Suggested layout for this panel"
              }
            ]
          }
        ]
      }
      
      Be creative and ensure the comic flows well from page to page.
    `;
  }

  parseComicResponse(responseText, numPages) {
    try {
      // Extract JSON from response if wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```|```([\s\S]*?)```/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[2]) : responseText;
      
      let parsed = JSON.parse(jsonString);
      
      // Ensure we have the right number of pages
      if (parsed.pages && parsed.pages.length !== numPages) {
        console.warn(`Expected ${numPages} pages but got ${parsed.pages.length}. Adjusting...`);
      }
      
      return parsed;
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      
      // Fallback: create basic structure if parsing fails
      return {
        pages: Array.from({length: numPages}, (_, i) => ({
          pageNumber: i + 1,
          panels: Array.from({length: 4}, (_, j) => ({
            panelNumber: j + 1,
            description: `Panel ${j + 1} on page ${i + 1}`,
            dialogue: '',
            narrative: `Scene ${j + 1} of page ${i + 1}`,
            layout: 'standard'
          }))
        }))
      };
    }
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  async generateComicCover(title, images) {
    try {
      const imageParts = await Promise.all(
        images.map(async (imageFile) => {
          const base64 = await this.fileToBase64(imageFile);
          return {
            inlineData: {
              data: base64,
              mimeType: imageFile.type,
            },
          };
        })
      );

      const prompt = `
        Create a comic book cover based on the provided images.
        
        Title: "${title}"
        
        Requirements:
        - Design an attractive comic book cover
        - Incorporate elements from the provided images
        - Include dynamic composition and action
        - Add title text in a comic-style font
        - Suggest color scheme and visual style
        
        Respond with a detailed description of the cover design.
      `;

      const contents = [
        {
          role: 'user',
          parts: [
            ...imageParts,
            { text: prompt }
          ],
        },
      ];

      const result = await this.model.generateContent({
        contents,
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings,
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating comic cover:', error);
      throw error;
    }
  }
}

export default GeminiComicGenerator;