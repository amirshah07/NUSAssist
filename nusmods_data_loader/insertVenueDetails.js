const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const VENUE_URL = 'https://api.nusmods.com/v2/venues.json';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function insertVenue(venue) {
    const { error } = await supabase
        .from('nus_locations')
        .upsert([{
            venueId: venue.venue,
            name: venue.name,
            latitude: venue.location?.lat,
            longitude: venue.location?.lng
        }]);

    if (error) {
        console.error(`Failed to insert ${venue.venue}:`, error.message);
    } else {
        console.log(`Inserted ${venue.venue}`);
    }
}

async function main() {
    const response = await fetch(VENUE_URL);
    const venues = await response.json();
    console.log(`Fetched ${venues.length} venues`);

    for (const venue of venues) {
        if (venue.location) {
            await insertVenue(venue);
        }
    }

    console.log('Done inserting locations');
}

main().catch(console.error);
