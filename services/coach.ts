import Anthropic from '@anthropic-ai/sdk';
import { Workout, MuscleGroup } from '../types/workout';
import { getExercisesByCategory } from '../data/exercises';
import { addWeeks, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

// Initialize Anthropic client
const getClient = () => {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey });
};

export interface CoachAnalysis {
  weeklyVolume: Record<MuscleGroup, number>;
  recommendations: string[];
  splitQuality: 'poor' | 'fair' | 'good' | 'excellent';
  recoveryIssues: string[];
  volumeIssues: string[];
  frequencyIssues: string[];
  confidence: number;
  analyzedWeek?: Date;
}

export interface WeeklyMuscleData {
  muscleGroup: MuscleGroup;
  totalSets: number;
  frequency: number; // sessions per week
  lastTrained: string | null; // date
  daysRestBetweenSessions: number[];
}

// Evidence-based training parameters from exercise science literature
export const TRAINING_GUIDELINES = {
  MINIMUM_EFFECTIVE_VOLUME: {
    chest: 8, back: 10, shoulders: 8, biceps: 6, triceps: 6,
    forearms: 2, core: 6, quads: 10, hamstrings: 8, glutes: 8, calves: 6
  },
  OPTIMAL_VOLUME_RANGE: {
    chest: 16, back: 18, shoulders: 14, biceps: 12, triceps: 12,
    forearms: 6, core: 12, quads: 18, hamstrings: 14, glutes: 14, calves: 10
  },
  MINIMUM_FREQUENCY: 2, // times per week
  OPTIMAL_FREQUENCY: { large: [2, 3], small: [2, 4] },
  RECOVERY_DAYS: [48, 72], // hours between sessions
  LARGE_MUSCLES: ['chest', 'back', 'quads', 'hamstrings', 'glutes'],
  SMALL_MUSCLES: ['biceps', 'triceps', 'shoulders', 'forearms', 'calves', 'core']
};

const COACHING_PROMPT = `<role>
You are an AI fitness coach specializing in evidence-based strength training and hypertrophy. You provide scientifically-backed training advice based on peer-reviewed exercise science research.
</role>

<expertise>
Your knowledge is based on exercise science literature and research:
- Volume guidelines: Minimum effective volume and optimal training ranges
- Frequency research: 2-4x per week training per muscle group
- Recovery science: 48-72 hours between sessions for adaptation
- Progressive overload principles from strength training research
- Training periodization and autoregulation strategies
</expertise>

<analysis_framework>
Analyze training splits using these evidence-based criteria:

1. VOLUME ANALYSIS:
   - Minimum effective volume: 6-10 sets per muscle group per week
   - Optimal training range: 12-18 sets per muscle group per week
   - Consider individual recovery capacity and training experience

2. FREQUENCY ANALYSIS:
   - Large muscles (chest, back, legs): 2-3 sessions per week optimal
   - Small muscles (arms, shoulders, calves): 2-4 sessions per week optimal
   - Minimum 2x per week for muscle growth

3. RECOVERY ANALYSIS:
   - 48-72 hours between sessions for same muscle group
   - Monitor for signs of overreaching or insufficient recovery
   - Balance training stress with adaptation capacity

4. SPLIT QUALITY SCORING:
   - Excellent: Follows evidence-based guidelines, well-balanced
   - Good: Minor areas for improvement, still effective
   - Fair: Some issues that could limit progress
   - Poor: Significant problems that may hinder results
</analysis_framework>

<scientific_foundation>
Base recommendations on exercise science research:
- Peer-reviewed studies on training volume and hypertrophy
- Frequency and recovery research from sports science journals
- Progressive overload principles from strength training literature
- Training periodization strategies from exercise physiology

Cite general scientific principles rather than specific researchers.
</scientific_foundation>

<response_format>
Provide coaching advice in this JSON structure:
{
  "recommendations": [
    "Specific actionable advice based on analysis"
  ],
  "splitQuality": "poor"|"fair"|"good"|"excellent",
  "recoveryIssues": [
    "Recovery-related problems identified"
  ],
  "volumeIssues": [
    "Volume-related problems identified"  
  ],
  "frequencyIssues": [
    "Frequency-related problems identified"
  ],
  "confidence": 0.8
}
</response_format>

<coaching_style>
- Evidence-based: Always reference scientific principles
- Practical: Provide actionable recommendations
- Progressive: Suggest gradual improvements
- Individualized: Consider user's specific training pattern
- Educational: Explain the "why" behind recommendations
</coaching_style>`;

