import { useState, useEffect } from 'react';
import Navbar from "../components/Navbar";

export default function Homepage() {
    
    return(
        <>
            <Navbar/>
            <main className="homepage">
                <form>
                    <div>
                        <label htmlFor="AY">Which AY are you planning for?</label>
                        <input
                            type="text"
                        />
                    </div>
                    <div>
                        <label htmlFor="sem">Which semester are you planning for?</label>
                        <input
                            type="text"
                        />
                    </div>
                    <div>
                        <label htmlFor="mods">What modules are you taking?</label>
                        <input
                            type="text"
                        />
                        <h2>Modules to appear here in point format with "x" to remove</h2>
                    </div>
                    <div>
                        <label htmlFor="AY">What timeblocks will you like to be free?</label>
                        <button>Add Timeblocks</button>
                    </div>
                    <div>
                        <h2>Timeblocks to appear here in table format</h2>
                    </div>
                    <div className="homepage-submit">
                        <button type="submit">Create Timetable</button>
                    </div>
                </form>
            </main>
        </>
    )
}