from __future__ import unicode_literals
from __future__ import print_function

import sys
from collections import defaultdict
import json
import logging
from weakref import WeakSet

from tornado import websocket, web

PY2 = sys.version_info[0] == 2

if PY2:
    text_type = unicode
else:
    text_type = str

log = logging.getLogger('notifier')


class WatchHandler(websocket.WebSocketHandler):
    """Watch a URL (resource)"""

    watching = defaultdict(WeakSet)

    def initialize(self):
        pass

    def check_origin(self, origin):
        return True

    def open(self, path):
        self.set_nodelay(True)
        log.debug('%s client connected', self.request.remote_ip)
        path = '/' + path.lstrip('/')
        log.debug(' watching %s', path)
        self.watching[path].add(self)

    def on_close(self):
        log.debug('%s client left', self.request.remote_ip)


class NotifyHandler(websocket.WebSocketHandler):
    """Broadcast notification for resource"""

    def initialize(self, secret=None):
        self.secret = secret

    def check_origin(self, origin):
        return True

    def open(self):
        try:
            secret = self.request.query_arguments.get('secret', [])[0]
        except IndexError:
            log.debug('secret key not supplied')
            self.close()
        else:
            if self.secret == secret:
                log.debug('%s connected', self.request.remote_ip)
            else:
                log.debug('secret key invalid')
                self.close()

    def on_message(self, message_json):
        try:
            path, instruction = json.loads(message_json)
        except:
            log.exception('failed to decode message')
            self.close()
        else:
            self.notify(path, instruction)

    def notify(self, path, instruction):
        log.debug('notify for %s', path)
        for handler in WatchHandler.watching[path]:
            log.debug('  notify %r', handler)
            handler.write_message(instruction)

    def on_close(self):
        log.debug('%s left', self.request.remote_ip)


def make_app(secret):
    app = web.Application([
        (r'^/watch/(?P<path>.*?)$', WatchHandler),
        (r'^/notify/$', NotifyHandler, {'secret': secret})
    ])
    return app