export function analyzeWeeklyVolume(workouts: Workout[], weekStartDate: Date): Record<MuscleGroup, WeeklyMuscleData> {
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
  
  const weeklyData: Record<MuscleGroup, WeeklyMuscleData> = {} as Record<MuscleGroup, WeeklyMuscleData>;
  
  // Initialize all muscle groups
  const allMuscleGroups: MuscleGroup[] = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
    'core', 'quads', 'hamstrings', 'glutes', 'calves', 'cardio', 'full_body'
  ];
  
  allMuscleGroups.forEach(muscle => {
    weeklyData[muscle] = {
      muscleGroup: muscle,
      totalSets: 0,
      frequency: 0,
      lastTrained: null,
      daysRestBetweenSessions: []
    };
  });

  // Filter workouts for this week
  const weekWorkouts = workouts.filter(workout => {
    const workoutDate = parseISO(workout.date);
    return isWithinInterval(workoutDate, { start: weekStart, end: weekEnd });
  });

  // Calculate volume and frequency per muscle group
  const sessionDates: Record<MuscleGroup, string[]> = {} as Record<MuscleGroup, string[]>;
  
  weekWorkouts.forEach(workout => {
    workout.muscleGroups.forEach(muscle => {
      if (!sessionDates[muscle]) sessionDates[muscle] = [];
      if (!sessionDates[muscle].includes(workout.date)) {
        sessionDates[muscle].push(workout.date);
        weeklyData[muscle].frequency++;
      }
      weeklyData[muscle].lastTrained = workout.date;
    });

    workout.exercises.forEach(exercise => {
      const muscle = exercise.muscleGroup;
      const sets = exercise.sets || 0;
      weeklyData[muscle].totalSets += sets;
    });
  });

  // Calculate rest days between sessions
  Object.keys(sessionDates).forEach(muscle => {
    const dates = sessionDates[muscle as MuscleGroup].sort();
    const restDays = [];
    for (let i = 1; i < dates.length; i++) {
      const daysBetween = Math.floor(
        (parseISO(dates[i]).getTime() - parseISO(dates[i-1]).getTime()) / (1000 * 60 * 60 * 24)
      );
      restDays.push(daysBetween);
    }
    weeklyData[muscle as MuscleGroup].daysRestBetweenSessions = restDays;
  });

  return weeklyData;
}

function getIntelligentWeekToAnalyze(workouts: Workout[], requestedWeek: Date): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const lastWeekStart = addWeeks(currentWeekStart, -1);
  
  // If requested week is not current week, use as requested
  if (requestedWeek.getTime() !== currentWeekStart.getTime()) {
    return requestedWeek;
  }
  
  // Monday = 1, Tuesday = 2, Wednesday = 3
  const isMondayToWednesday = dayOfWeek >= 1 && dayOfWeek <= 3;
  
  if (isMondayToWednesday) {
    // Check if current week has 3+ workouts (exception rule)
    const currentWeekWorkouts = workouts.filter(workout => {
      const workoutDate = parseISO(workout.date);
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      return isWithinInterval(workoutDate, { start: currentWeekStart, end: weekEnd });
    });
    
    if (currentWeekWorkouts.length >= 3) {
      return currentWeekStart; // Use current week - has sufficient data
    } else {
      return lastWeekStart; // Use last week - current week too early
    }
  } else {
    // Thursday-Sunday: use current week
    return currentWeekStart;
  }
}

