/* v336 changes film: real app shots, October 30 2026. */
const VERSION = 'v336';
const CH = [
  { type: 'intro', label: 'Intro', dur: 7,
    kicker: 'TheSmallBook · what changed · 30 October 2026',
    title: 'Build 336.<br><i>The library gets deeper.</i>',
    sub: 'Longer reads, a private voice, a proper desktop desk, and quieter details from opening to sharing.' },

  { type: 'shots', no: 1, label: '600 long reads', dur: 15,
    kicker: '01 · The library', title: '600 books.<br><i>4,343 lessons.</i>',
    notes: ['Eighty new long reads join the shelf. Ten are illustrated TheSmallBook Originals, written in house. Every new title has eight or more substantial lessons, a plan, a caveat and a graveyard case. The first lesson now carries a small visual map too: Atomic Habits gets its true one percent curve.',
            'The reader remains simple: a real page, a real idea, and one next move. There is no separate full-book product hiding in the app.'],
    specs: [['Books', '600'], ['Lessons', '4,343'], ['New Originals', '10']],
    shots: [{ img: 'book', at: 0 }, { img: 'chart', at: 5, fx: 'fade' }, { img: 'reader', at: 10, fx: 'fade' }] },

  { type: 'shots', no: 2, label: 'Voice on your device', dur: 14,
    kicker: '02 · Listen', title: 'Meet the voice.<br><i>Keep it with you.</i>',
    notes: ['The player now offers TheSmallBook Voice Model by name. It is a clear, one-time English or Hindi download with progress, stored on the reader’s device.',
            'The basic model is available to everyone. Gold can choose Voice Model Plus. Spoken text does not leave the device for the new voice.'],
    specs: [['Download', 'About 63 MB'], ['Languages', 'English and Hindi'], ['Storage', 'On device']],
    shots: [{ img: 'voice', at: 0 }] },

  { type: 'shots', no: 3, label: 'Not a large phone', dur: 14,
    kicker: '03 · Every screen', title: 'A reading desk.<br><i>Not a large phone.</i>',
    notes: ['Desktop and tablet now redraw into an editorial spread: the day’s book, the mind pick and the shelves have room to breathe, with a vertical rail that stays out of the way.',
            'The four setup screens return once for existing readers, prefilled from their saved choices. The same care carries through the notebook, reader, player and bottom bar.'],
    specs: [['Desktop', 'Editorial spread'], ['Tablet', 'Two-column desk'], ['Phone', 'Focused and quick']],
    shots: [{ img: 'desk', at: 0 }] },

  { type: 'shots', no: 4, label: 'People and returning', dur: 14,
    kicker: '04 · Stories', title: 'People is back.<br><i>Follow. Message. Return.</i>',
    notes: ['People is a visible Stories tab again, with active readers, profiles, follow requests and one-tap messages. The writing room stays calm, and the new user-facing controls do not make the feed noisy.',
            'Daily phone nudges are ready in You. Readers can also choose one private Sunday reading digest by email, and can turn it off just as easily.'],
    specs: [['People', 'Follow and message'], ['Phone', 'Daily nudge'], ['Email', 'Weekly opt-in']],
    shots: [{ img: 'people', at: 0 }] },

  { type: 'stats', no: 5, label: 'Checked, then shipped', dur: 12,
    kicker: 'Under the hood', title: 'Checked,<br><i>then shipped.</i>',
    notes: ['The numbers on the right come from this exact build.'],
    stats: [[985, 'checks passed', 'No check failing'],
            [600, 'books on the shelf', 'Counted from the library itself'],
            [4343, 'lessons ready to read', 'Every lesson is linked and loadable'],
            [0, 'old screens shown', 'A shell stays in front until the page is ready']],
    steps: ['Run UPDATE-v336-retention.sql only for weekly email', 'Unzip thesmallbook.zip over your repo', 'Commit and push in GitHub Desktop'] }
];
