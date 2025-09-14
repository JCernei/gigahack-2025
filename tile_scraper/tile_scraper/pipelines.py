# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html

from scrapy.pipelines.images import ImagesPipeline
from scrapy.exceptions import DropItem
import hashlib
from urllib.parse import urlparse
import os

class TileImagePipeline(ImagesPipeline):
    def file_path(self, request, response=None, info=None, *, item=None):
        """
        Customize the image file path
        """
        # Get the original URL
        image_url = request.url
        # Parse the URL to get the filename
        url_path = urlparse(image_url).path
        # Get the base filename
        basename = os.path.basename(url_path)
        
        # If there's no extension, add .jpg
        if not basename:
            basename = hashlib.sha1(image_url.encode()).hexdigest() + '.jpg'
        elif '.' not in basename:
            basename += '.jpg'
            
        # Get the product title from the item if available
        if item and 'title' in item:
            # Clean the title to make it filesystem-friendly
            clean_title = "".join(x for x in item['title'] if x.isalnum() or x in (' ', '-', '_')).strip()
            # Create a folder structure using the title
            return f'{clean_title}/{basename}'
            
        return basename

    def item_completed(self, results, item, info):
        """
        Called when all images in an item have been downloaded (or failed)
        """
        image_paths = [x['path'] for ok, x in results if ok]
        if not image_paths:
            raise DropItem("Item contains no images")
        item['image_paths'] = image_paths
        return item
