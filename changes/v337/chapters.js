/* v337 changes film: real app shots, October 30 2026. */
const VERSION = 'v337';
const CH = [
  { type: 'intro', label: 'Intro', dur: 7,
    kicker: 'TheSmallBook · what changed · 30 October 2026',
    title: 'Build 337.<br><i>Your reading follows you.</i>',
    sub: 'Reading that follows the reader, every-lesson visual handles, a safer Kids room and quieter, faster daily paths.' },

  { type: 'shots', no: 1, label: '600 long reads', dur: 15,
    kicker: '01 · The library', title: '600 books.<br><i>4,343 lessons.</i>',
    notes: ['Every lesson now gets its own compact visual handle: a path, loop, balance or ladder that moves with the argument. Atomic Habits keeps its true one percent curve.',
            'The reader remains simple: a real page, a real idea, and one next move. Visuals explain the idea without turning the page into a dashboard.'],
    specs: [['Books', '600'], ['Lessons', '4,343'], ['New Originals', '10']],
    shots: [{ img: 'book', at: 0 }, { img: 'chart', at: 5, fx: 'fade' }, { img: 'reader', at: 10, fx: 'fade' }] },

  { type: 'shots', no: 2, label: 'Voice on your device', dur: 14,
    kicker: '02 · Listen', title: 'Meet the voice.<br><i>Keep it with you.</i>',
    notes: ['TheSmallBook Voice Model stays a clear, one-time English or Hindi download, stored on the reader’s device. Kids mode now reaches the same chosen private voice.',
            'The basic model is available to everyone. Gold can choose Voice Model Plus. No voice download starts without a reader or parent choosing it.'],
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
    notes: ['Reading work now has a private account home: lessons, shelf, resume place, plans, highlights, streak history and chosen journey merge on each signed-in device. Theme, text size and action-bar layout stay personal to each device.',
            'Weekly email digest is retired. Daily phone nudges remain the one deliberate way to return, and the bar never duplicates a shortcut when it is customised.'],
    specs: [['Reading state', 'Private account sync'], ['Phone', 'Daily nudge'], ['Email', 'Retired']],
    shots: [{ img: 'people', at: 0 }] },

  { type: 'stats', no: 5, label: 'Checked, then shipped', dur: 12,
    kicker: 'Under the hood', title: 'Checked,<br><i>then shipped.</i>',
    notes: ['The numbers on the right come from this exact build.'],
    stats: [[1000, 'checks passed', 'No check failing'],
            [600, 'books on the shelf', 'Counted from the library itself'],
            [4343, 'lessons ready to read', 'Every lesson is linked and loadable'],
            [0, 'old screens shown', 'A shell stays in front until the page is ready']],
    steps: ['Run RETIRE-v337-WEEKLY-DIGEST.sql only if the old weekly SQL was deployed', 'Run UPDATE-v337-reading-sync.sql in Supabase', 'Unzip thesmallbook.zip, commit and push'] }
];
