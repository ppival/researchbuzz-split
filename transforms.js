const https = require('https');
const http = require('http');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    }).on('error', (err) => { reject(err); });
  });
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function transformFeed() {
  try {
    const feedText = await fetchUrl('https://researchbuzz.me/feed/');
    const titleMatch = feedText.match(/<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/);
    const linkMatch = feedText.match(/<channel>[\s\S]*?<link>([\s\S]*?)<\/link>/);
    const descMatch = feedText.match(/<channel>[\s\S]*?<description>([\s\S]*?)<\/description>/);
    const feedTitle = titleMatch ? titleMatch[1].trim() : 'Transformed Feed';
    const feedLink = linkMatch ? linkMatch[1].trim() : '';
    const feedDescription = descMatch ? descMatch[1].trim() : '';
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [...feedText.matchAll(itemRegex)];
    const transformedItems = [];
    
    for (const itemMatch of items) {
      const itemContent = itemMatch[1];
      const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/) || itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
      if (!contentMatch) continue;
      const content = contentMatch[1];
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toUTCString();
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
      const paragraphs = [...content.matchAll(pRegex)];
      
      for (const pMatch of paragraphs) {
        const pContent = pMatch[1];
        const linkRegex = /<a[^>]*href=["'](.*?)["'][^>]*>(.*?)<\/a>/;
        const linkMatch = pContent.match(linkRegex);
        if (linkMatch) {
          const url = linkMatch[1];
          const headline = linkMatch[2].replace(/<[^>]+>/g, '').trim();
          const textContent = pContent.replace(/<[^>]+>/g, '').trim();
          const headlineIndex = textContent.indexOf(headline);
          if (headlineIndex !== -1) {
            let annotation = textContent.substring(headlineIndex + headline.length).trim();
            annotation = annotation.replace(/^[.:\s]+/, '').trim();
            if (headline && annotation && url) {
              transformedItems.push({ title: headline, link: url, description: annotation, pubDate: pubDate });
            }
          }
        }
      }
    }
    
    let rss = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n';
    rss += '    <title>' + escapeXml(feedTitle) + ' - Transformed</title>\n';
    rss += '    <link>' + escapeXml(feedLink) + '</link>\n';
    rss += '    <description>' + escapeXml(feedDescription) + '</description>\n';
    transformedItems.forEach((item) => {
      rss += '    <item>\n      <title>' + escapeXml(item.title) + '</title>\n';
      rss += '      <link>' + escapeXml(item.link) + '</link>\n';
      rss += '      <description>' + escapeXml(item.description) + '</description>\n';
      rss += '      <pubDate>' + item.pubDate + '</pubDate>\n    </item>\n';
    });
    rss += '  </channel>\n</rss>';
    fs.writeFileSync('transformed-feed.xml', rss, 'utf8');
    console.log('Feed transformed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

transformFeed();
