
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
});

const model = 'gpt-4o-mini';

var gptUses = 0;

function logUsage() {
  gptUses++;
  if (gptUses % 10 === 0) {
    console.log(`GPT uses: ${gptUses}`);
  }
}

async function generate(prompt: string) {
    logUsage();
    const response = await client.responses.create({
        model: model,
        instructions: 'You are a storytelling assistant. focus on creating compelling narratives given the context provided.',
        input: prompt,
      });
      return response.output_text;
}

async function generate_structured(prompt: string, format: z.AnyZodObject) {

    logUsage();

    const completion = await client.chat.completions.create({
        model: model,
        messages: [
            {role: 'system', content: 'You are a storytelling assistant. focus on creating compelling narratives given the context provided.'},
            {role: 'user', content: prompt}
        ],
        response_format: zodResponseFormat(format, 'story_choices'),
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
}

export { generate, generate_structured };