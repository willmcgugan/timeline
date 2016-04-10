"""Simple asynchrous notifer server."""

from __future__ import print_function

import argparse
import logging
import sys

from tornado import ioloop

from . import server

log = logging.getLogger('notifier')


LOG_LEVELS = {
    "CRITICAL": 50,
    "ERROR": 40,
    "WARNING": 30,
    "INFO": 20,
    "DEBUG": 10,
    "NOTSET": 0,
}


def main():
    """Entry point for notifer server."""
    parser = argparse.ArgumentParser(description='Run a notify server.')
    parser.add_argument('--host', dest='host', metavar='IP',
                        help='server IP')
    parser.add_argument('--port', dest='port', metavar='PORT', default=7474, type=int,
                        help='server port')
    parser.add_argument('-s', '--secret', dest='secret', metavar='SECRET TEXT', default="secret",
                        help='server secret (password)')
    parser.add_argument('-l', '--log-level', dest="log_level", metavar="LEVEL", default="DEBUG",
                        help='log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)')

    args = parser.parse_args()

    try:
        debug_level = LOG_LEVELS[args.log_level]
    except KeyError:
        sys.stderr.write('unknown log level\n')
        return -1

    logging.basicConfig(format='[%(asctime)s]:%(levelname)s:%(message)s',
                        level=debug_level)

    app = server.make_app(args.secret)

    app.listen(args.port)
    log.info('listening on port %s', args.port)
    try:
        ioloop.IOLoop.instance().start()
    except:
        log.info('user exit')
