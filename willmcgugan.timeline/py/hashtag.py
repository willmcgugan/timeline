from __future__ import unicode_literals
from __future__ import print_function

import re

import moya

from lxml.html import fragment_fromstring

re_hashtags = re.compile(r'#(\w+)', re.UNICODE)


@moya.expose.filter('hashtags')
def hashtags_filter(html, max_length=100):
    """Extract all the #hashtags from html fragment."""
    root = fragment_fromstring(html, create_parent=True)
    text = root.text_content()
    if isinstance(text, bytes):
        text = text.decode('utf-8', 'ignore')
    return [t[:max_length].lower() for t in re_hashtags.findall(text)]
