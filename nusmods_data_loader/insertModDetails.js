const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');
const { data } = require('react-router-dom');
require('dotenv').config({ path: '../.env' });
console.log('URL:', process.env.SUPABASE_URL);
const ACAD_YEAR = '2024-2025';
const FETCH_MOD_CODE_URL = `https://api.nusmods.com/v2/${ACAD_YEAR}/moduleInfo.json`;
//const FETCH_LESSON_DETAILS_URL = `https://api.nusmods.com/v2//${ACAD_YEAR}}/modules/${moduleCode}.json`;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);


async function main() {
    //FETCH_LESSON_DETAILS_URL = `https://api.nusmods.com/v2//${ACAD_YEAR}}/modules/${moduleCode}.json`;
    const modCode =[];
    const response = await fetch(FETCH_MOD_CODE_URL);
    const modules = await response.json();
    console.log(`Fetched ${modules.length} modules from NUSMods API`);
    
    for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        modCode.push(mod.moduleCode);
    }
    console.log(`Fetched ${modCode.length} module codes`);


}

main().catch(console.error);



