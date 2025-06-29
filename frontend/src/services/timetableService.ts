import { supabase } from '../lib/supabaseClient';

interface SelectedModule {
  [moduleCode: string]: any;
}

interface TimePreferenceData {
  [day: string]: {
    [time: string]: boolean;
  };
}

interface TimetableData {
  modules: SelectedModule;
  timePreferences: TimePreferenceData;
  semester: "sem1" | "sem2";
  isOptimized: boolean;
}

interface SavedTimetable {
  id: string;
  user_id: string;
  semester: string;
  modules: any;
  time_preferences: any;
  is_optimized: boolean;
  created_at: string;
  updated_at: string;
}

export class TimetableService {
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    throw new Error('Operation failed');
  }

  static async loadUserTimetable(userId: string, semester: "sem1" | "sem2"): Promise<TimetableData | null> {
    try {
      return await this.retryOperation(async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Authentication error');
        }
        if (!session?.user) {
          console.log('No authenticated user');
          return null;
        }
        if (session.user.id !== userId) {
          console.error('User ID mismatch');
          throw new Error('User ID mismatch');
        }
        const { data, error } = await supabase
          .from('user_timetables')
          .select('*')
          .eq('user_id', userId)
          .eq('semester', semester)
          .single();
        if (error) {
          if (error.code === 'PGRST116') {
            console.log('No saved timetable found');
            return null;
          }
          console.error('Database error:', error);
          throw error;
        }
        const timetable = data as SavedTimetable; 
        return {
          modules: timetable.modules || {},
          timePreferences: timetable.time_preferences || {},
          semester: semester,
          isOptimized: timetable.is_optimized || false
        };
      });
    } catch (error) {
      console.error('Error loading user timetable:', error);
      if (error instanceof Error && 
          (error.message.includes('Authentication error') || 
           error.message.includes('User ID mismatch') ||
           error.message.includes('PGRST116'))) {
        return null;
      }
      
      throw error;
    }
  }

  static async saveUserTimetable(
    userId: string,
    semester: "sem1" | "sem2",
    modules: SelectedModule,
    timePreferences: TimePreferenceData,
    isOptimized: boolean
  ): Promise<boolean> {
    try {
      return await this.retryOperation(async () => {
        // Check authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Authentication error');
        }
        
        if (!session?.user) {
          console.log('No authenticated user for save operation');
          return false;
        }

        // Verify user ID matches session
        if (session.user.id !== userId) {
          console.error('User ID mismatch during save');
          return false;
        }

        if (!this.validateTimetableData({ modules, timePreferences, semester, isOptimized })) {
          console.error('Invalid timetable data');
          return false;
        }

        // Check if record exists
        const { data: existingData, error: checkError } = await supabase
          .from('user_timetables')
          .select('id')
          .eq('user_id', userId)
          .eq('semester', semester)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing data:', checkError);
          throw checkError;
        }

        if (existingData) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('user_timetables')
            .update({
              modules: modules,
              time_preferences: timePreferences,
              is_optimized: isOptimized,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('semester', semester);

          if (updateError) {
            console.error('Update error:', updateError);
            throw updateError;
          }
          console.log('Timetable updated successfully');
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('user_timetables')
            .insert({
              user_id: userId,
              semester: semester,
              modules: modules,
              time_preferences: timePreferences,
              is_optimized: isOptimized
            });

          if (insertError) {
            console.error('Insert error:', insertError);
            throw insertError;
          }
          console.log('New timetable saved successfully');
        }

        return true;
      });
    } catch (error) {
      console.error('Error saving user timetable:', error);
      return false;
    }
  }

  static async getUserCurrentSemester(userId: string): Promise<"sem1" | "sem2"> {
    try {
      return await this.retryOperation(async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          return 'sem1'; // Default for unauthenticated users
        }

        // Verify user ID matches session
        if (session.user.id !== userId) {
          return 'sem1';
        }

        const { data, error } = await supabase
          .from('user_current_semester')
          .select('current_semester')
          .eq('user_id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return 'sem1'; // Default if no preference saved
          }
          throw error;
        }

        return data.current_semester as "sem1" | "sem2";
      });
    } catch (error) {
      console.error('Error getting user current semester:', error);
      return 'sem1'; // Safe default
    }
  }

  static async updateUserCurrentSemester(
    userId: string, 
    semester: "sem1" | "sem2"
  ): Promise<boolean> {
    try {
      return await this.retryOperation(async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          console.log('No authenticated user for semester update');
          return false;
        }

        // Verify user ID matches session
        if (session.user.id !== userId) {
          console.error('User ID mismatch during semester update');
          return false;
        }

        // Check if record exists
        const { data: existingData, error: checkError } = await supabase
          .from('user_current_semester')
          .select('user_id')
          .eq('user_id', userId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingData) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('user_current_semester')
            .update({
              current_semester: semester,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          if (updateError) throw updateError;
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('user_current_semester')
            .insert({
              user_id: userId,
              current_semester: semester
            });

          if (insertError) throw insertError;
        }

        console.log(`Updated current semester to ${semester}`);
        return true;
      });
    } catch (error) {
      console.error('Error updating user current semester:', error);
      return false;
    }
  }

  static validateTimetableData(data: any): boolean {
    if (!data) return false;
    
    if (typeof data.modules !== 'object') return false;
    if (typeof data.timePreferences !== 'object') return false;
    if (!['sem1', 'sem2'].includes(data.semester)) return false;
    if (typeof data.isOptimized !== 'boolean') return false;
    
    for (const [moduleCode, moduleData] of Object.entries(data.modules)) {
      if (typeof moduleCode !== 'string' || !moduleCode.trim()) {
        return false;
      }
      
      if (!moduleData || typeof moduleData !== 'object') {
        return false;
      }
      
      if (
        typeof moduleData === 'object' &&
        moduleData !== null &&
        'timetable' in moduleData &&
        moduleData.timetable &&
        !Array.isArray((moduleData as any).timetable)
      ) {
        return false;
      }
    }
    
    for (const [day, timeSlots] of Object.entries(data.timePreferences)) {
      if (!['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day)) {
        return false;
      }
      
      if (timeSlots && typeof timeSlots !== 'object') {
        return false;
      }
      
      if (timeSlots) {
        for (const [, isSelected] of Object.entries(timeSlots)) {
          if (typeof isSelected !== 'boolean') {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  // Helper method to check authentication status
  static async checkAuthStatus(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth check error:', error);
        return false;
      }
      return !!session?.user;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }
}