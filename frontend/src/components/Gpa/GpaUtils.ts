import { supabase } from '../../lib/supabaseClient';
import type { Semester } from './GpaCalculations';

interface DBUserGpaSemester {
  id: string;
  user_id: string;
  semester_id: string;
  semester_name: string;
  year_number: number;
  semester_type: string;
  created_at?: string;
  updated_at?: string;
}

interface DBUserGpaModule {
  id?: string;
  semester_id: string;
  module_code: string;
  module_name: string | null;
  mcs: number;
  grade: string;
  grade_point: number;
  su_used: boolean;
  created_at?: string;
  updated_at?: string;
}

// Load all semesters and modules for the current user
export async function loadUserSemesters(): Promise<Semester[]> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // Load semesters
    const { data: semesters, error: semError } = await supabase
      .from('user_gpa_semesters')
      .select('*')
      .eq('user_id', user.id)
      .order('year_number', { ascending: true })
      .order('semester_type', { ascending: true });

    if (semError) throw semError;
    if (!semesters || semesters.length === 0) return [];

    const typedSemesters = semesters as DBUserGpaSemester[];

    // Load all modules for these semesters
    const semesterIds = typedSemesters.map(s => s.id);
    const { data: modules, error: modError } = await supabase
      .from('user_gpa_modules')
      .select('*')
      .in('semester_id', semesterIds);

    if (modError) throw modError;

    const typedModules = (modules || []) as DBUserGpaModule[];

    return typedSemesters.map(sem => ({
      id: sem.semester_id,
      name: sem.semester_name,
      modules: typedModules
        .filter(mod => mod.semester_id === sem.id)
        .map(mod => ({
          code: mod.module_code,
          name: mod.module_name || '',
          mcs: mod.mcs,
          grade: mod.grade,
          gradePoint: mod.grade_point,
          suUsed: mod.su_used,
          showActualGrade: false 
        }))
    }));
  } catch (error) {
    console.error('Error loading semesters:', error);
    throw error;
  }
}

// Save all semesters (handles insert/update/delete)
export async function saveUserSemesters(semesters: Semester[]): Promise<void> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // Get existing semesters from DB
    const { data: existingSemesters, error: fetchError } = await supabase
      .from('user_gpa_semesters')
      .select('id, semester_id')
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;

    const existingMap = new Map(existingSemesters?.map(s => [s.semester_id, s.id]) || []);
    const currentSemesterIds = new Set(semesters.map(s => s.id));

    // Delete semesters that no longer exist
    const toDelete = Array.from(existingMap.entries())
      .filter(([semId]) => !currentSemesterIds.has(semId))
      .map(([, dbId]) => dbId);

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('user_gpa_semesters')
        .delete()
        .in('id', toDelete);
      
      if (deleteError) throw deleteError;
    }

    // Process each semester
    for (const semester of semesters) {
      const yearMatch = semester.id.match(/Y(\d)/);
      const semMatch = semester.id.match(/S(\w+)/);
      
      if (!yearMatch || !semMatch) continue;

      const dbSemesterId = existingMap.get(semester.id);

      if (dbSemesterId) {
        // Update existing semester
        const { error: updateError } = await supabase
          .from('user_gpa_semesters')
          .update({
            semester_name: semester.name,
            year_number: parseInt(yearMatch[1]),
            semester_type: semMatch[1],
            updated_at: new Date().toISOString()
          })
          .eq('id', dbSemesterId);

        if (updateError) throw updateError;

        // Delete all existing modules and re-insert 
        const { error: deleteModError } = await supabase
          .from('user_gpa_modules')
          .delete()
          .eq('semester_id', dbSemesterId);

        if (deleteModError) throw deleteModError;

        // Insert modules
        if (semester.modules.length > 0) {
          const modulesToInsert = semester.modules.map(mod => ({
            semester_id: dbSemesterId,
            module_code: mod.code,
            module_name: mod.name || null,
            mcs: mod.mcs,
            grade: mod.grade,
            grade_point: mod.gradePoint,
            su_used: mod.suUsed || false
          }));

          const { error: insertModError } = await supabase
            .from('user_gpa_modules')
            .insert(modulesToInsert);

          if (insertModError) throw insertModError;
        }
      } else {
        // Insert new semester
        const { data: newSemester, error: insertError } = await supabase
          .from('user_gpa_semesters')
          .insert({
            user_id: user.id,
            semester_id: semester.id,
            semester_name: semester.name,
            year_number: parseInt(yearMatch[1]),
            semester_type: semMatch[1]
          })
          .select('id')
          .single();

        if (insertError || !newSemester) throw insertError;

        // Insert modules
        if (semester.modules.length > 0) {
          const modulesToInsert = semester.modules.map(mod => ({
            semester_id: newSemester.id,
            module_code: mod.code,
            module_name: mod.name || null,
            mcs: mod.mcs,
            grade: mod.grade,
            grade_point: mod.gradePoint,
            su_used: mod.suUsed || false
          }));

          const { error: insertModError } = await supabase
            .from('user_gpa_modules')
            .insert(modulesToInsert);

          if (insertModError) throw insertModError;
        }
      }
    }
  } catch (error) {
    console.error('Error saving semesters:', error);
    throw error;
  }
}