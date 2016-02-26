from __future__ import unicode_literals
from __future__ import print_function

from moya.elements.elementbase import LogicElement, Attribute
from moya.compat import text_type

from websocket import create_connection

import socket
import json
import logging

log = logging.getLogger('moya.runtime.notifier')

XMLNS = "http://willmcgugan.com/timeline"


class Notify(LogicElement):
    """Add a notification to the queue"""
    xmlns = XMLNS

    path = Attribute("Path to update", type="text", required=True)
    action = Attribute("Action to send", type="text", required=True)

    def logic(self, context):
        path, action = self.get_parameters(context, 'path', 'action')
        log.debug('notify path="%s", action="%s"', path, action)

        instruction = self.get_let_map(context)
        instruction['action'] = action
        instruction_json = json.dumps([instruction])

        notifications = context.set_new_call('.notifier_queue', list)
        notifications.append([path, instruction_json])


class SendNotifications(LogicElement):
    """Send queued notifications"""
    xmlns = XMLNS

    def logic(self, context):
        notifications = context.pop('.notifier_queue', None)
        if notifications is None:
            return
        log.debug('sending %s queued notifications', len(notifications))

        settings = self.archive.get_app_settings('willmcgugan.timeline')
        ws_url = "{notifier_url}?secret={notifier_secret}".format(**settings)

        packet_json = json.dumps(notifications)

        sockopt = ((socket.IPPROTO_TCP, socket.TCP_NODELAY, 1),)
        try:
            ws = create_connection(ws_url, sockopt=sockopt)
        except Exception as e:
            log.warn('unable to connect to notifier ({})'.format(text_type(e)))
        else:
            try:
                ws.send(packet_json)
            finally:
                ws.close()
