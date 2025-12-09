const https = require('https');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise(function(resolve, reject) {
    https.get(url, function(res) {
      let data = '';
      res.on('data', function(chunk) { 
        data += chunk; 
      });
      res.on('end', function() { 
        resolve(data); 
      });
    }).on('error', function(err) { 
      reject(err); 
    });
  });
}

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function transformFeed() {
  console.log('Fetching RSS feed...');
  fetchUrl('https://researchbuzz.me/feed/')
    .then(function(feedText) {
      console.log('Parsing feed...');
      
      const titleMatch = feedText.match(/<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/);
      const linkMatch = feedText.match(/<channel>[\s\S]*?<link>([\s\S]*?)<\/link>/);
      const descMatch = feedText.match(/<channel>[\s\S]*?<description>([\s\S]*?)<\/description>/);
      
      const feedTitle = titleMatch ? titleMatch[1].trim() : 'Transformed Feed';
      const feedLink = linkMatch ? linkMatch[1].trim() : '';
      const feedDescription = descMatch ? descMatch[1].trim() : '';
      
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let itemMatch;
      const items = [];
      while ((itemMatch = itemRegex.exec(feedText)) !== null) {
        items.push(itemMatch[1]);
      }
      
      console.log('Found ' + items.length + ' items in original feed');
      
      const transformedItems = [];
      
      for (let i = 0; i < items.length; i++) {
        const itemContent = items[i];
        
        const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/) || 
                            itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
        
        if (!contentMatch) continue;
        
        const content = contentMatch[1];
        const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toUTCString();
        
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
        let pMatch;
        const paragraphs = [];
        while ((pMatch = pRegex.exec(content)) !== null) {
          paragraphs.push(pMatch[1]);
        }
        
        for (let j = 0; j < paragraphs.length; j++) {
          const pContent = paragraphs[j];
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
                transformedItems.push({
                  title: headline,
                  link: url,
                  description: annotation,
                  pubDate: pubDate
                });
              }
            }
          }
        }
      }
      
      console.log('Extracted ' + transformedItems.length + ' individual items');
      
      let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
      rss += '<rss version="2.0">\n';
      rss += '  <channel>\n';
      rss += '    <title>' + escapeXml(feedTitle) + ' - Transformed</title>\n';
      rss += '    <link>' + escapeXml(feedLink) + '</link>\n';
      rss += '    <description>' + escapeXml(feedDescription) + '</description>\n';
      rss += '    <lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>\n';
      
      for (let i = 0; i < transformedItems.length; i++) {
        const item = transformedItems[i];
        rss += '    <item>\n';
        rss += '      <title>' + escapeXml(item.title) + '</title>\n';
        rss += '      <link>' + escapeXml(item.link) + '</link>\n';
        rss += '      <description>' + escapeXml(item.description) + '</description>\n';
        rss += '      <pubDate>' + item.pubDate + '</pubDate>\n';
        rss += '      <guid>' + escapeXml(item.link) + '</guid>\n';
        rss += '    </item>\n';
      }
      
      rss += '  </channel>\n';
      rss += '</rss>';
      
      fs.writeFileSync('transformed-feed.xml', rss, 'utf8');
      console.log('✓ Feed transformed successfully!');
      console.log('✓ Created ' + transformedItems.length + ' items');
    })
    .catch(function(error) {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

transformFeed();
