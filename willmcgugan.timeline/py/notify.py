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
	xmlns = "http://willmcgugan.com/timeline"

	path = Attribute("Path to update", type="expression")
	action = Attribute("Action to send", type="text", required="yes")
	data = Attribute("Data associated with the action", type="expression", default=None)
	failsilently = Attribute("Ignore connectivity errors?", type="boolean", default=True)

	def logic(self, context):
		
		path, action, data = self.get_parameters(context, 'path', 'action', 'data')

		path = "/" + path.lstrip()
		log.debug('notify path="%s", action="%s"', path, action)

		params = self.get_parameters(context)
		instruction = {
			"action": action
		}
		if data:
			instruction.update(data)
		let_map = self.get_let_map(context)
		if let_map:
			instruction.update(let_map)
		instruction_json = json.dumps([instruction])

		timeline_app = self.archive.find_app('willmcgugan.timeline')
		ws_url_base = timeline_app.settings['notifier_url']
		notifier_secret = timeline_app.settings['notifier_secret']
		ws_url = "{}?secret={}".format(ws_url_base, notifier_secret)

		ws = context.get('.notify_ws', None)
		if ws is None:
			try:
				ws = create_connection(ws_url,
									   sockopt=((socket.IPPROTO_TCP, socket.TCP_NODELAY, 1),))
			except Exception as e:
				msg = 'unable to connect to notifier server ({})'.format(text_type(e))
				if params.failsilently:
					log.warn(msg)
					return
				else:
					self.throw('notifier.connect-fail',
							   msg,
							   error=e)
			context['.notify_ws'] = ws

		packet = [path, instruction_json]
		packet_json = json.dumps(packet)
		ws.send(packet_json)
		#ws.close()
