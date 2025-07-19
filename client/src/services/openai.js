import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPEN_AI_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
});

/**
 * Generate AI-powered habit insights based on user's habit data
 * @param {Object} data - The habit data object containing stats and insights
 * @returns {Promise<string>} - Generated insights text
 */
export const generateHabitInsights = async (data) => {
  try {
    if (!import.meta.env.VITE_OPEN_AI_KEY) {
      throw new Error('OpenAI API key not configured. Please add VITE_OPEN_AI_KEY to your .env file.');
    }

    // Prepare the data for OpenAI
    const prompt = createInsightPrompt(data);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful habit-building coach and data analyst. Generate personalized, encouraging, and actionable insights based on user's habit tracking data. Be concise, positive, and focus on practical advice. Use emojis appropriately to make the insights engaging."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    return completion.choices[0].message.content;

  } catch (error) {
    console.error('Error generating AI insights:', error);
    
    if (error.message.includes('API key')) {
      throw new Error('OpenAI API key not configured properly.');
    }
    
    throw new Error('Failed to generate insights. Please try again later.');
  }
};

/**
 * Create a structured prompt for OpenAI based on habit data
 * @param {Object} data - The habit data object
 * @returns {string} - Formatted prompt
 */
const createInsightPrompt = (data) => {
  const { statsData, overallInsights, totalHabits, activeStreaks, avgCompletionRate } = data;

  let prompt = `Analyze my habit tracking data and provide personalized insights and recommendations:

OVERVIEW:
- Total Habits: ${totalHabits}
- Active Streaks: ${activeStreaks}/${totalHabits}
- Average Completion Rate: ${avgCompletionRate}%

HABIT DETAILS:`;

  statsData.forEach((stat, index) => {
    prompt += `
${index + 1}. ${stat.habit.name} ${stat.habit.emoji}
   - Current Streak: ${stat.currentStreak} days
   - Best Streak: ${stat.bestStreak} days
   - This Month: ${stat.currentMonthStats.completedDays} days (${Math.round(stat.currentMonthStats.completionRate)}% completion)
   - Weekly Goal: ${stat.habit.weeklyGoal || 7} times/week (${Math.round(stat.weeklyGoalPercentage)}% achieved this week)`;
  });

  prompt += `

CURRENT INSIGHTS:
${overallInsights.map(insight => `- ${insight.text}`).join('\n')}

Please provide:
1. A brief overall assessment of my habit journey
2. 2-3 specific recommendations for improvement
3. Highlight my biggest strength
4. One actionable tip for the week ahead

Keep the response encouraging, concise (under 250 words), and actionable.`;

  return prompt;
};

export default { generateHabitInsights }; 