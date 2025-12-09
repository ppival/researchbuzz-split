# researchbuzz-split
Splits the standard ResearchBuzz RSS feed [https://researchbuzz.me/feed/] into smaller chunks - one item for each entry rather than several items in a single post.

Our final feed is at https://ppival.github.io/researchbuzz-split/transformed-feed.xml

If you want to change the frequency of the feed check, edit `.github/workflows/transform-feed.yml`

Find the line with `cron: '0 */6 * * *'` and change it to your preferred schedule:

- `'0 */3 * * *'` = every 3 hours
- `'0 */2 * * *'` = every 2 hours
- `'0 * * * *'` = every hour
- `'*/30 * * * *'` = every 30 minutes
- `'0 0 * * *'` = once daily at midnight
- `'0 9,15,21 * * *'` = three times daily (9am, 3pm, 9pm)

Thanks for the assistance in putting this together, Claude.
