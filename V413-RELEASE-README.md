# TheSmallBook Build 413

Build 413 makes the whole library findable and removes the duplicate plus in Ask.

## What changed

- Ask now keeps one plus. On the full Ask page, the old Compare plus is removed when the page composer mounts, leaving the single Ways to ask plus.
- All 530 Graveyard cases now have a static case study page. The 175 cases that only existed inside the app data now have crawlable pages with the story, fatal mistake, cost, lesson, antidote book, related failures and the Hindi intent question in simple English.
- All 83 Ask the Library questions now have static answer pages. Each page gives the short answer, the books behind it, the exact lessons used, a failure case where one exists, related questions and Hindi or Hinglish search variants for priority questions.
- Every named author now has an author shelf. Writers with one book in the library, including James Clear and Napoleon Hill, are no longer missing from author discovery.
- A complete books index links all 600 summaries by category.
- New shelves and hubs: Books on Learning, plus nine Graveyard cause hubs for business, startup, money, fraud, history, ego, fame, trust and technology failures.
- The 20 book pages missing structured data now carry Article and FAQ schema. Duplicate Graveyard titles were separated by their real angle. Book, author, topic, reading list, question and failure pages gained breadcrumbs, India English signals and clearer next-page paths.
- Priority book pages gained quick answers grounded in the book itself: what it is about, which lessons matter, how long it takes and how to read it in Hindi or Hinglish.
- The sitemap now lists 1,915 URLs and leaves out the Listen forwarding page. robots.txt keeps private and app-only routes out of the crawl path, and llms.txt gives machine readers a clean map of the main shelves.
- Build numbers, cache names and asset versions now say 413.

## Verification

- Client suite: 1,136 passed, 0 failed.
- SEO audit: 1,899 book, author, topic, reading list, Graveyard and Ask pages checked for unique titles, descriptions, canonicals, one heading, valid structured data and working internal links.
- Browser check on a Pixel 7 profile: the Ask composer shows exactly one plus, labelled Ways to ask. New Ask, Graveyard and author pages render with the right title, canonical and structured data.

## Counts

- 600 books
- 4,343 lessons
- 530 failure case studies
- 83 Ask questions
- 1,915 sitemap URLs