export async function getCoachingAdvice(
  workouts: Workout[], 
  weekStartDate: Date
): Promise<CoachAnalysis> {
  const intelligentWeek = getIntelligentWeekToAnalyze(workouts, weekStartDate);
  
  try {
    const weeklyData = analyzeWeeklyVolume(workouts, intelligentWeek);
    const client = getClient();

    // Prepare analysis data for Claude
    const analysisData = {
      weeklyVolume: Object.fromEntries(
        Object.entries(weeklyData).map(([muscle, data]) => [muscle, data.totalSets])
      ),
      frequency: Object.fromEntries(
        Object.entries(weeklyData).map(([muscle, data]) => [muscle, data.frequency])
      ),
      recoveryPatterns: Object.fromEntries(
        Object.entries(weeklyData).map(([muscle, data]) => [muscle, data.daysRestBetweenSessions])
      ),
      guidelines: TRAINING_GUIDELINES
    };

    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      system: `<role>
You are an elite strength and hypertrophy coach with 15+ years experience analyzing training programs. Your expertise encompasses exercise science research, program design, and athlete development across all training levels.
</role>

<expertise>
Your analysis is grounded in evidence-based training science:
- Hypertrophy Research: Volume-response relationships, mechanical tension, metabolic stress
- Strength Training: Progressive overload, specificity, recovery adaptation
- Program Design: Periodization, autoregulation, individual variation
- Recovery Science: Protein synthesis timelines, supercompensation, fatigue management
</expertise>

<analysis_framework>
Analyze training data using this systematic approach:

1. VOLUME ASSESSMENT
   - Minimum Effective Volume (MEV): Threshold for growth stimulus
     * Large muscles (chest, back, quads, hams, glutes): 8-12 sets/week minimum
     * Small muscles (arms, shoulders, calves, core): 6-10 sets/week minimum
   - Maximum Adaptive Volume (MAV): Upper productive range
     * Large muscles: 16-22 sets/week typical maximum
     * Small muscles: 12-18 sets/week typical maximum
   - Individual factors: Training age, recovery capacity, life stress

2. FREQUENCY OPTIMIZATION
   - Minimum effective frequency: 2x per week for all muscle groups
   - Optimal ranges: 2-3x for large muscles, 2-4x for small muscles
   - Recovery consideration: 48-72 hours between sessions
   - Volume distribution: Spread sets across sessions for better adaptation

3. RECOVERY ANALYSIS
   - Session spacing: Minimum 48 hours between training same muscle group
   - Volume tolerance: Signs of overreaching vs productive stress
   - Recovery indicators: Performance, soreness patterns, session frequency

4. PROGRAM BALANCE
   - Muscle group parity: Avoid major imbalances that limit progress
   - Movement patterns: Push/pull ratios, compound vs isolation balance
   - Weak point identification: Prioritize lagging muscle groups
</analysis_framework>

<quality_standards>
EXCELLENT (A): Meets all evidence-based guidelines, well-balanced, sustainable
GOOD (B): Minor optimization opportunities, generally effective approach
FAIR (C): Several issues limiting progress, needs significant adjustments  
POOR (D): Major problems that will hinder results, requires restructuring
</quality_standards>

<recommendation_criteria>
Prioritize recommendations by impact:
1. Critical issues: Volume below MEV, frequency below 2x/week
2. Major optimizations: Volume above MAV, poor recovery patterns
3. Balance issues: Significant muscle group disparities
4. Fine-tuning: Minor frequency or distribution adjustments

Make recommendations:
- Specific and actionable (exact set numbers, frequency targets)
- Graduated (start with most important 2-3 changes)
- Realistic (consider current capacity and lifestyle constraints)
</recommendation_criteria>

<output_format>
Respond with ONLY a valid JSON object in this exact format:
{
  "recommendations": ["specific actionable recommendation 1", "specific actionable recommendation 2"],
  "splitQuality": "poor"|"fair"|"good"|"excellent",
  "recoveryIssues": ["specific recovery problem identified"],
  "volumeIssues": ["specific volume problem with muscle group and numbers"],
  "frequencyIssues": ["specific frequency problem with target"],
  "confidence": 0.85
}
</output_format>`,
      messages: [
        {
          role: 'user',
          content: `<training_data>
${JSON.stringify(analysisData, null, 2)}
</training_data>

<analysis_instructions>
Apply your systematic analysis framework to evaluate this training data:

1. Assess volume against MEV/MAV ranges for each muscle group
2. Evaluate training frequency patterns and recovery spacing
3. Identify muscle group imbalances and weak points
4. Prioritize the top 2-3 most impactful recommendations
5. Rate overall program quality using the defined standards

Focus on actionable insights that will meaningfully improve training outcomes. Be specific with numbers and targets in your recommendations.
</analysis_instructions>

Return only the JSON object as specified.`
        }
      ]
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in coaching response');
    }

    // Clean the response to extract just the JSON
    let jsonText = textContent.text.trim();
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }

    let coachingAdvice;
    try {
      coachingAdvice = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', textContent.text);
      throw new Error(`Failed to parse coaching response: ${(parseError as Error).message}`);
    }
    
    return {
      weeklyVolume: analysisData.weeklyVolume as Record<MuscleGroup, number>,
      recommendations: coachingAdvice.recommendations || [],
      splitQuality: coachingAdvice.splitQuality || 'fair',
      recoveryIssues: coachingAdvice.recoveryIssues || [],
      volumeIssues: coachingAdvice.volumeIssues || [],
      frequencyIssues: coachingAdvice.frequencyIssues || [],
      confidence: coachingAdvice.confidence || 0.7,
      analyzedWeek: intelligentWeek
    };

  } catch (error) {
    console.error('Error getting coaching advice:', error);
    
    // If it's a JSON parse error, try without structured output
    if ((error as Error).message?.includes('JSON Parse') || (error as Error).message?.includes('structured-outputs')) {
      try {
        return await getCoachingAdviceSimple(workouts, intelligentWeek);
      } catch (simpleError) {
        console.error('Fallback coaching also failed:', simpleError);
      }
    }
    
    // Ultimate fallback analysis
    return generateFallbackAnalysis(intelligentWeek, workouts);
  }
}

