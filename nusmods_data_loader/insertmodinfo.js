const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });
console.log('Supabase URL:', process.env.SUPABASE_URL);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const ACAD_YEAR = '2024-2025';
const API_URL = `https://api.nusmods.com/v2/${ACAD_YEAR}/moduleInfo.json`;

async function main() {
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('Fetching module data...');

  const response = await fetch(API_URL);
  const modules = await response.json();
  console.log(`Fetched ${modules.length} modules`);
  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i];

    const { error } = await supabase.from('nus_mods_data').insert({
      moduleCode: mod.moduleCode,
      title: mod.title,
      description: mod.description,
      moduleCredit: mod.moduleCredit,
      department: mod.department,
      faculty: mod.faculty,
      workload: mod.workload,
      prerequisite: mod.prerequisite,
      preclusion: mod.preclusion,
      corequisite: mod.corequisite,
      semesterData: mod.semesterData,
    });

    if (error) {
      console.error(`Failed to insert ${mod.moduleCode} at index ${i}:`, error.message);
    } else {
      console.log(`Inserted ${mod.moduleCode} (${i + 1}/${modules.length})`);
    }
  }

  console.log('All modules processed');
}

main().catch(console.error);

