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

    watching = defaultdict(WeakSet)

    def initialize(self):
        pass

    def check_origin(self, origin):
        return True

    def open(self):
        self.set_nodelay(True)
        log.debug('%s client connected', self.request.remote_ip)
        path = self.get_argument('path')
        self.watching[path].add(self)

    # def on_message(self, message):
    #     pass

    def on_close(self):
        log.debug('%s client left', self.request.remote_ip)


class NotifyHandler(websocket.WebSocketHandler):

    def __init__(self, *args, **kwargs):
        super(WatchHandler, self).__init__(*args, **kwargs)
        self.secret = None

    def initialize(self, secret=None):
        self.secret = secret

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
            message = json.loads(message_json)
        except:
            log.exception('failed to decode message')
            self.close()
        else:
            try:
                path, instruction = message
            except:
                log.debug('message invalid')
            else:
                self.notify(path, instruction)

    def notify(self, path, instruction):
        for handler in WatchHandler.watching[path]:
            handler.write_message(instruction)

    def on_close(self):
        log.debug('%s left', self.request.remote_ip)


def make_app(secret):
    app = web.Application([
        (r'^/watch/(?P<path>.*?)$', WatchHandler),
        (r'^/notify/$', NotifyHandler, {'secret': secret})
    ])
    return app
