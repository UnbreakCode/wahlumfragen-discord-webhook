import { Polls, Query, DataType, Order } from 'german-election-polls';

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/xxxxxxxxxx'; // <--- Discord Webhook URL
const LAST_UPDATE_URL = 'https://api.dawum.de/last_update.txt';

let lastUpdate = '';

async function sendLatestSurvey() {
    const polls = new Polls();
    await polls.update();

    // query
    const query = polls.select([
        Query.include([DataType.Surveys]),
        Query.Survey.Release.isGreater(new Date('2025-01-01')),
        Query.Survey.Parliament.Shortcut.is(['Bundestagswahl', 'Bundestag']),
        Query.Survey.Sort.byRelease(Order.Desc),
    ]);

    // first survey is latest survey
    const latestSurvey = query.surveys[0];

    if (latestSurvey) {
        const releaseDate = new Date(latestSurvey.release).toLocaleDateString('de-DE');
        const instituteName = latestSurvey.institute.name;
        const taskerName = latestSurvey.tasker.name;
        const participants = latestSurvey.participants;

        const sortedResults = latestSurvey.results.sort((a, b) => b.result - a.result);

        let surveyResults = '';
        for (const partyResult of sortedResults) {
            const party = partyResult.party.shortcut;
            const percent = partyResult.result;
            surveyResults += `**${party}**: ${percent}%\n`;
        }

        const embed = {
            username: 'Wahlumfragen 2025 🇩🇪',
            avatar_url: 'https://pbs.twimg.com/profile_images/698577756838346752/iSvS-h-1_400x400.png',
            embeds: [
                {
                    title: `Aktuellste Umfrage vom ${releaseDate}`,
                    description: `**Institut**: ${instituteName}\n**Auftraggeber**: ${taskerName}\n**Teilnehmer**: ${participants}`,
                    color: 3447003,
                    fields: [
                        {
                            name: 'Ergebnisse (sortiert nach Prozenten)',
                            value: surveyResults,
                        },
                    ],
                    footer: {
                        text: 'Daten bereitgestellt von dawum.de | coded by UnbreakCode',
                    },
                },
            ],
        };

        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(embed),
        });

        console.log(`Aktuellste Umfrage gesendet: ${releaseDate} - ${instituteName}`);
    } else {
        console.log('Keine Umfrage gefunden.');
    }
}

async function checkForUpdates() {
    try {
        const response = await fetch(LAST_UPDATE_URL);
        const newUpdate = await response.text();

        // check timestamp
        if (newUpdate.trim() !== lastUpdate) {
            console.log('Neue Daten verfügbar! Sende das neueste Ergebnis...');
            lastUpdate = newUpdate.trim();
            await sendLatestSurvey();
        } else {
            console.log('Keine neuen Daten verfügbar.');
        }
    } catch (error) {
        console.error('Fehler beim Überprüfen der Updates:', error);
    }
}

// schedule 
setInterval(checkForUpdates, 10 * 60 * 60 * 1000);
checkForUpdates();