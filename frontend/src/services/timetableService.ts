import { supabase } from '../lib/supabaseClient';
import type { SelectedModule, TimePreferenceData, CustomTimeBlock } from '../components/Timetable/types';

interface TimetableData {
  modules: SelectedModule;
  timePreferences: TimePreferenceData;
  customBlocks: CustomTimeBlock[];
  semester: "sem1" | "sem2";
  isOptimized: boolean;
  TotalMcs: number;
  ModuleTitleList: { [moduleCode: string]: string };
}

export class TimetableService {
  private static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('User not authenticated');
    return user;
  }

  static async loadUserTimetable(userId: string, semester: "sem1" | "sem2"): Promise<TimetableData | null> {
    try {
      const currentUser = await this.getCurrentUser();
      if (currentUser.id !== userId) throw new Error('Unauthorized access');

      const [timetableData, customBlocksData] = await Promise.all([
        supabase.from('user_timetables').select('*').eq('user_id', userId).eq('semester', semester).single(),
        supabase.from('user_custom_blocks').select('*').eq('user_id', userId).eq('semester', semester)
      ]);

      const customBlocks: CustomTimeBlock[] = (customBlocksData.data || []).map(block => ({
        id: block.id,
        eventName: block.event_name,
        days: block.days,
        startTime: block.start_time,
        endTime: block.end_time,
        color: block.color
      }));

      return {
        modules: timetableData.data?.modules || {},
        timePreferences: timetableData.data?.time_preferences || {},
        customBlocks,
        semester,
        isOptimized: timetableData.data?.is_optimized || false,
        TotalMcs: timetableData.data?.TotalMcs || 0,
        ModuleTitleList: timetableData.data?.ModuleTitleList || {}
      };
    } catch (error) {
      console.error('Failed to load user timetable:', error);
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
      const currentUser = await this.getCurrentUser();
      if (currentUser.id !== userId) throw new Error('Unauthorized access');

      const moduleCodes = Object.keys(modules);
      let TotalMcs = 0;
      const ModuleTitleList: { [moduleCode: string]: string } = {};

      if (moduleCodes.length > 0) {
        const { data } = await supabase
          .from(semester)
          .select('moduleCode, moduleCredit, moduleTitle')
          .in('moduleCode', moduleCodes);

        data?.forEach(module => {
          TotalMcs += module.moduleCredit || 0;
          ModuleTitleList[module.moduleCode] = module.moduleTitle || '';
        });
      }

      const timetableData = {
        modules,
        time_preferences: timePreferences,
        is_optimized: isOptimized,
        TotalMcs,
        ModuleTitleList,
        updated_at: new Date().toISOString()
      };

      const { data: existingData } = await supabase
        .from('user_timetables')
        .select('id')
        .eq('user_id', userId)
        .eq('semester', semester)
        .single();

      const { error } = existingData
        ? await supabase.from('user_timetables').update(timetableData).eq('user_id', userId).eq('semester', semester)
        : await supabase.from('user_timetables').insert({ user_id: userId, semester, ...timetableData });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to save user timetable:', error);
      return false;
    }
  }

  static async saveCustomBlock(
    userId: string,
    semester: "sem1" | "sem2",
    customBlock: CustomTimeBlock
  ): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser();
      if (currentUser.id !== userId) throw new Error('Unauthorized access');

      const { error } = await supabase.from('user_custom_blocks').insert({
        user_id: userId,
        semester,
        event_name: customBlock.eventName,
        days: customBlock.days,
        start_time: customBlock.startTime,
        end_time: customBlock.endTime,
        color: customBlock.color
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to save custom block:', error);
      return false;
    }
  }

  static async deleteCustomBlock(userId: string, blockId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser();
      if (currentUser.id !== userId) throw new Error('Unauthorized access');

      const { error } = await supabase
        .from('user_custom_blocks')
        .delete()
        .eq('id', blockId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete custom block:', error);
      return false;
    }
  }

  static async getUserCurrentSemester(userId: string): Promise<"sem1" | "sem2"> {
    try {
      const currentUser = await this.getCurrentUser();
      if (currentUser.id !== userId) throw new Error('Unauthorized access');

      const { data } = await supabase
        .from('user_current_semester')
        .select('current_semester')
        .eq('user_id', userId)
        .single();

      return data?.current_semester || 'sem1';
    } catch (error) {
      console.error('Failed to get user current semester:', error);
      return 'sem1';
    }
  }

  static async updateUserCurrentSemester(userId: string, semester: "sem1" | "sem2"): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser();
      if (currentUser.id !== userId) throw new Error('Unauthorized access');

      const { data: existingData } = await supabase
        .from('user_current_semester')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      const semesterData = {
        current_semester: semester,
        updated_at: new Date().toISOString()
      };

      const { error } = existingData
        ? await supabase.from('user_current_semester').update(semesterData).eq('user_id', userId)
        : await supabase.from('user_current_semester').insert({ user_id: userId, ...semesterData });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to update user current semester:', error);
      return false;
    }
  }
}