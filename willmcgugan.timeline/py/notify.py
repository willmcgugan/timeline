from __future__ import unicode_literals
from __future__ import print_function

from moya.elements.elementbase import LogicElement, Attribute
from moya.compat import text_type

from websocket import create_connection

import socket
import json
import logging

log = logging.getLogger('moya.runtime.notifier')


class Notify(LogicElement):
	"""Add a notification to the queue"""
	xmlns = "http://willmcgugan.com/timeline"

	path = Attribute("Path to update", type="text")
	action = Attribute("Action to send", type="text", required="yes")
	data = Attribute("Data associated with the action", type="expression", default=None)
	failsilently = Attribute("Ignore connectivity errors?", type="boolean", default=True)

	def logic(self, context):
		
		path, action, data = self.get_parameters(context, 'path', 'action', 'data')
		path = "/" + path.lstrip('/')
		log.debug('notify path="%s", action="%s"', path, action)

		instruction = {"action": action}
		if data:
			instruction.update(data)
		instruction.update(self.get_let_map(context))
		instruction_json = json.dumps([instruction])

		notifications = context.set_new_call('.notifier_queue', list)
		notifications.append([path, instruction_json])


class SendNotifications(LogicElement):
	"""Send queued notifications"""
	xmlns = "http://willmcgugan.com/timeline"

	def logic(self, context):
		notifications = context.get('.notifier_queue', None)
		if notifications is None:
			return
		del context['.notifier_queue']

		log.debug('sending %s queued notifications', len(notifications))

		timeline_app = self.archive.find_app('willmcgugan.timeline')
		ws_url_base = timeline_app.settings['notifier_url']
		notifier_secret = timeline_app.settings['notifier_secret']
		ws_url = "{}?secret={}".format(ws_url_base, notifier_secret)

		packet_json = json.dumps(notifications)
		
		sockopt = ((socket.IPPROTO_TCP, socket.TCP_NODELAY, 1),)
		try:
			ws = create_connection(ws_url, sockopt=sockop)
		except Exception as e:
			log.warn('unable to connect to notifier ({})'.format(text_type(e)))
		else:
			try:
				ws.send(packet_json)
			finally:
				ws.close()
