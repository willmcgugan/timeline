from __future__ import unicode_literals
from __future__ import print_function

from moya.elements.elementbase import LogicElement, Attribute

from websocket import create_connection

import json
import logging

log = logging.getLogger('moya.runtime')


class Notify(LogicElement):
	xmlns = "http://willmcgugan.com/timeline"

	path = Attribute("Path to update", type="text")
	instruction = Attribute("Instruction to send", type="expression")

	def logic(self, context):
		instruction_json = json.dumps(instruction)

		timeline_app = self.archive.find_app('willmcgugan.timeline')
		ws_url_base = timeline_app.settings['notifier_url']
		notifier_secret = timeline_app.settings['notifier_secret']
		ws_url = "{}?secret={}".format(ws_url_base, notifier_secret)
		ws = create_connection(ws_url,
							   sockopt=((socket.IPPROTO_TCP, socket.TCP_NODELAY),))

		packet = [path, instruction_json]
		packet_json = json.dumps(paths)

		ws.send(packet_json)
		ws.close()
