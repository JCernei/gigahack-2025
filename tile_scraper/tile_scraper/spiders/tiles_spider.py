import scrapy
from urllib.parse import urljoin
from datetime import datetime


class TilesSpiderSpider(scrapy.Spider):
    name = "tiles_spider"
    
    allowed_domains = ["supraten.md"]
    start_urls = [
        "https://supraten.md/cautare?search=gresie&category_id=0",
    ]

    custom_settings = {
        'ROBOTSTXT_OBEY': False,
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 3,
        'COOKIES_ENABLED': True,
        'COOKIES_DEBUG': True,
        'DEFAULT_REQUEST_HEADERS': {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ro,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Host': 'supraten.md',
            'Origin': 'https://supraten.md',
            'Referer': 'https://supraten.md/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    }
    
    def start_requests(self):
        # First make a request to the homepage to get cookies
        yield scrapy.Request(
            'https://supraten.md',
            callback=self.after_homepage,
            dont_filter=True
        )

    def after_homepage(self, response):
        # Now make the search request
        yield scrapy.Request(
            'https://supraten.md/cautare?search=gresie&category_id=0',
            callback=self.parse_start_urls
        )

    def parse_start_urls(self, response):
        """Parse the search results page"""
        products = response.css('.sp-show-product-vertical')
        for product in products:
            # Extract data from the search page
            title = product.css('.sp-card-product__title::text').get()
            regular_price = product.css('.sp-card-product__value_regular::text').get()
            sale_price = product.css('.sp-card-product__value_sale::text').get()
            image = product.css('.sp-card-product__img::attr(src)').get()
            product_url = product.css('a::attr(href)').get()
            brand_img = product.css('.sp-card-product__brand::attr(src)').get()
            
            # Extract labels
            labels = []
            for label in product.css('.sp-product-label::text').getall():
                if label.strip():
                    labels.append(label.strip())
            
            # Clean up the data
            if regular_price:
                regular_price = regular_price.strip()
            if sale_price:
                sale_price = sale_price.strip()
            
            # Build the item
            item = {
                'title': title.strip() if title else None,
                'regular_price': regular_price,
                'sale_price': sale_price,
                'image_urls': [urljoin(response.url, image)] if image else [],
                'product_url': urljoin(response.url, product_url) if product_url else None,
                'brand_image': urljoin(response.url, brand_img) if brand_img else None,
                'labels': labels,
                'is_in_stock': 'product-out-of-stock' not in product.css('::attr(class)').get(''),
                'scraped_at': response.headers.get('Date', b'').decode('utf-8')
            }
            
            yield item
            
        # Follow pagination
        next_page = response.css('a.pagination__next::attr(href)').get()
        if next_page:
            yield response.follow(next_page, self.parse_start_urls)

    def closed(self, reason):
        """
        Called when the spider is closed
        """
        self.logger.info(f"Spider closed: {reason}")