async function getCoachingAdviceSimple(
  workouts: Workout[], 
  weekStartDate: Date
): Promise<CoachAnalysis> {
  const weeklyData = analyzeWeeklyVolume(workouts, weekStartDate);
  const client = getClient();

  const analysisData = {
    weeklyVolume: Object.fromEntries(
      Object.entries(weeklyData).map(([muscle, data]) => [muscle, data.totalSets])
    ),
    frequency: Object.fromEntries(
      Object.entries(weeklyData).map(([muscle, data]) => [muscle, data.frequency])
    ),
    guidelines: TRAINING_GUIDELINES
  };

  // Simplified but still optimized prompt for fallback
  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1000,
    system: `You are an expert strength coach analyzing training data. Apply evidence-based training science principles:

VOLUME GUIDELINES:
- Large muscles (chest, back, legs): 8-12 sets minimum, 16-22 maximum per week
- Small muscles (arms, shoulders): 6-10 sets minimum, 12-18 maximum per week

FREQUENCY STANDARDS:
- All muscle groups: Minimum 2x per week for growth
- Optimal: 2-3x for large muscles, 2-4x for small muscles
- Recovery: 48-72 hours between sessions

Respond with ONLY valid JSON:
{
  "recommendations": ["specific actionable recommendation"],
  "splitQuality": "poor"|"fair"|"good"|"excellent", 
  "recoveryIssues": ["specific issue"],
  "volumeIssues": ["specific issue with numbers"],
  "frequencyIssues": ["specific issue with target"],
  "confidence": 0.8
}`,
    messages: [
      {
        role: 'user',
        content: `<training_data>
${JSON.stringify(analysisData, null, 2)}
</training_data>

Analyze volume and frequency against evidence-based standards. Provide specific, actionable recommendations with exact numbers. Focus on the most impactful improvements.`
      }
    ]
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in simple coaching response');
  }

  // Clean the response to extract just the JSON
  let jsonText = textContent.text.trim();
  const jsonStart = jsonText.indexOf('{');
  const jsonEnd = jsonText.lastIndexOf('}');
  
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
  }

  const coachingAdvice = JSON.parse(jsonText);
  
  return {
    weeklyVolume: analysisData.weeklyVolume as Record<MuscleGroup, number>,
    recommendations: coachingAdvice.recommendations || [],
    splitQuality: coachingAdvice.splitQuality || 'fair',
    recoveryIssues: coachingAdvice.recoveryIssues || [],
    volumeIssues: coachingAdvice.volumeIssues || [],
    frequencyIssues: coachingAdvice.frequencyIssues || [],
    confidence: coachingAdvice.confidence || 0.6,
    analyzedWeek: weekStartDate
  };
}

