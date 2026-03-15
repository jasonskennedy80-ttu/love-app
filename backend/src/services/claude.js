import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Model routing: light/medium = Haiku (cheap), deep = Sonnet (rich)
const MODEL_MAP = {
  light:  'claude-haiku-4-5-20251001',
  medium: 'claude-haiku-4-5-20251001',
  deep:   'claude-sonnet-4-6',
};

const BANNED_WORDS = ['heartfelt', 'cherish', 'journey'];

/**
 * Generate a personalized text message for a loved one.
 * @param {object} contact  - { name, relationship, tone }
 * @param {object} occasion - { type }
 * @param {object} interests - { hobbies, foods, dietary, memory_note }
 * @param {string} depth    - 'light' | 'medium' | 'deep'
 * @returns {Promise<string>} message body
 */
export async function generateMessage(contact, occasion, interests, depth = 'medium') {
  const hobbies = (interests?.hobbies ?? []).join(', ') || 'not specified';
  const memoryNote = interests?.memory_note || '';

  const prompt = `You are a warm, thoughtful messaging assistant helping someone express genuine love and care to a person they deeply value.

Person receiving the message: ${contact.name}
Relationship: ${contact.relationship}
Message tone: ${contact.tone}
Occasion: ${occasion.type}
Personal memory / detail: ${memoryNote}
Hobbies: ${hobbies}

Rules:
- Write 1–3 sentences only. Never more.
- Sound like a real human text, not a greeting card.
- Never use the words: ${BANNED_WORDS.join(', ')}.
- Never start with "I just wanted to..."
- Be specific to their personality when possible.
- Vary structure — sometimes start with a memory, sometimes an observation, sometimes just a direct statement of love.
- No hashtags, no excessive emoji.
- Output the message text only. No explanation, no quotes around it.`;

  const response = await client.messages.create({
    model: MODEL_MAP[depth] ?? MODEL_MAP.medium,
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text.trim();
}

/**
 * Generate gift ideas for a contact before an occasion.
 * Returns a parsed JSON array of gift objects.
 */
export async function generateGiftIdeas(contact, occasionType, interests, budget) {
  const prompt = `Generate 3 thoughtful gift ideas for ${contact.name}'s ${occasionType}.
Their hobbies: ${(interests?.hobbies ?? []).join(', ') || 'not specified'}
Dietary/notes: ${interests?.dietary || 'none'}
Memory: ${interests?.memory_note || 'none'}
Budget: ${budget}

For each gift return JSON:
{ "name": "", "priceRange": "", "whyItFits": "", "searchQuery": "" }

whyItFits must explain specifically why this gift matches their interests in 1–2 sentences.
searchQuery is a short Amazon search term.
Return only a JSON array, no other text.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  return JSON.parse(response.content[0].text.trim());
}

/**
 * Generate restaurant suggestions for a contact.
 * Returns a parsed JSON array of restaurant objects.
 */
export async function generateRestaurantSuggestions(contact, occasionType, interests) {
  const prompt = `Suggest 3 restaurant experiences for ${contact.name}'s ${occasionType} in ${contact.city || 'their city'}.
Food preferences: ${(interests?.foods ?? []).join(', ') || 'not specified'}
Dietary needs: ${interests?.dietary || 'none'}
Occasion vibe: ${contact.tone}

For each, return JSON:
{ "restaurantName": "", "cuisineType": "", "whyItFits": "", "searchQuery": "", "ambiance": "" }

whyItFits should reference their specific food preferences.
searchQuery is used to look up availability on OpenTable.
Return only a JSON array.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  return JSON.parse(response.content[0].text.trim());
}
