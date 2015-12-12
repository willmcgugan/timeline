from __future__ import print_function

import argparse
import logging

from tornado import ioloop

from . import server

log = logging.getLogger('notifier')

def main():
	parser = argparse.ArgumentParser(description='Run a notify server.')
	parser.add_argument('--host', dest='host', metavar='IP',
						help='server IP')
	parser.add_argument('--port', dest='port', metavar='PORT', default=7474, type=int,
						help='server port')
	parser.add_argument('-s', '--secret', dest='secret', metavar='SECRET_TEXT',
						help='server secret (password)')

	args = parser.parse_args()

	logging.basicConfig(format='%(asctime)s %(message)s',
						level=logging.DEBUG)

	app = server.make_app(args.secret)
	app.listen(args.port)
	log.info('listening on port %s', args.port)
	try:
		ioloop.IOLoop.instance().start()
	except:
		log.info('user exit')