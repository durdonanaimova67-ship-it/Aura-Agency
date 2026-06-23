const scrape = require('website-scraper').default;

const options = {
  urls: [
    'https://www.klientboost.com/',
  ],
  directory: './klientboost-site',
  recursive: true,
  maxRecursiveDepth: 3,            // homepage -> pages -> their links -> deeper (blog posts, etc.)
  maxDepth: 4,                     // how deep assets/links are followed
  prettifyUrls: true,
  filenameGenerator: 'bySiteStructure',
  requestConcurrency: 4,
  request: {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    },
  },
  // Only follow links that stay on klientboost.com (don't crawl the whole internet)
  urlFilter: (url) => url.includes('klientboost.com'),
  sources: [
    { selector: 'img', attr: 'src' },
    { selector: 'img', attr: 'srcset' },
    { selector: 'link[rel="stylesheet"]', attr: 'href' },
    { selector: 'link[rel="icon"]', attr: 'href' },
    { selector: 'script', attr: 'src' },
    { selector: 'source', attr: 'src' },
    { selector: 'source', attr: 'srcset' },
    { selector: 'video', attr: 'src' },
    { selector: 'a', attr: 'href' },
  ],
};

console.log('Downloading klientboost.com ... this may take a minute.');
scrape(options)
  .then((result) => {
    console.log(`\nDone. Saved ${result.length} resources to ./klientboost-site`);
  })
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
