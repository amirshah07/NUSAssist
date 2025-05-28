const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const ACAD_YEAR = '2024-2025';
const FETCH_MOD_CODE_URL = `https://api.nusmods.com/v2/${ACAD_YEAR}/moduleInfo.json`;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function insertToTable(moduleCode, semesterData, semester) {
    const table = semester === 1 ? 'sem1' : 'sem2';

    const { error } = await supabase
        .from(table)
        .upsert([{ moduleCode: moduleCode, semesterData: semesterData }]);

    if (error) {
        console.error(`failed to insert ${moduleCode} into ${table}:`, error.message);
    } else {
        console.log(`insert ${moduleCode} into ${table}`);
    }
}

async function main() {
    const response = await fetch(FETCH_MOD_CODE_URL);
    const modules = await response.json();
    console.log(`fetched: ${modules.length}`);

    for (const mod of modules) {
        const modCode = mod.moduleCode;
        const moduleDetailsResponse = await fetch(`https://api.nusmods.com/v2/${ACAD_YEAR}/modules/${modCode}.json`);
        const moduleDetails = await moduleDetailsResponse.json();

        if (!moduleDetails.semesterData) continue;

        for (const sem of moduleDetails.semesterData) {
            if (sem.semester === 1 && sem.timetable.length > 0) {
                await insertToTable(modCode, sem, 1);
            } else if (sem.semester === 2 && sem.timetable.length > 0) {
                await insertToTable(modCode, sem, 2);
            }
        }
    }
    console.log('done')
}

main().catch(console.error);