function generateFallbackAnalysis(weekStartDate: Date, workouts: Workout[]): CoachAnalysis {
  const weeklyData = analyzeWeeklyVolume(workouts, weekStartDate);
  const recommendations: string[] = [];
  const volumeIssues: string[] = [];
  const frequencyIssues: string[] = [];
  const recoveryIssues: string[] = [];

  // Advanced volume and frequency analysis
  Object.entries(weeklyData).forEach(([muscle, data]) => {
    const guidelines = TRAINING_GUIDELINES;
    const mev = guidelines.MINIMUM_EFFECTIVE_VOLUME[muscle as keyof typeof guidelines.MINIMUM_EFFECTIVE_VOLUME] || 6;
    const optimal = guidelines.OPTIMAL_VOLUME_RANGE[muscle as keyof typeof guidelines.OPTIMAL_VOLUME_RANGE] || 16;

    // Skip cardio and full_body for volume analysis
    if (muscle === 'cardio' || muscle === 'full_body') return;

    // Volume assessment
    if (data.totalSets < mev) {
      volumeIssues.push(`${muscle}: ${data.totalSets} sets (below minimum effective volume of ${mev})`);
      recommendations.push(`Increase ${muscle} to ${mev}-${optimal} sets per week for optimal growth stimulus`);
    } else if (data.totalSets > optimal * 1.3) {
      volumeIssues.push(`${muscle}: ${data.totalSets} sets (potentially excessive volume)`);
      recommendations.push(`Consider reducing ${muscle} volume to ${optimal} sets to improve recovery`);
    }

    // Frequency assessment  
    if (data.frequency < 2 && data.totalSets > 0) {
      frequencyIssues.push(`${muscle}: only ${data.frequency}x per week (suboptimal frequency)`);
      recommendations.push(`Train ${muscle} 2-3x per week to distribute volume and enhance protein synthesis`);
    }

    // Recovery pattern analysis
    if (data.daysRestBetweenSessions.some(days => days < 2)) {
      recoveryIssues.push(`${muscle}: insufficient recovery time between sessions`);
      recommendations.push(`Allow 48-72 hours between ${muscle} training sessions for optimal adaptation`);
    }
  });

  // Sophisticated quality assessment
  const totalIssues = volumeIssues.length + frequencyIssues.length + recoveryIssues.length;
  const criticalIssues = volumeIssues.filter(issue => issue.includes('below')).length + 
                        frequencyIssues.filter(issue => issue.includes('only')).length;
  
  const splitQuality: CoachAnalysis['splitQuality'] = 
    totalIssues === 0 ? 'excellent' :
    criticalIssues === 0 && totalIssues <= 2 ? 'good' :
    criticalIssues <= 1 && totalIssues <= 4 ? 'fair' : 'poor';

  return {
    weeklyVolume: Object.fromEntries(
      Object.entries(weeklyData).map(([muscle, data]) => [muscle, data.totalSets])
    ) as Record<MuscleGroup, number>,
    recommendations,
    splitQuality,
    recoveryIssues,
    volumeIssues,
    frequencyIssues,
    confidence: 0.75,
    analyzedWeek: weekStartDate
  };
}

export async function askFollowUpQuestion(
  question: string,
  analysis: CoachAnalysis,
  workouts: Workout[]
): Promise<string> {
  try {
    const client = getClient();

    const contextData = {
      analysis,
      recentWorkouts: workouts.slice(-10), // Last 10 workouts for context
      guidelines: TRAINING_GUIDELINES
    };

    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      system: `You are an expert strength coach answering follow-up questions about a specific training analysis. 

<context>
You have just provided a detailed training analysis for this user. Now they have a follow-up question about their specific report card and training data.
</context>

<expertise>
- Evidence-based training science and exercise physiology
- Personalized program optimization 
- Practical coaching guidance
- Beginner to advanced training strategies
</expertise>

<response_guidelines>
- Reference the specific analysis data when relevant
- Provide actionable, practical advice
- Keep responses concise but thorough (2-4 paragraphs max)
- Use encouraging, supportive coaching tone
- Base recommendations on exercise science principles
- Be specific with numbers, sets, frequencies when applicable
</response_guidelines>

<coaching_style>
Be like a knowledgeable personal trainer who:
- Explains the "why" behind recommendations
- Gives specific next steps
- Acknowledges their current progress
- Offers realistic, achievable solutions
</coaching_style>`,
      messages: [
        {
          role: 'user',
          content: `<training_analysis>
${JSON.stringify(contextData, null, 2)}
</training_analysis>

<user_question>
${question}
</user_question>

Answer this follow-up question about my training analysis. Reference my specific data when relevant and provide actionable coaching advice.`
        }
      ]
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in follow-up response');
    }

    return textContent.text.trim();
  } catch (error) {
    console.error('Error with follow-up question:', error);
    return "I'm having trouble processing your question right now. Please try rephrasing or ask again in a moment.";
  }
}