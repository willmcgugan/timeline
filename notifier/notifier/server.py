from __future__ import unicode_literals
from __future__ import print_function

import json
import logging
from collections import defaultdict
from weakref import WeakSet

from tornado import websocket, web, gen
from tornado.httpclient import AsyncHTTPClient

log = logging.getLogger('notifier')


class WatchHandler(websocket.WebSocketHandler):
    """Watch a URL (resource)"""
    watching = defaultdict(WeakSet)

    def initialize(self):
        self.ip = self.request.remote_ip
        self.path = None

    def __repr__(self):
        if self.ip is not None:
            return "<watch-handler {}>".format(self.ip)
        else:
            return "<watch-handler>"

    def check_origin(self, origin):
        return True

    def open(self, path):
        self.set_nodelay(True)
        log.debug('%s connected', self.ip)
        self.path = path = '/' + path.lstrip('/')
        self.watching[path].add(self)
        log.debug('%s client(s) watching %s', len(self.watching[path]), path)

    def on_close(self):
        path = self.path
        log.debug('%s client left', self.ip)
        self.watching[path].discard(self)
        log.debug('%s client(s) watching %s', len(self.watching[path]), path)


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
            notify_list = json.loads(message_json)
        except:
            log.exception('failed to decode message')
            self.close()

        for path, instruction in notify_list:
            self.notify(path, instruction)

    def notify(self, path, instruction):
        log.debug('notify %s', path)
        watching = WatchHandler.watching[path]
        if not watching:
            self.close()
            return
        
        for handler in watching:
            try:
                handler.write_message(instruction)
            except:
                pass
            else:
                log.debug('  %r', handler)
        self.close()

    def on_close(self):
        log.debug('%s left', self.request.remote_ip)


class APIHandler(websocket.WebSocketHandler):

    def initialize(self, api_url):
        self.api_url = api_url

    def check_origin(self, origin):
        return True

    @gen.coroutine
    def on_message(self, message):
        http_client = AsyncHTTPClient()
        log.debug('forwarding %s', message[:50])
        response = yield http_client.fetch(self.api_url,
                                           method="POST",
                                           body=message)
        self.write_message(response.body)


def make_app(secret, api_url):
    app = web.Application([
        (r'^/watch/(?P<path>.*?)$', WatchHandler),
        (r'^/notify/$', NotifyHandler, {'secret': secret}),
        #(r'^/api/$', APIHandler, {'api_url': api_url})
    ])
    return app
